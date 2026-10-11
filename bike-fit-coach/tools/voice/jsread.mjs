// A small reader for this app's own JavaScript, so the voice catalog (catalog.mjs) can find every
// line the app can say without a parser library: the tests run with Node alone (no npm install, the
// same as the publish workflow). It tokenizes a whole file, parses single expressions (the argument
// of Voice.say, the value of a const, what a function returns) and knows which names a function
// declares, which is all the catalog needs. It is not a full JavaScript parser: statements are only
// skipped over, and anything it cannot read makes the catalog fail loudly rather than guess.

const PUNCT = ['>>>=', '...', '===', '!==', '**=', '<<=', '>>=', '>>>', '&&=', '||=', '??=', '=>', '==', '!=', '<=', '>=', '&&', '||', '??', '?.',
  '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '**', '<<', '>>',
  '{', '}', '(', ')', '[', ']', ';', ',', '<', '>', '+', '-', '*', '/', '%', '&', '|', '^', '!', '~', '?', ':', '=', '.', '@', '#'];
// After these words a slash starts a regular expression, not a division.
const BEFORE_REGEX = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);
const IDENT = /[A-Za-z_$ -￿][\w$ -￿]*/y;
const NUMBER = /(?:0[xXbBoO][\da-fA-F_]+|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?)n?/y;

function cook(raw) {
  return raw.replace(/\\(u\{([0-9a-fA-F]+)\}|u([0-9a-fA-F]{4})|x([0-9a-fA-F]{2})|\r\n|[\s\S])/g, (m, all, cp, u4, x2) => {
    if (cp) return String.fromCodePoint(parseInt(cp, 16));
    if (u4) return String.fromCharCode(parseInt(u4, 16));
    if (x2) return String.fromCharCode(parseInt(x2, 16));
    const c = all;
    return { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', 0: '\0', '\n': '', '\r\n': '', ' ': '', ' ': '' }[c] ?? c;
  });
}

// Tokens: { t: 'name' | 'num' | 'str' | 'tpl' | 're' | 'p', v, at (character offset) }. A template
// literal is one token, { t: 'tpl', quasis: [cooked text], exprs: [[tokens]] }. untilBrace: stop at
// the } that closes a template's ${ (returns the tokens and where it stopped).
export function tokenize(src, start = 0, untilBrace = false) {
  const toks = [];
  let i = start, depth = 0;
  const regexOk = () => {
    const p = toks[toks.length - 1];
    if (!p) return true;
    if (p.t === 'num' || p.t === 'str' || p.t === 'tpl' || p.t === 're') return false;
    if (p.t === 'name') return BEFORE_REGEX.has(p.v);
    return ![')', ']', '}'].includes(p.v);
  };
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { const e = src.indexOf('\n', i); i = e < 0 ? src.length : e; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); if (e < 0) throw new Error(`unclosed comment at ${i}`); i = e + 2; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== c) { if (src[j] === '\\') j++; else if (src[j] === '\n') throw new Error(`unclosed string at ${i}`); j++; }
      toks.push({ t: 'str', v: cook(src.slice(i + 1, j)), at: i });
      i = j + 1;
      continue;
    }
    if (c === '`') {
      const quasis = [], exprs = [];
      let j = i + 1, raw = '';
      for (;;) {
        if (j >= src.length) throw new Error(`unclosed template at ${i}`);
        const d = src[j];
        if (d === '\\') { raw += src.slice(j, j + 2); j += 2; continue; }
        if (d === '`') { quasis.push(cook(raw)); j++; break; }
        if (d === '$' && src[j + 1] === '{') {
          quasis.push(cook(raw)); raw = '';
          const inner = tokenize(src, j + 2, true);
          exprs.push(inner.toks);
          j = inner.end + 1;
          continue;
        }
        raw += d; j++;
      }
      toks.push({ t: 'tpl', quasis, exprs, at: i });
      i = j;
      continue;
    }
    if (c === '/' && regexOk()) {
      let j = i + 1, cls = false;
      for (;; j++) {
        if (j >= src.length || src[j] === '\n') throw new Error(`unclosed regular expression at ${i}`);
        if (src[j] === '\\') { j++; continue; }
        if (src[j] === '[') cls = true;
        else if (src[j] === ']') cls = false;
        else if (src[j] === '/' && !cls) break;
      }
      j++;
      while (/[a-z]/i.test(src[j] || '')) j++;
      toks.push({ t: 're', v: src.slice(i, j), at: i });
      i = j;
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      NUMBER.lastIndex = i;
      const m = NUMBER.exec(src);
      toks.push({ t: 'num', v: Number(m[0].replace(/_/g, '').replace(/n$/, '')), at: i });
      i += m[0].length;
      continue;
    }
    IDENT.lastIndex = i;
    const id = IDENT.exec(src);
    if (id) { toks.push({ t: 'name', v: id[0], at: i }); i += id[0].length; continue; }
    const p = PUNCT.find(x => src.startsWith(x, i) && !(x === '?.' && /[0-9]/.test(src[i + 2] || '')));
    if (!p) throw new Error(`unexpected character ${JSON.stringify(c)} at ${i}`);
    if (untilBrace) {
      if (p === '{') depth++;
      if (p === '}') { if (depth === 0) return { toks, end: i }; depth--; }
    }
    toks.push({ t: 'p', v: p, at: i });
    i += p.length;
  }
  if (untilBrace) throw new Error(`unclosed \${ in a template at ${start}`);
  return { toks, end: i };
}

// Where each bracket closes, by token index.
export function matchBrackets(toks) {
  const m = new Map(), stack = [];
  const open = { '(': ')', '[': ']', '{': '}' };
  toks.forEach((k, i) => {
    if (k.t !== 'p') return;
    if (open[k.v]) stack.push(i);
    else if ([')', ']', '}'].includes(k.v)) {
      const j = stack.pop();
      if (j == null || open[toks[j].v] !== k.v) throw new Error(`unbalanced ${k.v} at ${k.at}`);
      m.set(j, i); m.set(i, j);
    }
  });
  if (stack.length) throw new Error(`unclosed ${toks[stack[stack.length - 1]].v} at ${toks[stack[stack.length - 1]].at}`);
  return m;
}

const PREC = { '??': 1, '||': 2, '&&': 3, '|': 4, '^': 5, '&': 6, '==': 7, '!=': 7, '===': 7, '!==': 7, '<': 8, '>': 8, '<=': 8, '>=': 8, instanceof: 8, in: 8,
  '<<': 9, '>>': 9, '>>>': 9, '+': 10, '-': 10, '*': 11, '/': 11, '%': 11, '**': 12 };
const ASSIGN = new Set(['=', '+=', '-=', '*=', '/=', '%=', '**=', '<<=', '>>=', '>>>=', '&=', '|=', '^=', '&&=', '||=', '??=']);

// Parses expressions from a token list. pos(i) is the position nodes record (a token index in the
// whole file; tokens inside a template take the template's own position).
export class Parser {
  constructor(toks, pos = (i) => i) { this.toks = toks; this.i = 0; this.pos = pos; this.match = null; }
  peek(o = 0) { return this.toks[this.i + o]; }
  is(v, o = 0) { const k = this.peek(o); return !!k && (k.t === 'p' || k.t === 'name') && k.v === v; }
  next() { return this.toks[this.i++]; }
  expect(v) { if (!this.is(v)) throw this.err(`expected ${v}`); return this.next(); }
  err(msg) { const k = this.peek(); return new Error(`${msg} at character ${k ? k.at : 'end'}`); }
  close(i) { this.match ??= matchBrackets(this.toks); const j = this.match.get(i); if (j == null) throw this.err('unbalanced'); return j; }
  expression() { const e = this.assign(); if (!this.is(',')) return e; const list = [e]; while (this.is(',')) { this.next(); list.push(this.assign()); } return { t: 'seq', list }; }
  assign() {
    const k = this.peek();
    if (k?.t === 'name' && k.v === 'async' && (this.peek(1)?.t === 'name' || this.is('(', 1))) { this.next(); return this.assign(); }
    if (k?.t === 'name' && this.is('=>', 1)) { this.next(); this.next(); return this.arrowBody([k.v]); }
    if (this.is('(')) {
      const j = this.close(this.i);
      if (this.toks[j + 1]?.v === '=>') {
        const params = this.toks.slice(this.i + 1, j).filter((x, n, a) => x.t === 'name' && a[n - 1]?.v !== '.').map(x => x.v);
        this.i = j + 2;
        return this.arrowBody(params);
      }
    }
    const left = this.cond();
    if (this.peek()?.t === 'p' && ASSIGN.has(this.peek().v)) { const op = this.next().v; return { t: 'assign', op, left, right: this.assign() }; }
    return left;
  }
  arrowBody(params) {
    const at = this.pos(this.i);
    if (this.is('{')) { const s = this.i, e = this.close(s); this.i = e + 1; return { t: 'arrow', params, block: [s, e], at }; }
    return { t: 'arrow', params, body: this.assign(), at };
  }
  cond() {
    const test = this.bin(1);
    if (!this.is('?')) return test;
    this.next();
    const yes = this.assign();
    this.expect(':');
    return { t: 'cond', test, yes, no: this.assign() };
  }
  bin(min) {
    let left = this.unary();
    for (;;) {
      const k = this.peek();
      const p = k && (k.t === 'p' || k.t === 'name') ? PREC[k.v] : null;
      if (!p || p < min) return left;
      this.next();
      const right = this.bin(k.v === '**' ? p : p + 1);
      left = { t: 'bin', op: k.v, left, right };
    }
  }
  unary() {
    const k = this.peek();
    if (k && ((k.t === 'p' && ['!', '~', '+', '-', '++', '--'].includes(k.v)) || (k.t === 'name' && ['typeof', 'void', 'delete', 'await'].includes(k.v)))) {
      this.next();
      return { t: 'unary', op: k.v, arg: this.unary() };
    }
    return this.postfix();
  }
  postfix() {
    let e = this.primary();
    for (;;) {
      if (this.is('.') || this.is('?.')) {
        this.next();
        if (this.is('[')) { this.next(); const index = this.expression(); this.expect(']'); e = { t: 'member', obj: e, index, at: e.at }; continue; }
        if (this.is('(')) { e = { t: 'call', callee: e, args: this.args(), at: e.at }; continue; }
        const n = this.next();
        if (n?.t !== 'name') throw this.err('expected a property name');
        e = { t: 'member', obj: e, prop: n.v, at: e.at };
        continue;
      }
      if (this.is('[')) { this.next(); const index = this.expression(); this.expect(']'); e = { t: 'member', obj: e, index, at: e.at }; continue; }
      if (this.is('(')) { e = { t: 'call', callee: e, args: this.args(), at: e.at }; continue; }
      if (this.peek()?.t === 'tpl') { this.next(); e = { t: 'tagged', at: e.at }; continue; }
      if (this.is('++') || this.is('--')) { this.next(); e = { t: 'unary', op: 'post', arg: e }; continue; }
      return e;
    }
  }
  args() {
    this.expect('(');
    const list = [];
    while (!this.is(')')) {
      if (this.is('...')) this.next();
      list.push(this.assign());
      if (!this.is(')')) this.expect(',');
    }
    this.next();
    return list;
  }
  primary() {
    const k = this.peek();
    if (!k) throw this.err('unexpected end');
    const at = this.pos(this.i);
    if (k.t === 'num') { this.next(); return { t: 'num', v: k.v, at }; }
    if (k.t === 'str') { this.next(); return { t: 'str', v: k.v, at }; }
    if (k.t === 're') { this.next(); return { t: 'other', at }; }
    if (k.t === 'tpl') {
      this.next();
      return { t: 'tpl', quasis: k.quasis, exprs: k.exprs.map(ts => new Parser(ts, () => at).expression()), at };
    }
    if (k.t === 'name') {
      this.next();
      if (k.v === 'null' || k.v === 'undefined') return { t: 'nil', at };
      if (k.v === 'true' || k.v === 'false' || k.v === 'this' || k.v === 'super') return { t: 'other', at };
      if (k.v === 'new') { this.postfix(); return { t: 'other', at }; }
      if (k.v === 'function' || k.v === 'class') {
        while (this.peek() && !this.is('{')) { if (this.is('(')) this.i = this.close(this.i); this.next(); }
        this.i = this.close(this.i) + 1;
        return { t: 'other', at };
      }
      return { t: 'id', name: k.v, at };
    }
    if (this.is('(')) { this.next(); const e = this.expression(); this.expect(')'); return { t: 'paren', e, at }; }
    if (this.is('[')) {
      this.next();
      const items = [];
      while (!this.is(']')) {
        if (this.is(',')) { this.next(); continue; }
        if (this.is('...')) { this.next(); items.push({ t: 'spread', e: this.assign() }); } else items.push(this.assign());
        if (!this.is(']')) this.expect(',');
      }
      this.next();
      return { t: 'arr', items, at };
    }
    if (this.is('{')) {
      this.next();
      const props = [];
      while (!this.is('}')) {
        if (this.is('...')) { this.next(); props.push({ spread: this.assign() }); }
        else {
          let key, computed = false;
          if ((this.is('get') || this.is('set') || this.is('async')) && !this.is(':', 1) && !this.is(',', 1) && !this.is('(', 1) && !this.is('}', 1)) this.next();
          if (this.is('*')) this.next();
          const kt = this.next();
          if (kt.t === 'p' && kt.v === '[') { key = this.expression(); computed = true; this.expect(']'); }
          else if (kt.t === 'name' || kt.t === 'str' || kt.t === 'num') key = String(kt.v);
          else throw this.err('expected a property');
          if (this.is(':')) { this.next(); props.push({ key, computed, value: this.assign() }); }
          else if (this.is('(')) { this.i = this.close(this.i) + 1; this.i = this.close(this.i) + 1; props.push({ key, computed, value: { t: 'other', at } }); }
          else {
            const value = { t: 'id', name: key, at: this.pos(this.i - 1) };
            if (this.is('=')) { this.next(); this.assign(); }
            props.push({ key, computed, value });
          }
        }
        if (!this.is('}')) this.expect(',');
      }
      this.next();
      return { t: 'obj', props, at };
    }
    throw this.err(`unexpected ${k.v}`);
  }
}

const CONTROL = new Set(['if', 'for', 'while', 'switch', 'with']);

// The file's functions (their parameters and bodies, by token index) and every name it declares,
// with where: { name, at, init | from+key | fn }. Block scopes are not modelled: a name is looked up
// in the functions around the place it is used, nearest declaration first (see Program.resolve).
export class Program {
  constructor(src) {
    this.src = src;
    this.toks = tokenize(src).toks;
    this.match = matchBrackets(this.toks);
    this.scopes = [];
    this.decls = new Map();
    this.scan();
  }
  parserAt(i) { const p = new Parser(this.toks); p.i = i; p.match = this.match; return p; }
  names(from, to) { // names bound by a parameter list or a destructuring pattern
    const out = [];
    for (let i = from; i < to; i++) {
      const k = this.toks[i];
      if (k.t !== 'name' || this.toks[i - 1]?.v === '.') continue;
      const nx = this.toks[i + 1]?.v;
      if (nx === ':' && this.toks[i - 1]?.v !== '?') continue; // { key: name } binds name, not key
      out.push(k.v);
    }
    return out;
  }
  declare(name, d) { if (!this.decls.has(name)) this.decls.set(name, []); this.decls.get(name).push({ name, ...d }); }
  scan() {
    const T = this.toks;
    for (let i = 0; i < T.length; i++) {
      const k = T[i];
      if (k.t === 'p' && k.v === '{') {
        const end = this.match.get(i), prev = T[i - 1];
        let params = null;
        if (prev?.v === '=>') {
          const b = T[i - 2];
          params = b?.v === ')' ? this.names(this.match.get(i - 2) + 1, i - 2) : b?.t === 'name' ? [b.v] : [];
        } else if (prev?.v === ')') {
          const o = this.match.get(i - 1), before = T[o - 1];
          if (before?.t === 'name' && !CONTROL.has(before.v)) params = this.names(o + 1, i - 1);
        }
        if (params) this.scopes.push({ start: i, end, params: new Set(params) });
      }
      if (k.t !== 'name' || T[i - 1]?.v === '.') continue;
      if (k.v === 'function' && T[i + 1]?.t === 'name' && T[i + 2]?.v === '(') {
        const close = this.match.get(i + 2);
        this.declare(T[i + 1].v, { at: i, fn: { params: [i + 3, close], block: [close + 1, this.match.get(close + 1)] } });
        continue;
      }
      if (!['const', 'let', 'var'].includes(k.v)) continue;
      let j = i + 1;
      for (;;) {
        const n = T[j];
        if (n?.t === 'name') {
          if (T[j + 1]?.v === '=') {
            const p = this.parserAt(j + 2);
            const init = p.assign();
            this.declare(n.v, { at: j, init });
            j = p.i;
          } else { this.declare(n.v, { at: j }); j++; }
        } else if (n?.v === '{' || n?.v === '[') {
          const close = this.match.get(j);
          const bound = this.names(j + 1, close);
          if (T[close + 1]?.v === '=') {
            const p = this.parserAt(close + 2);
            const from = p.assign();
            for (const b of bound) this.declare(b, { at: j, from, key: b });
            j = p.i;
          } else { for (const b of bound) this.declare(b, { at: j }); j = close + 1; }
        } else break;
        if (T[j]?.v !== ',') break;
        j++;
      }
    }
  }
  // The functions around token index at, innermost first.
  around(at) { return this.scopes.filter(s => s.start < at && at < s.end).sort((a, b) => b.start - a.start); }
  // { param: true } for a parameter of a function around the place, else the declaration it most
  // likely means: one in a function around the place (or at the top), the nearest before it, else
  // the first after it (a function or a top-level const used inside a function written above it).
  resolve(name, at) {
    const outer = this.around(at);
    for (const s of outer) if (s.params.has(name)) return { param: true };
    const home = (d) => this.around(d.at)[0] || null;
    const seen = (this.decls.get(name) || []).filter(d => { const h = home(d); return !h || outer.includes(h); });
    const before = seen.filter(d => d.at < at).sort((a, b) => b.at - a.at);
    return before[0] || seen[0] || null;
  }
  // The expressions a function body returns (not those of functions inside it).
  returns([s, e]) {
    const inner = this.scopes.filter(x => x.start > s && x.end < e);
    const out = [];
    for (let i = s + 1; i < e; i++) {
      const k = this.toks[i];
      if (k.t !== 'name' || k.v !== 'return' || inner.some(x => x.start < i && i < x.end)) continue;
      const nx = this.toks[i + 1];
      if (!nx || nx.v === ';' || nx.v === '}') { out.push({ t: 'nil', at: i }); continue; }
      out.push(this.parserAt(i + 1).expression());
    }
    return out;
  }
  // Every call of name.method( (e.g. Voice.say), with its arguments' first expression.
  calls(obj, method) {
    const T = this.toks, out = [];
    for (let i = 0; i + 3 < T.length; i++) {
      if (T[i].t === 'name' && T[i].v === obj && T[i - 1]?.v !== '.' && T[i + 1].v === '.' && T[i + 2].v === method && T[i + 3].v === '(') {
        out.push({ at: i, line: this.src.slice(0, T[i].at).split('\n').length, arg: this.parserAt(i + 4).assign() });
      }
    }
    return out;
  }
  // Every object property named key (key: value), with its value expression.
  props(key) {
    const T = this.toks, out = [];
    for (let i = 1; i + 1 < T.length; i++) {
      if (T[i].t === 'name' && T[i].v === key && T[i + 1].v === ':' && ['{', ','].includes(T[i - 1].v)) {
        out.push({ at: i, line: this.src.slice(0, T[i].at).split('\n').length, value: this.parserAt(i + 2).assign() });
      }
    }
    return out;
  }
}

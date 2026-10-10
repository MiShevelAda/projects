// Assembles _site/ for GitHub Pages. Every top-level folder with an index.html is an app: it is
// copied as it is and served at /projects/<folder>/. The front page lists the apps by their
// <title> and <meta name="description">, so a new app needs no change here.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd(), out = path.join(root, '_site');
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const apps = fs.readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !/^[._]/.test(d.name) && fs.existsSync(path.join(root, d.name, 'index.html')))
  .map((d) => {
    const html = fs.readFileSync(path.join(root, d.name, 'index.html'), 'utf8');
    return {
      dir: d.name,
      title: (html.match(/<title>([^<]*)<\/title>/i) || [, d.name])[1].trim(),
      description: (html.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || [, ''])[1],
    };
  });

// An empty site would replace the live one with nothing, so refuse rather than publish it.
if (!apps.length) throw new Error('No app found (a top-level folder with an index.html). Refusing to publish an empty site.');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const a of apps) fs.cpSync(path.join(root, a.dir), path.join(out, a.dir), { recursive: true });
fs.writeFileSync(path.join(out, '.nojekyll'), '');
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Projects</title>
<style>
  :root { --bg: #07111f; --panel: #0f1d33; --line: #213656; --text: #eef3fa; --muted: #9fb0c8; --accent: #2e8cff; color-scheme: dark; }
  body { margin: 0; background: var(--bg); color: var(--text); font: 17px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 560px; margin: 0 auto; padding-inline: 16px; padding-block: 40px; display: grid; gap: 16px; }
  h1 { margin: 0; font-size: 28px; }
  a.card { display: block; background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 16px; color: inherit; text-decoration: none; }
  a.card strong { color: var(--accent); font-size: 19px; }
  a.card span { display: block; color: var(--muted); }
</style>
</head>
<body>
<main>
  <h1>Projects</h1>
${apps.map((a) => `  <a class="card" href="${esc(a.dir)}/"><strong>${esc(a.title)}</strong><span>${esc(a.description)}</span></a>`).join('\n')}
</main>
</body>
</html>
`);
console.log(`Published ${apps.length} app(s): ${apps.map((a) => a.dir).join(', ')}`);

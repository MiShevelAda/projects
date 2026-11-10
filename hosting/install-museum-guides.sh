#!/usr/bin/env bash
# install-museum-guides.sh: puts the museum guides at https://trucora.de/museum-guides/, behind a
# password of their own, on Alex's server.
#
#   sudo bash hosting/install-museum-guides.sh            dry run: shows what it would do, changes nothing
#   sudo bash hosting/install-museum-guides.sh --write    installs, asks for the password, verifies, and
#                                                         rolls the web server back if any check fails
#   sudo bash hosting/install-museum-guides.sh --update   copies the guides again (after a change); the
#                                                         password and the web server are left alone
#
# Run it from a fresh copy of this repo (MiShevelAda/projects), on the branch that holds the guides.
# What it does, in order:
#   1. Copies the landing page and the two guides into /srv/museum-guides (what the visitor needs
#      only: no tools, tests or notes), readable by the web server, owned by career-studio so later
#      updates need no root.
#   2. Asks for a password, twice, and stores only Caddy's hash of it. The password is never written
#      to a file or to git. It is separate from the dashboard's on purpose: it is the one to give to
#      friends.
#   3. Adds a `handle /museum-guides*` block with basic_auth inside the trucora.de site block, the
#      same shape as /dilix, checks the file still parses, and reloads Caddy.
#   4. Verifies at the layer a visitor sees: without the password every page is refused (401); with
#      it the landing page, both guides and a recording load (the recording as a 206 byte range with
#      an audio type, which Safari needs); trucora.de/alex still answers and /dilix still asks for its
#      password. Any failure restores the previous Caddyfile.
#   5. Declares the new sub-site under "protected" in the brand repo's URL map
#      (/srv/alex-brand/brand/pages/manifest.json) and commits it, so that repo's gate, which fails on
#      any undeclared sub-site on his domain, stays green.
#
# Every path can be overridden through MG_* variables, which is how it was tested before it ever
# touched the real server.
set -uo pipefail
CADDYFILE=${MG_CADDYFILE:-/etc/caddy/Caddyfile}
HOST=${MG_HOST:-trucora.de}
BASE=${MG_BASE:-https://trucora.de}
ROOT=${MG_ROOT:-/srv/museum-guides}
BRAND=${MG_BRAND:-/srv/alex-brand}
OWNER=${MG_OWNER:-career-studio}
RELOAD=${MG_RELOAD:-systemctl reload caddy}
CURL_EXTRA=${MG_CURL_EXTRA:-}
USERNAME=museum
HERE=$(cd "$(dirname "$0")/.." && pwd)
MODE=dry; [[ "${1:-}" == "--write" ]] && MODE=write; [[ "${1:-}" == "--update" ]] && MODE=update

say(){ printf '  %s\n' "$*"; }
die(){ printf '\xf0\x9f\x94\xb4 museum guides: %s\n' "$*" >&2; exit 1; }
[[ $EUID -eq 0 ]] || die "run it as root:  sudo bash $0 ${1:-}"
command -v caddy >/dev/null || die "caddy is not on this machine's PATH."
command -v python3 >/dev/null || die "python3 is needed."

if [[ $MODE == write ]] && grep -q 'handle /museum-guides\*' "$CADDYFILE"; then
  die "$CADDYFILE already has the museum guides block, so they are installed. To change the guides use --update; to change the password, edit the hash in that block (caddy hash-password). Nothing was changed."
fi

# ── 1. the files ─────────────────────────────────────────────────────────────────────────────────
declare -A APPS=([natural-history-museum]=london-museum-guide [science-museum]=science-museum-guide)
[[ -f "$HERE/hosting/museum-guides/index.html" ]] || die "no landing page at $HERE/hosting/museum-guides/index.html. Run this from a copy of MiShevelAda/projects."
for dest in "${!APPS[@]}"; do
  src="$HERE/${APPS[$dest]}"
  [[ -f "$src/index.html" && -f "$src/audio/manifest.json" ]] || die "$src is not a complete guide."
  python3 - "$src" <<'PY' || die "a recording listed in ${APPS[$dest]}/audio/manifest.json is missing. The guide would play silence."
import json, os, sys
d = sys.argv[1]; m = json.load(open(os.path.join(d, 'audio/manifest.json')))
missing = [c['file'] for s in m['stops'].values() for c in s.values() if not os.path.exists(os.path.join(d, 'audio', c['file']))]
sys.exit(1 if missing else 0)
PY
done
say "the landing page and both guides are complete"

STAGE=$(mktemp -d "${ROOT%/}.new.XXXX") || die "could not make a staging folder next to $ROOT."
cp "$HERE/hosting/museum-guides/index.html" "$STAGE/index.html"
for dest in "${!APPS[@]}"; do
  mkdir -p "$STAGE/$dest"
  tar -C "$HERE/${APPS[$dest]}" --exclude=./tools --exclude=./test --exclude=./node_modules \
      --exclude='*.md' --exclude='package*.json' --exclude=.gitignore -cf - . | tar -C "$STAGE/$dest" -xf -
done
chmod -R a+rX "$STAGE"; chmod 755 "$STAGE"
say "staged $(find "$STAGE" -type f | wc -l | tr -d ' ') files, $(du -sh "$STAGE" | cut -f1)"

IFS= read -r -d '' BLOCK <<'BLK'
	# Museum guides: Alex's unofficial audio guides, behind a password of their own (username
	# museum). Installed by MiShevelAda/projects hosting/install-museum-guides.sh; declared under
	# "protected" in brand/pages/manifest.json. Not a brand page and never public.
	handle /museum-guides* {
		basic_auth {
			museum __HASH__
		}
		header X-Robots-Tag "noindex, nofollow"
		# The guides load their files relatively, which only works from a directory URL.
		redir /museum-guides /museum-guides/ 301
		redir /museum-guides/natural-history-museum /museum-guides/natural-history-museum/ 301
		redir /museum-guides/science-museum /museum-guides/science-museum/ 301
		# Safari plays the recordings only when they come back as audio, in byte ranges.
		@m4a path *.m4a
		header @m4a Content-Type audio/mp4
		root * __ROOT__
		rewrite /museum-guides/ /museum-guides/index.html
		uri strip_prefix /museum-guides
		file_server
	}

BLK
BLOCK=${BLOCK//__ROOT__/$ROOT}

if [[ $MODE == dry ]]; then
  echo; say "DRY RUN. Would copy the guides into $ROOT and add this inside the $HOST block of $CADDYFILE:"
  printf '\n%s\n' "${BLOCK//__HASH__/<hash of the password you choose>}"
  rm -rf "$STAGE"; say "Nothing changed. Re-run with --write."; exit 0
fi

# Swap the new files in whole, so a visitor never sees half a copy. One previous copy is kept.
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
rm -rf "${ROOT%/}".previous
[[ -d "$ROOT" ]] && mv "$ROOT" "${ROOT%/}".previous
mv "$STAGE" "$ROOT"; chmod 755 "$ROOT"
id "$OWNER" >/dev/null 2>&1 && chown -R "$OWNER": "$ROOT"
say "the guides are in $ROOT"

NETRC=$(mktemp); chmod 600 "$NETRC"; trap 'rm -f "$NETRC"' EXIT
code(){ curl -s $CURL_EXTRA -o /dev/null -w '%{http_code}' -m 20 "$@" || true; }

if [[ $MODE == update ]]; then
  c=$(code "$BASE/museum-guides/"); [[ "$c" == "401" ]] || die "$BASE/museum-guides/ answered $c without a password. It must be 401."
  say "✓ updated; the guides still ask for the password"; exit 0
fi

# ── 2. the password ──────────────────────────────────────────────────────────────────────────────
for _ in 1 2 3; do
  read -rsp "  Choose the password for the museum guides (at least 8 characters): " PW; echo
  read -rsp "  Type it again: " PW2; echo
  [[ "$PW" == "$PW2" && ${#PW} -ge 8 ]] && break
  say "they did not match, or it was shorter than 8 characters. Try again."; PW=
done
[[ -n "${PW:-}" ]] || die "no password set. Nothing was changed on the web server."
HASH=$(caddy hash-password --plaintext "$PW" 2>/dev/null) || die "caddy could not hash the password."
printf 'machine %s login %s password %s\n' "$(printf '%s' "$BASE" | sed -E 's#^https?://##; s#[:/].*##')" "$USERNAME" "$PW" > "$NETRC"
unset PW PW2

# ── 3. the web server ────────────────────────────────────────────────────────────────────────────
BACKUP=/var/tmp/caddyfile-museum-guides-$STAMP
cp -a "$CADDYFILE" "$BACKUP"; say "backup of the Caddyfile: $BACKUP"
rollback(){ printf '\xf0\x9f\x94\xb4 %s\n   restoring %s\n' "$1" "$CADDYFILE" >&2
  cp -a "$BACKUP" "$CADDYFILE"; $RELOAD >/dev/null 2>&1 || true; sleep 2
  printf '   %s/alex after rollback: HTTP %s\n' "$BASE" "$(code "$BASE/alex")" >&2; exit 1; }

printf '%s' "${BLOCK//__HASH__/$HASH}" > "$NETRC.block"
python3 - "$CADDYFILE" "$NETRC.block" "$HOST" <<'PY' || { rm -f "$NETRC.block"; rollback "could not find the $HOST site block"; }
import io, re, sys
f, bf, host = sys.argv[1:4]
lines = io.open(f, encoding='utf-8').read().split('\n')
block = io.open(bf, encoding='utf-8').read()
for i, l in enumerate(lines):
    # A site block opens at the left margin: addresses, then "{". me.trucora.de must not match.
    if l and not l[0].isspace() and l.rstrip().endswith('{'):
        addrs = [re.sub(r'^https?://', '', a).split(':')[0].rstrip('/') for a in re.split(r'[\s,]+', l.rstrip()[:-1].strip()) if a]
        if host in addrs:
            lines.insert(i + 1, block.rstrip('\n') + '\n')
            io.open(f, 'w', encoding='utf-8').write('\n'.join(lines))
            print(f'  added the /museum-guides block inside {host}')
            sys.exit(0)
sys.exit(1)
PY
rm -f "$NETRC.block"
caddy adapt --config "$CADDYFILE" --adapter caddyfile >/dev/null 2>&1 || rollback "the Caddyfile no longer parses"
$RELOAD || rollback "caddy would not reload"
sleep 3

# ── 4. the checks that decide whether this stays ─────────────────────────────────────────────────
for p in /museum-guides/ /museum-guides/natural-history-museum/ /museum-guides/science-museum/audio/manifest.json; do
  c=$(code "$BASE$p"); [[ "$c" == "401" ]] || rollback "$BASE$p answered $c without a password. It must be 401."
done
say "✓ without the password, every page is refused (401)"
page(){ curl -s $CURL_EXTRA --netrc-file "$NETRC" -m 20 "$BASE$1" || true; }
page /museum-guides/ | grep -q 'Museum Guides' || rollback "the landing page did not load with the password"
page /museum-guides/natural-history-museum/ | grep -q 'Natural History Museum Guide' || rollback "the Natural History Museum guide did not load"
page /museum-guides/science-museum/ | grep -q 'Science Museum Guide' || rollback "the Science Museum guide did not load"
page /museum-guides/science-museum/stops.js | grep -q 'export const STOPS' || rollback "the guides' code did not load"
say "✓ with the password, the landing page and both guides load"
c=$(curl -s $CURL_EXTRA --netrc-file "$NETRC" -o /dev/null -w '%{http_code}' -m 20 "$BASE/museum-guides/natural-history-museum")
[[ "$c" == "301" ]] || rollback "the guide's address without a final / answered $c, not a redirect to the right one"
clip=$(python3 -c "import json,sys; m=json.load(open(sys.argv[1])); print(next(iter(m['stops'].values()))['story']['file'])" "$ROOT/natural-history-museum/audio/manifest.json")
hdr=$(curl -s $CURL_EXTRA --netrc-file "$NETRC" -o /dev/null -D - -r 0-1023 -m 20 "$BASE/museum-guides/natural-history-museum/audio/$clip" | tr -d '\r')
grep -q '^HTTP/[0-9.]* 206' <<<"$hdr" || rollback "a recording did not come back as a byte range (206); Safari would not play it"
grep -qi '^content-type: audio/mp4' <<<"$hdr" || rollback "a recording did not come back as audio/mp4; Safari would not play it"
say "✓ the recordings come back in byte ranges, as audio"
c=$(code "$BASE/alex"); [[ "$c" == "200" ]] || rollback "$BASE/alex answered $c after the reload"
say "✓ $BASE/alex still answers (200)"
if grep -q 'handle /dilix\*' "$CADDYFILE"; then
  c=$(code "$BASE/dilix/"); [[ "$c" == "401" ]] || rollback "$BASE/dilix/ answered $c; it must still ask for its password"
  say "✓ $BASE/dilix still asks for its own password"
fi

# ── 5. the URL map, so the brand repo's gate knows about the new sub-site ────────────────────────
MANIFEST=$BRAND/brand/pages/manifest.json
if [[ -f "$MANIFEST" ]]; then
  python3 - "$MANIFEST" "$HOST" "$ROOT" <<'PY' && say "declared /museum-guides under \"protected\" in the URL map"
import json, sys
p, host, root = sys.argv[1:4]
m = json.load(open(p, encoding='utf-8'))
h = m['hosts'][host]
h.setdefault('protected', {})['/museum-guides'] = {
  'root': root,
  'auth': 'basic_auth',
  'what': "Museum guides: Alex's unofficial audio and text guides to the Natural History Museum and the Science Museum, London, from MiShevelAda/projects (london-museum-guide, science-museum-guide), with a landing page. Username museum; the password is Alex's choice and lives only as a hash in the Caddyfile. Installed by hosting/install-museum-guides.sh in that repo, run by Alex as root.",
  'rule': "Not a brand page and never public. The lint fails if its handle loses basic_auth or serves from another root. To update the guides, run the installer with --update from a fresh copy of the projects repo; no Caddy change.",
}
open(p, 'w', encoding='utf-8').write(json.dumps(m, indent=2, ensure_ascii=False) + '\n')
PY
  if id "$OWNER" >/dev/null 2>&1 && sudo -u "$OWNER" git -C "$BRAND" add brand/pages/manifest.json \
     && sudo -u "$OWNER" git -C "$BRAND" commit -q -m "URL map: declare trucora.de/museum-guides, the password-protected museum guides" -- brand/pages/manifest.json; then
    say "committed the URL map change in $BRAND"
    sudo -u "$OWNER" git -C "$BRAND" push -q 2>/dev/null && say "and pushed it" || say "NOT pushed: the next session on this box pushes it."
  else
    say "NOT committed: $MANIFEST is changed but uncommitted. The next session on this box commits it."
  fi
else
  say "no brand repo at $BRAND, so the URL map was not updated. Declare /museum-guides under \"protected\" there."
fi

printf '\n  \xe2\x9c\x85 The museum guides are live.\n\n'
printf '     %s/museum-guides/\n' "$BASE"
printf '     Username: %s        Password: the one you just chose\n\n' "$USERNAME"
printf '  Previous Caddyfile: %s\n\n' "$BACKUP"

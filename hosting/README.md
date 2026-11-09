# hosting

How the museum guides are served at **https://trucora.de/museum-guides/**, on Alex's own server,
behind a password of their own (username `museum`). Not an app: nothing here is published on
GitHub Pages.

| File | What it is |
|---|---|
| `museum-guides/index.html` | The landing page: one card per guide, in the guides' own design |
| `install-museum-guides.sh` | Copies the landing page and both guides into `/srv/museum-guides`, adds the password-protected `handle /museum-guides*` block to the trucora.de site in Caddy, checks it at the layer a visitor sees, and rolls back on any failure. Then declares it in the brand repo's URL map, whose gate fails on any undeclared sub-site |

**Install, once, on the server (Alex, as root):**

```
rm -rf /tmp/mg && git clone -q --depth 1 -b claude/london-museum-guide-app-vm7hw8 https://github.com/MiShevelAda/projects /tmp/mg && sudo bash /tmp/mg/hosting/install-museum-guides.sh --write
```

**After a change to a guide:** the same line with `--update` instead of `--write`. It copies the
guides again and leaves the password and Caddy alone; no root is needed for the files themselves.

**Tested before it touched the server:** against a real Caddy 2.8 built from source, on a stand-in
trucora.de with /alex, a password-protected /dilix and a me.trucora.de block listed first. Without
the password every page was refused (401); with it the landing page and both guides loaded and
played in a phone-sized browser; a second `--write` refused; a forced failure restored the
Caddyfile byte for byte. Ask the Guide does not appear here: it needs a claude.ai viewer.

The guides' code and recordings are in this public repo anyway: the password guards the hosted
guides, not the source.

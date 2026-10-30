# media.paruto.com: Paruto Media proposals and sample work

The front page lists Paruto Media's proposals; each proposal is a working site in its own folder.
Served as static files by the Cloudflare Worker `paruto-media-samples` (`wrangler.jsonc`);
`.assetsignore` keeps tools, notes, raw recordings and internal prompts off the site, and
`_redirects` sends the SPS kit's first addresses (at the root) to `/araa-sps/`.

| Path | What it is |
| --- | --- |
| `index.html`, `site/` | The front page. **All its words and projects live in `site/projects.js`** (EN/FR); `site.css` holds the design tokens (same language as apps.paruto.com: dark default, light opt-in, Liquid Glass only on floating controls); `site.js` renders it. |
| `araa-sps/` | Project 01: the SPS awareness kit for ARAA's call AMI028-2026 (see `araa-sps/README.md`) |

## Adding a proposal

1. Build it in its own folder, e.g. `samples/<client-call>/`, with its own `index.html`.
2. Add an object at the top of `projects` in `site/projects.js`: `href` (the folder), `call`, `programme`, `year`,
   `accent`/`accent2`, `status`, `client`, `kicker`, `title` (`*word*` picks the italic word), `summary`, `stats`
   (only real counts of what the proposal contains), `teaser` and `poster` (a short silent MP4 and its still; a path, or one per language `{ en, fr }`), three `gallery` stills (`src` a path, or `{ en, fr }`),
   `open`/`play` labels and `playHref`. Every project joins the index at the top of the page: the newest one
   large with its teaser playing, the next two beside it, then rows of three (the others play their teaser
   on hover); the poster is the card's still, so pick a clean frame. Each also gets a section below.
3. Preview with `python3 -m http.server` in `samples/`, then deploy from a clean checkout:
   `cd samples && npx -y wrangler@4.141.0 deploy`.

Never put invented clients, figures or testimonials on the page.

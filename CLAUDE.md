# Paruto Apps showcase (apps.paruto.com)

A static, no-build showcase site. **All content lives in `apps.json`** and images in `assets/apps/<app-id>/`. The page (`index.html`, `styles.css`, `app.js`) renders whatever is in `apps.json` — you almost never need to touch those three files.

## Common requests

### "I shipped a new app: <name>"
1. Ask for (or infer) name, one-line tagline, short description, category, platforms, status, and any live/App Store/Play Store links. Don't invent facts — leave a field empty rather than guess.
2. Add an object to the `apps` array in `apps.json` (see schema below). `id` is kebab-case and unique; it becomes the shareable link `apps.paruto.com/#/<id>`.
3. If the user gives images/screenshots, add them (see next section).
4. Pick an `accent` / `accent2` colour pair that suits the app's brand, and an emoji `icon`.
5. Run `node scripts/validate.mjs`, then preview (`python3 -m http.server 8080`) and check the app's index row and its showcase panel.

Page layout (for orientation): floating Liquid Glass nav (compacts while scrolling down) → hero (headline, then a tilted, slowly drifting **wall of every app image** — new screenshots appear there automatically) → stats bar → **Index** (one row per app with its layered app icon; glass segmented filter; hovering shows a floating glass preview) → **Showcase** (one tinted panel per app: info on one side, the `cover` in a Mac-style window plus the first `"device": "phone"` image in an iPhone frame, then a gallery strip of all `media`) → contact panel → big wordmark. Apps without screenshots show their app icon (built from `icon` + `accent`/`accent2`) with "Screenshots coming soon". The **last word of `site.headline` is set in italic serif**, so keep the emphasis word last. `#/<id>` links scroll to that app's panel.

### "Add this image / screenshot / video to <app>"
1. Create `assets/apps/<app-id>/` if needed and copy the file in with a descriptive kebab-case name.
2. Keep files light: screenshots → JPEG ≤ ~1600px wide (`sips -s format jpeg -s formatOptions 82 -Z 1600 in.png --out out.jpg`). Videos → short MP4 (H.264), ideally < 8 MB, with a `poster` JPEG.
3. Append to that app's `media` array: `{ "type": "image", "src": "assets/apps/<app-id>/<file>", "caption": "…" }`. Add `"device": "phone"` for portrait phone screenshots. Use `"type": "video"` (+ optional `"poster"`) for videos.
4. If it's the best visual, set it as `cover` (landscape ~16:10 works best).
5. Run `node scripts/validate.mjs`.

### "Update an app" (status change, new link, new description)
Edit that app's fields in `apps.json`. When an app ships, set `status` to `live` and add `url` (primary "Open app" button) and/or `links` (`[{ "label": "App Store", "url": "…" }]`).

### "Remove an app"
Delete its object in `apps.json` (and optionally its `assets/apps/<id>/` folder).

## `apps.json` schema (per app)
| Field | Notes |
| --- | --- |
| `id` | kebab-case, unique, used in the URL hash |
| `name`, `tagline`, `description` | `tagline` ≈ one line; `description` ≈ 2–4 sentences |
| `status` | `live` · `beta` · `in-development` · `coming-soon` |
| `category` | free text; becomes a filter option automatically |
| `platforms` | e.g. `["Web", "iOS", "Android"]` |
| `accent`, `accent2` | hex colours for the app icon gradient, panel tint and glow |
| `icon` | an emoji (or short text) drawn inside the layered app icon |
| `added` | `YYYY-MM-DD`; newest apps are listed first |
| `featured` | `true` pins the app to the top of the index and showcase |
| `url`, `links` | primary link ("Open app") and extra `{label, url}` buttons |
| `highlights` | 2–4 short phrases shown as a checklist |
| `cover` | landscape (~16:10) image for the Mac-window frame (optional) |
| `media` | list of `{type, src, caption, device?, poster?}` shown in the gallery + lightbox |

Site-level text (`site` object): `name`, `eyebrow`, `headline`, `subheadline`, `contactEmail` (currently hello@paruto.com; used by every contact link), `footer`, and optional `wordmark` (the big footer word; defaults to the first word of `name`).

## Deploying
Static files only — deploy the repo root as-is (Cloudflare Pages / Netlify / Vercel / GitHub Pages, no build command, no output dir). See README.md. After editing, remind the user to commit/push (or redeploy) so the change goes live — don't push without being asked.

## Style rules
- Don't hand-edit HTML for content; keep content in `apps.json`.
- Never fabricate app stats, reviews, download counts or testimonials.
- Keep the design system in `styles.css` (CSS variables at the top) — change look-and-feel there.
- Design language: dark editorial base (the user prefers this) refined with Apple's Human Interface Guidelines (developer.apple.com/design) — Liquid Glass (`.glass`) only on floating controls (nav, chips, segmented control, secondary buttons, preview, lightbox buttons), never on content; SF Pro / SF Mono via the system font stack (Geist fallback) with an Instrument Serif italic accent; Apple system colours for status; layered app icons; capsule buttons with spring motion; nested corner radii that stay concentric. Keep new UI consistent with that. The user did NOT like a light, apple.com-marketing-style layout.

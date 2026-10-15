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
If you rename an app's `id`, add the old id to its `aliases` so existing `#/<old-id>` links still scroll to it.

### "Remove an app"
Delete its object in `apps.json` (and optionally its `assets/apps/<id>/` folder).

## `apps.json` schema (per app)
| Field | Notes |
| --- | --- |
| `id` | kebab-case, unique, used in the URL hash |
| `aliases` | optional list of old ids (after a rename); `#/<old-id>` links open this app and the address bar switches to the current id |
| `name`, `tagline`, `description` | `tagline` ≈ one line; `description` ≈ 2–4 sentences |
| `status` | `live` · `beta` · `in-development` · `coming-soon` — apps are listed in this order (live first) |
| `category` | free text; becomes a filter option automatically |
| `platforms` | e.g. `["Web", "iOS", "Android"]` |
| `accent`, `accent2` | hex colours for the app icon gradient, panel tint and glow |
| `icon` | an emoji (or short text) drawn inside the layered app icon |
| `iconImage` | optional path without suffix to a brand app icon, e.g. `assets/apps/ivra/icon`; the site loads `<iconImage>-dark.svg` on the dark theme and `<iconImage>-light.svg` on light, in place of the emoji icon. Use the app's own square icon artwork (opaque tile); `icon` stays as the fallback |
| `added` | `YYYY-MM-DD`; within a status group, newest apps are listed first |
| `featured` | `true` puts the app first within its status group |
| `url`, `links` | primary link ("Open app") and extra `{label, url}` buttons |
| `highlights` | 2–4 short phrases shown as a checklist |
| `cover` | landscape (~16:10) image for the Mac-window frame (optional) |
| `media` | list of `{type, src, caption, device?, poster?}` shown in the gallery + lightbox |

Site-level text (`site` object): `name`, `eyebrow`, `headline`, `subheadline`, `contactEmail` (currently hello@paruto.com; used by every contact link), `footer`, and optional `wordmark` (the big footer word; defaults to the first word of `name`).

`site.family` lists the sister companies shown as "The Paruto family" link cards in the footer: `[{ "name": "Paruto Media", "logo": "assets/family/paruto-media-logo", "url": "https://parutomedia.com", "note": "one-liner" }]`. `logo` is optional: a path without the suffix; the site loads `<logo>-white.svg` on the dark theme and `<logo>-black.svg` on light. Lockups are copies from `~/Projects/paruto-brand/assets/logos` (never hand-edit them; regenerate there and copy over). Keep it in sync with the Companies on paruto.com (`~/Projects/paruto-com`). Paruto Apps itself isn't listed (it's this site).

## Roadmap
The showcase's own feature roadmap (what's built, in progress and still to come) is tracked at https://claude.ai/artifact/HRDvQTP7NN5VF5fK4YWLC6. When you ship a showcase feature (not routine app-listing updates), mark its item shipped there with the commit as the reference, and add new items for new feature requests. Update the data with the ArtifactData tool (collections `phases` and `items`); don't republish the page.

The Anansi: Swing City games (`games/anansi-swing-city/`, `games/anansi-swing-city-lite/`, `games/shared/`, and the leaderboard Worker in `~/Projects/anansi-leaderboard`) have their own roadmap at https://claude.ai/artifact/WPt2PLvN2hMVwEqpPXjSqB, in the same shape. When game work ships, mark the matching item shipped with the commit as the reference (append to `history`, set `shipped_on` and `updated_at`, pin writes with `if_version`); add new items for new feature requests.

## Deploying
Live at **https://apps.paruto.com** via **GitHub Pages** from `master` of the public repo `jonathanobise/paruto-apps` (no build step; `CNAME` + `.nojekyll` at the root — don't delete them). DNS: a CNAME record `apps` → `jonathanobise.github.io.` in DreamHost. HTTPS is enforced (Let's Encrypt, auto-renewed).
- **Keep the repo public.** On the free GitHub plan, Pages only serves public repos: making `paruto-apps` private deletes the Pages site and its custom-domain settings, and apps.paruto.com goes 404 (this happened 2026-10-13 to 15 Oct). If it happens, make the repo public, re-enable Pages from `master` `/`, and set the custom domain back to `apps.paruto.com`.
- **Every push to `master` redeploys** within a minute or two. After editing, remind the user to commit/push — don't push without being asked.
- `gh` lives at `/opt/homebrew/bin/gh` (not on the non-interactive PATH). Local git is old (2.15): push with
  `git -c http.postBuffer=157286400 -c http.version=HTTP/1.1 -c credential.helper= -c "credential.helper=!/opt/homebrew/bin/gh auth git-credential" push`
  or pushes containing images fail with HTTP 400.
- Check a deploy with `gh api repos/jonathanobise/paruto-apps/pages --jq .status` (wait for `built`).

## Style rules
- Don't hand-edit HTML for content; keep content in `apps.json`.
- Never fabricate app stats, reviews, download counts or testimonials.
- Keep the design system in `styles.css` (CSS variables at the top) — change look-and-feel there.
- Design language: dark editorial base (the user prefers this) refined with Apple's Human Interface Guidelines (developer.apple.com/design) — Liquid Glass (`.glass`) only on floating controls (nav, chips, segmented control, secondary buttons, preview, lightbox buttons), never on content; SF Pro / SF Mono via the system font stack (Geist fallback) with an Instrument Serif italic accent; Apple system colours for status; layered app icons; capsule buttons with spring motion; nested corner radii that stay concentric. Keep new UI consistent with that. **Dark is the default for every visitor regardless of OS setting**; light is opt-in via the nav sun/moon toggle (`:root[data-theme="light"]`, remembered in localStorage). Don't reintroduce `prefers-color-scheme` switching. The user did NOT like a light, apple.com-marketing-style layout.

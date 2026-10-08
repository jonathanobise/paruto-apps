# Paruto Apps — apps.paruto.com

A modern, static showcase for every app Paruto builds. No framework, no build step.

```
index.html   page shell
styles.css   design system (dark/light, responsive)
app.js       renders everything from apps.json
apps.json    ← the content: add/edit apps here
assets/apps/<app-id>/   screenshots & videos per app
scripts/validate.mjs    checks apps.json + that all referenced files exist
```

## Run locally
```bash
python3 -m http.server 8080   # then open http://localhost:8080
node scripts/validate.mjs     # sanity-check content
```
(It must be served over http — opening `index.html` directly can't load `apps.json`.)

## Updating with Claude
Open this folder in Claude Code and say things like:
- "I just shipped **Naija Hustle** — it's live at https://… Mark it live and add the link."
- "Add these 3 screenshots to Paruto Kids World" (drop them in the chat or give file paths).
- "Add a new app called … , a kids drawing app, in development."

Claude reads `CLAUDE.md` for the rules, edits `apps.json`, copies/compresses images, and validates.

## Deploy to apps.paruto.com
Any static host works — set **no build command** and publish the repo root.

**Cloudflare Pages / Netlify / Vercel:** connect the repo (or drag-drop the folder), then add the custom domain `apps.paruto.com` and create the CNAME record they show you at your DNS provider.

**GitHub Pages:** push to a repo, enable Pages on the main branch, set the custom domain to `apps.paruto.com`, and add a `CNAME` DNS record pointing to `<user>.github.io`.

Each app has a shareable deep link: `https://apps.paruto.com/#/paruto-kids-world`.

# Releases

VioWealth ships only through `npm run release`, from `wealthos/` on `master` (paruto-standards STANDARDS.md, Versioning; ADR-032).

## Numbering
Major.Minor.Patch, written v1.4.2, tagged `viowealth-v1.4.2`.
- **Patch** (v1.4.2 → v1.4.3): fixes and changes people won't notice. No note.
- **Minor** (→ v1.5.0): something people can feel (a feature, page, setting, visible improvement), always with a What's New note.
- **Major** (→ v2.0.0): people must adapt, or a milestone (the public launch, viowealth.com). Only with `--major`.

The command suggests the kind from what changed since the last tag and says why (`scripts/release-bump.mjs`): a waiting note, a new page or table → minor; a page taken away, a migration that drops or renames, a commit titled "[major]" or with a line starting "BREAKING:" → major (waits for `--major`); anything else → patch. Say which kind and why before every release.

## Writing the note
Add it at the top of `src/lib/updates/notes.ts` with `version: "next"` (id, date, at and version in that order, one per line). Lead with what it means for the person. The command stamps the number and time.

## What the command does
1. Checks it's on `master` with a clean tree; numbers the release.
2. Stamps the note; runs `npm run check`; stops on any failure.
3. Commits the note ("VioWealth vX.Y.Z"), tags the commit, and runs `deploy/demo/deploy.sh` (same environment as a deploy: `OWNER_EMAIL`, `PROFILE`, keys). The deploy reads the tag, so the build knows its number, its time and every earlier release.
4. If the deploy fails, the commit and tag are taken back. A research source that can't be reached at build time (for example BLS's keyless daily allowance running out) doesn't fail it: that source is left out of this build (its figures show as unavailable) and the deploy ends with "! Not loaded at this build: …". Redeploy later to fill it in.
5. Pushes `master` and the tag, then waits for `https://vio.paruto.com/__version` to show the release.

`npm run release -- --dry-run` shows the number and the plan and changes nothing.

## Where the version shows
The capsule at the foot of every page and the sidebar ("VioWealth v1.0.0") → the This Version sheet → `/whats-new` (the timeline). The bell's What's New half, the update pill ("VioWealth v1.1.0 is ready", from `/__version`), and the launch screen's edition line. Development builds show no number.

What's live: `curl -s https://vio.paruto.com/__version`.

# Rollback

apps.paruto.com is a static site served by Cloudflare (the Worker `paruto-apps`, static files only). There is no build step, database or migration.

## Roll back the last deploy (fastest)

Cloudflare keeps every deployed version. Put the previous one back in seconds, without touching git:

```bash
npx -y wrangler@4.141.0 deployments list --name paruto-apps
npx -y wrangler@4.141.0 rollback --name paruto-apps
```

Then fix forward in git, so the next deploy doesn't bring the bad change back.

## Roll back the last change in git

```bash
git revert --no-edit HEAD
git -c http.postBuffer=157286400 -c http.version=HTTP/1.1 -c credential.helper= -c "credential.helper=!/opt/homebrew/bin/gh auth git-credential" push
```

Then deploy `master` from a clean checkout (the command is in `CLAUDE.md`, "Deploying"): pushing alone doesn't deploy.

`git revert` adds a new commit that undoes the bad one, so history is kept and nothing needs a force-push. To undo several commits, revert each one, newest first (`git revert --no-edit <sha>`).

## Pull one app or game without reverting everything

- Remove its entry from `apps.json` to hide it from the showcase.
- To take a game offline, delete its folder under `games/` (the 404 page will then show). Git keeps the files, so restoring is `git checkout <good-sha> -- games/<folder>`.

## Confirm the rollback is live

```bash
curl -sI https://apps.paruto.com/ | grep -iE "^HTTP|^server"   # 200, server: cloudflare
```

Deploys are live within seconds. Every earlier version stays in git history, so any of them can be restored the same way.

## Kill switches and data

- No backend, accounts, payments or database. The games keep best scores and settings only in each player's browser (`localStorage`), so a rollback can't lose user data.
- The 3D game loads three.js from cdn.jsdelivr.net (pinned to 0.160.0). If that CDN is down the game shows a "3D engine didn't load" message; the 2D game has no such dependency.

## Who to tell

- Post status updates and questions to hello@paruto.com (the contact address shown on the site).

Note: on this Mac, `/usr/local/bin/git` is an Intel-only build that won't run. Use `/usr/bin/git` in the commands above until it is replaced.

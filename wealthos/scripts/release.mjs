#!/usr/bin/env node
/**
 * Releases VioWealth (docs/RELEASES.md): `npm run release` from wealthos/, on master.
 *
 * 1. Numbers the release Major.Minor.Patch (v1.4.2) from the latest `viowealth-v*` tag and says why
 *    (scripts/release-bump.mjs): a What's New note, a new page or table → minor; a page taken away, a
 *    dropping migration or a commit marked "[major]"/"BREAKING:" → major, made only with `--major`;
 *    anything else → patch. `--major`, `--minor` or `--patch` chooses instead. The first is v1.0.0.
 * 2. Stamps the What's New note written with `version: "next"` (src/lib/updates/notes.ts).
 * 3. Runs the checks (`npm run check`) and stops on any failure.
 * 4. Commits the stamped note, tags the commit viowealth-vX.Y.Z, and deploys it with
 *    deploy/demo/deploy.sh (PROFILE, OWNER_EMAIL… as for a deploy), which reads the tag for the
 *    build's number. If the deploy fails, the commit and tag are taken back: nothing changed.
 * 5. Pushes master and the tag, then waits for https://vio.paruto.com/__version to show the release.
 *
 * Flags: --dry-run (number it and show the plan; nothing changes), --major, --minor, --patch.
 * (Cloudflare Containers keep one version live, so there is no previous version kept at 0%: pages
 * already open pick up the new version through the update pill.)
 */
import { execSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { nextVersion, suggestBump } from "./release-bump.mjs";

const NOTES = "src/lib/updates/notes.ts";
const PREFIX = "viowealth-v";
const SITE = "https://vio.paruto.com";
const dry = process.argv.includes("--dry-run");

const sh = (cmd) => execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const run = (cmd, env = {}) => spawnSync(cmd, { shell: true, stdio: "inherit", env: { ...process.env, ...env } }).status === 0;
function fail(message) {
  console.error(`\n✖ Release stopped: ${message}`);
  process.exit(1);
}

/** Now in Lagos (the app's home time zone), as the parts a release needs. */
function lagos(at = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(at)
      .map((x) => [x.type, x.value]),
  );
  return { date: `${p.year}-${p.month}-${p.day}`, at: `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}+01:00` };
}

// 1. Where things stand.
if (sh("git branch --show-current") !== "master") fail("releases go from master (merge your branch first).");
if (sh("git status --porcelain -- . ':!deploy/demo/worker/node_modules'") && !dry) fail("commit or set aside your changes first (the release commits only its stamped note).");
const SEMVER = new RegExp(`^${PREFIX}(0|[1-9]\\d{0,2})\\.(0|[1-9]\\d{0,3})\\.(0|[1-9]\\d{0,4})$`);
const latest =
  sh(`git tag -l '${PREFIX}*'`)
    .split("\n")
    .map((t) => SEMVER.exec(t.trim()))
    .filter(Boolean)
    .map((m) => m.slice(1, 4).map(Number))
    .sort((a, b) => b[0] - a[0] || b[1] - a[1] || b[2] - a[2])[0] ?? null;
const since = latest ? `${PREFIX}${latest.join(".")}` : null;

let notes = readFileSync(NOTES, "utf8");
const waiting = notes.match(/^\s*version: "next",/gm)?.length ?? 0;
if (waiting > 1) fail(`more than one What's New note says version: "next" in ${NOTES}.`);

const rel = (p) => p.replace(/^wealthos\//, "");
const changes = since
  ? sh(`git diff --name-status ${since}..HEAD -- .`)
      .split("\n")
      .filter(Boolean)
      .map((l) => ({ status: l[0], path: rel(l.split("\t").at(-1)) }))
  : [];
const commits = since ? sh(`git log --format=%B%x00 ${since}..HEAD -- .`).split("\0").map((c) => c.trim()).filter(Boolean) : [];
const migrations = changes.filter((c) => c.status === "A" && /^drizzle\/.*\.sql$/.test(c.path)).map((c) => ({ path: c.path, sql: readFileSync(c.path, "utf8") }));
const suggestion = suggestBump({ noteWaiting: waiting > 0, changes, commits, migrations });
const chosen = ["major", "minor", "patch"].find((b) => process.argv.includes(`--${b}`)) ?? null;
const bump = chosen ?? suggestion.bump;
if (latest) console.log(`\nSuggested: ${suggestion.bump} (v${nextVersion(latest, suggestion.bump)}), because:\n${suggestion.reasons.map((r) => `  - ${r}`).join("\n")}`);
if (latest && suggestion.bump === "major" && !chosen && !dry) fail(`this looks like a major release. Run \`npm run release -- --major\` for v${nextVersion(latest, "major")}, or \`--minor\` if it isn't.`);
const release = nextVersion(latest, bump);
const tag = `${PREFIX}${release}`;
const now = lagos();

console.log(`\nVioWealth v${release}${dry ? " (dry run)" : ""}: ${latest ? `${bump}, after ${since}` : "the first numbered release"}`);
console.log(`  Note: ${waiting ? "stamped with this release" : "none (fix-only release)"}`);
console.log(`  Deploy: deploy/demo/deploy.sh (PROFILE=${process.env.PROFILE ?? "private"})`);
if (dry) process.exit(0);
if (process.env.PROFILE !== "demo" && !process.env.OWNER_EMAIL) fail("set OWNER_EMAIL for the private deployment (or PROFILE=demo).");

// 2. Stamp the note.
if (waiting) {
  const stamped = notes.replace(
    /id: "\d{4}-\d{2}-\d{2}(-[^"]+)",(\s*)date: "[^"]+",(\s*)at: "[^"]+",(\s*)version: "next",/,
    (_, slug, a, b, c) => `id: "${now.date}${slug}",${a}date: "${now.date}",${b}at: "${now.at}",${c}version: "${release}",`,
  );
  if (stamped === notes) fail(`write the note's id, date, at and version: "next" in that order, one per line, in ${NOTES}.`);
  notes = stamped;
  writeFileSync(NOTES, notes);
}

// 3. The checks: nothing ships past a failure.
if (!run("npm run check")) {
  if (waiting) execSync(`git checkout -- ${NOTES}`);
  fail("the checks failed.");
}

// 4. Record it, then deploy what was recorded.
if (waiting) execSync(`git commit -q -m "VioWealth v${release}" -m "Stamps the What's New note for v${release}." -- ${NOTES}`);
execSync(`git tag -a ${tag} -m "VioWealth v${release}"`);
/** What the live site says it is (null when it can't be reached). */
const liveNow = () =>
  fetch(`${SITE}/__version`, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
if (!run("deploy/demo/deploy.sh")) {
  // A late step can fail after the new version is already live (Cloudflare once throttled its
  // custom-domain check after the Worker and container had both been updated). Before taking the
  // release back, ask the site which build it is serving.
  const build = sh("git rev-parse --short=12 HEAD");
  let live = null;
  for (let i = 0; i < 24 && live?.build !== build; i++) {
    live = await liveNow();
    if (live?.build !== build) await new Promise((r) => setTimeout(r, 5_000));
  }
  if (live?.build !== build) {
    execSync(`git tag -d ${tag}`);
    if (waiting) execSync("git reset -q --keep HEAD~1");
    fail("the deploy didn't go through; the release commit and tag were taken back, and nothing changed in production.");
  }
  console.log(`\n! The deploy reported an error, but ${SITE} is serving this build (${build}), so the release stands.`);
}

// 5. Share it, and see it live.
if (!run(`git push -q origin master ${tag}`)) console.error(`\n! Live, but the push failed: push master and ${tag} by hand.`);
for (let i = 0; i < 36; i++) {
  const live = await liveNow();
  if (live?.release === release) {
    console.log(`\n✔ VioWealth v${release} is live at ${SITE} (${lagos().at}).`);
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, 5_000));
}
console.log(`\n! Deployed and tagged, but ${SITE}/__version doesn't show v${release} yet (the container may still be starting).`);

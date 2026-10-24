#!/usr/bin/env node
// Validates apps.json: required fields, unique ids, valid status, and that every referenced file exists.
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const STATUSES = ["live", "beta", "in-development", "coming-soon"];
const errors = [];
const warnings = [];

let data;
try {
  data = JSON.parse(readFileSync(join(root, "apps.json"), "utf8"));
} catch (e) {
  console.error(`✗ apps.json is not valid JSON: ${e.message}`);
  process.exit(1);
}

(data.site?.family ?? []).forEach((f, i) => {
  if (!f?.name || !/^https?:\/\//.test(f?.url ?? "")) errors.push(`site.family[${i}] needs a name and an http(s) url`);
  if (f?.logo) for (const v of ["white", "black"]) {
    const p = `${f.logo}-${v}.svg`;
    if (!existsSync(join(root, p))) errors.push(`site.family[${i}] logo file not found → ${p}`);
  }
});

const ids = new Set();
const checkFile = (app, label, p) => {
  if (!p) return;
  if (/^https?:\/\//.test(p)) return;
  if (!existsSync(join(root, p))) errors.push(`${app.id}: ${label} file not found → ${p}`);
};

for (const app of data.apps ?? []) {
  if (!app.id || !/^[a-z0-9-]+$/.test(app.id)) errors.push(`App "${app.name}" needs a kebab-case id`);
  if (ids.has(app.id)) errors.push(`Duplicate id: ${app.id}`);
  ids.add(app.id);
  for (const f of ["name", "tagline", "status"]) if (!app[f]) errors.push(`${app.id}: missing "${f}"`);
  if (app.status && !STATUSES.includes(app.status)) errors.push(`${app.id}: status must be one of ${STATUSES.join(", ")}`);
  if (!app.added) warnings.push(`${app.id}: no "added" date (YYYY-MM-DD) — used for sorting`);
  checkFile(app, "cover", app.cover);
  if (app.iconImage) for (const v of ["dark", "light"]) checkFile(app, "iconImage", `${app.iconImage}-${v}.svg`);
  (app.media ?? []).forEach((m, i) => {
    if (!["image", "video"].includes(m.type)) errors.push(`${app.id}: media[${i}].type must be image or video`);
    checkFile(app, `media[${i}]`, m.src);
    checkFile(app, `media[${i}].poster`, m.poster);
  });
  // Unannounced projects (codenames) are listed in Files with no pictures on purpose
  if (!app.cover && !(app.media ?? []).length && app.category !== "Unannounced") warnings.push(`${app.id}: no cover/media yet (its app icon will be shown)`);
}

// Old ids kept so renamed apps' links still work: kebab-case, and never another app's id or alias
const aliasOwner = new Map();
for (const app of data.apps ?? []) {
  if (app.aliases === undefined) continue;
  if (!Array.isArray(app.aliases)) { errors.push(`${app.id}: "aliases" must be a list of old ids`); continue; }
  for (const a of app.aliases) {
    if (typeof a !== "string" || !/^[a-z0-9-]+$/.test(a)) errors.push(`${app.id}: alias "${a}" must be kebab-case`);
    else if (ids.has(a)) errors.push(`${app.id}: alias "${a}" is already another app's id`);
    else if (aliasOwner.has(a)) errors.push(`${app.id}: alias "${a}" is also listed by ${aliasOwner.get(a)}`);
    else aliasOwner.set(a, app.id);
  }
}

// The hero wall's small copies (scripts/wall-thumbs.mjs): missing or older than the original means the wall loads the
// full-size image instead, which still works but is slow.
{
  const { statSync } = await import("node:fs");
  const at = (p) => join(root, p);
  const wall = (src) => src.replace(/^assets\/apps\//, "assets/wall/").replace(/\.[a-z0-9]+$/i, ".webp");
  const stale = data.apps.flatMap((app) => [app.cover, ...(app.media ?? []).filter((m) => m.type === "image").map((m) => m.src)])
    .filter((s) => s && /^assets\/apps\/.+\.(jpe?g|png|webp)$/i.test(s) && existsSync(at(s)))
    .filter((s) => !existsSync(at(wall(s))) || statSync(at(wall(s))).mtimeMs < statSync(at(s)).mtimeMs);
  if (stale.length) warnings.push(`${new Set(stale).size} wall image(s) have no up-to-date small copy: run node scripts/wall-thumbs.mjs`);
}

warnings.forEach((w) => console.warn(`! ${w}`));
if (errors.length) {
  errors.forEach((e) => console.error(`✗ ${e}`));
  process.exit(1);
}
console.log(`✓ apps.json OK — ${data.apps.length} app(s)`);

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
  (app.media ?? []).forEach((m, i) => {
    if (!["image", "video"].includes(m.type)) errors.push(`${app.id}: media[${i}].type must be image or video`);
    checkFile(app, `media[${i}]`, m.src);
    checkFile(app, `media[${i}].poster`, m.poster);
  });
  if (!app.cover && !(app.media ?? []).length) warnings.push(`${app.id}: no cover/media yet (a generated cover will be shown)`);
}

warnings.forEach((w) => console.warn(`! ${w}`));
if (errors.length) {
  errors.forEach((e) => console.error(`✗ ${e}`));
  process.exit(1);
}
console.log(`✓ apps.json OK — ${data.apps.length} app(s)`);

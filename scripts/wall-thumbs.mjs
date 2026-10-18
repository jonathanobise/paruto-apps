// Makes the hero wall's small copies: every image the wall shows (each app's cover and screenshots) as a 640px-wide
// WebP in assets/wall/<app-id>/<name>.webp. The wall loads these and falls back to the original when one is missing,
// so new screenshots appear straight away; run this to make them light: `node scripts/wall-thumbs.mjs`.
// Needs cwebp (brew install webp). Only redoes copies older than their original.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { apps } = JSON.parse(readFileSync(join(root, "apps.json"), "utf8"));

/** assets/apps/<id>/<name>.<ext> → assets/wall/<id>/<name>.webp (keep in step with wallSrc in app.js). */
export const wallPath = (src) => src.replace(/^assets\/apps\//, "assets/wall/").replace(/\.[a-z0-9]+$/i, ".webp");

const sources = new Set(apps.flatMap((a) => [a.cover, ...(a.media ?? []).filter((m) => m.type === "image").map((m) => m.src)]).filter((s) => s && /^assets\/apps\/.+\.(jpe?g|png|webp)$/i.test(s)));
let made = 0, kept = 0, before = 0, after = 0;
for (const src of sources) {
  const from = join(root, src), to = join(root, wallPath(src));
  if (!existsSync(from)) { console.warn(`! missing ${src}`); continue; }
  before += statSync(from).size;
  if (existsSync(to) && statSync(to).mtimeMs >= statSync(from).mtimeMs) { kept++; after += statSync(to).size; continue; }
  mkdirSync(dirname(to), { recursive: true });
  execFileSync("cwebp", ["-quiet", "-q", "68", "-resize", "640", "0", "-metadata", "none", from, "-o", to]);
  made++;
  after += statSync(to).size;
}
console.log(`wall copies: ${made} made, ${kept} up to date · ${(before / 1e6).toFixed(1)} MB of originals → ${(after / 1e6).toFixed(1)} MB`);

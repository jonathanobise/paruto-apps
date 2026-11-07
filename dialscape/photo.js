// Your own photo as a wallpaper, with the subject cut out so it stands in front of the time.
// The cut-out runs on the device (MediaPipe's interactive segmenter, self-hosted in vendor/); photos never leave it.

import { paletteFromImage } from "./render.js";

const MAX_SIDE = 2400;    // photos are kept at most this big
const SEG_SIDE = 1024;    // and cut out at this size

/* ───────────── storage (IndexedDB) ───────────── */
let dbp = null;
function db() {
  if (!dbp) dbp = new Promise((res, rej) => {
    const req = indexedDB.open("dialscape", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("photos", { keyPath: "id" });
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
  return dbp;
}
async function tx(mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction("photos", mode);
    const out = fn(t.objectStore("photos"));
    t.oncomplete = () => res(out?.result ?? out);
    t.onerror = () => rej(t.error);
  });
}
export const putPhoto = (rec) => tx("readwrite", (s) => s.put(rec)).catch(() => {});
export const getPhoto = (id) => tx("readonly", (s) => s.get(id)).catch(() => null);
export const deletePhoto = (id) => tx("readwrite", (s) => s.delete(id)).catch(() => {});
export const photoIds = () => tx("readonly", (s) => s.getAllKeys()).catch(() => []);

/* ───────────── loading ───────────── */
function canvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
const toBlob = (c, type = "image/jpeg", q = 0.92) => new Promise((r) => c.toBlob(r, type, q));

async function decode(blob) {
  const bmp = await createImageBitmap(blob);
  const s = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const c = canvas(Math.round(bmp.width * s), Math.round(bmp.height * s));
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return c;
}

/** A picked file → a stored photo record and its live form ({ id, image, mask, pal, ... }). */
export async function importPhoto(file, extra = {}) {
  const image = await decode(file);
  const id = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const blob = await toBlob(image);
  const rec = { id, blob, mask: null, point: null, depth: true, fx: 0.5, fy: 0.5, added: Date.now(), ...extra };
  await putPhoto(rec);
  return live(rec, image, null);
}

/** Loads a stored photo back into its live form. */
export async function loadPhoto(id) {
  const rec = await getPhoto(id);
  if (!rec) return null;
  const image = await decode(rec.blob);
  const mask = rec.mask ? await decode(rec.mask) : null;
  return live(rec, image, mask);
}

function live(rec, image, mask) {
  return { id: rec.id, image, mask, point: rec.point, depth: rec.depth !== false, fx: rec.fx ?? 0.5, fy: rec.fy ?? 0.5, zoom: rec.zoom, ai: !!rec.ai, prompt: rec.prompt, pal: paletteFromImage(image), rec };
}

export async function savePhotoState(photo) {
  const rec = { ...photo.rec, point: photo.point, depth: photo.depth, fx: photo.fx, fy: photo.fy, zoom: photo.zoom };
  if (photo.mask) rec.mask = await toBlob(photo.mask, "image/png");
  photo.rec = rec;
  await putPhoto(rec);
}

/* ───────────── subject cut-out ───────────── */
let segmenterP = null;
function segmenter() {
  if (!segmenterP) segmenterP = (async () => {
    const base = new URL("./vendor/", import.meta.url).href;
    const { FilesetResolver, InteractiveSegmenter } = await import("./vendor/vision_bundle.mjs");
    const files = await FilesetResolver.forVisionTasks(base + "wasm");
    return InteractiveSegmenter.createFromOptions(files, {
      baseOptions: { modelAssetPath: base + "magic_touch.tflite" },
      outputCategoryMask: false,
      outputConfidenceMasks: true,
    });
  })().catch((e) => { segmenterP = null; throw e; });
  return segmenterP;
}
export const warmUpSegmenter = () => segmenter().then(() => true, () => false);

/**
 * Cuts out the subject under point {x, y} (0–1 across the photo). Returns a canvas the photo's size whose alpha
 * is the subject, with softened edges.
 */
export async function cutOut(photo, point) {
  const seg = await segmenter();
  const s = Math.min(1, SEG_SIDE / Math.max(photo.image.width, photo.image.height));
  const small = canvas(Math.round(photo.image.width * s), Math.round(photo.image.height * s));
  small.getContext("2d").drawImage(photo.image, 0, 0, small.width, small.height);
  const { data, width, height } = await new Promise((res, rej) => {
    try {
      seg.segment(small, { keypoint: { x: point.x, y: point.y } }, (result) => {
        const m = result.confidenceMasks?.[0];
        if (!m) return rej(new Error("no mask"));
        res({ data: m.getAsFloat32Array().slice(), width: m.width, height: m.height });
        result.close?.();
      });
    } catch (e) { rej(e); }
  });
  // confidence → alpha with a soft but firm edge
  const mc = canvas(width, height);
  const mx = mc.getContext("2d");
  const img = mx.createImageData(width, height);
  let on = 0;
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    const a = v <= 0.3 ? 0 : v >= 0.7 ? 1 : (v - 0.3) / 0.4;
    const sm = a * a * (3 - 2 * a);
    img.data[i * 4 + 3] = Math.round(sm * 255);
    if (sm > 0.5) on++;
  }
  mx.putImageData(img, 0, 0);
  const full = canvas(photo.image.width, photo.image.height);
  const fx = full.getContext("2d");
  fx.imageSmoothingQuality = "high";
  if ("filter" in fx) fx.filter = `blur(${Math.max(0.6, full.width / 1400)}px)`;
  fx.drawImage(mc, 0, 0, full.width, full.height);
  return { mask: full, coverage: on / data.length };
}

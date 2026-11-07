// Dialscape's public drawing API: picks a scene and a clock, paints the layers once, then composes
// back → time → front (→ the time's reflection on water) every tick.

import {
  BACKGROUNDS, CLOCKS, makePalette, renderClock as drawClassicClock, rng, makeNoise, grain, makeCanvas, timeParts,
  randomSeed, hexA, mix, luminance, oklch,
} from "./engine.js";
import { TYPES, SCENES } from "./studio.js";

export const TYPE_STYLES = Object.entries(TYPES).map(([id, t]) => ({ id, name: t.name, seconds: !!t.seconds, premium: true }));
export const CLASSIC_CLOCKS = Object.entries(CLOCKS).map(([id, c]) => ({ id, name: c.name, seconds: !!c.seconds }));
export const SCENE_STYLES = Object.entries(SCENES).map(([id, s]) => ({ id, name: s.name, depth: !!s.front }));
export const PATTERN_STYLES = Object.entries(BACKGROUNDS).map(([id, b]) => ({ id, name: b.name }));
export const ALL_CLOCKS = [...TYPE_STYLES, ...CLASSIC_CLOCKS];
export const ALL_BACKS = [...SCENE_STYLES, ...PATTERN_STYLES];

export const isClock = (id) => id === "none" || !!TYPES[id] || !!CLOCKS[id];
export const isBack = (id) => id === "photo" || !!SCENES[id] || !!BACKGROUNDS[id];
export const clockHasSeconds = (id) => !!(TYPES[id]?.seconds || CLOCKS[id]?.seconds);

const POS = { high: 0.4, middle: 0.5, low: 0.6 };

export function frameFor(w, h, spec) {
  const portrait = h >= w * 1.05;
  const f = portrait
    ? { w, h, portrait, cx: w / 2, cy: h * (POS[spec.pos] ?? 0.5), W: w * 0.86, maxH: h * 0.5, seed: spec.seed }
    : { w, h, portrait, cx: w / 2, cy: h * 0.5, W: Math.min(w * 0.62, h * 1.25), maxH: h * 0.86, seed: spec.seed };
  return SCENES[spec.bg]?.frame ? SCENES[spec.bg].frame(f) : f;
}

/* ───────────── shuffle ───────────── */
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export function randomSpec(lock = {}, prev = {}) {
  const classic = Math.random() < 0.15;
  const pattern = Math.random() < 0.2;
  return {
    clock: lock.clock ? prev.clock : pick(classic ? CLASSIC_CLOCKS : TYPE_STYLES).id,
    bg: lock.bg ? prev.bg : pick(pattern ? PATTERN_STYLES : SCENE_STYLES).id,
    pal: lock.pal ? prev.pal : randomSeed(),
    seed: lock.bg ? prev.seed : randomSeed(),
    pos: prev.pos || "middle",
    photo: lock.bg ? prev.photo : undefined,
  };
}
// The same date always gives the same "wallpaper of the day"
export function dailySpec(date = new Date()) {
  const r = rng(`daily2:${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`);
  const id = () => Math.floor(r() * 1e9).toString(36).slice(0, 5);
  return { clock: r.pick(TYPE_STYLES).id, bg: r.pick(SCENE_STYLES).id, pal: id(), seed: id(), pos: "middle" };
}

/* ───────────── photos ───────────── */
function coverRect(iw, ih, w, h, fx = 0.5, fy = 0.5) {
  const s = Math.max(w / iw, h / ih);
  const dw = iw * s, dh = ih * s;
  return [(w - dw) * fx, (h - dh) * fy, dw, dh];
}

/** Where the photo lands: cover-fit, then scaled by photo.zoom (zoomed-out photos sit on the bottom edge). */
export function photoRect(photo, w, h) {
  const z = photo.zoom ?? 1;
  const [, , cw, ch] = coverRect(photo.image.width, photo.image.height, w, h);
  const dw = cw * z, dh = ch * z;
  const fy = z < 1 ? 1 : photo.fy ?? 0.5;
  return [(w - dw) * (photo.fx ?? 0.5), (h - dh) * fy, dw, dh];
}

/**
 * Picks the photo size and clock position where the subject overlaps the time enough to give depth but leaves
 * it readable. Returns { zoom, pos, overlap }.
 */
export function autoPlace(photo, spec) {
  const w = 120, h = 260;
  const clock = TYPES[spec.clock] ? spec.clock : "tower";
  let best = null;
  for (const zoom of [1, 0.85, 0.72, 0.6]) for (const pos of ["middle", "high", "low"]) {
    const s = { ...spec, clock, bg: "photo", pos };
    const L = buildLayers(w, h, s, { ...photo, zoom, depth: true });
    if (!L.front) return { zoom: 1, pos: spec.pos || "middle", overlap: 0 };
    const t = makeCanvas(w, h);
    drawTime(t.getContext("2d"), L, s, new Date(2026, 0, 1, 10, 48));
    const a = t.getContext("2d").getImageData(0, 0, w, h).data;
    const b = L.front.getContext("2d").getImageData(0, 0, w, h).data;
    let ink = 0, hidden = 0;
    for (let i = 3; i < a.length; i += 4) { const v = a[i] / 255; ink += v; hidden += v * (b[i] / 255); }
    const overlap = ink ? hidden / ink : 0;
    // aim for about a fifth of the digits behind the subject; prefer the photo big and the time in the middle
    const score = Math.abs(overlap - 0.2) + (1 - zoom) * 0.25 + (pos === "middle" ? 0 : 0.04) + (overlap > 0.42 ? 1 : 0);
    if (!best || score < best.score) best = { zoom, pos, overlap, score };
  }
  return best;
}

/** Colours taken from a photo: a small k-means over a thumbnail, ink chosen for the area behind the time. */
export function paletteFromImage(img) {
  const S = 48;
  const c = makeCanvas(S, S);
  const x = c.getContext("2d", { willReadFrequently: true });
  x.drawImage(img, ...coverRect(img.width, img.height, S, S));
  const d = x.getImageData(0, 0, S, S).data;
  const px = [];
  for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]]);
  const r = rng("kmeans");
  let cent = Array.from({ length: 5 }, () => px[Math.floor(r() * px.length)].slice());
  for (let it = 0; it < 8; it++) {
    const sum = cent.map(() => [0, 0, 0, 0]);
    for (const p of px) {
      let best = 0, bd = Infinity;
      cent.forEach((c2, k) => { const dd = (p[0] - c2[0]) ** 2 + (p[1] - c2[1]) ** 2 + (p[2] - c2[2]) ** 2; if (dd < bd) { bd = dd; best = k; } });
      const s = sum[best]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++;
    }
    cent = sum.map((s, k) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : cent[k]));
  }
  const hex = (c2) => "#" + c2.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  const cols = cent.map(hex).sort((a, b) => luminance(a) - luminance(b));
  const sat = (h2) => { const n = parseInt(h2.slice(1), 16); const rr = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255; return (Math.max(rr, g, b) - Math.min(rr, g, b)) / 255; };
  // brightness in the band where the time usually sits
  const band = x.getImageData(0, Math.floor(S * 0.25), S, Math.floor(S * 0.4)).data;
  let lum = 0;
  for (let i = 0; i < band.length; i += 4) lum += (0.2126 * band[i] + 0.7152 * band[i + 1] + 0.0722 * band[i + 2]) / 255;
  lum /= band.length / 4;
  const light = lum > 0.62;
  let accent = [...cols].sort((a, b) => sat(b) - sat(a))[0];
  if (sat(accent) < 0.18) accent = light ? "#c2462b" : "#ffcf7a";
  else accent = light ? mix(accent, "#000000", 0.25) : mix(accent, "#ffffff", 0.3);
  return { name: "From your photo", bg: [cols[0], cols[1], cols[3], cols[4]], ink: light ? "#141210" : "#fbf8f2", accent, light };
}

/* ───────────── layers ───────────── */
/**
 * Paints the expensive parts once. `photo` is { image, mask, pal } when spec.bg === "photo".
 * Returns { w, h, back, front, type, pal, frame, water }.
 */
export function buildLayers(w, h, spec, photo) {
  const frame = frameFor(w, h, spec);
  const usePhoto = spec.bg === "photo" && photo?.image;
  let pal = usePhoto ? photo.pal : makePalette(spec.pal);
  // night scenes need a dark palette: step through the seed's siblings until one is
  if (!usePhoto && SCENES[spec.bg]?.night) for (let k = 1; pal.light && k < 12; k++) pal = makePalette(spec.pal + "~" + k);
  const back = makeCanvas(w, h);
  const bctx = back.getContext("2d");
  let front = null, water = null;
  if (usePhoto) {
    const rect = photoRect(photo, w, h);
    if ((photo.zoom ?? 1) < 1) {
      // zoomed out: the gap is filled with a blurred, dimmed copy of the photo
      const cover = coverRect(photo.image.width, photo.image.height, w, h);
      if ("filter" in bctx) {
        bctx.filter = `blur(${Math.round(w / 30)}px)`;
        bctx.drawImage(photo.image, cover[0] - w * 0.1, cover[1] - h * 0.1, cover[2] + w * 0.2, cover[3] + h * 0.2);
        bctx.filter = "none";
      } else {
        // no canvas filters: shrink and grow back in steps, which blurs smoothly
        let src = photo.image, sw = photo.image.width, sh = photo.image.height;
        for (const k of [8, 32]) {
          const c = makeCanvas(Math.max(4, Math.round(w / k)), Math.max(4, Math.round(h / k)));
          c.getContext("2d").drawImage(src, ...(src === photo.image ? coverRect(sw, sh, c.width, c.height) : [0, 0, c.width, c.height]));
          src = c;
        }
        const mid = makeCanvas(Math.round(w / 4), Math.round(h / 4));
        mid.getContext("2d").drawImage(src, 0, 0, mid.width, mid.height);
        bctx.imageSmoothingQuality = "high";
        bctx.drawImage(mid, 0, 0, w, h);
      }
      bctx.fillStyle = "rgba(0,0,0,0.22)";
      bctx.fillRect(0, 0, w, h);
      const soft = makeCanvas(w, h);
      const sx = soft.getContext("2d");
      sx.drawImage(photo.image, ...rect);
      sx.globalCompositeOperation = "destination-in";
      const fade = rect[3] * 0.08;
      const g = sx.createLinearGradient(0, rect[1], 0, rect[1] + fade);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "#000");
      sx.fillStyle = g;
      sx.fillRect(0, rect[1], w, fade);
      sx.fillStyle = "#000";
      sx.fillRect(0, rect[1] + fade, w, h);
      bctx.drawImage(soft, 0, 0);
    } else bctx.drawImage(photo.image, ...rect);
    if (photo.mask && photo.depth !== false) {
      front = makeCanvas(w, h);
      const f = front.getContext("2d");
      f.drawImage(photo.image, ...rect);
      f.globalCompositeOperation = "destination-in";
      f.drawImage(photo.mask, ...rect);
    }
  } else if (SCENES[spec.bg]) {
    const sc = SCENES[spec.bg];
    const noise = makeNoise(rng(`noise:${spec.seed}`));
    bctx.save();
    sc.back(bctx, w, h, pal, rng(`back:${spec.bg}:${spec.seed}`), noise, frame);
    bctx.restore();
    grain(bctx, w, h, spec.seed, pal.light ? 0.05 : 0.07);
    if (sc.front) {
      front = makeCanvas(w, h);
      const fctx = front.getContext("2d");
      sc.front(fctx, w, h, pal, rng(`front:${spec.bg}:${spec.seed}`), noise, frame, back);
    }
    if (sc.water) water = sc.water(w, h, frame);
  } else {
    const bg = BACKGROUNDS[spec.bg] || BACKGROUNDS.mesh;
    bctx.save();
    bg.draw(bctx, w, h, pal, rng(`bg:${spec.bg}:${spec.seed}`), makeNoise(rng(`noise:${spec.seed}`)));
    bctx.restore();
    grain(bctx, w, h, spec.seed, pal.light ? 0.05 : 0.07);
  }
  return { w, h, back, front, type: null, pal, frame, water, spec };
}

/** Draws the time alone onto ctx (transparent elsewhere). */
export function drawTime(ctx, L, spec, date) {
  if (spec.clock === "none") return;
  const T = TYPES[spec.clock];
  if (T) {
    ctx.save();
    T.draw(ctx, L.frame, timeParts(date), L.pal, rng(`type:${spec.clock}:${spec.seed}`));
    ctx.restore();
  } else drawClassicClock(ctx, L.w, L.h, spec, date, L.pal);
}

/** One finished frame: back, time, front, and the time mirrored in water. */
export function compose(ctx, L, date = new Date(), spec = L.spec) {
  const { w, h } = L;
  if (!L.type) L.type = makeCanvas(w, h);
  const tctx = L.type.getContext("2d");
  tctx.clearRect(0, 0, w, h);
  drawTime(tctx, L, spec, date);
  ctx.drawImage(L.back, 0, 0);
  ctx.drawImage(L.type, 0, 0);
  if (L.front) ctx.drawImage(L.front, 0, 0);
  if (L.water) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, L.water, w, h - L.water);
    ctx.clip();
    ctx.globalAlpha = 0.32;
    ctx.translate(0, L.water * 2);
    ctx.scale(1, -1);
    ctx.drawImage(L.type, 0, 0);
    ctx.restore();
  }
}

export function renderAll(ctx, w, h, spec, date, photo) {
  const L = buildLayers(w, h, spec, photo);
  compose(ctx, L, date);
  return L;
}

export function paletteOf(spec, photo) {
  if (spec.bg === "photo" && photo?.pal) return photo.pal;
  let pal = makePalette(spec.pal);
  if (SCENES[spec.bg]?.night) for (let k = 1; pal.light && k < 12; k++) pal = makePalette(spec.pal + "~" + k);
  return pal;
}
export { randomSeed, hexA, oklch };

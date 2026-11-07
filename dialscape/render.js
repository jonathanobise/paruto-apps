// Dialscape's public drawing API: picks a scene and a clock, paints the layers once, then composes
// back → time → front (→ the time's reflection on water) every tick.

import {
  BACKGROUNDS, CLOCKS, makePalette, renderClock as drawClassicClock, rng, makeNoise, grain, makeCanvas, timeParts,
  randomSeed, hexA, mix, luminance, oklch, clockFrame, hour12,
} from "./engine.js";
import { TYPES, SCENES, DATE, TYPEFACE } from "./studio.js";
import { GPU_SCENES, renderGpu, depthCode, depthDistance } from "./gpu.js";

export const TYPE_STYLES = Object.entries(TYPES).map(([id, t]) => ({ id, name: t.name, seconds: !!t.seconds, premium: true }));
export const CLASSIC_CLOCKS = Object.entries(CLOCKS).map(([id, c]) => ({ id, name: c.name, seconds: !!c.seconds }));
// 3D scenes (GPU) first, then the illustrated ones
export const GPU_STYLES = Object.entries(GPU_SCENES).map(([id, s]) => ({ id, name: s.name, depth: true, gpu: true }));
export const ILLUSTRATED_STYLES = Object.entries(SCENES).map(([id, s]) => ({ id, name: s.name, depth: !!s.front }));
export const SCENE_STYLES = [...GPU_STYLES, ...ILLUSTRATED_STYLES];
export const PATTERN_STYLES = Object.entries(BACKGROUNDS).map(([id, b]) => ({ id, name: b.name }));
export const ALL_CLOCKS = [...TYPE_STYLES, ...CLASSIC_CLOCKS];
export const ALL_BACKS = [...SCENE_STYLES, ...PATTERN_STYLES];

export const isClock = (id) => id === "none" || !!TYPES[id] || !!CLOCKS[id];
export const isBack = (id) => id === "photo" || !!GPU_SCENES[id] || !!SCENES[id] || !!BACKGROUNDS[id];
export const isGpuScene = (id) => !!GPU_SCENES[id];
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
  const aspect = photo.image.width / photo.image.height;
  const zooms = aspect > 0.75 ? [0.72, 0.62, 0.55, 0.85] : [1, 0.85, 0.72, 0.6];
  for (const zoom of zooms) for (const pos of ["middle", "high", "low"]) {
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
    const score = Math.abs(overlap - 0.2) + Math.abs(zooms[0] - zoom) * 0.25 + (pos === "middle" ? 0 : 0.04) + (overlap > 0.42 ? 1 : 0);
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
const hashSeed = (s) => { let x = 2166136261; for (const ch of String(s)) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };

export function buildLayers(w, h, spec, photo) {
  const frame = frameFor(w, h, spec);
  const usePhoto = spec.bg === "photo" && photo?.image;
  let pal = usePhoto ? photo.pal : makePalette(spec.pal);
  // night scenes need a dark palette: step through the seed's siblings until one is
  if (!usePhoto && (SCENES[spec.bg]?.night || GPU_SCENES[spec.bg]?.dark)) for (let k = 1; pal.light && k < 12; k++) pal = makePalette(spec.pal + "~" + k);
  const back = makeCanvas(w, h);
  const bctx = back.getContext("2d");
  let front = null, water = null;
  let sceneId = spec.bg;
  if (!usePhoto && GPU_SCENES[sceneId]) {
    const g = GPU_SCENES[sceneId];
    const out = renderGpu(sceneId, w, h, {
      pal, seedValue: (hashSeed(spec.seed) % 10000) / 100, focus: frame.cy / h,
      depth: spec.zd ?? g.depth, time: (hashSeed(spec.seed) % 600) / 10,
    }, makeCanvas);
    if (out) {
      bctx.drawImage(out.back, 0, 0);
      if (g.horizon != null) water = frame.cy + g.horizon * h;
      // the front layer is cut from the depth map in compose(), at the depth chosen for the clock on top
      return { w, h, back, front: null, type: null, pal, frame, water, spec, gpu: sceneId, depth: out };
    }
    sceneId = g.fallback;   // no WebGL2: the illustrated scene closest in spirit
  }
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
    if ((photo.zoom ?? 1) < 1 && rect[1] > 1 && "filter" in bctx) {
      // the sky above a zoomed-out picture continues its top edge, softly
      const ih = photo.image.height, iw = photo.image.width;
      const ext = makeCanvas(w, h);
      const ex = ext.getContext("2d");
      ex.filter = `blur(${Math.round(w / 22)}px)`;
      ex.drawImage(photo.image, 0, 0, iw, Math.max(2, Math.round(ih * 0.03)), rect[0] - w * 0.1, -h * 0.06, rect[2] + w * 0.2, rect[1] + rect[3] * 0.05 + h * 0.06);
      ex.filter = "none";
      ex.globalCompositeOperation = "destination-in";
      const g = ex.createLinearGradient(0, rect[1], 0, rect[1] + rect[3] * 0.08);
      g.addColorStop(0, "#000"); g.addColorStop(1, "rgba(0,0,0,0)");
      ex.fillStyle = "#000"; ex.fillRect(0, 0, w, rect[1]);
      ex.fillStyle = g; ex.fillRect(0, rect[1], w, rect[3] * 0.08);
      bctx.drawImage(ext, 0, 0);
    }
    if (photo.mask && photo.depth !== false) {
      front = makeCanvas(w, h);
      const f = front.getContext("2d");
      f.drawImage(photo.image, ...rect);
      f.globalCompositeOperation = "destination-in";
      f.drawImage(photo.mask, ...rect);
    }
  } else if (SCENES[sceneId]) {
    const sc = SCENES[sceneId];
    const noise = makeNoise(rng(`noise:${spec.seed}`));
    bctx.save();
    sc.back(bctx, w, h, pal, rng(`back:${sceneId}:${spec.seed}`), noise, frame);
    bctx.restore();
    grain(bctx, w, h, spec.seed, pal.light ? 0.05 : 0.07);
    if (sc.front) {
      front = makeCanvas(w, h);
      const fctx = front.getContext("2d");
      sc.front(fctx, w, h, pal, rng(`front:${sceneId}:${spec.seed}`), noise, frame, back);
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

/* ───────────── editor settings ───────────── */
// Optional spec fields set in the editor: sz (time size), dx/dy (offset as a share of the screen), ink/acc (colours),
// h12 (12-hour), df (date format), face (typeface), cap (caption line).
export const DATE_FORMATS = [
  { id: "auto", name: "Style's own" }, { id: "caps", name: "7 NOV 2026" }, { id: "slash", name: "07/11/2026" },
  { id: "long", name: "SATURDAY, NOVEMBER 7" }, { id: "script", name: "7 Nov 2026" }, { id: "none", name: "No date" },
];
export const TYPEFACES = [
  { id: "auto", name: "Style's own" }, { id: "anton", name: "Anton" }, { id: "bebas", name: "Bebas" }, { id: "shoulders", name: "Shoulders" },
  { id: "antonio", name: "Antonio" }, { id: "sixcaps", name: "Six Caps" }, { id: "serif", name: "Serif" }, { id: "grot", name: "Grotesk" }, { id: "wide", name: "Unbounded" },
];
const HEX = /^#[0-9a-f]{6}$/i;

function editedFrame(L, spec) {
  const f = { ...L.frame, blurred: blurOf(L) };
  const sz = Math.min(1.5, Math.max(0.5, spec.sz ?? 1));
  f.W *= sz; f.maxH *= sz;
  f.cx += (spec.dx ?? 0) * f.w;
  f.cy += (spec.dy ?? 0) * f.h;
  if (spec.face && spec.face !== "auto" && TYPEFACE[spec.face]) f.face = spec.face;
  if (spec.df && spec.df !== "auto") f.date = spec.df === "none" ? null : DATE[spec.df];
  return f;
}
export function timePalette(pal, spec) {
  if (!spec.ink && !spec.acc) return pal;
  return { ...pal, ink: HEX.test(spec.ink) ? spec.ink : pal.ink, accent: HEX.test(spec.acc) ? spec.acc : pal.accent };
}
// A soft copy of the back layer, for frosted-glass digits
function blurOf(L) {
  if (L.blurred) return L.blurred;
  const small = makeCanvas(Math.max(8, Math.round(L.w / 6)), Math.max(8, Math.round(L.h / 6)));
  const s = small.getContext("2d");
  if ("filter" in s) { s.filter = `blur(${Math.max(2, Math.round(small.width / 40))}px)`; s.drawImage(L.back, -small.width * 0.05, -small.height * 0.05, small.width * 1.1, small.height * 1.1); }
  else {
    const tiny = makeCanvas(Math.max(4, Math.round(L.w / 30)), Math.max(4, Math.round(L.h / 30)));
    tiny.getContext("2d").drawImage(L.back, 0, 0, tiny.width, tiny.height);
    s.imageSmoothingQuality = "high";
    s.drawImage(tiny, 0, 0, small.width, small.height);
  }
  L.blurred = small;
  return small;
}

/** Draws the time alone onto ctx (transparent elsewhere). */
export function drawTime(ctx, L, spec, date) {
  if (spec.clock === "none") return;
  const pal = timePalette(L.pal, spec);
  const T = TYPES[spec.clock];
  const t = timeParts(date);
  if (spec.h12) t.H = hour12(t.H);
  ctx.save();
  if (T) T.draw(ctx, editedFrame(L, spec), t, pal, rng(`type:${spec.clock}:${spec.seed}`));
  else {
    // classic faces: move and scale around their own centre
    const { cx, cy } = clockFrame(L.w, L.h, spec);
    const sz = spec.sz ?? 1;
    ctx.translate(cx + (spec.dx ?? 0) * L.w, cy + (spec.dy ?? 0) * L.h);
    ctx.scale(sz, sz);
    ctx.translate(-cx, -cy);
    drawClassicClock(ctx, L.w, L.h, spec, date, pal);
  }
  ctx.restore();
}

function drawCaption(ctx, L, spec) {
  const text = (spec.cap || "").trim();
  if (!text) return;
  const { w, h } = L;
  const pal = timePalette(L.pal, spec);
  const size = Math.min(w, h) * 0.06;
  ctx.save();
  ctx.font = `italic 400 ${size}px ${TYPEFACE.serif}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = pal.light ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.55)";
  ctx.shadowBlur = size * 0.5;
  ctx.fillStyle = pal.ink;
  let s = size;
  while (ctx.measureText(text).width > w * 0.84 && s > size * 0.5) { s *= 0.92; ctx.font = `italic 400 ${s}px ${TYPEFACE.serif}`; }
  ctx.fillText(text, w / 2, h >= w ? h * 0.835 : h * 0.88);
  ctx.restore();
}

/* ───────────── smart depth (GPU scenes) ───────────── */
// Without a Depth setting, the time is placed so about a fifth of it is hidden by nearer parts of the scene,
// whatever the clock's size and style. With one (spec.zd 0–1), it sits at that point between the scene's near and far.
const AUTO_HIDDEN = 0.22;
function depthRange(L) { const g = GPU_SCENES[L.gpu]; return [depthCode(g.near), depthCode(g.far)]; }
export function sceneDepthFor(L, spec, date = new Date()) {
  const g = GPU_SCENES[L.gpu];
  if (!g) return null;
  if (g.near === g.far) return { code: depthCode(g.near), zd: 0.5, auto: false };
  if (spec.zd != null) return { code: depthCode(g.near * Math.pow(g.far / g.near, spec.zd)), zd: spec.zd, auto: false };
  const key = [spec.clock, spec.sz, spec.dx, spec.dy, spec.face, spec.df, spec.h12].join("|");
  if (L.autoKey !== key) {
    const { depth, rw, rh } = L.depth;
    const k = Math.max(1, Math.round(rw / 160));
    const sw = Math.max(8, Math.round(rw / k)), sh = Math.max(8, Math.round(rh / k));
    const t = makeCanvas(sw, sh);
    drawTime(t.getContext("2d"), { ...L, w: sw, h: sh, frame: frameFor(sw, sh, spec), blurred: null }, spec, date);
    const a = t.getContext("2d").getImageData(0, 0, sw, sh).data;
    const hist = new Float64Array(256);
    let ink = 0;
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const v = a[(y * sw + x) * 4 + 3] / 255;
      if (v < 0.15) continue;
      const dx2 = Math.min(rw - 1, Math.round((x + 0.5) * (rw / sw))), dy2 = Math.min(rh - 1, Math.round((y + 0.5) * (rh / sh)));
      hist[depth[dy2 * rw + dx2]] += v;
      ink += v;
    }
    const [lo, hi] = depthRange(L);
    let code = hi, acc = 0;
    if (ink) for (let c = 0; c < 256; c++) { acc += hist[c]; if (acc / ink > AUTO_HIDDEN) { code = c; break; } }
    code = Math.max(lo, Math.min(hi, code));
    L.autoKey = key;
    L.autoCode = code;
  }
  const zd = Math.log(depthDistance(L.autoCode) / g.near) / Math.log(g.far / g.near);
  return { code: L.autoCode, zd: Math.max(0, Math.min(1, zd)), auto: true };
}
function cutFront(L, spec, date) {
  const { code } = sceneDepthFor(L, spec, date);
  if (L.frontCode === code) return;
  const { depth, rw, rh, small } = L.depth;
  const mask = makeCanvas(rw, rh);
  const mx = mask.getContext("2d");
  const img = mx.createImageData(rw, rh);
  let any = false;
  for (let i = 0; i < depth.length; i++) if (depth[i] < code) { img.data[i * 4 + 3] = 255; any = true; }
  L.frontCode = code;
  if (!any) { L.front = null; return; }
  mx.putImageData(img, 0, 0);
  const front = makeCanvas(L.w, L.h);
  const fx = front.getContext("2d");
  fx.imageSmoothingQuality = "high";
  fx.drawImage(small, 0, 0, L.w, L.h);
  fx.globalCompositeOperation = "destination-in";
  // a hair of blur softens the cut-out edge
  if ("filter" in fx) fx.filter = `blur(${Math.max(0.5, L.w / 1600)}px)`;
  fx.drawImage(mask, 0, 0, L.w, L.h);
  L.front = front;
}

function drawLayer(ctx, img, w, h, scale = 1, ox = 0, oy = 0) {
  if (scale === 1 && !ox && !oy) return ctx.drawImage(img, 0, 0);
  ctx.save();
  ctx.translate(w / 2 + ox, h / 2 + oy);
  ctx.scale(scale, scale);
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

/**
 * One finished frame: back, time, front, the time mirrored in water, and the caption.
 * opts.parallax {x, y} in -1..1 shifts the layers apart (live clock tilt); opts.motion 0..1 is the phase of the
 * looping motion wallpaper; opts.home draws the matching home-screen picture (no time).
 */
export function compose(ctx, L, date = new Date(), spec = L.spec, opts = {}) {
  const { w, h } = L;
  if (L.depth) cutFront(L, spec, date);
  let bs = 1, bx = 0, by = 0, fs = 1, fx = 0, fy = 0, tx = 0, ty = 0;
  if (opts.parallax) {
    const { x, y } = opts.parallax;
    bs = 1.07; bx = -x * w * 0.03; by = -y * h * 0.018;
    fs = 1.04; fx = x * w * 0.022; fy = y * h * 0.012;
    tx = -x * w * 0.008; ty = -y * h * 0.005;
  }
  if (opts.motion != null) {
    const z = (1 - Math.cos(opts.motion * Math.PI * 2)) / 2;
    bs = 1.02 + 0.05 * z; by = -h * 0.006 * z;
    fs = 1.01 + 0.018 * z; fy = h * 0.004 * z;
  }
  ctx.fillStyle = "#000";
  if (bs !== 1) ctx.fillRect(0, 0, w, h);
  drawLayer(ctx, L.back, w, h, bs, bx, by);
  if (opts.home) {
    if (L.front) drawLayer(ctx, L.front, w, h, fs, fx, fy);
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    ctx.fillRect(0, 0, w, h);
    return;
  }
  if (!L.type) L.type = makeCanvas(w, h);
  const tctx = L.type.getContext("2d");
  tctx.clearRect(0, 0, w, h);
  drawTime(tctx, L, spec, date);
  const covers = !!TYPES[spec.clock]?.covers;
  drawLayer(ctx, L.type, w, h, 1, tx, ty);
  if (L.front && !covers) drawLayer(ctx, L.front, w, h, fs, fx, fy);
  if (L.water && !covers) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, L.water, w, h - L.water);
    ctx.clip();
    ctx.globalAlpha = 0.32;
    ctx.translate(tx, L.water * 2 + ty);
    ctx.scale(1, -1);
    ctx.drawImage(L.type, 0, 0);
    ctx.restore();
  }
  drawCaption(ctx, L, spec);
}

export function renderAll(ctx, w, h, spec, date, photo) {
  const L = buildLayers(w, h, spec, photo);
  compose(ctx, L, date);
  return L;
}

export function paletteOf(spec, photo) {
  if (spec.bg === "photo" && photo?.pal) return photo.pal;
  let pal = makePalette(spec.pal);
  if (SCENES[spec.bg]?.night || GPU_SCENES[spec.bg]?.dark) for (let k = 1; pal.light && k < 12; k++) pal = makePalette(spec.pal + "~" + k);
  return pal;
}
export { randomSeed, hexA, oklch };

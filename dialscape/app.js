import {
  TYPE_STYLES, CLASSIC_CLOCKS, SCENE_STYLES, PATTERN_STYLES, ALL_CLOCKS, ALL_BACKS, isClock, isBack, clockHasSeconds,
  GPU_STYLES, ILLUSTRATED_STYLES, isGpuScene,
  randomSpec, dailySpec, buildLayers, compose, paletteOf, autoPlace, photoRect, randomSeed, DATE_FORMATS, TYPEFACES, timePalette, sceneDepthFor,
} from "./render.js";
import * as Photo from "./photo.js";
import { describe } from "./describe.js";
import { GPU_SCENES } from "./gpu.js";
const GPU_DEFAULT_DEPTH = Object.fromEntries(Object.entries(GPU_SCENES).map(([id, g]) => [id, g.depth]));
import { zip } from "./zip.js";

/* ───────────── devices ───────────── */
// Screen sizes in pixels (portrait). "auto" reads this device's screen.
const DEVICES = [
  { id: "auto", name: "This device" },
  { id: "iphone-max", name: "iPhone Pro Max / Plus", w: 1320, h: 2868 },
  { id: "iphone-pro", name: "iPhone Pro / 17", w: 1206, h: 2622 },
  { id: "iphone", name: "iPhone 6.1″", w: 1179, h: 2556 },
  { id: "iphone-se", name: "iPhone SE", w: 750, h: 1334 },
  { id: "pixel-xl", name: "Pixel Pro XL", w: 1344, h: 2992 },
  { id: "pixel", name: "Pixel", w: 1080, h: 2424 },
  { id: "galaxy-ultra", name: "Galaxy Ultra", w: 1440, h: 3120 },
  { id: "android", name: "Android FHD+", w: 1080, h: 2400 },
  { id: "ipad", name: "iPad", w: 1640, h: 2360 },
  { id: "desktop", name: "Desktop 4K", w: 3840, h: 2160 },
];
const isTouch = matchMedia("(pointer: coarse)").matches;
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isAndroid = /Android/i.test(navigator.userAgent);

function deviceSize(id) {
  const d = DEVICES.find((x) => x.id === id) || DEVICES[1];
  if (d.id !== "auto") return [d.w, d.h];
  const dpr = Math.min(window.devicePixelRatio || 1, 4);
  let w = Math.round(screen.width * dpr), h = Math.round(screen.height * dpr);
  if (isTouch && w > h) [w, h] = [h, w];
  return [w, h];
}

/* ───────────── state ───────────── */
const store = {
  get(k, fallback) { try { const v = localStorage.getItem("dialscape:" + k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem("dialscape:" + k, JSON.stringify(v)); } catch {} },
};
const prefs = store.get("prefs", {});
const state = {
  spec: null,
  lock: { clock: false, bg: false, pal: false, ...(prefs.lock || {}) },
  device: prefs.device || (isTouch ? "auto" : "iphone-max"),
  time: "now", // or "HH:MM"
  mock: prefs.mock || (prefs.guides ? "guides" : "off"), // lock-screen preview: off · guides · ios · android
  tab: "explore",
  collection: "all",
  history: [],
  palOptions: [],
  explore: [],
  saved: store.get("saved", []),
  photo: null,      // the live photo in use, if any
  photoRev: 0,      // bumped when its cut-out, size or depth change
  tapMode: false,
  busy: false,
};
const savePrefs = () => store.set("prefs", { lock: state.lock, device: state.device, mock: state.mock });

const specKey = (s) => hashOf(s);
const designKey = (s) => [s.clock, s.bg, s.pal, s.seed, s.bg === "photo" ? s.photo : ""].join("|");
function specFromHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  const clock = q.get("c"), bg = q.get("b");
  if (!clock || !bg || !isClock(clock) || !isBack(bg)) return null;
  const clean = (v) => (v || "").replace(/[^a-z0-9~]/gi, "").slice(0, 16) || randomSeed();
  const spec = { clock, bg, pal: clean(q.get("p")), seed: clean(q.get("s")), pos: ["high", "middle", "low"].includes(q.get("y")) ? q.get("y") : "middle" };
  if (bg === "photo") spec.photo = clean(q.get("ph"));
  // editor settings
  const num = (k, lo, hi) => { const v = Number(q.get(k)); return q.has(k) && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : undefined; };
  const hex = (k) => (/^[0-9a-f]{6}$/i.test(q.get(k) || "") ? "#" + q.get(k).toLowerCase() : undefined);
  Object.assign(spec, {
    sz: num("z", 0.5, 1.5), dx: num("x", -0.5, 0.5), dy: num("v", -0.5, 0.5), ink: hex("i"), acc: hex("a"),
    h12: q.get("t") === "12" || undefined,
    df: DATE_FORMATS.some((d) => d.id === q.get("d")) ? q.get("d") : undefined,
    face: TYPEFACES.some((d) => d.id === q.get("f")) ? q.get("f") : undefined,
    cap: q.get("cap") ? q.get("cap").slice(0, 48) : undefined,
    zd: num("k", 0, 1),
  });
  return tidy(spec);
}
// drops editor fields left at their defaults
function tidy(spec) {
  const s = { ...spec };
  if (s.sz == null || Math.abs(s.sz - 1) < 0.005) delete s.sz;
  for (const k of ["dx", "dy"]) if (s[k] == null || Math.abs(s[k]) < 0.002) delete s[k];
  for (const k of ["ink", "acc", "h12", "cap"]) if (!s[k]) delete s[k];
  for (const k of ["df", "face"]) if (!s[k] || s[k] === "auto") delete s[k];
  if (s.zd == null || !isGpuScene(s.bg)) delete s.zd;
  if (s.bg !== "photo") delete s.photo;
  return s;
}
const r3 = (v) => Math.round(v * 1000) / 1000;
function hashOf(s) {
  let out = `#c=${s.clock}&b=${s.bg}&p=${s.pal}&s=${s.seed}&y=${s.pos}${s.bg === "photo" ? `&ph=${s.photo}` : ""}`;
  if (s.sz) out += `&z=${r3(s.sz)}`;
  if (s.dx) out += `&x=${r3(s.dx)}`;
  if (s.dy) out += `&v=${r3(s.dy)}`;
  if (s.ink) out += `&i=${s.ink.slice(1)}`;
  if (s.acc) out += `&a=${s.acc.slice(1)}`;
  if (s.h12) out += "&t=12";
  if (s.df) out += `&d=${s.df}`;
  if (s.face) out += `&f=${s.face}`;
  if (s.cap) out += `&cap=${encodeURIComponent(s.cap)}`;
  if (s.zd != null) out += `&k=${r3(s.zd)}`;
  return out;
}
const EDIT_KEYS = ["sz", "dx", "dy", "ink", "acc", "h12", "df", "face", "cap"];
const editsOf = (s) => Object.fromEntries(EDIT_KEYS.filter((k) => s[k] != null).map((k) => [k, s[k]]));
// what the painted layers depend on (the time and editor settings are drawn on top every tick)
const layerKeyOf = (s) => [s.bg, s.pal, s.seed, s.pos, s.bg === "photo" ? s.photo : ""].join("|");

/* ───────────── elements ───────────── */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const phone = $("#phone"), preview = $("#preview"), panel = $("#panel");

function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, "");
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  el.append(...kids.flat().filter((k) => k != null));
  return el;
}

const toastEl = $("#toast");
let toastTimer;
function toast(msg, ms = 2600) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), ms);
}

/* ───────────── time ───────────── */
function displayDate() {
  if (state.time === "now") return new Date();
  const [hh, mm] = state.time.split(":").map(Number);
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d;
}

/* ───────────── photos ───────────── */
const photoCache = new Map();
const photoFor = (spec) => (spec.bg === "photo" ? (state.photo?.id === spec.photo ? state.photo : photoCache.get(spec.photo)) : null);
function layers(w, h, spec) { return buildLayers(w, h, spec, photoFor(spec)); }
const layerCache = new Map();
// layers for thumbnails, kept while the panel is open
function cachedLayers(w, h, spec) {
  const k = `${layerKeyOf(spec)}|${w}x${h}|${state.photoRev}`;
  if (!layerCache.has(k)) { if (layerCache.size > 60) layerCache.clear(); layerCache.set(k, layers(w, h, spec)); }
  return layerCache.get(k);
}

/* ───────────── preview ───────────── */
let L = null, layerKey = "", raf = 0, tickTimer = 0;

function sizePhone() {
  const [w, h] = deviceSize(state.device);
  phone.style.setProperty("--ar", `${w} / ${h}`);
  phone.style.setProperty("--arn", (w / h).toFixed(4));
  const landscape = w > h;
  phone.style.setProperty("--pw", landscape ? "440px" : "300px");
  phone.style.setProperty("--pr", landscape ? "18px" : state.device === "iphone-se" ? "24px" : "44px");
}

function previewPixels() {
  const [w, h] = deviceSize(state.device);
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const cw = Math.max(80, Math.round(phone.clientWidth * dpr));
  return [cw, Math.round(cw * (h / w))];
}

function drawPreview() {
  const [w, h] = previewPixels();
  const key = `${layerKeyOf(state.spec)}|${w}x${h}|${state.photoRev}`;
  if (preview.width !== w || preview.height !== h) { preview.width = w; preview.height = h; }
  if (key !== layerKey) { L = layers(w, h, state.spec); layerKey = key; }
  compose(preview.getContext("2d"), L, displayDate(), state.spec);
}

function loop() {
  cancelAnimationFrame(raf);
  clearTimeout(tickTimer);
  if (document.hidden || !$("#live").hidden) return;
  drawPreview();
  if (state.time !== "now") return;
  if (clockHasSeconds(state.spec.clock)) raf = requestAnimationFrame(loop);
  else tickTimer = setTimeout(loop, 1000 - (Date.now() % 1000) + 5);
}

function themeFromPalette() {
  const p = timePalette(paletteOf(state.spec, photoFor(state.spec)), state.spec);
  const root = document.documentElement.style;
  root.setProperty("--glow", p.bg[2]);
  root.setProperty("--glow-2", p.bg[3]);
  const bright = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
  const accent = bright(p.accent) > 0.5 ? p.accent : bright(p.bg[3]) > 0.5 ? p.bg[3] : "#ffcf7a";
  root.setProperty("--accent", accent);
  return p;
}

const nameOf = (list, id) => list.find((x) => x.id === id)?.name;
function updateMeta() {
  const s = state.spec;
  const p = themeFromPalette();
  const clockName = s.clock === "none" ? "No clock" : nameOf(ALL_CLOCKS, s.clock);
  const bgName = s.bg === "photo" ? (photoFor(s)?.ai ? "AI scene" : "Your photo") : nameOf(ALL_BACKS, s.bg);
  const [w, hgt] = deviceSize(state.device);
  $("#meta").textContent = `${clockName} · ${bgName} · ${p.name || "Custom"} — ${w} × ${hgt}`;
  preview.setAttribute("aria-label", `Wallpaper preview: ${clockName} clock on ${bgName}`);
  const k = $("#kicker");
  if (designKey(s) === designKey(dailySpec())) k.textContent = `Today's wallpaper · ${new Date().toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}`;
  else k.textContent = s.bg === "photo" ? "Your photo" : "Your design";
  const saved = state.saved.some((x) => designKey(x) === designKey(s));
  $("#favBtn").setAttribute("aria-pressed", saved);
  $("#favBtn").setAttribute("aria-label", saved ? "Remove from saved" : "Add to saved");
  $("#savedCount").textContent = state.saved.length;
  phone.classList.toggle("tap-mode", state.tapMode && s.bg === "photo");
}

function setSpec(spec, { push = false, animate = true, panel: repaint = true, record = true } = {}) {
  spec = tidy(spec);
  if (record && state.spec && specKey(state.spec) !== specKey(spec)) {
    state.history.push(state.spec);
    if (state.history.length > 40) state.history.shift();
  }
  $("#undoBtn").disabled = !state.history.length;
  state.spec = spec;
  if (spec.bg !== "photo") state.tapMode = false;
  const url = hashOf(spec);
  if (location.hash !== url) history[push ? "pushState" : "replaceState"](null, "", url);
  updateMeta();
  if (animate) { phone.classList.remove("busy"); void phone.offsetWidth; phone.classList.add("busy"); }
  loop();
  if (repaint) renderPanel();
}

/* ───────────── thumbnails ───────────── */
let thumbJob = 0;
function thumbCanvas(cssW = 74, cssH = 160) {
  const c = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = Math.round(cssW * dpr); c.height = Math.round(cssH * dpr);
  c.style.width = cssW + "px"; c.style.height = cssH + "px";
  return c;
}
// Paints thumbnails a few at a time so the controls never stall
function paintThumbs(jobs) {
  const id = ++thumbJob;
  let i = 0;
  const step = () => {
    if (id !== thumbJob) return;
    const t0 = performance.now();
    while (i < jobs.length && performance.now() - t0 < 14) jobs[i++]();
    if (i < jobs.length) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function paintSpec(cv, spec, date = displayDate()) {
  compose(cv.getContext("2d"), cachedLayers(cv.width, cv.height, spec), date, spec);
}
const optButton = (text, pressed, onclick, canvas, extra = "") =>
  h("button", { class: "opt " + extra, "aria-pressed": String(pressed), onclick }, canvas, h("span", {}, text));
const label = (text) => h("p", { class: "section-label" }, text);

/* ───────────── panel (tabs) ───────────── */
function renderPanel() {
  const s = state.spec;
  panel.replaceChildren();
  $$(".tabs [role=tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === state.tab)));
  const date = displayDate();
  const jobs = [];

  if (state.tab === "explore") {
    const COLLECTIONS = {
      all: { name: "All" },
      depth3d: { name: "3D", bg: GPU_STYLES.map((g) => g.id), clock: ["tower", "thin", "fade", "glass", "neon", "script", "mirror", "chrome"] },
      city: { name: "City", bg: ["skyline"], clock: ["neon", "tower", "fade", "split", "chrome", "glass", "knockout"] },
      nature: { name: "Nature", bg: ["pines", "homestead", "bloom", "sea"], clock: ["thin", "fade", "script", "mirror", "tower", "glass"] },
      space: { name: "Space", bg: ["star", "borealis"], clock: ["outline", "script", "thin", "glass", "neon", "dots"] },
      retro: { name: "Retro", bg: ["retro"], clock: ["neon", "chrome", "dots", "extrude", "split"] },
      minimal: { name: "Minimal", bg: ["mesh", "aurora", "prism", "halftone"], clock: ["thin", "fade", "mirror", "outline", "glass", "knockout", "column"] },
    };
    const input = h("input", { type: "text", class: "describe-input", placeholder: "Describe it: pink neon city at night", "aria-label": "Describe a wallpaper", maxlength: "80" });
    const go = () => {
      const words = input.value.trim();
      if (!words) return input.focus();
      const { spec, matched } = describe(words, { pos: s.pos, ...keptEdits(s, {}) });
      setSpec(spec);
      toast(matched.length ? `Made from: ${matched.join(" · ")}` : "No words matched, so here's a surprise. Try “gold city” or “misty forest”.", 3200);
    };
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    const paint = () => {
      const words = input.value.trim();
      if (!words) { input.focus(); return toast("Describe the picture first, e.g. “a fox on a misty hill at dawn”"); }
      generateAI(words, state.aiStyle);
    };
    panel.append(h("div", { class: "describe" }, input, h("button", { class: "chip solid", onclick: go }, "Create")));
    panel.append(h("div", { class: "row ai-row" }, h("button", { class: "chip glass ai", onclick: paint }, "✦ Paint it with AI"),
      h("span", { class: "fine-inline" }, "Makes a new picture from your words, then puts its subject in front of the time.")));
    panel.append(h("div", { class: "chips coll" }, Object.entries(COLLECTIONS).map(([id, c]) =>
      h("button", { class: "chip glass", "aria-pressed": String(state.collection === id), onclick: () => { state.collection = id; state.explore = []; renderPanel(); } }, c.name))));
    if (!state.explore.length) {
      const c = COLLECTIONS[state.collection];
      const pickOf = (arr) => arr[Math.floor(Math.random() * arr.length)];
      state.explore = Array.from({ length: 12 }, () => {
        const x = randomSpec({}, { pos: "middle" });
        if (c.bg) { x.bg = pickOf(c.bg); x.clock = pickOf(c.clock); }
        return x;
      });
    }
    const grid = h("div", { class: "explore" });
    for (const spec of state.explore) {
      const cv = thumbCanvas(104, 225);
      const mine = { ...spec, pos: s.pos, ...keptEdits(s, {}) };
      grid.append(h("button", {
        class: "opt big", "aria-pressed": String(designKey(spec) === designKey(s)),
        "aria-label": `${nameOf(ALL_CLOCKS, spec.clock)} on ${nameOf(ALL_BACKS, spec.bg)}`, onclick: () => setSpec(mine),
      }, cv));
      jobs.push(() => paintSpec(cv, mine, date));
    }
    panel.append(grid, h("div", { class: "row" },
      h("button", { class: "chip glass", onclick: () => { state.explore = []; renderPanel(); } }, "↻ More ideas"),
      h("button", { class: "chip glass", onclick: pickPhoto }, "＋ Use your photo")));
  }

  if (state.tab === "edit") panel.append(editPanel());

  if (state.tab === "clock") {
    let base = null;
    const strip = (items) => {
      const el = h("div", { class: "strip" });
      for (const c of items) {
        const cv = thumbCanvas();
        const spec = { ...s, clock: c.id };
        el.append(optButton(c.name, s.clock === c.id, () => setSpec(spec), cv));
        jobs.push(() => {
          if (!base) base = cachedLayers(cv.width, cv.height, s);
          compose(cv.getContext("2d"), base, date, spec);
        });
      }
      return el;
    };
    panel.append(label("Poster"), strip(TYPE_STYLES), label("Classic"), strip([...CLASSIC_CLOCKS, { id: "none", name: "No clock" }]));
  }

  if (state.tab === "bg") {
    if (s.bg === "photo" && state.photo) panel.append(photoTools());
    const photoStrip = h("div", { class: "strip" });
    if (state.photo) {
      const cv = thumbCanvas();
      const spec = { ...s, bg: "photo", photo: state.photo.id };
      photoStrip.append(optButton("Your photo", s.bg === "photo", () => setSpec(spec), cv));
      jobs.push(() => paintSpec(cv, spec, date));
    }
    photoStrip.append(h("button", { class: "opt new", "aria-label": "Use a photo", onclick: pickPhoto },
      h("span", { class: "swatch" }, "+"), h("span", {}, state.photo ? "New photo" : "Add photo")));
    const strip = (items) => {
      const el = h("div", { class: "strip" });
      for (const b of items) {
        const cv = thumbCanvas();
        const spec = { ...s, bg: b.id };
        delete spec.photo;
        el.append(optButton(b.name, s.bg === b.id, () => setSpec(spec), cv));
        jobs.push(() => paintSpec(cv, spec, date));
      }
      return el;
    };
    panel.append(aiBlock(), label("Your photo, with depth"), photoStrip, label("3D scenes"), strip(GPU_STYLES), label("Illustrated"), strip(ILLUSTRATED_STYLES), label("Patterns"), strip(PATTERN_STYLES));
    if (s.bg !== "photo") panel.append(h("div", { class: "row" },
      h("button", { class: "chip glass", onclick: () => setSpec({ ...s, seed: randomSeed() }) }, "↻ New variation of this art")));
  }

  if (state.tab === "pal") {
    if (s.bg === "photo") {
      const p = paletteOf(s, photoFor(s));
      panel.append(h("p", { class: "note" }, "Colours are picked from your photo, so the time always belongs to it."),
        h("div", { class: "swatches" }, [...p.bg, p.accent, p.ink].map((c) => h("i", { style: `background:${c}` }))));
    } else {
      if (!state.palOptions.length || !state.palOptions.includes(s.pal)) state.palOptions = [s.pal, ...Array.from({ length: 9 }, randomSeed)];
      const strip = h("div", { class: "strip" });
      for (const ps of state.palOptions) {
        const cv = thumbCanvas();
        const spec = { ...s, pal: ps };
        strip.append(optButton(paletteOf(spec).name, s.pal === ps, () => setSpec(spec), cv));
        jobs.push(() => paintSpec(cv, spec, date));
      }
      strip.append(h("button", {
        class: "opt new", "aria-label": "More colours",
        onclick: () => { state.palOptions = [s.pal, ...Array.from({ length: 9 }, randomSeed)]; renderPanel(); },
      }, h("span", { class: "swatch" }, "↻"), h("span", {}, "More")));
      panel.append(strip);
    }
  }

  if (state.tab === "fit") {
    const chips = (items, current, onpick) => h("div", { class: "chips" }, items.map((it) =>
      h("button", { class: "chip glass", "aria-pressed": String(current === it.id), onclick: () => onpick(it.id) }, it.name, it.note ? h("small", {}, it.note) : null)));
    const [aw, ah] = deviceSize("auto");
    const timeInput = h("input", { type: "time", value: state.time === "now" ? "10:10" : state.time, "aria-label": "Time shown on the wallpaper" });
    timeInput.addEventListener("change", () => { state.time = timeInput.value || "10:10"; renderPanel(); loop(); });
    panel.append(h("div", { class: "fit" },
      h("div", { class: "field" }, h("span", { class: "label" }, "Screen"),
        chips(DEVICES.map((d) => ({ id: d.id, name: d.name, note: d.id === "auto" ? `${aw}×${ah}` : null })), state.device, (id) => {
          state.device = id; savePrefs(); sizePhone(); layerKey = ""; updateMeta(); loop(); renderPanel();
        })),
      h("div", { class: "field" }, h("span", { class: "label" }, "Clock position"),
        chips([{ id: "high", name: "Higher" }, { id: "middle", name: "Middle" }, { id: "low", name: "Lower" }], s.pos, (id) => setSpec({ ...s, pos: id }, { animate: false }))),
      h("div", { class: "field" }, h("span", { class: "label" }, "Time on the wallpaper"),
        h("div", { class: "row" },
          chips([{ id: "now", name: "Now" }, { id: "pick", name: "Pick a time" }], state.time === "now" ? "now" : "pick", (id) => {
            state.time = id === "now" ? "now" : timeInput.value || "10:10"; renderPanel(); loop();
          }),
          state.time === "now" ? null : timeInput)),
      h("div", { class: "field" }, h("span", { class: "label" }, "Preview on a lock screen"),
        chips([{ id: "off", name: "Off" }, { id: "ios", name: "iPhone" }, { id: "android", name: "Android" }, { id: "guides", name: "Guides" }], state.mock, (id) => {
          state.mock = id; savePrefs(); applyMock(); renderPanel();
        })),
    ));
  }
  paintThumbs(jobs);
}

/* ───────────── editor ───────────── */
function editPanel() {
  const s = state.spec;
  const pal = timePalette(paletteOf(s, photoFor(s)), s);
  const set = (patch, opts) => setSpec({ ...state.spec, ...patch }, { animate: false, panel: false, ...opts });
  const chips = (items, current, onpick) => h("div", { class: "chips" }, items.map((it) =>
    h("button", { class: "chip glass", "aria-pressed": String(current === it.id), onclick: () => { onpick(it.id); renderPanel(); } }, it.name)));
  const slider = (text, value, min, max, step, onchange) => {
    const input = h("input", { type: "range", min, max, step, value: String(value), "aria-label": text });
    input.addEventListener("pointerdown", () => state.history.push(state.spec));
    input.addEventListener("input", () => onchange(Number(input.value)));
    return h("label", { class: "slider" }, h("span", {}, text), input);
  };
  const colour = (text, key, current) => {
    const input = h("input", { type: "color", value: current, "aria-label": text });
    input.addEventListener("input", () => set({ [key]: input.value }, { record: false }));
    input.addEventListener("change", () => set({ [key]: input.value }));
    return h("label", { class: "colour" }, input, h("span", {}, text));
  };
  const caption = h("input", { type: "text", class: "describe-input", maxlength: "48", placeholder: "Add a line of your own (optional)", value: s.cap || "", "aria-label": "Caption" });
  caption.addEventListener("input", () => set({ cap: caption.value }, { record: false }));
  const classic = !ALL_CLOCKS.find((c) => c.id === s.clock)?.premium;
  return h("div", { class: "fit" },
    h("p", { class: "note" }, isTouch ? "Drag the time on the preview to move it." : "Drag the time on the preview to move it, or use the sliders."),
    isGpuScene(s.bg) ? (() => {
      const now = L?.gpu ? sceneDepthFor(L, s) : null;
      return h("div", { class: "field" }, h("span", { class: "label" }, "Depth in the scene"),
        slider("Depth", Math.round((s.zd ?? now?.zd ?? GPU_DEFAULT_DEPTH[s.bg] ?? 0.5) * 100), 0, 100, 1, (v) => set({ zd: v / 100 }, { record: false })),
        h("div", { class: "row" },
          h("button", { class: "chip glass", "aria-pressed": String(s.zd == null), onclick: () => { set({ zd: undefined }); renderPanel(); } }, "✦ Auto"),
          h("span", { class: "fine-inline" }, s.zd == null ? "Auto keeps about a fifth of the time behind the scene." : "Slide right to push the time back into the scene.")));
    })() : null,
    h("div", { class: "field" }, h("span", { class: "label" }, "Size and place"),
      slider("Size", Math.round((s.sz ?? 1) * 100), 50, 150, 1, (v) => set({ sz: v / 100 }, { record: false })),
      h("div", { class: "row" },
        h("button", { class: "chip glass", onclick: () => { set({ dx: 0, dy: 0, sz: 1 }); renderPanel(); } }, "Centre and reset size"))),
    h("div", { class: "field" }, h("span", { class: "label" }, "Colours"),
      h("div", { class: "row" },
        colour("Time", "ink", pal.ink), colour("Accent", "acc", pal.accent),
        h("button", { class: "chip glass", disabled: !s.ink && !s.acc, onclick: () => { set({ ink: undefined, acc: undefined }); renderPanel(); } }, "Use the design's colours"))),
    classic ? null : h("div", { class: "field" }, h("span", { class: "label" }, "Typeface"), chips(TYPEFACES, s.face || "auto", (id) => set({ face: id }))),
    h("div", { class: "field" }, h("span", { class: "label" }, "Hours"), chips([{ id: "24", name: "24-hour" }, { id: "12", name: "12-hour" }], s.h12 ? "12" : "24", (id) => set({ h12: id === "12" }))),
    classic ? null : h("div", { class: "field" }, h("span", { class: "label" }, "Date"), chips(DATE_FORMATS, s.df || "auto", (id) => set({ df: id }))),
    h("div", { class: "field" }, h("span", { class: "label" }, "Your words"), caption),
  );
}

// Dragging the time on the preview (Edit tab)
let drag = null;
phone.addEventListener("pointerdown", (e) => {
  if (state.tab !== "edit" || state.tapMode || e.target.closest("button")) return;
  const rect = preview.getBoundingClientRect();
  drag = { x: e.clientX, y: e.clientY, w: rect.width, h: rect.height, dx: state.spec.dx ?? 0, dy: state.spec.dy ?? 0 };
  state.history.push(state.spec);
  phone.setPointerCapture(e.pointerId);
  phone.classList.add("dragging");
});
phone.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const clamp = (v) => Math.max(-0.45, Math.min(0.45, v));
  setSpec({ ...state.spec, dx: clamp(drag.dx + (e.clientX - drag.x) / drag.w), dy: clamp(drag.dy + (e.clientY - drag.y) / drag.h) }, { animate: false, panel: false, record: false });
});
const endDrag = () => { if (drag) { drag = null; phone.classList.remove("dragging"); } };
phone.addEventListener("pointerup", endDrag);
phone.addEventListener("pointercancel", endDrag);

/* ───────────── AI scenes ───────────── */
const AI_STYLES = [
  { id: "photo", name: "Photo" }, { id: "render", name: "3D character" }, { id: "anime", name: "Anime" },
  { id: "illustration", name: "Illustration" }, { id: "fantasy", name: "Fantasy" }, { id: "noir", name: "Noir" },
];
state.aiStyle = "photo";
function aiBlock() {
  const input = h("textarea", { class: "describe-input ai-input", rows: "2", maxlength: "300", placeholder: "Describe a picture: a red vintage car on a desert road at sunset", "aria-label": "Describe the AI picture" });
  input.value = state.aiPrompt || "";
  input.addEventListener("input", () => (state.aiPrompt = input.value));
  return h("div", { class: "ai-block" },
    h("p", { class: "section-label" }, "AI scene"),
    input,
    h("div", { class: "chips" }, AI_STYLES.map((st) => h("button", {
      class: "chip glass", "aria-pressed": String(state.aiStyle === st.id),
      onclick: () => { state.aiStyle = st.id; renderPanel(); },
    }, st.name))),
    h("div", { class: "row" },
      h("button", { class: "chip solid", id: "aiGo", onclick: () => generateAI(input.value, state.aiStyle) }, "✦ Generate"),
      h("span", { class: "fine-inline" }, "Made with Cloudflare Workers AI. Your words are sent to make the picture; nothing else is.")));
}

async function generateAI(prompt, style) {
  prompt = (prompt || "").trim();
  if (prompt.length < 3) return toast("Describe the picture in a few words");
  if (state.busy) return;
  state.busy = true;
  phone.classList.add("working", "painting");
  toast("Painting your scene… about 10 seconds", 12000);
  try {
    const res = await fetch("/api/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt, style }) });
    const type = res.headers.get("content-type") || "";
    if (!res.ok || !type.startsWith("image/")) {
      let msg = "AI scenes work on apps.paruto.com, online.";
      if (type.includes("json")) msg = (await res.json()).error || msg;
      throw Object.assign(new Error(msg), { shown: true });
    }
    const blob = await res.blob();
    const ph = await Photo.importPhoto(new File([blob], "ai-scene.jpg", { type }), { ai: true, prompt });
    state.photo = ph;
    photoCache.set(ph.id, ph);
    cleanupPhotos(ph.id);
    state.tab = "bg";
    state.busy = false;
    setSpec({ ...state.spec, bg: "photo", photo: ph.id });
    // the prompt asked for the subject low in the frame, so look for it there
    await runCutOut({ x: 0.5, y: 0.72 }, true);
  } catch (e) {
    if (!e.shown) console.error(e);
    toast(e.shown ? e.message : "Couldn't reach the AI just now. Check your connection and try again.", 4200);
  } finally {
    state.busy = false;
    phone.classList.remove("working", "painting");
    updateMeta();
  }
}

/* ───────────── photo tools ───────────── */
function photoTools() {
  const ph = state.photo;
  const depth = h("input", { type: "checkbox", role: "switch" });
  depth.checked = ph.depth && !!ph.mask;
  depth.disabled = !ph.mask;
  depth.addEventListener("change", () => { ph.depth = depth.checked; photoChanged(); });
  const size = h("input", { type: "range", min: "50", max: "100", step: "1", value: String(Math.round((ph.zoom ?? 1) * 100)), "aria-label": "Photo size" });
  size.addEventListener("input", () => { ph.zoom = Number(size.value) / 100; photoChanged(false); });
  size.addEventListener("change", () => Photo.savePhotoState(ph));
  return h("div", { class: "photo-tools" },
    h("div", { class: "row" },
      h("button", {
        class: "chip glass", "aria-pressed": String(state.tapMode),
        onclick: () => { state.tapMode = !state.tapMode; updateMeta(); renderPanel(); if (state.tapMode) toast("Tap your subject in the preview"); },
      }, state.tapMode ? "Tap the preview…" : ph.mask ? "Re-pick the subject" : "Tap your subject"),
      h("button", { class: "chip glass", disabled: !ph.mask, onclick: () => smartLayout(true) }, "✦ Auto layout")),
    h("label", { class: "slider" }, h("span", {}, "Photo size"), size),
    h("label", { class: "switch" }, depth, ph.mask ? "Depth: subject in front of the time" : "Depth needs a cut-out first"),
  );
}

function photoChanged(save = true) {
  state.photoRev++;
  photoCache.set(state.photo.id, state.photo);
  loop();
  if (save) Photo.savePhotoState(state.photo);
}

function pickPhoto() {
  const input = h("input", { type: "file", accept: "image/*" });
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      toast("Opening your photo…");
      const ph = await Photo.importPhoto(file);
      ph.zoom = 1;
      state.photo = ph;
      photoCache.set(ph.id, ph);
      cleanupPhotos(ph.id);
      state.tab = "bg";
      setSpec({ ...state.spec, bg: "photo", photo: ph.id });
      await runCutOut({ x: 0.5, y: 0.6 }, true);
    } catch (e) {
      console.error(e);
      toast("Couldn't open that picture");
    }
  });
  input.click();
}

async function runCutOut(point, layout) {
  const ph = state.photo;
  if (!ph || state.busy) return;
  state.busy = true;
  phone.classList.add("working");
  toast("Cutting out your subject… (the first time downloads a 16 MB tool)", 8000);
  try {
    const { mask, coverage } = await Photo.cutOut(ph, point);
    if (coverage < 0.01) { toast("Nothing found there. Tap right on your subject."); state.tapMode = true; return; }
    ph.mask = mask;
    ph.point = point;
    ph.depth = true;
    if (layout) smartLayout(false);
    photoChanged();
    toast("Done. Not quite right? Tap “Re-pick the subject”.");
  } catch (e) {
    console.error(e);
    toast("Couldn't cut out the subject on this device. Your photo still works without depth.", 4000);
  } finally {
    state.busy = false;
    phone.classList.remove("working");
    updateMeta();
    renderPanel();
  }
}

function smartLayout(announce) {
  const ph = state.photo;
  if (!ph?.mask) return;
  const best = autoPlace(ph, state.spec);
  ph.zoom = best.zoom;
  photoChanged();
  setSpec({ ...state.spec, pos: best.pos });
  if (announce) toast("Placed so your subject overlaps the time");
}

// Photos are kept only while the current design or a saved one uses them
async function cleanupPhotos(keep) {
  const used = new Set([keep, ...state.saved.filter((s) => s.bg === "photo").map((s) => s.photo)]);
  for (const k of await Photo.photoIds()) if (!used.has(k)) Photo.deletePhoto(k);
}

// Tap on the preview (in tap mode) → which point of the photo was tapped
phone.addEventListener("click", (e) => {
  if (!state.tapMode || state.spec.bg !== "photo" || !state.photo || e.target.closest("button")) return;
  const rect = preview.getBoundingClientRect();
  const px = ((e.clientX - rect.left) / rect.width) * preview.width;
  const py = ((e.clientY - rect.top) / rect.height) * preview.height;
  const [x, y, dw, dh] = photoRect(state.photo, preview.width, preview.height);
  const point = { x: (px - x) / dw, y: (py - y) / dh };
  if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) return toast("Tap on the photo itself");
  state.tapMode = false;
  runCutOut(point, !state.photo.mask);
});

// Settings that follow you from design to design: your preferences always; size, place and typeface while the
// clock is locked; your colours while the colours are locked.
function keptEdits(s, lock = state.lock) {
  const keep = { h12: s.h12, df: s.df, cap: s.cap };
  if (lock.clock) Object.assign(keep, { sz: s.sz, dx: s.dx, dy: s.dy, face: s.face });
  if (lock.pal) Object.assign(keep, { ink: s.ink, acc: s.acc });
  return keep;
}

/* ───────────── undo ───────────── */
async function undo() {
  const prev = state.history.pop();
  if (!prev) return;
  if (prev.bg === "photo") { const ph = await ensurePhoto(prev.photo); if (ph) { state.photo = ph; state.photoRev++; } }
  setSpec(prev, { record: false });
}

/* ───────────── lock-screen mockup ───────────── */
function applyMock() {
  phone.classList.toggle("show-guides", state.mock === "guides");
  phone.dataset.mock = state.mock;
  updateMock();
}
function updateMock() {
  if (state.mock !== "ios" && state.mock !== "android") return;
  const d = new Date();
  const hh = d.getHours(), mm = String(d.getMinutes()).padStart(2, "0");
  $("#mockTime").textContent = state.mock === "ios" ? `${hh % 12 || 12}:${mm}` : `${String(hh).padStart(2, "0")}:${mm}`;
  $("#mockDate").textContent = d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  $("#mockBar").textContent = `${hh % 12 || 12}:${mm}`;
}
setInterval(updateMock, 15000);

/* ───────────── shuffle ───────────── */
function shuffle() {
  const next = { ...randomSpec(state.lock, state.spec), ...keptEdits(state.spec) };
  if (state.lock.bg && state.spec.bg === "photo") next.photo = state.spec.photo;
  else delete next.photo;
  setSpec(next);
  const b = $("#shuffleBtn");
  b.classList.remove("spin"); void b.offsetWidth; b.classList.add("spin");
  if (navigator.vibrate) navigator.vibrate(8);
}

/* ───────────── save / export ───────────── */
function canvasFor(device = state.device, cap = Infinity) {
  let [w, hgt] = deviceSize(device);
  const k = Math.min(1, cap / w);
  w = Math.round((w * k) / 2) * 2; hgt = Math.round((hgt * k) / 2) * 2;
  const c = document.createElement("canvas");
  c.width = w; c.height = hgt;
  return c;
}
const jpeg = (c) => new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("canvas too large to encode"))), "image/jpeg", 0.94));
const fileName = (spec, c, extra = "") => `dialscape-${spec.clock}-${spec.bg}${extra}-${c.width}x${c.height}.jpg`;

async function makeWallpaper(spec = state.spec, opts = {}) {
  const c = canvasFor();
  compose(c.getContext("2d"), layers(c.width, c.height, spec), displayDate(), spec, opts);
  // JPEG: the film grain makes PNGs several times larger and slow to encode, with no visible gain
  return { blob: await jpeg(c), name: fileName(spec, c, opts.home ? "-home" : "") };
}

// Hands files to the share sheet on phones (→ Photos), or downloads them (several as one ZIP) on computers
async function deliver(files, title) {
  const list = files.map((f) => new File([f.blob], f.name, { type: f.blob.type }));
  if (isTouch && navigator.canShare?.({ files: list })) {
    try { await navigator.share({ files: list, title }); return true; }
    catch (e) { if (e.name === "AbortError") return false; }
  }
  const one = files.length === 1 ? files[0] : { blob: await zip(files), name: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.zip` };
  const url = URL.createObjectURL(one.blob);
  const a = h("a", { href: url, download: one.name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 8000);
  toast(files.length === 1 ? "Saved" : `Saved ${files.length} files as a ZIP`);
  return true;
}

async function busyButton(btn, text, fn) {
  const label = btn?.querySelector("span, b") || btn;
  const before = label?.textContent;
  if (btn) btn.disabled = true;
  if (label) label.textContent = text;
  try { await new Promise((r) => setTimeout(r, 30)); return await fn(); }
  catch (e) { console.error(e); toast("Couldn't make that. Try a smaller screen size under Fit."); }
  finally { if (btn) btn.disabled = false; if (label) label.textContent = before; }
}

async function saveWallpaper() {
  await busyButton($("#saveBtn"), "Painting…", async () => {
    if (await deliver([await makeWallpaper()], "Dialscape wallpaper")) openHowto("single");
  });
}

async function savePair(btn) {
  await busyButton(btn, "Painting both…", async () => {
    const lock = await makeWallpaper();
    const home = await makeWallpaper(state.spec, { home: true });
    if (await deliver([lock, home], "Dialscape pair")) openHowto("pair");
  });
}

// Eight takes on this design: every scene with your clock and colours (or, on your photo, eight clock styles)
async function savePack(btn) {
  await busyButton(btn, "Painting 8…", async () => {
    const s = state.spec;
    const specs = s.bg === "photo"
      ? TYPE_STYLES.filter((t) => !t.seconds).slice(0, 8).map((t) => ({ ...s, clock: t.id }))
      : SCENE_STYLES.slice(0, 8).map((b) => ({ ...s, bg: b.id, photo: undefined }));
    const files = [];
    for (const [i, spec] of specs.entries()) {
      const c = canvasFor();
      compose(c.getContext("2d"), layers(c.width, c.height, spec), displayDate(), spec);
      files.push({ blob: await jpeg(c), name: `dialscape-pack-${i + 1}-${spec.bg}-${spec.clock}.jpg` });
      await new Promise((r) => setTimeout(r, 0));
    }
    if (await deliver(files, "Dialscape pack")) openHowto("pack");
  });
}

// An 8-second looping video: the layers drift apart for depth while the clock ticks
async function saveMotion(btn) {
  if (typeof MediaRecorder === "undefined" || !HTMLCanvasElement.prototype.captureStream) return toast("This browser can't record video. Try Chrome or Safari.");
  const types = ["video/mp4;codecs=avc1.640028", "video/mp4", "video/webm;codecs=vp9", "video/webm"];
  const mime = types.find((t) => MediaRecorder.isTypeSupported(t));
  if (!mime) return toast("This browser can't record video. Try Chrome or Safari.");
  await busyButton(btn, "Recording 8 s…", async () => {
    const spec = state.spec;
    const c = canvasFor(state.device, 1080);
    const ctx = c.getContext("2d");
    const Lx = layers(c.width, c.height, spec);
    compose(ctx, Lx, new Date(), spec, { motion: 0 });
    const rec = new MediaRecorder(c.captureStream(30), { mimeType: mime, videoBitsPerSecond: 10_000_000 });
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const stopped = new Promise((r) => (rec.onstop = r));
    rec.start(250);
    const dur = 8000, t0 = performance.now();
    await new Promise((done) => {
      const frame = () => {
        const t = (performance.now() - t0) / dur;
        if (t >= 1) return done();
        compose(ctx, Lx, new Date(), spec, { motion: t });
        requestAnimationFrame(frame);
      };
      frame();
    });
    rec.stop();
    await stopped;
    const ext = mime.startsWith("video/mp4") ? "mp4" : "webm";
    const blob = new Blob(chunks, { type: mime.split(";")[0] });
    if (await deliver([{ blob, name: `dialscape-motion-${spec.clock}-${spec.bg}.${ext}` }], "Dialscape motion wallpaper")) openHowto("motion");
  });
}

function openExport() {
  const d = $("#export");
  if (!d.open) d.showModal();
}

const STEPS = {
  single: {
    ios: ["Tap <b>Save Image</b> in the share sheet, so it goes to Photos.", "Open <b>Photos</b>, choose the picture, tap <b>Share</b> and then <b>Use as Wallpaper</b>.", "Turn off <b>Depth Effect</b> if it hides the clock, then tap <b>Add</b>.", "Choose <b>Set as Wallpaper Pair</b>, or <b>Customise Home Screen</b> to use it there only."],
    android: ["Open <b>Photos</b> or <b>Gallery</b> and find the picture (it's in Downloads if you saved the file).", "Tap <b>⋮</b> and then <b>Use as</b> or <b>Set as wallpaper</b>.", "Pick <b>Lock screen</b>, <b>Home screen</b> or <b>both</b>, and tap <b>Set</b>."],
  },
  pair: {
    ios: ["Tap <b>Save 2 Images</b>: one with the time for the Lock Screen, one without it (named <b>-home</b>) for the Home Screen.", "In <b>Settings → Wallpaper</b>, tap <b>Add New Wallpaper → Photos</b> and choose the picture with the time. Tap <b>Add</b>.", "Choose <b>Customise Home Screen</b>, tap <b>Photo</b> and choose the picture without the time."],
    android: ["Save both pictures to your gallery.", "Set the picture with the time as the <b>Lock screen</b> wallpaper.", "Set the one without the time as the <b>Home screen</b> wallpaper."],
  },
  pack: {
    ios: ["Tap <b>Save 8 Images</b>.", "In <b>Photos</b>, select the eight and <b>Add to Album</b> (a new album called Dialscape is handy).", "Touch and hold the Lock Screen, tap <b>+</b> and choose <b>Photo Shuffle</b>.", "Pick the eight pictures (or the album), then choose how often it changes: <b>On Tap</b>, <b>On Lock</b>, <b>Hourly</b> or <b>Daily</b>."],
    android: ["Save the eight pictures to your gallery.", "On <b>Samsung Galaxy</b> phones, choose several pictures from <b>Gallery</b> as the lock-screen wallpaper and a new one shows each time you wake the phone.", "On other phones, set them one at a time, or use a wallpaper-changer app with the eight pictures."],
  },
  motion: {
    ios: ["iPhone doesn't use videos as wallpapers, so the video won't work there. Save a picture or a Shuffle pack instead."],
    android: ["Save the video to your gallery.", "On <b>Samsung Galaxy</b> phones, choose the video from <b>Gallery</b> as your lock-screen wallpaper (videos up to 15 seconds work).", "On other phones, use a video-wallpaper app, or save a picture instead."],
  },
};
let howtoKind = "single";
function openHowto(kind = "single") {
  howtoKind = kind;
  const d = $("#howto");
  setOS(isAndroid ? "android" : isIOS ? "ios" : kind === "motion" ? "android" : "ios");
  if (!d.open) d.showModal();
}
function setOS(os) {
  $$("#howto [data-os]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.os === os)));
  const ol = $("#howtoSteps");
  ol.replaceChildren(...STEPS[howtoKind][os].map((html) => { const li = document.createElement("li"); li.innerHTML = html; return li; }));
}

/* ───────────── saved designs ───────────── */
function toggleFav() {
  const k = designKey(state.spec);
  const i = state.saved.findIndex((x) => designKey(x) === k);
  if (i >= 0) { state.saved.splice(i, 1); toast("Removed from saved"); }
  else { state.saved.unshift({ ...state.spec }); state.saved = state.saved.slice(0, 80); toast("Saved to your collection"); }
  store.set("saved", state.saved);
  updateMeta();
}

async function ensurePhoto(id) {
  if (!id) return null;
  if (state.photo?.id === id) return state.photo;
  if (!photoCache.has(id)) photoCache.set(id, await Photo.loadPhoto(id));
  return photoCache.get(id);
}

function openCollection() {
  const d = $("#collection");
  const grid = $("#collectionGrid");
  grid.replaceChildren();
  $("#collectionEmpty").hidden = state.saved.length > 0;
  const jobs = [];
  for (const spec of state.saved) {
    const cv = document.createElement("canvas");
    cv.width = 180; cv.height = 390;
    grid.append(h("div", { class: "item" },
      h("button", { class: "open", "aria-label": "Open this design", onclick: () => openSaved(spec) }, cv),
      h("button", {
        class: "remove glass", "aria-label": "Remove",
        onclick: () => { state.saved = state.saved.filter((x) => designKey(x) !== designKey(spec)); store.set("saved", state.saved); updateMeta(); openCollection(); },
      }, svgX())));
    if (spec.bg === "photo") ensurePhoto(spec.photo).then((ph) => { if (ph) paintSpec(cv, spec, new Date()); });
    else jobs.push(() => paintSpec(cv, spec, new Date()));
  }
  if (!d.open) d.showModal();
  paintThumbs(jobs);
}
async function openSaved(spec) {
  $("#collection").close();
  if (spec.bg === "photo") {
    const ph = await ensurePhoto(spec.photo);
    if (!ph) return toast("That photo is no longer on this device");
    state.photo = ph;
    state.photoRev++;
  }
  setSpec({ ...spec }, { push: true });
}
function svgX() {
  const ns = "http://www.w3.org/2000/svg";
  const s = document.createElementNS(ns, "svg");
  s.setAttribute("viewBox", "0 0 24 24");
  const p = document.createElementNS(ns, "path");
  p.setAttribute("d", "M6 6l12 12M18 6 6 18");
  s.append(p);
  return s;
}

/* ───────────── share link ───────────── */
async function shareLink() {
  let spec = state.spec;
  if (spec.bg === "photo") {
    spec = { ...spec, bg: dailySpec().bg };
    delete spec.photo;
    toast("Your photo stays on this device, so the link shares the clock with a scene", 3200);
  }
  const url = location.origin + location.pathname + hashOf(spec);
  try {
    if (navigator.share && isTouch) { await navigator.share({ title: "A Dialscape wallpaper", url }); return; }
    await navigator.clipboard.writeText(url);
    if (state.spec.bg !== "photo") toast("Link copied");
  } catch (e) {
    if (e.name !== "AbortError") toast("Couldn't share the link");
  }
}

/* ───────────── live clock ───────────── */
const live = $("#live"), liveCanvas = $("#liveCanvas");
let liveRaf = 0, liveL = null, liveKey = "", wakeLock = null, chromeTimer = 0;
// 3D tilt: the layers shift apart as the phone tilts (or the mouse moves)
const tilt = { on: false, x: 0, y: 0, tx: 0, ty: 0 };
function onOrient(e) {
  if (e.gamma == null) return;
  tilt.on = true;
  tilt.tx = Math.max(-1, Math.min(1, e.gamma / 25));
  tilt.ty = Math.max(-1, Math.min(1, ((e.beta ?? 45) - 45) / 25));
}
function onMouseTilt(e) {
  tilt.on = true;
  tilt.tx = (e.clientX / innerWidth) * 2 - 1;
  tilt.ty = (e.clientY / innerHeight) * 2 - 1;
}
async function startTilt() {
  try {
    if (typeof DeviceOrientationEvent !== "undefined" && DeviceOrientationEvent.requestPermission) {
      if ((await DeviceOrientationEvent.requestPermission()) !== "granted") return;
    }
  } catch { return; }
  addEventListener("deviceorientation", onOrient);
}
function stopTilt() {
  removeEventListener("deviceorientation", onOrient);
  tilt.on = false; tilt.x = tilt.y = tilt.tx = tilt.ty = 0;
}

async function keepAwake() {
  try { if ("wakeLock" in navigator && !live.hidden) wakeLock = await navigator.wakeLock.request("screen"); } catch {}
}
function liveSize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  return [Math.round(innerWidth * dpr), Math.round(innerHeight * dpr)];
}
function liveFrame() {
  if (live.hidden) return;
  const [w, hgt] = liveSize();
  const spec = state.spec.clock === "none" ? { ...state.spec, clock: "tower" } : state.spec;
  const key = `${layerKeyOf(spec)}|${w}x${hgt}|${state.photoRev}`;
  if (liveCanvas.width !== w || liveCanvas.height !== hgt) { liveCanvas.width = w; liveCanvas.height = hgt; }
  if (key !== liveKey) { liveL = layers(w, hgt, spec); liveKey = key; }
  // ease the tilt towards the sensor reading
  tilt.x += (tilt.tx - tilt.x) * 0.08;
  tilt.y += (tilt.ty - tilt.y) * 0.08;
  compose(liveCanvas.getContext("2d"), liveL, new Date(), spec, { parallax: tilt.on ? tilt : null });
  if (tilt.on || clockHasSeconds(spec.clock)) liveRaf = requestAnimationFrame(liveFrame);
  else liveRaf = setTimeout(liveFrame, 1000 - (Date.now() % 1000) + 5);
}
function showChrome() {
  live.classList.add("chrome");
  clearTimeout(chromeTimer);
  chromeTimer = setTimeout(() => live.classList.remove("chrome"), 2800);
}
function openLive() {
  live.hidden = false;
  if (isTouch) startTilt();
  cancelAnimationFrame(raf); clearTimeout(tickTimer);
  live.requestFullscreen?.().catch(() => {});
  keepAwake();
  showChrome();
  liveFrame();
}
function closeLive() {
  cancelAnimationFrame(liveRaf); clearTimeout(liveRaf);
  stopTilt();
  live.hidden = true;
  wakeLock?.release?.().catch(() => {});
  wakeLock = null;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  loop();
}

/* ───────────── install ───────────── */
let installEvent = null;
const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvent = e; $("#installBtn").hidden = false; });
if (isIOS && !standalone) $("#installBtn").hidden = false;
$("#installBtn").addEventListener("click", async () => {
  if (installEvent) { installEvent.prompt(); await installEvent.userChoice; installEvent = null; $("#installBtn").hidden = true; }
  else toast("Tap Share, then “Add to Home Screen”");
});

/* ───────────── wiring ───────────── */
$("#shuffleBtn").addEventListener("click", shuffle);
$$(".lock").forEach((b) => {
  b.setAttribute("aria-pressed", String(state.lock[b.dataset.lock]));
  b.addEventListener("click", () => {
    state.lock[b.dataset.lock] = !state.lock[b.dataset.lock];
    b.setAttribute("aria-pressed", String(state.lock[b.dataset.lock]));
    savePrefs();
  });
});
$$(".tabs [role=tab]").forEach((b) => b.addEventListener("click", () => { state.tab = b.dataset.tab; renderPanel(); }));
$("#saveBtn").addEventListener("click", saveWallpaper);
$("#favBtn").addEventListener("click", toggleFav);
$("#moreBtn").addEventListener("click", openExport);
$("#undoBtn").addEventListener("click", undo);
$$("#export [data-export]").forEach((b) => b.addEventListener("click", async () => {
  const kind = b.dataset.export;
  if (kind === "link") { $("#export").close(); return shareLink(); }
  if (kind === "single") { $("#export").close(); return saveWallpaper(); }
  if (kind === "pair") await savePair(b);
  if (kind === "pack") await savePack(b);
  if (kind === "motion") await saveMotion(b);
  if ($("#howto").open) $("#export").close();
}));
$("#collectionBtn").addEventListener("click", openCollection);
$("#liveBtn").addEventListener("click", openLive);
$("#liveHint").addEventListener("click", (e) => { e.stopPropagation(); openLive(); });
$("#liveClose").addEventListener("click", (e) => { e.stopPropagation(); closeLive(); });
live.addEventListener("click", showChrome);
live.addEventListener("pointermove", (e) => {
  if (e.pointerType !== "mouse") return;
  showChrome();
  const was = tilt.on;
  onMouseTilt(e);
  if (!was) { cancelAnimationFrame(liveRaf); clearTimeout(liveRaf); liveFrame(); }
});
$$("dialog [data-close]").forEach((b) => b.addEventListener("click", () => b.closest("dialog").close()));
$$("dialog").forEach((d) => d.addEventListener("click", (e) => { if (e.target === d) d.close(); }));
$$("#howto [data-os]").forEach((b) => b.addEventListener("click", () => setOS(b.dataset.os)));
document.addEventListener("keydown", (e) => {
  if (!live.hidden && e.key === "Escape") return closeLive();
  if (e.target.closest("input, dialog")) return;
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") { e.preventDefault(); return undo(); }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === " " && e.target === document.body) { e.preventDefault(); shuffle(); }
  if (e.key.toLowerCase() === "z" && !e.shiftKey) undo();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) return;
  if (!live.hidden) { keepAwake(); return; }
  loop();
});
document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && !live.hidden && !isTouch) closeLive(); });
window.addEventListener("hashchange", async () => {
  const s = specFromHash();
  if (!s || specKey(s) === specKey(state.spec)) return;
  if (s.bg === "photo") { const ph = await ensurePhoto(s.photo); if (!ph) return; state.photo = ph; state.photoRev++; }
  setSpec(s);
});
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (!live.hidden) { cancelAnimationFrame(liveRaf); clearTimeout(liveRaf); liveFrame(); } else loop(); }, 120);
});
// swipe across the preview to shuffle
let touchX = null;
phone.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
phone.addEventListener("touchend", (e) => {
  if (touchX == null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  touchX = null;
  if (Math.abs(dx) > 60 && state.tab !== "edit" && !state.tapMode) shuffle();
});

/* ───────────── version ───────────── */
// The site's deploy stamp (version.json, written by ./deploy.sh): the commit that's live and when it was deployed
async function showVersion() {
  const el = $("#version");
  try {
    const res = await fetch("/version.json", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const v = await res.json();
    const when = new Date(v.deployed || v.committed);
    el.textContent = `Version ${v.short} · ${when.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;
    el.title = `${v.subject}\nCommit ${v.commit}\nDeployed ${when.toLocaleString()}`;
    return v;
  } catch {
    el.textContent = navigator.onLine === false ? "Offline copy" : location.hostname === "localhost" || location.hostname === "127.0.0.1" ? "Development version" : "";
    el.title = "";
    return null;
  }
}

/* ───────────── start ───────────── */
async function fontsReady() {
  const faces = [
    'italic 40px "Instrument Serif"', '40px "Instrument Serif"', '500 40px "Space Grotesk"', '600 40px "Space Grotesk"', '300 40px "DM Mono"', '400 40px "DM Mono"',
    '800 40px "Unbounded"', '40px "Anton"', '200 40px "Antonio"', '700 40px "Antonio"', '40px "Bebas Neue"', '150 40px "Big Shoulders Display"',
    '300 40px "Big Shoulders Display"', '40px "Six Caps"', '40px "Yellowtail"', '500 40px "Caveat"',
  ];
  await Promise.race([Promise.all(faces.map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 3000))]);
}

(async function start() {
  applyMock();
  sizePhone();
  await fontsReady();
  let spec = specFromHash();
  if (spec?.bg === "photo") {
    const ph = await ensurePhoto(spec.photo).catch(() => null);
    if (ph) state.photo = ph;
    else { spec = { ...spec, bg: dailySpec().bg }; delete spec.photo; }
  }
  setSpec(spec || dailySpec());
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    // an installed copy that swaps to a newer deploy says so
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", async () => {
      if (!hadController) return;
      const v = await showVersion();
      toast(v ? `Dialscape updated to version ${v.short}` : "Dialscape updated", 3600);
    });
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
  showVersion();
  document.documentElement.dataset.ready = "1";
})();

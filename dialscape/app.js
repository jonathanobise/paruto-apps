import {
  TYPE_STYLES, CLASSIC_CLOCKS, SCENE_STYLES, PATTERN_STYLES, ALL_CLOCKS, ALL_BACKS, isClock, isBack, clockHasSeconds,
  randomSpec, dailySpec, buildLayers, compose, paletteOf, autoPlace, photoRect, randomSeed,
} from "./render.js";
import * as Photo from "./photo.js";

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
  guides: !!prefs.guides,
  tab: "explore",
  palOptions: [],
  explore: [],
  saved: store.get("saved", []),
  photo: null,      // the live photo in use, if any
  photoRev: 0,      // bumped when its cut-out, size or depth change
  tapMode: false,
  busy: false,
};
const savePrefs = () => store.set("prefs", { lock: state.lock, device: state.device, guides: state.guides });

const specKey = (s) => [s.clock, s.bg, s.pal, s.seed, s.pos, s.bg === "photo" ? s.photo : ""].join("|");
const designKey = (s) => [s.clock, s.bg, s.pal, s.seed, s.bg === "photo" ? s.photo : ""].join("|");
function specFromHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  const clock = q.get("c"), bg = q.get("b");
  if (!clock || !bg || !isClock(clock) || !isBack(bg)) return null;
  const clean = (v) => (v || "").replace(/[^a-z0-9~]/gi, "").slice(0, 16) || randomSeed();
  const spec = { clock, bg, pal: clean(q.get("p")), seed: clean(q.get("s")), pos: ["high", "middle", "low"].includes(q.get("y")) ? q.get("y") : "middle" };
  if (bg === "photo") spec.photo = clean(q.get("ph"));
  return spec;
}
const hashOf = (s) => `#c=${s.clock}&b=${s.bg}&p=${s.pal}&s=${s.seed}&y=${s.pos}${s.bg === "photo" ? `&ph=${s.photo}` : ""}`;

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
  const key = `${specKey(state.spec)}|${w}x${h}|${state.photoRev}`;
  if (preview.width !== w || preview.height !== h) { preview.width = w; preview.height = h; }
  if (key !== layerKey) { L = layers(w, h, state.spec); layerKey = key; }
  compose(preview.getContext("2d"), L, displayDate());
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
  const p = paletteOf(state.spec, photoFor(state.spec));
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
  const bgName = s.bg === "photo" ? "Your photo" : nameOf(ALL_BACKS, s.bg);
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

function setSpec(spec, { push = false, animate = true, panel: repaint = true } = {}) {
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
  compose(cv.getContext("2d"), layers(cv.width, cv.height, spec), date);
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
    if (!state.explore.length) state.explore = Array.from({ length: 12 }, () => randomSpec({}, { pos: "middle" }));
    const grid = h("div", { class: "explore" });
    for (const spec of state.explore) {
      const cv = thumbCanvas(104, 225);
      const mine = { ...spec, pos: s.pos };
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

  if (state.tab === "clock") {
    let base = null;
    const strip = (items) => {
      const el = h("div", { class: "strip" });
      for (const c of items) {
        const cv = thumbCanvas();
        const spec = { ...s, clock: c.id };
        el.append(optButton(c.name, s.clock === c.id, () => setSpec(spec), cv));
        jobs.push(() => {
          if (!base) base = layers(cv.width, cv.height, s);
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
    panel.append(label("Your photo, with depth"), photoStrip, label("Scenes"), strip(SCENE_STYLES), label("Patterns"), strip(PATTERN_STYLES));
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
    const guides = h("input", { type: "checkbox", role: "switch" });
    guides.checked = state.guides;
    guides.addEventListener("change", () => { state.guides = guides.checked; phone.classList.toggle("show-guides", state.guides); savePrefs(); });
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
      h("label", { class: "switch" }, guides, "Show where the phone's own clock and dock sit"),
    ));
  }
  paintThumbs(jobs);
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

/* ───────────── shuffle ───────────── */
function shuffle() {
  const next = randomSpec(state.lock, state.spec);
  if (state.lock.bg && state.spec.bg === "photo") next.photo = state.spec.photo;
  else delete next.photo;
  setSpec(next);
  const b = $("#shuffleBtn");
  b.classList.remove("spin"); void b.offsetWidth; b.classList.add("spin");
  if (navigator.vibrate) navigator.vibrate(8);
}

/* ───────────── save / export ───────────── */
async function makeWallpaper(spec = state.spec, device = state.device) {
  const [w, hgt] = deviceSize(device);
  const c = document.createElement("canvas");
  c.width = w; c.height = hgt;
  compose(c.getContext("2d"), layers(w, hgt, spec), displayDate());
  // JPEG: the film grain makes PNGs several times larger and slow to encode, with no visible gain
  const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.94));
  if (!blob) throw new Error("canvas too large to encode");
  const name = `dialscape-${spec.clock}-${spec.bg}-${spec.pal}${spec.seed}-${w}x${hgt}.jpg`;
  return { blob, name };
}

async function saveWallpaper() {
  const btn = $("#saveBtn");
  btn.disabled = true;
  btn.querySelector("span").textContent = "Painting…";
  try {
    await new Promise((r) => setTimeout(r, 30));
    const { blob, name } = await makeWallpaper();
    const file = new File([blob], name, { type: "image/jpeg" });
    let shared = false;
    if (isTouch && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "Dialscape wallpaper" }); shared = true; }
      catch (e) { if (e.name === "AbortError") return; }
    }
    if (!shared) {
      const url = URL.createObjectURL(blob);
      const a = h("a", { href: url, download: name });
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast("Wallpaper saved");
    }
    openHowto();
  } catch (e) {
    console.error(e);
    toast("Couldn't make the picture. Try a smaller screen size.");
  } finally {
    btn.disabled = false;
    btn.querySelector("span").textContent = "Save wallpaper";
  }
}

function openHowto() {
  const d = $("#howto");
  setOS(isAndroid ? "android" : "ios");
  if (!d.open) d.showModal();
}
function setOS(os) {
  $$("#howto [data-os]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.os === os)));
  $$("#howto [data-os-steps]").forEach((ol) => (ol.hidden = ol.dataset.osSteps !== os));
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
  const key = `${specKey(spec)}|${w}x${hgt}|${state.photoRev}`;
  if (liveCanvas.width !== w || liveCanvas.height !== hgt) { liveCanvas.width = w; liveCanvas.height = hgt; }
  if (key !== liveKey) { liveL = layers(w, hgt, spec); liveKey = key; }
  compose(liveCanvas.getContext("2d"), liveL, new Date());
  if (clockHasSeconds(spec.clock)) liveRaf = requestAnimationFrame(liveFrame);
  else liveRaf = setTimeout(liveFrame, 1000 - (Date.now() % 1000) + 5);
}
function showChrome() {
  live.classList.add("chrome");
  clearTimeout(chromeTimer);
  chromeTimer = setTimeout(() => live.classList.remove("chrome"), 2800);
}
function openLive() {
  live.hidden = false;
  cancelAnimationFrame(raf); clearTimeout(tickTimer);
  live.requestFullscreen?.().catch(() => {});
  keepAwake();
  showChrome();
  liveFrame();
}
function closeLive() {
  cancelAnimationFrame(liveRaf); clearTimeout(liveRaf);
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
$("#shareBtn").addEventListener("click", shareLink);
$("#collectionBtn").addEventListener("click", openCollection);
$("#liveBtn").addEventListener("click", openLive);
$("#liveHint").addEventListener("click", (e) => { e.stopPropagation(); openLive(); });
$("#liveClose").addEventListener("click", (e) => { e.stopPropagation(); closeLive(); });
live.addEventListener("click", showChrome);
live.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") showChrome(); });
$$("dialog [data-close]").forEach((b) => b.addEventListener("click", () => b.closest("dialog").close()));
$$("dialog").forEach((d) => d.addEventListener("click", (e) => { if (e.target === d) d.close(); }));
$$("#howto [data-os]").forEach((b) => b.addEventListener("click", () => setOS(b.dataset.os)));
document.addEventListener("keydown", (e) => {
  if (!live.hidden && e.key === "Escape") return closeLive();
  if (e.target.closest("input, dialog") || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === " " && e.target === document.body) { e.preventDefault(); shuffle(); }
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
  if (Math.abs(dx) > 60) shuffle();
});

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
  phone.classList.toggle("show-guides", state.guides);
  sizePhone();
  await fontsReady();
  let spec = specFromHash();
  if (spec?.bg === "photo") {
    const ph = await ensurePhoto(spec.photo).catch(() => null);
    if (ph) state.photo = ph;
    else { spec = { ...spec, bg: dailySpec().bg }; delete spec.photo; }
  }
  setSpec(spec || dailySpec());
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) navigator.serviceWorker.register("sw.js").catch(() => {});
  document.documentElement.dataset.ready = "1";
})();

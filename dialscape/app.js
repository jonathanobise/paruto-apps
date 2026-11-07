import {
  BG_STYLES, CLOCK_STYLES, randomSpec, dailySpec, renderBackground, renderClock, paletteOf, clockHasSeconds, randomSeed,
} from "./engine.js";

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
  tab: "clock",
  palOptions: [],
  saved: store.get("saved", []),
};
const savePrefs = () => store.set("prefs", { lock: state.lock, device: state.device, guides: state.guides });

const specKey = (s) => [s.clock, s.bg, s.pal, s.seed].join("|");
const specFromHash = () => {
  const q = new URLSearchParams(location.hash.slice(1));
  if (!q.get("c") || !q.get("b")) return null;
  const clock = q.get("c"), bg = q.get("b");
  if (!(clock === "none" || CLOCK_STYLES.some((c) => c.id === clock)) || !BG_STYLES.some((b) => b.id === bg)) return null;
  const clean = (v) => (v || "").replace(/[^a-z0-9]/gi, "").slice(0, 12) || randomSeed();
  return { clock, bg, pal: clean(q.get("p")), seed: clean(q.get("s")), pos: ["high", "middle", "low"].includes(q.get("y")) ? q.get("y") : "middle" };
};
const hashOf = (s) => `#c=${s.clock}&b=${s.bg}&p=${s.pal}&s=${s.seed}&y=${s.pos}`;

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
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2400);
}

/* ───────────── time ───────────── */
function displayDate() {
  if (state.time === "now") return new Date();
  const [hh, mm] = state.time.split(":").map(Number);
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d;
}

/* ───────────── preview ───────────── */
let bgCache = null, bgKey = "", pal = null, raf = 0, tickTimer = 0;

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
  const key = `${specKey(state.spec)}|${w}x${h}`;
  if (preview.width !== w || preview.height !== h) { preview.width = w; preview.height = h; }
  if (key !== bgKey) {
    bgCache = document.createElement("canvas");
    bgCache.width = w; bgCache.height = h;
    pal = renderBackground(bgCache.getContext("2d"), w, h, state.spec);
    bgKey = key;
  }
  const ctx = preview.getContext("2d");
  ctx.drawImage(bgCache, 0, 0);
  renderClock(ctx, w, h, state.spec, displayDate(), pal);
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
  const p = paletteOf(state.spec.pal);
  const root = document.documentElement.style;
  root.setProperty("--glow", p.bg[2]);
  root.setProperty("--glow-2", p.bg[3]);
  const bright = (hex) => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
  const accent = bright(p.accent) > 0.5 ? p.accent : bright(p.bg[3]) > 0.5 ? p.bg[3] : "#ffcf7a";
  root.setProperty("--accent", accent);
  $('meta[name="theme-color"]').setAttribute("content", "#0b0a0f");
  return p;
}

function updateMeta() {
  const s = state.spec;
  const p = themeFromPalette();
  const clockName = s.clock === "none" ? "No clock" : CLOCK_STYLES.find((c) => c.id === s.clock)?.name;
  const bgName = BG_STYLES.find((b) => b.id === s.bg)?.name;
  const [w, hgt] = deviceSize(state.device);
  $("#meta").textContent = `${clockName} · ${bgName} · ${p.name || "Custom"} — ${w} × ${hgt}`;
  preview.setAttribute("aria-label", `Wallpaper preview: ${clockName} clock on ${bgName} art in ${p.name} colours`);
  const today = dailySpec();
  const k = $("#kicker");
  if (specKey(s) === specKey(today)) k.textContent = `Today's wallpaper · ${new Date().toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}`;
  else k.textContent = "Your design";
  const saved = state.saved.some((x) => specKey(x) === specKey(s));
  $("#favBtn").setAttribute("aria-pressed", saved);
  $("#favBtn").setAttribute("aria-label", saved ? "Remove from saved" : "Add to saved");
  $("#savedCount").textContent = state.saved.length;
}

function setSpec(spec, { push = false, animate = true } = {}) {
  state.spec = spec;
  const url = hashOf(spec);
  if (location.hash !== url) history[push ? "pushState" : "replaceState"](null, "", url);
  updateMeta();
  if (animate) { phone.classList.remove("busy"); void phone.offsetWidth; phone.classList.add("busy"); }
  loop();
  renderPanel();
}

/* ───────────── panel (tabs) ───────────── */
let thumbJob = 0;

function thumbCanvas() {
  const c = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = Math.round(74 * dpr); c.height = Math.round(140 * dpr);
  return c;
}

// Paints thumbnails a few at a time so the controls never stall
function paintThumbs(jobs) {
  const id = ++thumbJob;
  let i = 0;
  const step = () => {
    if (id !== thumbJob) return;
    const t0 = performance.now();
    while (i < jobs.length && performance.now() - t0 < 12) jobs[i++]();
    if (i < jobs.length) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function optButton(label, pressed, onclick, canvas) {
  return h("button", { class: "opt", "aria-pressed": String(pressed), onclick }, canvas, h("span", {}, label));
}

function renderPanel() {
  const s = state.spec;
  panel.replaceChildren();
  $$(".tabs [role=tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === state.tab)));
  const date = displayDate();

  if (state.tab === "clock") {
    const strip = h("div", { class: "strip" });
    const jobs = [];
    let base = null, basePal = null;
    const items = [...CLOCK_STYLES, { id: "none", name: "Art only" }];
    for (const c of items) {
      const cv = thumbCanvas();
      strip.append(optButton(c.name, s.clock === c.id, () => setSpec({ ...s, clock: c.id }), cv));
      jobs.push(() => {
        if (!base) {
          base = document.createElement("canvas"); base.width = cv.width; base.height = cv.height;
          basePal = renderBackground(base.getContext("2d"), cv.width, cv.height, s);
        }
        const ctx = cv.getContext("2d");
        ctx.drawImage(base, 0, 0);
        renderClock(ctx, cv.width, cv.height, { ...s, clock: c.id }, date, basePal);
      });
    }
    panel.append(strip);
    paintThumbs(jobs);
  }

  if (state.tab === "bg") {
    const strip = h("div", { class: "strip" });
    const jobs = [];
    for (const b of BG_STYLES) {
      const cv = thumbCanvas();
      const spec = { ...s, bg: b.id };
      strip.append(optButton(b.name, s.bg === b.id, () => setSpec(spec), cv));
      jobs.push(() => {
        const ctx = cv.getContext("2d");
        const p = renderBackground(ctx, cv.width, cv.height, spec);
        renderClock(ctx, cv.width, cv.height, spec, date, p);
      });
    }
    panel.append(strip);
    panel.append(h("div", { class: "row" },
      h("button", { class: "chip glass", onclick: () => setSpec({ ...s, seed: randomSeed() }) }, "New variation of this art")));
    paintThumbs(jobs);
  }

  if (state.tab === "pal") {
    if (!state.palOptions.length || !state.palOptions.includes(s.pal)) state.palOptions = [s.pal, ...Array.from({ length: 9 }, randomSeed)];
    const strip = h("div", { class: "strip" });
    const jobs = [];
    for (const ps of state.palOptions) {
      const cv = thumbCanvas();
      const spec = { ...s, pal: ps };
      strip.append(optButton(paletteOf(ps).name, s.pal === ps, () => setSpec(spec), cv));
      jobs.push(() => {
        const ctx = cv.getContext("2d");
        const p = renderBackground(ctx, cv.width, cv.height, spec);
        renderClock(ctx, cv.width, cv.height, spec, date, p);
      });
    }
    strip.append(h("button", {
      class: "opt new", "aria-label": "More colours",
      onclick: () => { state.palOptions = [s.pal, ...Array.from({ length: 9 }, randomSeed)]; renderPanel(); },
    }, h("span", { class: "swatch" }, "↻"), h("span", {}, "More")));
    panel.append(strip);
    paintThumbs(jobs);
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
          state.device = id; savePrefs(); sizePhone(); bgKey = ""; updateMeta(); loop(); renderPanel();
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
}

/* ───────────── shuffle ───────────── */
function shuffle() {
  setSpec(randomSpec(state.lock, state.spec), { push: false });
  const b = $("#shuffleBtn");
  b.classList.remove("spin"); void b.offsetWidth; b.classList.add("spin");
  if (navigator.vibrate) navigator.vibrate(8);
}

/* ───────────── save / export ───────────── */
async function makeWallpaper(spec = state.spec, device = state.device) {
  const [w, hgt] = deviceSize(device);
  const c = document.createElement("canvas");
  c.width = w; c.height = hgt;
  const ctx = c.getContext("2d");
  const p = renderBackground(ctx, w, hgt, spec);
  renderClock(ctx, w, hgt, spec, displayDate(), p);
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
  const k = specKey(state.spec);
  const i = state.saved.findIndex((x) => specKey(x) === k);
  if (i >= 0) { state.saved.splice(i, 1); toast("Removed from saved"); }
  else { state.saved.unshift({ ...state.spec }); state.saved = state.saved.slice(0, 80); toast("Saved to your collection"); }
  store.set("saved", state.saved);
  updateMeta();
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
      h("button", { class: "open", "aria-label": "Open this design", onclick: () => { d.close(); setSpec({ ...spec }, { push: true }); } }, cv),
      h("button", {
        class: "remove glass", "aria-label": "Remove",
        onclick: () => { state.saved = state.saved.filter((x) => specKey(x) !== specKey(spec)); store.set("saved", state.saved); updateMeta(); openCollection(); },
      }, svgX())));
    jobs.push(() => {
      const ctx = cv.getContext("2d");
      const p = renderBackground(ctx, cv.width, cv.height, spec);
      renderClock(ctx, cv.width, cv.height, spec, new Date(), p);
    });
  }
  if (!d.open) d.showModal();
  paintThumbs(jobs);
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
  const url = location.origin + location.pathname + hashOf(state.spec);
  try {
    if (navigator.share && isTouch) { await navigator.share({ title: "A Dialscape wallpaper", url }); return; }
    await navigator.clipboard.writeText(url);
    toast("Link copied");
  } catch (e) {
    if (e.name !== "AbortError") toast("Couldn't share the link");
  }
}

/* ───────────── live clock ───────────── */
const live = $("#live"), liveCanvas = $("#liveCanvas");
let liveRaf = 0, liveBg = null, liveKey = "", livePal = null, wakeLock = null, chromeTimer = 0;

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
  const key = `${specKey(state.spec)}|${w}x${hgt}`;
  if (liveCanvas.width !== w || liveCanvas.height !== hgt) { liveCanvas.width = w; liveCanvas.height = hgt; }
  if (key !== liveKey) {
    liveBg = document.createElement("canvas");
    liveBg.width = w; liveBg.height = hgt;
    livePal = renderBackground(liveBg.getContext("2d"), w, hgt, state.spec);
    liveKey = key;
  }
  const ctx = liveCanvas.getContext("2d");
  ctx.drawImage(liveBg, 0, 0);
  const spec = state.spec.clock === "none" ? { ...state.spec, clock: "halo" } : state.spec;
  renderClock(ctx, w, hgt, { ...spec, pos: "middle" }, new Date(), livePal);
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
$("#liveHint").addEventListener("click", openLive);
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
window.addEventListener("hashchange", () => { const s = specFromHash(); if (s && specKey(s) !== specKey(state.spec)) setSpec(s); });
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (!live.hidden) { cancelAnimationFrame(liveRaf); clearTimeout(liveRaf); liveFrame(); } else loop(); }, 120);
});
// swipe left on the preview to shuffle
let touchX = null;
phone.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
phone.addEventListener("touchend", (e) => {
  if (touchX == null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  touchX = null;
  if (Math.abs(dx) > 50) shuffle();
});

/* ───────────── start ───────────── */
async function fontsReady() {
  const faces = ['italic 40px "Instrument Serif"', '40px "Instrument Serif"', '500 40px "Space Grotesk"', '300 40px "DM Mono"', '400 40px "DM Mono"', '800 40px "Unbounded"'];
  await Promise.race([Promise.all(faces.map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 2500))]);
}

(async function start() {
  phone.classList.toggle("show-guides", state.guides);
  sizePhone();
  await fontsReady();
  setSpec(specFromHash() || dailySpec());
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) navigator.serviceWorker.register("sw.js").catch(() => {});
  document.documentElement.dataset.ready = "1";
})();

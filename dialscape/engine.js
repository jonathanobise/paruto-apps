// Dialscape engine: seeded palettes, generative backgrounds and clock faces drawn on a 2D canvas.
// Everything is measured in proportions of the canvas, so the small preview and the full-size export match.
// Spec: { clock, bg, pal, seed, pos }  (pal and seed are short strings; clock and bg are style ids)

/* ───────────────────────── randomness ───────────────────────── */

export function hashStr(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export function rng(seed) {
  let a = typeof seed === "number" ? seed >>> 0 : hashStr(String(seed));
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (lo, hi) => lo + (hi - lo) * next();
  next.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * next());
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  next.chance = (p) => next() < p;
  return next;
}

export const randomSeed = () => Math.random().toString(36).slice(2, 7);

const ROT = [0, 0.62, 1.31, 2.05].map((a) => [Math.cos(a), Math.sin(a)]);
// Smooth 2D value noise with a few octaves (seeded)
export function makeNoise(r) {
  const P = new Uint8Array(512);
  const base = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [base[i], base[j]] = [base[j], base[i]]; }
  for (let i = 0; i < 512; i++) P[i] = base[i & 255];
  const V = new Float32Array(256).map(() => r() * 2 - 1);
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + (b - a) * t;
  const n2 = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const X = xi & 255, Y = yi & 255;
    const v = (i, j) => V[P[P[X + i] + Y + j]];
    const u = fade(xf), w = fade(yf);
    return lerp(lerp(v(0, 0), v(1, 0), u), lerp(v(0, 1), v(1, 1), u), w);
  };
  return (x, y, oct = 3) => {
    let s = 0, amp = 1, f = 1, norm = 0;
    // each octave is turned a little, which hides the square grid value noise otherwise shows
    for (let o = 0; o < oct; o++) {
      const c = ROT[o % 4][0], sn = ROT[o % 4][1];
      s += amp * n2((x * c - y * sn) * f + o * 17.3, (x * sn + y * c) * f - o * 9.1);
      norm += amp; amp *= 0.5; f *= 2;
    }
    return s / norm;
  };
}

/* ───────────────────────── colour ───────────────────────── */

// OKLCH → sRGB hex (gamut-clipped by reducing chroma)
function oklchToRgb(L, C, H) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h), b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return lin.map((c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(c, 0), 1 / 2.4) - 0.055));
}
export function oklch(L, C, H) {
  let c = C, rgb;
  for (let i = 0; i < 24; i++) {
    rgb = oklchToRgb(L, c, H);
    if (rgb.every((v) => v >= -0.001 && v <= 1.001)) break;
    c *= 0.88;
  }
  return "#" + rgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0")).join("");
}
export function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
export function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

// Hand-tuned palettes mixed in with generated ones, so a shuffle always has a few sure things
const CURATED = [
  { name: "Lagos dusk", bg: ["#1a0b2e", "#5b1d4a", "#e0603f", "#f6b25c"], ink: "#fff4e6", accent: "#ffcf7a" },
  { name: "Harmattan", bg: ["#2b1a12", "#7a4a2a", "#c98b4f", "#ecd3a5"], ink: "#fff6ea", accent: "#ffe0a8" },
  { name: "Midnight jade", bg: ["#03110f", "#073b33", "#0f7a63", "#7ee0c1"], ink: "#e9fff8", accent: "#7ee0c1" },
  { name: "Ultraviolet", bg: ["#07051a", "#24125e", "#6b2fd6", "#ff6ad5"], ink: "#f6efff", accent: "#ff8ae2" },
  { name: "Ink & ember", bg: ["#0b0b0d", "#1c1a1f", "#3a1a14", "#ff5a1f"], ink: "#f3ede6", accent: "#ff6a2b" },
  { name: "Glacier", bg: ["#061a2b", "#0d3b66", "#4d8fbf", "#cfe8f5"], ink: "#f2fbff", accent: "#9fd8ff" },
  { name: "Rosewood", bg: ["#1d0a10", "#4a1426", "#a23b55", "#f3a7b8"], ink: "#fff0f3", accent: "#ffc2cf" },
  { name: "Moss", bg: ["#0c120a", "#22311a", "#58743a", "#cfe39b"], ink: "#f5fbe8", accent: "#d9f09a" },
  { name: "Paper", bg: ["#f3ede2", "#e6dccb", "#d2c2a8", "#b39c7b"], ink: "#231b14", accent: "#c2462b", light: true },
  { name: "Citrus", bg: ["#fff4d6", "#ffd27a", "#ff9a3c", "#e2532a"], ink: "#2a1206", accent: "#2a1206", light: true },
  { name: "Mist", bg: ["#e8eef4", "#c9d6e3", "#9fb4cc", "#6d86a6"], ink: "#16202c", accent: "#2f5d9c", light: true },
  { name: "Gold leaf", bg: ["#0a0805", "#211a0d", "#5a4519", "#d8b25a"], ink: "#fff3d1", accent: "#f2cf73" },
];

const SCHEMES = ["analogous", "complement", "triad", "mono", "split", "neon"];

export function makePalette(seed) {
  const r = rng("pal:" + seed);
  if (r.chance(0.28)) return { ...r.pick(CURATED), seed };
  const scheme = r.pick(SCHEMES);
  const light = r.chance(0.16);
  const h0 = r.range(0, 360);
  const hues = {
    analogous: [h0, h0 + 25, h0 + 50, h0 + 75],
    complement: [h0, h0 + 15, h0 + 180, h0 + 195],
    triad: [h0, h0 + 120, h0 + 240, h0 + 30],
    mono: [h0, h0 + 6, h0 - 6, h0 + 12],
    split: [h0, h0 + 150, h0 + 210, h0 + 20],
    neon: [h0, h0 + 60, h0 + 300, h0 + 180],
  }[scheme].map((h) => ((h % 360) + 360) % 360);
  const C = scheme === "mono" ? r.range(0.04, 0.12) : scheme === "neon" ? 0.26 : r.range(0.1, 0.19);
  let bg;
  if (light) {
    bg = [oklch(0.96, C * 0.25, hues[0]), oklch(0.9, C * 0.5, hues[1]), oklch(0.8, C * 0.8, hues[2]), oklch(0.68, C, hues[3])];
  } else {
    bg = [oklch(0.14, C * 0.4, hues[0]), oklch(0.28, C * 0.8, hues[1]), oklch(r.range(0.48, 0.6), C, hues[2]), oklch(r.range(0.72, 0.84), C * 0.9, hues[3])];
  }
  const ink = light ? oklch(0.2, 0.03, hues[0]) : oklch(0.97, 0.02, hues[3]);
  const accent = light ? oklch(0.5, Math.max(C, 0.14), hues[2]) : oklch(0.84, Math.max(C, 0.14), hues[3] + (scheme === "complement" ? 0 : 20));
  const hueNames = ["Rose", "Coral", "Ember", "Amber", "Gold", "Lime", "Moss", "Jade", "Teal", "Lagoon", "Azure", "Cobalt", "Indigo", "Violet", "Orchid", "Magenta"];
  const hueName = hueNames[Math.floor((((hues[2] + 11) % 360) / 360) * hueNames.length) % hueNames.length];
  const word = light ? "haze" : { analogous: "drift", complement: "contrast", triad: "carnival", mono: "tone", split: "split", neon: "neon" }[scheme];
  return { name: `${hueName} ${word}`, bg, ink, accent, light, seed };
}

/* ───────────────────────── helpers ───────────────────────── */

export const TAU = Math.PI * 2;
const FONT = {
  serif: '"Instrument Serif", "Iowan Old Style", Georgia, serif',
  grot: '"Space Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: '"DM Mono", ui-monospace, "SF Mono", Menlo, monospace',
  wide: '"Unbounded", "Space Grotesk", system-ui, sans-serif',
};
export const FONTS = FONT;

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function shade(ctx, w, h, stops, angle = 90) {
  const a = (angle * Math.PI) / 180;
  const cx = w / 2, cy = h / 2, R = Math.hypot(w, h) / 2;
  const g = ctx.createLinearGradient(cx - Math.cos(a) * R, cy - Math.sin(a) * R, cx + Math.cos(a) * R, cy + Math.sin(a) * R);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}

export function blob(ctx, x, y, r, color, alpha = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, hexA(color, alpha));
  g.addColorStop(0.45, hexA(color, alpha * 0.55));
  g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function grain(ctx, w, h, seed, amount = 0.06) {
  const size = 256;
  const tile = makeCanvas(size, size);
  const t = tile.getContext("2d");
  const img = t.createImageData(size, size);
  const r = rng("grain:" + seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = r() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  t.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.globalCompositeOperation = "overlay";
  const scale = Math.max(1, w / 900);
  const pat = ctx.createPattern(tile, "repeat");
  if (pat.setTransform) pat.setTransform(new DOMMatrix().scale(scale));
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export function vignette(ctx, w, h, strength = 0.45) {
  const g = ctx.createRadialGradient(w / 2, h * 0.5, Math.min(w, h) * 0.3, w / 2, h * 0.5, Math.hypot(w, h) * 0.62);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return c;
}

/* ───────────────────────── backgrounds ───────────────────────── */
// Each background: (ctx, w, h, pal, r, noise) → draws the full frame.

export const BACKGROUNDS = {
  mesh: {
    name: "Mesh",
    draw(ctx, w, h, p, r) {
      ctx.fillStyle = p.bg[0];
      ctx.fillRect(0, 0, w, h);
      const m = Math.max(w, h);
      const n = r.int(5, 8);
      for (let i = 0; i < n; i++) {
        const c = p.bg[1 + (i % 3)];
        blob(ctx, r.range(-0.1, 1.1) * w, r.range(-0.1, 1.1) * h, r.range(0.35, 0.75) * m, c, r.range(0.5, 0.95));
      }
      blob(ctx, r.range(0.2, 0.8) * w, r.range(0.2, 0.8) * h, 0.3 * m, p.accent, 0.25);
      if (!p.light) vignette(ctx, w, h, 0.35);
    },
  },

  aurora: {
    name: "Aurora",
    draw(ctx, w, h, p, r, noise) {
      ctx.fillStyle = shade(ctx, w, h, [p.bg[0], p.light ? p.bg[1] : p.bg[0], p.bg[1]], 90);
      ctx.fillRect(0, 0, w, h);
      // Curtains are drawn on a small canvas and scaled up, which softens them like long exposure
      const k = 6, lw = Math.max(8, Math.round(w / k)), lh = Math.max(8, Math.round(h / k));
      const low = makeCanvas(lw, lh);
      const g2 = low.getContext("2d");
      g2.globalCompositeOperation = p.light ? "multiply" : "lighter";
      const bands = r.int(3, 5);
      for (let b = 0; b < bands; b++) {
        const col = p.bg[2 + (b % 2)];
        const y0 = lh * r.range(0.18, 0.7);
        const amp = lh * r.range(0.04, 0.12);
        const freq = r.range(0.8, 2.2);
        const ph = r.range(0, TAU);
        const thick = lh * r.range(0.12, 0.28);
        const strength = r.range(0.25, 0.45);
        for (let x = 0; x < lw; x++) {
          const u = x / lw;
          const y = y0 + Math.sin(u * TAU * freq * 0.5 + ph) * amp + noise(u * 2, b) * amp;
          const t = thick * (0.65 + 0.55 * noise(u * 3 + 5, b + 3));
          const a = strength * (0.55 + 0.45 * noise(u * 14 + b * 9, b * 2.1));
          const g = g2.createLinearGradient(0, y - t, 0, y + t * 0.3);
          g.addColorStop(0, hexA(col, 0));
          g.addColorStop(0.78, hexA(col, a));
          g.addColorStop(1, hexA(col, 0));
          g2.fillStyle = g;
          g2.fillRect(x, y - t, 1, t * 1.3);
        }
      }
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(low, 0, 0, w, h);
      ctx.restore();
      if (!p.light) {
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        for (let i = 0; i < 160; i++) {
          const s = r() ** 3 * w * 0.0025 + w * 0.0006;
          ctx.globalAlpha = r.range(0.2, 0.9);
          ctx.beginPath(); ctx.arc(r() * w, r() * h * 0.6, s, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    },
  },

  contours: {
    name: "Contours",
    busy: true,
    draw(ctx, w, h, p, r, noise) {
      ctx.fillStyle = shade(ctx, w, h, [p.bg[0], p.bg[1]], r.range(60, 120));
      ctx.fillRect(0, 0, w, h);
      const cols = 150, rows = Math.round(cols * (h / w));
      const cw = w / cols, ch = h / rows;
      const sc = r.range(1.6, 3.2), ox = r.range(0, 100), oy = r.range(0, 100);
      const f = new Float32Array((cols + 1) * (rows + 1));
      for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++)
        f[j * (cols + 1) + i] = noise(ox + (i / cols) * sc, oy + (j / cols) * sc, 4);
      const levels = r.int(14, 22);
      ctx.lineWidth = Math.max(1, w * 0.0018);
      ctx.lineCap = "round";
      for (let L = 0; L < levels; L++) {
        const iso = -0.6 + (1.2 * L) / levels;
        const t = L / levels;
        ctx.strokeStyle = hexA(t > 0.5 ? p.bg[3] : p.bg[2], 0.25 + t * 0.55);
        ctx.beginPath();
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
          const a = f[j * (cols + 1) + i], b = f[j * (cols + 1) + i + 1];
          const c = f[(j + 1) * (cols + 1) + i + 1], d = f[(j + 1) * (cols + 1) + i];
          const idx = (a > iso) | ((b > iso) << 1) | ((c > iso) << 2) | ((d > iso) << 3);
          if (idx === 0 || idx === 15) continue;
          const x = i * cw, y = j * ch;
          const e = [
            [x + cw * ((iso - a) / (b - a)), y],
            [x + cw, y + ch * ((iso - b) / (c - b))],
            [x + cw * ((iso - d) / (c - d)), y + ch],
            [x, y + ch * ((iso - a) / (d - a))],
          ];
          const segs = {
            1: [[3, 0]], 2: [[0, 1]], 3: [[3, 1]], 4: [[1, 2]], 5: [[3, 0], [1, 2]], 6: [[0, 2]], 7: [[3, 2]],
            8: [[2, 3]], 9: [[0, 2]], 10: [[0, 1], [2, 3]], 11: [[1, 2]], 12: [[1, 3]], 13: [[0, 1]], 14: [[0, 3]],
          }[idx];
          for (const [m, n] of segs) { ctx.moveTo(e[m][0], e[m][1]); ctx.lineTo(e[n][0], e[n][1]); }
        }
        ctx.stroke();
      }
      blob(ctx, w * r.range(0.2, 0.8), h * r.range(0.3, 0.7), Math.max(w, h) * 0.5, p.bg[2], 0.22);
    },
  },

  bauhaus: {
    name: "Bauhaus",
    busy: true,
    draw(ctx, w, h, p, r) {
      ctx.fillStyle = p.bg[0];
      ctx.fillRect(0, 0, w, h);
      const cols = r.pick([4, 5, 6]);
      const s = w / cols;
      const rows = Math.ceil(h / s);
      const oy = (h - rows * s) / 2;
      const colors = [p.bg[1], p.bg[2], p.bg[3], p.accent, p.bg[1]];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const x = i * s, y = oy + j * s;
        ctx.save();
        ctx.translate(x + s / 2, y + s / 2);
        ctx.rotate(r.int(0, 3) * (Math.PI / 2));
        ctx.translate(-s / 2, -s / 2);
        if (r.chance(0.5)) { ctx.fillStyle = r.pick(colors); ctx.globalAlpha = 0.55; ctx.fillRect(0, 0, s, s); ctx.globalAlpha = 1; }
        ctx.fillStyle = r.pick(colors);
        const kind = r.int(0, 5);
        ctx.beginPath();
        if (kind === 0) { ctx.moveTo(0, 0); ctx.arc(0, 0, s, 0, Math.PI / 2); }
        else if (kind === 1) { ctx.arc(s / 2, s / 2, s * 0.38, 0, TAU); }
        else if (kind === 2) { ctx.arc(s / 2, 0, s / 2, 0, Math.PI); }
        else if (kind === 3) { ctx.moveTo(0, 0); ctx.lineTo(s, 0); ctx.lineTo(0, s); }
        else if (kind === 4) { ctx.rect(0, 0, s / 2, s); }
        else { ctx.arc(s / 2, s / 2, s * 0.45, 0, TAU); ctx.arc(s / 2, s / 2, s * 0.22, 0, TAU, true); }
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = p.light ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.38)";
      ctx.fillRect(0, 0, w, h);
    },
  },

  dunes: {
    name: "Dunes",
    draw(ctx, w, h, p, r, noise) {
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, p.bg[0]);
      sky.addColorStop(0.55, p.bg[1]);
      sky.addColorStop(1, p.bg[2]);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      const sunX = w * r.range(0.25, 0.75), sunY = h * r.range(0.3, 0.42), sunR = w * r.range(0.16, 0.26);
      blob(ctx, sunX, sunY, sunR * 3, p.accent, 0.35);
      ctx.fillStyle = shade(ctx, w, h, [p.bg[3], p.accent], 90);
      ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, TAU); ctx.fill();
      const layers = r.int(5, 8);
      for (let l = 0; l < layers; l++) {
        const t = l / (layers - 1);
        const base = h * (0.48 + t * 0.42);
        const amp = h * (0.05 + 0.05 * (1 - t));
        const col = mix(p.bg[2], p.bg[0], 0.15 + t * 0.8);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += w / 120) ctx.lineTo(x, base + noise(x / w * (1.2 + t * 1.5) + l * 7, l * 3.3, 3) * amp * 2.2);
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
      }
    },
  },

  cosmos: {
    name: "Cosmos",
    draw(ctx, w, h, p, r) {
      const base = p.light ? p.bg[0] : mix(p.bg[0], "#000000", 0.5);
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);
      const m = Math.max(w, h);
      ctx.save();
      ctx.globalCompositeOperation = p.light ? "multiply" : "screen";
      for (let i = 0; i < 26; i++) {
        const t = r();
        blob(ctx, w * (0.5 + (r() - 0.5) * 1.1 * (0.4 + t)), h * (0.5 + (r() - 0.5) * (0.3 + t)), m * r.range(0.08, 0.35), p.bg[1 + (i % 3)], r.range(0.08, 0.3));
      }
      ctx.restore();
      ctx.fillStyle = p.light ? p.ink : "#ffffff";
      for (let i = 0; i < 900; i++) {
        const big = r() ** 6;
        ctx.globalAlpha = r.range(0.15, 0.95);
        ctx.beginPath(); ctx.arc(r() * w, r() * h, w * (0.0005 + big * 0.003), 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      // a planet low in the frame
      if (r.chance(0.7)) {
        const px = w * r.range(0.1, 0.9), py = h * r.range(0.82, 1.05), pr = w * r.range(0.35, 0.7);
        const g = ctx.createRadialGradient(px - pr * 0.4, py - pr * 0.5, pr * 0.1, px, py, pr);
        g.addColorStop(0, p.bg[3]); g.addColorStop(0.6, p.bg[2]); g.addColorStop(1, mix(p.bg[1], "#000000", 0.4));
        blob(ctx, px, py, pr * 1.35, p.bg[3], 0.3);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
      }
    },
  },

  rays: {
    name: "Rays",
    draw(ctx, w, h, p, r) {
      const cx = w * r.range(0.3, 0.7), cy = h * r.pick([-0.05, 0.5, 1.05]);
      const n = r.pick([24, 32, 40, 48]);
      if (ctx.createConicGradient) {
        const g = ctx.createConicGradient(r.range(0, TAU), cx, cy);
        for (let i = 0; i <= n; i++) {
          const c = i % 2 ? p.bg[1] : p.bg[0];
          g.addColorStop(i / n, c);
          if (i < n) g.addColorStop((i + 0.999) / n, c);
        }
        ctx.fillStyle = g;
      } else ctx.fillStyle = p.bg[0];
      ctx.fillRect(0, 0, w, h);
      const m = Math.max(w, h);
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, m * 1.1);
      rg.addColorStop(0, hexA(p.bg[3], 0.95));
      rg.addColorStop(0.25, hexA(p.bg[2], 0.55));
      rg.addColorStop(1, hexA(p.bg[0], 0.85));
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
    },
  },

  prism: {
    name: "Prism",
    busy: true,
    draw(ctx, w, h, p, r) {
      ctx.fillStyle = shade(ctx, w, h, [p.bg[0], p.bg[1]], r.range(45, 135));
      ctx.fillRect(0, 0, w, h);
      const m = Math.min(w, h);
      for (let i = 0; i < 9; i++) {
        const sw = m * r.range(0.4, 1.1), sh = m * r.range(0.4, 1.6);
        const x = r.range(-0.2, 1) * w, y = r.range(-0.1, 1) * h;
        ctx.save();
        ctx.translate(x + sw / 2, y + sh / 2);
        ctx.rotate(r.range(-0.6, 0.6));
        const g = ctx.createLinearGradient(-sw / 2, -sh / 2, sw / 2, sh / 2);
        g.addColorStop(0, hexA(p.bg[2 + (i % 2)], 0.55));
        g.addColorStop(1, hexA(p.bg[1], 0.05));
        ctx.fillStyle = g;
        roundRect(ctx, -sw / 2, -sh / 2, sw, sh, m * 0.12);
        ctx.fill();
        ctx.strokeStyle = hexA(p.light ? "#ffffff" : p.ink, 0.18);
        ctx.lineWidth = m * 0.003;
        ctx.stroke();
        ctx.restore();
      }
      if (!p.light) vignette(ctx, w, h, 0.4);
    },
  },

  halftone: {
    name: "Halftone",
    busy: true,
    draw(ctx, w, h, p, r, noise) {
      ctx.fillStyle = p.bg[0];
      ctx.fillRect(0, 0, w, h);
      const n = 44;
      const s = w / n;
      const sc = r.range(1.2, 2.4), ox = r.range(0, 50);
      const g = shade(ctx, w, h, [p.bg[2], p.bg[3], p.accent], r.range(30, 150));
      ctx.fillStyle = g;
      ctx.beginPath();
      for (let y = s / 2; y < h + s; y += s) for (let x = s / 2; x < w + s; x += s) {
        const v = (noise(ox + (x / w) * sc, (y / w) * sc, 3) + 1) / 2;
        const rr = (s / 2) * clamp(v ** 1.6 * 1.25, 0.04, 0.98);
        ctx.moveTo(x + rr, y);
        ctx.arc(x, y, rr, 0, TAU);
      }
      ctx.fill();
    },
  },

  flow: {
    name: "Flow",
    busy: true,
    draw(ctx, w, h, p, r, noise) {
      ctx.fillStyle = shade(ctx, w, h, [p.bg[0], p.bg[1]], 90);
      ctx.fillRect(0, 0, w, h);
      const sc = r.range(1.2, 2.6), ox = r.range(0, 99), turn = r.range(2, 4);
      ctx.lineCap = "round";
      const lines = 1100;
      const step = w * 0.004;
      const colors = [p.bg[2], p.bg[3], p.accent];
      for (let i = 0; i < lines; i++) {
        let x = r() * w, y = r() * h;
        ctx.strokeStyle = hexA(r.pick(colors), r.range(0.15, 0.6));
        ctx.lineWidth = w * r.range(0.0008, 0.0035);
        ctx.beginPath();
        ctx.moveTo(x, y);
        const len = r.int(20, 90);
        for (let k = 0; k < len; k++) {
          const a = noise(ox + (x / w) * sc, (y / w) * sc, 2) * Math.PI * turn;
          x += Math.cos(a) * step; y += Math.sin(a) * step;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      if (!p.light) vignette(ctx, w, h, 0.35);
    },
  },
};

export function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = [16, 8, 0].map((s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}

/* ───────────────────────── clock faces ───────────────────────── */
// Each clock: draw(ctx, cx, cy, S, t, pal, r) where S is the face size (diameter-ish) and t a time snapshot.

export function timeParts(d) {
  const ms = d.getMilliseconds();
  const s = d.getSeconds() + ms / 1000;
  const m = d.getMinutes() + s / 60;
  const h = (d.getHours() % 12) + m / 60;
  return { d, s, m, h, H: d.getHours(), M: d.getMinutes(), S: d.getSeconds() };
}
export const pad = (n) => String(n).padStart(2, "0");
export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function hand(ctx, cx, cy, angle, len, width, color, tail = 0.12, round = true) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = round ? "round" : "butt";
  ctx.beginPath();
  ctx.moveTo(0, len * tail);
  ctx.lineTo(0, -len);
  ctx.stroke();
  ctx.restore();
}

function shadowed(ctx, pal, S, fn) {
  ctx.save();
  ctx.shadowColor = pal.light ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.45)";
  ctx.shadowBlur = S * 0.05;
  ctx.shadowOffsetY = S * 0.01;
  fn();
  ctx.restore();
}

export function hour12(H) { return H % 12 === 0 ? 12 : H % 12; }

export const CLOCKS = {
  halo: {
    name: "Halo",
    seconds: true,
    draw(ctx, cx, cy, S, t, p) {
      const R = S / 2;
      shadowed(ctx, p, S, () => {
        ctx.strokeStyle = hexA(p.ink, 0.85);
        ctx.lineWidth = S * 0.006;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      });
      ctx.fillStyle = hexA(p.ink, 0.06);
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * TAU;
        const major = i % 5 === 0;
        ctx.fillStyle = hexA(p.ink, major ? 0.95 : 0.35);
        ctx.beginPath();
        ctx.arc(cx + Math.sin(a) * R * 0.88, cy - Math.cos(a) * R * 0.88, S * (major ? 0.011 : 0.004), 0, TAU);
        ctx.fill();
      }
      shadowed(ctx, p, S, () => {
        hand(ctx, cx, cy, (t.h / 12) * TAU, R * 0.5, S * 0.03, p.ink);
        hand(ctx, cx, cy, (t.m / 60) * TAU, R * 0.76, S * 0.018, p.ink);
      });
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((t.s / 60) * TAU);
      ctx.fillStyle = p.accent;
      ctx.beginPath(); ctx.arc(0, -R * 0.88, S * 0.02, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.fillStyle = p.accent;
      ctx.beginPath(); ctx.arc(cx, cy, S * 0.022, 0, TAU); ctx.fill();
    },
  },

  bauhaus: {
    name: "Bauhaus",
    draw(ctx, cx, cy, S, t, p) {
      const R = S / 2;
      shadowed(ctx, p, S, () => {
        ctx.fillStyle = p.ink;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
      });
      const marks = [p.accent, p.bg[2], p.bg[3], p.bg[1]];
      [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy], i) => {
        ctx.fillStyle = marks[i];
        const x = cx + dx * R * 0.74, y = cy + dy * R * 0.74;
        ctx.beginPath();
        if (i === 0) ctx.arc(x, y, S * 0.07, 0, TAU);
        else if (i === 1) ctx.rect(x - S * 0.06, y - S * 0.06, S * 0.12, S * 0.12);
        else if (i === 2) { ctx.moveTo(x, y - S * 0.07); ctx.lineTo(x + S * 0.07, y + S * 0.055); ctx.lineTo(x - S * 0.07, y + S * 0.055); }
        else ctx.rect(x - S * 0.025, y - S * 0.07, S * 0.05, S * 0.14);
        ctx.fill();
      });
      const dark = p.light ? p.bg[0] : p.bg[0];
      hand(ctx, cx, cy, (t.h / 12) * TAU, R * 0.48, S * 0.07, dark, 0, false);
      hand(ctx, cx, cy, (t.m / 60) * TAU, R * 0.72, S * 0.045, dark, 0, false);
      ctx.fillStyle = p.accent;
      ctx.beginPath(); ctx.arc(cx, cy, S * 0.05, 0, TAU); ctx.fill();
    },
  },

  roman: {
    name: "Roman",
    seconds: true,
    draw(ctx, cx, cy, S, t, p) {
      const R = S / 2;
      const nums = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
      ctx.strokeStyle = hexA(p.ink, 0.5);
      ctx.lineWidth = S * 0.003;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.97, 0, TAU); ctx.stroke();
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * TAU;
        ctx.strokeStyle = hexA(p.ink, i % 5 ? 0.35 : 0.9);
        ctx.beginPath();
        ctx.moveTo(cx + Math.sin(a) * R * 0.97, cy - Math.cos(a) * R * 0.97);
        ctx.lineTo(cx + Math.sin(a) * R * (i % 5 ? 0.93 : 0.9), cy - Math.cos(a) * R * (i % 5 ? 0.93 : 0.9));
        ctx.stroke();
      }
      ctx.fillStyle = p.ink;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${S * 0.105}px ${FONT.serif}`;
      nums.forEach((n, i) => {
        const a = (i / 12) * TAU;
        ctx.save();
        ctx.translate(cx + Math.sin(a) * R * 0.74, cy - Math.cos(a) * R * 0.74);
        ctx.rotate(a);
        ctx.fillText(n, 0, 0);
        ctx.restore();
      });
      ctx.font = `italic ${S * 0.06}px ${FONT.serif}`;
      ctx.fillStyle = hexA(p.ink, 0.75);
      ctx.fillText(DAYS[t.d.getDay()].slice(0, 3) + " " + t.d.getDate(), cx, cy + R * 0.38);
      shadowed(ctx, p, S, () => {
        leafHand(ctx, cx, cy, (t.h / 12) * TAU, R * 0.5, S * 0.035, p.ink);
        leafHand(ctx, cx, cy, (t.m / 60) * TAU, R * 0.8, S * 0.025, p.ink);
      });
      hand(ctx, cx, cy, (t.s / 60) * TAU, R * 0.86, S * 0.004, p.accent, 0.2);
      ctx.fillStyle = p.accent;
      ctx.beginPath(); ctx.arc(cx, cy, S * 0.014, 0, TAU); ctx.fill();
    },
  },

  orbit: {
    name: "Orbit",
    seconds: true,
    draw(ctx, cx, cy, S, t, p) {
      const R = S / 2;
      const rings = [
        { r: R * 0.42, v: t.h / 12, size: S * 0.075, c: p.accent, label: hour12(t.H) },
        { r: R * 0.72, v: t.m / 60, size: S * 0.06, c: p.ink, label: pad(t.M) },
        { r: R * 0.97, v: t.s / 60, size: S * 0.022, c: p.bg[3] },
      ];
      ctx.lineWidth = S * 0.0035;
      rings.forEach((g) => {
        ctx.strokeStyle = hexA(p.ink, 0.22);
        ctx.beginPath(); ctx.arc(cx, cy, g.r, 0, TAU); ctx.stroke();
        ctx.strokeStyle = hexA(g.c, 0.7);
        ctx.lineWidth = S * 0.006;
        ctx.beginPath(); ctx.arc(cx, cy, g.r, -Math.PI / 2, -Math.PI / 2 + g.v * TAU); ctx.stroke();
        ctx.lineWidth = S * 0.0035;
      });
      // sun
      const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.13);
      sg.addColorStop(0, hexA(p.ink, 0.95)); sg.addColorStop(0.5, hexA(p.accent, 0.6)); sg.addColorStop(1, hexA(p.accent, 0));
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(cx, cy, S * 0.13, 0, TAU); ctx.fill();
      rings.forEach((g) => {
        const a = g.v * TAU;
        const x = cx + Math.sin(a) * g.r, y = cy - Math.cos(a) * g.r;
        shadowed(ctx, p, S, () => {
          ctx.fillStyle = g.c;
          ctx.beginPath(); ctx.arc(x, y, g.size, 0, TAU); ctx.fill();
        });
        if (g.label !== undefined) {
          ctx.fillStyle = luminance(g.c) > 0.4 ? "#111111" : "#ffffff";
          ctx.font = `600 ${g.size * 0.95}px ${FONT.grot}`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(String(g.label), x, y + g.size * 0.04);
        }
      });
    },
  },

  arcs: {
    name: "Arcs",
    seconds: true,
    draw(ctx, cx, cy, S, t, p) {
      const R = S / 2;
      const w = S * 0.055;
      const rings = [
        { r: R - w / 2, v: t.H / 24 + t.m / 1440, c: p.accent },
        { r: R - w * 1.8, v: t.m / 60, c: p.bg[3] },
        { r: R - w * 3.1, v: t.s / 60, c: p.ink },
      ];
      ctx.lineCap = "round";
      rings.forEach((g) => {
        ctx.lineWidth = w;
        ctx.strokeStyle = hexA(p.ink, 0.1);
        ctx.beginPath(); ctx.arc(cx, cy, g.r, 0, TAU); ctx.stroke();
        shadowed(ctx, p, S, () => {
          ctx.lineWidth = w;
          ctx.strokeStyle = g.c;
          ctx.beginPath(); ctx.arc(cx, cy, g.r, -Math.PI / 2, -Math.PI / 2 + Math.max(0.001, g.v) * TAU); ctx.stroke();
        });
      });
      ctx.fillStyle = p.ink;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = `500 ${S * 0.15}px ${FONT.grot}`;
      ctx.fillText(`${pad(t.H)}:${pad(t.M)}`, cx, cy - S * 0.015);
      ctx.font = `400 ${S * 0.04}px ${FONT.mono}`;
      ctx.fillStyle = hexA(p.ink, 0.7);
      ctx.fillText(`${DAYS[t.d.getDay()].slice(0, 3).toUpperCase()} ${pad(t.d.getDate())}`, cx, cy + S * 0.1);
    },
  },

  stack: {
    name: "Stack",
    draw(ctx, cx, cy, S, t, p) {
      const size = S * 0.62;
      ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.font = `800 ${size}px ${FONT.wide}`;
      const lh = size * 0.86;
      shadowed(ctx, p, S, () => {
        ctx.fillStyle = p.ink;
        ctx.fillText(pad(t.H), cx, cy - lh * 0.08);
      });
      ctx.lineWidth = S * 0.008;
      ctx.strokeStyle = p.ink;
      ctx.strokeText(pad(t.M), cx, cy + lh * 0.92);
      ctx.fillStyle = p.accent;
      ctx.font = `500 ${S * 0.045}px ${FONT.mono}`;
      ctx.fillText(`${DAYS[t.d.getDay()].toUpperCase()} · ${t.d.getDate()} ${MONTHS[t.d.getMonth()].slice(0, 3).toUpperCase()}`, cx, cy + lh * 1.18);
    },
  },

  serif: {
    name: "Serif",
    draw(ctx, cx, cy, S, t, p) {
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const h = hour12(t.H);
      const label = `${h}:${pad(t.M)}`;
      let size = S * 0.5;
      ctx.font = `italic ${size}px ${FONT.serif}`;
      const tw = ctx.measureText(label).width;
      if (tw > S * 1.3) size *= (S * 1.3) / tw;
      ctx.font = `italic ${size}px ${FONT.serif}`;
      shadowed(ctx, p, S, () => {
        ctx.fillStyle = p.ink;
        ctx.fillText(label, cx, cy);
      });
      ctx.font = `400 ${S * 0.045}px ${FONT.grot}`;
      ctx.fillStyle = hexA(p.ink, 0.8);
      const sp = `${DAYS[t.d.getDay()]}, ${t.d.getDate()} ${MONTHS[t.d.getMonth()]}`.toUpperCase().split("").join(String.fromCharCode(8202));
      ctx.fillText(sp, cx, cy + size * 0.48);
      ctx.strokeStyle = p.accent;
      ctx.lineWidth = S * 0.004;
      ctx.beginPath(); ctx.moveTo(cx - S * 0.06, cy - size * 0.46); ctx.lineTo(cx + S * 0.06, cy - size * 0.46); ctx.stroke();
      ctx.font = `italic ${S * 0.05}px ${FONT.serif}`;
      ctx.fillStyle = p.accent;
      ctx.fillText(t.H < 12 ? "morning" : t.H < 17 ? "afternoon" : t.H < 21 ? "evening" : "night", cx, cy - size * 0.58);
    },
  },

  lexicon: {
    name: "Lexicon",
    draw(ctx, cx, cy, S, t, p) {
      const grid = [
        "ITLISASTIME",
        "ACQUARTERDC",
        "TWENTYFIVEX",
        "HALFSTENFTO",
        "PASTERUNINE",
        "ONESIXTHREE",
        "FOURFIVETWO",
        "EIGHTELEVEN",
        "SEVENTWELVE",
        "TENSEOCLOCK",
      ];
      const lit = wordClockCells(t.H, t.M);
      const cols = 11, rows = 10;
      const cell = (S * 1.15) / cols;
      const x0 = cx - (cols * cell) / 2 + cell / 2, y0 = cy - (rows * cell) / 2 + cell / 2;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = `500 ${cell * 0.52}px ${FONT.grot}`;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const on = lit.has(j * 100 + i);
        const x = x0 + i * cell, y = y0 + j * cell;
        if (on) {
          ctx.save();
          ctx.shadowColor = p.accent; ctx.shadowBlur = cell * 0.6;
          ctx.fillStyle = p.ink;
          ctx.fillText(grid[j][i], x, y);
          ctx.restore();
        } else {
          ctx.fillStyle = hexA(p.ink, 0.16);
          ctx.fillText(grid[j][i], x, y);
        }
      }
      const extra = t.M % 5;
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = k < extra ? p.accent : hexA(p.ink, 0.16);
        ctx.beginPath(); ctx.arc(cx + (k - 1.5) * cell * 0.7, y0 + rows * cell + cell * 0.1, cell * 0.09, 0, TAU); ctx.fill();
      }
    },
  },

  matrix: {
    name: "Dot matrix",
    seconds: true,
    draw(ctx, cx, cy, S, t, p) {
      const str = `${pad(t.H)}:${pad(t.M)}`;
      const cols = str.length * 6 - 1 - 4; // colon narrower
      const dot = S * 1.2 / (cols + 1);
      let x = cx - (cols * dot) / 2 + dot / 2;
      const y0 = cy - 3 * dot;
      for (const ch of str) {
        const g = DOTFONT[ch];
        const width = ch === ":" ? 1 : 5;
        for (let j = 0; j < 7; j++) for (let i = 0; i < width; i++) {
          const on = g[j][i] === "1";
          ctx.fillStyle = on ? p.ink : hexA(p.ink, 0.08);
          if (on) { ctx.save(); ctx.shadowColor = p.accent; ctx.shadowBlur = dot * 0.9; }
          ctx.beginPath(); ctx.arc(x + i * dot, y0 + j * dot, dot * 0.38, 0, TAU); ctx.fill();
          if (on) ctx.restore();
        }
        x += (width + 1) * dot;
      }
      // seconds as a bar of 60 dots below
      const sd = (cols * dot) / 60;
      for (let i = 0; i < 60; i++) {
        ctx.fillStyle = i <= t.S ? p.accent : hexA(p.ink, 0.12);
        ctx.beginPath(); ctx.arc(cx - (cols * dot) / 2 + sd * (i + 0.5), y0 + 9 * dot, sd * 0.3, 0, TAU); ctx.fill();
      }
    },
  },

  daylight: {
    name: "Daylight",
    draw(ctx, cx, cy, S, t, p) {
      const R = S / 2;
      const frac = (t.H + t.d.getMinutes() / 60) / 24;
      // night half (18:00–06:00 at the bottom)
      ctx.lineWidth = S * 0.06;
      ctx.lineCap = "butt";
      ctx.strokeStyle = hexA(p.ink, 0.14);
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.82, 0, TAU); ctx.stroke();
      const day = ctx.createLinearGradient(cx, cy - R, cx, cy + R);
      day.addColorStop(0, p.accent); day.addColorStop(1, hexA(p.accent, 0.1));
      ctx.strokeStyle = day;
      // 24h dial: midnight at bottom, noon at top
      const ang = (f) => Math.PI / 2 + f * TAU;
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.82, ang(6 / 24), ang(18 / 24)); ctx.stroke();
      ctx.fillStyle = hexA(p.ink, 0.75);
      ctx.font = `400 ${S * 0.036}px ${FONT.mono}`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (let hh = 0; hh < 24; hh += 3) {
        const a = ang(hh / 24);
        ctx.fillText(pad(hh), cx + Math.cos(a) * R * 1.0, cy + Math.sin(a) * R * 1.0);
      }
      const a = ang(frac);
      const sx = cx + Math.cos(a) * R * 0.82, sy = cy + Math.sin(a) * R * 0.82;
      const isDay = t.H >= 6 && t.H < 18;
      blob(ctx, sx, sy, S * 0.16, isDay ? p.accent : p.ink, 0.5);
      shadowed(ctx, p, S, () => {
        ctx.fillStyle = isDay ? p.accent : p.ink;
        ctx.beginPath(); ctx.arc(sx, sy, S * 0.045, 0, TAU); ctx.fill();
      });
      if (!isDay) {
        ctx.fillStyle = hexA(p.bg[0], 1);
        ctx.beginPath(); ctx.arc(sx + S * 0.018, sy - S * 0.012, S * 0.038, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = p.ink;
      ctx.font = `300 ${S * 0.17}px ${FONT.grot}`;
      ctx.fillText(`${pad(t.H)}:${pad(t.M)}`, cx, cy - S * 0.02);
      ctx.font = `italic ${S * 0.06}px ${FONT.serif}`;
      ctx.fillStyle = hexA(p.ink, 0.75);
      ctx.fillText(isDay ? "daylight" : "night", cx, cy + S * 0.11);
    },
  },

  rotor: {
    name: "Rotor",
    seconds: true,
    draw(ctx, cx, cy, S, t, p) {
      const R = S / 2;
      // rings turn so the current hour and minute sit under the marker at the top
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      const ring = (radius, count, value, fmt, size, alphaFar) => {
        for (let i = 0; i < count; i++) {
          const a = ((i - value) / count) * TAU;
          const near = Math.cos(a);
          ctx.save();
          ctx.translate(cx + Math.sin(a) * radius, cy - Math.cos(a) * radius);
          ctx.rotate(a);
          ctx.fillStyle = hexA(p.ink, clamp(alphaFar + (near - 0.7) * 2.5, alphaFar, 1));
          ctx.fillText(fmt(i), 0, 0);
          ctx.restore();
        }
      };
      ctx.font = `600 ${S * 0.085}px ${FONT.grot}`;
      ring(R * 0.56, 12, t.h, (i) => String(i === 0 ? 12 : i), 0, 0.2);
      // minute ring: a tick every minute, a number every five
      for (let i = 0; i < 60; i++) {
        const a = ((i - t.m) / 60) * TAU;
        const near = Math.cos(a);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(a);
        ctx.fillStyle = hexA(p.ink, clamp(0.2 + (near - 0.8) * 4, 0.2, 1));
        if (i % 5 === 0) {
          ctx.font = `500 ${S * 0.05}px ${FONT.mono}`;
          ctx.fillText(pad(i), 0, -R * 0.84);
        } else ctx.fillRect(-S * 0.002, -R * 0.985, S * 0.004, S * 0.028);
        ctx.restore();
      }
      ctx.strokeStyle = hexA(p.ink, 0.15);
      ctx.lineWidth = S * 0.003;
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.68, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      // marker
      ctx.fillStyle = p.accent;
      ctx.beginPath();
      ctx.moveTo(cx, cy - R * 1.04);
      ctx.lineTo(cx - S * 0.025, cy - R * 1.1);
      ctx.lineTo(cx + S * 0.025, cy - R * 1.1);
      ctx.fill();
      ctx.strokeStyle = hexA(p.accent, 0.6);
      ctx.lineWidth = S * 0.003;
      ctx.beginPath(); ctx.moveTo(cx, cy - R * 1.02); ctx.lineTo(cx, cy - R * 0.32); ctx.stroke();
      // seconds sweep in the centre
      ctx.fillStyle = hexA(p.accent, 0.9);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R * 0.12, -Math.PI / 2, -Math.PI / 2 + (t.s / 60) * TAU); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = hexA(p.ink, 0.25);
      ctx.beginPath(); ctx.arc(cx, cy, R * 0.12, 0, TAU); ctx.stroke();
    },
  },

  flip: {
    name: "Flip",
    draw(ctx, cx, cy, S, t, p) {
      const digits = `${pad(t.H)}${pad(t.M)}`;
      const cw = S * 0.27, ch = S * 0.4, gap = S * 0.025, mid = S * 0.08;
      const total = cw * 4 + gap * 2 + mid;
      let x = cx - total / 2;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (let i = 0; i < 4; i++) {
        const y = cy - ch / 2;
        shadowed(ctx, p, S, () => {
          ctx.fillStyle = p.light ? mix(p.ink, "#000000", 0.2) : mix(p.bg[0], "#000000", 0.35);
          roundRect(ctx, x, y, cw, ch, S * 0.03); ctx.fill();
        });
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        roundRect(ctx, x, y, cw, ch / 2, S * 0.03); ctx.fill();
        ctx.fillStyle = p.light ? p.bg[0] : p.ink;
        ctx.font = `600 ${ch * 0.78}px ${FONT.grot}`;
        ctx.fillText(digits[i], x + cw / 2, cy + ch * 0.04);
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(x, cy - S * 0.003, cw, S * 0.006);
        x += cw + (i === 1 ? mid : gap);
      }
      ctx.fillStyle = p.accent;
      [-1, 1].forEach((k) => { ctx.beginPath(); ctx.arc(cx, cy + k * S * 0.06, S * 0.018, 0, TAU); ctx.fill(); });
      ctx.font = `500 ${S * 0.042}px ${FONT.mono}`;
      ctx.fillStyle = hexA(p.ink, 0.8);
      ctx.fillText(`${DAYS[t.d.getDay()].toUpperCase()} ${t.d.getDate()} ${MONTHS[t.d.getMonth()].slice(0, 3).toUpperCase()}`, cx, cy + ch / 2 + S * 0.08);
    },
  },
};

function leafHand(ctx, cx, cy, angle, len, width, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, len * 0.12);
  ctx.quadraticCurveTo(width, -len * 0.4, 0, -len);
  ctx.quadraticCurveTo(-width, -len * 0.4, 0, len * 0.12);
  ctx.fill();
  ctx.restore();
}

// Cells (row*100+col) lit for the word grid in the lexicon face
function wordClockCells(H, M) {
  const W = {
    it: [0, 0, 2], is: [0, 3, 2],
    quarter: [1, 2, 7], twenty: [2, 0, 6], five: [2, 6, 4], half: [3, 0, 4], tenM: [3, 5, 3], to: [3, 9, 2], past: [4, 0, 4],
    h: {
      1: [5, 0, 3], 2: [6, 8, 3], 3: [5, 6, 5], 4: [6, 0, 4], 5: [6, 4, 4], 6: [5, 3, 3], 7: [8, 0, 5], 8: [7, 0, 5],
      9: [4, 7, 4], 10: [9, 0, 3], 11: [7, 5, 6], 12: [8, 5, 6],
    },
    oclock: [9, 5, 6],
  };
  const set = new Set();
  const add = ([r, c, n]) => { for (let i = 0; i < n; i++) set.add(r * 100 + c + i); };
  add(W.it); add(W.is);
  const m5 = Math.floor(M / 5) * 5;
  let hour = H % 12;
  if (m5 > 30) hour = (hour + 1) % 12;
  const hw = W.h[hour === 0 ? 12 : hour];
  const mins = {
    0: [], 5: [W.five], 10: [W.tenM], 15: [W.quarter], 20: [W.twenty], 25: [W.twenty, W.five], 30: [W.half],
    35: [W.twenty, W.five], 40: [W.twenty], 45: [W.quarter], 50: [W.tenM], 55: [W.five],
  }[m5];
  mins.forEach(add);
  if (m5 === 0) add(W.oclock);
  else add(m5 <= 30 ? W.past : W.to);
  add(hw);
  return set;
}

const DOTFONT = {
  0: ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  3: ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  6: ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  7: ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  8: ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  9: ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  ":": ["0", "0", "1", "0", "1", "0", "0"],
};

/* ───────────────────────── public API ───────────────────────── */

export const BG_STYLES = Object.entries(BACKGROUNDS).map(([id, b]) => ({ id, name: b.name }));
export const CLOCK_STYLES = Object.entries(CLOCKS).map(([id, c]) => ({ id, name: c.name, seconds: !!c.seconds }));
export const POSITIONS = { high: 0.4, middle: 0.55, low: 0.68 };

export function randomSpec(lock = {}, prev = {}) {
  return {
    clock: lock.clock ? prev.clock : CLOCK_STYLES[Math.floor(Math.random() * CLOCK_STYLES.length)].id,
    bg: lock.bg ? prev.bg : BG_STYLES[Math.floor(Math.random() * BG_STYLES.length)].id,
    pal: lock.pal ? prev.pal : randomSeed(),
    seed: lock.bg ? prev.seed : randomSeed(),
    pos: prev.pos || "middle",
  };
}

// The same date always gives the same "wallpaper of the day"
export function dailySpec(date = new Date()) {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const r = rng("daily:" + key);
  return { clock: r.pick(CLOCK_STYLES).id, bg: r.pick(BG_STYLES).id, pal: Math.floor(r() * 1e9).toString(36).slice(0, 5), seed: Math.floor(r() * 1e9).toString(36).slice(0, 5), pos: "middle" };
}

/** Draws the background only (expensive; cache the result and redraw the clock on top). */
export function renderBackground(ctx, w, h, spec) {
  const pal = makePalette(spec.pal);
  const r = rng(`bg:${spec.bg}:${spec.seed}`);
  const noise = makeNoise(rng(`noise:${spec.seed}`));
  const bg = BACKGROUNDS[spec.bg] || BACKGROUNDS.mesh;
  ctx.save();
  bg.draw(ctx, w, h, pal, r, noise);
  ctx.restore();
  grain(ctx, w, h, spec.seed, pal.light ? 0.05 : 0.07);
  return pal;
}

/** Where the clock sits and how big it is, as used by renderClock. */
export function clockFrame(w, h, spec) {
  const portrait = h >= w;
  const S = portrait ? w * 0.68 : Math.min(h * 0.55, w * 0.4);
  const cy = portrait ? h * (POSITIONS[spec.pos] ?? 0.55) : h * 0.5;
  return { cx: w / 2, cy, S };
}

export function renderClock(ctx, w, h, spec, date = new Date(), pal = makePalette(spec.pal)) {
  if (spec.clock === "none") return;
  const clock = CLOCKS[spec.clock] || CLOCKS.halo;
  const { cx, cy, S } = clockFrame(w, h, spec);
  ctx.save();
  // a soft pool of shade behind the face keeps it legible on busy art
  const busy = !!BACKGROUNDS[spec.bg]?.busy;
  const pool = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * (busy ? 0.95 : 0.85));
  const shadeCol = pal.light ? "#ffffff" : "#000000";
  pool.addColorStop(0, hexA(shadeCol, (pal.light ? 0.28 : 0.32) + (busy ? 0.3 : 0)));
  if (busy) pool.addColorStop(0.55, hexA(shadeCol, pal.light ? 0.4 : 0.45));
  pool.addColorStop(1, hexA(shadeCol, 0));
  ctx.fillStyle = pool;
  ctx.fillRect(cx - S, cy - S, S * 2, S * 2);
  clock.draw(ctx, cx, cy, S, timeParts(date), pal, rng("clock:" + spec.seed));
  ctx.restore();
}

export function render(ctx, w, h, spec, date) {
  const pal = renderBackground(ctx, w, h, spec);
  renderClock(ctx, w, h, spec, date, pal);
  return pal;
}

export const paletteOf = makePalette;
export const clockHasSeconds = (id) => !!CLOCKS[id]?.seconds;

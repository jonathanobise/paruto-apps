// Dialscape studio: poster-style type clocks and layered scenes with depth.
// Scenes paint a back layer and (optionally) a front layer; the time is drawn between them, so towers,
// trees, houses and flowers stand in front of the digits. Everything is measured in proportions of the canvas.

import {
  TAU, hexA, mix, blob, makeCanvas, pad, DAYS, MONTHS, BACKGROUNDS, luminance, clamp, rng,
} from "./engine.js";

/* ───────────────────────── type ───────────────────────── */

export const TYPEFACE = {
  anton: '"Anton", "Bebas Neue", Impact, sans-serif',
  bebas: '"Bebas Neue", "Anton", Impact, sans-serif',
  shoulders: '"Big Shoulders Display", "Antonio", sans-serif',
  antonio: '"Antonio", "Big Shoulders Display", sans-serif',
  sixcaps: '"Six Caps", "Antonio", sans-serif',
  script: '"Yellowtail", "Caveat", cursive',
  hand: '"Caveat", "Yellowtail", cursive',
  grot: '"Space Grotesk", system-ui, -apple-system, sans-serif',
  mono: '"DM Mono", ui-monospace, Menlo, monospace',
  serif: '"Instrument Serif", Georgia, serif',
  wide: '"Unbounded", "Space Grotesk", sans-serif',
};

const MON = MONTHS.map((m) => m.slice(0, 3).toUpperCase());
export const DATE = {
  caps: (d) => `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`,
  slash: (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
  long: (d) => `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`.toUpperCase(),
  script: (d) => `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`,
};

// Lays out a string glyph by glyph (tracking in em), so spacing is identical in every browser
function line(ctx, str, font, size, tracking = 0) {
  ctx.font = font(size);
  const chars = [...str].map((c) => ({ c, w: ctx.measureText(c).width }));
  const tr = tracking * size;
  let x = 0;
  for (const ch of chars) { ch.x = x; x += ch.w + tr; }
  const m = ctx.measureText("0");
  return { chars, width: x - tr, asc: m.actualBoundingBoxAscent, size, font };
}
// Biggest size at which `sample` fits maxW wide and maxH tall
function fit(ctx, sample, font, tracking, maxW, maxH = Infinity) {
  const L = line(ctx, sample, font, 100, tracking);
  return Math.min((maxW / L.width) * 100, (maxH / L.asc) * 100);
}
// Draws a laid-out line with its top at `top`, aligned by `align` around x
function drawLine(ctx, L, x, top, { align = "center", stroke = false } = {}) {
  ctx.font = L.font(L.size);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const x0 = align === "center" ? x - L.width / 2 : align === "right" ? x - L.width : x;
  for (const ch of L.chars) {
    if (stroke) ctx.strokeText(ch.c, x0 + ch.x, top + L.asc);
    else ctx.fillText(ch.c, x0 + ch.x, top + L.asc);
  }
  return { x0, x1: x0 + L.width, top, bottom: top + L.asc };
}
function tracked(ctx, str, x, y, size, font, tracking, align = "center") {
  const L = line(ctx, str, () => font, size, tracking);
  ctx.textBaseline = "alphabetic";
  const x0 = align === "center" ? x - L.width / 2 : align === "right" ? x - L.width : x;
  ctx.textAlign = "left";
  for (const ch of L.chars) ctx.fillText(ch.c, x0 + ch.x, y);
  return L.width;
}
function vgrad(ctx, y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}
function softShadow(ctx, p, size, a = 0.35) {
  ctx.shadowColor = p.light ? `rgba(0,0,0,${a * 0.5})` : `rgba(0,0,0,${a})`;
  ctx.shadowBlur = size * 0.08;
  ctx.shadowOffsetY = size * 0.015;
}
const noShadow = (ctx) => { ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; };
// An accent that still reads against the ink colour
function second(p) {
  return Math.abs(luminance(p.accent) - luminance(p.ink)) > 0.06 ? p.accent : p.bg[3];
}
function dateAbove(ctx, f, d, p, top, size, fmt = DATE.caps, align = "center", x = f.cx) {
  const str = D(f, fmt, d);
  if (!str) return;
  ctx.fillStyle = p.ink;
  tracked(ctx, str, x, top - size * 0.35, size, `600 ${size}px ${TYPEFACE.grot}`, 0.14, align);
}
// The editor can swap the typeface (f.face) and the date format (f.date: a DATE function, or null for none)
const fam = (f, def) => (f.face && TYPEFACE[f.face] ? TYPEFACE[f.face] : def);
const D = (f, def, d) => { const fm = f.date === undefined ? def : f.date; return fm ? fm(d) : ""; };

const DOTS = {
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
};

export const TYPES = {
  tower: {
    name: "Tower",
    draw(ctx, f, t, p, r) {
      const font = (s) => `400 ${s}px ${fam(f, TYPEFACE.anton)}`;
      const size = fit(ctx, "00", font, -0.01, f.W * 0.8, f.maxH * 0.46);
      const A = line(ctx, pad(t.H), font, size, -0.01), B = line(ctx, pad(t.M), font, size, -0.01);
      const gap = size * 0.04, total = A.asc * 2 + gap, top = f.cy - total / 2;
      softShadow(ctx, p, size);
      ctx.fillStyle = p.ink;
      drawLine(ctx, A, f.cx, top);
      ctx.fillStyle = r.chance(0.55) ? second(p) : p.ink;
      drawLine(ctx, B, f.cx, top + A.asc + gap);
      noShadow(ctx);
      dateAbove(ctx, f, t.d, p, top, size * 0.065, r.pick([DATE.caps, DATE.slash]));
    },
  },

  split: {
    name: "Split",
    draw(ctx, f, t, p, r) {
      const font = (s) => `400 ${s}px ${fam(f, TYPEFACE.bebas)}`;
      const size = fit(ctx, "0000", font, 0, f.W, f.maxH * 0.42);
      const L = line(ctx, pad(t.H) + pad(t.M), font, size, 0);
      const top = f.cy - L.asc / 2;
      if (f.portrait && r.chance(0.5)) {
        // a coloured strip down the right edge carrying the date
        const bw = f.w * 0.075;
        ctx.fillStyle = second(p);
        ctx.fillRect(f.w - bw, 0, bw, f.h);
        ctx.save();
        ctx.translate(f.w - bw / 2, f.cy + L.asc * 0.2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = p.light ? p.ink : p.bg[0];
        tracked(ctx, D(f, DATE.slash, t.d), 0, bw * 0.17, bw * 0.4, `600 ${bw * 0.4}px ${TYPEFACE.grot}`, 0.18);
        ctx.restore();
      } else dateAbove(ctx, f, t.d, p, top, size * 0.06);
      softShadow(ctx, p, size);
      const x0 = f.cx - L.width / 2;
      ctx.font = font(size);
      ctx.textAlign = "left";
      L.chars.forEach((ch, i) => {
        ctx.fillStyle = i < 2 ? p.ink : second(p);
        ctx.fillText(ch.c, x0 + ch.x, top + L.asc);
      });
      noShadow(ctx);
    },
  },

  thin: {
    name: "Hairline",
    seconds: true,
    draw(ctx, f, t, p) {
      const font = (s) => `150 ${s}px ${fam(f, TYPEFACE.shoulders)}`;
      const sample = "00 00 00";
      const size = fit(ctx, sample, font, 0.02, f.W, f.maxH * 0.5);
      const L = line(ctx, `${pad(t.H)} ${pad(t.M)} ${pad(t.S)}`, font, size, 0.02);
      const top = f.cy - L.asc / 2;
      ctx.fillStyle = vgrad(ctx, top, top + L.asc, [[0, p.ink], [1, mix(p.ink, second(p), 0.65)]]);
      softShadow(ctx, p, size, 0.25);
      drawLine(ctx, L, f.cx, top);
      noShadow(ctx);
    },
  },

  fade: {
    name: "Fade",
    draw(ctx, f, t, p) {
      const font = (s) => `300 ${s}px ${fam(f, TYPEFACE.shoulders)}`;
      const size = fit(ctx, "0000", font, 0.04, f.W, f.maxH * 0.62);
      const L = line(ctx, pad(t.H) + pad(t.M), font, size, 0.04);
      const top = f.cy - L.asc * 0.55;
      ctx.fillStyle = vgrad(ctx, top, top + L.asc, [[0, hexA(p.ink, 1)], [0.55, hexA(p.ink, 0.85)], [1, hexA(p.ink, 0)]]);
      drawLine(ctx, L, f.cx, top);
      dateAbove(ctx, f, t.d, p, top, size * 0.05);
    },
  },

  outline: {
    name: "Outline",
    draw(ctx, f, t, p, r) {
      const font = (s) => `200 ${s}px ${fam(f, TYPEFACE.antonio)}`;
      const size = fit(ctx, "0000", font, -0.02, f.W * 0.98, f.maxH * 0.5);
      const A = line(ctx, pad(t.H), font, size, -0.02), B = line(ctx, pad(t.M), font, size, -0.02);
      const full = A.width + B.width - size * 0.02;
      ctx.save();
      ctx.translate(f.cx, f.cy);
      ctx.rotate(f.portrait ? -0.14 : -0.06);
      ctx.lineWidth = size * 0.012;
      ctx.lineJoin = "round";
      softShadow(ctx, p, size, 0.5);
      ctx.strokeStyle = p.ink;
      drawLine(ctx, A, -full / 2, -A.asc / 2, { align: "left", stroke: true });
      ctx.strokeStyle = hexA(r.chance(0.5) ? second(p) : p.ink, 0.6);
      drawLine(ctx, B, -full / 2 + A.width - size * 0.02, -A.asc / 2, { align: "left", stroke: true });
      ctx.fillStyle = p.ink;
      tracked(ctx, D(f, DATE.caps, t.d), -full / 2, -A.asc / 2 - size * 0.04, size * 0.055, `600 ${size * 0.055}px ${TYPEFACE.grot}`, 0.12, "left");
      ctx.restore();
    },
  },

  column: {
    name: "Column",
    draw(ctx, f, t, p) {
      const font = (s) => `400 ${s}px ${fam(f, TYPEFACE.anton)}`;
      const size = fit(ctx, "00", font, -0.01, f.W * 0.5, f.maxH * 0.44);
      const A = line(ctx, pad(t.H), font, size, -0.01), B = line(ctx, pad(t.M), font, size, -0.01);
      const gap = size * 0.03, total = A.asc * 2 + gap, top = f.cy - total * 0.62;
      const right = f.cx + f.W * (f.portrait ? 0.46 : 0.25);
      softShadow(ctx, p, size);
      ctx.fillStyle = vgrad(ctx, top, top + total, [[0, second(p)], [0.5, mix(second(p), p.ink, 0.5)], [1, p.ink]]);
      drawLine(ctx, A, right, top, { align: "right" });
      drawLine(ctx, B, right, top + A.asc + gap, { align: "right" });
      noShadow(ctx);
      ctx.save();
      ctx.translate(f.portrait ? f.w * 0.955 : right + size * 0.12, top + total + size * 0.05);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = second(p);
      tracked(ctx, D(f, DATE.slash, t.d), 0, 0, size * 0.075, `700 ${size * 0.075}px ${TYPEFACE.grot}`, 0.12, "left");
      ctx.restore();
    },
  },

  dots: {
    name: "Dots",
    seconds: true,
    draw(ctx, f, t, p) {
      const rows = [pad(t.H), pad(t.M), pad(t.S)];
      const d = Math.min((f.W * 0.62) / 11, (f.maxH * 0.9) / 25);
      const left = f.cx - (11 * d) / 2 - (f.portrait ? f.W * 0.12 : 0);
      const top = f.cy - (25 * d) / 2;
      softShadow(ctx, p, d * 12, 0.55);
      rows.forEach((str, ri) => {
        const y0 = top + ri * 9 * d;
        [...str].forEach((ch, ci) => {
          const g = DOTS[ch];
          for (let j = 0; j < 7; j++) for (let i = 0; i < 5; i++) {
            if (g[j][i] !== "1") continue;
            ctx.fillStyle = hexA(p.ink, ri === 2 ? 0.32 : 1);
            ctx.beginPath();
            ctx.arc(left + (ci * 6 + i + 0.5) * d, y0 + (j + 0.5) * d, d * 0.42, 0, TAU);
            ctx.fill();
          }
        });
      });
      ctx.fillStyle = p.ink;
      tracked(ctx, D(f, DATE.caps, t.d), left, top - d * 0.9, d * 0.95, `600 ${d * 0.95}px ${TYPEFACE.grot}`, 0.12, "left");
    },
  },

  script: {
    name: "Signature",
    draw(ctx, f, t, p, r) {
      const font = (s) => `400 ${s}px ${fam(f, TYPEFACE.sixcaps)}`;
      const size = fit(ctx, "0000", font, 0.06, f.W * 0.66, f.maxH * 0.6);
      const L = line(ctx, pad(t.H) + pad(t.M), font, size, 0.06);
      const top = f.cy - L.asc / 2;
      ctx.fillStyle = vgrad(ctx, top, top + L.asc, [[0, hexA(p.ink, 0.95)], [1, hexA(p.ink, 0.08)]]);
      drawLine(ctx, L, f.cx, top);
      const ds = L.width * 0.17;
      ctx.save();
      ctx.translate(f.cx, top + L.asc * 0.6);
      ctx.rotate(-0.05);
      ctx.font = `400 ${ds}px ${TYPEFACE.script}`;
      ctx.textAlign = "center";
      softShadow(ctx, p, ds * 3, 0.5);
      ctx.fillStyle = r.chance(0.6) ? second(p) : p.ink;
      ctx.fillText(D(f, DATE.script, t.d), 0, 0);
      ctx.restore();
    },
  },

  torn: {
    name: "Torn",
    draw(ctx, f, t, p, r) {
      const font = (s) => `400 ${s}px ${fam(f, TYPEFACE.anton)}`;
      const size = fit(ctx, "0000", font, -0.01, f.W * 0.86, f.maxH * 0.32);
      const L = line(ctx, pad(t.H) + pad(t.M), font, size, -0.01);
      const paper = p.light ? "#191716" : "#f1ece3";
      const inkOnPaper = p.light ? "#f1ece3" : "#141211";
      const bandTop = f.cy - L.asc * 0.82, bandBot = f.cy + L.asc * 0.72;
      const edge = (y, amp, seedOff) => {
        const pts = [];
        const n = 46;
        for (let i = 0; i <= n; i++) pts.push([(i / n) * (f.w + 40) - 20, y + (r() - 0.5) * amp + Math.sin(i * 0.7 + seedOff) * amp * 0.3]);
        return pts;
      };
      const topEdge = edge(bandTop, size * 0.05, 1), botEdge = edge(bandBot, size * 0.035, 4);
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = size * 0.08; ctx.shadowOffsetY = size * 0.02;
      ctx.fillStyle = paper;
      ctx.beginPath();
      topEdge.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      [...botEdge].reverse().forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // the torn fibres along the top edge
      ctx.strokeStyle = p.light ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.9)";
      ctx.lineWidth = size * 0.012;
      ctx.beginPath();
      topEdge.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + size * 0.008) : ctx.moveTo(x, y + size * 0.008)));
      ctx.stroke();
      const top = f.cy - L.asc * 0.5;
      const x0 = f.cx - L.width / 2;
      ctx.font = font(size);
      ctx.textAlign = "left";
      const acc = luminance(p.accent) > 0.45 && !p.light ? mix(p.accent, "#000000", 0.35) : p.accent;
      L.chars.forEach((ch, i) => {
        ctx.fillStyle = i < 2 ? inkOnPaper : acc;
        ctx.fillText(ch.c, x0 + ch.x, top + L.asc);
      });
      ctx.fillStyle = inkOnPaper;
      tracked(ctx, D(f, DATE.slash, t.d), x0, top - size * 0.06, size * 0.06, `600 ${size * 0.06}px ${TYPEFACE.grot}`, 0.12, "left");
    },
  },

  mirror: {
    name: "Mirror",
    draw(ctx, f, t, p) {
      const font = (s) => `200 ${s}px ${fam(f, TYPEFACE.antonio)}`;
      const size = fit(ctx, "0000", font, 0.02, f.W * 0.92, f.maxH * 0.34);
      const L = line(ctx, pad(t.H) + pad(t.M), font, size, 0.02);
      const base = f.cy;
      const top = base - L.asc;
      ctx.fillStyle = p.ink;
      softShadow(ctx, p, size, 0.25);
      drawLine(ctx, L, f.cx, top);
      noShadow(ctx);
      ctx.save();
      ctx.translate(0, base * 2 + size * 0.03);
      ctx.scale(1, -1);
      ctx.fillStyle = vgrad(ctx, base - L.asc, base, [[0, hexA(p.ink, 0)], [1, hexA(p.ink, 0.38)]]);
      drawLine(ctx, L, f.cx, top);
      ctx.restore();
      // ripples break up the reflection
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "#000";
      for (let y = base + size * 0.04, k = 0; y < base + L.asc * 1.05; k++) {
        const hgt = size * (0.004 + k * 0.0009);
        ctx.fillRect(f.cx - L.width, y, L.width * 2, hgt);
        y += hgt + size * (0.012 + k * 0.0016);
      }
      ctx.restore();
      ctx.fillStyle = p.ink;
      tracked(ctx, D(f, DATE.long, t.d), f.cx, top - size * 0.08, size * 0.045, `600 ${size * 0.045}px ${TYPEFACE.grot}`, 0.16);
    },
  },

  sketch: {
    name: "Sketch",
    draw(ctx, f, t, p, r) {
      const font = (s) => `700 ${s}px ${fam(f, TYPEFACE.antonio)}`;
      const size = fit(ctx, "0000", font, 0.02, f.W * 0.86, f.maxH * 0.36);
      const L = line(ctx, pad(t.H) + pad(t.M), font, size, 0.02);
      const top = f.cy - L.asc / 2;
      const x0 = f.cx - L.width / 2;
      // pencil hatching clipped to the glyphs
      const off = makeCanvas(Math.ceil(L.width + size * 0.2), Math.ceil(L.asc + size * 0.2));
      const o = off.getContext("2d");
      const pad2 = size * 0.1;
      drawLine(o, L, pad2, pad2, { align: "left" });
      o.globalCompositeOperation = "source-in";
      o.strokeStyle = hexA(p.ink, 0.85);
      o.lineWidth = Math.max(1, size * 0.006);
      const gap = size * 0.03;
      o.beginPath();
      for (let k = -off.height; k < off.width; k += gap) {
        o.moveTo(k + (r() - 0.5) * gap * 0.3, off.height);
        o.lineTo(k + off.height * 0.6 + (r() - 0.5) * gap * 0.3, 0);
      }
      o.stroke();
      ctx.drawImage(off, x0 - pad2, top - pad2);
      ctx.strokeStyle = p.ink;
      ctx.lineJoin = "round";
      for (let k = 0; k < 2; k++) {
        ctx.lineWidth = size * (0.008 - k * 0.003);
        ctx.save();
        ctx.translate((r() - 0.5) * size * 0.012, (r() - 0.5) * size * 0.012);
        drawLine(ctx, L, f.cx, top, { stroke: true });
        ctx.restore();
      }
      ctx.save();
      ctx.translate(x0 + L.width, top + L.asc + size * 0.13);
      ctx.rotate(-0.06);
      ctx.font = `500 ${size * 0.15}px ${TYPEFACE.hand}`;
      ctx.textAlign = "right";
      ctx.fillStyle = p.ink;
      ctx.fillText(D(f, DATE.script, t.d), 0, 0);
      ctx.restore();
    },
  },

  neon: {
    name: "Neon",
    draw(ctx, f, t, p) {
      const font = (s) => `400 ${s}px ${fam(f, TYPEFACE.bebas)}`;
      const size = fit(ctx, "0000", font, 0.03, f.W * 0.92, f.maxH * 0.36);
      const L = line(ctx, pad(t.H) + pad(t.M), font, size, 0.03);
      const top = f.cy - L.asc / 2;
      const glow = second(p);
      ctx.lineJoin = "round";
      for (const [blur, a, lw] of [[0.28, 0.7, 0.03], [0.12, 0.9, 0.022], [0.04, 1, 0.016]]) {
        ctx.save();
        ctx.shadowColor = glow; ctx.shadowBlur = size * blur;
        ctx.strokeStyle = hexA(glow, a); ctx.lineWidth = size * lw;
        drawLine(ctx, L, f.cx, top, { stroke: true });
        ctx.restore();
      }
      ctx.strokeStyle = mix(glow, "#ffffff", 0.75);
      ctx.lineWidth = size * 0.007;
      drawLine(ctx, L, f.cx, top, { stroke: true });
      ctx.save();
      ctx.shadowColor = glow; ctx.shadowBlur = size * 0.05;
      ctx.fillStyle = mix(glow, "#ffffff", 0.6);
      tracked(ctx, D(f, DATE.caps, t.d), f.cx, top - size * 0.08, size * 0.06, `500 ${size * 0.06}px ${TYPEFACE.mono}`, 0.2);
      ctx.restore();
    },
  },

  glass: {
    name: "Glass",
    draw(ctx, f, t, p) {
      const font = (s) => `400 ${s}px ${fam(f, TYPEFACE.anton)}`;
      const size = fit(ctx, "00", font, -0.01, f.W * 0.8, f.maxH * 0.46);
      const A = line(ctx, pad(t.H), font, size, -0.01), B = line(ctx, pad(t.M), font, size, -0.01);
      const gap = size * 0.05, total = A.asc * 2 + gap, top = f.cy - total / 2;
      // frosted glass: the blurred scene behind, lifted and tinted, seen only through the digits
      const glyphs = makeCanvas(f.w, f.h);
      const g = glyphs.getContext("2d");
      g.fillStyle = "#000";
      drawLine(g, A, f.cx, top);
      drawLine(g, B, f.cx, top + A.asc + gap);
      const pane = makeCanvas(f.w, f.h);
      const pc = pane.getContext("2d");
      if (f.blurred) pc.drawImage(f.blurred, 0, 0, f.w, f.h);
      else { pc.fillStyle = hexA(p.ink, 0.25); pc.fillRect(0, 0, f.w, f.h); }
      pc.fillStyle = vgrad(pc, top, top + total, [[0, "rgba(255,255,255,0.34)"], [0.5, "rgba(255,255,255,0.16)"], [1, hexA(p.accent, 0.18)]]);
      pc.fillRect(0, 0, f.w, f.h);
      pc.globalCompositeOperation = "destination-in";
      pc.drawImage(glyphs, 0, 0);
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = size * 0.12; ctx.shadowOffsetY = size * 0.03;
      ctx.drawImage(pane, 0, 0);
      ctx.restore();
      // rim light: bright on the top-left edges, fading round the glyph
      const rim = ctx.createLinearGradient(f.cx - A.width / 2, top, f.cx + A.width / 2, top + total);
      rim.addColorStop(0, "rgba(255,255,255,0.95)");
      rim.addColorStop(0.45, "rgba(255,255,255,0.15)");
      rim.addColorStop(1, "rgba(255,255,255,0.55)");
      ctx.strokeStyle = rim;
      ctx.lineWidth = Math.max(1, size * 0.008);
      ctx.lineJoin = "round";
      drawLine(ctx, A, f.cx, top, { stroke: true });
      drawLine(ctx, B, f.cx, top + A.asc + gap, { stroke: true });
      dateAbove(ctx, f, t.d, p, top, size * 0.065);
    },
  },

  chrome: {
    name: "Chrome",
    draw(ctx, f, t, p) {
      const font = (s) => `400 ${s}px ${fam(f, TYPEFACE.bebas)}`;
      const size = fit(ctx, "0000", font, 0.02, f.W * 0.94, f.maxH * 0.38);
      const L = line(ctx, pad(t.H) + pad(t.M), font, size, 0.02);
      const top = f.cy - L.asc / 2;
      const tint = (c) => mix(c, p.accent, 0.14);
      ctx.fillStyle = vgrad(ctx, top, top + L.asc, [
        [0, tint("#fbfbfb")], [0.38, tint("#aab2bb")], [0.49, tint("#3a4048")], [0.52, tint("#e4e8ec")], [0.78, tint("#848c95")], [1, tint("#f1f3f5")],
      ]);
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.55)"; ctx.shadowBlur = size * 0.1; ctx.shadowOffsetY = size * 0.03;
      drawLine(ctx, L, f.cx, top);
      ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = Math.max(1, size * 0.005);
      drawLine(ctx, L, f.cx, top, { stroke: true });
      dateAbove(ctx, f, t.d, p, top, size * 0.06);
    },
  },

  extrude: {
    name: "3D",
    draw(ctx, f, t, p) {
      const font = (s) => `400 ${s}px ${fam(f, TYPEFACE.anton)}`;
      const size = fit(ctx, "0000", font, 0.01, f.W * 0.86, f.maxH * 0.36);
      const L = line(ctx, pad(t.H) + pad(t.M), font, size, 0.01);
      const top = f.cy - L.asc / 2 - size * 0.03;
      const depth = size * 0.09, step = Math.max(1, size / 320);
      const n = Math.ceil(depth / step);
      const side = mix(second(p), "#000000", 0.3);
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = size * 0.08; ctx.shadowOffsetX = depth * 0.6; ctx.shadowOffsetY = depth * 0.6;
      ctx.fillStyle = mix(side, "#000000", 0.5);
      ctx.save(); ctx.translate(n * step * 0.7, n * step); drawLine(ctx, L, f.cx, top); ctx.restore();
      ctx.restore();
      for (let k = n; k >= 1; k--) {
        ctx.fillStyle = mix(side, "#000000", (k / n) * 0.45);
        ctx.save(); ctx.translate(k * step * 0.7, k * step); drawLine(ctx, L, f.cx, top); ctx.restore();
      }
      ctx.fillStyle = vgrad(ctx, top, top + L.asc, [[0, mix(p.ink, "#ffffff", 0.3)], [1, p.ink]]);
      drawLine(ctx, L, f.cx, top);
      dateAbove(ctx, f, t.d, p, top, size * 0.06);
    },
  },

  knockout: {
    name: "Cut-out",
    covers: true,
    draw(ctx, f, t, p) {
      const panel = p.light ? "#f3efe8" : mix(p.bg[0], "#000000", 0.6);
      ctx.fillStyle = panel;
      ctx.fillRect(0, 0, f.w, f.h);
      const font = (s) => `400 ${s}px ${fam(f, TYPEFACE.anton)}`;
      const size = fit(ctx, "00", font, -0.01, f.W * 0.94, f.maxH * 0.62);
      const A = line(ctx, pad(t.H), font, size, -0.01), B = line(ctx, pad(t.M), font, size, -0.01);
      const gap = size * 0.03, total = A.asc * 2 + gap, top = f.cy - total / 2;
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      drawLine(ctx, A, f.cx, top);
      drawLine(ctx, B, f.cx, top + A.asc + gap);
      ctx.restore();
      ctx.strokeStyle = hexA(second(p), 0.7);
      ctx.lineWidth = Math.max(1, size * 0.004);
      drawLine(ctx, A, f.cx, top, { stroke: true });
      drawLine(ctx, B, f.cx, top + A.asc + gap, { stroke: true });
      const str = D(f, DATE.caps, t.d);
      if (str) {
        ctx.fillStyle = second(p);
        tracked(ctx, str, f.cx, top - size * 0.045, size * 0.05, `600 ${size * 0.05}px ${TYPEFACE.grot}`, 0.16);
      }
    },
  },
};

/* ───────────────────────── scene helpers ───────────────────────── */

function sky(ctx, w, h, p, horizon, stops) {
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  (stops || [[0, p.bg[0]], [0.6, p.bg[1]], [1, p.bg[2]]]).forEach(([o, c]) => g.addColorStop(o, c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}
function stars(ctx, w, h, r, n, maxY, color = "#ffffff") {
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const big = r() ** 7;
    ctx.globalAlpha = r.range(0.15, 0.9) * (1 - big * 0.3);
    ctx.beginPath();
    ctx.arc(r() * w, r() ** 1.4 * maxY, w * (0.0006 + big * 0.0028), 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function ridge(ctx, w, h, base, amp, noise, k, seed, color, jag = 0) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, h);
  const n = 140;
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * w;
    let y = base - (noise(i / n * k + seed, seed * 1.7, 4) * 0.5 + 0.5) * amp;
    if (jag) y -= Math.abs(noise(i / n * k * 5 + seed, seed, 2)) * amp * jag;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}
function pine(ctx, x, baseY, height, width, r) {
  const tiers = Math.max(6, Math.round(height / (width * 0.22)));
  const left = [], right = [];
  for (let k = 1; k <= tiers; k++) {
    const y = baseY - height + (k / tiers) * height * 0.93;
    const s = (width / 2) * Math.pow(k / tiers, 0.85) * (1 + r.range(-0.18, 0.18));
    left.push([x - s, y], [x - s * 0.42, y - height * 0.018]);
    right.push([x + s * r.range(0.85, 1.1), y], [x + s * 0.42, y - height * 0.018]);
  }
  ctx.beginPath();
  ctx.moveTo(x, baseY - height);
  left.forEach(([a, b]) => ctx.lineTo(a, b));
  ctx.lineTo(x - width * 0.035, baseY);
  ctx.lineTo(x + width * 0.035, baseY);
  right.reverse().forEach(([a, b]) => ctx.lineTo(a, b));
  ctx.closePath();
  ctx.fill();
}
function warmWindow(p) { return mix("#ffd27a", p.accent, 0.25); }
function windows(ctx, x, y, bw, bh, r, lit, color, pitch) {
  const cols = Math.max(1, Math.floor(bw / pitch)), rows = Math.max(1, Math.floor(bh / (pitch * 1.4)));
  const ww = pitch * 0.45, wh = pitch * 0.65;
  const ox = x + (bw - cols * pitch) / 2 + (pitch - ww) / 2;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    if (r() > lit) continue;
    ctx.fillStyle = hexA(color, r.range(0.45, 1));
    ctx.fillRect(ox + i * pitch, y + pitch * 0.5 + j * pitch * 1.4, ww, wh);
  }
}
function fog(ctx, w, y, hgt, color, a) {
  const g = ctx.createLinearGradient(0, y - hgt, 0, y + hgt);
  g.addColorStop(0, hexA(color, 0));
  g.addColorStop(0.5, hexA(color, a));
  g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, y - hgt, w, hgt * 2);
}
function mirrorInto(ctx, src, w, h, line, alpha) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, line, w, h - line);
  ctx.clip();
  ctx.globalAlpha = alpha;
  ctx.translate(0, line * 2);
  ctx.scale(1, -1);
  ctx.drawImage(src, 0, 0, w, h);
  ctx.restore();
}

/* ───────────────────────── scenes ───────────────────────── */
// back(ctx, w, h, p, r, noise, f) and front(ctx, w, h, p, r, noise, f, backCanvas). `water` gives a waterline
// below which the time is mirrored.

export const SCENES = {
  skyline: {
    night: true,
    name: "Skyline",
    back(ctx, w, h, p, r, noise, f) {
      sky(ctx, w, h, p, h * 0.92);
      blob(ctx, w * r.range(0.3, 0.7), h * 0.82, w * 1.05, p.bg[3], 0.55);
      if (!p.light) stars(ctx, w, h, r, 260, h * 0.45);
      // a far, hazy city
      let x = -w * 0.05;
      const far = mix(p.bg[1], p.bg[2], 0.45);
      while (x < w) {
        const bw = w * r.range(0.035, 0.09), bh = h * r.range(0.06, 0.2);
        ctx.fillStyle = far;
        ctx.fillRect(x, h * 0.93 - bh, bw, bh + h * 0.1);
        windows(ctx, x, h * 0.93 - bh, bw, bh, r, 0.18, warmWindow(p), w * 0.012);
        x += bw + w * r.range(0, 0.012);
      }
      fog(ctx, w, h * 0.86, h * 0.08, p.bg[2], 0.55);
    },
    front(ctx, w, h, p, r, noise, f) {
      const dark = mix(p.bg[0], "#000000", 0.45), mid = mix(p.bg[0], p.bg[1], 0.35);
      const win = warmWindow(p);
      // the hero tower rises through the time
      const cx = f.cx + w * r.range(-0.03, 0.03);
      const tiers = [
        [0.15, f.cy + h * 0.16], [0.115, f.cy + h * 0.05], [0.082, f.cy - h * 0.035], [0.052, f.cy - h * 0.09], [0.028, f.cy - h * 0.125],
      ];
      // mid-rise blocks either side
      let x = -w * 0.02;
      while (x < w) {
        const bw = w * r.range(0.07, 0.16);
        const bh = f.cy + h * r.range(0.14, 0.3);
        ctx.fillStyle = mid;
        ctx.fillRect(x, bh, bw, h - bh);
        ctx.fillStyle = hexA(p.bg[2], 0.12);
        ctx.fillRect(x, bh, bw * 0.4, h - bh);
        windows(ctx, x, bh, bw, h - bh, r, 0.35, win, w * 0.016);
        x += bw + w * r.range(0.005, 0.02);
      }
      ctx.fillStyle = hexA(p.bg[3], 0.9);
      ctx.fillRect(cx - w * 0.0025, f.cy - h * 0.2, w * 0.005, h * 0.08);
      tiers.forEach(([tw, ty], i) => {
        const bw = w * tw;
        const g = ctx.createLinearGradient(cx - bw / 2, 0, cx + bw / 2, 0);
        g.addColorStop(0, mix(dark, p.bg[2], 0.32));
        g.addColorStop(0.5, mix(dark, p.bg[2], 0.18));
        g.addColorStop(0.5, dark);
        g.addColorStop(1, mix(dark, "#000000", 0.3));
        ctx.fillStyle = g;
        ctx.fillRect(cx - bw / 2, ty, bw, h - ty);
        windows(ctx, cx - bw / 2, ty, bw, (tiers[i - 1]?.[1] ?? h) - ty + (i ? 0 : 0), r, 0.55, win, w * 0.014);
      });
      ctx.fillStyle = "#ff4d4d";
      blob(ctx, cx, f.cy - h * 0.2, w * 0.02, "#ff4d4d", 0.9);
      // near towers at the edges
      for (const side of [-1, 1]) {
        const bw = w * r.range(0.18, 0.26), top = f.cy + h * r.range(0.02, 0.12);
        const bx = side < 0 ? -w * 0.02 : w - bw + w * 0.02;
        ctx.fillStyle = mix(dark, "#000000", 0.2);
        ctx.fillRect(bx, top, bw, h - top);
        windows(ctx, bx, top, bw, h - top, r, 0.3, win, w * 0.02);
      }
      const g = ctx.createLinearGradient(0, h * 0.82, 0, h);
      g.addColorStop(0, hexA(p.bg[0], 0));
      g.addColorStop(1, hexA(mix(p.bg[0], "#000000", 0.5), 0.9));
      ctx.fillStyle = g;
      ctx.fillRect(0, h * 0.82, w, h * 0.18);
    },
  },

  homestead: {
    night: true,
    name: "Homestead",
    back(ctx, w, h, p, r, noise, f) {
      const hz = f.cy + h * 0.09;
      sky(ctx, w, h, p, hz, [[0, mix(p.bg[0], "#000000", 0.35)], [0.65, p.bg[0]], [1, p.bg[1]]]);
      if (!p.light) {
        stars(ctx, w, h, r, 700, hz);
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        for (let i = 0; i < 14; i++) blob(ctx, w * (0.1 + i * 0.065) + r.range(-0.05, 0.05) * w, h * (0.08 + i * 0.022), w * r.range(0.12, 0.25), p.bg[2], 0.1);
        ctx.restore();
      }
      ridge(ctx, w, h, hz - h * 0.02, h * 0.14, noise, 2.2, 3, mix(p.bg[1], p.bg[2], 0.35), 0.25);
      ridge(ctx, w, h, hz, h * 0.07, noise, 3.5, 9, mix(p.bg[0], p.bg[1], 0.55), 0.15);
      fog(ctx, w, hz, h * 0.03, p.bg[2], 0.4);
    },
    front(ctx, w, h, p, r, noise, f) {
      const hz = f.cy + h * 0.09;
      const field = mix(p.bg[0], "#000000", 0.25);
      ctx.fillStyle = vgrad(ctx, hz, h, [[0, mix(field, p.bg[1], 0.25)], [1, mix(field, "#000000", 0.4)]]);
      ctx.fillRect(0, hz, w, h - hz);
      // house on the horizon
      const hx = f.cx + w * r.range(-0.1, 0.1), hw = w * 0.24, wall = w * 0.1, roof = w * 0.075;
      const base = hz + h * 0.012;
      ctx.fillStyle = mix(field, "#000000", 0.35);
      ctx.beginPath();
      ctx.moveTo(hx - hw / 2 - w * 0.012, base - wall);
      ctx.lineTo(hx - hw * 0.18, base - wall - roof);
      ctx.lineTo(hx + hw * 0.18, base - wall - roof);
      ctx.lineTo(hx + hw / 2 + w * 0.012, base - wall);
      ctx.lineTo(hx + hw / 2, base - wall);
      ctx.lineTo(hx + hw / 2, base);
      ctx.lineTo(hx - hw / 2, base);
      ctx.lineTo(hx - hw / 2, base - wall);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(hx + hw * 0.24, base - wall - roof * 1.05, w * 0.022, roof * 0.6);
      const win = warmWindow(p);
      blob(ctx, hx, base + h * 0.01, w * 0.32, win, 0.22);
      ctx.save();
      ctx.shadowColor = win; ctx.shadowBlur = w * 0.03;
      ctx.fillStyle = win;
      for (const wx of [-0.34, -0.12, 0.2, 0.36]) {
        if (wx === 0.2) { ctx.fillRect(hx + hw * 0.08, base - wall * 0.62, hw * 0.1, wall * 0.62); continue; }
        ctx.fillRect(hx + hw * wx - hw * 0.05, base - wall * 0.7, hw * 0.1, wall * 0.36);
      }
      ctx.fillRect(hx - hw * 0.04, base - wall - roof * 0.5, hw * 0.08, roof * 0.25);
      ctx.restore();
      // grass
      ctx.lineCap = "round";
      for (let i = 0; i < 2600; i++) {
        const y = hz + (r() ** 1.6) * (h - hz);
        const depth = (y - hz) / (h - hz);
        const x = r() * w;
        const len = h * (0.004 + depth * 0.03) * r.range(0.6, 1.3);
        ctx.strokeStyle = hexA(mix(p.bg[1], p.bg[2], 0.4), r.range(0.15, 0.45) * (1 - depth * 0.5));
        ctx.lineWidth = w * (0.0008 + depth * 0.0025);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + len * 0.15, y - len * 0.6, x + len * r.range(-0.4, 0.4), y - len);
        ctx.stroke();
      }
    },
  },

  pines: {
    night: true,
    name: "Pines",
    back(ctx, w, h, p, r, noise, f) {
      const hz = f.cy + h * 0.2;
      sky(ctx, w, h, p, hz, [[0, p.bg[1]], [0.7, mix(p.bg[2], p.bg[3], 0.3)], [1, p.bg[3]]]);
      const sunY = f.cy - h * r.range(0.02, 0.1);
      blob(ctx, f.cx, sunY, w * 0.7, p.bg[3], 0.5);
      ctx.fillStyle = hexA(mix(p.bg[3], "#ffffff", 0.35), 0.85);
      ctx.beginPath(); ctx.arc(f.cx + w * r.range(-0.15, 0.15), sunY, w * 0.17, 0, TAU); ctx.fill();
      // birds
      ctx.strokeStyle = hexA(p.bg[0], 0.6);
      ctx.lineWidth = w * 0.003;
      ctx.lineCap = "round";
      for (let i = 0; i < 7; i++) {
        const bx = w * r.range(0.15, 0.85), by = h * r.range(0.12, 0.3), s = w * r.range(0.008, 0.018);
        ctx.beginPath(); ctx.moveTo(bx - s, by - s * 0.4); ctx.quadraticCurveTo(bx - s * 0.4, by - s * 0.5, bx, by); ctx.quadraticCurveTo(bx + s * 0.4, by - s * 0.5, bx + s, by - s * 0.4); ctx.stroke();
      }
      const layers = 3;
      for (let l = 0; l < layers; l++) {
        const t = l / layers;
        const base = f.cy + h * (0.02 + l * 0.05);
        ctx.fillStyle = mix(mix(p.bg[2], p.bg[3], 0.3), p.bg[1], 0.25 + t * 0.4);
        ctx.fillRect(0, base, w, h - base);
        for (let x = -w * 0.02; x < w * 1.02; x += w * r.range(0.025, 0.05)) {
          const hh = h * (0.04 + 0.05 * (noise(x / w * 3 + l * 10, l, 2) * 0.5 + 0.5)) * (1 + t * 0.6);
          pine(ctx, x, base + h * 0.01, hh, hh * 0.42, r);
        }
        fog(ctx, w, base + h * 0.015, h * 0.04, p.bg[3], 0.55);
      }
    },
    front(ctx, w, h, p, r, noise, f) {
      const dark = mix(p.bg[0], "#000000", 0.3);
      const base = f.cy + h * 0.18;
      ctx.fillStyle = mix(p.bg[0], p.bg[1], 0.25);
      for (let x = -w * 0.03; x < w * 1.03; x += w * r.range(0.04, 0.07)) {
        const hh = h * r.range(0.1, 0.2);
        pine(ctx, x, base + h * 0.02, hh, hh * 0.4, r);
      }
      ctx.fillRect(0, base, w, h - base);
      fog(ctx, w, base, h * 0.03, p.bg[2], 0.3);
      ctx.fillStyle = dark;
      for (const [x, hh] of [[w * r.range(0, 0.04), h * 0.95], [w * r.range(0.96, 1), h * 0.88], [w * r.range(0.13, 0.2), h * 0.42], [w * r.range(0.8, 0.88), h * 0.36]]) {
        pine(ctx, x, h * 1.01, hh, hh * 0.12, r);
      }
      ctx.fillRect(0, h * 0.93, w, h * 0.07);
    },
  },

  sea: {
    night: true,
    name: "Moonlit sea",
    water: (w, h, f) => f.cy + h * 0.14,
    back(ctx, w, h, p, r, noise, f) {
      const hz = f.cy + h * 0.14;
      sky(ctx, w, h, p, hz, [[0, p.bg[0]], [0.55, p.bg[1]], [0.92, p.bg[2]], [1, mix(p.bg[2], p.bg[3], 0.5)]]);
      if (!p.light) stars(ctx, w, h, r, 300, hz * 0.7);
      for (let i = 0; i < 8; i++) {
        ctx.save();
        ctx.translate(w * r(), hz * r.range(0.35, 0.9));
        ctx.scale(1, 0.18);
        blob(ctx, 0, 0, w * r.range(0.25, 0.5), r.pick([p.bg[1], p.bg[2]]), 0.35);
        ctx.restore();
      }
      const mx = w * rng("moon:" + f.seed).range(0.3, 0.7), my = hz - h * r.range(0.04, 0.09);
      blob(ctx, mx, my, w * 0.3, p.bg[3], 0.45);
      ctx.fillStyle = mix(p.bg[3], "#ffffff", 0.5);
      ctx.beginPath(); ctx.arc(mx, my, w * 0.055, 0, TAU); ctx.fill();
    },
    front(ctx, w, h, p, r, noise, f, back) {
      const hz = f.cy + h * 0.14;
      ctx.fillStyle = mix(p.bg[0], p.bg[1], 0.4);
      ctx.fillRect(0, hz, w, h - hz);
      mirrorInto(ctx, back, w, h, hz, 0.75);
      ctx.fillStyle = vgrad(ctx, hz, h, [[0, hexA(p.bg[1], 0.15)], [1, hexA(mix(p.bg[0], "#000000", 0.4), 0.85)]]);
      ctx.fillRect(0, hz, w, h - hz);
      // glitter under the moon and ripples across the water
      const mx = w * rng("moon:" + f.seed).range(0.3, 0.7);
      for (let i = 0; i < 900; i++) {
        const y = hz + (r() ** 1.5) * (h - hz);
        const depth = (y - hz) / (h - hz);
        const spread = w * (0.02 + depth * 0.35);
        const nearMoon = r() < 0.5;
        const x = nearMoon ? mx + (r() - 0.5) * spread : r() * w;
        const len = w * (0.01 + depth * 0.06) * r.range(0.4, 1.2);
        ctx.fillStyle = nearMoon ? hexA(mix(p.bg[3], "#ffffff", 0.5), r.range(0.2, 0.7) * (1 - depth * 0.6)) : hexA(p.bg[2], r.range(0.05, 0.18));
        ctx.fillRect(x - len / 2, y, len, Math.max(1, h * 0.0012 * (1 + depth * 2)));
      }
      ctx.fillStyle = hexA(mix(p.bg[3], "#ffffff", 0.4), 0.6);
      ctx.fillRect(0, hz - 1, w, Math.max(1.5, h * 0.0009));
      if (r.chance(0.75)) {
        // a small boat on the horizon
        const bx = mx + w * r.pick([-0.22, 0.2]), s = w * 0.05;
        ctx.fillStyle = mix(p.bg[0], "#000000", 0.6);
        ctx.beginPath();
        ctx.moveTo(bx - s, hz - s * 0.1); ctx.lineTo(bx + s, hz - s * 0.1); ctx.lineTo(bx + s * 0.75, hz + s * 0.12); ctx.lineTo(bx - s * 0.75, hz + s * 0.12); ctx.closePath(); ctx.fill();
        ctx.fillRect(bx - s * 0.08, hz - s * 0.62, s * 0.16, s * 0.52);
        ctx.beginPath(); ctx.arc(bx, hz - s * 0.7, s * 0.11, 0, TAU); ctx.fill();
        ctx.fillRect(bx + s * 0.3, hz - s * 1.2, s * 0.025, s * 1.1);
      }
    },
  },

  star: {
    night: true,
    name: "Star",
    back(ctx, w, h, p, r, noise, f) {
      ctx.fillStyle = mix(p.bg[0], "#000000", 0.75);
      ctx.fillRect(0, 0, w, h);
      stars(ctx, w, h, r, 500, h);
      const cx = w * r.range(0.6, 0.95), cy = f.cy + h * r.range(0.04, 0.16), R = w * r.range(0.6, 0.8);
      blob(ctx, cx, cy, R * 1.9, mix(p.bg[2], "#ff3a00", 0.5), 0.5);
      blob(ctx, cx, cy, R * 1.35, mix(p.bg[3], "#ff8a00", 0.5), 0.6);
      // granulated surface at a third of the size, then scaled up
      const k = Math.max(1.5, (R * 2) / 700);
      const sw = Math.ceil((R * 2) / k), sh = sw;
      const off = makeCanvas(sw, sh);
      const o = off.getContext("2d");
      const img = o.createImageData(sw, sh);
      const ramp = ["#0a0200", mix(p.bg[2], "#8a1400", 0.6), mix(p.bg[3], "#ff5a00", 0.55), mix(p.bg[3], "#ffb347", 0.5), "#fff1d0"].map((c) => {
        const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      });
      for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++) {
        const dx = (i + 0.5) / sw * 2 - 1, dy = (j + 0.5) / sh * 2 - 1;
        const d2 = dx * dx + dy * dy;
        if (d2 > 1) continue;
        const mu = Math.sqrt(1 - d2);
        const n1 = noise(dx * 2.6 + 7, dy * 2.6, 4), n2 = Math.abs(noise(dx * 11 - 3, dy * 11 + 1, 4)), n3 = noise(dx * 40, dy * 40, 2);
        let v = clamp(0.52 + n1 * 0.45 - n2 * 0.55 + n3 * 0.04, 0, 1);
        v = v * (0.35 + 0.65 * Math.pow(mu, 0.55));
        const fpos = v * (ramp.length - 1), a = Math.floor(fpos), t = fpos - a;
        const c0 = ramp[a], c1 = ramp[Math.min(a + 1, ramp.length - 1)];
        const idx = (j * sw + i) * 4;
        img.data[idx] = c0[0] + (c1[0] - c0[0]) * t;
        img.data[idx + 1] = c0[1] + (c1[1] - c0[1]) * t;
        img.data[idx + 2] = c0[2] + (c1[2] - c0[2]) * t;
        img.data[idx + 3] = 255 * clamp((1 - d2) * 40, 0, 1);
      }
      o.putImageData(img, 0, 0);
      ctx.save();
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(off, cx - R, cy - R, R * 2, R * 2);
      ctx.restore();
      const rim = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.08);
      rim.addColorStop(0, hexA(p.bg[3], 0));
      rim.addColorStop(0.75, hexA(mix(p.bg[3], "#ffc06a", 0.6), 0.55));
      rim.addColorStop(1, hexA(p.bg[3], 0));
      ctx.fillStyle = rim;
      ctx.fillRect(cx - R * 1.2, cy - R * 1.2, R * 2.4, R * 2.4);
    },
  },

  bloom: {
    name: "Bloom",
    // the flowers grow in from the right, so the time moves over to make room
    frame: (f) => (f.portrait ? { ...f, cx: f.w * 0.4, W: f.w * 0.66 } : f),
    back(ctx, w, h, p, r) {
      const base = p.light ? p.bg[1] : mix(p.bg[2], p.bg[3], 0.35);
      ctx.fillStyle = vgrad(ctx, 0, h, [[0, mix(base, "#ffffff", 0.08)], [1, mix(base, "#000000", 0.18)]]);
      ctx.fillRect(0, 0, w, h);
      blob(ctx, w * 0.2, h * 0.25, w * 0.9, mix(base, "#ffffff", 0.3), 0.35);
    },
    front(ctx, w, h, p, r, noise, f) {
      const base = p.light ? p.bg[1] : mix(p.bg[2], p.bg[3], 0.35);
      let petal = p.accent;
      if (Math.abs(luminance(petal) - luminance(base)) < 0.12) petal = luminance(base) > 0.4 ? mix(p.bg[0], p.accent, 0.4) : mix(p.bg[3], "#ffffff", 0.4);
      const flowers = [
        [w * r.range(1.0, 1.08), f.cy - h * 0.2, w * r.range(0.27, 0.33)],
        [w * r.range(0.93, 1.0), f.cy + h * 0.05, w * r.range(0.28, 0.34)],
        [w * r.range(0.98, 1.08), f.cy + h * 0.29, w * r.range(0.27, 0.33)],
      ];
      if (r.chance(0.6)) flowers.push([w * r.range(-0.08, 0.04), h * r.range(0.84, 0.95), w * r.range(0.26, 0.32)]);
      for (const [fx, fy, R] of flowers) {
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.28)"; ctx.shadowBlur = R * 0.12; ctx.shadowOffsetX = -R * 0.03; ctx.shadowOffsetY = R * 0.04;
        const n = r.int(18, 24);
        const rot = r() * TAU;
        for (const layer of [0, 1]) for (let i = 0; i < n; i++) {
          const a = rot + (i + layer * 0.5) / n * TAU + r.range(-0.04, 0.04);
          const len = R * (layer ? 0.88 : 1) * r.range(0.9, 1.05);
          ctx.save();
          ctx.translate(fx, fy);
          ctx.rotate(a);
          const g = ctx.createLinearGradient(0, 0, len, 0);
          g.addColorStop(0, mix(petal, "#7a3a00", 0.35));
          g.addColorStop(0.35, petal);
          g.addColorStop(1, mix(petal, "#ffffff", layer ? 0.25 : 0.12));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(len * 0.52, 0, len * 0.5, R * 0.085 * r.range(0.85, 1.15), 0, 0, TAU);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
        const cR = R * 0.2;
        const cg = ctx.createRadialGradient(fx - cR * 0.3, fy - cR * 0.3, cR * 0.1, fx, fy, cR);
        cg.addColorStop(0, "#5a3b12"); cg.addColorStop(1, "#1d1206");
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(fx, fy, cR, 0, TAU); ctx.fill();
        ctx.fillStyle = "rgba(255,200,90,0.55)";
        for (let k = 0; k < 140; k++) {
          const rr = cR * 0.92 * Math.sqrt(k / 140), a = k * 2.39996;
          ctx.beginPath(); ctx.arc(fx + Math.cos(a) * rr, fy + Math.sin(a) * rr, cR * 0.035, 0, TAU); ctx.fill();
        }
      }
    },
  },

  retro: {
    night: true,
    name: "Sunset",
    back(ctx, w, h, p, r, noise, f) {
      const hz = f.cy + h * 0.11;
      sky(ctx, w, h, p, hz, [[0, p.bg[0]], [0.55, p.bg[1]], [1, p.bg[2]]]);
      if (!p.light) stars(ctx, w, h, r, 220, hz * 0.6);
      const R = w * 0.36, sx = f.cx, sy = hz - R * 0.35;
      blob(ctx, sx, sy, R * 2.2, p.bg[3], 0.5);
      const sun = makeCanvas(Math.ceil(R * 2), Math.ceil(R * 2));
      const s = sun.getContext("2d");
      s.fillStyle = vgrad(s, 0, R * 2, [[0, mix(p.bg[3], "#ffffff", 0.35)], [0.5, p.bg[3]], [1, p.accent]]);
      s.beginPath(); s.arc(R, R, R, 0, TAU); s.fill();
      s.globalCompositeOperation = "destination-out";
      for (let k = 0, y = R * 1.0; y < R * 2; k++) { const gh = R * (0.015 + k * 0.012); s.fillRect(0, y, R * 2, gh); y += gh + R * 0.09; }
      ctx.drawImage(sun, sx - R, sy - R);
    },
    front(ctx, w, h, p, r, noise, f) {
      const hz = f.cy + h * 0.11;
      const dark = mix(p.bg[0], "#000000", 0.3);
      // low-poly mountains either side
      for (const side of [-1, 1]) {
        ctx.fillStyle = dark;
        ctx.beginPath();
        const x0 = side < 0 ? -w * 0.05 : w * 1.05, x1 = side < 0 ? w * 0.42 : w * 0.58;
        ctx.moveTo(x0, hz);
        const steps = 6;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const x = x0 + (x1 - x0) * t;
          const y = hz - h * (i % 2 ? r.range(0.05, 0.11) : r.range(0.015, 0.05)) * (1 - t * 0.7);
          ctx.lineTo(x, i === steps ? hz : y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = hexA(p.accent, 0.55);
        ctx.lineWidth = w * 0.002;
        ctx.stroke();
      }
      ctx.fillStyle = vgrad(ctx, hz, h, [[0, mix(p.bg[0], p.bg[1], 0.3)], [1, mix(p.bg[0], "#000000", 0.5)]]);
      ctx.fillRect(0, hz, w, h - hz);
      ctx.strokeStyle = hexA(mix(p.accent, "#ffffff", 0.2), 0.75);
      ctx.lineWidth = Math.max(1, w * 0.0025);
      ctx.beginPath();
      for (let k = 1; k < 18; k++) { const y = hz + (h - hz) * Math.pow(k / 18, 2.2); ctx.moveTo(0, y); ctx.lineTo(w, y); }
      for (let k = -14; k <= 14; k++) { ctx.moveTo(f.cx + k * w * 0.012, hz); ctx.lineTo(f.cx + k * w * 0.16, h); }
      ctx.stroke();
      fog(ctx, w, hz, h * 0.015, p.bg[3], 0.7);
    },
  },

  borealis: {
    night: true,
    name: "Borealis",
    water: (w, h, f) => f.cy + h * 0.16,
    back(ctx, w, h, p, r, noise, f) {
      BACKGROUNDS.aurora.draw(ctx, w, h, { ...p, light: false }, r, noise);
    },
    front(ctx, w, h, p, r, noise, f, back) {
      const hz = f.cy + h * 0.16;
      ctx.fillStyle = mix(p.bg[0], "#000000", 0.4);
      ctx.fillRect(0, hz, w, h - hz);
      mirrorInto(ctx, back, w, h, hz, 0.55);
      const peaks = [];
      for (let i = 0; i <= 9; i++) peaks.push([(i / 9) * w * 1.1 - w * 0.05, hz - h * (i % 2 ? r.range(0.06, 0.13) : r.range(0.01, 0.05))]);
      const draw = (flip) => {
        ctx.beginPath();
        ctx.moveTo(-w * 0.05, hz);
        peaks.forEach(([x, y]) => ctx.lineTo(x, flip ? hz * 2 - y : y));
        ctx.lineTo(w * 1.05, hz);
        ctx.closePath();
        ctx.fill();
      };
      ctx.fillStyle = mix(p.bg[0], "#000000", 0.55);
      draw(false);
      ctx.fillStyle = hexA(mix(p.bg[0], "#000000", 0.55), 0.7);
      draw(true);
      ctx.fillStyle = vgrad(ctx, hz, h, [[0, hexA("#000000", 0)], [1, hexA("#000000", 0.6)]]);
      ctx.fillRect(0, hz, w, h - hz);
      ctx.fillStyle = hexA(p.bg[3], 0.35);
      ctx.fillRect(0, hz, w, Math.max(1, h * 0.001));
    },
  },
};

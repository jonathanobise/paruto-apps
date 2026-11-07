// "Describe it": turns a few words ("pink neon city at night") into a design. This is keyword matching on the
// device, not an AI model: scene, clock style, colour and mood words are looked up and the rest is chosen at random.

import { SCENE_STYLES, TYPE_STYLES, randomSeed } from "./render.js";

const SCENE_WORDS = {
  skyline: ["city", "urban", "skyline", "downtown", "skyscraper", "tower", "street", "lagos", "new york", "tokyo", "london", "building"],
  homestead: ["house", "home", "farm", "cabin", "field", "village", "cottage", "countryside", "cozy", "cosy"],
  pines: ["forest", "pine", "tree", "trees", "woods", "mountain", "misty", "mist", "hike", "wild", "nature"],
  sea: ["sea", "ocean", "beach", "lake", "water", "moon", "boat", "coast", "wave", "calm"],
  star: ["sun", "space", "star", "planet", "solar", "fire", "cosmic", "galaxy", "burn", "hot"],
  bloom: ["flower", "flowers", "floral", "bloom", "garden", "spring", "daisy", "petal"],
  retro: ["retro", "80s", "synthwave", "vaporwave", "grid", "arcade", "outrun", "sunset"],
  borealis: ["aurora", "northern", "lights", "arctic", "snow", "winter", "polar"],
};
const TYPE_WORDS = {
  neon: ["neon", "glow", "glowing", "club", "vegas", "electric"],
  thin: ["thin", "elegant", "seconds", "hairline", "fine"],
  fade: ["minimal", "minimalist", "fade", "soft", "subtle"],
  tower: ["bold", "big", "huge", "strong", "loud", "stack"],
  split: ["split", "two tone", "two-tone", "sporty"],
  torn: ["paper", "torn", "collage", "poster", "rip"],
  mirror: ["reflection", "mirror", "reflect", "serene", "still"],
  script: ["handwritten", "signature", "script", "romantic", "love", "wedding"],
  sketch: ["sketch", "pencil", "drawing", "doodle", "notebook"],
  glass: ["glass", "frosted", "ice", "crystal", "clear"],
  chrome: ["chrome", "metal", "metallic", "silver", "steel"],
  extrude: ["3d", "extrude", "depth", "block"],
  dots: ["dots", "pixel", "digital", "led", "matrix"],
  knockout: ["cutout", "cut-out", "stencil", "knockout", "window"],
  column: ["column", "vertical", "side"],
  outline: ["outline", "line", "lines", "tilted", "speed", "car"],
};
const COLOURS = {
  red: 25, crimson: 20, ruby: 15, orange: 55, amber: 70, gold: 85, golden: 85, yellow: 100, lime: 125, green: 145, emerald: 155,
  mint: 165, teal: 190, turquoise: 195, cyan: 205, aqua: 205, blue: 255, navy: 265, cobalt: 260, indigo: 280, purple: 305, violet: 300,
  lavender: 300, magenta: 335, pink: 350, rose: 5, coral: 35, peach: 50, brown: 60, sand: 80,
};
const MOODS = {
  dark: "", night: "", midnight: "", noir: "m", black: "m", mono: "m", monochrome: "m", grey: "m", gray: "m",
  light: "l", pastel: "l", bright: "l", white: "lm", day: "l", morning: "l",
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const has = (text, word) => new RegExp(`(^|[^a-z0-9])${word.replace(/[-]/g, "\\-")}([^a-z0-9]|$)`).test(text);

/** Returns { spec, matched: [labels] } for the words given, keeping pos and editor settings from `prev`. */
export function describe(words, prev = {}) {
  const text = ` ${words.toLowerCase()} `;
  const matched = [];
  const score = (table) => {
    let best = null, n = 0;
    for (const [id, list] of Object.entries(table)) {
      const k = list.filter((w) => has(text, w)).length;
      if (k > n) { best = id; n = k; }
    }
    return best;
  };
  const scene = score(SCENE_WORDS);
  const type = score(TYPE_WORDS);
  if (scene) matched.push(SCENE_STYLES.find((s) => s.id === scene).name);
  if (type) matched.push(TYPE_STYLES.find((s) => s.id === type).name);
  let hue = null, flags = "";
  for (const [w, deg] of Object.entries(COLOURS)) if (has(text, w)) { hue = deg; matched.push(w); break; }
  for (const [w, f] of Object.entries(MOODS)) if (has(text, w)) { flags += f; if (!matched.includes(w)) matched.push(w); }
  if (hue == null && flags.includes("m")) hue = 260;
  const pal = hue != null ? `h${hue}${[...new Set(flags)].join("")}` : randomSeed();
  return {
    spec: {
      ...prev,
      clock: type || pick(TYPE_STYLES).id,
      bg: scene || pick(SCENE_STYLES).id,
      pal,
      seed: randomSeed(),
      photo: undefined,
    },
    matched,
  };
}

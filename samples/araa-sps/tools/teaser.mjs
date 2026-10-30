// A silent, caption-free montage of the three modules for the projects page:
// writes teaser.mp4 and teaser.jpg in the kit's folder (teaser-<lang>.mp4/.jpg for other languages).
//   node tools/teaser.mjs [lang]     (en by default; the shots show that language's on-screen text)
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const FPS = 25, FADE = 0.6;
const lang = process.argv[2] || 'en', suffix = lang === 'en' ? '' : `-${lang}`;
// [module, segment, from (s), length (s)]
const SHOTS = [
  ['ecowas', 'meet', 1.4, 3.4],
  ['ecowas', 'diseases', 2.6, 3.2],
  ['international', 'standards', 15.0, 2.6],
  ['international', 'hygiene', 7.5, 3.2],
  ['ecowas', 'vet', 6.0, 3.6],
  ['waemu', 'chain', 3.0, 3.2],
  ['waemu', 'trace', 3.0, 3.2],
  ['ecowas', 'borderCross', 2.2, 3.6],
  ['international', 'transportGo', 1.0, 3.4],
];
// the still: [shot, seconds into it] (the ECOWAS veterinary certificate, stamped and signed)
const POSTER = [4, 2.6];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'teaser-'));
const browser = await chromium.launch();
const pages = {};
const clips = [];
for (const [i, [mod, seg, from, len]] of SHOTS.entries()) {
  if (!pages[mod]) {
    const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await p.goto(pathToFileURL(path.join(root, 'videos', mod, 'index.html')).href + `?render&lang=${lang}&cc=0`);
    await p.waitForFunction(() => document.body.dataset.ready === '1');
    await p.evaluate(() => document.fonts.ready);
    pages[mod] = p;
  }
  const dir = path.join(tmp, String(i)); fs.mkdirSync(dir);
  const n = Math.round(len * FPS);
  for (let f = 0; f < n; f++) {
    await pages[mod].evaluate(([s, t]) => window.SPS_RENDER.seg(s, t), [seg, from + f / FPS]);
    await pages[mod].screenshot({ path: path.join(dir, `${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: 1280, height: 720 } });
  }
  const out = path.join(tmp, `${i}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, '%04d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', out]);
  clips.push({ out, len });
  console.log(`shot ${i + 1}/${SHOTS.length} ${mod} ${seg}`);
}
await browser.close();

// crossfade the shots into one loop-friendly film
const args = ['-y', '-loglevel', 'error'];
clips.forEach((c) => args.push('-i', c.out));
let graph = '', prev = '[0:v]', t = clips[0].len;
for (let i = 1; i < clips.length; i++) {
  const label = i === clips.length - 1 ? '[v]' : `[x${i}]`;
  graph += `${prev}[${i}:v]xfade=transition=fade:duration=${FADE}:offset=${(t - FADE).toFixed(2)}${label};`;
  prev = label; t += clips[i].len - FADE;
}
graph += `[v]fade=t=in:st=0:d=0.5,fade=t=out:st=${(t - 0.6).toFixed(2)}:d=0.6[out]`;
const mp4 = path.join(root, `teaser${suffix}.mp4`);
execFileSync('ffmpeg', [...args, '-filter_complex', graph, '-map', '[out]', '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', '-an', mp4]);
// the still (the projects page's card and poster): POSTER seconds into one shot, clear of its fades
const shotStart = (k) => clips.slice(0, k).reduce((a, c) => a + c.len - FADE, 0);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', (shotStart(POSTER[0]) + POSTER[1]).toFixed(2), '-i', mp4, '-frames:v', '1', '-q:v', '3', path.join(root, `teaser${suffix}.jpg`)]);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`teaser${suffix}.mp4 ${t.toFixed(1)}s, ${(fs.statSync(mp4).size / 1e6).toFixed(1)} MB`);

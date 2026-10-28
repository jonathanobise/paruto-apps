// Renders the linear (WhatsApp) cut of the sample to MP4, a poster JPEG and SRT subtitles.
//   node tools/render.mjs [lang ...]     (default: fr en pt)
// Needs Playwright's Chromium and ffmpeg. Frames are drawn by seeking the player, so the
// video matches the interactive version frame for frame.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const dir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const langs = process.argv.slice(2).length ? process.argv.slice(2) : ['fr', 'en', 'pt'];
const FPS = 25;

const srtTime = (s) => { const ms = Math.round(s * 1000); const p = (n, w = 2) => String(n).padStart(w, '0'); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };

const browser = await chromium.launch();
for (const lang of langs) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(pathToFileURL(path.join(dir, 'index.html')).href + `?render&lang=${lang}`);
  await page.waitForFunction(() => document.body.dataset.ready === '1');
  await page.evaluate(() => document.fonts.ready);
  const duration = await page.evaluate(() => window.SPS_RENDER.duration);

  const caps = await page.evaluate(() => window.SPS_RENDER.captions());
  fs.writeFileSync(path.join(dir, `moussa-${lang}.srt`), caps.map((c, i) => `${i + 1}\n${srtTime(c.a)} --> ${srtTime(c.b)}\n${c.text}\n`).join('\n'));

  const out = path.join(dir, `moussa-${lang}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const frames = Math.round(duration * FPS);
  for (let f = 0; f < frames; f++) {
    await page.evaluate((t) => window.SPS_RENDER.seek(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: 1280, height: 720 } });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f === Math.round(5.5 * FPS)) fs.writeFileSync(path.join(dir, `moussa-${lang}-poster.jpg`), buf);
    if (f % (FPS * 10) === 0) process.stdout.write(`${lang} ${(f / FPS).toFixed(0)}s/${duration}s\n`);
  }
  ff.stdin.end();
  await new Promise((r, j) => ff.on('close', (c) => (c ? j(new Error('ffmpeg ' + c)) : r())));
  if (errors.length) console.log(lang, 'page errors:', errors.slice(0, 5));
  console.log('wrote', out);
  await page.close();
}
await browser.close();

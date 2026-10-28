// Renders a module's linear (WhatsApp) cut to MP4, a poster JPEG and SRT subtitles, and lays
// the voice-over clips in vo/<lang>/ (see tools/voice.py) onto the soundtrack.
//   node tools/render.mjs <module> [--vertical] [lang ...]     (module: ecowas, international, waemu)
// --vertical makes the 9:16 phone edition (<slug>-<lang>-vertical.mp4).
// Needs Playwright's Chromium and ffmpeg. Frames are drawn by seeking the player, so the
// video matches the interactive version frame for frame.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const args = process.argv.slice(2), mod = args.shift();
const dir = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'videos', mod || '');
if (!mod || !fs.existsSync(path.join(dir, 'timeline.js'))) { console.error('usage: node tools/render.mjs <module> [--vertical] [lang ...]'); process.exit(1); }
const vertical = args.includes('--vertical');
const langs = args.filter((a) => !a.startsWith('--')).length ? args.filter((a) => !a.startsWith('--')) : ['fr', 'en', 'pt'];
const W = vertical ? 720 : 1280, H = vertical ? 1280 : 720;
const FPS = 25;

const srtTime = (s) => { const ms = Math.round(s * 1000); const p = (n, w = 2) => String(n).padStart(w, '0'); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };

const browser = await chromium.launch();
for (const lang of langs) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(pathToFileURL(path.join(dir, 'index.html')).href + `?render&lang=${lang}${vertical ? '&format=vertical' : ''}`);
  await page.waitForFunction(() => document.body.dataset.ready === '1');
  await page.evaluate(() => document.fonts.ready);
  const duration = await page.evaluate(() => window.SPS_RENDER.duration);
  const base = (await page.evaluate(() => window.SPS_TIMELINE.slug)) + `-${lang}`, name = base + (vertical ? '-vertical' : '');

  const caps = await page.evaluate(() => window.SPS_RENDER.captions());
  if (!vertical) fs.writeFileSync(path.join(dir, `${base}.srt`), caps.map((c, i) => `${i + 1}\n${srtTime(c.a)} --> ${srtTime(c.b)}\n${c.text}\n`).join('\n'));

  const voice = await page.evaluate(() => window.SPS_RENDER.voice());
  const out = path.join(dir, `${name}.mp4`), silent = path.join(dir, `.${name}-silent.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
  const frames = Math.round(duration * FPS);
  for (let f = 0; f < frames; f++) {
    await page.evaluate((t) => window.SPS_RENDER.seek(t), f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92, clip: { x: 0, y: 0, width: W, height: H } });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f === Math.round(5.5 * FPS)) fs.writeFileSync(path.join(dir, `${name}-poster.jpg`), buf);
    if (f % (FPS * 10) === 0) process.stdout.write(`${mod} ${name} ${(f / FPS).toFixed(0)}s/${duration}s\n`);
  }
  ff.stdin.end();
  await new Promise((r, j) => ff.on('close', (c) => (c ? j(new Error('ffmpeg ' + c)) : r())));

  // soundtrack: each clip delayed to its start time, mixed, padded to the video's length
  const clips = voice.map((v) => ({ ...v, file: path.join(dir, 'vo', lang, `${v.name}.mp3`) })).filter((v) => fs.existsSync(v.file));
  if (clips.length < voice.length) console.log(lang, `voice-over: ${voice.length - clips.length} clip(s) missing, run tools/voice.py`);
  const args = ['-y', '-loglevel', 'error', '-i', silent];
  clips.forEach((c) => args.push('-i', c.file));
  if (clips.length) {
    const fc = clips.map((c, i) => `[${i + 1}:a]adelay=${Math.round(c.at * 1000)}:all=1[a${i}]`).join(';')
      + `;${clips.map((_, i) => `[a${i}]`).join('')}amix=inputs=${clips.length}:normalize=0,apad,atrim=0:${duration}[mix]`;
    args.push('-filter_complex', fc, '-map', '0:v', '-map', '[mix]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '96k', '-ar', '44100', '-movflags', '+faststart', out);
  } else args.push('-c', 'copy', out);
  await new Promise((r, j) => spawn('ffmpeg', args, { stdio: 'inherit' }).on('close', (c) => (c ? j(new Error('ffmpeg mux ' + c)) : r())));
  fs.unlinkSync(silent);
  if (errors.length) console.log(lang, 'page errors:', errors.slice(0, 5));
  console.log('wrote', out);
  await page.close();
}
await browser.close();

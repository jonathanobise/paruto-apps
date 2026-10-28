// node tools/snap.mjs <outdir> <lang> <t1> <t2> ...  -> PNG stills of the linear cut
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const argv = process.argv.slice(2), vertical = argv.includes('--vertical');
const [mod, out, lang, ...times] = argv.filter((a) => a !== '--vertical');
const dir = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'videos', mod);
const W = vertical ? 720 : 1280, H = vertical ? 1280 : 720;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(pathToFileURL(path.join(dir, 'index.html')).href + `?render&lang=${lang}${vertical ? '&format=vertical' : ''}`);
await page.waitForFunction(() => document.body.dataset.ready === '1');
await page.evaluate(() => document.fonts.ready);
console.log('duration', await page.evaluate(() => window.SPS_RENDER.duration));
for (const t of times) {
  // "12.5" = seconds into the linear cut; "blocked1@5" = 5 s into a segment (including the interactive-only ones)
  if (t.includes('@')) { const [id, s] = t.split('@'); await page.evaluate(([id, s]) => window.SPS_RENDER.seg(id, s), [id, +s]); }
  else await page.evaluate((t) => window.SPS_RENDER.seek(t), +t);
  await page.screenshot({ path: path.join(out, `${mod}-${lang}${vertical ? '-v' : ''}-${t.replace('@', '-').padStart(5, '0')}.png`), clip: { x: 0, y: 0, width: W, height: H } });
}
if (errors.length) console.log('ERRORS', errors);
await browser.close();

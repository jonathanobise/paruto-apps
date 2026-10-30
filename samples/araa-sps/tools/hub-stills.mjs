// Stills for the kit page's module cards, without captions: hub/img/<module>-<lang>.jpg (1280×720).
// Each is a moment from the module's animation, chosen below. Run after changing a module's scenes.
//   node tools/hub-stills.mjs
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
// [module, segment, seconds into it]: each module's main character in their setting
const STILLS = [['international', 'meet', 8], ['ecowas', 'meet', 8], ['waemu', 'meet', 9]];
const out = path.join(root, 'hub', 'img');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
for (const [mod, seg, t] of STILLS) for (const lang of ['en', 'fr']) {
  await page.goto(pathToFileURL(path.join(root, 'videos', mod, 'index.html')).href + `?render&lang=${lang}`);
  await page.waitForFunction(() => document.body.dataset.ready === '1');
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: '#caption { display: none !important; }' });
  await page.evaluate(([s, t]) => window.SPS_RENDER.seg(s, t), [seg, t]);
  const png = path.join(out, `.${mod}-${lang}.png`), jpg = path.join(out, `${mod}-${lang}.jpg`);
  await page.screenshot({ path: png, clip: { x: 0, y: 0, width: 1280, height: 720 } });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', png, '-q:v', '3', jpg]);
  fs.unlinkSync(png);
  console.log(`hub/img/${mod}-${lang}.jpg`);
}
await browser.close();

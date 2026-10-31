// Freezes the kit as submitted to ARAA: copies the committed kit into submitted/, served at
// https://media.paruto.com/araa-sps/submitted/, the address every portfolio link in the offer uses.
// After the deadline (6 November 2026, 23:59 GMT) that copy never changes, while the live kit at
// /araa-sps/ can keep evolving. Until then, rerun this after changing the kit to refresh the copy.
//   node tools/freeze.mjs            copy the kit as last committed (commit your changes first)
//   node tools/freeze.mjs --force    refresh it even after the deadline (only to repair a broken copy)
// Writes submitted/FROZEN.json: the source commit and the time of the freeze.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = path.join(root, 'submitted');
const DEADLINE = Date.parse('2026-11-06T23:59:59Z');
if (Date.now() > DEADLINE && !process.argv.includes('--force')) {
  console.error('The deadline has passed: submitted/ is what ARAA received and must not change. (--force to repair it.)');
  process.exit(1);
}

const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' });
const commit = git('rev-parse', 'HEAD').trim();
// Published files only: no tooling, notes or raw recordings (see samples/.assetsignore), and not the copy itself.
const skip = (f) => /^(submitted|tools)\//.test(f) || /(^|\/)(rec\/|README\.md$|__pycache__\/)/.test(f) || /(^|\/)\./.test(f);
const files = git('ls-files', '-z', '--', '.').split('\0').filter((f) => f && !skip(f));

fs.rmSync(out, { recursive: true, force: true });
let rewritten = 0;
for (const f of files) {
  const dest = path.join(out, f);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const blob = execFileSync('git', ['show', `HEAD:./${f}`], { cwd: root, maxBuffer: 1 << 30 });
  if (!/\.(html|js|css|json|txt|md|srt|vtt)$/.test(f)) { fs.writeFileSync(dest, blob); continue; }
  let s = blob.toString('utf8');
  const before = s;
  // Links that leave the kit for the projects page climb one folder more from submitted/:
  // a page `depth` folders inside the kit reaches the site root with depth + 1 "../".
  if (f.endsWith('.html')) {
    const up = '../'.repeat(f.split('/').length);
    s = s.replaceAll(`href="${up}"`, `href="${up}../"`);
  }
  // Absolute links to the kit (embed codes, the guide) point at the frozen copy.
  s = s.replace(/https:\/\/media\.paruto\.com\/araa-sps\/(?!submitted\/)/g, 'https://media.paruto.com/araa-sps/submitted/');
  if (s !== before) rewritten++;
  fs.writeFileSync(dest, s);
}

fs.writeFileSync(path.join(out, 'FROZEN.json'), JSON.stringify({
  kit: 'Paruto Media, SPS awareness kit for ARAA AMI028-2026, as submitted',
  source_commit: commit,
  frozen_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
  deadline: '2026-11-06T23:59:00Z',
}, null, 2) + '\n');
console.log(`submitted/: ${files.length} files from ${commit.slice(0, 7)}, ${rewritten} with links adjusted`);

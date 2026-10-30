// Gathers what the kit page lists: every module's MP4s (16:9 and 9:16), subtitles, posters and
// durations, the audio capsules, and a zip of the editable sources. Writes hub/media.js and
// downloads/paruto-media-sps-kit-sources.zip.   node tools/kit.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const probe = (f) => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim();
const file = (dir, name) => (fs.existsSync(path.join(dir, name)) ? { name, bytes: fs.statSync(path.join(dir, name)).size } : null);

const media = { videos: {}, audio: {}, zip: null, built: new Date().toISOString().slice(0, 10) };
for (const mod of fs.readdirSync(path.join(root, 'videos'))) {
  const dir = path.join(root, 'videos', mod);
  if (!fs.existsSync(path.join(dir, 'timeline.js'))) continue;
  const slug = fs.readFileSync(path.join(dir, 'timeline.js'), 'utf8').match(/slug:\s*'([^']+)'/)[1];
  const v = { slug, files: {}, duration: null, storyThumb: null };
  for (const lang of ['fr', 'en', 'pt']) {
    const f = { mp4: file(dir, `${slug}-${lang}.mp4`), vertical: file(dir, `${slug}-${lang}-vertical.mp4`), srt: file(dir, `${slug}-${lang}.srt`), poster: file(dir, `${slug}-${lang}-poster.jpg`) };
    if (f.mp4 && !v.duration) v.duration = Math.round(probe(path.join(dir, f.mp4.name)) * 10) / 10;
    v.files[lang] = f;
  }
  // the storyboard card's still, per language (the frames carry translated labels)
  v.storyThumb = {};
  for (const [lang, name] of [['en', 'meet-2.jpg'], ['fr', 'meet-2-fr.jpg']]) if (fs.existsSync(path.join(root, 'storyboards', mod, 'img', name))) v.storyThumb[lang] = `storyboards/${mod}/img/${name}`;
  media.videos[mod] = v;
}
for (const ep of fs.readdirSync(path.join(root, 'audio'))) {
  const dir = path.join(root, 'audio', ep);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.mp3'))) {
    const lang = f.match(/-([a-z]{2})\.mp3$/)[1], base = f.slice(0, -4);
    media.audio[ep] = media.audio[ep] || {};
    media.audio[ep][lang] = { mp3: file(dir, f), wav: file(dir, base + '.wav') || file(dir, base + '.flac'), duration: Math.round(probe(path.join(dir, f)) * 10) / 10 };
  }
}

// editable sources: everything needed to change words, art, voices and re-render (not the finished MP4, capsule and WAV/FLAC outputs)
const zipName = 'paruto-media-sps-kit-sources.zip', zipPath = path.join(root, 'downloads', zipName);
fs.mkdirSync(path.dirname(zipPath), { recursive: true });
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
execFileSync('python3', ['-I', '-c', `
import os, sys, zipfile
root, out = sys.argv[1], sys.argv[2]
skip_ext = ('.mp4', '.wav', '.flac', '.jpg', '.zip')
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    for top in ['shared', 'videos', 'audio', 'tools', 'README.md']:
        p = os.path.join(root, top)
        if os.path.isfile(p): z.write(p, os.path.join('sps-kit', top)); continue
        for d, _, fs in os.walk(p):
            for f in fs:
                if f.endswith(skip_ext) or f.startswith(('.', 'capsule-')): continue  # finished capsules are on the page
                full = os.path.join(d, f); z.write(full, os.path.join('sps-kit', os.path.relpath(full, root)))
`, root, zipPath]);
media.zip = file(path.dirname(zipPath), zipName);

fs.writeFileSync(path.join(root, 'hub', 'media.js'), '// Written by tools/kit.mjs: the files the kit page lists.\nwindow.SPS_MEDIA = ' + JSON.stringify(media, null, 1) + ';\n');
console.log('hub/media.js:', Object.keys(media.videos).join(', '), '| audio:', Object.keys(media.audio).join(', '), '| zip', (media.zip.bytes / 1e6).toFixed(1), 'MB');

// Builds storyboards/<module>/index.html: every segment of the module (interactive branches
// included) with frames rendered from the animation, the visual direction, narration, on-screen
// text and interactions, plus a branching map. Words come from the module's script.js,
// timeline.js and hyperframes.mjs, so the storyboard always matches the video.
//   node tools/storyboard.mjs <module> [<module> ...]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const mmss = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;

const UI = {
  fr: { kit: '← Kit de sensibilisation SPS', sb: 'Storyboard', lead: 'Chaque plan du module, branches interactives comprises : images tirées de l’animation, direction visuelle, narration, textes à l’écran et interactions. Livrable 1, à valider avec les experts de l’ARAA.', map: 'Carte des embranchements', shot: 'Plan', seg: 'Segment', time: 'Durée', frames: 'Images', visual: 'Direction visuelle (anglais)', vo: 'Narration et sous-titres', screen: 'Textes à l’écran', inter: 'Interaction', linear: 'Version linéaire (WhatsApp)', inter_only: 'Version interactive seulement', correct: 'bonne réponse', wrong: 'mauvaise réponse', back: 'retour au choix', then: 'puis', play: 'Voir la vidéo', branch: 'Branche : conséquence d’un mauvais choix, puis retour au choix.', quizNote: 'Trois questions. Interactive : le spectateur répond, voit la correction et son score. Linéaire : la bonne réponse s’affiche après quelques secondes.', none: '—', total: 'Durée de la version linéaire', choiceDesc: 'Carte de choix sur la scène figée ; la vidéo attend la réponse du spectateur.' },
  en: { kit: '← SPS awareness kit', sb: 'Storyboard', lead: 'Every shot of the module, interactive branches included: frames taken from the animation, visual direction, narration, on-screen text and interactions. Deliverable 1, to be validated with ARAA’s experts.', map: 'Branching map', shot: 'Shot', seg: 'Segment', time: 'Length', frames: 'Frames', visual: 'Visual direction', vo: 'Narration and captions', screen: 'On-screen text', inter: 'Interaction', linear: 'Linear version (WhatsApp)', inter_only: 'Interactive version only', correct: 'correct', wrong: 'wrong', back: 'back to the choice', then: 'then', play: 'Watch the video', branch: 'Branch: the consequence of a wrong choice, then back to the choice.', quizNote: 'Three questions. Interactive: the viewer answers, sees the correction and a score. Linear: the right answer is revealed after a few seconds.', none: '—', total: 'Linear version length', choiceDesc: 'Choice card over the frozen scene; the video waits for the viewer’s answer.' },
};

async function build(mod, browser) {
  const dir = path.join(root, 'videos', mod), out = path.join(root, 'storyboards', mod), img = path.join(out, 'img');
  fs.mkdirSync(img, { recursive: true });
  const window = {};
  for (const f of ['script.js', 'timeline.js']) new Function('window', fs.readFileSync(path.join(dir, f), 'utf8'))(window);
  const S = window.SPS_SCRIPT, TL = window.SPS_TIMELINE, segs = TL.segments;
  const hf = fs.existsSync(path.join(dir, 'hyperframes.mjs')) ? await import(pathToFileURL(path.join(dir, 'hyperframes.mjs')).href) : null;

  // interactive order: follow `next` and the correct answers; wrong answers hang off their choice
  const order = [], branches = {};
  let cur = 'title';
  while (cur && !order.includes(cur)) {
    order.push(cur);
    const s = segs[cur];
    if (s.kind === 'choice') {
      const c = S.choices[cur]; const right = c.options.find((o) => o.correct), wrong = c.options.find((o) => !o.correct);
      branches[cur] = wrong.next; cur = right.next;
    } else cur = s.next;
  }
  const all = order.flatMap((id) => (branches[id] ? [id, branches[id]] : [id]));

  // frames
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(pathToFileURL(path.join(dir, 'index.html')).href + '?render&lang=en&cc=0');
  await page.waitForFunction(() => document.body.dataset.ready === '1');
  await page.evaluate(() => document.fonts.ready);
  const frames = {};
  for (const id of all) {
    const s = segs[id];
    const ts = s.kind === 'quiz' ? [TL.quizLinear.reveal + 1, TL.quizLinear.each * 2 + 1] : s.kind === 'choice' ? [1.2, TL.choiceLinear.reveal + 1] : [s.dur * 0.3, s.dur * 0.8];
    frames[id] = [];
    for (const [k, t] of ts.entries()) {
      await page.evaluate(([id, t]) => window.SPS_RENDER.seg(id, t), [id, t]);
      const name = `${id}-${k + 1}.jpg`;
      await page.screenshot({ path: path.join(img, name), type: 'jpeg', quality: 78, clip: { x: 0, y: 0, width: 1280, height: 720 }, scale: 'css' });
      frames[id].push(name);
    }
  }
  await page.close();
  // smaller copies are enough on the page
  const { execFileSync } = await import('node:child_process');
  for (const f of fs.readdirSync(img)) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(img, f), '-vf', 'scale=640:-1', '-q:v', '5', path.join(img, f)]);

  const linearStart = {}; let acc = 0;
  for (const id of TL.linear) { linearStart[id] = acc; acc += segs[id].dur; }
  const total = acc;

  const rowsFor = (lang) => all.map((id, n) => {
    const s = segs[id], u = UI[lang], L = (o) => (o ? o[lang] ?? o.en : '');
    const desc = hf && hf.scenes(S.ui.en, TL)[id];
    const caps = (S.captions[id] || []).filter((c) => c.a < s.dur);
    const inLinear = TL.linear.includes(id);
    let screen = '', inter = '';
    if (s.kind === 'choice') {
      const c = S.choices[id];
      screen = `<b>${esc(L(c.q))}</b><br>${c.options.map((o, i) => `${i + 1}. ${esc(L(o))}`).join('<br>')}`;
      inter = c.options.map((o, i) => `${i + 1} → ${o.correct ? `<span class="ok">${u.correct}</span>` : `<span class="no">${u.wrong}</span>`}, ${esc(o.next)}`).join('<br>');
    } else if (s.kind === 'quiz') {
      screen = S.quiz.map((q, i) => `<b>${i + 1}. ${esc(L(q.q))}</b><br>${q.options.map((o, k) => `${'ABC'[k]}. ${o.correct ? `<span class="ok">${esc(L(o))}</span>` : esc(L(o))}`).join(' · ')}`).join('<br>');
      inter = esc(u.quizNote);
    } else if (s.back) inter = `${esc(u.branch)}`;
    const vo = caps.map((c) => `<span class="tc">${inLinear ? mmss(linearStart[id] + c.a) : `+${c.a.toFixed(1)}s`}</span> ${esc(L(c))}`).join('<br>')
      + (s.kind === 'quiz' ? S.quiz.map((q) => `<br>${esc(L(q.q))} … ${esc(L(q.why))}`).join('') : '');
    return `<tr class="${inLinear ? '' : 'branch'}">
      <td class="n">${n + 1}</td>
      <td><b>${esc(id)}</b><br><span class="dim">${s.dur}s${s.kind === 'choice' ? ' (pause)' : ''}</span><br><span class="badge ${inLinear ? 'lin' : 'int'}">${inLinear ? u.linear : u.inter_only}</span></td>
      <td class="fr">${frames[id].map((f) => `<img src="img/${f}" alt="" loading="lazy">`).join('')}</td>
      <td class="desc">${desc ? esc(desc) : `<span class="dim">${esc(s.back ? u.branch : s.kind === 'choice' ? u.choiceDesc : '')}</span>`}</td>
      <td>${vo || u.none}</td>
      <td>${screen || u.none}${inter ? `<div class="inter"><b>${u.inter}</b><br>${inter}</div>` : ''}</td>
    </tr>`;
  }).join('');

  // branching map: the main path left to right, wrong answers below their choice, looping back
  const W = 150, gap = 22, x0 = 20, y0 = 40;
  const pos = {}; order.forEach((id, i) => (pos[id] = { x: x0 + i * (W + gap), y: y0 }));
  const map = (lang) => {
    const u = UI[lang], node = (id, x, y, kind) => `<g><rect x="${x}" y="${y}" width="${W}" height="46" rx="${kind === 'choice' ? 23 : 10}" fill="${kind === 'choice' ? 'var(--accent-soft)' : kind === 'branch' ? 'rgba(214,69,52,.12)' : 'var(--panel2)'}" stroke="${kind === 'choice' ? 'var(--accent)' : kind === 'branch' ? '#d64534' : 'var(--line)'}" stroke-width="1.4"/><text x="${x + W / 2}" y="${y + 28}" text-anchor="middle">${esc(id)}</text></g>`;
    const arr = (d, c = 'var(--muted)') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="1.5" marker-end="url(#m)"/>`;
    let svg = '';
    order.forEach((id, i) => {
      const p = pos[id]; svg += node(id, p.x, p.y, segs[id].kind === 'choice' ? 'choice' : 'main');
      if (i < order.length - 1) svg += arr(`M${p.x + W} ${p.y + 23} H${p.x + W + gap - 2}`, segs[id].kind === 'choice' ? '#59c08a' : 'var(--muted)');
      if (branches[id]) {
        const bx = p.x, by = p.y + 110;
        svg += node(branches[id], bx, by, 'branch');
        svg += arr(`M${p.x + W / 2 - 20} ${p.y + 46} V${by - 2}`, '#d64534');
        svg += arr(`M${p.x + W / 2 + 20} ${by} V${p.y + 48}`, 'var(--muted)');
        svg += `<text x="${p.x + W / 2 - 26}" y="${p.y + 84}" text-anchor="end" class="lbl no">${u.wrong}</text><text x="${p.x + W / 2 + 26}" y="${p.y + 84}" class="lbl">${u.back}</text>`;
      }
    });
    const width = x0 * 2 + order.length * (W + gap);
    return `<svg viewBox="0 0 ${width} 220" style="min-width:${width * 0.75}px"><defs><marker id="m" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker></defs>${svg}</svg>`;
  };

  const poster = fs.readdirSync(dir).find((f) => f.endsWith('-en-poster.jpg') && !f.includes('vertical'));
  const page2 = (lang) => `<section data-lang="${lang}"${lang === 'fr' ? '' : ' hidden'}>
    <p class="kicker">${UI[lang].sb} · ${esc(S.ui[lang === 'fr' ? 'fr' : 'en'].title)}</p>
    <h1>${esc(S.ui[lang === 'fr' ? 'fr' : 'en'].title)}</h1>
    <p class="lead">${esc(UI[lang].lead)}</p>
    <p class="meta">${UI[lang].total}: ${mmss(total)} · <a href="../../videos/${mod}/?lang=${lang}">${UI[lang].play} →</a></p>
    <h2>${UI[lang].map}</h2><div class="map">${map(lang)}</div>
    <div class="table-wrap"><table><thead><tr><th>${UI[lang].shot}</th><th>${UI[lang].seg}</th><th>${UI[lang].frames}</th><th>${UI[lang].visual}</th><th>${UI[lang].vo}</th><th>${UI[lang].screen}</th></tr></thead><tbody>${rowsFor(lang)}</tbody></table></div>
  </section>`;

  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Storyboard · ${esc(S.ui.fr.title)} · Paruto Media</title><meta name="robots" content="noindex">
<link rel="stylesheet" href="../../hub/hub.css"><link rel="stylesheet" href="../storyboard.css"></head>
<body>
<header class="top"><a href="../../../" class="brand" aria-label="Paruto Media · projects"><img src="../../shared/paruto-media-logo-white.svg" alt="Paruto Media"></a><nav id="nav"><a href="../../#cadrage" class="kitlink" data-fr="${esc(UI.fr.kit)}" data-en="${esc(UI.en.kit)}">${esc(UI.fr.kit)}</a></nav>
<div class="langs"><button class="lang-btn on" data-lang="fr">FR</button><button class="lang-btn" data-lang="en">EN</button></div></header>
<main class="sbmain">${page2('fr')}${page2('en')}</main>
<script>
(function(){var p=new URLSearchParams(location.search).get('lang');var s=null;try{s=localStorage.getItem('kit-lang')}catch(e){}
function set(l){document.documentElement.lang=l;document.querySelectorAll('main section').forEach(function(x){x.hidden=x.dataset.lang!==l});document.querySelectorAll('.lang-btn').forEach(function(b){b.classList.toggle('on',b.dataset.lang===l)});var k=document.querySelector('.kitlink');k.textContent=k.dataset[l];try{localStorage.setItem('kit-lang',l)}catch(e){}}
document.querySelectorAll('.lang-btn').forEach(function(b){b.addEventListener('click',function(){set(b.dataset.lang)})});set(p||s||((navigator.language||'').indexOf('fr')===0?'fr':'en'));})();
</script></body></html>`;
  fs.writeFileSync(path.join(out, 'index.html'), html);
  console.log(`storyboards/${mod}: ${all.length} segments, ${all.length * 2} frames`);
  return frames.meet ? `storyboards/${mod}/img/${frames.meet[1]}` : null;
}

const mods = process.argv.slice(2);
const browser = await chromium.launch();
for (const m of mods) await build(m, browser);
await browser.close();

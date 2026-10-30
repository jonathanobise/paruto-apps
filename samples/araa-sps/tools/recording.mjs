// Builds the language recording kit: recording/index.html (instructions, recording specs, SPS
// glossary, line counts) and one CSV per module and for the capsules, listing every line to
// translate and record with its file name and the time it must fit in.   node tools/recording.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = path.join(root, 'recording');
fs.mkdirSync(out, { recursive: true });
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const csvCell = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
const LOCAL = [['ha', 'Hausa'], ['bm', 'Bambara'], ['wo', 'Wolof'], ['yo', 'Yoruba'], ['ff', 'Fulfulde']];

const files = [];
const modules = [];
for (const mod of ['international', 'ecowas', 'waemu']) {
  const dir = path.join(root, 'videos', mod);
  if (!fs.existsSync(path.join(dir, 'script.js'))) continue;
  const w = {};
  for (const f of ['script.js', 'timeline.js']) new Function('window', fs.readFileSync(path.join(dir, f), 'utf8'))(w);
  const S = w.SPS_SCRIPT, T = w.SPS_TIMELINE, rows = [];
  for (const [seg, caps] of Object.entries(S.captions)) caps.forEach((c, i) => {
    if (c.a >= T.segments[seg].dur) return;
    rows.push({ file: `videos/${mod}/rec/<lang>/${seg}-${i}.wav`, max: (Math.min(c.b, T.segments[seg].dur) - c.a - 0.15).toFixed(1), ctx: seg, fr: c.fr, en: c.en, pt: c.pt });
  });
  S.quiz.forEach((q, i) => {
    rows.push({ file: `videos/${mod}/rec/<lang>/quiz-${i}-q.wav`, max: (T.quizLinear.reveal - 0.55).toFixed(1), ctx: `quiz ${i + 1}, question`, fr: q.q.fr, en: q.q.en, pt: q.q.pt });
    rows.push({ file: `videos/${mod}/rec/<lang>/quiz-${i}-why.wav`, max: (T.quizLinear.each - T.quizLinear.reveal - 0.65).toFixed(1), ctx: `quiz ${i + 1}, explanation`, fr: q.why.fr, en: q.why.en, pt: q.why.pt });
  });
  // on-screen words (titles, chips, choices, quiz options): translated, not recorded
  const screen = [];
  const walk = (o, key) => { if (typeof o === 'string') screen.push({ ctx: key, fr: o }); else if (Array.isArray(o)) o.forEach((x, i) => walk(x, `${key}.${i}`)); };
  for (const [k, v] of Object.entries(S.ui.fr)) walk(v, `ui.${k}`);
  screen.forEach((r) => { const k = r.ctx.split('.').slice(1); let e = S.ui.en, p = S.ui.pt; for (const x of k) { e = e?.[x]; p = p?.[x]; } r.en = e; r.pt = p; });
  for (const [id, c] of Object.entries(S.choices)) { screen.push({ ctx: `${id}.question`, fr: c.q.fr, en: c.q.en, pt: c.q.pt }); c.options.forEach((o, i) => screen.push({ ctx: `${id}.option${i + 1}`, fr: o.fr, en: o.en, pt: o.pt })); }
  S.quiz.forEach((q, i) => q.options.forEach((o, k) => screen.push({ ctx: `quiz${i + 1}.${'abc'[k]}`, fr: o.fr, en: o.en, pt: o.pt })));
  const head = ['file', 'max_seconds', 'context', 'fr', 'en', 'pt', ...LOCAL.map(([c]) => c)];
  const csv = [head.join(','), ...rows.map((r) => [r.file, r.max, r.ctx, r.fr, r.en, r.pt, '', '', '', '', ''].map(csvCell).join(',')), '',
    ['on_screen_text (translate, do not record)', '', 'context', 'fr', 'en', 'pt', ...LOCAL.map(([c]) => c)].map(csvCell).join(','),
    ...screen.map((r) => ['', '', r.ctx, r.fr, r.en, r.pt, '', '', '', '', ''].map(csvCell).join(','))].join('\n');
  const name = `recording-${mod}.csv`;
  fs.writeFileSync(path.join(out, name), '﻿' + csv);
  files.push(name); modules.push({ mod, title: S.ui, lines: rows.length, screen: screen.length, secs: rows.reduce((s, r) => s + +r.max, 0) });
}

// capsules
const w = {}; new Function('window', fs.readFileSync(path.join(root, 'audio', 'capsules.js'), 'utf8'))(w);
const C = w.SPS_CAPSULES, crow = [];
C.episodes.forEach((ep) => { ep.lines.forEach((l, i) => crow.push({ file: `audio/${ep.id}/rec/<lang>/${String(i + 1).padStart(2, '0')}-${l.who}.wav`, ctx: `episode ${ep.n}, ${l.who}`, fr: l.fr, en: l.en, pt: l.pt })); crow.push({ file: `audio/${ep.id}/rec/<lang>/${String(ep.lines.length + 1).padStart(2, '0')}-credit.wav`, ctx: `episode ${ep.n}, credit`, fr: C.credit.fr, en: C.credit.en, pt: C.credit.pt }); });
fs.writeFileSync(path.join(out, 'recording-capsules.csv'), '﻿' + [['file', 'context', 'fr', 'en', 'pt', ...LOCAL.map(([c]) => c)].join(','), ...crow.map((r) => [r.file, r.ctx, r.fr, r.en, r.pt, '', '', '', '', ''].map(csvCell).join(','))].join('\n'));
files.push('recording-capsules.csv');

// glossary: the SPS terms every translator must agree on first
const G = [
  ['certificat vétérinaire', 'veterinary certificate', 'certificado veterinário'],
  ['vétérinaire officiel', 'official veterinarian', 'veterinário oficial'],
  ['services vétérinaires', 'veterinary services', 'serviços veterinários'],
  ['délai d’attente (médicament)', 'withdrawal period (drug)', 'intervalo de segurança (medicamento)'],
  ['résidus de médicaments', 'drug residues', 'resíduos de medicamentos'],
  ['inspection avant / après l’abattage', 'inspection before / after slaughter', 'inspeção antes / depois do abate'],
  ['cachet d’inspection', 'inspection stamp', 'carimbo de inspeção'],
  ['chaîne du froid', 'cold chain', 'cadeia de frio'],
  ['traçabilité', 'traceability', 'rastreabilidade'],
  ['alerte sanitaire', 'health alert', 'alerta sanitário'],
  ['quarantaine', 'quarantine', 'quarentena'],
  ['péripneumonie contagieuse bovine', 'contagious bovine pleuropneumonia', 'peripneumonia contagiosa bovina'],
  ['fièvre aphteuse', 'foot-and-mouth disease', 'febre aftosa'],
  ['peste des petits ruminants', 'peste des petits ruminants', 'peste dos pequenos ruminantes'],
  ['Accord SPS (OMC)', 'SPS Agreement (WTO)', 'Acordo SPS (OMC)'],
  ['Codex Alimentarius', 'Codex Alimentarius', 'Codex Alimentarius'],
  ['OMSA (santé animale)', 'WOAH (animal health)', 'OMSA (saúde animal)'],
  ['CIPV (santé des végétaux)', 'IPPC (plant health)', 'CIPV (sanidade vegetal)'],
  ['CEDEAO', 'ECOWAS', 'CEDEAO'],
  ['UEMOA', 'WAEMU', 'UEMOA'],
  ['évaluation du risque', 'risk assessment', 'avaliação do risco'],
  ['niveau de protection', 'level of protection', 'nível de proteção'],
  ['équivalence (des mesures)', 'equivalence (of measures)', 'equivalência (das medidas)'],
  ['zone indemne', 'disease-free area', 'zona indemne'],
  ['point d’information SPS', 'SPS enquiry point', 'ponto de informação SPS'],
  ['limite maximale de résidus', 'maximum residue limit', 'limite máximo de resíduos'],
  ['substituts du lait maternel', 'breast-milk substitutes', 'substitutos do leite materno'],
];
fs.writeFileSync(path.join(out, 'glossary.csv'), '﻿' + [['fr', 'en', 'pt', ...LOCAL.map(([c]) => c), 'notes'].join(','), ...G.map((g) => [...g, '', '', '', '', '', ''].map(csvCell).join(','))].join('\n'));
files.push('glossary.csv');

// brief-en.pdf and brief-fr.pdf in recording/ are exports of the speakers' brief (kept off this public page)
const T = {
  fr: {
    kit: '← Kit de sensibilisation SPS', kicker: 'Huit langues · kit d’enregistrement', title: 'Kit d’enregistrement des langues locales',
    lead: 'Tout ce qu’il faut pour traduire et enregistrer les vidéos et les capsules en haoussa, bambara, wolof, yoruba et peul. Les fichiers déposés remplacent les voix provisoires sans autre travail de montage.',
    steps: 'Étapes', s: ['Valider le glossaire SPS de la langue avec un expert (fichier glossary.csv).', 'Traduire chaque réplique depuis le français dans la colonne de la langue, en respectant la durée maximale indiquée.', 'Faire relire les passages clés par un second locuteur (rétro-traduction).', 'Enregistrer une réplique par fichier, nommé exactement comme dans la colonne « file » (remplacer <lang> par le code de la langue).', 'Renvoyer le CSV complété et les fichiers audio ; Paruto Media intègre, rend les vidéos et les capsules, puis fait valider.'],
    specs: 'Enregistrement', sp: ['WAV, 48 kHz, 24 bits, mono (ou 44,1 kHz 16 bits).', 'Pièce calme et non résonnante, micro à 15–20 cm, filtre anti-pop.', 'Une prise par réplique, environ 0,5 s de silence avant et après.', 'Voix chaleureuse et posée ; prononcer clairement les termes du glossaire.', 'Les vidéos : une voix de narration. Les capsules : deux voix, un animateur et un vétérinaire.'],
    briefT: 'Commencez par le brief', briefL: 'Tout ce qu’il faut savoir avant de traduire et d’enregistrer : priorités, règles de traduction, direction de voix, réglages, noms des fichiers et date de retour.', briefFr: 'Brief en français (PDF)', briefEn: 'Brief en anglais (PDF)',
    dl: 'Fichiers à télécharger', lines: 'répliques à enregistrer', screen: 'textes à l’écran à traduire', mins: 'minutes au plus', caps: 'Capsules audio (trois épisodes)', gl: 'Glossaire SPS (à valider en premier)', codes: 'Codes de langue : ha haoussa, bm bambara, wo wolof, yo yoruba, ff peul (fulfulde).',
    glT: 'Glossaire de départ', glNote: 'Les colonnes des langues locales sont à remplir et à valider avec les experts avant toute traduction.',
  },
  en: {
    kit: '← SPS awareness kit', kicker: 'Eight languages · recording kit', title: 'Local-language recording kit',
    lead: 'Everything needed to translate and record the videos and capsules in Hausa, Bambara, Wolof, Yoruba and Fulani. The files you deliver replace the temporary voices with no further editing.',
    steps: 'Steps', s: ['Validate the language’s SPS glossary with an expert (glossary.csv).', 'Translate each line from French into the language’s column, keeping within the maximum length given.', 'Have key passages checked by a second speaker (back-translation).', 'Record one line per file, named exactly as in the “file” column (replace <lang> with the language code).', 'Return the completed CSV and the audio files; Paruto Media integrates them, renders the videos and capsules, and has them validated.'],
    specs: 'Recording', sp: ['WAV, 48 kHz, 24-bit, mono (or 44.1 kHz 16-bit).', 'A quiet, non-echoey room, microphone at 15–20 cm, pop filter.', 'One take per line, about 0.5 s of silence before and after.', 'A warm, unhurried voice; pronounce the glossary terms clearly.', 'Videos: one narrator. Capsules: two voices, a host and a veterinarian.'],
    briefT: 'Start with the brief', briefL: 'Everything to know before translating and recording: priorities, translation rules, voice direction, settings, file names and the return date.', briefFr: 'Brief in French (PDF)', briefEn: 'Brief in English (PDF)',
    dl: 'Files to download', lines: 'lines to record', screen: 'on-screen texts to translate', mins: 'minutes at most', caps: 'Audio capsules (three episodes)', gl: 'SPS glossary (validate first)', codes: 'Language codes: ha Hausa, bm Bambara, wo Wolof, yo Yoruba, ff Fulani (Fulfulde).',
    glT: 'Starter glossary', glNote: 'The local-language columns are to be filled in and validated with the experts before any translation.',
  },
};
const section = (lang) => {
  const t = T[lang], L = lang;
  return `<section data-lang="${lang}"${lang === 'fr' ? '' : ' hidden'}>
  <p class="kicker">${t.kicker}</p><h1>${t.title}</h1><p class="lead">${t.lead}</p>
  <div class="brief"><h2>${t.briefT}</h2><p>${t.briefL}</p>
    <div class="srcs">${(lang === 'fr' ? [['fr', t.briefFr], ['en', t.briefEn]] : [['en', t.briefEn], ['fr', t.briefFr]]).map(([l, label], i) => `<a class="btn${i ? ' ghost' : ''}" href="brief-${l}.pdf" download>${label}</a>`).join('')}</div></div>
  <h2>${t.dl}</h2>
  <div class="table-wrap"><table><tbody>
    ${modules.map((m) => `<tr><td><b>${esc(m.title[L].title)}</b></td><td>${m.lines} ${t.lines} · ${m.screen} ${t.screen} · ${(m.secs / 60).toLocaleString(L === 'fr' ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 1 })} ${t.mins}</td><td><a href="recording-${m.mod}.csv" download>CSV</a></td></tr>`).join('')}
    <tr><td><b>${t.caps}</b></td><td>${crow.length} ${t.lines}</td><td><a href="recording-capsules.csv" download>CSV</a></td></tr>
    <tr><td><b>${t.gl}</b></td><td>${G.length}</td><td><a href="glossary.csv" download>CSV</a></td></tr>
  </tbody></table></div>
  <p class="dim">${t.codes}</p>
  <h2>${t.steps}</h2><ol>${t.s.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>
  <h2>${t.specs}</h2><ul>${t.sp.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
  <h2>${t.glT}</h2><p class="dim">${t.glNote}</p>
  <div class="table-wrap"><table><thead><tr><th>FR</th><th>EN</th><th>PT</th>${LOCAL.map(([c, n]) => `<th>${n}</th>`).join('')}</tr></thead><tbody>
    ${G.map((g) => `<tr>${g.map((x) => `<td>${esc(x)}</td>`).join('')}${LOCAL.map(() => '<td class="dim">…</td>').join('')}</tr>`).join('')}
  </tbody></table></div>
</section>`;
};
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kit d’enregistrement · Kit SPS · Paruto Media</title><meta name="robots" content="noindex">
<meta name="theme-color" content="#060608"><link rel="icon" href="../shared/favicon.svg" type="image/svg+xml"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Geist:wght@300..800&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap" onload="this.onload=null;this.rel='stylesheet'"><link rel="stylesheet" href="../shared/kit.css"><link rel="stylesheet" href="../storyboards/storyboard.css"><script>try { if (localStorage.getItem("theme") === "light") document.documentElement.dataset.theme = "light"; } catch {}</script></head>
<body>
<div class="grain" aria-hidden="true"></div>
<header class="nav glass"><a class="brand" href="../../" aria-label="Paruto Media · projects"><img class="only-dark" src="../shared/paruto-media-logo-white.svg" alt="Paruto Media"><img class="only-light" src="../shared/paruto-media-logo-black.svg" alt="" aria-hidden="true"></a><nav class="nav-links"><a href="../#langues" class="kitlink crumb" data-fr="${T.fr.kit}" data-en="${T.en.kit}">${T.fr.kit}</a></nav><div class="nav-end"><div class="seg" role="group" aria-label="Langue / Language"><button class="lang-btn on" data-lang="fr">FR</button><button class="lang-btn" data-lang="en">EN</button><span class="seg-thumb" aria-hidden="true"></span></div><button class="theme-toggle" type="button" aria-label="Switch to light mode">
        <svg class="i-sun" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></g></svg>
        <svg class="i-moon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
      </button></div></header>
<main class="sbmain doc page">${section('fr')}${section('en')}</main>
<script>
(function(){var p=new URLSearchParams(location.search).get('lang');var s=null;try{s=localStorage.getItem('kit-lang')}catch(e){}
function set(l){document.documentElement.lang=l;document.querySelectorAll('main section').forEach(function(x){x.hidden=x.dataset.lang!==l});document.querySelectorAll('.lang-btn').forEach(function(b){b.classList.toggle('on',b.dataset.lang===l)});var k=document.querySelector('.kitlink');k.textContent=k.dataset[l];try{localStorage.setItem('kit-lang',l)}catch(e){}}
document.querySelectorAll('.lang-btn').forEach(function(b){b.addEventListener('click',function(){set(b.dataset.lang)})});set(p||s||((navigator.language||'').indexOf('fr')===0?'fr':'en'));})();
</script><script src="../shared/kit.js"></script></body></html>
`);
console.log('recording/:', files.join(', '), modules.map((m) => `${m.mod} ${m.lines} lines`).join(' · '));

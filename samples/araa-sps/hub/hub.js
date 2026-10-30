// The kit's front page: one section per ARAA deliverable. All words are here in French and
// English; files and durations come from hub/media.js (written by tools/kit.mjs).
(function () {
  const M = window.SPS_MEDIA || { videos: {}, audio: {}, zip: null };
  const CAPS = window.SPS_CAPSULES, CUES = window.SPS_CUES || {};
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  const pick = new URLSearchParams(location.search).get('lang') || store.get('kit-lang') || ((navigator.language || '').startsWith('fr') ? 'fr' : 'en');
  let lang = pick === 'fr' ? 'fr' : 'en';

  const MODULES = [
    { id: 'international', slug: 'aicha', tag: { fr: 'Normes internationales · OMC, OMSA, FAO/Codex', en: 'International standards · WTO, WOAH, FAO/Codex' }, title: { fr: 'Le marché d’Aïcha', en: 'Aïcha’s Market' }, line: { fr: 'Accord SPS, Codex, OMSA et CIPV : délai d’attente des médicaments, inspection à l’abattoir et chaîne du froid.', en: 'SPS Agreement, Codex, WOAH and IPPC: drug withdrawal periods, abattoir inspection and the cold chain.' } },
    { id: 'ecowas', slug: 'moussa', tag: { fr: 'Normes CEDEAO · C/REG.21/11/10', en: 'ECOWAS standards · C/REG.21/11/10' }, title: { fr: 'Le voyage de Moussa', en: 'Moussa’s Journey' }, line: { fr: 'Vétérinaire officiel, certificat zoosanitaire international et contrôle à la frontière.', en: 'Official veterinarian, international animal health certificate and the border check.' } },
    { id: 'waemu', slug: 'koffi', tag: { fr: 'Normes UEMOA · Règlement 007/2007', en: 'WAEMU standards · Regulation 007/2007' }, title: { fr: 'La boucherie de Koffi', en: 'Koffi’s Butcher Shop' }, line: { fr: 'Responsabilité de chaque acteur, traçabilité et alertes sanitaires, du troupeau à l’assiette.', en: 'Everyone’s responsibility, traceability and health alerts, from herd to plate.' } },
  ];
  const LANGS = [
    { code: 'fr', name: 'Français' }, { code: 'en', name: 'English' }, { code: 'pt', name: 'Português' },
    { code: 'ha', name: 'Hausa' }, { code: 'bm', name: 'Bamanankan (Bambara)' }, { code: 'wo', name: 'Wolof' }, { code: 'yo', name: 'Yorùbá' }, { code: 'ff', name: 'Fulfulde (Peul)' },
  ];

  const T = {
    fr: {
      nav: ['Approche', 'Cadrage · L1', 'Revue · L2', 'Vidéos', 'Audio', 'Langues', 'Sources et guide'],
      kicker: 'Réponse à l’AMI028-2026 de l’ARAA · Paruto Media',
      title: 'Kit de sensibilisation SPS : un échantillon de chaque livrable',
      lead: 'Pour ce dossier, Paruto Media a produit un exemple concret de chaque livrable demandé : des vidéos interactives sur les trois cadres (international, CEDEAO, UEMOA), leurs versions légères pour WhatsApp, des capsules audio pour la radio et le podcast, les storyboards, un guide de déploiement et les fichiers sources.',
      note: 'Contenus de démonstration, à valider par les experts techniques de l’ARAA. La narration en français, anglais et portugais est ici une voix de travail : en production, ces trois langues sont doublées par des voix de synthèse haute fidélité d’un laboratoire de pointe, dirigées au studio Paruto Music et vérifiées par un locuteur natif, et les cinq langues locales sont enregistrées en studio par des comédiens natifs. Le module international est en version complète, la durée que l’ARAA demande : la vidéo « Le marché d’Aïcha » dure 7 min 24 s et sa capsule radio environ 7 minutes et demie. Les vidéos CEDEAO et UEMOA (environ 2 minutes) et leurs capsules (environ 70 secondes) sont des échantillons courts du format.',
      tableHead: ['Livrable demandé', 'Ce que vous trouverez ici'],
      rows: [
        ['L1 · Rapport de démarrage et storyboards validés', 'Méthodologie, plan de travail sur 12 semaines, storyboards complets des trois vidéos avec la carte des embranchements', '#cadrage'],
        ['L2 · Première version des contenus', 'Les trois étapes de validation et le journal des commentaires', '#revue'],
        ['L3 · Vidéos interactives : normes internationales (OMC, OMSA, FAO)', '« Le marché d’Aïcha », version complète de 7 min 24 s, interactive, en français, anglais et portugais', '#videos'],
        ['L3 · Vidéos interactives : normes CEDEAO', '« Le voyage de Moussa », interactive, en français, anglais et portugais', '#videos'],
        ['L3 · Vidéos interactives : normes UEMOA', '« La boucherie de Koffi », interactive, en français, anglais et portugais', '#videos'],
        ['L3 · Versions légères pour WhatsApp', 'MP4 au format 16:9 et vertical 9:16, sous-titres incrustés et fichiers SRT', '#videos'],
        ['L3 · Capsules audio radio / podcast (trois cadres)', 'Trois épisodes de « Santé animale, marchés ouverts », en MP3 et WAV (FLAC pour l’épisode complet), avec fiche de diffusion', '#audio'],
        ['L3 · Huit langues (3 officielles + 5 locales)', 'Français, anglais, portugais produits ; kit d’enregistrement pour le haoussa, le bambara, le wolof, le yoruba et le peul', '#langues'],
        ['L3 · Fichiers sources et guide de déploiement', 'Sources éditables à télécharger et guide pour le web, WhatsApp et les radios communautaires', '#sources'],
      ],
      approachT: 'Une seule animation, plusieurs voix',
      approachL: 'Chaque histoire est animée une fois, presque sans texte à l’écran. Une nouvelle langue ne demande que la voix et les sous-titres : les 48 contenus restent cohérents, dans les délais et dans le budget.',
      pipe: ['Textes de référence', 'Accord SPS, Codex, OMSA, CIPV, C/REG.21/11/10, Règlement 007/2007', 'Scénarios et storyboards', 'Validés avec les experts de l’ARAA', 'Animation maître', 'Décors et personnages sans texte', 'Voix et sous-titres', '8 langues, glossaire SPS validé', 'Vidéo interactive web', 'MP4 WhatsApp 16:9 et 9:16', 'Capsules radio MP3 et WAV'],
      points: ['Interactivité intégrée : choix à embranchements avec leurs conséquences, quiz avec score.', 'Fonctionne dans tout navigateur, sur ordinateur et téléphone, sans application à installer.', 'Tout est généré depuis un seul script par module : textes, sous-titres, voix et vidéos restent synchronisés.'],
      inceptionT: 'Cadrage et storyboards · Livrable 1',
      inceptionL: 'Le rapport de démarrage fixe la méthode, le calendrier et les storyboards. Voici notre plan de travail et les storyboards des trois vidéos, plan par plan.',
      phases: [['Cadrage', 'Analyse des textes SPS, entretiens avec les experts, synopsis'], ['Storyboards', 'Scénarios détaillés avec embranchements, validation L1'], ['Production', 'Animation, interactivité, voix, capsules audio'], ['Post-production', 'Montage, sous-titres, encodages, validation finale']],
      gantt: ['Cadrage et storyboards', 'Animation et interactivité', 'Traduction et glossaires', 'Voix et enregistrements audio', 'Post-production et encodage', 'Marge et remise'],
      gates: ['L1 fin S3', 'L2 fin S8', 'L3 fin S11'],
      week: 'S',
      storyboard: 'Ouvrir le storyboard',
      reviewT: 'Revue des contenus · Livrable 2',
      reviewL: 'Chaque livrable passe trois portes de validation. Chaque commentaire de l’ARAA et des parties prenantes est consigné avec sa réponse.',
      gateNames: [['L1', 'Storyboards', 'Scripts, storyboards et embranchements validés avant toute animation'], ['L2', 'Première version', 'Vidéos encodées et audio bruts avec voix, pour commentaires'], ['L3', 'Kit final', 'Commentaires intégrés, toutes langues, sources et guide']],
      logT: 'Journal des commentaires (exemple de format, commentaires fictifs)',
      logHead: ['#', 'Livrable', 'Repère', 'Commentaire', 'Réponse', 'Statut'],
      log: [['1', 'L2 · Vidéo CEDEAO', '00:40', 'Employer partout « certificat zoosanitaire international ».', 'Terme harmonisé dans les trois langues et dans le glossaire.', 'Traité'], ['2', 'L2 · Capsule UEMOA', '00:35', 'Rappeler que le contrôle relève des services officiels.', 'Réplique ajoutée au vétérinaire.', 'Traité'], ['3', 'L2 · Vidéo internationale', 'Quiz, Q3', 'Revoir la formulation de la bonne réponse sur l’Accord SPS.', 'Proposition envoyée à l’expert SPS.', 'En cours']],
      videosT: 'Vidéos interactives · Livrable 3',
      videosL: 'Trois modules, un par cadre. Chacun : une histoire animée, deux choix à embranchements avec leurs conséquences et un quiz. Les versions WhatsApp montrent les bonnes réponses.',
      play: 'Jouer la version interactive', wa: 'WhatsApp 16:9', wav: 'WhatsApp 9:16', srt: 'Sous-titres', sb: 'Storyboard',
      audioT: 'Capsules audio · Livrable 3',
      audioL: 'Une émission, « Santé animale, marchés ouverts », un épisode par cadre : une animatrice et un vétérinaire, un jingle, trois messages clés. MP3 pour le podcast et WhatsApp, WAV normalisé (EBU R128, −23 LUFS) pour la radio, en FLAC sans perte, plus léger, pour l’épisode complet.',
      ep: 'Épisode', transcript: 'Transcription', cueT: 'Fiche de diffusion', cueHead: ['Épisode', 'Langue', 'Durée', 'Début', 'Fin', 'Fichiers'],
      langsT: 'Huit langues · Livrable 3',
      langsL: 'Français, anglais et portugais sont produits ici. Les cinq langues locales sont traduites et enregistrées par des locuteurs natifs, à partir d’un glossaire SPS validé par les experts.',
      langHead: ['Langue', 'Vidéos (voix et sous-titres)', 'Capsules audio', 'État'],
      done: 'Produit (voix de travail ; voix de synthèse haute fidélité en production)', scriptReady: 'Script prêt', toRecord: 'Enregistrement par locuteurs natifs', kit: 'Kit d’enregistrement',
      method: ['Glossaire SPS par langue, validé avec les experts de l’ARAA', 'Traduction par un locuteur natif, rétro-traduction des passages clés', 'Enregistrement en studio, relecture par un second locuteur'],
      sourcesT: 'Fichiers sources et guide de déploiement · Livrable 3',
      sourcesL: 'Tout est livré éditable : animations, textes, voix, sous-titres et outils de rendu. Le guide explique la diffusion sur le web, WhatsApp et les radios communautaires.',
      zip: 'Télécharger les sources', guide: 'Lire le guide de déploiement', rec: 'Kit d’enregistrement des langues', embed: 'Intégrer une vidéo sur un site', copy: 'Copier', copied: 'Copié',
      foot: 'Une production Paruto Media, avec Paruto Music (studio) et Paruto Apps (développement interactif).',
      min: 'min',
    },
    en: {
      nav: ['Approach', 'Inception · D1', 'Review · D2', 'Videos', 'Audio', 'Languages', 'Sources & guide'],
      kicker: 'Response to ARAA call AMI028-2026 · Paruto Media',
      title: 'SPS awareness kit: a sample of every deliverable',
      lead: 'For this bid, Paruto Media produced a working example of every deliverable in the call: interactive videos on all three frameworks (international, ECOWAS, WAEMU), their light WhatsApp versions, audio capsules for radio and podcast, storyboards, a deployment guide and the source files.',
      note: 'Demonstration content, to be validated by ARAA’s technical experts. The French, English and Portuguese narration here is a scratch voice: in production, these three languages are voiced with high-fidelity AI voices from a frontier provider, directed at the Paruto Music studio and checked by a native speaker, and the five local languages are recorded in the studio by native-speaker actors. The international module is full length, as ARAA asks: the video “Aïcha’s Market” runs 7 min 24 s and its radio capsule about 7½ minutes. The ECOWAS and WAEMU videos (about 2 minutes) and their capsules (about 70 seconds) are short samples of the format.',
      tableHead: ['Deliverable in the call', 'What you’ll find here'],
      rows: [
        ['D1 · Inception report and validated storyboards', 'Method, 12-week workplan, full storyboards of the three videos with their branching maps', '#cadrage'],
        ['D2 · First draft of content', 'The three validation gates and the feedback log', '#revue'],
        ['D3 · Interactive videos: international standards (WTO, WOAH, FAO)', '“Aïcha’s Market”, full length (7 min 24 s), interactive, in French, English and Portuguese', '#videos'],
        ['D3 · Interactive videos: ECOWAS standards', '“Moussa’s Journey”, interactive, in French, English and Portuguese', '#videos'],
        ['D3 · Interactive videos: WAEMU standards', '“Koffi’s Butcher Shop”, interactive, in French, English and Portuguese', '#videos'],
        ['D3 · Light versions for WhatsApp', 'MP4 in 16:9 and vertical 9:16, burned-in captions and SRT files', '#videos'],
        ['D3 · Radio / podcast audio capsules (three frameworks)', 'Three episodes of “Healthy Animals, Open Markets”, MP3 and WAV (FLAC for the full-length episode), with a cue sheet', '#audio'],
        ['D3 · Eight languages (3 official + 5 local)', 'French, English, Portuguese produced; recording kit for Hausa, Bambara, Wolof, Yoruba and Fulani', '#langues'],
        ['D3 · Source files and deployment guide', 'Editable sources to download and a guide for web, WhatsApp and community radio', '#sources'],
      ],
      approachT: 'One master, many voices',
      approachL: 'Each story is animated once, with almost no text on screen. A new language only needs voice and captions, so all 48 assets stay consistent, on time and on budget.',
      pipe: ['Reference texts', 'SPS Agreement, Codex, WOAH, IPPC, C/REG.21/11/10, Regulation 007/2007', 'Scripts and storyboards', 'Validated with ARAA’s experts', 'Master animation', 'Sets and characters without text', 'Voices and captions', '8 languages, validated SPS glossary', 'Interactive web video', 'WhatsApp MP4, 16:9 and 9:16', 'Radio capsules, MP3 and WAV'],
      points: ['Built-in interactivity: branching choices with consequences, and a quiz with a score.', 'Runs in any browser, on computers and phones, with no app to install.', 'Everything is generated from one script per module, so text, captions, voices and videos stay in sync.'],
      inceptionT: 'Inception and storyboards · Deliverable 1',
      inceptionL: 'The inception report sets the method, schedule and storyboards. Here are our workplan and the shot-by-shot storyboards of all three videos.',
      phases: [['Scoping', 'SPS text analysis, expert interviews, synopses'], ['Storyboards', 'Detailed scripts with branching, D1 sign-off'], ['Production', 'Animation, interactivity, voices, audio capsules'], ['Post-production', 'Editing, captions, encoding, final sign-off']],
      gantt: ['Scoping and storyboards', 'Animation and interactivity', 'Translation and glossaries', 'Voices and audio recording', 'Post-production and encoding', 'Slack and handover'],
      gates: ['D1 end W3', 'D2 end W8', 'D3 end W11'],
      week: 'W',
      storyboard: 'Open the storyboard',
      reviewT: 'Content review · Deliverable 2',
      reviewL: 'Every deliverable passes three validation gates. Every comment from ARAA and stakeholders is logged with its response.',
      gateNames: [['D1', 'Storyboards', 'Scripts, storyboards and branching signed off before any animation'], ['D2', 'First draft', 'Encoded videos and raw audio with voices, for comments'], ['D3', 'Final kit', 'Comments folded in, all languages, sources and guide']],
      logT: 'Feedback log (format example, fictitious comments)',
      logHead: ['#', 'Deliverable', 'Where', 'Comment', 'Response', 'Status'],
      log: [['1', 'D2 · ECOWAS video', '00:40', 'Use “international animal health certificate” throughout.', 'Term aligned in all three languages and the glossary.', 'Done'], ['2', 'D2 · WAEMU capsule', '00:35', 'Say that checks are carried out by the official services.', 'Line added for the veterinarian.', 'Done'], ['3', 'D2 · International video', 'Quiz, Q3', 'Rework the wording of the correct answer on the SPS Agreement.', 'Proposal sent to the SPS expert.', 'In progress']],
      videosT: 'Interactive videos · Deliverable 3',
      videosL: 'Three modules, one per framework. Each has an animated story, two branching choices with consequences, and a quiz. The WhatsApp versions show the right answers.',
      play: 'Play the interactive version', wa: 'WhatsApp 16:9', wav: 'WhatsApp 9:16', srt: 'Subtitles', sb: 'Storyboard',
      audioT: 'Audio capsules · Deliverable 3',
      audioL: 'One programme, “Healthy Animals, Open Markets”, with an episode per framework: a host and a veterinarian, a jingle, three key messages. MP3 for podcast and WhatsApp, loudness-normalised WAV (EBU R128, −23 LUFS) for radio, as lossless FLAC for the full-length episode, a smaller file.',
      ep: 'Episode', transcript: 'Transcript', cueT: 'Cue sheet', cueHead: ['Episode', 'Language', 'Length', 'In-cue', 'Out-cue', 'Files'],
      langsT: 'Eight languages · Deliverable 3',
      langsL: 'French, English and Portuguese are produced here. The five local languages are translated and recorded by native speakers, from an SPS glossary validated by the experts.',
      langHead: ['Language', 'Videos (voice and captions)', 'Audio capsules', 'Status'],
      done: 'Produced (scratch voice; high-fidelity AI voice in production)', scriptReady: 'Script ready', toRecord: 'Recorded by native speakers', kit: 'Recording kit',
      method: ['An SPS glossary per language, validated with ARAA’s experts', 'Translation by a native speaker, back-translation of key passages', 'Studio recording, checked by a second speaker'],
      sourcesT: 'Source files and deployment guide · Deliverable 3',
      sourcesL: 'Everything is delivered editable: animations, text, voices, captions and the rendering tools. The guide covers distribution on the web, WhatsApp and community radio.',
      zip: 'Download the sources', guide: 'Read the deployment guide', rec: 'Language recording kit', embed: 'Embed a video on a website', copy: 'Copy', copied: 'Copied',
      foot: 'A Paruto Media production, with Paruto Music (studio) and Paruto Apps (interactive development).',
      min: 'min',
    },
  };

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const size = (b) => (b ? (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`) : '');
  const dur = (s) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '');
  const ids = ['approche', 'cadrage', 'revue', 'videos', 'audio', 'langues', 'sources'];
  const ARROW = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  // last word in italic serif, as on apps.paruto.com (punctuation stays upright)
  const serifLast = (t) => { const m = String(t).match(/^(.*\s)(\S+?)([.!?…:]*)$/); return m ? `${esc(m[1])}<em>${esc(m[2])}</em>${esc(m[3])}` : esc(t); };

  function pipeline(t) {
    const p = t.pipe, box = (x, y, w, h, a, b, strong) => `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${strong ? 'color-mix(in srgb, var(--a) 14%, transparent)' : 'var(--panel-2)'}" stroke="${strong ? 'var(--a)' : 'var(--line-2)'}" stroke-width="${strong ? 2 : 1.2}"/><text x="${x + 16}" y="${y + 30}" class="pt">${esc(a)}</text>${b ? `<text x="${x + 16}" y="${y + 54}" class="ps">${esc(b)}</text>` : ''}</g>`;
    const arrow = (x1, y1, x2, y2) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="var(--muted)" stroke-width="1.6" marker-end="url(#ar)"/>`;
    // two-line sub-labels are wrapped by hand
    const wrapS = (s, n) => { const w = s.split(' '); const l = []; let c = ''; w.forEach((x) => { if ((c + ' ' + x).trim().length > n && c) { l.push(c); c = x; } else c = (c + ' ' + x).trim(); }); l.push(c); return l; };
    const box2 = (x, y, w, a, b) => { const lines = wrapS(b, 34); return `<g><rect x="${x}" y="${y}" width="${w}" height="${48 + lines.length * 20}" rx="14" fill="var(--panel-2)" stroke="var(--line-2)" stroke-width="1.2"/><text x="${x + 16}" y="${y + 30}" class="pt">${esc(a)}</text>${lines.map((l, i) => `<text x="${x + 16}" y="${y + 54 + i * 20}" class="ps">${esc(l)}</text>`).join('')}</g>`; };
    return `<svg viewBox="0 0 1100 222" class="pipe" role="img" aria-label="${esc(t.approachT)}"><defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker></defs>
      ${box2(0, 20, 300, p[0], p[1])}${arrow(300, 60, 330, 60)}
      ${box2(334, 20, 230, p[2], p[3])}${arrow(564, 60, 594, 60)}
      ${box2(598, 20, 230, p[4], p[5])}${arrow(828, 60, 858, 60)}
      ${box2(862, 20, 236, p[6], p[7])}
      ${arrow(980, 112, 980, 150)}${arrow(980, 112, 660, 150)}${arrow(980, 112, 340, 150)}
      ${box(180, 154, 300, 60, p[8], '', true)}${box(500, 154, 300, 60, p[9], '', true)}${box(820, 154, 280, 60, p[10], '', true)}
    </svg>`;
  }

  function gantt(t) {
    // one bar per workstream on a 12-week grid; the three deliverables as gates
    const rows = [[1, 3], [4, 8], [4, 7], [6, 9], [9, 11], [12, 12]];
    const gates = [3, 8, 11];
    return `<div class="gantt panel">
      <div class="g-row g-head"><span></span><div class="g-track">${Array.from({ length: 12 }, (_, i) => `<span>${t.week}${i + 1}</span>`).join('')}</div></div>
      ${rows.map(([a, b], i) => `<div class="g-row"><span class="g-name">${esc(t.gantt[i])}</span><div class="g-track"><span class="g-bar${i === 5 ? ' slack' : ''}" style="grid-column:${a} / ${b + 1}"></span></div></div>`).join('')}
      <div class="g-row g-gates"><span></span><div class="g-track">${gates.map((g, k) => `<span class="g-gate" style="grid-column:${g} / ${g + 1}"><i>◆</i> ${esc(t.gates[k])}</span>`).join('')}</div></div>
    </div>`;
  }

  function videoCard(m, t) {
    const v = M.videos[m.id] || { files: {} }, f = (l, k) => (v.files[l] || {})[k];
    const dl = (k, label) => `<div class="dl-row"><span class="label">${label}</span>${['fr', 'en', 'pt'].map((l) => f(l, k) ? `<a class="chip" href="videos/${m.id}/${f(l, k).name}" download>${l.toUpperCase()}<small>${size(f(l, k).bytes)}</small></a>` : '').join('')}</div>`;
    const poster = f(lang, 'poster') || f('en', 'poster') || f('fr', 'poster');
    return `<article class="vcard panel reveal">
      <a class="vthumb" href="videos/${m.id}/?lang=${lang}">${poster ? `<img src="videos/${m.id}/${poster.name}" alt="" loading="lazy">` : ''}<span class="vplay glass"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg></span>${v.duration ? `<span class="vdur mono">${dur(v.duration)}</span>` : ''}</a>
      <div class="vbody">
        <p class="tag">${esc(m.tag[lang])}</p>
        <h3>${serifLast(m.title[lang])}</h3>
        <p class="vline">${esc(m.line[lang])}</p>
        <div class="vcta"><a class="btn primary" href="videos/${m.id}/?lang=${lang}">${esc(t.play)} ${ARROW}</a><a class="btn ghost" href="storyboards/${m.id}/?lang=${lang}">${esc(t.sb)}</a></div>
        <div class="dls">${dl('mp4', t.wa)}${dl('vertical', t.wav)}${dl('srt', t.srt)}</div>
      </div>
    </article>`;
  }

  const PLAY = '<svg class="i-play" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg><svg class="i-pause" viewBox="0 0 24 24"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>';
  function audioCard(ep, t) {
    const a = M.audio[ep.id] || {};
    const langs = ['fr', 'en', 'pt'].filter((l) => a[l]);
    const cur = langs.includes(lang) ? lang : langs[0] || 'fr';
    return `<article class="acard panel reveal" data-ep="${ep.id}">
      <p class="tag">${esc(t.ep)} ${ep.n} · ${esc(CAPS.show[lang])}</p>
      <h3>${serifLast(ep.title[lang].replace(/ \(.*\)$/, ''))}${/\(/.test(ep.title[lang]) ? ` <span class="dim">${esc(ep.title[lang].match(/\((.*)\)$/)[1])}</span>` : ''}</h3>
      <div class="seg alangs" style="--i:${langs.indexOf(cur)}">${langs.map((l) => `<button data-l="${l}" class="${l === cur ? 'on' : ''}">${l.toUpperCase()}</button>`).join('')}<span class="seg-thumb" aria-hidden="true"></span></div>
      <div class="aplayer"><button class="aplay" type="button" aria-label="Play">${PLAY}</button><div class="abar"><span></span></div><span class="atime mono">0:00 / ${dur(a[cur] && a[cur].duration)}</span><audio preload="none" src="${a[cur] ? `audio/${ep.id}/${a[cur].mp3.name}` : ''}"></audio></div>
      <div class="dl-row">${langs.map((l) => `<a class="chip" href="audio/${ep.id}/${a[l].mp3.name}" download>MP3 ${l.toUpperCase()}<small>${size(a[l].mp3.bytes)}</small></a><a class="chip" href="audio/${ep.id}/${a[l].wav.name}" download>${a[l].wav.name.split('.').pop().toUpperCase()} ${l.toUpperCase()}<small>${size(a[l].wav.bytes)}</small></a>`).join('')}</div>
      <details><summary>${esc(t.transcript)}</summary><div class="tx">${ep.lines.map((x) => `<p><b>${esc(CAPS.roles[x.who][cur])}</b> ${esc(x[cur])}</p>`).join('')}<p><i>${esc(CAPS.credit[cur])}</i></p></div></details>
    </article>`;
  }

  function render() {
    const t = T[lang];
    document.documentElement.lang = lang;
    document.title = lang === 'fr' ? 'Kit de sensibilisation SPS · Paruto Media' : 'SPS awareness kit · Paruto Media';
    $('#nav').innerHTML = t.nav.map((n, i) => `<a href="#${ids[i]}">${esc(n)}</a>`).join('');
    document.querySelectorAll('.lang-btn').forEach((b) => b.classList.toggle('on', b.dataset.lang === lang));
    const cue = CAPS.episodes.flatMap((ep) => ['fr', 'en', 'pt'].filter((l) => (M.audio[ep.id] || {})[l]).map((l) => {
      const c = (CUES[ep.id] || {})[l] || {}, a = M.audio[ep.id][l];
      return `<tr><td>${ep.n}. ${esc(ep.title[lang])}</td><td>${l.toUpperCase()}</td><td>${dur(a.duration || c.duration)}</td><td>« ${esc(ep.lines[0][l].split(' ').slice(0, 6).join(' ').replace(/[,.:;]$/, ''))}… »</td><td>« ${esc(c.out || '')} »</td><td><a href="audio/${ep.id}/${a.wav.name}" download>WAV</a> · <a href="audio/${ep.id}/${a.mp3.name}" download>MP3</a></td></tr>`;
    })).join('');
    const embedCode = `<iframe src="https://media.paruto.com/araa-sps/videos/ecowas/?embed&lang=${lang}" width="100%" style="aspect-ratio:16/10.6;border:0" allow="autoplay; fullscreen" title="${t === T.fr ? 'Le voyage de Moussa' : 'Moussa’s Journey'}"></iframe>`;

    // section heads in the apps style: a mono label, a big title whose last word is set in serif italic
    const head = (n, full, fallback, lead) => {
      const [title, deliv] = full.split(' · ');
      return `<header class="s-head reveal"><p class="label">(${String(n).padStart(2, '0')}) ${esc(deliv || fallback)}</p><h2>${serifLast(title + '.')}</h2>${lead ? `<p>${esc(lead)}</p>` : ''}</header>`;
    };
    $('#main').innerHTML = `
      <section class="page-head hero">
        <p class="eyebrow-pill"><span class="pulse" aria-hidden="true"></span>${esc(t.kicker)}</p>
        <h1>${serifLast(t.title)}</h1>
        <p class="lead">${esc(t.lead)}</p>
        <p class="note">${esc(t.note)}</p>
        <div class="deliv-list reveal">${t.rows.map(([a, b, h], i) => `<a class="deliv-row" href="${h}"><span class="dn mono">${String(i + 1).padStart(2, '0')}</span><b>${esc(a)}</b><span class="dd">${esc(b)}</span><span class="arrow" aria-hidden="true">${ARROW}</span></a>`).join('')}</div>
      </section>

      <section class="sec" id="approche">${head(1, t.approachT, t.nav[0], t.approachL)}<div class="panel pipe-panel reveal"><div class="pipe-wrap">${pipeline(t)}</div></div>
        <ul class="points">${t.points.map((p) => `<li class="panel reveal">${esc(p)}</li>`).join('')}</ul></section>

      <section class="sec" id="cadrage">${head(2, t.inceptionT, t.nav[1], t.inceptionL)}
        <ol class="phases">${t.phases.map(([a, b]) => `<li class="panel reveal"><b>${esc(a)}</b><span>${esc(b)}</span></li>`).join('')}</ol>
        <div class="reveal">${gantt(t)}</div>
        <div class="sbs">${MODULES.map((m) => `<a class="sbcard panel reveal" href="storyboards/${m.id}/?lang=${lang}">${(() => { const st = (M.videos[m.id] || {}).storyThumb, src = st && (typeof st === 'string' ? st : st[lang] || st.en); return src ? `<span class="sbimg"><img src="${src}" alt="" loading="lazy"></span>` : ''; })()}<span class="tag">${esc(m.tag[lang])}</span><b>${esc(m.title[lang])}</b><span class="go">${esc(t.storyboard)} ${ARROW}</span></a>`).join('')}</div>
      </section>

      <section class="sec" id="revue">${head(3, t.reviewT, t.nav[2], t.reviewL)}
        <div class="gates">${t.gateNames.map(([a, b, c]) => `<div class="gate panel reveal"><span class="gn mono">${esc(a)}</span><b>${esc(b)}</b><p>${esc(c)}</p></div>`).join('')}</div>
        <p class="label sub">${esc(t.logT)}</p>
        <div class="table-wrap reveal"><table class="log"><thead><tr>${t.logHead.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${t.log.map((r) => `<tr>${r.map((c, i) => `<td${i === 5 ? ` class="st ${r[5] === 'Traité' || r[5] === 'Done' ? 'ok' : 'wip'}"` : ''}>${i === 5 ? `<span class="dot"></span>` : ''}${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      </section>

      <section class="sec" id="videos">${head(4, t.videosT, t.nav[3], t.videosL)}
        <div class="vgrid">${MODULES.map((m) => videoCard(m, t)).join('')}</div></section>

      <section class="sec" id="audio">${head(5, t.audioT, t.nav[4], t.audioL)}
        <div class="agrid">${CAPS.episodes.map((ep) => audioCard(ep, t)).join('')}</div>
        <p class="label sub">${esc(t.cueT)}</p>
        <div class="table-wrap reveal"><table class="cue"><thead><tr>${t.cueHead.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${cue}</tbody></table></div>
      </section>

      <section class="sec" id="langues">${head(6, t.langsT, t.nav[5], t.langsL)}
        <div class="table-wrap reveal"><table class="ltable"><thead><tr>${t.langHead.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>
        ${LANGS.map((L, i) => i < 3 ? `<tr><td><b>${L.name}</b></td><td class="ok"><span class="dot"></span>${esc(t.done)}</td><td class="ok"><span class="dot"></span>${esc(t.done)}</td><td class="dim">—</td></tr>`
          : `<tr><td><b>${L.name}</b></td><td>${esc(t.scriptReady)}</td><td>${esc(t.scriptReady)}</td><td class="wip"><span class="dot"></span>${esc(t.toRecord)} · <a href="recording/?lang=${lang}">${esc(t.kit)}</a></td></tr>`).join('')}
        </tbody></table></div>
        <ul class="points">${t.method.map((p) => `<li class="panel reveal">${esc(p)}</li>`).join('')}</ul>
      </section>

      <section class="sec" id="sources">${head(7, t.sourcesT, t.nav[6], t.sourcesL)}
        <div class="srcs reveal">
          ${M.zip ? `<a class="btn primary" href="downloads/${M.zip.name}" download>${esc(t.zip)} <small>${size(M.zip.bytes)}</small></a>` : ''}
          <a class="btn ghost" href="guide/?lang=${lang}">${esc(t.guide)}</a>
          <a class="btn ghost" href="recording/?lang=${lang}">${esc(t.rec)}</a>
        </div>
        <p class="label sub">${esc(t.embed)}</p>
        <div class="code panel reveal"><pre><code>${esc(embedCode)}</code></pre><button class="copy chip" data-copy="${esc(embedCode).replace(/"/g, '&quot;')}">${esc(t.copy)}</button></div>
      </section>`;
    $('#allProjects').textContent = lang === 'fr' ? '← Tous les projets' : '← All projects';
    if (window.KIT) KIT.reveal();
    $('#foot').textContent = t.foot;

    document.querySelectorAll('.acard').forEach((card) => {
      const ep = CAPS.episodes.find((e) => e.id === card.dataset.ep), audio = card.querySelector('audio'), btn = card.querySelector('.aplay');
      const bar = card.querySelector('.abar span'), time = card.querySelector('.atime');
      const tick = () => { const d = audio.duration || 0; bar.style.width = d ? `${(audio.currentTime / d) * 100}%` : '0'; time.textContent = `${dur(audio.currentTime) || '0:00'} / ${dur(d) || time.textContent.split(' / ')[1]}`; };
      audio.addEventListener('timeupdate', tick); audio.addEventListener('loadedmetadata', tick);
      audio.addEventListener('play', () => { document.querySelectorAll('.acard audio').forEach((x) => x !== audio && x.pause()); card.classList.add('playing'); });
      audio.addEventListener('pause', () => card.classList.remove('playing'));
      audio.addEventListener('ended', () => { card.classList.remove('playing'); audio.currentTime = 0; });
      btn.addEventListener('click', () => (audio.paused ? audio.play().catch(() => {}) : audio.pause()));
      card.querySelector('.abar').addEventListener('click', (e) => { const r = e.currentTarget.getBoundingClientRect(); if (audio.duration) audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration; else audio.play().catch(() => {}); });
      card.querySelectorAll('.alangs button').forEach((b, i) => b.addEventListener('click', () => {
        const a = M.audio[ep.id][b.dataset.l], playing = !audio.paused;
        audio.src = `audio/${ep.id}/${a.mp3.name}`; if (playing) audio.play().catch(() => {});
        card.querySelectorAll('.alangs button').forEach((x) => x.classList.toggle('on', x === b)); card.querySelector('.alangs').style.setProperty('--i', i);
        time.textContent = `0:00 / ${dur(a.duration)}`; bar.style.width = '0';
        card.querySelector('.tx').innerHTML = ep.lines.map((x) => `<p><b>${esc(CAPS.roles[x.who][b.dataset.l])}</b> ${esc(x[b.dataset.l])}</p>`).join('') + `<p><i>${esc(CAPS.credit[b.dataset.l])}</i></p>`;
      }));
    });
    document.querySelectorAll('.copy').forEach((b) => b.addEventListener('click', () => { navigator.clipboard.writeText(b.dataset.copy.replace(/&lt;/g, '<').replace(/&amp;/g, '&')).then(() => { b.textContent = t.copied; setTimeout(() => (b.textContent = t.copy), 1500); }); }));
  }

  document.querySelectorAll('.lang-btn').forEach((b) => b.addEventListener('click', () => { lang = b.dataset.lang; store.set('kit-lang', lang); render(); }));
  render();
})();

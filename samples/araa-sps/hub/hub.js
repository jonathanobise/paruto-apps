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
    { id: 'ecowas', slug: 'moussa', tag: { fr: 'Normes CEDEAO · C/REG.21/11/10', en: 'ECOWAS standards · C/REG.21/11/10' }, title: { fr: 'Le voyage de Moussa', en: 'Moussa’s Journey' }, line: { fr: 'Vétérinaire officiel, certificat vétérinaire, postes frontaliers, transhumance et alertes.', en: 'Official veterinarian, veterinary certificate, border posts, transhumance and alerts.' } },
    { id: 'waemu', slug: 'koffi', tag: { fr: 'Normes UEMOA · Règlement 007/2007', en: 'WAEMU standards · Regulation 007/2007' }, title: { fr: 'La boucherie de Koffi', en: 'Koffi’s Butcher Shop' }, line: { fr: 'Responsabilité de chaque acteur, registres, maladies à déclarer et alertes, du troupeau à l’assiette.', en: 'Everyone’s responsibility, records, notifiable diseases and alerts, from herd to plate.' } },
  ];
  const LANGS = [
    { code: 'fr', name: 'Français' }, { code: 'en', name: 'English' }, { code: 'pt', name: 'Português' },
    { code: 'ha', name: 'Hausa' }, { code: 'bm', name: 'Bamanankan (Bambara)' }, { code: 'wo', name: 'Wolof' }, { code: 'yo', name: 'Yorùbá' }, { code: 'ff', name: 'Fulfulde (Peul)' },
  ];

  const T = {
    fr: {
      heroT: 'Kit de *sensibilisation* SPS',
      deck: 'Un échantillon concret de chaque livrable de l’appel : vidéos interactives sur les trois cadres, versions WhatsApp, capsules radio, storyboards, sources et guide de déploiement. Ouvrez-le, jouez-le, téléchargez-le.',
      ctaPlay: 'Jouer un module', ctaAll: 'Tous les livrables', stageChip: 'Trois modules · environ 7 min chacun',
      stats: [['vidéos interactives', 'd’environ 7 min, en français, anglais et portugais'], ['versions WhatsApp', 'en 16:9 et en vertical 9:16, sous-titres incrustés'], ['capsules radio', 'de 7 à 8 min, MP3 et FLAC pour la radio'], ['langues', '3 produites, 5 prêtes à enregistrer']],
      noteShort: 'Contenus de démonstration, à valider par les experts techniques de l’ARAA. La narration est pour l’instant une voix de travail :', noteLink: 'comment les voix sont produites',
      delivL: 'L’appel, point par point',
      facts: ['11 chapitres', '3 choix à embranchements', 'quiz de 6 questions'], dlT: 'Téléchargements', dlSub: 'WhatsApp 16:9 et 9:16, sous-titres',
      cueMore: 'fichiers', voicesT: 'À propos des voix', produced: 'Voix et sous-titres produits', ready: 'Script prêt, à enregistrer par des locuteurs natifs',
      nav: ['Approche', 'Cadrage · L1', 'Revue · L2', 'Vidéos', 'Audio', 'Langues', 'Sources et guide'],
      kicker: 'Réponse à l’AMI028-2026 de l’ARAA · Paruto Media',
      note: 'Contenus de démonstration, à valider par les experts techniques de l’ARAA. La narration en français, anglais et portugais est ici une voix de travail. En production, la phase de revue utilise des voix de synthèse haute fidélité, au rendu naturel : un laboratoire de pointe pour le français, l’anglais et le portugais, et la meilleure option trouvée pour chaque langue locale, avec un enregistrement en studio là où aucune voix de synthèse n’est assez bonne. Elles sont dirigées au studio Paruto Music et vérifiées par un locuteur natif. Après les avoir écoutées, l’ARAA décide, langue par langue, à la validation des scripts finaux, si le kit final les garde ou s’il est enregistré avec des voix humaines. Les trois modules sont en version complète, la durée que l’ARAA demande : les vidéos durent de 7 min 03 s à 7 min 24 s, et les capsules radio environ 7 minutes chacune.',
      tableHead: ['Livrable demandé', 'Ce que vous trouverez ici'],
      rows: [
        ['L1 · Rapport de démarrage et storyboards validés', 'Méthodologie, plan de travail sur 12 semaines, storyboards complets des trois vidéos avec la carte des embranchements', '#cadrage'],
        ['L2 · Première version des contenus', 'Les trois étapes de validation et le journal des commentaires', '#revue'],
        ['L3 · Vidéos interactives : normes internationales (OMC, OMSA, FAO)', '« Le marché d’Aïcha », version complète de 7 min 24 s, interactive, en français, anglais et portugais', '#videos'],
        ['L3 · Vidéos interactives : normes CEDEAO', '« Le voyage de Moussa », version complète de 7 min 03 s, interactive, en français, anglais et portugais', '#videos'],
        ['L3 · Vidéos interactives : normes UEMOA', '« La boucherie de Koffi », version complète de 7 min 04 s, interactive, en français, anglais et portugais', '#videos'],
        ['L3 · Versions légères pour WhatsApp', 'MP4 au format 16:9 et vertical 9:16, sous-titres incrustés et fichiers SRT', '#videos'],
        ['L3 · Capsules audio radio / podcast (trois cadres)', 'Trois épisodes de « Santé animale, marchés ouverts », en MP3 et en FLAC sans perte pour la radio, avec fiche de diffusion', '#audio'],
        ['L3 · Huit langues (3 officielles + 5 locales)', 'Français, anglais, portugais produits ; kit d’enregistrement pour le haoussa, le bambara, le wolof, le yoruba et le peul', '#langues'],
        ['L3 · Fichiers sources et guide de déploiement', 'Sources éditables à télécharger et guide pour le web, WhatsApp et les radios communautaires', '#sources'],
      ],
      approachT: 'Une seule animation, plusieurs voix',
      approachL: 'Chaque histoire est animée une fois, presque sans texte à l’écran. Une nouvelle langue ne demande que la voix et les sous-titres : les 48 contenus restent cohérents, dans les délais et dans le budget.',
      pipe: ['Textes de référence', 'Accord SPS, Codex, OMSA, CIPV, C/REG.21/11/10, Règlement 007/2007', 'Scénarios et storyboards', 'Validés avec les experts de l’ARAA', 'Animation maître', 'Décors et personnages sans texte', 'Voix et sous-titres', '8 langues, glossaire SPS validé', 'Vidéo interactive web', 'MP4 WhatsApp 16:9 et 9:16', 'Capsules radio MP3 et FLAC'],
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
      log: [['1', 'L2 · Vidéo CEDEAO', '00:40', 'Employer partout « certificat vétérinaire », le terme du règlement.', 'Terme harmonisé dans les trois langues et dans le glossaire.', 'Traité'], ['2', 'L2 · Capsule UEMOA', '00:35', 'Rappeler que le contrôle relève des services officiels.', 'Réplique ajoutée au vétérinaire.', 'Traité'], ['3', 'L2 · Vidéo internationale', 'Quiz, Q3', 'Revoir la formulation de la bonne réponse sur l’Accord SPS.', 'Proposition envoyée à l’expert SPS.', 'En cours']],
      videosT: 'Vidéos interactives · Livrable 3',
      videosL: 'Trois modules, un par cadre. Chacun : une histoire animée d’environ 7 minutes, trois choix à embranchements avec leurs conséquences et un quiz de six questions. Les versions WhatsApp montrent les bonnes réponses.',
      play: 'Jouer le module', wa: 'WhatsApp 16:9', wav: 'WhatsApp 9:16', srt: 'Sous-titres', sb: 'Storyboard',
      audioT: 'Capsules audio · Livrable 3',
      audioL: 'Une émission, « Santé animale, marchés ouverts », un épisode par cadre : une animatrice et un vétérinaire, un jingle, trois messages clés. MP3 pour le podcast et WhatsApp, version radio normalisée (EBU R128, −23 LUFS) en FLAC : le son d’un WAV, sans perte, dans un fichier plus léger.',
      ep: 'Épisode', transcript: 'Transcription', cueT: 'Fiche de diffusion', cueHead: ['Épisode', 'Langue', 'Durée', 'Début', 'Fin', 'Fichiers'],
      langsT: 'Huit langues · Livrable 3',
      langsL: 'Français, anglais et portugais sont produits ici. Les cinq langues locales sont traduites par des locuteurs natifs, à partir d’un glossaire SPS validé par les experts, puis doublées : voix de synthèse au rendu naturel là où il en existe une de qualité, enregistrement en studio sinon, ou voix humaines partout si l’ARAA le choisit.',
      langHead: ['Langue', 'Vidéos (voix et sous-titres)', 'Capsules audio', 'État'],
      done: 'Produit (voix de travail ; voix de synthèse haute fidélité en production)', scriptReady: 'Script prêt', toRecord: 'Enregistrement par locuteurs natifs', kit: 'Kit d’enregistrement',
      method: ['Glossaire SPS par langue, validé avec les experts de l’ARAA', 'Traduction par un locuteur natif, rétro-traduction des passages clés', 'Voix de synthèse ou enregistrement en studio, relecture par un second locuteur'],
      sourcesT: 'Fichiers sources et guide de déploiement · Livrable 3',
      sourcesL: 'Tout est livré éditable : animations, textes, voix, sous-titres et outils de rendu. Le guide explique la diffusion sur le web, WhatsApp et les radios communautaires.',
      zip: 'Télécharger les sources', guide: 'Lire le guide de déploiement', rec: 'Kit d’enregistrement des langues', embed: 'Intégrer une vidéo sur un site', copy: 'Copier', copied: 'Copié',
      foot: 'Une production Paruto Media, avec Paruto Music (studio) et Paruto Apps (développement interactif).',
      min: 'min',
    },
    en: {
      heroT: 'SPS awareness *kit*',
      deck: 'A working sample of every deliverable in the call: interactive videos on the three frameworks, WhatsApp editions, radio capsules, storyboards, sources and a deployment guide. Open it, play it, download it.',
      ctaPlay: 'Play a module', ctaAll: 'Every deliverable', stageChip: 'Three modules · about 7 min each',
      stats: [['interactive videos', 'about 7 minutes each, in French, English and Portuguese'], ['WhatsApp editions', 'in 16:9 and vertical 9:16, with burned-in captions'], ['radio capsules', '7 to 8 minutes, MP3 and FLAC for radio'], ['languages', '3 produced, 5 ready to record']],
      noteShort: 'Demonstration content, to be validated by ARAA’s technical experts. The narration is a scratch voice for now:', noteLink: 'how the voices are produced',
      delivL: 'The call, item by item',
      facts: ['11 chapters', '3 branching choices', '6-question quiz'], dlT: 'Downloads', dlSub: 'WhatsApp 16:9 and 9:16, subtitles',
      cueMore: 'files', voicesT: 'About the voices', produced: 'Voice and captions produced', ready: 'Script ready, to be recorded by native speakers',
      nav: ['Approach', 'Inception · D1', 'Review · D2', 'Videos', 'Audio', 'Languages', 'Sources & guide'],
      kicker: 'Response to ARAA call AMI028-2026 · Paruto Media',
      note: 'Demonstration content, to be validated by ARAA’s technical experts. The French, English and Portuguese narration here is a scratch voice. In production, the review phase uses high-fidelity, natural-sounding AI voices: a frontier lab for French, English and Portuguese, and the best option found for each local language, with studio recording where no AI voice is good enough. They are directed at the Paruto Music studio and checked by a native speaker. Having heard them, ARAA decides language by language, at final script approval, whether the final kit keeps them or is recorded live with human voices. All three modules are full length, as ARAA asks: the videos run 7 min 03 s to 7 min 24 s, and the radio capsules about 7 minutes each.',
      tableHead: ['Deliverable in the call', 'What you’ll find here'],
      rows: [
        ['D1 · Inception report and validated storyboards', 'Method, 12-week workplan, full storyboards of the three videos with their branching maps', '#cadrage'],
        ['D2 · First draft of content', 'The three validation gates and the feedback log', '#revue'],
        ['D3 · Interactive videos: international standards (WTO, WOAH, FAO)', '“Aïcha’s Market”, full length (7 min 24 s), interactive, in French, English and Portuguese', '#videos'],
        ['D3 · Interactive videos: ECOWAS standards', '“Moussa’s Journey”, full length (7 min 03 s), interactive, in French, English and Portuguese', '#videos'],
        ['D3 · Interactive videos: WAEMU standards', '“Koffi’s Butcher Shop”, full length (7 min 04 s), interactive, in French, English and Portuguese', '#videos'],
        ['D3 · Light versions for WhatsApp', 'MP4 in 16:9 and vertical 9:16, burned-in captions and SRT files', '#videos'],
        ['D3 · Radio / podcast audio capsules (three frameworks)', 'Three episodes of “Healthy Animals, Open Markets”, MP3, and lossless FLAC for radio, with a cue sheet', '#audio'],
        ['D3 · Eight languages (3 official + 5 local)', 'French, English, Portuguese produced; recording kit for Hausa, Bambara, Wolof, Yoruba and Fulani', '#langues'],
        ['D3 · Source files and deployment guide', 'Editable sources to download and a guide for web, WhatsApp and community radio', '#sources'],
      ],
      approachT: 'One master, many voices',
      approachL: 'Each story is animated once, with almost no text on screen. A new language only needs voice and captions, so all 48 assets stay consistent, on time and on budget.',
      pipe: ['Reference texts', 'SPS Agreement, Codex, WOAH, IPPC, C/REG.21/11/10, Regulation 007/2007', 'Scripts and storyboards', 'Validated with ARAA’s experts', 'Master animation', 'Sets and characters without text', 'Voices and captions', '8 languages, validated SPS glossary', 'Interactive web video', 'WhatsApp MP4, 16:9 and 9:16', 'Radio capsules, MP3 and FLAC'],
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
      log: [['1', 'D2 · ECOWAS video', '00:40', 'Use “veterinary certificate”, the regulation’s term, throughout.', 'Term aligned in all three languages and the glossary.', 'Done'], ['2', 'D2 · WAEMU capsule', '00:35', 'Say that checks are carried out by the official services.', 'Line added for the veterinarian.', 'Done'], ['3', 'D2 · International video', 'Quiz, Q3', 'Rework the wording of the correct answer on the SPS Agreement.', 'Proposal sent to the SPS expert.', 'In progress']],
      videosT: 'Interactive videos · Deliverable 3',
      videosL: 'Three modules, one per framework. Each has an animated story of about 7 minutes, three branching choices with consequences, and a six-question quiz. The WhatsApp versions show the right answers.',
      play: 'Play the module', wa: 'WhatsApp 16:9', wav: 'WhatsApp 9:16', srt: 'Subtitles', sb: 'Storyboard',
      audioT: 'Audio capsules · Deliverable 3',
      audioL: 'One programme, “Healthy Animals, Open Markets”, with an episode per framework: a host and a veterinarian, a jingle, three key messages. MP3 for podcast and WhatsApp, a loudness-normalised radio version (EBU R128, −23 LUFS) as FLAC: WAV audio, lossless, in a smaller file.',
      ep: 'Episode', transcript: 'Transcript', cueT: 'Cue sheet', cueHead: ['Episode', 'Language', 'Length', 'In-cue', 'Out-cue', 'Files'],
      langsT: 'Eight languages · Deliverable 3',
      langsL: 'French, English and Portuguese are produced here. The five local languages are translated by native speakers from an SPS glossary validated by the experts, then voiced: natural-sounding AI voices where a quality one exists, studio recordings otherwise, or human voices throughout if ARAA chooses them.',
      langHead: ['Language', 'Videos (voice and captions)', 'Audio capsules', 'Status'],
      done: 'Produced (scratch voice; high-fidelity AI voice in production)', scriptReady: 'Script ready', toRecord: 'Recorded by native speakers', kit: 'Recording kit',
      method: ['An SPS glossary per language, validated with ARAA’s experts', 'Translation by a native speaker, back-translation of key passages', 'AI voice or studio recording, checked by a second speaker'],
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
  // *word* picks the serif word explicitly
  const serifMark = (t) => esc(t).replace(/\*([^*]+)\*/, '<em>$1</em>');

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
    return `<article class="vcard panel reveal">
      <a class="vthumb" href="videos/${m.id}/?lang=${lang}"><img src="hub/img/${m.id}-${lang}.jpg" alt="" loading="lazy">
        <span class="vlangs mono">FR · EN · PT</span><span class="vplay glass"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg></span>${v.duration ? `<span class="vdur mono">${dur(v.duration)}</span>` : ''}</a>
      <div class="vbody">
        <p class="tag">${esc(m.tag[lang])}</p>
        <h3>${serifLast(m.title[lang])}</h3>
        <p class="vline">${esc(m.line[lang])}</p>
        <ul class="facts">${t.facts.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <div class="vcta"><a class="btn primary" href="videos/${m.id}/?lang=${lang}">${esc(t.play)} ${ARROW}</a><a class="btn ghost" href="storyboards/${m.id}/?lang=${lang}">${esc(t.sb)}</a></div>
        <details class="more"><summary><b>${esc(t.dlT)}</b> <span>${esc(t.dlSub)}</span></summary><div class="dls">${dl('mp4', t.wa)}${dl('vertical', t.wav)}${dl('srt', t.srt)}</div></details>
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
    const cueN = (cue.match(/<tr>/g) || []).length;
    const embedCode = `<iframe src="https://media.paruto.com/araa-sps/videos/ecowas/?embed&lang=${lang}" width="100%" style="aspect-ratio:16/10.6;border:0" allow="autoplay; fullscreen" title="${t === T.fr ? 'Le voyage de Moussa' : 'Moussa’s Journey'}"></iframe>`;

    // the hero's numbers, all counted from the kit itself
    const nWa = MODULES.reduce((n, m) => n + ['fr', 'en', 'pt'].reduce((k, l) => k + ['mp4', 'vertical'].filter((x) => ((M.videos[m.id] || { files: {} }).files[l] || {})[x]).length, 0), 0);
    const nCaps = CAPS.episodes.reduce((n, ep) => n + Object.keys(M.audio[ep.id] || {}).length, 0);
    const stats = [[MODULES.length, t.stats[0]], [nWa, t.stats[1]], [nCaps, t.stats[2]], [LANGS.length, t.stats[3]]];
    // section heads in the apps style: a mono label, a big title whose last word is set in serif italic
    const head = (n, full, fallback, lead) => {
      const [title, deliv] = full.split(' · ');
      return `<header class="s-head reveal"><p class="label">(${String(n).padStart(2, '0')}) ${esc(deliv || fallback)}</p><h2>${serifLast(title + '.')}</h2>${lead ? `<p>${esc(lead)}</p>` : ''}</header>`;
    };
    $('#main').innerHTML = `
      <section class="page-head hero">
        <div class="hero-copy">
          <p class="eyebrow-pill rise"><span class="pulse" aria-hidden="true"></span>${esc(t.kicker)}</p>
          <h1 class="rise">${serifMark(t.heroT)}</h1>
          <p class="lead rise">${esc(t.deck)}</p>
          <div class="hero-cta rise"><a class="btn primary big" href="videos/international/?lang=${lang}">${esc(t.ctaPlay)} ${ARROW}</a><a class="btn ghost big" href="#livrables">${esc(t.ctaAll)}</a></div>
        </div>
        <div class="stage-wrap rise">
          <div class="stage">
            <a class="screen" href="#videos" aria-label="${esc(t.stageChip)}"><video id="teaser" muted loop playsinline preload="metadata" poster="${lang === 'fr' ? 'teaser-fr.jpg' : 'teaser.jpg'}" aria-hidden="true"></video><span class="screen-sheen" aria-hidden="true"></span></a>
            <a class="now glass" href="#videos"><span class="k">${esc(t.stageChip)}</span><span class="go">${ARROW}</span></a>
            <div class="floor" aria-hidden="true"></div>
          </div>
        </div>
        <dl class="stats reveal">${stats.map(([n, [a, b]]) => `<div><dt><b data-count="${n}">${n}</b> ${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl>
        <p class="note-line reveal"><span class="dot" aria-hidden="true"></span>${esc(t.noteShort)} <a href="#voices">${esc(t.noteLink)}</a>.</p>
      </section>

      <section class="sec deliv" id="livrables">
        <p class="label">${esc(t.delivL)}</p>
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
        <details class="more fold reveal"><summary><b>${esc(t.cueT)}</b> <span>${cueN} ${esc(t.cueMore)}</span></summary>
        <div class="table-wrap"><table class="cue"><thead><tr>${t.cueHead.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${cue}</tbody></table></div></details>
      </section>

      <section class="sec" id="langues">${head(6, t.langsT, t.nav[5], t.langsL)}
        <div class="langs">${LANGS.map((L, i) => `<div class="lang panel reveal${i < 3 ? ' done' : ''}"><span class="code mono">${L.code.toUpperCase()}</span><b>${esc(L.name)}</b>
          <span class="state"><span class="dot" aria-hidden="true"></span>${esc(i < 3 ? t.produced : t.ready)}</span>${i < 3 ? '' : `<a class="kitlink" href="recording/?lang=${lang}">${esc(t.kit)} ${ARROW}</a>`}</div>`).join('')}</div>
        <div class="voices panel reveal" id="voices"><p class="label">${esc(t.voicesT)}</p><p>${esc(t.note)}</p></div>
        <ul class="points">${t.method.map((p) => `<li class="panel reveal">${esc(p)}</li>`).join('')}</ul>
      </section>

      <section class="sec" id="sources">${head(7, t.sourcesT, t.nav[6], t.sourcesL)}
        <div class="srcs panel reveal">
          ${M.zip ? `<a class="btn primary" href="downloads/${M.zip.name}" download>${esc(t.zip)} <small>${size(M.zip.bytes)}</small></a>` : ''}
          <a class="btn ghost" href="guide/?lang=${lang}">${esc(t.guide)}</a>
          <a class="btn ghost" href="recording/?lang=${lang}">${esc(t.rec)}</a>
        </div>
        <p class="label sub">${esc(t.embed)}</p>
        <div class="code panel reveal"><pre><code>${esc(embedCode)}</code></pre><button class="copy chip" data-copy="${esc(embedCode).replace(/"/g, '&quot;')}">${esc(t.copy)}</button></div>
      </section>`;
    // the teaser plays muted while the stage is on screen; a still for reduced motion
    const video = $('#teaser'), still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!still) {
      video.src = lang === 'fr' ? 'teaser-fr.mp4' : 'teaser.mp4';
      new IntersectionObserver(([e]) => (e.isIntersecting ? video.play().catch(() => {}) : video.pause()), { threshold: 0.2 }).observe(video);
    }
    // the hero's numbers count up once, when they come into view
    const countUp = (el) => { const n = +el.dataset.count, t0 = performance.now(); const step = (now) => { const p = Math.min(1, (now - t0) / 1100); el.textContent = Math.round(n * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); };
    if (!still) { const nums = document.querySelectorAll('[data-count]'); nums.forEach((el) => (el.textContent = '0')); const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { countUp(e.target); io.unobserve(e.target); } }), { threshold: 0.6 }); nums.forEach((el) => io.observe(el)); }
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

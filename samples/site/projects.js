// Everything on the media.paruto.com front page, in English and French. Add a proposal by
// adding an object to `projects` (newest first); its folder sits next to this one, e.g.
// samples/araa-sps/. The last word of each headline is set in italic serif; in a project
// title, *word* picks the italic word instead.
window.MEDIA_SITE = {
  site: {
    eyebrow: { en: 'Paruto Media · Proposals and sample work', fr: 'Paruto Media · Propositions et réalisations' },
    headline: { en: 'Communication for development, made to be understood.', fr: 'La communication pour le développement, faite pour être comprise.' },
    sub: {
      en: 'Every project here answers a call for proposals with working samples of what we would deliver: real videos, real audio, real tools, ready to open.',
      fr: 'Chaque projet répond à un appel d’offres avec des échantillons concrets de ce que nous livrerions : de vraies vidéos, de vrais sons, de vrais outils, prêts à ouvrir.',
    },
    nav: { en: ['Projects', 'Capabilities', 'Approach'], fr: ['Projets', 'Savoir-faire', 'Méthode'] },
    contact: { en: 'Contact', fr: 'Contact' },
    nowShowing: { en: 'Now showing', fr: 'À l’affiche' },
    projectsLabel: { en: 'Projects', fr: 'Projets' },
    projectsTitle: { en: 'Selected proposals.', fr: 'Propositions choisies.' },
    projectsLead: { en: 'Each proposal is a working site: open it, play it, download it.', fr: 'Chaque proposition est un site qui fonctionne : ouvrez-le, jouez-le, téléchargez-le.' },
    next: {
      title: { en: 'The next proposal', fr: 'La prochaine proposition' },
      text: { en: 'The next call we answer joins this page, with its own working samples.', fr: 'Le prochain appel auquel nous répondrons rejoindra cette page, avec ses propres échantillons.' },
    },
    capLabel: { en: 'Capabilities', fr: 'Savoir-faire' },
    capTitle: { en: 'What we make.', fr: 'Ce que nous faisons.' },
    appLabel: { en: 'Approach', fr: 'Méthode' },
    appTitle: { en: 'From the call to the field.', fr: 'De l’appel au terrain.' },
    ctaLabel: { en: 'Contact', fr: 'Contact' },
    ctaTitle: { en: 'Have a call for proposals? Let’s talk.', fr: 'Un appel d’offres en vue ? Parlons-en.' },
    ctaButton: { en: 'Visit parutomedia.com', fr: 'Voir parutomedia.com' },
    ctaHref: 'https://parutomedia.com',
    familyLabel: { en: 'The Paruto family', fr: 'La famille Paruto' },
    footer: { en: '© Paruto Media. Samples are for evaluation and are validated with each client.', fr: '© Paruto Media. Les échantillons servent à l’évaluation et sont validés avec chaque client.' },
    meta: { client: { en: 'Client', fr: 'Client' }, call: { en: 'Call', fr: 'Appel' }, programme: { en: 'Programme', fr: 'Programme' }, year: { en: 'Year', fr: 'Année' } },
  },

  projects: [
    {
      id: 'araa-sps', href: 'araa-sps/', year: '2026', call: 'AMI028-2026', programme: 'PACBAO-2 · SDC',
      accent: '#E9A14B', accent2: '#1F7A6E',
      status: { en: 'Proposal', fr: 'Proposition' },
      client: { en: 'ARAA, the ECOWAS Regional Agency for Agriculture and Food', fr: 'ARAA, Agence régionale pour l’agriculture et l’alimentation de la CEDEAO' },
      kicker: { en: 'Interactive video · Radio · WhatsApp · 8 languages', fr: 'Vidéo interactive · Radio · WhatsApp · 8 langues' },
      title: { en: 'SPS awareness *kit*', fr: 'Kit de *sensibilisation* SPS' },
      summary: {
        en: 'Interactive videos, WhatsApp editions and radio capsules that explain the animal-health and food-safety rules of West Africa’s livestock trade, across the international, ECOWAS and WAEMU frameworks, with a sample of every deliverable in the call.',
        fr: 'Vidéos interactives, versions WhatsApp et capsules radio qui expliquent les règles sanitaires du commerce du bétail en Afrique de l’Ouest, pour les cadres international, CEDEAO et UEMOA, avec un échantillon de chaque livrable de l’appel.',
      },
      stats: [
        { n: 3, l: { en: 'interactive videos', fr: 'vidéos interactives' } },
        { n: 18, l: { en: 'WhatsApp editions', fr: 'versions WhatsApp' } },
        { n: 9, l: { en: 'radio capsules', fr: 'capsules radio' } },
        { n: 8, l: { en: 'languages planned', fr: 'langues prévues' } },
      ],
      teaser: 'araa-sps/teaser.mp4', poster: 'araa-sps/teaser.jpg',
      gallery: [
        { src: 'araa-sps/storyboards/international/img/hygiene-2.jpg', href: 'araa-sps/videos/international/', label: { en: 'Aïcha’s Market · International', fr: 'Le marché d’Aïcha · International' } },
        { src: 'araa-sps/storyboards/ecowas/img/vet-2.jpg', href: 'araa-sps/videos/ecowas/', label: { en: 'Moussa’s Journey · ECOWAS', fr: 'Le voyage de Moussa · CEDEAO' } },
        { src: 'araa-sps/storyboards/waemu/img/chain-2.jpg', href: 'araa-sps/videos/waemu/', label: { en: 'Koffi’s Butcher Shop · WAEMU', fr: 'La boucherie de Koffi · UEMOA' } },
      ],
      open: { en: 'Open the kit', fr: 'Ouvrir le kit' },
      play: { en: 'Play a module', fr: 'Jouer un module' }, playHref: 'araa-sps/videos/ecowas/',
    },
  ],

  capabilities: [
    { icon: 'play', t: { en: 'Interactive video', fr: 'Vidéo interactive' }, d: { en: 'Branching stories, choices with consequences and quizzes that run in any browser.', fr: 'Histoires à embranchements, choix et conséquences, quiz, dans tout navigateur.' } },
    { icon: 'motion', t: { en: 'Animation and motion design', fr: 'Animation et motion design' }, d: { en: '2D illustration built language-neutral, so one master serves every language.', fr: 'Illustration 2D sans texte, pour qu’une seule animation serve toutes les langues.' } },
    { icon: 'radio', t: { en: 'Radio and podcast', fr: 'Radio et podcast' }, d: { en: 'Broadcast-ready capsules recorded at the Paruto Music studio, with cue sheets.', fr: 'Capsules prêtes à diffuser, enregistrées au studio Paruto Music, avec fiches de diffusion.' } },
    { icon: 'voice', t: { en: 'Many languages', fr: 'Multilingue' }, d: { en: 'Translation, glossaries, native voices and subtitles, from official to local languages.', fr: 'Traduction, glossaires, voix natives et sous-titres, des langues officielles aux langues locales.' } },
    { icon: 'phone', t: { en: 'Built for phones', fr: 'Pensé pour le téléphone' }, d: { en: 'Light WhatsApp editions in 16:9 and 9:16, and pages that work offline.', fr: 'Versions WhatsApp légères en 16:9 et 9:16, et pages qui fonctionnent hors ligne.' } },
    { icon: 'board', t: { en: 'Storyboards and sources', fr: 'Storyboards et sources' }, d: { en: 'Shot-by-shot storyboards, editable sources and a deployment guide with every kit.', fr: 'Storyboards plan par plan, sources éditables et guide de déploiement avec chaque kit.' } },
  ],

  approach: [
    { t: { en: 'Read the call', fr: 'Lire l’appel' }, d: { en: 'The texts, the audiences and every deliverable, mapped before a frame is drawn.', fr: 'Les textes, les publics et chaque livrable, analysés avant la première image.' } },
    { t: { en: 'Build real samples', fr: 'Produire de vrais échantillons' }, d: { en: 'A working example of each deliverable, so evaluators can see and test it.', fr: 'Un exemple concret de chaque livrable, que les évaluateurs voient et testent.' } },
    { t: { en: 'One master, many voices', fr: 'Une animation, plusieurs voix' }, d: { en: 'Animate once, then voice and caption each language from one script.', fr: 'Animer une fois, puis voix et sous-titres pour chaque langue, depuis un seul script.' } },
    { t: { en: 'Deploy and hand over', fr: 'Déployer et transmettre' }, d: { en: 'Web, WhatsApp and radio, with the guide and the sources to keep it alive.', fr: 'Web, WhatsApp et radio, avec le guide et les sources pour le faire vivre.' } },
  ],

  family: [
    { name: 'Paruto', logo: 'site/logos/paruto-logo', url: 'https://paruto.com', note: { en: 'One group. Many possibilities.', fr: 'Un groupe. De nombreuses possibilités.' } },
    { name: 'Paruto Music', logo: 'site/logos/paruto-music-logo', url: 'https://parutomusic.com', note: { en: 'Recording studio and record label', fr: 'Studio d’enregistrement et label' } },
    { name: 'Paruto Apps', url: 'https://apps.paruto.com', note: { en: 'Interactive products and web platforms', fr: 'Produits interactifs et plateformes web' } },
  ],
};

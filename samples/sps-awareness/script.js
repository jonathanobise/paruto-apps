// All words in the sample, in every language. The player, the MP4 renderer and the
// subtitle/voice-over exporter all read this one file, so a new language is one new key.
window.SPS_SCRIPT = {
  languages: { fr: 'Français', en: 'English', pt: 'Português' },

  ui: {
    fr: {
      demo: 'Démo interactive', start: 'Commencer', chooseLang: 'Langue',
      title: 'Le voyage de Moussa', subtitle: 'Les règles sanitaires du commerce du bétail en Afrique de l’Ouest',
      pause: 'Pause', play: 'Lecture', restart: 'Recommencer', captions: 'Sous-titres',
      back: 'Revenir au choix', next: 'Suivant', continue: 'Continuer',
      correct: 'Bonne réponse', wrong: 'Pas tout à fait',
      pauseHint: 'Mettez la vidéo en pause et choisissez : 1 ou 2 ?',
      quiz: 'Quiz', score: 'Votre score', replay: 'Rejouer',
      chapters: ['Départ', 'Risques', 'Choix', 'Vétérinaire', 'Frontière', 'Quiz', 'Réflexes'],
      nameTag: 'Moussa · commerçant de bétail', herd: '× 40 bœufs',
      cert: 'CERTIFICAT ZOOSANITAIRE INTERNATIONAL', certShort: 'Certificat zoosanitaire', vaccine: 'Vacciné', examined: 'Examiné',
      border: 'FRONTIÈRE', stop: 'ARRÊT', blocked: 'Troupeau bloqué', wait: 'Attente · contrôles · quarantaine',
      receipt: 'REÇU D’ACHAT', valid: 'VALIDE',
      diseases: ['Péripneumonie contagieuse bovine', 'Fièvre aphteuse', 'Peste des petits ruminants'],
      recapTitle: 'Trois réflexes',
      recap: ['Vétérinaire officiel avant le départ', 'Le certificat voyage avec le troupeau', 'Contrôle sanitaire à la frontière'],
      endLine: 'Échantillon de démonstration · contenu à valider par les experts techniques',
      endBy: 'Une production',
    },
    en: {
      demo: 'Interactive demo', start: 'Start', chooseLang: 'Language',
      title: 'Moussa’s Journey', subtitle: 'Animal health rules for the livestock trade in West Africa',
      pause: 'Pause', play: 'Play', restart: 'Restart', captions: 'Captions',
      back: 'Back to the choice', next: 'Next', continue: 'Continue',
      correct: 'Correct', wrong: 'Not quite',
      pauseHint: 'Pause the video and choose: 1 or 2?',
      quiz: 'Quiz', score: 'Your score', replay: 'Play again',
      chapters: ['Setting off', 'Risks', 'Choice', 'Veterinarian', 'Border', 'Quiz', 'Key habits'],
      nameTag: 'Moussa · livestock trader', herd: '× 40 cattle',
      cert: 'INTERNATIONAL ANIMAL HEALTH CERTIFICATE', certShort: 'Animal health certificate', vaccine: 'Vaccinated', examined: 'Examined',
      border: 'BORDER', stop: 'STOP', blocked: 'Herd held', wait: 'Waiting · checks · quarantine',
      receipt: 'SALES RECEIPT', valid: 'VALID',
      diseases: ['Contagious bovine pleuropneumonia', 'Foot-and-mouth disease', 'Peste des petits ruminants'],
      recapTitle: 'Three habits',
      recap: ['Official veterinarian before leaving', 'The certificate travels with the herd', 'Health check at the border'],
      endLine: 'Demonstration sample · content to be validated by technical experts',
      endBy: 'Produced by',
    },
    pt: {
      demo: 'Demo interativa', start: 'Começar', chooseLang: 'Idioma',
      title: 'A viagem de Moussa', subtitle: 'Regras sanitárias do comércio de gado na África Ocidental',
      pause: 'Pausa', play: 'Reproduzir', restart: 'Recomeçar', captions: 'Legendas',
      back: 'Voltar à escolha', next: 'Seguinte', continue: 'Continuar',
      correct: 'Resposta certa', wrong: 'Não exatamente',
      pauseHint: 'Pause o vídeo e escolha: 1 ou 2?',
      quiz: 'Quiz', score: 'A sua pontuação', replay: 'Ver de novo',
      chapters: ['Partida', 'Riscos', 'Escolha', 'Veterinário', 'Fronteira', 'Quiz', 'Reflexos'],
      nameTag: 'Moussa · comerciante de gado', herd: '× 40 bois',
      cert: 'CERTIFICADO ZOOSSANITÁRIO INTERNACIONAL', certShort: 'Certificado zoossanitário', vaccine: 'Vacinado', examined: 'Examinado',
      border: 'FRONTEIRA', stop: 'PARE', blocked: 'Rebanho retido', wait: 'Espera · controlos · quarentena',
      receipt: 'RECIBO DE COMPRA', valid: 'VÁLIDO',
      diseases: ['Peripneumonia contagiosa bovina', 'Febre aftosa', 'Peste dos pequenos ruminantes'],
      recapTitle: 'Três reflexos',
      recap: ['Veterinário oficial antes da partida', 'O certificado viaja com o rebanho', 'Controlo sanitário na fronteira'],
      endLine: 'Amostra de demonstração · conteúdo a validar por peritos técnicos',
      endBy: 'Uma produção',
    },
  },

  // Narration, shown as captions and exported as subtitles and the voice-over script.
  // a/b are seconds inside the segment.
  captions: {
    title: [
      { a: 1.2, b: 6.8, fr: 'Le voyage de Moussa : les règles sanitaires du commerce du bétail.', en: 'Moussa’s journey: the animal health rules of the livestock trade.', pt: 'A viagem de Moussa: as regras sanitárias do comércio de gado.' },
    ],
    meet: [
      { a: 0.4, b: 4.5, fr: 'Voici Moussa, commerçant de bétail au Sahel.', en: 'This is Moussa, a livestock trader in the Sahel.', pt: 'Este é Moussa, comerciante de gado no Sahel.' },
      { a: 4.5, b: 9.3, fr: 'Il veut vendre 40 bœufs sur un grand marché, de l’autre côté de la frontière.', en: 'He wants to sell 40 cattle at a big market across the border.', pt: 'Quer vender 40 bois num grande mercado, do outro lado da fronteira.' },
    ],
    diseases: [
      { a: 0.3, b: 4.4, fr: 'Les animaux voyagent d’un pays à l’autre… et les maladies voyagent avec eux.', en: 'Animals travel from country to country… and diseases travel with them.', pt: 'Os animais viajam de país para país… e as doenças viajam com eles.' },
      { a: 4.4, b: 9, fr: 'Une seule bête malade peut contaminer d’autres troupeaux tout au long de la route.', en: 'One sick animal can infect other herds all along the route.', pt: 'Um só animal doente pode contaminar outros rebanhos ao longo do caminho.' },
    ],
    choice1: [
      { a: 0.3, b: 4.4, fr: 'Avant de partir, que doit faire Moussa ?', en: 'Before leaving, what should Moussa do?', pt: 'Antes de partir, o que deve fazer Moussa?' },
      { a: 4.8, b: 9.1, fr: 'Réponse 2 : le contrôle sanitaire commence avant le départ.', en: 'Answer 2: the health check starts before the journey.', pt: 'Resposta 2: o controlo sanitário começa antes da partida.' },
    ],
    blocked1: [
      { a: 0.3, b: 4.2, fr: 'Sans certificat sanitaire, le troupeau est arrêté à la frontière.', en: 'Without a health certificate, the herd is stopped at the border.', pt: 'Sem certificado sanitário, o rebanho é parado na fronteira.' },
      { a: 4.2, b: 9.1, fr: 'Contrôles, attente, risque de quarantaine : Moussa perd du temps et de l’argent.', en: 'Checks, waiting, possible quarantine: Moussa loses time and money.', pt: 'Controlos, espera, risco de quarentena: Moussa perde tempo e dinheiro.' },
    ],
    vet: [
      { a: 0.3, b: 5.6, fr: 'Moussa appelle le vétérinaire officiel, qui examine et vaccine chaque animal.', en: 'Moussa calls the official veterinarian, who examines and vaccinates each animal.', pt: 'Moussa chama o veterinário oficial, que examina e vacina cada animal.' },
      { a: 5.6, b: 11.4, fr: 'Les animaux sont sains : le vétérinaire délivre un certificat zoosanitaire international.', en: 'The animals are healthy: the veterinarian issues an international animal health certificate.', pt: 'Os animais estão saudáveis: o veterinário emite um certificado zoossanitário internacional.' },
      { a: 11.4, b: 15.3, fr: 'Ce certificat accompagne le troupeau pendant tout le voyage.', en: 'The certificate travels with the herd for the whole journey.', pt: 'Este certificado acompanha o rebanho durante toda a viagem.' },
    ],
    borderArrive: [
      { a: 0.3, b: 6, fr: 'À la frontière, un agent des services vétérinaires contrôle les documents et les animaux.', en: 'At the border, a veterinary officer checks the documents and the animals.', pt: 'Na fronteira, um agente dos serviços veterinários controla os documentos e os animais.' },
    ],
    choice2: [
      { a: 0.3, b: 30, fr: 'L’agent demande les documents. Que présente Moussa ?', en: 'The officer asks for the documents. What does Moussa show?', pt: 'O agente pede os documentos. O que apresenta Moussa?' },
    ],
    blocked2: [
      { a: 0.3, b: 3.9, fr: 'Un reçu d’achat ne prouve pas que les animaux sont en bonne santé.', en: 'A sales receipt does not prove the animals are healthy.', pt: 'Um recibo de compra não prova que os animais estão saudáveis.' },
      { a: 3.9, b: 7.2, fr: 'Sans certificat, le troupeau ne passe pas.', en: 'Without a certificate, the herd cannot cross.', pt: 'Sem certificado, o rebanho não passa.' },
    ],
    borderCross: [
      { a: 0.2, b: 5.8, fr: 'Le certificat est valable et les animaux sont en bonne santé : la barrière se lève.', en: 'The certificate is valid and the animals are healthy: the barrier lifts.', pt: 'O certificado é válido e os animais estão saudáveis: a cancela levanta-se.' },
      { a: 5.8, b: 11.8, fr: 'Les règles harmonisées de la CEDEAO donnent un cadre commun aux contrôles sanitaires dans toute la région.', en: 'ECOWAS harmonised rules give health checks a common framework across the region.', pt: 'As regras harmonizadas da CEDEAO dão aos controlos sanitários um quadro comum em toda a região.' },
    ],
    recap: [
      { a: 0.3, b: 9, fr: 'Trois réflexes pour un commerce de bétail sûr et ouvert.', en: 'Three habits for a safe and open livestock trade.', pt: 'Três reflexos para um comércio de gado seguro e aberto.' },
    ],
  },

  choices: {
    choice1: {
      q: { fr: 'Avant de partir, que doit faire Moussa ?', en: 'Before leaving, what should Moussa do?', pt: 'Antes de partir, o que deve fazer Moussa?' },
      options: [
        { fr: 'Partir tout de suite et régler les papiers à la frontière', en: 'Leave now and sort out the papers at the border', pt: 'Partir já e tratar dos papéis na fronteira', next: 'blocked1' },
        { fr: 'Faire examiner et vacciner ses animaux par un vétérinaire officiel', en: 'Have an official veterinarian examine and vaccinate the animals', pt: 'Pedir a um veterinário oficial que examine e vacine os animais', next: 'vet', correct: true },
      ],
    },
    choice2: {
      q: { fr: 'L’agent demande les documents. Que présente Moussa ?', en: 'The officer asks for the documents. What does Moussa show?', pt: 'O agente pede os documentos. O que apresenta Moussa?' },
      options: [
        { fr: 'Le reçu d’achat du marché', en: 'The market sales receipt', pt: 'O recibo de compra do mercado', next: 'blocked2' },
        { fr: 'Le certificat zoosanitaire international', en: 'The international animal health certificate', pt: 'O certificado zoossanitário internacional', next: 'borderCross', correct: true },
      ],
    },
  },

  quiz: [
    {
      q: { fr: 'Qui délivre le certificat zoosanitaire ?', en: 'Who issues the animal health certificate?', pt: 'Quem emite o certificado zoossanitário?' },
      options: [
        { fr: 'Le commerçant', en: 'The trader', pt: 'O comerciante' },
        { fr: 'Un vétérinaire officiel', en: 'An official veterinarian', pt: 'Um veterinário oficial', correct: true },
        { fr: 'Le chef du marché', en: 'The market chief', pt: 'O chefe do mercado' },
      ],
      why: { fr: 'Seul un vétérinaire officiel peut attester de la santé des animaux.', en: 'Only an official veterinarian can attest to the animals’ health.', pt: 'Só um veterinário oficial pode atestar a saúde dos animais.' },
    },
    {
      q: { fr: 'Pourquoi contrôler les animaux aux frontières ?', en: 'Why are animals checked at borders?', pt: 'Porque se controlam os animais nas fronteiras?' },
      options: [
        { fr: 'Pour empêcher la propagation des maladies', en: 'To stop diseases from spreading', pt: 'Para impedir a propagação de doenças', correct: true },
        { fr: 'Pour ralentir le commerce', en: 'To slow trade down', pt: 'Para atrasar o comércio' },
        { fr: 'Pour compter les animaux', en: 'To count the animals', pt: 'Para contar os animais' },
      ],
      why: { fr: 'Le contrôle protège les troupeaux, les consommateurs et les marchés.', en: 'Checks protect herds, consumers and markets.', pt: 'O controlo protege os rebanhos, os consumidores e os mercados.' },
    },
    {
      q: { fr: 'Quel texte harmonise les règles sanitaires dans l’espace CEDEAO ?', en: 'Which text harmonises health rules in the ECOWAS area?', pt: 'Que texto harmoniza as regras sanitárias no espaço da CEDEAO?' },
      options: [
        { fr: 'Le Règlement C/REG.21/11/10', en: 'Regulation C/REG.21/11/10', pt: 'O Regulamento C/REG.21/11/10', correct: true },
        { fr: 'Le code de la route', en: 'The highway code', pt: 'O código da estrada' },
        { fr: 'Le règlement du marché', en: 'The market by-laws', pt: 'O regulamento do mercado' },
      ],
      why: { fr: 'Il fixe les règles de santé animale, végétale et de sécurité des aliments.', en: 'It sets the rules for animal health, plant health and food safety.', pt: 'Fixa as regras de sanidade animal, vegetal e de segurança sanitária dos alimentos.' },
    },
  ],
};

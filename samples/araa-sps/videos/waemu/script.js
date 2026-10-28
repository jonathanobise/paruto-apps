// All words in the WAEMU module, in every language. The player, the MP4 renderer and the
// subtitle/voice-over exporter all read this one file, so a new language is one new key.
window.SPS_SCRIPT = {
  languages: { fr: 'Français', en: 'English', pt: 'Português' },

  ui: {
    fr: {
      choice: 'Choix', demo: 'Démo interactive', start: 'Commencer', chooseLang: 'Langue',
      title: 'La boucherie de Koffi', subtitle: 'La sécurité sanitaire des aliments dans l’espace UEMOA',
      pause: 'Pause', play: 'Lecture', restart: 'Recommencer', captions: 'Sous-titres',
      back: 'Revenir au choix', next: 'Suivant', continue: 'Continuer',
      correct: 'Bonne réponse', wrong: 'Pas tout à fait',
      pauseHint: 'Mettez la vidéo en pause et choisissez : 1 ou 2 ?',
      quiz: 'Quiz', score: 'Votre score', replay: 'Rejouer',
      chapters: ['Koffi', 'La chaîne', 'Choix', 'Traçabilité', 'Alerte', 'Quiz', 'Réflexes'],
      nameTag: 'Koffi · boucher', reg: 'Règlement n°007/2007/CM/UEMOA', pillars: ['Végétaux', 'Animaux', 'Aliments'],
      chain: ['Éleveur', 'Marché à bétail', 'Abattoir', 'Boucher', 'Consommateur'],
      cheap: 'Moins cher !', noStamp: 'Sans cachet', inspected: 'INSPECTÉ',
      closed: 'FERMÉ', investigation: 'Enquête en cours',
      abattoir: 'ABATTOIR', notebook: 'Mes achats', nb: ['Date', 'Fournisseur', 'Origine'], trace: 'Traçabilité',
      alert: 'Alerte sanitaire', batch: 'Lot concerné', withdrawn: 'Lot retiré', carryOn: 'Le marché continue',
      salesStopped: 'Ventes arrêtées', members: 'États membres de l’UEMOA',
      recapTitle: 'Trois réflexes',
      recap: ['Acheter seulement de la viande inspectée', 'Noter ses achats et ses ventes', 'Signaler tout problème aux services vétérinaires'],
      endLine: 'Échantillon de démonstration · contenu à valider par les experts techniques',
      endBy: 'Une production',
    },
    en: {
      choice: 'Choice', demo: 'Interactive demo', start: 'Start', chooseLang: 'Language',
      title: 'Koffi’s Butcher Shop', subtitle: 'Food safety rules in the WAEMU area',
      pause: 'Pause', play: 'Play', restart: 'Restart', captions: 'Captions',
      back: 'Back to the choice', next: 'Next', continue: 'Continue',
      correct: 'Correct', wrong: 'Not quite',
      pauseHint: 'Pause the video and choose: 1 or 2?',
      quiz: 'Quiz', score: 'Your score', replay: 'Play again',
      chapters: ['Koffi', 'The chain', 'Choice', 'Traceability', 'Alert', 'Quiz', 'Key habits'],
      nameTag: 'Koffi · butcher', reg: 'Regulation No. 007/2007/CM/UEMOA', pillars: ['Plants', 'Animals', 'Food'],
      chain: ['Herder', 'Livestock market', 'Slaughterhouse', 'Butcher', 'Consumer'],
      cheap: 'Cheaper!', noStamp: 'No stamp', inspected: 'INSPECTED',
      closed: 'CLOSED', investigation: 'Investigation under way',
      abattoir: 'SLAUGHTERHOUSE', notebook: 'My purchases', nb: ['Date', 'Supplier', 'Origin'], trace: 'Traceability',
      alert: 'Health alert', batch: 'Batch concerned', withdrawn: 'Batch withdrawn', carryOn: 'The market carries on',
      salesStopped: 'Sales stopped', members: 'WAEMU member states',
      recapTitle: 'Three habits',
      recap: ['Buy only inspected meat', 'Record your purchases and sales', 'Report any problem to the veterinary services'],
      endLine: 'Demonstration sample · content to be validated by technical experts',
      endBy: 'Produced by',
    },
    pt: {
      choice: 'Escolha', demo: 'Demo interativa', start: 'Começar', chooseLang: 'Idioma',
      title: 'O talho de Koffi', subtitle: 'A segurança sanitária dos alimentos no espaço da UEMOA',
      pause: 'Pausa', play: 'Reproduzir', restart: 'Recomeçar', captions: 'Legendas',
      back: 'Voltar à escolha', next: 'Seguinte', continue: 'Continuar',
      correct: 'Resposta certa', wrong: 'Não exatamente',
      pauseHint: 'Pause o vídeo e escolha: 1 ou 2?',
      quiz: 'Quiz', score: 'A sua pontuação', replay: 'Ver de novo',
      chapters: ['Koffi', 'A cadeia', 'Escolha', 'Rastreabilidade', 'Alerta', 'Quiz', 'Reflexos'],
      nameTag: 'Koffi · talhante', reg: 'Regulamento n.º 007/2007/CM/UEMOA', pillars: ['Vegetais', 'Animais', 'Alimentos'],
      chain: ['Criador', 'Mercado de gado', 'Matadouro', 'Talhante', 'Consumidor'],
      cheap: 'Mais barato!', noStamp: 'Sem carimbo', inspected: 'INSPECIONADO',
      closed: 'FECHADO', investigation: 'Investigação em curso',
      abattoir: 'MATADOURO', notebook: 'As minhas compras', nb: ['Data', 'Fornecedor', 'Origem'], trace: 'Rastreabilidade',
      alert: 'Alerta sanitário', batch: 'Lote em causa', withdrawn: 'Lote retirado', carryOn: 'O mercado continua',
      salesStopped: 'Vendas paradas', members: 'Estados-membros da UEMOA',
      recapTitle: 'Três reflexos',
      recap: ['Comprar só carne inspecionada', 'Registar as compras e as vendas', 'Comunicar qualquer problema aos serviços veterinários'],
      endLine: 'Amostra de demonstração · conteúdo a validar por peritos técnicos',
      endBy: 'Uma produção',
    },
  },

  // Narration, shown as captions and exported as subtitles and the voice-over script.
  // a/b are seconds inside the segment.
  captions: {
    title: [
      { a: 1.2, b: 6.8, fr: 'La boucherie de Koffi : la sécurité sanitaire des aliments dans l’espace UEMOA.', en: 'Koffi’s butcher shop: food safety rules in the WAEMU area.', pt: 'O talho de Koffi: a segurança sanitária dos alimentos no espaço da UEMOA.' },
    ],
    meet: [
      { a: 0.4, b: 3.8, fr: 'Voici Koffi, boucher au marché de la ville.', en: 'This is Koffi, a butcher at the city market.', pt: 'Este é Koffi, talhante no mercado da cidade.' },
      { a: 3.8, b: 10.8, fr: 'Sa viande vient d’éleveurs, passe par le marché à bétail et l’abattoir, avant d’arriver chez ses clients.', en: 'His meat comes from herders, passes through the livestock market and the slaughterhouse, then reaches his customers.', pt: 'A sua carne vem de criadores, passa pelo mercado de gado e pelo matadouro, antes de chegar aos seus clientes.' },
    ],
    chain: [
      { a: 0.3, b: 10.6, fr: 'Dans l’UEMOA, le Règlement n°007/2007/CM/UEMOA fixe des règles communes de sécurité sanitaire des végétaux, des animaux et des aliments.', en: 'In WAEMU, Regulation No. 007/2007/CM/UEMOA sets common rules for the safety of plants, animals and food.', pt: 'Na UEMOA, o Regulamento n.º 007/2007/CM/UEMOA fixa regras comuns de segurança sanitária dos vegetais, dos animais e dos alimentos.' },
      { a: 10.6, b: 15.4, fr: 'Chaque acteur de la chaîne est responsable de la sécurité de ce qu’il vend.', en: 'Every actor in the chain is responsible for the safety of what they sell.', pt: 'Cada ator da cadeia é responsável pela segurança do que vende.' },
    ],
    choice1: [
      { a: 0.3, b: 6.2, fr: 'Un vendeur propose à Koffi de la viande moins chère, sans cachet d’inspection. Que fait Koffi ?', en: 'A trader offers Koffi cheaper meat with no inspection stamp. What does Koffi do?', pt: 'Um vendedor oferece a Koffi carne mais barata, sem carimbo de inspeção. O que faz Koffi?' },
      { a: 8.0, b: 13.0, fr: 'Réponse 2 : on n’achète que de la viande inspectée, avec le cachet de l’abattoir.', en: 'Answer 2: only buy inspected meat, with the slaughterhouse stamp.', pt: 'Resposta 2: só se compra carne inspecionada, com o carimbo do matadouro.' },
    ],
    blocked1: [
      { a: 0.3, b: 4.4, fr: 'Cette viande n’a pas été inspectée. Des clients tombent malades.', en: 'This meat was not inspected. Some customers fall ill.', pt: 'Esta carne não foi inspecionada. Alguns clientes ficam doentes.' },
      { a: 4.4, b: 10.6, fr: 'Les services vétérinaires remontent jusqu’à Koffi : sa boutique est fermée le temps de l’enquête.', en: 'The veterinary services trace it back to Koffi: his shop is closed during the investigation.', pt: 'Os serviços veterinários chegam até Koffi: o talho fica fechado durante a investigação.' },
    ],
    trace: [
      { a: 0.3, b: 4.6, fr: 'Koffi achète à l’abattoir une viande inspectée, avec son cachet.', en: 'Koffi buys inspected meat at the slaughterhouse, with its stamp.', pt: 'Koffi compra no matadouro carne inspecionada, com o seu carimbo.' },
      { a: 4.6, b: 10.4, fr: 'Dans son cahier, il note chaque achat : la date, le fournisseur, l’origine des animaux.', en: 'In his notebook he records every purchase: the date, the supplier, where the animals came from.', pt: 'No seu caderno, regista cada compra: a data, o fornecedor, a origem dos animais.' },
      { a: 10.4, b: 15.2, fr: 'C’est la traçabilité : savoir d’où vient un produit et où il va.', en: 'That is traceability: knowing where a product comes from and where it goes.', pt: 'É a rastreabilidade: saber de onde vem um produto e para onde vai.' },
    ],
    alertArrive: [
      { a: 0.3, b: 5.6, fr: 'Un jour, les services vétérinaires lancent une alerte sur un lot de viande.', en: 'One day, the veterinary services issue an alert about a batch of meat.', pt: 'Um dia, os serviços veterinários lançam um alerta sobre um lote de carne.' },
    ],
    choice2: [
      { a: 0.3, b: 30, fr: 'Comment Koffi aide-t-il les services ?', en: 'How does Koffi help the services?', pt: 'Como ajuda Koffi os serviços?' },
    ],
    blocked2: [
      { a: 0.3, b: 3.8, fr: 'Sans information, les services ne retrouvent pas le lot.', en: 'Without information, the services cannot find the batch.', pt: 'Sem informação, os serviços não encontram o lote.' },
      { a: 3.8, b: 7.4, fr: 'Tout le marché est contrôlé et les ventes s’arrêtent.', en: 'The whole market is checked and sales stop.', pt: 'Todo o mercado é controlado e as vendas param.' },
    ],
    alertResolve: [
      { a: 0.2, b: 6.0, fr: 'Grâce au cahier, le lot est retrouvé et retiré. Le reste du marché continue.', en: 'Thanks to the notebook, the batch is found and withdrawn. The rest of the market carries on.', pt: 'Graças ao caderno, o lote é encontrado e retirado. O resto do mercado continua.' },
      { a: 6.0, b: 12.4, fr: 'Dans l’UEMOA, les États membres coopèrent et partagent les alertes pour protéger les consommateurs.', en: 'In WAEMU, member states cooperate and share alerts to protect consumers.', pt: 'Na UEMOA, os Estados-membros cooperam e partilham os alertas para proteger os consumidores.' },
    ],
    recap: [
      { a: 0.3, b: 9, fr: 'Une chaîne sûre, du troupeau à l’assiette.', en: 'A safe chain, from herd to plate.', pt: 'Uma cadeia segura, do rebanho ao prato.' },
    ],
  },

  choices: {
    choice1: {
      q: { fr: 'Un vendeur propose à Koffi de la viande moins chère, sans cachet d’inspection. Que fait Koffi ?', en: 'A trader offers Koffi cheaper meat with no inspection stamp. What does Koffi do?', pt: 'Um vendedor oferece a Koffi carne mais barata, sem carimbo de inspeção. O que faz Koffi?' },
      options: [
        { fr: 'Il l’achète : c’est une bonne affaire', en: 'He buys it: it’s a good deal', pt: 'Compra-a: é um bom negócio', next: 'blocked1' },
        { fr: 'Il refuse : la viande doit venir de l’abattoir et être inspectée', en: 'He refuses: meat must come from the slaughterhouse and be inspected', pt: 'Recusa: a carne tem de vir do matadouro e ser inspecionada', next: 'trace', correct: true },
      ],
    },
    choice2: {
      q: { fr: 'Comment Koffi aide-t-il les services ?', en: 'How does Koffi help the services?', pt: 'Como ajuda Koffi os serviços?' },
      options: [
        { fr: 'Il ne dit rien et continue de vendre', en: 'He says nothing and keeps selling', pt: 'Não diz nada e continua a vender', next: 'blocked2' },
        { fr: 'Il montre son cahier et retire la viande concernée', en: 'He shows his notebook and withdraws the meat concerned', pt: 'Mostra o caderno e retira a carne em causa', next: 'alertResolve', correct: true },
      ],
    },
  },

  quiz: [
    {
      q: { fr: 'Qui est responsable de la sécurité de la viande vendue ?', en: 'Who is responsible for the safety of the meat sold?', pt: 'Quem é responsável pela segurança da carne vendida?' },
      options: [
        { fr: 'Seulement l’État', en: 'Only the State', pt: 'Só o Estado' },
        { fr: 'Chaque acteur de la chaîne', en: 'Every actor in the chain', pt: 'Cada ator da cadeia', correct: true },
        { fr: 'Seulement le client', en: 'Only the customer', pt: 'Só o cliente' },
      ],
      why: { fr: 'De l’éleveur au boucher, chacun répond de ce qu’il vend, sous le contrôle des services officiels.', en: 'Each actor answers for what they sell, under official controls.', pt: 'Do criador ao talhante, cada um responde pelo que vende, sob o controlo dos serviços oficiais.' },
    },
    {
      q: { fr: 'Que veut dire « traçabilité » ?', en: 'What does “traceability” mean?', pt: 'O que quer dizer «rastreabilidade»?' },
      options: [
        { fr: 'Savoir d’où vient un produit et où il va', en: 'Knowing where a product comes from and where it goes', pt: 'Saber de onde vem um produto e para onde vai', correct: true },
        { fr: 'Vendre plus vite', en: 'Selling faster', pt: 'Vender mais depressa' },
        { fr: 'Baisser les prix', en: 'Cutting prices', pt: 'Baixar os preços' },
      ],
      why: { fr: 'Elle permet de retrouver et de retirer vite un lot à risque.', en: 'It makes it possible to find and withdraw a risky batch quickly.', pt: 'Permite encontrar e retirar depressa um lote de risco.' },
    },
    {
      q: { fr: 'Quel texte fixe les règles de sécurité sanitaire dans l’UEMOA ?', en: 'Which text sets the health safety rules in WAEMU?', pt: 'Que texto fixa as regras de segurança sanitária na UEMOA?' },
      options: [
        { fr: 'Le Règlement n°007/2007/CM/UEMOA', en: 'Regulation No. 007/2007/CM/UEMOA', pt: 'O Regulamento n.º 007/2007/CM/UEMOA', correct: true },
        { fr: 'Le code de la route', en: 'The highway code', pt: 'O código da estrada' },
        { fr: 'Le règlement du marché', en: 'The market by-laws', pt: 'O regulamento do mercado' },
      ],
      why: { fr: 'Il couvre la sécurité sanitaire des végétaux, des animaux et des aliments.', en: 'It covers the safety of plants, animals and food.', pt: 'Abrange a segurança sanitária dos vegetais, dos animais e dos alimentos.' },
    },
  ],
};

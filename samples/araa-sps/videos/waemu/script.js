// All words in the WAEMU module (full length, about 7 minutes), in every language. Rules follow
// Regulation n°07/2007/CM/UEMOA and n°010/2009/COM/UEMOA; the article behind each line is noted beside its segment. The player, the MP4 renderer and the
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
      chapters: ['Koffi', 'Principes', 'Qui fait quoi', 'Choix', 'Registres', 'Alerte', 'Maladies', 'Échanges', 'Droits', 'Quiz', 'À retenir'],
      principles: ['Normes internationales', 'Données scientifiques', 'Précaution', 'Communication sur les risques'], inst: ['Comité régional et Comité vétérinaire', 'Réseaux d’experts, de laboratoires et d’alerte', 'Administration vétérinaire et organisme national', 'Conseil consultatif avec les consommateurs'], commission: 'Commission de l’UEMOA',
      duties: ['Produits sûrs', 'Autocontrôles à chaque étape', 'Justificatifs pour les inspecteurs'], informL: 'Informer les autorités', protect: 'Protéger les consommateurs',
      powers: ['Suspendre la vente', 'Retirer la denrée', 'Détruire'], local: 'Autorités locales · 1 mois · 24 h', listTitle: 'Maladies animales à déclaration obligatoire',
      listSub: 'Règlement n°010/2009/COM/UEMOA', diseases: ['Fièvre aphteuse', 'Péripneumonie contagieuse bovine', 'Peste des petits ruminants', 'Fièvre charbonneuse'], more: '… plus de 120 autres',
      drool: 'Bave · plaies dans la bouche', vetAuth: 'Autorité vétérinaire', form: 'Formulaire OMSA',
      perimeter: 'Périmètre de contrôle', alertNet: 'Réseau d’alerte', woah: 'OMSA',
      safeguard: 'Mesures de sauvegarde', over: 'Crise éradiquée', restricted: 'Restrictions sur tout le pays',
      certVet: 'Certificat vétérinaire', salubrity: 'Certificat de salubrité', partial: 'Seules les zones touchées',
      freeLbl: 'Libre circulation', sellAny: 'Vendre dans tout État membre', simple: ['Cohérentes', 'Simples', 'Transparentes'],
      rightsT: ['Transparence, impartialité, proportionnalité', 'Participation et information', 'Sensibilisation'], rulesTitle: 'Quatre règles', rules: ['Vendre seulement des produits sûrs', 'Garder ses justificatifs', 'Informer les autorités sans attendre', 'Signaler toute maladie suspecte'],
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
      chapters: ['Koffi', 'Principles', 'Who does what', 'Choice', 'Records', 'Alert', 'Diseases', 'Trade', 'Rights', 'Quiz', 'Key points'],
      principles: ['International standards', 'Scientific data', 'Precaution', 'Talking about risks'], inst: ['Regional committee and Veterinary Committee', 'Networks of experts, labs and alerts', 'Veterinary administration and national body', 'Advisory council with consumers'], commission: 'WAEMU Commission',
      duties: ['Safe products', 'Own checks at every stage', 'Records for inspectors'], informL: 'Inform the authorities', protect: 'Protect consumers',
      powers: ['Suspend sales', 'Withdraw the food', 'Destroy it'], local: 'Local authorities · 1 month · 24 h', listTitle: 'Notifiable animal diseases',
      listSub: 'Regulation n°010/2009/COM/UEMOA', diseases: ['Foot-and-mouth disease', 'Contagious bovine pleuropneumonia', 'Peste des petits ruminants', 'Anthrax'], more: '… and more than 120 others',
      drool: 'Drooling · mouth sores', vetAuth: 'Veterinary authority', form: 'WOAH form',
      perimeter: 'Control area', alertNet: 'Alert network', woah: 'WOAH',
      safeguard: 'Safeguard measures', over: 'Crisis eradicated', restricted: 'Whole country restricted',
      certVet: 'Veterinary certificate', salubrity: 'Health certificate', partial: 'Affected areas only',
      freeLbl: 'Free movement', sellAny: 'Sell in any member state', simple: ['Coherent', 'Simple', 'Transparent'],
      rightsT: ['Transparency, impartiality, proportionality', 'A say and information', 'Awareness'], rulesTitle: 'Four rules', rules: ['Sell only safe products', 'Keep your records', 'Inform the authorities at once', 'Report any suspected disease'],
      nameTag: 'Koffi · butcher', reg: 'Regulation No. 007/2007/CM/UEMOA', pillars: ['Plants', 'Animals', 'Food'],
      chain: ['Herder', 'Livestock market', 'Abattoir', 'Butcher', 'Consumer'],
      cheap: 'Cheaper!', noStamp: 'No stamp', inspected: 'INSPECTED',
      closed: 'CLOSED', investigation: 'Investigation under way',
      abattoir: 'ABATTOIR', notebook: 'My purchases', nb: ['Date', 'Supplier', 'Origin'], trace: 'Traceability',
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
      chapters: ['Koffi', 'Princípios', 'Quem faz o quê', 'Escolha', 'Registos', 'Alerta', 'Doenças', 'Comércio', 'Direitos', 'Quiz', 'A reter'],
      principles: ['Normas internacionais', 'Dados científicos', 'Precaução', 'Comunicação sobre os riscos'], inst: ['Comité regional e Comité veterinário', 'Redes de peritos, laboratórios e alerta', 'Administração veterinária e organismo nacional', 'Conselho consultivo com os consumidores'], commission: 'Comissão da UEMOA',
      duties: ['Produtos seguros', 'Autocontrolos em cada etapa', 'Registos para os inspetores'], informL: 'Informar as autoridades', protect: 'Proteger os consumidores',
      powers: ['Suspender a venda', 'Retirar o alimento', 'Destruir'], local: 'Autoridades locais · 1 mês · 24 h', listTitle: 'Doenças animais de declaração obrigatória',
      listSub: 'Regulamento n.º 010/2009/COM/UEMOA', diseases: ['Febre aftosa', 'Peripneumonia contagiosa bovina', 'Peste dos pequenos ruminantes', 'Carbúnculo hemático'], more: '… e mais de 120 outras',
      drool: 'Baba · feridas na boca', vetAuth: 'Autoridade veterinária', form: 'Formulário da OMSA',
      perimeter: 'Perímetro de controlo', alertNet: 'Rede de alerta', woah: 'OMSA',
      safeguard: 'Medidas de salvaguarda', over: 'Crise erradicada', restricted: 'Todo o país restringido',
      certVet: 'Certificado veterinário', salubrity: 'Certificado de salubridade', partial: 'Só as zonas afetadas',
      freeLbl: 'Livre circulação', sellAny: 'Vender em qualquer Estado-membro', simple: ['Coerentes', 'Simples', 'Transparentes'],
      rightsT: ['Transparência, imparcialidade, proporcionalidade', 'Participação e informação', 'Sensibilização'], rulesTitle: 'Quatro regras', rules: ['Vender só produtos seguros', 'Guardar os registos', 'Informar as autoridades sem esperar', 'Comunicar qualquer doença suspeita'],
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
      { a: 3.8, b: 10.8, fr: 'Sa viande vient d’éleveurs, passe par le marché à bétail et l’abattoir, avant d’arriver chez ses clients.', en: 'His meat comes from herders, passes through the livestock market and the abattoir, then reaches his customers.', pt: 'A sua carne vem de criadores, passa pelo mercado de gado e pelo matadouro, antes de chegar aos seus clientes.' },
    ],
    chain: [
      { a: 0.3, b: 10.6, fr: 'Dans l’UEMOA, le Règlement n°007/2007/CM/UEMOA fixe des règles communes de sécurité sanitaire des végétaux, des animaux et des aliments.', en: 'In WAEMU, Regulation No. 007/2007/CM/UEMOA sets common rules for the safety of plants, animals and food.', pt: 'Na UEMOA, o Regulamento n.º 007/2007/CM/UEMOA fixa regras comuns de segurança sanitária dos vegetais, dos animais e dos alimentos.' },
      { a: 10.6, b: 15.4, fr: 'Chaque opérateur du secteur alimentaire répond de la qualité sanitaire de ce qu’il vend.', en: 'Every food business in the chain answers for the safety of what it sells.', pt: 'Cada operador do setor alimentar responde pela qualidade sanitária do que vende.' },
    ],
    // Regulation n°07/2007/CM/UEMOA of 6 April 2007: Art. 5 (international standards), Art. 6 (risk assessment), Art. 7 (precaution), Art. 9 and Art. 1 (risk communication)
    principles: [
      { a: 0.3, b: 7.4, fr: 'Le règlement repose sur des principes communs : les mesures suivent les normes internationales.', en: 'The regulation rests on common principles: measures follow international standards.', pt: 'O regulamento assenta em princípios comuns: as medidas seguem as normas internacionais.' },
      { a: 7.4, b: 13.8, fr: 'Les risques sont évalués sur des données scientifiques, et les mesures leur restent proportionnées.', en: 'Risks are assessed on scientific data, and measures stay in proportion to them.', pt: 'Os riscos são avaliados com base em dados científicos, e as medidas mantêm-se proporcionais.' },
      { a: 13.8, b: 20.4, fr: 'Face à un risque de dommage grave, l’absence de certitude scientifique absolue n’est pas un prétexte pour attendre.', en: 'Faced with a risk of serious harm, a lack of full scientific certainty is no excuse to wait.', pt: 'Perante um risco de dano grave, a falta de certeza científica absoluta não é pretexto para esperar.' },
      { a: 20.4, b: 25.6, fr: 'Et les risques sont expliqués aux consommateurs et aux professionnels.', en: 'And risks are explained to consumers and professionals.', pt: 'E os riscos são explicados aos consumidores e aos profissionais.' },
    ],
    // Art. 13–15 (regional committee, Veterinary Committee), Art. 17–18 (networks), Art. 63 and 82 (national bodies), Art. 83 (advisory council)
    institutions: [
      { a: 0.3, b: 7.4, fr: 'Qui fait quoi ? Auprès de la Commission de l’UEMOA, un comité régional conseille, appuyé par le Comité vétérinaire.', en: 'Who does what? Under the WAEMU Commission, a regional committee advises, backed by the Veterinary Committee.', pt: 'Quem faz o quê? Junto da Comissão da UEMOA, um comité regional aconselha, apoiado pelo Comité veterinário.' },
      { a: 7.4, b: 13.8, fr: 'Des réseaux d’experts, de laboratoires et d’alerte relient les États membres.', en: 'Networks of experts, laboratories and alerts link the member states.', pt: 'Redes de peritos, laboratórios e alerta ligam os Estados-membros.' },
      { a: 13.8, b: 20.2, fr: 'Chaque État a une administration vétérinaire et un organisme national de sécurité sanitaire des aliments,', en: 'Each state has a veterinary administration and a national food safety body,', pt: 'Cada Estado tem uma administração veterinária e um organismo nacional de segurança sanitária dos alimentos,' },
      { a: 20.2, b: 25.6, fr: 'ainsi qu’un conseil consultatif où siègent aussi les consommateurs.', en: 'and an advisory council where consumers also have a seat.', pt: 'e um conselho consultivo onde também têm assento os consumidores.' },
    ],
    choice1: [
      { a: 0.3, b: 6.2, fr: 'Un vendeur propose à Koffi de la viande moins chère, sans cachet d’inspection. Que fait Koffi ?', en: 'A trader offers Koffi cheaper meat with no inspection stamp. What does Koffi do?', pt: 'Um vendedor oferece a Koffi carne mais barata, sem carimbo de inspeção. O que faz Koffi?' },
      { a: 8.0, b: 13.0, fr: 'Réponse 2 : on n’achète que de la viande inspectée, avec le cachet de l’abattoir.', en: 'Answer 2: only buy inspected meat, with the abattoir stamp.', pt: 'Resposta 2: só se compra carne inspecionada, com o carimbo do matadouro.' },
    ],
    blocked1: [
      { a: 0.3, b: 4.4, fr: 'Cette viande n’a pas été inspectée. Des clients tombent malades.', en: 'This meat was not inspected. Some customers fall ill.', pt: 'Esta carne não foi inspecionada. Alguns clientes ficam doentes.' },
      { a: 4.4, b: 10.6, fr: 'Les services vétérinaires remontent jusqu’à Koffi : sa boutique est fermée le temps de l’enquête.', en: 'The veterinary services trace it back to Koffi: his shop is closed during the investigation.', pt: 'Os serviços veterinários chegam até Koffi: o talho fica fechado durante a investigação.' },
    ],
    trace: [
      { a: 0.3, b: 4.6, fr: 'Koffi achète à l’abattoir une viande inspectée, avec son cachet.', en: 'Koffi buys inspected meat at the abattoir, with its stamp.', pt: 'Koffi compra no matadouro carne inspecionada, com o seu carimbo.' },
      { a: 4.6, b: 10.4, fr: 'Dans son cahier, il note chaque achat : la date, le fournisseur, l’origine des animaux.', en: 'In his notebook he records every purchase: the date, the supplier, where the animals came from.', pt: 'No seu caderno, regista cada compra: a data, o fornecedor, a origem dos animais.' },
      { a: 10.4, b: 15.2, fr: 'C’est la traçabilité : savoir d’où vient un produit et où il va.', en: 'That is traceability: knowing where a product comes from and where it goes.', pt: 'É a rastreabilidade: saber de onde vem um produto e para onde vai.' },
    ],
    // Art. 80 (operators responsible, safe products), Art. 81 (own checks), Art. 84 (records for inspectors); the notebook is the good practice that keeps those records
    duties: [
      { a: 0.3, b: 7.6, fr: 'La règle est claire : les opérateurs du secteur alimentaire répondent de ce qu’ils vendent, et ne vendent que des produits sûrs.', en: 'The rule is clear: food businesses answer for what they sell, and sell only safe products.', pt: 'A regra é clara: os operadores do setor alimentar respondem pelo que vendem, e só vendem produtos seguros.' },
      { a: 7.6, b: 15.6, fr: 'Chacun contrôle ses propres opérations, à toutes les étapes : production, transformation, stockage et distribution.', en: 'Each one checks its own operations at every stage: production, processing, storage and distribution.', pt: 'Cada um controla as suas próprias operações em todas as etapas: produção, transformação, armazenamento e distribuição.' },
      { a: 15.6, b: 23.6, fr: 'Et chacun doit pouvoir montrer aux inspecteurs ses autocontrôles et les informations commerciales sur ses denrées.', en: 'And each must be able to show inspectors its own checks and the trade records for its food.', pt: 'E cada um deve poder mostrar aos inspetores os seus autocontrolos e as informações comerciais sobre os seus produtos.' },
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
    // Art. 80 (duty to inform and protect consumers), Art. 86 (suspension, withdrawal, destruction; local authorities, one month, 24 hours)
    inform: [
      { a: 0.3, b: 9.4, fr: 'Si un opérateur pense qu’une denrée qu’il a vendue peut nuire à la santé, il doit informer les autorités et agir pour protéger les consommateurs.', en: 'If a business thinks a food it has sold may harm health, it must inform the authorities and act to protect consumers.', pt: 'Se um operador pensar que um alimento que vendeu pode prejudicar a saúde, deve informar as autoridades e agir para proteger os consumidores.' },
      { a: 9.4, b: 16.4, fr: 'En cas de danger grave, l’organisme national peut suspendre la vente, retirer la denrée ou la faire détruire.', en: 'In serious danger, the national food safety body can suspend sales, withdraw the food or have it destroyed.', pt: 'Em caso de perigo grave, o organismo nacional pode suspender a venda, retirar o alimento ou mandá-lo destruir.' },
      { a: 16.4, b: 23.6, fr: 'En urgence, les autorités locales peuvent agir un mois au plus, en informant l’organisme national dans les 24 heures.', en: 'In an emergency, local authorities can act for up to a month, informing that body within 24 hours.', pt: 'Em urgência, as autoridades locais podem agir até um mês, informando o organismo nacional em 24 horas.' },
    ],
    // Implementing Regulation n°010/2009/COM/UEMOA (127 entries; Art. 4–6 list these four)
    notifiable: [
      { a: 0.3, b: 7.6, fr: 'En 2009, l’UEMOA a dressé la liste des maladies animales à déclaration obligatoire : plus de cent vingt.', en: 'In 2009, WAEMU listed the animal diseases that must be notified: more than one hundred and twenty.', pt: 'Em 2009, a UEMOA estabeleceu a lista das doenças animais de declaração obrigatória: mais de cento e vinte.' },
      { a: 7.6, b: 15.6, fr: 'Parmi elles : fièvre aphteuse, péripneumonie contagieuse bovine, peste des petits ruminants, fièvre charbonneuse.', en: 'Among them: foot-and-mouth disease, contagious bovine pleuropneumonia, peste des petits ruminants and anthrax.', pt: 'Entre elas: febre aftosa, peripneumonia contagiosa bovina, peste dos pequenos ruminantes e carbúnculo hemático.' },
      { a: 15.6, b: 23.6, fr: 'Un matin, un éleveur propose à Koffi des bovins qui bavent, avec des plaies dans la bouche.', en: 'One morning, a herder offers Koffi cattle that are drooling, with sores in their mouths.', pt: 'Numa manhã, um criador propõe a Koffi bovinos que babam, com feridas na boca.' },
    ],
    choice3: [
      { a: 0.3, b: 4.6, fr: 'Que fait Koffi ?', en: 'What does Koffi do?', pt: 'O que faz Koffi?' },
      { a: 8.0, b: 12.8, fr: 'Réponse 2 : il refuse et alerte les services vétérinaires.', en: 'Answer 2: he refuses and alerts the veterinary services.', pt: 'Resposta 2: recusa e alerta os serviços veterinários.' },
    ],
    // Art. 76: restriction of the whole territory when the disease spreads widely
    blocked3: [
      { a: 0.3, b: 4.6, fr: 'La maladie gagne d’autres troupeaux et d’autres marchés.', en: 'The disease reaches other herds and other markets.', pt: 'A doença chega a outros rebanhos e a outros mercados.' },
      { a: 4.6, b: 9.8, fr: 'Les États voisins peuvent alors restreindre les animaux venant de tout le pays.', en: 'Neighbouring states can then restrict animals from the whole country.', pt: 'Os Estados vizinhos podem então restringir os animais vindos de todo o país.' },
    ],
    // Art. 1 (notifiable disease), Reg. 010/2009 Art. 2–3 (immediate written notification on the OIE form), Art. 62 and 66 (declaration of infection, defined area)
    notifyGo: [
      { a: 0.3, b: 7.6, fr: 'Toute suspicion doit être portée immédiatement à la connaissance de l’autorité vétérinaire.', en: 'Any suspicion must be brought to the veterinary authority at once.', pt: 'Qualquer suspeita deve ser levada de imediato ao conhecimento da autoridade veterinária.' },
      { a: 7.6, b: 15.6, fr: 'L’État notifie aussitôt la Commission de l’UEMOA, par écrit, sur le formulaire de l’OMSA.', en: 'The state notifies the WAEMU Commission immediately, in writing, on WOAH’s form.', pt: 'O Estado notifica de imediato a Comissão da UEMOA, por escrito, no formulário da OMSA.' },
      { a: 15.6, b: 23.6, fr: 'Il déclare l’infection et applique des mesures dans un périmètre déterminé.', en: 'It declares the infection and applies measures within a defined area.', pt: 'Declara a infeção e aplica medidas num perímetro determinado.' },
    ],
    // Art. 34 (alert network, safeguard measures, OIE, end on eradication)
    crisis: [
      { a: 0.3, b: 7.6, fr: 'En cas de crise sanitaire, les États préviennent aussitôt la Commission et les autres États par le réseau d’alerte.', en: 'In a health crisis, states warn the Commission and each other at once through the alert network.', pt: 'Em caso de crise sanitária, os Estados avisam de imediato a Comissão e os outros Estados através da rede de alerta.' },
      { a: 7.6, b: 13.6, fr: 'Ils prennent des mesures de sauvegarde et informent l’OMSA quand il s’agit des animaux.', en: 'They take safeguard measures, and inform WOAH when animals are affected.', pt: 'Tomam medidas de salvaguarda e informam a OMSA quando se trata de animais.' },
      { a: 13.6, b: 17.6, fr: 'Les mesures prennent fin une fois la crise éradiquée.', en: 'The measures end once the crisis is eradicated.', pt: 'As medidas terminam quando a crise é erradicada.' },
    ],
    // Art. 72 and 76 (veterinary certificate between member states), Art. 73 (health certificate for imported animal products), Art. 76 (restriction of the affected parts)
    imports: [
      { a: 0.3, b: 7.6, fr: 'Les animaux envoyés vers un autre État membre voyagent avec un certificat vétérinaire délivré par un vétérinaire officiel.', en: 'Animals sent to another member state travel with a veterinary certificate from an official veterinarian.', pt: 'Os animais enviados para outro Estado-membro viajam com um certificado veterinário emitido por um veterinário oficial.' },
      { a: 7.6, b: 15.4, fr: 'La viande et les produits d’origine animale qui entrent dans l’Union ont un certificat de salubrité : animaux sains, hygiène respectée.', en: 'Meat and animal products entering the Union carry a health certificate: healthy animals, hygienic handling.', pt: 'A carne e os produtos de origem animal que entram na União têm um certificado de salubridade: animais saudáveis, higiene respeitada.' },
      { a: 15.4, b: 23.6, fr: 'En cas d’épizootie, un État peut restreindre les animaux venant des seules parties du territoire touchées.', en: 'In an epizootic, a state can restrict animals from just the affected parts of another state.', pt: 'Em caso de epizootia, um Estado pode restringir os animais vindos apenas das partes do território afetadas.' },
    ],
    // Art. 10 (free movement, acceptance), Art. 30 (right to sell), Art. 25 (coherent, simple, transparent rules)
    market2: [
      { a: 0.3, b: 7.6, fr: 'Les aliments et produits animaux conformes circulent librement dans l’Union.', en: 'Food and animal products that meet the rules move freely across the Union.', pt: 'Os alimentos e produtos animais conformes circulam livremente na União.' },
      { a: 7.6, b: 15, fr: 'Tout opérateur peut vendre dans un autre État membre les produits légalement commercialisés dans le sien.', en: 'Any business can sell in another member state the products it sells lawfully in its own.', pt: 'Qualquer operador pode vender noutro Estado-membro os produtos que comercializa legalmente no seu.' },
      { a: 15, b: 23.6, fr: 'Et les règles doivent rester cohérentes, simples et transparentes, sans entraves inutiles au commerce.', en: 'And rules must stay coherent, simple and transparent, with no needless barriers to trade.', pt: 'E as regras devem manter-se coerentes, simples e transparentes, sem entraves inúteis ao comércio.' },
    ],
    // Art. 11 (rights during inspections), Art. 12 (participation, information), Art. 36 (awareness)
    rights: [
      { a: 0.3, b: 7, fr: 'Et quand la boutique de Koffi est contrôlée, il a droit à la transparence, à l’impartialité et à la proportionnalité.', en: 'And when Koffi’s shop is inspected, he is entitled to transparency, impartiality and proportionality.', pt: 'E quando o talho de Koffi é controlado, ele tem direito à transparência, à imparcialidade e à proporcionalidade.' },
      { a: 7, b: 13.6, fr: 'Les États associent les acteurs aux décisions et les informent des risques et des mesures prises.', en: 'States give the people concerned a say and tell them about risks and the measures taken.', pt: 'Os Estados associam os intervenientes às decisões e informam-nos sobre os riscos e as medidas tomadas.' },
      { a: 13.6, b: 19.6, fr: 'Les campagnes de sensibilisation, comme celle-ci, aident chacun à détecter et prévenir les risques sanitaires.', en: 'Awareness campaigns, like this one, help everyone detect and prevent health risks.', pt: 'As campanhas de sensibilização, como esta, ajudam todos a detetar e prevenir os riscos sanitários.' },
    ],
    rules: [
      { a: 0.3, b: 9.6, fr: 'Quatre règles : des produits sûrs, des justificatifs, l’information des autorités et le signalement des maladies.', en: 'Four rules: safe products, good records, informing the authorities and reporting disease.', pt: 'Quatro regras: produtos seguros, registos, informar as autoridades e comunicar as doenças.' },
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
        { fr: 'Il refuse : la viande doit venir de l’abattoir et être inspectée', en: 'He refuses: meat must come from the abattoir and be inspected', pt: 'Recusa: a carne tem de vir do matadouro e ser inspecionada', next: 'trace', correct: true },
      ],
    },
    choice2: {
      q: { fr: 'Comment Koffi aide-t-il les services ?', en: 'How does Koffi help the services?', pt: 'Como ajuda Koffi os serviços?' },
      options: [
        { fr: 'Il ne dit rien et continue de vendre', en: 'He says nothing and keeps selling', pt: 'Não diz nada e continua a vender', next: 'blocked2' },
        { fr: 'Il montre son cahier et retire la viande concernée', en: 'He shows his notebook and withdraws the meat concerned', pt: 'Mostra o caderno e retira a carne em causa', next: 'alertResolve', correct: true },
      ],
    },
    choice3: {
      q: { fr: 'Des bovins bavent et ont des plaies dans la bouche. Que fait Koffi ?', en: 'The cattle are drooling, with mouth sores. What does Koffi do?', pt: 'Os bovinos babam e têm feridas na boca. O que faz Koffi?' },
      options: [
        { fr: 'Il les achète bon marché et les fait abattre vite', en: 'He buys them cheap and has them slaughtered fast', pt: 'Compra-os barato e manda-os abater depressa', next: 'blocked3' },
        { fr: 'Il refuse et alerte les services vétérinaires', en: 'He refuses and alerts the veterinary services', pt: 'Recusa e alerta os serviços veterinários', next: 'notifyGo', correct: true },
      ],
    },
  },

  quiz: [
    {
      q: { fr: 'Qui est responsable de la sécurité de la viande vendue ?', en: 'Who is responsible for the safety of the meat sold?', pt: 'Quem é responsável pela segurança da carne vendida?' },
      options: [
        { fr: 'Seulement l’État', en: 'Only the State', pt: 'Só o Estado' },
        { fr: 'Les opérateurs qui la vendent', en: 'The businesses that sell it', pt: 'Os operadores que a vendem', correct: true },
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
    {
      q: { fr: 'Une denrée vendue peut nuire à la santé. Que doit faire l’opérateur ?', en: 'A food sold may harm health. What must the business do?', pt: 'Um alimento vendido pode prejudicar a saúde. O que deve fazer o operador?' },
      options: [
        { fr: 'Rien', en: 'Nothing', pt: 'Nada' },
        { fr: 'Informer les autorités et protéger les consommateurs', en: 'Inform the authorities and protect consumers', pt: 'Informar as autoridades e proteger os consumidores', correct: true },
        { fr: 'Baisser son prix', en: 'Lower its price', pt: 'Baixar o preço' },
      ],
      why: { fr: 'Le règlement en fait une obligation pour chaque opérateur.', en: 'The regulation makes this a duty for every food business.', pt: 'O regulamento faz disto uma obrigação de cada operador.' },
    },
    {
      q: { fr: 'On soupçonne la fièvre aphteuse. Qui prévenir ?', en: 'Foot-and-mouth disease is suspected. Who must be told?', pt: 'Suspeita-se de febre aftosa. Quem avisar?' },
      options: [
        { fr: 'Personne', en: 'Nobody', pt: 'Ninguém' },
        { fr: 'Seulement les clients', en: 'Only the customers', pt: 'Só os clientes' },
        { fr: 'L’autorité vétérinaire, immédiatement', en: 'The veterinary authority, at once', pt: 'A autoridade veterinária, de imediato', correct: true },
      ],
      why: { fr: 'C’est une maladie à déclaration obligatoire.', en: 'It is a notifiable disease.', pt: 'É uma doença de declaração obrigatória.' },
    },
    {
      q: { fr: 'Qui siège au conseil consultatif de sécurité des aliments ?', en: 'Who sits on the food safety advisory council?', pt: 'Quem tem assento no conselho consultivo?' },
      options: [
        { fr: 'Administrations, professionnels et consommateurs', en: 'Officials, professionals and consumers', pt: 'Administrações, profissionais e consumidores', correct: true },
        { fr: 'Seulement le gouvernement', en: 'Only the government', pt: 'Só o governo' },
        { fr: 'Seulement les bouchers', en: 'Only the butchers', pt: 'Só os talhantes' },
      ],
      why: { fr: 'Le conseil doit représenter les trois.', en: 'The council must represent all three.', pt: 'O conselho deve representar os três.' },
    },
  ],
};

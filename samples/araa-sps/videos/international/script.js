// All words in the International standards module, in every language. The player, the MP4
// renderer and the subtitle/voice-over exporter all read this one file.
window.SPS_SCRIPT = {
  languages: { fr: 'Français', en: 'English', pt: 'Português' },

  ui: {
    fr: {
      choice: 'Choix', demo: 'Démo interactive', start: 'Commencer', chooseLang: 'Langue',
      title: 'Le marché d’Aïcha', subtitle: 'Les normes internationales qui protègent la viande et ouvrent les marchés',
      pause: 'Pause', play: 'Lecture', restart: 'Recommencer', captions: 'Sous-titres',
      back: 'Revenir au choix', next: 'Suivant', continue: 'Continuer',
      correct: 'Bonne réponse', wrong: 'Pas tout à fait',
      pauseHint: 'Mettez la vidéo en pause et choisissez : 1 ou 2 ?',
      quiz: 'Quiz', score: 'Votre score', replay: 'Rejouer',
      chapters: ['Aïcha', 'Normes', 'Choix', 'Abattoir', 'Transport', 'Quiz', 'Réflexes'],
      nameTag: 'Aïcha · petit abattoir', buyers: 'Acheteurs de la ville', question: 'Viande saine ?',
      abattoir: 'ABATTOIR', treated: 'Traitée hier',
      sps: 'OMC · Accord SPS', pillars: ['Codex Alimentarius', 'OMSA', 'CIPV'], pillarSub: ['Aliments', 'Santé animale', 'Végétaux'],
      residues: 'Résidus détectés', refused: 'Lot refusé', cancelled: 'Commande annulée',
      water: 'Eau potable', clothes: 'Tenue de travail', clean: 'Locaux propres', inspected: 'Inspecté',
      coldChain: 'Chaîne du froid', deal: 'Marché conclu', refusedMeat: 'Viande refusée',
      recapTitle: 'Trois réflexes',
      recap: ['Respecter le délai d’attente des médicaments', 'Inspection et hygiène à l’abattoir', 'Chaîne du froid jusqu’au client'],
      endLine: 'Échantillon de démonstration · contenu à valider par les experts techniques',
      endBy: 'Une production',
    },
    en: {
      choice: 'Choice', demo: 'Interactive demo', start: 'Start', chooseLang: 'Language',
      title: 'Aïcha’s Market', subtitle: 'The international standards that keep meat safe and open markets',
      pause: 'Pause', play: 'Play', restart: 'Restart', captions: 'Captions',
      back: 'Back to the choice', next: 'Next', continue: 'Continue',
      correct: 'Correct', wrong: 'Not quite',
      pauseHint: 'Pause the video and choose: 1 or 2?',
      quiz: 'Quiz', score: 'Your score', replay: 'Play again',
      chapters: ['Aïcha', 'Standards', 'Choice', 'Abattoir', 'Transport', 'Quiz', 'Key habits'],
      nameTag: 'Aïcha · small abattoir', buyers: 'City buyers', question: 'Is the meat safe?',
      abattoir: 'ABATTOIR', treated: 'Treated yesterday',
      sps: 'WTO · SPS Agreement', pillars: ['Codex Alimentarius', 'WOAH', 'IPPC'], pillarSub: ['Food', 'Animal health', 'Plants'],
      residues: 'Residues detected', refused: 'Batch refused', cancelled: 'Order cancelled',
      water: 'Clean water', clothes: 'Work clothes', clean: 'Clean premises', inspected: 'Inspected',
      coldChain: 'Cold chain', deal: 'Deal done', refusedMeat: 'Meat refused',
      recapTitle: 'Three habits',
      recap: ['Respect medicine withdrawal periods', 'Inspection and hygiene at the abattoir', 'Cold chain all the way to the buyer'],
      endLine: 'Demonstration sample · content to be validated by technical experts',
      endBy: 'Produced by',
    },
    pt: {
      choice: 'Escolha', demo: 'Demo interativa', start: 'Começar', chooseLang: 'Idioma',
      title: 'O mercado de Aïcha', subtitle: 'As normas internacionais que protegem a carne e abrem mercados',
      pause: 'Pausa', play: 'Reproduzir', restart: 'Recomeçar', captions: 'Legendas',
      back: 'Voltar à escolha', next: 'Seguinte', continue: 'Continuar',
      correct: 'Resposta certa', wrong: 'Não exatamente',
      pauseHint: 'Pause o vídeo e escolha: 1 ou 2?',
      quiz: 'Quiz', score: 'A sua pontuação', replay: 'Ver de novo',
      chapters: ['Aïcha', 'Normas', 'Escolha', 'Matadouro', 'Transporte', 'Quiz', 'Reflexos'],
      nameTag: 'Aïcha · pequeno matadouro', buyers: 'Compradores da cidade', question: 'A carne é segura?',
      abattoir: 'MATADOURO', treated: 'Tratada ontem',
      sps: 'OMC · Acordo SPS', pillars: ['Codex Alimentarius', 'OMSA', 'CIPV'], pillarSub: ['Alimentos', 'Saúde animal', 'Vegetais'],
      residues: 'Resíduos detetados', refused: 'Lote recusado', cancelled: 'Encomenda cancelada',
      water: 'Água potável', clothes: 'Roupa de trabalho', clean: 'Instalações limpas', inspected: 'Inspecionado',
      coldChain: 'Cadeia de frio', deal: 'Negócio fechado', refusedMeat: 'Carne recusada',
      recapTitle: 'Três reflexos',
      recap: ['Respeitar o intervalo de segurança', 'Inspeção e higiene no matadouro', 'Cadeia de frio até ao cliente'],
      endLine: 'Amostra de demonstração · conteúdo a validar por peritos técnicos',
      endBy: 'Uma produção',
    },
  },

  // Narration, shown as captions and exported as subtitles and the voice-over script.
  // a/b are seconds inside the segment.
  captions: {
    title: [
      { a: 1.2, b: 6.8, fr: 'Le marché d’Aïcha : les normes internationales qui protègent la viande.', en: 'Aïcha’s market: the international standards that keep meat safe.', pt: 'O mercado de Aïcha: as normas internacionais que protegem a carne.' },
    ],
    meet: [
      { a: 0.4, b: 6.9, fr: 'Aïcha dirige un petit abattoir. Des acheteurs d’une grande ville côtière veulent sa viande.', en: 'Aïcha runs a small abattoir. Buyers from a big coastal city want her meat.', pt: 'Aïcha dirige um pequeno matadouro. Compradores de uma grande cidade costeira querem a sua carne.' },
      { a: 6.9, b: 11.4, fr: 'Mais ils demandent une garantie : cette viande est-elle saine ?', en: 'But they ask for a guarantee: is this meat safe?', pt: 'Mas pedem uma garantia: esta carne é segura?' },
    ],
    standards: [
      { a: 0.3, b: 7.4, fr: 'Pour le commerce, l’OMC a un accord sur les mesures sanitaires et phytosanitaires : l’Accord SPS.', en: 'For trade, the WTO has an agreement on sanitary and phytosanitary measures: the SPS Agreement.', pt: 'Para o comércio, a OMC tem um acordo sobre medidas sanitárias e fitossanitárias: o Acordo SPS.' },
      { a: 7.4, b: 17.4, fr: 'Il s’appuie sur trois références : le Codex Alimentarius pour les aliments, l’OMSA pour la santé animale et la CIPV pour les végétaux.', en: 'It relies on three references: the Codex Alimentarius for food, WOAH for animal health and the IPPC for plants.', pt: 'Apoia-se em três referências: o Codex Alimentarius para os alimentos, a OMSA para a saúde animal e a CIPV para os vegetais.' },
    ],
    choice1: [
      { a: 0.3, b: 4.6, fr: 'Une vache a reçu un antibiotique hier. Que fait Aïcha ?', en: 'A cow was given an antibiotic yesterday. What does Aïcha do?', pt: 'Uma vaca recebeu um antibiótico ontem. O que faz Aïcha?' },
      { a: 4.8, b: 10.8, fr: 'Réponse 2 : on respecte le délai d’attente pour éviter des résidus dans la viande.', en: 'Answer 2: respect the withdrawal period to avoid residues in the meat.', pt: 'Resposta 2: respeita-se o intervalo de segurança para evitar resíduos na carne.' },
    ],
    blocked1: [
      { a: 0.3, b: 4.2, fr: 'La viande contient encore des résidus du médicament.', en: 'The meat still contains residues of the medicine.', pt: 'A carne ainda contém resíduos do medicamento.' },
      { a: 4.2, b: 9.8, fr: 'Le contrôle les détecte : le lot est refusé et l’acheteur annule sa commande.', en: 'The check detects them: the batch is refused and the buyer cancels the order.', pt: 'O controlo deteta-os: o lote é recusado e o comprador cancela a encomenda.' },
    ],
    hygiene: [
      { a: 0.3, b: 4.8, fr: 'Avant l’abattage, le vétérinaire inspecte les animaux vivants.', en: 'Before slaughter, the veterinarian inspects the live animals.', pt: 'Antes do abate, o veterinário inspeciona os animais vivos.' },
      { a: 4.8, b: 10.6, fr: 'Après l’abattage, il inspecte chaque carcasse et appose le cachet d’inspection.', en: 'After slaughter, he inspects each carcass and applies the inspection stamp.', pt: 'Depois do abate, inspeciona cada carcaça e aplica o carimbo de inspeção.' },
      { a: 10.6, b: 16.6, fr: 'Locaux propres, eau potable, tenues de travail : l’hygiène protège le consommateur.', en: 'Clean premises, clean water, work clothes: hygiene protects the consumer.', pt: 'Instalações limpas, água potável, roupa de trabalho: a higiene protege o consumidor.' },
    ],
    transportArrive: [
      { a: 0.3, b: 5, fr: 'La viande est prête à partir vers la ville.', en: 'The meat is ready to leave for the city.', pt: 'A carne está pronta para partir para a cidade.' },
    ],
    choice2: [
      { a: 0.3, b: 30, fr: 'Comment transporter la viande jusqu’à la ville ?', en: 'How should the meat travel to the city?', pt: 'Como transportar a carne até à cidade?' },
    ],
    blocked2: [
      { a: 0.3, b: 3.6, fr: 'Sans froid, les microbes se multiplient.', en: 'Without cold, microbes multiply.', pt: 'Sem frio, os micróbios multiplicam-se.' },
      { a: 3.6, b: 7, fr: 'À l’arrivée, la viande est refusée.', en: 'On arrival, the meat is refused.', pt: 'À chegada, a carne é recusada.' },
    ],
    transportGo: [
      { a: 0.3, b: 5.3, fr: 'Dans un camion réfrigéré, la chaîne du froid n’est jamais rompue.', en: 'In a refrigerated truck, the cold chain is never broken.', pt: 'Num camião frigorífico, a cadeia de frio nunca é interrompida.' },
      { a: 5.3, b: 12, fr: 'Des règles fondées sur les mêmes normes internationales facilitent le commerce entre pays.', en: 'Rules based on the same international standards make trade between countries easier.', pt: 'Regras baseadas nas mesmas normas internacionais facilitam o comércio entre países.' },
    ],
    recap: [
      { a: 0.3, b: 9, fr: 'Des normes communes pour une viande saine et des marchés ouverts.', en: 'Shared standards for safe meat and open markets.', pt: 'Normas comuns para uma carne segura e mercados abertos.' },
    ],
  },

  choices: {
    choice1: {
      q: { fr: 'Une vache a reçu un antibiotique hier. Que fait Aïcha ?', en: 'A cow was given an antibiotic yesterday. What does Aïcha do?', pt: 'Uma vaca recebeu um antibiótico ontem. O que faz Aïcha?' },
      options: [
        { fr: 'L’abattre aujourd’hui pour la vendre vite', en: 'Slaughter it today to sell it quickly', pt: 'Abatê-la hoje para a vender depressa', next: 'blocked1' },
        { fr: 'Attendre la fin du délai d’attente du médicament', en: 'Wait until the medicine’s withdrawal period is over', pt: 'Esperar pelo fim do intervalo de segurança do medicamento', next: 'hygiene', correct: true },
      ],
    },
    choice2: {
      q: { fr: 'Comment transporter la viande jusqu’à la ville ?', en: 'How should the meat travel to the city?', pt: 'Como transportar a carne até à cidade?' },
      options: [
        { fr: 'Dans une camionnette ouverte, au soleil', en: 'In an open pickup, in the sun', pt: 'Numa carrinha aberta, ao sol', next: 'blocked2' },
        { fr: 'Dans un camion réfrigéré', en: 'In a refrigerated truck', pt: 'Num camião frigorífico', next: 'transportGo', correct: true },
      ],
    },
  },

  quiz: [
    {
      q: { fr: 'Quelle organisation élabore les normes internationales de santé animale ?', en: 'Which organisation develops international animal health standards?', pt: 'Que organização elabora as normas internacionais de saúde animal?' },
      options: [
        { fr: 'Le Codex Alimentarius', en: 'The Codex Alimentarius', pt: 'O Codex Alimentarius' },
        { fr: 'L’OMSA', en: 'WOAH', pt: 'A OMSA', correct: true },
        { fr: 'L’OMC', en: 'The WTO', pt: 'A OMC' },
      ],
      why: { fr: 'L’OMSA élabore les normes de santé animale ; le Codex, celles des aliments.', en: 'WOAH develops animal health standards; the Codex develops food standards.', pt: 'A OMSA elabora as normas de saúde animal; o Codex, as dos alimentos.' },
    },
    {
      q: { fr: 'Pourquoi respecter le délai d’attente après un traitement ?', en: 'Why respect the withdrawal period after a treatment?', pt: 'Porque se respeita o intervalo de segurança depois de um tratamento?' },
      options: [
        { fr: 'Pour éviter des résidus de médicaments dans la viande', en: 'To avoid medicine residues in the meat', pt: 'Para evitar resíduos de medicamentos na carne', correct: true },
        { fr: 'Pour que l’animal grossisse', en: 'So the animal puts on weight', pt: 'Para o animal engordar' },
        { fr: 'Pour payer moins de taxes', en: 'To pay less tax', pt: 'Para pagar menos impostos' },
      ],
      why: { fr: 'Pendant ce délai, l’organisme élimine le médicament.', en: 'During this period, the body eliminates the medicine.', pt: 'Durante este intervalo, o organismo elimina o medicamento.' },
    },
    {
      q: { fr: 'Selon l’Accord SPS de l’OMC, une mesure sanitaire doit être…', en: 'Under the WTO SPS Agreement, a health measure must be…', pt: 'Segundo o Acordo SPS da OMC, uma medida sanitária deve ser…' },
      options: [
        { fr: 'Fondée sur des preuves scientifiques', en: 'Based on scientific evidence', pt: 'Baseada em provas científicas', correct: true },
        { fr: 'Décidée sans justification', en: 'Decided without justification', pt: 'Decidida sem justificação' },
        { fr: 'Réservée aux pays voisins', en: 'Reserved for neighbouring countries', pt: 'Reservada aos países vizinhos' },
      ],
      why: { fr: 'Elle doit reposer sur la science et ne pas restreindre le commerce plus que nécessaire.', en: 'It must rest on science and not restrict trade more than necessary.', pt: 'Deve assentar na ciência e não restringir o comércio mais do que o necessário.' },
    },
  ],
};

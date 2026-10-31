// All words in the ECOWAS module (full length, about 7 minutes), in every language. Rules follow
// Regulation C/REG.21/11/10; the article behind each line is noted beside its segment. The player, the MP4 renderer and the
// subtitle/voice-over exporter all read this one file, so a new language is one new key.
window.SPS_SCRIPT = {
  languages: { fr: 'Français', en: 'English', pt: 'Português' },

  ui: {
    fr: {
      choice: 'Choix', demo: 'Démo interactive', start: 'Commencer', chooseLang: 'Langue',
      title: 'Le voyage de Moussa', subtitle: 'Les règles sanitaires du commerce du bétail en Afrique de l’Ouest',
      pause: 'Pause', play: 'Lecture', restart: 'Recommencer', captions: 'Sous-titres',
      back: 'Revenir au choix', next: 'Suivant', continue: 'Continuer',
      correct: 'Bonne réponse', wrong: 'Pas tout à fait',
      pauseHint: 'Mettez la vidéo en pause et choisissez : 1 ou 2 ?',
      quiz: 'Quiz', score: 'Votre score', replay: 'Rejouer',
      chapters: ['Départ', 'Risques et règles', 'Qui fait quoi', 'Choix', 'Vétérinaire', 'Frontière', 'Transhumance', 'Alerte', 'Produits', 'Quiz', 'À retenir'],
      reg: 'CEDEAO · Règlement C/REG.21/11/10', pillars: ['Végétaux', 'Animaux', 'Aliments'], stages: ['Production', 'Transformation', 'Distribution'],
      health: 'Santé humaine ↔ santé animale', principles: ['Normes internationales', 'Données scientifiques', 'Précaution', 'Pas plus de restrictions que nécessaire'], freeLbl: 'Libre circulation',
      mutual: 'Reconnaissance mutuelle', rights: ['Transparence', 'Impartialité', 'Proportionnalité'], actors: ['Administration vétérinaire', 'Vétérinaire officiel', 'Vétérinaire privé mandaté', 'Comité régional et réseaux'],
      posts: 'Postes frontaliers', quarantine: 'Quarantaine', reasons: 'Mesure motivée',
      notifiable: 'Maladie à déclaration obligatoire', transCert: 'Certificat international de transhumance', seasons: ['Saison sèche', 'Saison des pluies'],
      market: 'Marché', alertNet: 'Réseau d’alerte', commission: 'Commission de la CEDEAO',
      woah: 'OMSA', perimeter: 'Périmètre de contrôle', eradicated: 'Maladie éradiquée',
      restricted: 'Restrictions sur tout le pays', products: ['Viande', 'Lait', 'Cuirs et peaux'], origin: 'Certificat d’origine',
      disinfection: 'Certificat de désinfection', export: 'Exportation', operators: ['Éleveur', 'Transporteur', 'Commerçant', 'Boucher'],
      safe: 'Produits sûrs', inform: 'Informer les autorités', outreach: ['Participation aux décisions', 'Information sur les risques', 'Sensibilisation'],
      rulesTitle: 'Quatre règles', rules: ['Normes internationales et science', 'Libre circulation des produits conformes', 'Certificat vétérinaire et postes frontaliers', 'Alerte immédiate'],
      nameTag: 'Moussa · commerçant de bétail', herd: '× 40 bœufs',
      cert: 'CERTIFICAT VÉTÉRINAIRE', certShort: 'Certificat vétérinaire', vaccine: 'Vacciné', examined: 'Examiné',
      border: 'FRONTIÈRE', stop: 'ARRÊT', blocked: 'Troupeau bloqué', wait: 'Attente · contrôles · troupeau retenu',
      receipt: 'REÇU D’ACHAT', valid: 'VALIDE',
      diseases: ['Péripneumonie contagieuse bovine', 'Fièvre aphteuse', 'Peste des petits ruminants'],
      recapTitle: 'Trois réflexes',
      recap: ['Vétérinaire officiel avant le départ', 'Le certificat voyage avec le troupeau', 'Contrôle sanitaire à la frontière'],
      endLine: 'Échantillon de démonstration · contenu à valider par les experts techniques',
      endBy: 'Une production',
    },
    en: {
      choice: 'Choice', demo: 'Interactive demo', start: 'Start', chooseLang: 'Language',
      title: 'Moussa’s Journey', subtitle: 'Animal health rules for the livestock trade in West Africa',
      pause: 'Pause', play: 'Play', restart: 'Restart', captions: 'Captions',
      back: 'Back to the choice', next: 'Next', continue: 'Continue',
      correct: 'Correct', wrong: 'Not quite',
      pauseHint: 'Pause the video and choose: 1 or 2?',
      quiz: 'Quiz', score: 'Your score', replay: 'Play again',
      chapters: ['Setting off', 'Risks and rules', 'Who does what', 'Choice', 'Veterinarian', 'Border', 'Transhumance', 'Alert', 'Products', 'Quiz', 'Key points'],
      reg: 'ECOWAS · Regulation C/REG.21/11/10', pillars: ['Plants', 'Animals', 'Food'], stages: ['Production', 'Processing', 'Distribution'],
      health: 'Human health ↔ animal health', principles: ['International standards', 'Scientific data', 'Precaution', 'No more restriction than needed'], freeLbl: 'Free movement',
      mutual: 'Mutual recognition', rights: ['Transparency', 'Impartiality', 'Proportionality'], actors: ['Veterinary administration', 'Official veterinarian', 'Mandated private vet', 'Regional committee and networks'],
      posts: 'Border posts', quarantine: 'Quarantine', reasons: 'Reasons given',
      notifiable: 'Notifiable disease', transCert: 'International transhumance certificate', seasons: ['Dry season', 'Rainy season'],
      market: 'Market', alertNet: 'Alert network', commission: 'ECOWAS Commission',
      woah: 'WOAH', perimeter: 'Control area', eradicated: 'Disease eradicated',
      restricted: 'Whole country restricted', products: ['Meat', 'Milk', 'Hides and skins'], origin: 'Certificate of origin',
      disinfection: 'Disinfection certificate', export: 'Export', operators: ['Herder', 'Transporter', 'Trader', 'Butcher'],
      safe: 'Safe products', inform: 'Inform the authorities', outreach: ['A say in decisions', 'Information on risks', 'Awareness'],
      rulesTitle: 'Four rules', rules: ['International standards and science', 'Free movement for compliant goods', 'Veterinary certificate and border posts', 'Alert at once'],
      nameTag: 'Moussa · livestock trader', herd: '× 40 cattle',
      cert: 'VETERINARY CERTIFICATE', certShort: 'Veterinary certificate', vaccine: 'Vaccinated', examined: 'Examined',
      border: 'BORDER', stop: 'STOP', blocked: 'Herd held', wait: 'Waiting · checks · herd held',
      receipt: 'SALES RECEIPT', valid: 'VALID',
      diseases: ['Contagious bovine pleuropneumonia', 'Foot-and-mouth disease', 'Peste des petits ruminants'],
      recapTitle: 'Three habits',
      recap: ['Official veterinarian before leaving', 'The certificate travels with the herd', 'Health check at the border'],
      endLine: 'Demonstration sample · content to be validated by technical experts',
      endBy: 'Produced by',
    },
    pt: {
      choice: 'Escolha', demo: 'Demo interativa', start: 'Começar', chooseLang: 'Idioma',
      title: 'A viagem de Moussa', subtitle: 'Regras sanitárias do comércio de gado na África Ocidental',
      pause: 'Pausa', play: 'Reproduzir', restart: 'Recomeçar', captions: 'Legendas',
      back: 'Voltar à escolha', next: 'Seguinte', continue: 'Continuar',
      correct: 'Resposta certa', wrong: 'Não exatamente',
      pauseHint: 'Pause o vídeo e escolha: 1 ou 2?',
      quiz: 'Quiz', score: 'A sua pontuação', replay: 'Ver de novo',
      chapters: ['Partida', 'Riscos e regras', 'Quem faz o quê', 'Escolha', 'Veterinário', 'Fronteira', 'Transumância', 'Alerta', 'Produtos', 'Quiz', 'A reter'],
      reg: 'CEDEAO · Regulamento C/REG.21/11/10', pillars: ['Vegetais', 'Animais', 'Alimentos'], stages: ['Produção', 'Transformação', 'Distribuição'],
      health: 'Saúde humana ↔ saúde animal', principles: ['Normas internacionais', 'Dados científicos', 'Precaução', 'Sem mais restrições do que o necessário'], freeLbl: 'Livre circulação',
      mutual: 'Reconhecimento mútuo', rights: ['Transparência', 'Imparcialidade', 'Proporcionalidade'], actors: ['Administração veterinária', 'Veterinário oficial', 'Veterinário privado mandatado', 'Comité regional e redes'],
      posts: 'Postos fronteiriços', quarantine: 'Quarentena', reasons: 'Medida fundamentada',
      notifiable: 'Doença de declaração obrigatória', transCert: 'Certificado internacional de transumância', seasons: ['Estação seca', 'Estação das chuvas'],
      market: 'Mercado', alertNet: 'Rede de alerta', commission: 'Comissão da CEDEAO',
      woah: 'OMSA', perimeter: 'Perímetro de controlo', eradicated: 'Doença erradicada',
      restricted: 'Todo o país restringido', products: ['Carne', 'Leite', 'Couros e peles'], origin: 'Certificado de origem',
      disinfection: 'Certificado de desinfeção', export: 'Exportação', operators: ['Criador', 'Transportador', 'Comerciante', 'Talhante'],
      safe: 'Produtos seguros', inform: 'Informar as autoridades', outreach: ['Participação nas decisões', 'Informação sobre os riscos', 'Sensibilização'],
      rulesTitle: 'Quatro regras', rules: ['Normas internacionais e ciência', 'Livre circulação do que é conforme', 'Certificado veterinário e postos fronteiriços', 'Alerta imediato'],
      nameTag: 'Moussa · comerciante de gado', herd: '× 40 bois',
      cert: 'CERTIFICADO VETERINÁRIO', certShort: 'Certificado veterinário', vaccine: 'Vacinado', examined: 'Examinado',
      border: 'FRONTEIRA', stop: 'PARE', blocked: 'Rebanho retido', wait: 'Espera · controlos · rebanho retido',
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
    // Regulation C/REG.21/11/10 of 26 November 2010: Art. 2–3 (scope), preamble (human and animal health)
    why: [
      { a: 0.3, b: 7.4, fr: 'Chaque jour, des animaux et des produits animaux traversent les frontières de l’Afrique de l’Ouest.', en: 'Every day, animals and animal products cross the borders of West Africa.', pt: 'Todos os dias, animais e produtos animais atravessam as fronteiras da África Ocidental.' },
      { a: 7.4, b: 14.6, fr: 'En 2010, la CEDEAO a adopté un règlement qui harmonise les règles sanitaires des végétaux, des animaux et des aliments.', en: 'In 2010, ECOWAS adopted a regulation that harmonises the health rules for plants, animals and food.', pt: 'Em 2010, a CEDEAO adotou um regulamento que harmoniza as regras sanitárias dos vegetais, dos animais e dos alimentos.' },
      { a: 14.6, b: 21.6, fr: 'Il s’applique de la production à la distribution, car la santé humaine dépend de la santé animale.', en: 'It applies from production to distribution, because human health depends on animal health.', pt: 'Aplica-se da produção à distribuição, porque a saúde humana depende da saúde animal.' },
    ],
    // Art. 5 (Codex, WTO SPS and TBT, IPPC, OIE), Art. 6 (risk assessment, proportionality), Art. 7 (precaution)
    principles: [
      { a: 0.3, b: 7.2, fr: 'Le règlement fixe des principes communs. D’abord, les mesures se fondent sur les normes internationales.', en: 'The regulation sets common principles. First, measures are based on international standards.', pt: 'O regulamento fixa princípios comuns. Primeiro, as medidas baseiam-se nas normas internacionais.' },
      { a: 7.2, b: 13.6, fr: 'Les risques sont évalués sur des données scientifiques, et les mesures restent proportionnées au risque.', en: 'Risks are assessed on scientific data, and measures stay proportionate to the risk.', pt: 'Os riscos são avaliados com base em dados científicos, e as medidas mantêm-se proporcionais ao risco.' },
      { a: 13.6, b: 20, fr: 'L’absence de certitude scientifique absolue n’est pas un prétexte pour retarder l’action.', en: 'A lack of full scientific certainty is no excuse to delay action.', pt: 'A falta de certeza científica absoluta não é pretexto para adiar a ação.' },
      { a: 20, b: 25.6, fr: 'Mais une mesure provisoire ne doit pas restreindre le commerce plus que nécessaire.', en: 'But a provisional measure must not restrict trade more than necessary.', pt: 'Mas uma medida provisória não deve restringir o comércio mais do que o necessário.' },
    ],
    // Art. 4 and 10 (mutual recognition, free movement), Art. 11 (rights during inspections)
    freeMove: [
      { a: 0.3, b: 7.6, fr: 'Les animaux et produits conformes aux normes communautaires circulent librement dans l’espace CEDEAO.', en: 'Animals and products that meet community standards move freely across the ECOWAS area.', pt: 'Os animais e produtos conformes às normas comunitárias circulam livremente no espaço da CEDEAO.' },
      { a: 7.6, b: 14.4, fr: 'Chaque pays accepte ceux qui sont conformes aux normes d’un autre État membre.', en: 'Each country accepts those that meet the standards of another member state.', pt: 'Cada país aceita os que estão conformes às normas de outro Estado-membro.' },
      { a: 14.4, b: 21.6, fr: 'Et toute personne contrôlée a droit à la transparence, à l’impartialité et à la proportionnalité.', en: 'And anyone inspected is entitled to transparency, impartiality and proportionality.', pt: 'E quem é controlado tem direito à transparência, à imparcialidade e à proporcionalidade.' },
    ],
    // Art. 61 (veterinary administration), Art. 1 (official veterinarian), Art. 63 (sanitary mandate), Art. 13 and 17 (committee, networks)
    actors: [
      { a: 0.3, b: 7.4, fr: 'Qui fait quoi ? Chaque pays a une administration vétérinaire, qui désigne l’autorité chargée des certificats vétérinaires.', en: 'Who does what? Each country has a veterinary administration, which names the authority that issues veterinary certificates.', pt: 'Quem faz o quê? Cada país tem uma administração veterinária, que designa a autoridade responsável pelos certificados veterinários.' },
      { a: 7.4, b: 14.6, fr: 'Les vétérinaires officiels assurent les contrôles sanitaires et la certification des animaux.', en: 'Official veterinarians carry out the health checks and certify the animals.', pt: 'Os veterinários oficiais asseguram os controlos sanitários e a certificação dos animais.' },
      { a: 14.6, b: 21.2, fr: 'Des vétérinaires privés peuvent recevoir un mandat sanitaire : prophylaxie, surveillance, inspection.', en: 'Private vets can receive a sanitary mandate: disease prevention, surveillance, inspection.', pt: 'Veterinários privados podem receber um mandato sanitário: profilaxia, vigilância, inspeção.' },
      { a: 21.2, b: 27.6, fr: 'Au niveau régional, un comité et des réseaux d’experts, de laboratoires et d’alerte relient les pays.', en: 'Across the region, a committee and networks of experts, laboratories and alerts link the countries.', pt: 'A nível regional, um comité e redes de peritos, laboratórios e alerta ligam os países.' },
    ],
    choice1: [
      { a: 0.3, b: 4.4, fr: 'Avant de partir, que doit faire Moussa ?', en: 'Before leaving, what should Moussa do?', pt: 'Antes de partir, o que deve fazer Moussa?' },
      { a: 4.8, b: 9.1, fr: 'Réponse 2 : le contrôle sanitaire commence avant le départ.', en: 'Answer 2: the health check starts before the journey.', pt: 'Resposta 2: o controlo sanitário começa antes da partida.' },
    ],
    blocked1: [
      { a: 0.3, b: 4.2, fr: 'Sans certificat vétérinaire, le troupeau est arrêté à la frontière.', en: 'Without a veterinary certificate, the herd is stopped at the border.', pt: 'Sem certificado veterinário, o rebanho é parado na fronteira.' },
      { a: 4.2, b: 9.1, fr: 'Contrôles, attente, troupeau retenu : Moussa perd du temps et de l’argent.', en: 'Checks, waiting, the herd held back: Moussa loses time and money.', pt: 'Controlos, espera, rebanho retido: Moussa perde tempo e dinheiro.' },
    ],
    // Art. 70.2 and 74.1: a veterinary certificate from an official veterinarian, shown at the veterinary control posts on the route
    vet: [
      { a: 0.3, b: 5.6, fr: 'Moussa appelle le vétérinaire officiel, qui examine et vaccine chaque animal.', en: 'Moussa calls the official veterinarian, who examines and vaccinates each animal.', pt: 'Moussa chama o veterinário oficial, que examina e vacina cada animal.' },
      { a: 5.6, b: 11.4, fr: 'Les animaux sont sains : le vétérinaire officiel délivre le certificat vétérinaire.', en: 'The animals are healthy: the official veterinarian issues the veterinary certificate.', pt: 'Os animais estão saudáveis: o veterinário oficial emite o certificado veterinário.' },
      { a: 11.4, b: 16.3, fr: 'Il accompagne le troupeau et se présente aux postes de contrôle.', en: 'It goes with the herd and is shown at the veterinary posts on the route.', pt: 'Acompanha o rebanho e é apresentado nos postos veterinários do percurso.' },
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
    // Art. 74.2–74.5 (border posts, refusal or quarantine of diseased animals, measures reported with reasons)
    borderRules: [
      { a: 0.3, b: 6.8, fr: 'Chaque pays fixe la liste des postes frontaliers par lesquels les animaux peuvent entrer.', en: 'Each country lists the border posts where animals may enter.', pt: 'Cada país fixa a lista dos postos fronteiriços por onde os animais podem entrar.' },
      { a: 6.8, b: 13.4, fr: 'Si des animaux sont atteints d’une maladie à déclaration obligatoire, il peut refuser leur entrée ou les mettre en quarantaine.', en: 'If animals carry a notifiable disease, it can refuse them entry or put them in quarantine.', pt: 'Se os animais tiverem uma doença de declaração obrigatória, pode recusar a entrada ou pô-los em quarentena.' },
      { a: 13.4, b: 19.6, fr: 'Ces mesures sont communiquées immédiatement, avec leurs motifs.', en: 'Such measures are reported straight away, with the reasons.', pt: 'Essas medidas são comunicadas de imediato, com os motivos.' },
    ],
    // Preamble (transhumance), Art. 73 (ECOWAS international transhumance certificate, Decision A/DEC.5/10/98)
    transhumance: [
      { a: 0.3, b: 7.4, fr: 'La transhumance déplace les troupeaux au fil des saisons. C’est un mode d’élevage utile, mais aussi une source de problèmes sanitaires.', en: 'Transhumance moves herds with the seasons. It is a useful way of raising livestock, but also a source of health problems.', pt: 'A transumância desloca os rebanhos ao ritmo das estações. É um modo de criação útil, mas também uma fonte de problemas sanitários.' },
      { a: 7.4, b: 14.6, fr: 'Les États membres facilitent la circulation des troupeaux transhumants d’un pays à l’autre,', en: 'Member states make it easier for transhumant herds to move from country to country,', pt: 'Os Estados-membros facilitam a circulação dos rebanhos transumantes de um país para outro,' },
      { a: 14.6, b: 21.6, fr: 'avec le certificat international de transhumance de la CEDEAO.', en: 'with the ECOWAS international transhumance certificate.', pt: 'com o certificado internacional de transumância da CEDEAO.' },
    ],
    // Art. 1 (notifiable disease: detection or suspicion brought to the veterinary authority immediately)
    alert: [
      { a: 0.3, b: 7.2, fr: 'Au marché, Moussa remarque des animaux d’un autre troupeau qui toussent et respirent mal.', en: 'At the market, Moussa notices animals from another herd coughing and short of breath.', pt: 'No mercado, Moussa repara em animais de outro rebanho que tossem e respiram mal.' },
      { a: 7.2, b: 17.6, fr: 'Ce pourrait être une maladie à déclaration obligatoire : toute suspicion doit être signalée immédiatement à l’autorité vétérinaire.', en: 'It could be a notifiable disease: any suspicion must be reported to the veterinary authority at once.', pt: 'Pode ser uma doença de declaração obrigatória: qualquer suspeita deve ser comunicada de imediato à autoridade veterinária.' },
    ],
    choice3: [
      { a: 0.3, b: 4.6, fr: 'Que doit faire Moussa ?', en: 'What should Moussa do?', pt: 'O que deve fazer Moussa?' },
      { a: 4.8, b: 10.8, fr: 'Réponse 2 : alerter tout de suite les services vétérinaires.', en: 'Answer 2: alert the veterinary services straight away.', pt: 'Resposta 2: alertar de imediato os serviços veterinários.' },
    ],
    // Art. 74.4(b): restriction of the whole territory when a disease spreads widely
    blocked3: [
      { a: 0.3, b: 4.6, fr: 'Sans alerte, la maladie passe de troupeau en troupeau.', en: 'With no alert, the disease spreads from herd to herd.', pt: 'Sem alerta, a doença passa de rebanho em rebanho.' },
      { a: 4.6, b: 9.8, fr: 'Les pays voisins peuvent alors restreindre les animaux venant de tout le pays.', en: 'Neighbouring countries can then restrict animals from the whole country.', pt: 'Os países vizinhos podem então restringir os animais vindos de todo o país.' },
    ],
    // Art. 64 (declaration of infection, defined area), Art. 32 (alert network, Commission, OIE), Art. 74.4(a) (restriction of the affected parts), Art. 32.4 (end on eradication)
    alertGo: [
      { a: 0.3, b: 7.4, fr: 'Les autorités déclarent la maladie et appliquent des mesures dans un périmètre déterminé.', en: 'The authorities declare the disease and apply measures within a defined area.', pt: 'As autoridades declaram a doença e aplicam medidas num perímetro determinado.' },
      { a: 7.4, b: 14.4, fr: 'Le pays informe la Commission de la CEDEAO et les autres États par le réseau d’alerte, ainsi que l’OMSA.', en: 'The country informs the ECOWAS Commission and the other states through the alert network, and WOAH too.', pt: 'O país informa a Comissão da CEDEAO e os outros Estados através da rede de alerta, e também a OMSA.' },
      { a: 14.4, b: 20.8, fr: 'Les restrictions peuvent ne viser que la partie du pays où la maladie est apparue,', en: 'Restrictions can target only the part of the country where the disease appeared,', pt: 'As restrições podem visar apenas a parte do país onde a doença apareceu,' },
      { a: 20.8, b: 25.6, fr: 'et elles prennent fin une fois la maladie éradiquée.', en: 'and they end once the disease is eradicated.', pt: 'e terminam assim que a doença é erradicada.' },
    ],
    // Art. 74.1 (animal products between member states), Art. 72.4 (hides, skins, horns for export)
    products: [
      { a: 0.3, b: 7.4, fr: 'Les produits d’origine animale voyagent aussi : viande, lait, cuirs et peaux.', en: 'Products of animal origin travel too: meat, milk, hides and skins.', pt: 'Os produtos de origem animal também viajam: carne, leite, couros e peles.' },
      { a: 7.4, b: 14.4, fr: 'Envoyés vers un autre État membre, ils sont aussi accompagnés d’un certificat vétérinaire délivré par un vétérinaire officiel.', en: 'Sent to another member state, they too travel with a veterinary certificate from an official veterinarian.', pt: 'Enviados para outro Estado-membro, também seguem com um certificado veterinário emitido por um veterinário oficial.' },
      { a: 14.4, b: 21.6, fr: 'À l’exportation, cuirs, peaux et cornes demandent un certificat d’origine et un certificat de désinfection.', en: 'For export, hides, skins and horns need a certificate of origin and a disinfection certificate.', pt: 'Na exportação, couros, peles e chifres exigem um certificado de origem e um certificado de desinfeção.' },
    ],
    // Art. 1 (economic operator), Art. 78 (operators responsible, safe products, duty to inform)
    operators: [
      { a: 0.3, b: 7.6, fr: 'Quiconque produit, transporte ou vend des animaux ou des aliments est un opérateur économique.', en: 'Anyone who produces, transports or sells animals or food is an economic operator.', pt: 'Quem produz, transporta ou vende animais ou alimentos é um operador económico.' },
      { a: 7.6, b: 15.2, fr: 'Les opérateurs du secteur alimentaire répondent de la qualité sanitaire de ce qu’ils vendent, et mettent sur le marché des produits sûrs.', en: 'Food operators answer for the safety of what they sell, and place only safe products on the market.', pt: 'Os operadores do setor alimentar respondem pela qualidade sanitária do que vendem, e colocam no mercado produtos seguros.' },
      { a: 15.2, b: 23.6, fr: 'Si un produit peut nuire à la santé, ils informent les autorités et agissent pour protéger les consommateurs.', en: 'If a product may harm health, they inform the authorities and act to protect consumers.', pt: 'Se um produto puder prejudicar a saúde, informam as autoridades e agem para proteger os consumidores.' },
    ],
    // Art. 12 (participation, information), Art. 34 (awareness campaigns)
    outreach: [
      { a: 0.3, b: 7.6, fr: 'Les pays associent aussi les acteurs aux décisions et les informent des risques sanitaires.', en: 'Countries also give stakeholders a say in decisions and keep them informed about health risks.', pt: 'Os países também associam os intervenientes às decisões e informam-nos sobre os riscos sanitários.' },
      { a: 7.6, b: 15.6, fr: 'Les campagnes de sensibilisation, comme cette vidéo, aident chacun à détecter, prévenir et gérer les risques sanitaires.', en: 'Awareness campaigns, like this video, help everyone detect, prevent and manage health risks.', pt: 'As campanhas de sensibilização, como este vídeo, ajudam todos a detetar, prevenir e gerir os riscos sanitários.' },
    ],
    rules: [
      { a: 0.3, b: 9.6, fr: 'Quatre règles à retenir : science, libre circulation, certificat vétérinaire et alerte immédiate.', en: 'Four rules to remember: science, free movement, the veterinary certificate and an immediate alert.', pt: 'Quatro regras a reter: ciência, livre circulação, certificado veterinário e alerta imediato.' },
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
        { fr: 'Le certificat vétérinaire', en: 'The veterinary certificate', pt: 'O certificado veterinário', next: 'borderCross', correct: true },
      ],
    },
    choice3: {
      q: { fr: 'Des animaux toussent et respirent mal au marché. Que doit faire Moussa ?', en: 'Animals at the market are coughing and short of breath. What should Moussa do?', pt: 'Há animais no mercado que tossem e respiram mal. O que deve fazer Moussa?' },
      options: [
        { fr: 'Ne rien dire et vendre vite', en: 'Say nothing and sell quickly', pt: 'Não dizer nada e vender depressa', next: 'blocked3' },
        { fr: 'Alerter tout de suite les services vétérinaires', en: 'Alert the veterinary services straight away', pt: 'Alertar de imediato os serviços veterinários', next: 'alertGo', correct: true },
      ],
    },
  },

  quiz: [
    {
      q: { fr: 'Qui délivre le certificat vétérinaire ?', en: 'Who issues the veterinary certificate?', pt: 'Quem emite o certificado veterinário?' },
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
    {
      q: { fr: 'Un animal pourrait avoir une maladie à déclaration obligatoire. Que faire ?', en: 'An animal may have a notifiable disease. What now?', pt: 'Um animal pode ter uma doença de declaração obrigatória. E agora?' },
      options: [
        { fr: 'Attendre de voir', en: 'Wait and see', pt: 'Esperar para ver' },
        { fr: 'Le signaler immédiatement à l’autorité vétérinaire', en: 'Report it to the veterinary authority at once', pt: 'Comunicá-lo de imediato à autoridade veterinária', correct: true },
        { fr: 'L’emmener sur un autre marché', en: 'Take it to another market', pt: 'Levá-lo para outro mercado' },
      ],
      why: { fr: 'Toute suspicion doit être portée immédiatement à l’autorité vétérinaire.', en: 'Any suspicion must go to the veterinary authority at once.', pt: 'Qualquer suspeita deve ir de imediato à autoridade veterinária.' },
    },
    {
      q: { fr: 'Quel document aide les troupeaux transhumants ?', en: 'Which document helps transhumant herds?', pt: 'Que documento ajuda os rebanhos transumantes?' },
      options: [
        { fr: 'Le certificat international de transhumance de la CEDEAO', en: 'The ECOWAS international transhumance certificate', pt: 'O certificado internacional de transumância da CEDEAO', correct: true },
        { fr: 'Un reçu du marché', en: 'A market receipt', pt: 'Um recibo do mercado' },
        { fr: 'Aucun document', en: 'No document at all', pt: 'Nenhum documento' },
      ],
      why: { fr: 'Les États membres adoptent ce certificat pour faciliter la transhumance.', en: 'Member states adopt this certificate to ease transhumance.', pt: 'Os Estados-membros adotam este certificado para facilitar a transumância.' },
    },
    {
      q: { fr: 'Qui répond de la sécurité des aliments mis en vente ?', en: 'Who answers for the safety of food on sale?', pt: 'Quem responde pela segurança dos alimentos à venda?' },
      options: [
        { fr: 'Personne', en: 'Nobody', pt: 'Ninguém' },
        { fr: 'Seulement l’État', en: 'Only the State', pt: 'Só o Estado' },
        { fr: 'Les opérateurs qui les vendent', en: 'The operators who sell it', pt: 'Os operadores que os vendem', correct: true },
      ],
      why: { fr: 'Les opérateurs répondent de ce qu’ils vendent ; l’État contrôle.', en: 'Operators answer for what they sell; the State checks.', pt: 'Os operadores respondem pelo que vendem; o Estado controla.' },
    },
  ],
};

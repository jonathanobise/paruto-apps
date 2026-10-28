// Radio / podcast capsules: one episode per framework, a host talking with a veterinarian.
// tools/capsules.py turns this into MP3 (podcast) and WAV (broadcast) files per language; the
// kit page shows the transcript and cue sheet from the same data. Claims match the videos.
window.SPS_CAPSULES = {
  show: { fr: 'Santé animale, marchés ouverts', en: 'Healthy Animals, Open Markets', pt: 'Animais saudáveis, mercados abertos' },
  roles: {
    host: { fr: 'Animatrice', en: 'Host', pt: 'Apresentador' },
    vet: { fr: 'Vétérinaire', en: 'Veterinarian', pt: 'Veterinário' },
  },
  episodes: [
    {
      id: 'international', n: 1, video: 'international',
      title: { fr: 'Les normes internationales', en: 'International standards', pt: 'As normas internacionais' },
      lines: [
        { who: 'host', fr: 'Bienvenue dans « Santé animale, marchés ouverts », l’émission qui explique les règles sanitaires du commerce du bétail en Afrique de l’Ouest.', en: 'Welcome to Healthy Animals, Open Markets, the programme that explains the health rules of the livestock trade in West Africa.', pt: 'Bem-vindos a «Animais saudáveis, mercados abertos», o programa que explica as regras sanitárias do comércio de gado na África Ocidental.' },
        { who: 'host', fr: 'Aujourd’hui : les normes internationales. Pourquoi un acheteur à l’étranger peut-il faire confiance à votre viande ? Nous en parlons avec un vétérinaire.', en: 'Today: international standards. Why can a buyer abroad trust your meat? We talk it through with a veterinarian.', pt: 'Hoje: as normas internacionais. Porque é que um comprador no estrangeiro pode confiar na sua carne? Falamos disso com um veterinário.' },
        { who: 'host', fr: 'Docteur, qu’est-ce que l’Accord SPS ?', en: 'Doctor, what is the SPS Agreement?', pt: 'Doutor, o que é o Acordo SPS?' },
        { who: 'vet', fr: 'C’est un accord de l’Organisation mondiale du commerce. Chaque pays peut protéger la santé des personnes, des animaux et des végétaux, à condition que ses mesures reposent sur la science et ne freinent pas le commerce plus que nécessaire.', en: 'It is a World Trade Organization agreement. Each country may protect human, animal and plant health, as long as its measures are based on science and do not restrict trade more than necessary.', pt: 'É um acordo da Organização Mundial do Comércio. Cada país pode proteger a saúde das pessoas, dos animais e das plantas, desde que as suas medidas se baseiem na ciência e não restrinjam o comércio mais do que o necessário.' },
        { who: 'host', fr: 'Et qui écrit les normes ?', en: 'And who writes the standards?', pt: 'E quem escreve as normas?' },
        { who: 'vet', fr: 'Trois organisations de référence : le Codex Alimentarius pour la sécurité des aliments, l’OMSA pour la santé animale, et la CIPV pour la santé des végétaux.', en: 'Three reference bodies: the Codex Alimentarius for food safety, WOAH for animal health, and the IPPC for plant health.', pt: 'Três organizações de referência: o Codex Alimentarius para a segurança dos alimentos, a OMSA para a saúde animal e a CIPV para a sanidade vegetal.' },
        { who: 'host', fr: 'Concrètement, pour un éleveur ou un abattoir ?', en: 'In practice, for a farmer or an abattoir?', pt: 'Na prática, para um criador ou um matadouro?' },
        { who: 'vet', fr: 'Respecter le délai d’attente après un traitement, pour éviter les résidus de médicaments. Faire inspecter les animaux avant et après l’abattage. Et garder la viande au froid jusqu’au client.', en: 'Respect the withdrawal period after a treatment, to avoid drug residues. Have animals inspected before and after slaughter. And keep the meat cold all the way to the customer.', pt: 'Respeitar o intervalo de segurança depois de um tratamento, para evitar resíduos de medicamentos. Mandar inspecionar os animais antes e depois do abate. E manter a carne no frio até ao cliente.' },
        { who: 'host', sting: true, fr: 'À retenir : des normes communes, une viande saine, des marchés ouverts. À bientôt sur « Santé animale, marchés ouverts ».', en: 'Remember: common standards, safe meat, open markets. See you next time on Healthy Animals, Open Markets.', pt: 'A reter: normas comuns, carne saudável, mercados abertos. Até breve em «Animais saudáveis, mercados abertos».' },
      ],
    },
    {
      id: 'ecowas', n: 2, video: 'ecowas',
      title: { fr: 'Passer la frontière avec son troupeau (CEDEAO)', en: 'Crossing the border with a herd (ECOWAS)', pt: 'Atravessar a fronteira com o rebanho (CEDEAO)' },
      lines: [
        { who: 'host', fr: 'Bienvenue dans « Santé animale, marchés ouverts ». Aujourd’hui : passer une frontière avec son troupeau, dans l’espace CEDEAO.', en: 'Welcome to Healthy Animals, Open Markets. Today: crossing a border with your herd in the ECOWAS region.', pt: 'Bem-vindos a «Animais saudáveis, mercados abertos». Hoje: atravessar uma fronteira com o rebanho, no espaço da CEDEAO.' },
        { who: 'host', fr: 'Docteur, que doit faire un commerçant avant de partir ?', en: 'Doctor, what should a trader do before setting off?', pt: 'Doutor, o que deve fazer um comerciante antes de partir?' },
        { who: 'vet', fr: 'Faire examiner et vacciner ses animaux par un vétérinaire officiel. S’ils sont sains, il reçoit un certificat zoosanitaire international, qui accompagne le troupeau pendant tout le voyage.', en: 'Have an official veterinarian examine and vaccinate the animals. If they are healthy, he receives an international animal health certificate, which travels with the herd for the whole journey.', pt: 'Pedir a um veterinário oficial que examine e vacine os animais. Se estiverem saudáveis, recebe um certificado zoossanitário internacional, que acompanha o rebanho durante toda a viagem.' },
        { who: 'host', fr: 'Et à la frontière ?', en: 'And at the border?', pt: 'E na fronteira?' },
        { who: 'vet', fr: 'Un agent des services vétérinaires contrôle le certificat et les animaux. Sans certificat, le troupeau peut être arrêté : attente, contrôles, parfois quarantaine.', en: 'A veterinary officer checks the certificate and the animals. Without a certificate, the herd can be stopped: waiting, checks, sometimes quarantine.', pt: 'Um agente dos serviços veterinários controla o certificado e os animais. Sem certificado, o rebanho pode ser parado: espera, controlos, por vezes quarentena.' },
        { who: 'host', fr: 'Pourquoi toutes ces règles ?', en: 'Why all these rules?', pt: 'Porquê todas estas regras?' },
        { who: 'vet', fr: 'Parce que les maladies voyagent avec les animaux : péripneumonie contagieuse bovine, fièvre aphteuse, peste des petits ruminants. Les règles harmonisées de la CEDEAO donnent un cadre commun aux contrôles sanitaires dans toute la région.', en: 'Because diseases travel with animals: contagious bovine pleuropneumonia, foot-and-mouth disease, peste des petits ruminants. ECOWAS harmonised rules give health checks a common framework across the region.', pt: 'Porque as doenças viajam com os animais: peripneumonia contagiosa bovina, febre aftosa, peste dos pequenos ruminantes. As regras harmonizadas da CEDEAO dão aos controlos sanitários um quadro comum em toda a região.' },
        { who: 'host', sting: true, fr: 'Trois réflexes : le vétérinaire avant le départ, le certificat avec le troupeau, le contrôle à la frontière. À bientôt sur « Santé animale, marchés ouverts ».', en: 'Three habits: the veterinarian before you leave, the certificate with the herd, the check at the border. See you next time on Healthy Animals, Open Markets.', pt: 'Três reflexos: o veterinário antes da partida, o certificado com o rebanho, o controlo na fronteira. Até breve em «Animais saudáveis, mercados abertos».' },
      ],
    },
    {
      id: 'waemu', n: 3, video: 'waemu',
      title: { fr: 'Du troupeau à l’assiette (UEMOA)', en: 'From herd to plate (WAEMU)', pt: 'Do rebanho ao prato (UEMOA)' },
      lines: [
        { who: 'host', fr: 'Bienvenue dans « Santé animale, marchés ouverts ». Aujourd’hui : la sécurité sanitaire de la viande dans l’UEMOA, du troupeau à l’assiette.', en: 'Welcome to Healthy Animals, Open Markets. Today: meat safety in the WAEMU area, from herd to plate.', pt: 'Bem-vindos a «Animais saudáveis, mercados abertos». Hoje: a segurança sanitária da carne na UEMOA, do rebanho ao prato.' },
        { who: 'host', fr: 'Docteur, quel texte fixe les règles ?', en: 'Doctor, which text sets the rules?', pt: 'Doutor, que texto fixa as regras?' },
        { who: 'vet', fr: 'Le Règlement numéro 007 de 2007 de l’UEMOA. Il porte sur la sécurité sanitaire des végétaux, des animaux et des aliments.', en: 'WAEMU Regulation number 007 of 2007. It covers the sanitary safety of plants, animals and food.', pt: 'O Regulamento número 007 de 2007 da UEMOA. Trata da segurança sanitária dos vegetais, dos animais e dos alimentos.' },
        { who: 'host', fr: 'Qui est responsable de la viande vendue ?', en: 'Who is responsible for the meat that is sold?', pt: 'Quem é responsável pela carne vendida?' },
        { who: 'vet', fr: 'Chaque acteur de la chaîne, de l’éleveur au boucher, sous le contrôle des services officiels. Un boucher n’achète que de la viande inspectée, avec le cachet de l’abattoir.', en: 'Everyone in the chain, from the farmer to the butcher, under the supervision of the official services. A butcher only buys inspected meat, with the abattoir stamp.', pt: 'Cada ator da cadeia, do criador ao talhante, sob o controlo dos serviços oficiais. Um talhante só compra carne inspecionada, com o carimbo do matadouro.' },
        { who: 'host', fr: 'Et la traçabilité, c’est quoi ?', en: 'And what is traceability?', pt: 'E o que é a rastreabilidade?' },
        { who: 'vet', fr: 'C’est savoir d’où vient un produit et où il va. Si chacun note ses achats et ses ventes, on retrouve vite un lot à risque, et le reste du marché continue de vendre.', en: 'It means knowing where a product comes from and where it goes. If everyone records what they buy and sell, a risky batch is found quickly and the rest of the market keeps selling.', pt: 'É saber de onde vem um produto e para onde vai. Se cada um registar as compras e as vendas, encontra-se depressa um lote de risco e o resto do mercado continua a vender.' },
        { who: 'host', sting: true, fr: 'À retenir : viande inspectée, achats notés, et tout problème signalé aux services vétérinaires. À bientôt sur « Santé animale, marchés ouverts ».', en: 'Remember: inspected meat, purchases recorded, and any problem reported to the veterinary services. See you next time on Healthy Animals, Open Markets.', pt: 'A reter: carne inspecionada, compras registadas e qualquer problema comunicado aos serviços veterinários. Até breve em «Animais saudáveis, mercados abertos».' },
      ],
    },
  ],
  credit: { fr: 'Une production Paruto Media.', en: 'A Paruto Media production.', pt: 'Uma produção Paruto Media.' },
};

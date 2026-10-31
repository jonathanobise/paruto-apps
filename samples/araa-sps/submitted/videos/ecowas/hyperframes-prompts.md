# HyperFrames prompts: Moussa’s Journey

Prompts for HeyGen HyperFrames to produce the linear (WhatsApp) cut of this SPS awareness module,
one per language. They match the words and timings in `script.js` and `timeline.js`. Regenerate
this file after changing those: `node tools/hyperframes-prompts.mjs <module>`.

**How to use.** In a claude.ai chat with the **HyperFrames by HeyGen** connector turned on, attach
`shared/paruto-media-logo-white.svg` and paste one prompt. Claude composes a HyperFrames project and
replies with a link to it in the HeyGen app; ask it to render once you're happy. Run each language
as its own project. Composing is blocked inside Claude Code, so use the claude.ai app (web or
desktop) for this.

**What HyperFrames can't do here.** The output is a linear video, so the choices and quiz are shown
with their answers revealed. The interactive version (viewers pick answers, wrong choices show the
consequence, quiz score) stays in this module's `index.html` player.

Total length: 422.6 s (7:02.6).

## French

```text
Create a 422.6-second animated explainer video in French, 1920×1080 (16:9), 25 fps, titled "Le voyage de Moussa". It is a public-awareness video for livestock traders, herders and border officials in West Africa about animal health rules (sanitary standards) in the cross-border livestock trade.

STYLE (use this instead of any preset brand look)
- Flat 2D vector illustration, warm Sahel palette, gentle motion design: characters walk with a light bob and leg swing, animals breathe and flick their tails, cards pop in with a slight overshoot. No photos, no 3D, no stock footage.
- Colours: ink #2B1E16, cream #FFF6E6, sand #E2A564, hills #E9C189, indigo #2E3A87, teal #1F7A6E, terracotta #C4572E, alert red #D64534, success green #2E9E5B, acacia green #6E8B3D.
- Typeface: Inter (bold or extra bold for titles, semibold for UI text).
- People are West African and drawn with dignity and warmth, simple faces in three-quarter view.
- Do not use any real logo, emblem or flag (no ECOWAS, WAEMU, ARAA or national flags) and no real map.
- Burned-in captions: centred near the bottom, white semibold text about 4% of frame height on a dark brown translucent rounded pill (rgba(24,16,10,0.8)), shown exactly at the narration times below.
- Use every on-screen text and narration line exactly as written. Do not add facts, figures, regulation names or claims.

VOICE-OVER
- A warm, calm, clear narrator in French, unhurried, speaking each line at its start time. If voice-over isn't available, keep the captions and leave the audio silent; studio narration will be added later. No music.

SCENES (each range is from the start of the video; times inside a scene's description count from that scene's start; narration times are from the start of the video)

1. 0:00.0–0:07.0: Dawn over the Sahel: sky gradient from #E7834A at the top to #F9D59C at the horizon, a large soft sun rising slowly, two flat acacia trees in dark olive silhouette, and five small dark-brown zebu cattle walking left to right along the horizon in a slow loop. From 0.8 s the title fades and slides up into the upper third: a small letter-spaced kicker "PARUTO MEDIA", the title "Le voyage de Moussa" (very large, extra bold, #2B1E16) and the subtitle "Les règles sanitaires du commerce du bétail en Afrique de l’Ouest" beneath it.
   Narration and captions:
  - 0:01.2–0:06.8: "Le voyage de Moussa : les règles sanitaires du commerce du bétail."

2. 0:07.0–0:16.5: Daytime savanna: warm sky (#F2C584 to #FCEFD8), soft sand hills (#E9C189), ochre ground (#E2A564) with darker foreground (#D6934F), two green acacias and two small market stalls far right. Moussa walks in from the left and stops left of centre: a West African livestock trader in a long indigo boubou (#2E3A87), cream turban and a wooden staff. Six zebu cattle (white, tan and dark brown, with humps and lyre-shaped horns) walk in from the left in two rows and settle in the centre. At 3.6 s a cream speech-bubble name tag pops above Moussa: "Moussa · commerçant de bétail". At 5.6 s a teal pill badge with a small cattle icon pops above the herd: "× 40 bœufs".
   Narration and captions:
  - 0:07.4–0:11.5: "Voici Moussa, commerçant de bétail au Sahel."
  - 0:11.5–0:16.3: "Il veut vendre 40 bœufs sur un grand marché, de l’autre côté de la frontière."

3. 0:16.5–0:25.5: Abstract map board, not a real map: cream background (#FBF1DF) with a fine dot pattern. Five round town markers (cream circles with a small terracotta house icon) pop in, linked by six curved sand-coloured routes that draw on one after another. Tiny cattle walk along the routes continuously. From 3 s, red spiky virus icons appear riding with three of the animals and pulse; the routes those animals travel turn red as they go. From 4.6 s three cream pill labels with a red dot slide in at top left, one by one: "Péripneumonie contagieuse bovine", "Fièvre aphteuse", "Peste des petits ruminants". No country borders, names or flags.
   Narration and captions:
  - 0:16.8–0:20.9: "Les animaux voyagent d’un pays à l’autre… et les maladies voyagent avec eux."
  - 0:20.9–0:25.5: "Une seule bête malade peut contaminer d’autres troupeaux tout au long de la route."

4. 0:25.5–0:47.5: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. From 0.6 s, 1.4 s and 2.2 s three small cattle, each followed by a small cream crate, travel back and forth in arcs between the three countries. From 7.0 s the map dims and at 7.4 s a cream card pops in the upper middle with the title "CEDEAO · Règlement C/REG.21/11/10" and three pastel pills: "Végétaux", "Animaux", "Aliments". From 14.8 s three teal pills pop in a row across the middle, joined by two teal arrows: "Production", "Transformation", "Distribution". At 17.8 s a pale-red pill pops below them: "Santé humaine ↔ santé animale".
   Narration and captions:
  - 0:25.8–0:32.9: "Chaque jour, des animaux et des produits animaux traversent les frontières de l’Afrique de l’Ouest."
  - 0:32.9–0:40.1: "En 2010, la CEDEAO a adopté un règlement qui harmonise les règles sanitaires des végétaux, des animaux et des aliments."
  - 0:40.1–0:47.1: "Il s’applique de la production à la distribution, car la santé humaine dépend de la santé animale."

5. 0:47.5–1:13.5: Cream board (#FBF1DF) with a fine dot pattern, no logos. At 0.3 s a teal pill pops at the top: "CEDEAO · Règlement C/REG.21/11/10". Four cream cards (rounded corners, soft shadow, a pastel circle at the top holding an icon, a bold label under it) pop in a row at 0.6 s, 7.4 s, 13.8 s and 20.2 s: a small teal temple "Normes internationales"; a microscope "Données scientifiques"; a green shield "Précaution"; a barrier crossed out "Pas plus de restrictions que nécessaire".
   Narration and captions:
  - 0:47.8–0:54.7: "Le règlement fixe des principes communs. D’abord, les mesures se fondent sur les normes internationales."
  - 0:54.7–1:01.1: "Les risques sont évalués sur des données scientifiques, et les mesures restent proportionnées au risque."
  - 1:01.1–1:07.5: "L’absence de certitude scientifique absolue n’est pas un prétexte pour retarder l’action."
  - 1:07.5–1:13.1: "Mais une mesure provisoire ne doit pas restreindre le commerce plus que nécessaire."

6. 1:13.5–1:35.5: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. At 1.2 s a green pill "Libre circulation" pops at the top. From 0.8 s a cream crate and a cow travel from the left country to the lower right one without stopping; at 6.0 s a green check pops above them. At 7.8 s a cream card pops in the middle with the left country's flag, a big equals sign and the lower right country's flag, with a pill "Reconnaissance mutuelle" below it. At 14 s both fade, and from 14.6 s three pale-blue pills pop along the top one by one (1.6 s apart): "Transparence", "Impartialité", "Proportionnalité".
   Narration and captions:
  - 1:13.8–1:21.1: "Les animaux et produits conformes aux normes communautaires circulent librement dans l’espace CEDEAO."
  - 1:21.1–1:27.9: "Chaque pays accepte ceux qui sont conformes aux normes d’un autre État membre."
  - 1:27.9–1:35.1: "Et toute personne contrôlée a droit à la transparence, à l’impartialité et à la proportionnalité."

7. 1:35.5–2:03.5: Cream board (#FBF1DF) with a fine dot pattern, no logos. At 0.3 s a teal pill pops at the top: "CEDEAO · Règlement C/REG.21/11/10". Four cream cards (rounded corners, soft shadow, a pastel circle at the top holding an icon, a bold label under it) pop in a row at 0.6 s, 7.6 s, 14.8 s and 21.4 s: a small teal-roofed office building "Administration vétérinaire"; a veterinarian bust (white coat, teal cap) with a gold badge "Vétérinaire officiel"; a veterinarian bust with a small document "Vétérinaire privé mandaté"; an indigo network of linked dots "Comité régional et réseaux".
   Narration and captions:
  - 1:35.8–1:42.9: "Qui fait quoi ? Chaque pays a une administration vétérinaire, qui désigne l’autorité chargée des certificats vétérinaires."
  - 1:42.9–1:50.1: "Les vétérinaires officiels assurent les contrôles sanitaires et la certification des animaux."
  - 1:50.1–1:56.7: "Des vétérinaires privés peuvent recevoir un mandat sanitaire : prophylaxie, surveillance, inspection."
  - 1:56.7–2:03.1: "Au niveau régional, un comité et des réseaux d’experts, de laboratoires et d’alerte relient les pays."

8. 2:03.5–2:12.8: The savanna from the previous scene, herd and Moussa idle (the name tag and badge are gone). A large cream card (rounded corners, soft shadow) slides down into the upper half. Small teal uppercase label "Choix", the question in large bold text, then two option rows with numbered dark circles: 1 and 2 (texts below). From 1.4 s to 4.4 s show the line "Mettez la vidéo en pause et choisissez : 1 ou 2 ?" with a 3, 2, 1 countdown in an orange ring. At 4.6 s option 2 turns green with a white check mark in a green circle; option 1 dims to half opacity.
   Card text: question "Avant de partir, que doit faire Moussa ?"; option 1 "Partir tout de suite et régler les papiers à la frontière"; option 2 "Faire examiner et vacciner ses animaux par un vétérinaire officiel".
   Narration and captions:
  - 2:03.8–2:07.9: "Avant de partir, que doit faire Moussa ?"
  - 2:08.3–2:12.6: "Réponse 2 : le contrôle sanitaire commence avant le départ."

9. 2:12.8–2:29.4: Same savanna, five cattle standing still, Moussa on the left. The official veterinarian walks in from the left: white coat, teal cap, teal trousers, stethoscope, clipboard. He stops in front of each front cow in turn (about 2.0 s, 3.6 s, 5.2 s), arm raised as if examining, and a green circle with a white check pops above each cow (2.4 s, 4.0 s, 5.6 s). At 3.0 s a pale-teal pill with a syringe icon pops: "Vacciné". At 6.0 s a certificate card bounces in at upper right: cream paper, teal header reading "CERTIFICAT VÉTÉRINAIRE", grey text lines drawing on one by one, three small dots and "× 40", then at 7.3 s a red round stamp with a check slams on (scale from big to normal, tilted), and at 7.7 s a blue handwritten signature draws on. At 10.4 s the certificate shrinks and flies into Moussa's hand.
   Narration and captions:
  - 2:13.1–2:18.4: "Moussa appelle le vétérinaire officiel, qui examine et vaccine chaque animal."
  - 2:18.4–2:24.2: "Les animaux sont sains : le vétérinaire officiel délivre le certificat vétérinaire."
  - 2:24.2–2:29.1: "Il accompagne le troupeau et se présente aux postes de contrôle."

10. 2:29.4–2:35.4: A border post on a dusty road: on the right a small cream building with a terracotta roof and a window, a teal sign on the roof reading "FRONTIÈRE", a flagpole with a plain teal-and-yellow flag (not any real country's flag), and a red-and-white striped barrier arm lowered across the road from a dark post. A veterinary border officer in a khaki uniform and peaked cap stands to the right of the barrier, facing left. Moussa and the herd walk in from the left and stop in front of the barrier.
   Narration and captions:
  - 2:29.7–2:35.4: "À la frontière, un agent des services vétérinaires contrôle les documents et les animaux."

11. 2:35.4–2:47.6: Continuing the border scene. At 0.1 s the certificate (same design, now with the red stamp and signature) pops up between Moussa and the officer; Moussa holds his arm out to hand it over. From 0.7 s to 1.9 s a magnifying glass sweeps across it. At 2.0 s a green rectangular stamp "VALIDE" slams onto the certificate, then the certificate fades. From 2.6 s to 3.6 s the barrier arm swings up. From 3.4 s Moussa and the herd walk through and out of frame to the right while the officer waves.
   Narration and captions:
  - 2:35.6–2:41.2: "Le certificat est valable et les animaux sont en bonne santé : la barrière se lève."
  - 2:41.2–2:47.2: "Les règles harmonisées de la CEDEAO donnent un cadre commun aux contrôles sanitaires dans toute la région."

12. 2:47.6–3:07.6: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. From 0.6 s three small border posts (cream huts with teal roofs and red barrier arms) appear along the border between the left country and the lower right one, and a teal pill "Postes frontaliers" pops at the top. From 1.6 s three cattle walk from the left to the middle post. At 7.0 s red spiky virus icons pop above them and the top pill changes to a red pill "Maladie à déclaration obligatoire"; at 7.8 s a red X pops at the post. At 8.8 s a dashed brown pen appears just inside the lower right country and from 9.0 s the cattle walk into it; at 10.4 s a pill "Quarantaine" pops beside it. From 13.8 s an envelope flies from the pen back to the left country, and at 14.8 s a pill "Mesure motivée" pops at the top.
   Narration and captions:
  - 2:47.9–2:54.4: "Chaque pays fixe la liste des postes frontaliers par lesquels les animaux peuvent entrer."
  - 2:54.4–3:01.0: "Si des animaux sont atteints d’une maladie à déclaration obligatoire, il peut refuser leur entrée ou les mettre en quarantaine."
  - 3:01.0–3:07.2: "Ces mesures sont communiquées immédiatement, avec leurs motifs."

13. 3:07.6–3:29.6: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. The countries are tinted for the seasons: the left one dry gold, the two on the right fresh green. The three border posts are shown. From 0.8 s Moussa (small, indigo boubou, staff) walks three cattle in a long arc from the top of the left country down into the lower right country, past the middle post (a green check pops at the post at 9.6 s). Pills: "Saison sèche" at the upper left from 0.8 s to 7 s, then "Saison des pluies" on the right from 7 s to 14 s. At 14.8 s a cream card with a document icon pops at the upper right: "Certificat international de transhumance".
   Narration and captions:
  - 3:07.9–3:15.0: "La transhumance déplace les troupeaux au fil des saisons. C’est un mode d’élevage utile, mais aussi une source de problèmes sanitaires."
  - 3:15.0–3:22.2: "Les États membres facilitent la circulation des troupeaux transhumants d’un pays à l’autre,"
  - 3:22.2–3:29.2: "avec le certificat international de transhumance de la CEDEAO."

14. 3:29.6–3:47.6: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. A small market stall (terracotta awning) stands in the lower right country, with a pill "Marché" above it at 0.6 s. Two cattle stand by the stall; at 2.2 s and 2.6 s red spiky virus icons pop above them. At 7.4 s a red pill "Maladie à déclaration obligatoire" pops at the top, and at 8.2 s a large question-mark bubble pops beside the stall.
   Narration and captions:
  - 3:29.9–3:36.8: "Au marché, Moussa remarque des animaux d’un autre troupeau qui toussent et respirent mal."
  - 3:36.8–3:47.2: "Ce pourrait être une maladie à déclaration obligatoire : toute suspicion doit être signalée immédiatement à l’autorité vétérinaire."

15. 3:47.6–3:58.6: The map from the previous shot, still (market stall, two sick cattle with virus icons, the red pill and the question mark). A large cream card (rounded corners, soft shadow) slides down into the upper half at 0.2 s: small teal uppercase label "Choix", the question in large bold text, then two option rows with numbered dark circles 1 and 2 (texts below). Show "Mettez la vidéo en pause et choisissez : 1 ou 2 ?" with a 3, 2, 1 countdown in an orange ring, then option 2 turns green with a white check in a green circle and option 1 dims to half opacity (same timing as the first choice).
   Card text: question "Des animaux toussent et respirent mal au marché. Que doit faire Moussa ?"; option 1 "Ne rien dire et vendre vite"; option 2 "Alerter tout de suite les services vétérinaires".
   Narration and captions:
  - 3:47.9–3:52.2: "Que doit faire Moussa ?"
  - 3:52.4–3:58.4: "Réponse 2 : alerter tout de suite les services vétérinaires."

16. 3:58.6–4:24.6: Continuing the market map. At 0.3 s a dashed red ring closes around the market with a red pill "Périmètre de contrôle" at 0.8 s. At 7.2 s cream badges pop at the top: "Commission de la CEDEAO" (globe icon) at the left and "OMSA" (small cow head) at the right, with a teal pill "Réseau d’alerte" between them; from 8 s four envelopes fly from the market to the two badges and to the other two countries. From 14.6 s a crate travels freely from the left country to the upper right one (only the ring around the market is restricted) and a green check pops at 21.8 s. At 20.6 s the virus icons fade, the ring fades and at 21.4 s a green pill "Maladie éradiquée" pops.
   Narration and captions:
  - 3:58.9–4:06.0: "Les autorités déclarent la maladie et appliquent des mesures dans un périmètre déterminé."
  - 4:06.0–4:13.0: "Le pays informe la Commission de la CEDEAO et les autres États par le réseau d’alerte, ainsi que l’OMSA."
  - 4:13.0–4:19.4: "Les restrictions peuvent ne viser que la partie du pays où la maladie est apparue,"
  - 4:19.4–4:24.2: "et elles prennent fin une fois la maladie éradiquée."

17. 4:24.6–4:46.6: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. From 0.4 s three round cream icons pop on the left and glide into a row in the lower right country: a cut of meat "Viande", a milk jug "Lait", a folded hide "Cuirs et peaux". At 7.8 s a cream pill with a document icon pops at the top, "Certificat vétérinaire", and green checks pop above the three products (8.6 s, 9.2 s, 9.8 s). From 14.4 s a small cargo ship rocks on the sea strip at the right, with a dark-blue pill "Exportation" at 15 s, and the hides icon arcs onto the ship. At 17.4 s and 18.4 s two pills stack at the upper right: "Certificat d’origine" and "Certificat de désinfection"; at 19.4 s a green check pops above the ship.
   Narration and captions:
  - 4:24.9–4:32.0: "Les produits d’origine animale voyagent aussi : viande, lait, cuirs et peaux."
  - 4:32.0–4:39.0: "Envoyés vers un autre État membre, ils sont aussi accompagnés d’un certificat vétérinaire délivré par un vétérinaire officiel."
  - 4:39.0–4:46.2: "À l’exportation, cuirs, peaux et cornes demandent un certificat d’origine et un certificat de désinfection."

18. 4:46.6–5:10.6: Cream board (#FBF1DF) with a fine dot pattern, no logos. Four cream cards (rounded corners, soft shadow, a pastel circle at the top holding an icon, a bold label under it) pop in a row at 0.6 s, 1.4 s, 2.2 s and 3.0 s: a cow head "Éleveur"; a small teal truck "Transporteur"; a stack of gold coins "Commerçant"; a cut of meat "Boucher". At 8.0 s a green pill "Produits sûrs" pops at the top (until 15 s). At 15.6 s it is replaced by a cream pill with an envelope icon, "Informer les autorités"; at 16.2 s a teal-roofed office building pops at the upper right and an envelope flies to it.
   Narration and captions:
  - 4:46.9–4:54.2: "Quiconque produit, transporte ou vend des animaux ou des aliments est un opérateur économique."
  - 4:54.2–5:01.8: "Les opérateurs du secteur alimentaire répondent de la qualité sanitaire de ce qu’ils vendent, et mettent sur le marché des produits sûrs."
  - 5:01.8–5:10.2: "Si un produit peut nuire à la santé, ils informent les autorités et agissent pour protéger les consommateurs."

19. 5:10.6–5:26.6: Cream board (#FBF1DF) with a fine dot pattern, no logos. Three cream cards (rounded corners, soft shadow, a pastel circle at the top holding an icon, a bold label under it) pop in a row at 0.6 s, 3.6 s and 8.0 s: three people side by side "Participation aux décisions"; a terracotta radio "Information sur les risques"; a phone with a play button "Sensibilisation".
   Narration and captions:
  - 5:10.9–5:18.2: "Les pays associent aussi les acteurs aux décisions et les informent des risques sanitaires."
  - 5:18.2–5:26.2: "Les campagnes de sensibilisation, comme cette vidéo, aident chacun à détecter, prévenir et gérer les risques sanitaires."

20. 5:26.6–6:38.6: Warm cream background (#F7E7C9) with a dot pattern and two very large, faint, slowly rocking question marks. Six questions, 12 s each. Each fades in as a centred cream card: teal label "Quiz · 1/6" (2/6 and so on), the question in large bold text, and three option rows with dark lettered circles A, B, C. At 5.2 s into each question the correct option turns green with a white check, the others stay, and a one-line explanation appears under the options. Each card fades out in its last 0.3 s.
   Question 1 (5:26.6): "Qui délivre le certificat vétérinaire ?" A "Le commerçant", B "Un vétérinaire officiel", C "Le chef du marché". Correct: B. Explanation: "Seul un vétérinaire officiel peut attester de la santé des animaux."
   Narration: "Qui délivre le certificat vétérinaire ?" at 5:26.9, then "Seul un vétérinaire officiel peut attester de la santé des animaux." at 5:32.0 (no captions in the quiz; the card carries the text).
   Question 2 (5:38.6): "Pourquoi contrôler les animaux aux frontières ?" A "Pour empêcher la propagation des maladies", B "Pour ralentir le commerce", C "Pour compter les animaux". Correct: A. Explanation: "Le contrôle protège les troupeaux, les consommateurs et les marchés."
   Narration: "Pourquoi contrôler les animaux aux frontières ?" at 5:38.9, then "Le contrôle protège les troupeaux, les consommateurs et les marchés." at 5:44.0 (no captions in the quiz; the card carries the text).
   Question 3 (5:50.6): "Quel texte harmonise les règles sanitaires dans l’espace CEDEAO ?" A "Le Règlement C/REG.21/11/10", B "Le code de la route", C "Le règlement du marché". Correct: A. Explanation: "Il fixe les règles de santé animale, végétale et de sécurité des aliments."
   Narration: "Quel texte harmonise les règles sanitaires dans l’espace CEDEAO ?" at 5:50.9, then "Il fixe les règles de santé animale, végétale et de sécurité des aliments." at 5:56.0 (no captions in the quiz; the card carries the text).
   Question 4 (6:02.6): "Un animal pourrait avoir une maladie à déclaration obligatoire. Que faire ?" A "Attendre de voir", B "Le signaler immédiatement à l’autorité vétérinaire", C "L’emmener sur un autre marché". Correct: B. Explanation: "Toute suspicion doit être portée immédiatement à l’autorité vétérinaire."
   Narration: "Un animal pourrait avoir une maladie à déclaration obligatoire. Que faire ?" at 6:02.9, then "Toute suspicion doit être portée immédiatement à l’autorité vétérinaire." at 6:08.0 (no captions in the quiz; the card carries the text).
   Question 5 (6:14.6): "Quel document aide les troupeaux transhumants ?" A "Le certificat international de transhumance de la CEDEAO", B "Un reçu du marché", C "Aucun document". Correct: A. Explanation: "Les États membres adoptent ce certificat pour faciliter la transhumance."
   Narration: "Quel document aide les troupeaux transhumants ?" at 6:14.9, then "Les États membres adoptent ce certificat pour faciliter la transhumance." at 6:20.0 (no captions in the quiz; the card carries the text).
   Question 6 (6:26.6): "Qui répond de la sécurité des aliments mis en vente ?" A "Personne", B "Seulement l’État", C "Les opérateurs qui les vendent". Correct: C. Explanation: "Les opérateurs répondent de ce qu’ils vendent ; l’État contrôle."
   Narration: "Qui répond de la sécurité des aliments mis en vente ?" at 6:26.9, then "Les opérateurs répondent de ce qu’ils vendent ; l’État contrôle." at 6:32.0 (no captions in the quiz; the card carries the text).

21. 6:38.6–6:48.6: Warm cream background (#F7E7C9) with a dot pattern. The title "Quatre règles" fades in at the top. Four cream cards with soft shadows pop up in sequence (0.6 s, 1.4 s, 2.2 s, 3.0 s), each with a terracotta number badge (1 to 4), a pastel circle with an icon and a bold label: 1 a microscope "Normes internationales et science"; 2 a crate with an equals sign "Libre circulation des produits conformes"; 3 a document "Certificat vétérinaire et postes frontaliers"; 4 a red bell "Alerte immédiate".
   Narration and captions:
  - 6:38.9–6:48.2: "Quatre règles à retenir : science, libre circulation, certificat vétérinaire et alerte immédiate."

22. 6:48.6–6:57.6: Same cream background. The title "Trois réflexes" fades in at the top. Three cream cards with soft shadows pop up in sequence (0.6 s, 1.5 s, 2.4 s), each with a terracotta number badge (1, 2, 3), a pastel circle with an icon and a bold two- or three-line text: 1 a teal syringe, "Vétérinaire officiel avant le départ"; 2 a certificate with a teal header and red stamp, "Le certificat voyage avec le troupeau"; 3 a raised striped barrier with a green check, "Contrôle sanitaire à la frontière".
   Narration and captions:
  - 6:48.9–6:57.6: "Trois réflexes pour un commerce de bétail sûr et ouvert."

23. 6:57.6–7:02.6: Dark brown background (#1E1712). Fade in, centred: small letter-spaced "Une production" in muted beige, the Paruto Media logo in white below it (use the uploaded paruto-media-logo-white.svg; if no file is uploaded, set "PARUTO MEDIA" in white, wide letter-spacing), then a small grey line: "Échantillon de démonstration · contenu à valider par les experts techniques".

When it looks right, render it as an MP4 at 1080p.
```

## English

```text
Create a 422.6-second animated explainer video in English, 1920×1080 (16:9), 25 fps, titled "Moussa’s Journey". It is a public-awareness video for livestock traders, herders and border officials in West Africa about animal health rules (sanitary standards) in the cross-border livestock trade.

STYLE (use this instead of any preset brand look)
- Flat 2D vector illustration, warm Sahel palette, gentle motion design: characters walk with a light bob and leg swing, animals breathe and flick their tails, cards pop in with a slight overshoot. No photos, no 3D, no stock footage.
- Colours: ink #2B1E16, cream #FFF6E6, sand #E2A564, hills #E9C189, indigo #2E3A87, teal #1F7A6E, terracotta #C4572E, alert red #D64534, success green #2E9E5B, acacia green #6E8B3D.
- Typeface: Inter (bold or extra bold for titles, semibold for UI text).
- People are West African and drawn with dignity and warmth, simple faces in three-quarter view.
- Do not use any real logo, emblem or flag (no ECOWAS, WAEMU, ARAA or national flags) and no real map.
- Burned-in captions: centred near the bottom, white semibold text about 4% of frame height on a dark brown translucent rounded pill (rgba(24,16,10,0.8)), shown exactly at the narration times below.
- Use every on-screen text and narration line exactly as written. Do not add facts, figures, regulation names or claims.

VOICE-OVER
- A warm, calm, clear narrator in English, unhurried, speaking each line at its start time. If voice-over isn't available, keep the captions and leave the audio silent; studio narration will be added later. No music.

SCENES (each range is from the start of the video; times inside a scene's description count from that scene's start; narration times are from the start of the video)

1. 0:00.0–0:07.0: Dawn over the Sahel: sky gradient from #E7834A at the top to #F9D59C at the horizon, a large soft sun rising slowly, two flat acacia trees in dark olive silhouette, and five small dark-brown zebu cattle walking left to right along the horizon in a slow loop. From 0.8 s the title fades and slides up into the upper third: a small letter-spaced kicker "PARUTO MEDIA", the title "Moussa’s Journey" (very large, extra bold, #2B1E16) and the subtitle "Animal health rules for the livestock trade in West Africa" beneath it.
   Narration and captions:
  - 0:01.2–0:06.8: "Moussa’s journey: the animal health rules of the livestock trade."

2. 0:07.0–0:16.5: Daytime savanna: warm sky (#F2C584 to #FCEFD8), soft sand hills (#E9C189), ochre ground (#E2A564) with darker foreground (#D6934F), two green acacias and two small market stalls far right. Moussa walks in from the left and stops left of centre: a West African livestock trader in a long indigo boubou (#2E3A87), cream turban and a wooden staff. Six zebu cattle (white, tan and dark brown, with humps and lyre-shaped horns) walk in from the left in two rows and settle in the centre. At 3.6 s a cream speech-bubble name tag pops above Moussa: "Moussa · livestock trader". At 5.6 s a teal pill badge with a small cattle icon pops above the herd: "× 40 cattle".
   Narration and captions:
  - 0:07.4–0:11.5: "This is Moussa, a livestock trader in the Sahel."
  - 0:11.5–0:16.3: "He wants to sell 40 cattle at a big market across the border."

3. 0:16.5–0:25.5: Abstract map board, not a real map: cream background (#FBF1DF) with a fine dot pattern. Five round town markers (cream circles with a small terracotta house icon) pop in, linked by six curved sand-coloured routes that draw on one after another. Tiny cattle walk along the routes continuously. From 3 s, red spiky virus icons appear riding with three of the animals and pulse; the routes those animals travel turn red as they go. From 4.6 s three cream pill labels with a red dot slide in at top left, one by one: "Contagious bovine pleuropneumonia", "Foot-and-mouth disease", "Peste des petits ruminants". No country borders, names or flags.
   Narration and captions:
  - 0:16.8–0:20.9: "Animals travel from country to country… and diseases travel with them."
  - 0:20.9–0:25.5: "One sick animal can infect other herds all along the route."

4. 0:25.5–0:47.5: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. From 0.6 s, 1.4 s and 2.2 s three small cattle, each followed by a small cream crate, travel back and forth in arcs between the three countries. From 7.0 s the map dims and at 7.4 s a cream card pops in the upper middle with the title "ECOWAS · Regulation C/REG.21/11/10" and three pastel pills: "Plants", "Animals", "Food". From 14.8 s three teal pills pop in a row across the middle, joined by two teal arrows: "Production", "Processing", "Distribution". At 17.8 s a pale-red pill pops below them: "Human health ↔ animal health".
   Narration and captions:
  - 0:25.8–0:32.9: "Every day, animals and animal products cross the borders of West Africa."
  - 0:32.9–0:40.1: "In 2010, ECOWAS adopted a regulation that harmonises the health rules for plants, animals and food."
  - 0:40.1–0:47.1: "It applies from production to distribution, because human health depends on animal health."

5. 0:47.5–1:13.5: Cream board (#FBF1DF) with a fine dot pattern, no logos. At 0.3 s a teal pill pops at the top: "ECOWAS · Regulation C/REG.21/11/10". Four cream cards (rounded corners, soft shadow, a pastel circle at the top holding an icon, a bold label under it) pop in a row at 0.6 s, 7.4 s, 13.8 s and 20.2 s: a small teal temple "International standards"; a microscope "Scientific data"; a green shield "Precaution"; a barrier crossed out "No more restriction than needed".
   Narration and captions:
  - 0:47.8–0:54.7: "The regulation sets common principles. First, measures are based on international standards."
  - 0:54.7–1:01.1: "Risks are assessed on scientific data, and measures stay proportionate to the risk."
  - 1:01.1–1:07.5: "A lack of full scientific certainty is no excuse to delay action."
  - 1:07.5–1:13.1: "But a provisional measure must not restrict trade more than necessary."

6. 1:13.5–1:35.5: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. At 1.2 s a green pill "Free movement" pops at the top. From 0.8 s a cream crate and a cow travel from the left country to the lower right one without stopping; at 6.0 s a green check pops above them. At 7.8 s a cream card pops in the middle with the left country's flag, a big equals sign and the lower right country's flag, with a pill "Mutual recognition" below it. At 14 s both fade, and from 14.6 s three pale-blue pills pop along the top one by one (1.6 s apart): "Transparency", "Impartiality", "Proportionality".
   Narration and captions:
  - 1:13.8–1:21.1: "Animals and products that meet community standards move freely across the ECOWAS area."
  - 1:21.1–1:27.9: "Each country accepts those that meet the standards of another member state."
  - 1:27.9–1:35.1: "And anyone inspected is entitled to transparency, impartiality and proportionality."

7. 1:35.5–2:03.5: Cream board (#FBF1DF) with a fine dot pattern, no logos. At 0.3 s a teal pill pops at the top: "ECOWAS · Regulation C/REG.21/11/10". Four cream cards (rounded corners, soft shadow, a pastel circle at the top holding an icon, a bold label under it) pop in a row at 0.6 s, 7.6 s, 14.8 s and 21.4 s: a small teal-roofed office building "Veterinary administration"; a veterinarian bust (white coat, teal cap) with a gold badge "Official veterinarian"; a veterinarian bust with a small document "Mandated private vet"; an indigo network of linked dots "Regional committee and networks".
   Narration and captions:
  - 1:35.8–1:42.9: "Who does what? Each country has a veterinary administration, which names the authority that issues veterinary certificates."
  - 1:42.9–1:50.1: "Official veterinarians carry out the health checks and certify the animals."
  - 1:50.1–1:56.7: "Private vets can receive a sanitary mandate: disease prevention, surveillance, inspection."
  - 1:56.7–2:03.1: "Across the region, a committee and networks of experts, laboratories and alerts link the countries."

8. 2:03.5–2:12.8: The savanna from the previous scene, herd and Moussa idle (the name tag and badge are gone). A large cream card (rounded corners, soft shadow) slides down into the upper half. Small teal uppercase label "Choice", the question in large bold text, then two option rows with numbered dark circles: 1 and 2 (texts below). From 1.4 s to 4.4 s show the line "Pause the video and choose: 1 or 2?" with a 3, 2, 1 countdown in an orange ring. At 4.6 s option 2 turns green with a white check mark in a green circle; option 1 dims to half opacity.
   Card text: question "Before leaving, what should Moussa do?"; option 1 "Leave now and sort out the papers at the border"; option 2 "Have an official veterinarian examine and vaccinate the animals".
   Narration and captions:
  - 2:03.8–2:07.9: "Before leaving, what should Moussa do?"
  - 2:08.3–2:12.6: "Answer 2: the health check starts before the journey."

9. 2:12.8–2:29.4: Same savanna, five cattle standing still, Moussa on the left. The official veterinarian walks in from the left: white coat, teal cap, teal trousers, stethoscope, clipboard. He stops in front of each front cow in turn (about 2.0 s, 3.6 s, 5.2 s), arm raised as if examining, and a green circle with a white check pops above each cow (2.4 s, 4.0 s, 5.6 s). At 3.0 s a pale-teal pill with a syringe icon pops: "Vaccinated". At 6.0 s a certificate card bounces in at upper right: cream paper, teal header reading "VETERINARY CERTIFICATE", grey text lines drawing on one by one, three small dots and "× 40", then at 7.3 s a red round stamp with a check slams on (scale from big to normal, tilted), and at 7.7 s a blue handwritten signature draws on. At 10.4 s the certificate shrinks and flies into Moussa's hand.
   Narration and captions:
  - 2:13.1–2:18.4: "Moussa calls the official veterinarian, who examines and vaccinates each animal."
  - 2:18.4–2:24.2: "The animals are healthy: the official veterinarian issues the veterinary certificate."
  - 2:24.2–2:29.1: "It goes with the herd and is shown at the veterinary posts on the route."

10. 2:29.4–2:35.4: A border post on a dusty road: on the right a small cream building with a terracotta roof and a window, a teal sign on the roof reading "BORDER", a flagpole with a plain teal-and-yellow flag (not any real country's flag), and a red-and-white striped barrier arm lowered across the road from a dark post. A veterinary border officer in a khaki uniform and peaked cap stands to the right of the barrier, facing left. Moussa and the herd walk in from the left and stop in front of the barrier.
   Narration and captions:
  - 2:29.7–2:35.4: "At the border, a veterinary officer checks the documents and the animals."

11. 2:35.4–2:47.6: Continuing the border scene. At 0.1 s the certificate (same design, now with the red stamp and signature) pops up between Moussa and the officer; Moussa holds his arm out to hand it over. From 0.7 s to 1.9 s a magnifying glass sweeps across it. At 2.0 s a green rectangular stamp "VALID" slams onto the certificate, then the certificate fades. From 2.6 s to 3.6 s the barrier arm swings up. From 3.4 s Moussa and the herd walk through and out of frame to the right while the officer waves.
   Narration and captions:
  - 2:35.6–2:41.2: "The certificate is valid and the animals are healthy: the barrier lifts."
  - 2:41.2–2:47.2: "ECOWAS harmonised rules give health checks a common framework across the region."

12. 2:47.6–3:07.6: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. From 0.6 s three small border posts (cream huts with teal roofs and red barrier arms) appear along the border between the left country and the lower right one, and a teal pill "Border posts" pops at the top. From 1.6 s three cattle walk from the left to the middle post. At 7.0 s red spiky virus icons pop above them and the top pill changes to a red pill "Notifiable disease"; at 7.8 s a red X pops at the post. At 8.8 s a dashed brown pen appears just inside the lower right country and from 9.0 s the cattle walk into it; at 10.4 s a pill "Quarantine" pops beside it. From 13.8 s an envelope flies from the pen back to the left country, and at 14.8 s a pill "Reasons given" pops at the top.
   Narration and captions:
  - 2:47.9–2:54.4: "Each country lists the border posts where animals may enter."
  - 2:54.4–3:01.0: "If animals carry a notifiable disease, it can refuse them entry or put them in quarantine."
  - 3:01.0–3:07.2: "Such measures are reported straight away, with the reasons."

13. 3:07.6–3:29.6: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. The countries are tinted for the seasons: the left one dry gold, the two on the right fresh green. The three border posts are shown. From 0.8 s Moussa (small, indigo boubou, staff) walks three cattle in a long arc from the top of the left country down into the lower right country, past the middle post (a green check pops at the post at 9.6 s). Pills: "Dry season" at the upper left from 0.8 s to 7 s, then "Rainy season" on the right from 7 s to 14 s. At 14.8 s a cream card with a document icon pops at the upper right: "International transhumance certificate".
   Narration and captions:
  - 3:07.9–3:15.0: "Transhumance moves herds with the seasons. It is a useful way of raising livestock, but also a source of health problems."
  - 3:15.0–3:22.2: "Member states make it easier for transhumant herds to move from country to country,"
  - 3:22.2–3:29.2: "with the ECOWAS international transhumance certificate."

14. 3:29.6–3:47.6: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. A small market stall (terracotta awning) stands in the lower right country, with a pill "Market" above it at 0.6 s. Two cattle stand by the stall; at 2.2 s and 2.6 s red spiky virus icons pop above them. At 7.4 s a red pill "Notifiable disease" pops at the top, and at 8.2 s a large question-mark bubble pops beside the stall.
   Narration and captions:
  - 3:29.9–3:36.8: "At the market, Moussa notices animals from another herd coughing and short of breath."
  - 3:36.8–3:47.2: "It could be a notifiable disease: any suspicion must be reported to the veterinary authority at once."

15. 3:47.6–3:58.6: The map from the previous shot, still (market stall, two sick cattle with virus icons, the red pill and the question mark). A large cream card (rounded corners, soft shadow) slides down into the upper half at 0.2 s: small teal uppercase label "Choice", the question in large bold text, then two option rows with numbered dark circles 1 and 2 (texts below). Show "Pause the video and choose: 1 or 2?" with a 3, 2, 1 countdown in an orange ring, then option 2 turns green with a white check in a green circle and option 1 dims to half opacity (same timing as the first choice).
   Card text: question "Animals at the market are coughing and short of breath. What should Moussa do?"; option 1 "Say nothing and sell quickly"; option 2 "Alert the veterinary services straight away".
   Narration and captions:
  - 3:47.9–3:52.2: "What should Moussa do?"
  - 3:52.4–3:58.4: "Answer 2: alert the veterinary services straight away."

16. 3:58.6–4:24.6: Continuing the market map. At 0.3 s a dashed red ring closes around the market with a red pill "Control area" at 0.8 s. At 7.2 s cream badges pop at the top: "ECOWAS Commission" (globe icon) at the left and "WOAH" (small cow head) at the right, with a teal pill "Alert network" between them; from 8 s four envelopes fly from the market to the two badges and to the other two countries. From 14.6 s a crate travels freely from the left country to the upper right one (only the ring around the market is restricted) and a green check pops at 21.8 s. At 20.6 s the virus icons fade, the ring fades and at 21.4 s a green pill "Disease eradicated" pops.
   Narration and captions:
  - 3:58.9–4:06.0: "The authorities declare the disease and apply measures within a defined area."
  - 4:06.0–4:13.0: "The country informs the ECOWAS Commission and the other states through the alert network, and WOAH too."
  - 4:13.0–4:19.4: "Restrictions can target only the part of the country where the disease appeared,"
  - 4:19.4–4:24.2: "and they end once the disease is eradicated."

17. 4:24.6–4:46.6: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. From 0.4 s three round cream icons pop on the left and glide into a row in the lower right country: a cut of meat "Meat", a milk jug "Milk", a folded hide "Hides and skins". At 7.8 s a cream pill with a document icon pops at the top, "Veterinary certificate", and green checks pop above the three products (8.6 s, 9.2 s, 9.8 s). From 14.4 s a small cargo ship rocks on the sea strip at the right, with a dark-blue pill "Export" at 15 s, and the hides icon arcs onto the ship. At 17.4 s and 18.4 s two pills stack at the upper right: "Certificate of origin" and "Disinfection certificate"; at 19.4 s a green check pops above the ship.
   Narration and captions:
  - 4:24.9–4:32.0: "Products of animal origin travel too: meat, milk, hides and skins."
  - 4:32.0–4:39.0: "Sent to another member state, they too travel with a veterinary certificate from an official veterinarian."
  - 4:39.0–4:46.2: "For export, hides, skins and horns need a certificate of origin and a disinfection certificate."

18. 4:46.6–5:10.6: Cream board (#FBF1DF) with a fine dot pattern, no logos. Four cream cards (rounded corners, soft shadow, a pastel circle at the top holding an icon, a bold label under it) pop in a row at 0.6 s, 1.4 s, 2.2 s and 3.0 s: a cow head "Herder"; a small teal truck "Transporter"; a stack of gold coins "Trader"; a cut of meat "Butcher". At 8.0 s a green pill "Safe products" pops at the top (until 15 s). At 15.6 s it is replaced by a cream pill with an envelope icon, "Inform the authorities"; at 16.2 s a teal-roofed office building pops at the upper right and an envelope flies to it.
   Narration and captions:
  - 4:46.9–4:54.2: "Anyone who produces, transports or sells animals or food is an economic operator."
  - 4:54.2–5:01.8: "Food operators answer for the safety of what they sell, and place only safe products on the market."
  - 5:01.8–5:10.2: "If a product may harm health, they inform the authorities and act to protect consumers."

19. 5:10.6–5:26.6: Cream board (#FBF1DF) with a fine dot pattern, no logos. Three cream cards (rounded corners, soft shadow, a pastel circle at the top holding an icon, a bold label under it) pop in a row at 0.6 s, 3.6 s and 8.0 s: three people side by side "A say in decisions"; a terracotta radio "Information on risks"; a phone with a play button "Awareness".
   Narration and captions:
  - 5:10.9–5:18.2: "Countries also give stakeholders a say in decisions and keep them informed about health risks."
  - 5:18.2–5:26.2: "Awareness campaigns, like this video, help everyone detect, prevent and manage health risks."

20. 5:26.6–6:38.6: Warm cream background (#F7E7C9) with a dot pattern and two very large, faint, slowly rocking question marks. Six questions, 12 s each. Each fades in as a centred cream card: teal label "Quiz · 1/6" (2/6 and so on), the question in large bold text, and three option rows with dark lettered circles A, B, C. At 5.2 s into each question the correct option turns green with a white check, the others stay, and a one-line explanation appears under the options. Each card fades out in its last 0.3 s.
   Question 1 (5:26.6): "Who issues the veterinary certificate?" A "The trader", B "An official veterinarian", C "The market chief". Correct: B. Explanation: "Only an official veterinarian can attest to the animals’ health."
   Narration: "Who issues the veterinary certificate?" at 5:26.9, then "Only an official veterinarian can attest to the animals’ health." at 5:32.0 (no captions in the quiz; the card carries the text).
   Question 2 (5:38.6): "Why are animals checked at borders?" A "To stop diseases from spreading", B "To slow trade down", C "To count the animals". Correct: A. Explanation: "Checks protect herds, consumers and markets."
   Narration: "Why are animals checked at borders?" at 5:38.9, then "Checks protect herds, consumers and markets." at 5:44.0 (no captions in the quiz; the card carries the text).
   Question 3 (5:50.6): "Which text harmonises health rules in the ECOWAS area?" A "Regulation C/REG.21/11/10", B "The highway code", C "The market by-laws". Correct: A. Explanation: "It sets the rules for animal health, plant health and food safety."
   Narration: "Which text harmonises health rules in the ECOWAS area?" at 5:50.9, then "It sets the rules for animal health, plant health and food safety." at 5:56.0 (no captions in the quiz; the card carries the text).
   Question 4 (6:02.6): "An animal may have a notifiable disease. What now?" A "Wait and see", B "Report it to the veterinary authority at once", C "Take it to another market". Correct: B. Explanation: "Any suspicion must go to the veterinary authority at once."
   Narration: "An animal may have a notifiable disease. What now?" at 6:02.9, then "Any suspicion must go to the veterinary authority at once." at 6:08.0 (no captions in the quiz; the card carries the text).
   Question 5 (6:14.6): "Which document helps transhumant herds?" A "The ECOWAS international transhumance certificate", B "A market receipt", C "No document at all". Correct: A. Explanation: "Member states adopt this certificate to ease transhumance."
   Narration: "Which document helps transhumant herds?" at 6:14.9, then "Member states adopt this certificate to ease transhumance." at 6:20.0 (no captions in the quiz; the card carries the text).
   Question 6 (6:26.6): "Who answers for the safety of food on sale?" A "Nobody", B "Only the State", C "The operators who sell it". Correct: C. Explanation: "Operators answer for what they sell; the State checks."
   Narration: "Who answers for the safety of food on sale?" at 6:26.9, then "Operators answer for what they sell; the State checks." at 6:32.0 (no captions in the quiz; the card carries the text).

21. 6:38.6–6:48.6: Warm cream background (#F7E7C9) with a dot pattern. The title "Four rules" fades in at the top. Four cream cards with soft shadows pop up in sequence (0.6 s, 1.4 s, 2.2 s, 3.0 s), each with a terracotta number badge (1 to 4), a pastel circle with an icon and a bold label: 1 a microscope "International standards and science"; 2 a crate with an equals sign "Free movement for compliant goods"; 3 a document "Veterinary certificate and border posts"; 4 a red bell "Alert at once".
   Narration and captions:
  - 6:38.9–6:48.2: "Four rules to remember: science, free movement, the veterinary certificate and an immediate alert."

22. 6:48.6–6:57.6: Same cream background. The title "Three habits" fades in at the top. Three cream cards with soft shadows pop up in sequence (0.6 s, 1.5 s, 2.4 s), each with a terracotta number badge (1, 2, 3), a pastel circle with an icon and a bold two- or three-line text: 1 a teal syringe, "Official veterinarian before leaving"; 2 a certificate with a teal header and red stamp, "The certificate travels with the herd"; 3 a raised striped barrier with a green check, "Health check at the border".
   Narration and captions:
  - 6:48.9–6:57.6: "Three habits for a safe and open livestock trade."

23. 6:57.6–7:02.6: Dark brown background (#1E1712). Fade in, centred: small letter-spaced "Produced by" in muted beige, the Paruto Media logo in white below it (use the uploaded paruto-media-logo-white.svg; if no file is uploaded, set "PARUTO MEDIA" in white, wide letter-spacing), then a small grey line: "Demonstration sample · content to be validated by technical experts".

When it looks right, render it as an MP4 at 1080p.
```

## Portuguese (European)

```text
Create a 422.6-second animated explainer video in Portuguese (European), 1920×1080 (16:9), 25 fps, titled "A viagem de Moussa". It is a public-awareness video for livestock traders, herders and border officials in West Africa about animal health rules (sanitary standards) in the cross-border livestock trade.

STYLE (use this instead of any preset brand look)
- Flat 2D vector illustration, warm Sahel palette, gentle motion design: characters walk with a light bob and leg swing, animals breathe and flick their tails, cards pop in with a slight overshoot. No photos, no 3D, no stock footage.
- Colours: ink #2B1E16, cream #FFF6E6, sand #E2A564, hills #E9C189, indigo #2E3A87, teal #1F7A6E, terracotta #C4572E, alert red #D64534, success green #2E9E5B, acacia green #6E8B3D.
- Typeface: Inter (bold or extra bold for titles, semibold for UI text).
- People are West African and drawn with dignity and warmth, simple faces in three-quarter view.
- Do not use any real logo, emblem or flag (no ECOWAS, WAEMU, ARAA or national flags) and no real map.
- Burned-in captions: centred near the bottom, white semibold text about 4% of frame height on a dark brown translucent rounded pill (rgba(24,16,10,0.8)), shown exactly at the narration times below.
- Use every on-screen text and narration line exactly as written. Do not add facts, figures, regulation names or claims.

VOICE-OVER
- A warm, calm, clear narrator in Portuguese (European), unhurried, speaking each line at its start time. If voice-over isn't available, keep the captions and leave the audio silent; studio narration will be added later. No music.

SCENES (each range is from the start of the video; times inside a scene's description count from that scene's start; narration times are from the start of the video)

1. 0:00.0–0:07.0: Dawn over the Sahel: sky gradient from #E7834A at the top to #F9D59C at the horizon, a large soft sun rising slowly, two flat acacia trees in dark olive silhouette, and five small dark-brown zebu cattle walking left to right along the horizon in a slow loop. From 0.8 s the title fades and slides up into the upper third: a small letter-spaced kicker "PARUTO MEDIA", the title "A viagem de Moussa" (very large, extra bold, #2B1E16) and the subtitle "Regras sanitárias do comércio de gado na África Ocidental" beneath it.
   Narration and captions:
  - 0:01.2–0:06.8: "A viagem de Moussa: as regras sanitárias do comércio de gado."

2. 0:07.0–0:16.5: Daytime savanna: warm sky (#F2C584 to #FCEFD8), soft sand hills (#E9C189), ochre ground (#E2A564) with darker foreground (#D6934F), two green acacias and two small market stalls far right. Moussa walks in from the left and stops left of centre: a West African livestock trader in a long indigo boubou (#2E3A87), cream turban and a wooden staff. Six zebu cattle (white, tan and dark brown, with humps and lyre-shaped horns) walk in from the left in two rows and settle in the centre. At 3.6 s a cream speech-bubble name tag pops above Moussa: "Moussa · comerciante de gado". At 5.6 s a teal pill badge with a small cattle icon pops above the herd: "× 40 bois".
   Narration and captions:
  - 0:07.4–0:11.5: "Este é Moussa, comerciante de gado no Sahel."
  - 0:11.5–0:16.3: "Quer vender 40 bois num grande mercado, do outro lado da fronteira."

3. 0:16.5–0:25.5: Abstract map board, not a real map: cream background (#FBF1DF) with a fine dot pattern. Five round town markers (cream circles with a small terracotta house icon) pop in, linked by six curved sand-coloured routes that draw on one after another. Tiny cattle walk along the routes continuously. From 3 s, red spiky virus icons appear riding with three of the animals and pulse; the routes those animals travel turn red as they go. From 4.6 s three cream pill labels with a red dot slide in at top left, one by one: "Peripneumonia contagiosa bovina", "Febre aftosa", "Peste dos pequenos ruminantes". No country borders, names or flags.
   Narration and captions:
  - 0:16.8–0:20.9: "Os animais viajam de país para país… e as doenças viajam com eles."
  - 0:20.9–0:25.5: "Um só animal doente pode contaminar outros rebanhos ao longo do caminho."

4. 0:25.5–0:47.5: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. From 0.6 s, 1.4 s and 2.2 s three small cattle, each followed by a small cream crate, travel back and forth in arcs between the three countries. From 7.0 s the map dims and at 7.4 s a cream card pops in the upper middle with the title "CEDEAO · Regulamento C/REG.21/11/10" and three pastel pills: "Vegetais", "Animais", "Alimentos". From 14.8 s three teal pills pop in a row across the middle, joined by two teal arrows: "Produção", "Transformação", "Distribuição". At 17.8 s a pale-red pill pops below them: "Saúde humana ↔ saúde animal".
   Narration and captions:
  - 0:25.8–0:32.9: "Todos os dias, animais e produtos animais atravessam as fronteiras da África Ocidental."
  - 0:32.9–0:40.1: "Em 2010, a CEDEAO adotou um regulamento que harmoniza as regras sanitárias dos vegetais, dos animais e dos alimentos."
  - 0:40.1–0:47.1: "Aplica-se da produção à distribuição, porque a saúde humana depende da saúde animal."

5. 0:47.5–1:13.5: Cream board (#FBF1DF) with a fine dot pattern, no logos. At 0.3 s a teal pill pops at the top: "CEDEAO · Regulamento C/REG.21/11/10". Four cream cards (rounded corners, soft shadow, a pastel circle at the top holding an icon, a bold label under it) pop in a row at 0.6 s, 7.4 s, 13.8 s and 20.2 s: a small teal temple "Normas internacionais"; a microscope "Dados científicos"; a green shield "Precaução"; a barrier crossed out "Sem mais restrições do que o necessário".
   Narration and captions:
  - 0:47.8–0:54.7: "O regulamento fixa princípios comuns. Primeiro, as medidas baseiam-se nas normas internacionais."
  - 0:54.7–1:01.1: "Os riscos são avaliados com base em dados científicos, e as medidas mantêm-se proporcionais ao risco."
  - 1:01.1–1:07.5: "A falta de certeza científica absoluta não é pretexto para adiar a ação."
  - 1:07.5–1:13.1: "Mas uma medida provisória não deve restringir o comércio mais do que o necessário."

6. 1:13.5–1:35.5: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. At 1.2 s a green pill "Livre circulação" pops at the top. From 0.8 s a cream crate and a cow travel from the left country to the lower right one without stopping; at 6.0 s a green check pops above them. At 7.8 s a cream card pops in the middle with the left country's flag, a big equals sign and the lower right country's flag, with a pill "Reconhecimento mútuo" below it. At 14 s both fade, and from 14.6 s three pale-blue pills pop along the top one by one (1.6 s apart): "Transparência", "Imparcialidade", "Proporcionalidade".
   Narration and captions:
  - 1:13.8–1:21.1: "Os animais e produtos conformes às normas comunitárias circulam livremente no espaço da CEDEAO."
  - 1:21.1–1:27.9: "Cada país aceita os que estão conformes às normas de outro Estado-membro."
  - 1:27.9–1:35.1: "E quem é controlado tem direito à transparência, à imparcialidade e à proporcionalidade."

7. 1:35.5–2:03.5: Cream board (#FBF1DF) with a fine dot pattern, no logos. At 0.3 s a teal pill pops at the top: "CEDEAO · Regulamento C/REG.21/11/10". Four cream cards (rounded corners, soft shadow, a pastel circle at the top holding an icon, a bold label under it) pop in a row at 0.6 s, 7.6 s, 14.8 s and 21.4 s: a small teal-roofed office building "Administração veterinária"; a veterinarian bust (white coat, teal cap) with a gold badge "Veterinário oficial"; a veterinarian bust with a small document "Veterinário privado mandatado"; an indigo network of linked dots "Comité regional e redes".
   Narration and captions:
  - 1:35.8–1:42.9: "Quem faz o quê? Cada país tem uma administração veterinária, que designa a autoridade responsável pelos certificados veterinários."
  - 1:42.9–1:50.1: "Os veterinários oficiais asseguram os controlos sanitários e a certificação dos animais."
  - 1:50.1–1:56.7: "Veterinários privados podem receber um mandato sanitário: profilaxia, vigilância, inspeção."
  - 1:56.7–2:03.1: "A nível regional, um comité e redes de peritos, laboratórios e alerta ligam os países."

8. 2:03.5–2:12.8: The savanna from the previous scene, herd and Moussa idle (the name tag and badge are gone). A large cream card (rounded corners, soft shadow) slides down into the upper half. Small teal uppercase label "Escolha", the question in large bold text, then two option rows with numbered dark circles: 1 and 2 (texts below). From 1.4 s to 4.4 s show the line "Pause o vídeo e escolha: 1 ou 2?" with a 3, 2, 1 countdown in an orange ring. At 4.6 s option 2 turns green with a white check mark in a green circle; option 1 dims to half opacity.
   Card text: question "Antes de partir, o que deve fazer Moussa?"; option 1 "Partir já e tratar dos papéis na fronteira"; option 2 "Pedir a um veterinário oficial que examine e vacine os animais".
   Narration and captions:
  - 2:03.8–2:07.9: "Antes de partir, o que deve fazer Moussa?"
  - 2:08.3–2:12.6: "Resposta 2: o controlo sanitário começa antes da partida."

9. 2:12.8–2:29.4: Same savanna, five cattle standing still, Moussa on the left. The official veterinarian walks in from the left: white coat, teal cap, teal trousers, stethoscope, clipboard. He stops in front of each front cow in turn (about 2.0 s, 3.6 s, 5.2 s), arm raised as if examining, and a green circle with a white check pops above each cow (2.4 s, 4.0 s, 5.6 s). At 3.0 s a pale-teal pill with a syringe icon pops: "Vacinado". At 6.0 s a certificate card bounces in at upper right: cream paper, teal header reading "CERTIFICADO VETERINÁRIO", grey text lines drawing on one by one, three small dots and "× 40", then at 7.3 s a red round stamp with a check slams on (scale from big to normal, tilted), and at 7.7 s a blue handwritten signature draws on. At 10.4 s the certificate shrinks and flies into Moussa's hand.
   Narration and captions:
  - 2:13.1–2:18.4: "Moussa chama o veterinário oficial, que examina e vacina cada animal."
  - 2:18.4–2:24.2: "Os animais estão saudáveis: o veterinário oficial emite o certificado veterinário."
  - 2:24.2–2:29.1: "Acompanha o rebanho e é apresentado nos postos veterinários do percurso."

10. 2:29.4–2:35.4: A border post on a dusty road: on the right a small cream building with a terracotta roof and a window, a teal sign on the roof reading "FRONTEIRA", a flagpole with a plain teal-and-yellow flag (not any real country's flag), and a red-and-white striped barrier arm lowered across the road from a dark post. A veterinary border officer in a khaki uniform and peaked cap stands to the right of the barrier, facing left. Moussa and the herd walk in from the left and stop in front of the barrier.
   Narration and captions:
  - 2:29.7–2:35.4: "Na fronteira, um agente dos serviços veterinários controla os documentos e os animais."

11. 2:35.4–2:47.6: Continuing the border scene. At 0.1 s the certificate (same design, now with the red stamp and signature) pops up between Moussa and the officer; Moussa holds his arm out to hand it over. From 0.7 s to 1.9 s a magnifying glass sweeps across it. At 2.0 s a green rectangular stamp "VÁLIDO" slams onto the certificate, then the certificate fades. From 2.6 s to 3.6 s the barrier arm swings up. From 3.4 s Moussa and the herd walk through and out of frame to the right while the officer waves.
   Narration and captions:
  - 2:35.6–2:41.2: "O certificado é válido e os animais estão saudáveis: a cancela levanta-se."
  - 2:41.2–2:47.2: "As regras harmonizadas da CEDEAO dão aos controlos sanitários um quadro comum em toda a região."

12. 2:47.6–3:07.6: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. From 0.6 s three small border posts (cream huts with teal roofs and red barrier arms) appear along the border between the left country and the lower right one, and a teal pill "Postos fronteiriços" pops at the top. From 1.6 s three cattle walk from the left to the middle post. At 7.0 s red spiky virus icons pop above them and the top pill changes to a red pill "Doença de declaração obrigatória"; at 7.8 s a red X pops at the post. At 8.8 s a dashed brown pen appears just inside the lower right country and from 9.0 s the cattle walk into it; at 10.4 s a pill "Quarentena" pops beside it. From 13.8 s an envelope flies from the pen back to the left country, and at 14.8 s a pill "Medida fundamentada" pops at the top.
   Narration and captions:
  - 2:47.9–2:54.4: "Cada país fixa a lista dos postos fronteiriços por onde os animais podem entrar."
  - 2:54.4–3:01.0: "Se os animais tiverem uma doença de declaração obrigatória, pode recusar a entrada ou pô-los em quarentena."
  - 3:01.0–3:07.2: "Essas medidas são comunicadas de imediato, com os motivos."

13. 3:07.6–3:29.6: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. The countries are tinted for the seasons: the left one dry gold, the two on the right fresh green. The three border posts are shown. From 0.8 s Moussa (small, indigo boubou, staff) walks three cattle in a long arc from the top of the left country down into the lower right country, past the middle post (a green check pops at the post at 9.6 s). Pills: "Estação seca" at the upper left from 0.8 s to 7 s, then "Estação das chuvas" on the right from 7 s to 14 s. At 14.8 s a cream card with a document icon pops at the upper right: "Certificado internacional de transumância".
   Narration and captions:
  - 3:07.9–3:15.0: "A transumância desloca os rebanhos ao ritmo das estações. É um modo de criação útil, mas também uma fonte de problemas sanitários."
  - 3:15.0–3:22.2: "Os Estados-membros facilitam a circulação dos rebanhos transumantes de um país para outro,"
  - 3:22.2–3:29.2: "com o certificado internacional de transumância da CEDEAO."

14. 3:29.6–3:47.6: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. A small market stall (terracotta awning) stands in the lower right country, with a pill "Mercado" above it at 0.6 s. Two cattle stand by the stall; at 2.2 s and 2.6 s red spiky virus icons pop above them. At 7.4 s a red pill "Doença de declaração obrigatória" pops at the top, and at 8.2 s a large question-mark bubble pops beside the stall.
   Narration and captions:
  - 3:29.9–3:36.8: "No mercado, Moussa repara em animais de outro rebanho que tossem e respiram mal."
  - 3:36.8–3:47.2: "Pode ser uma doença de declaração obrigatória: qualquer suspeita deve ser comunicada de imediato à autoridade veterinária."

15. 3:47.6–3:58.6: The map from the previous shot, still (market stall, two sick cattle with virus icons, the red pill and the question mark). A large cream card (rounded corners, soft shadow) slides down into the upper half at 0.2 s: small teal uppercase label "Escolha", the question in large bold text, then two option rows with numbered dark circles 1 and 2 (texts below). Show "Pause o vídeo e escolha: 1 ou 2?" with a 3, 2, 1 countdown in an orange ring, then option 2 turns green with a white check in a green circle and option 1 dims to half opacity (same timing as the first choice).
   Card text: question "Há animais no mercado que tossem e respiram mal. O que deve fazer Moussa?"; option 1 "Não dizer nada e vender depressa"; option 2 "Alertar de imediato os serviços veterinários".
   Narration and captions:
  - 3:47.9–3:52.2: "O que deve fazer Moussa?"
  - 3:52.4–3:58.4: "Resposta 2: alertar de imediato os serviços veterinários."

16. 3:58.6–4:24.6: Continuing the market map. At 0.3 s a dashed red ring closes around the market with a red pill "Perímetro de controlo" at 0.8 s. At 7.2 s cream badges pop at the top: "Comissão da CEDEAO" (globe icon) at the left and "OMSA" (small cow head) at the right, with a teal pill "Rede de alerta" between them; from 8 s four envelopes fly from the market to the two badges and to the other two countries. From 14.6 s a crate travels freely from the left country to the upper right one (only the ring around the market is restricted) and a green check pops at 21.8 s. At 20.6 s the virus icons fade, the ring fades and at 21.4 s a green pill "Doença erradicada" pops.
   Narration and captions:
  - 3:58.9–4:06.0: "As autoridades declaram a doença e aplicam medidas num perímetro determinado."
  - 4:06.0–4:13.0: "O país informa a Comissão da CEDEAO e os outros Estados através da rede de alerta, e também a OMSA."
  - 4:13.0–4:19.4: "As restrições podem visar apenas a parte do país onde a doença apareceu,"
  - 4:19.4–4:24.2: "e terminam assim que a doença é erradicada."

17. 4:24.6–4:46.6: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. From 0.4 s three round cream icons pop on the left and glide into a row in the lower right country: a cut of meat "Carne", a milk jug "Leite", a folded hide "Couros e peles". At 7.8 s a cream pill with a document icon pops at the top, "Certificado veterinário", and green checks pop above the three products (8.6 s, 9.2 s, 9.8 s). From 14.4 s a small cargo ship rocks on the sea strip at the right, with a dark-blue pill "Exportação" at 15 s, and the hides icon arcs onto the ship. At 17.4 s and 18.4 s two pills stack at the upper right: "Certificado de origem" and "Certificado de desinfeção"; at 19.4 s a green check pops above the ship.
   Narration and captions:
  - 4:24.9–4:32.0: "Os produtos de origem animal também viajam: carne, leite, couros e peles."
  - 4:32.0–4:39.0: "Enviados para outro Estado-membro, também seguem com um certificado veterinário emitido por um veterinário oficial."
  - 4:39.0–4:46.2: "Na exportação, couros, peles e chifres exigem um certificado de origem e um certificado de desinfeção."

18. 4:46.6–5:10.6: Cream board (#FBF1DF) with a fine dot pattern, no logos. Four cream cards (rounded corners, soft shadow, a pastel circle at the top holding an icon, a bold label under it) pop in a row at 0.6 s, 1.4 s, 2.2 s and 3.0 s: a cow head "Criador"; a small teal truck "Transportador"; a stack of gold coins "Comerciante"; a cut of meat "Talhante". At 8.0 s a green pill "Produtos seguros" pops at the top (until 15 s). At 15.6 s it is replaced by a cream pill with an envelope icon, "Informar as autoridades"; at 16.2 s a teal-roofed office building pops at the upper right and an envelope flies to it.
   Narration and captions:
  - 4:46.9–4:54.2: "Quem produz, transporta ou vende animais ou alimentos é um operador económico."
  - 4:54.2–5:01.8: "Os operadores do setor alimentar respondem pela qualidade sanitária do que vendem, e colocam no mercado produtos seguros."
  - 5:01.8–5:10.2: "Se um produto puder prejudicar a saúde, informam as autoridades e agem para proteger os consumidores."

19. 5:10.6–5:26.6: Cream board (#FBF1DF) with a fine dot pattern, no logos. Three cream cards (rounded corners, soft shadow, a pastel circle at the top holding an icon, a bold label under it) pop in a row at 0.6 s, 3.6 s and 8.0 s: three people side by side "Participação nas decisões"; a terracotta radio "Informação sobre os riscos"; a phone with a play button "Sensibilização".
   Narration and captions:
  - 5:10.9–5:18.2: "Os países também associam os intervenientes às decisões e informam-nos sobre os riscos sanitários."
  - 5:18.2–5:26.2: "As campanhas de sensibilização, como este vídeo, ajudam todos a detetar, prevenir e gerir os riscos sanitários."

20. 5:26.6–6:38.6: Warm cream background (#F7E7C9) with a dot pattern and two very large, faint, slowly rocking question marks. Six questions, 12 s each. Each fades in as a centred cream card: teal label "Quiz · 1/6" (2/6 and so on), the question in large bold text, and three option rows with dark lettered circles A, B, C. At 5.2 s into each question the correct option turns green with a white check, the others stay, and a one-line explanation appears under the options. Each card fades out in its last 0.3 s.
   Question 1 (5:26.6): "Quem emite o certificado veterinário?" A "O comerciante", B "Um veterinário oficial", C "O chefe do mercado". Correct: B. Explanation: "Só um veterinário oficial pode atestar a saúde dos animais."
   Narration: "Quem emite o certificado veterinário?" at 5:26.9, then "Só um veterinário oficial pode atestar a saúde dos animais." at 5:32.0 (no captions in the quiz; the card carries the text).
   Question 2 (5:38.6): "Porque se controlam os animais nas fronteiras?" A "Para impedir a propagação de doenças", B "Para atrasar o comércio", C "Para contar os animais". Correct: A. Explanation: "O controlo protege os rebanhos, os consumidores e os mercados."
   Narration: "Porque se controlam os animais nas fronteiras?" at 5:38.9, then "O controlo protege os rebanhos, os consumidores e os mercados." at 5:44.0 (no captions in the quiz; the card carries the text).
   Question 3 (5:50.6): "Que texto harmoniza as regras sanitárias no espaço da CEDEAO?" A "O Regulamento C/REG.21/11/10", B "O código da estrada", C "O regulamento do mercado". Correct: A. Explanation: "Fixa as regras de sanidade animal, vegetal e de segurança sanitária dos alimentos."
   Narration: "Que texto harmoniza as regras sanitárias no espaço da CEDEAO?" at 5:50.9, then "Fixa as regras de sanidade animal, vegetal e de segurança sanitária dos alimentos." at 5:56.0 (no captions in the quiz; the card carries the text).
   Question 4 (6:02.6): "Um animal pode ter uma doença de declaração obrigatória. E agora?" A "Esperar para ver", B "Comunicá-lo de imediato à autoridade veterinária", C "Levá-lo para outro mercado". Correct: B. Explanation: "Qualquer suspeita deve ir de imediato à autoridade veterinária."
   Narration: "Um animal pode ter uma doença de declaração obrigatória. E agora?" at 6:02.9, then "Qualquer suspeita deve ir de imediato à autoridade veterinária." at 6:08.0 (no captions in the quiz; the card carries the text).
   Question 5 (6:14.6): "Que documento ajuda os rebanhos transumantes?" A "O certificado internacional de transumância da CEDEAO", B "Um recibo do mercado", C "Nenhum documento". Correct: A. Explanation: "Os Estados-membros adotam este certificado para facilitar a transumância."
   Narration: "Que documento ajuda os rebanhos transumantes?" at 6:14.9, then "Os Estados-membros adotam este certificado para facilitar a transumância." at 6:20.0 (no captions in the quiz; the card carries the text).
   Question 6 (6:26.6): "Quem responde pela segurança dos alimentos à venda?" A "Ninguém", B "Só o Estado", C "Os operadores que os vendem". Correct: C. Explanation: "Os operadores respondem pelo que vendem; o Estado controla."
   Narration: "Quem responde pela segurança dos alimentos à venda?" at 6:26.9, then "Os operadores respondem pelo que vendem; o Estado controla." at 6:32.0 (no captions in the quiz; the card carries the text).

21. 6:38.6–6:48.6: Warm cream background (#F7E7C9) with a dot pattern. The title "Quatro regras" fades in at the top. Four cream cards with soft shadows pop up in sequence (0.6 s, 1.4 s, 2.2 s, 3.0 s), each with a terracotta number badge (1 to 4), a pastel circle with an icon and a bold label: 1 a microscope "Normas internacionais e ciência"; 2 a crate with an equals sign "Livre circulação do que é conforme"; 3 a document "Certificado veterinário e postos fronteiriços"; 4 a red bell "Alerta imediato".
   Narration and captions:
  - 6:38.9–6:48.2: "Quatro regras a reter: ciência, livre circulação, certificado veterinário e alerta imediato."

22. 6:48.6–6:57.6: Same cream background. The title "Três reflexos" fades in at the top. Three cream cards with soft shadows pop up in sequence (0.6 s, 1.5 s, 2.4 s), each with a terracotta number badge (1, 2, 3), a pastel circle with an icon and a bold two- or three-line text: 1 a teal syringe, "Veterinário oficial antes da partida"; 2 a certificate with a teal header and red stamp, "O certificado viaja com o rebanho"; 3 a raised striped barrier with a green check, "Controlo sanitário na fronteira".
   Narration and captions:
  - 6:48.9–6:57.6: "Três reflexos para um comércio de gado seguro e aberto."

23. 6:57.6–7:02.6: Dark brown background (#1E1712). Fade in, centred: small letter-spaced "Uma produção" in muted beige, the Paruto Media logo in white below it (use the uploaded paruto-media-logo-white.svg; if no file is uploaded, set "PARUTO MEDIA" in white, wide letter-spacing), then a small grey line: "Amostra de demonstração · conteúdo a validar por peritos técnicos".

When it looks right, render it as an MP4 at 1080p.
```

## Follow-up prompts

Send these in the same chat after the first version, so they edit that project.

**Vertical cut for WhatsApp Status and phones**

```text
Make a 1080×1920 (9:16) version of this video with the same timing, text and narration. Re-frame each scene for portrait: keep characters and the herd in the lower half, move cards, chips and the certificate into the upper half, stack the three recap cards vertically, and set captions about 12% above the bottom edge so phone controls don't cover them. Then render it as an MP4.
```

**Lighter file for low-bandwidth sharing**

```text
Render this video as an MP4 at 720p (1280×720), H.264, aiming for under 10 MB, keeping the captions sharp.
```

**Swap in the studio voice later**

```text
Replace the narration with the uploaded studio recordings: one audio file per line, named like the clips in our vo/ folder (title-0, meet-0, meet-1, …). Start each one at the time listed in the original prompt and keep everything else unchanged.
```

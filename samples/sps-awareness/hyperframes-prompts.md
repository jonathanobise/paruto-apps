# HyperFrames prompts: Moussa's Journey

Prompts for HeyGen HyperFrames to produce the linear (WhatsApp) cut of the SPS awareness sample,
one per language. They match the words and timings in `script.js` and `timeline.js`. Regenerate
this file after changing those: `node tools/hyperframes-prompts.mjs`.

**How to use.** In a claude.ai chat with the **HyperFrames by HeyGen** connector turned on, attach
`paruto-media-logo-white.svg` and paste one prompt. Claude composes a HyperFrames project and
replies with a link to it in the HeyGen app; ask it to render once you're happy. Run each language
as its own project. Composing is blocked inside Claude Code, so use the claude.ai app (web or
desktop) for this.

**What HyperFrames can't do here.** The output is a linear video, so the choices and quiz are shown
with their answers revealed. The interactive version (viewers pick answers, wrong choices show the
consequence, quiz score) stays in this folder's `index.html` player and the H5P package.

Total length: 112.6 s (1:52.6).

## French

```text
Create a 112.6-second animated explainer video in French, 1920×1080 (16:9), 25 fps, titled "Le voyage de Moussa". It is a public-awareness video for livestock traders, herders and border officials in West Africa about animal health rules (sanitary standards) in the cross-border livestock trade.

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

4. 0:25.5–0:34.8: The savanna from the previous scene, herd and Moussa idle (the name tag and badge are gone). A large cream card (rounded corners, soft shadow) slides down into the upper half. Small teal uppercase label "Choix", the question in large bold text, then two option rows with numbered dark circles: 1 and 2 (texts below). From 1.4 s to 4.4 s show the line "Mettez la vidéo en pause et choisissez : 1 ou 2 ?" with a 3, 2, 1 countdown in an orange ring. At 4.6 s option 2 turns green with a white check mark in a green circle; option 1 dims to half opacity.
   Card text: question "Avant de partir, que doit faire Moussa ?"; option 1 "Partir tout de suite et régler les papiers à la frontière"; option 2 "Faire examiner et vacciner ses animaux par un vétérinaire officiel".
   Narration and captions:
  - 0:25.8–0:29.9: "Avant de partir, que doit faire Moussa ?"
  - 0:30.3–0:34.6: "Réponse 2 : le contrôle sanitaire commence avant le départ."

5. 0:34.8–0:50.4: Same savanna, five cattle standing still, Moussa on the left. The official veterinarian walks in from the left: white coat, teal cap, teal trousers, stethoscope, clipboard. He stops in front of each front cow in turn (about 2.0 s, 3.6 s, 5.2 s), arm raised as if examining, and a green circle with a white check pops above each cow (2.4 s, 4.0 s, 5.6 s). At 3.0 s a pale-teal pill with a syringe icon pops: "Vacciné". At 6.0 s a certificate card bounces in at upper right: cream paper, teal header reading "CERTIFICAT ZOOSANITAIRE INTERNATIONAL", grey text lines drawing on one by one, three small dots and "× 40", then at 7.3 s a red round stamp with a check slams on (scale from big to normal, tilted), and at 7.7 s a blue handwritten signature draws on. At 10.4 s the certificate shrinks and flies into Moussa's hand.
   Narration and captions:
  - 0:35.1–0:40.4: "Moussa appelle le vétérinaire officiel, qui examine et vaccine chaque animal."
  - 0:40.4–0:46.2: "Les animaux sont sains : le vétérinaire délivre un certificat zoosanitaire international."
  - 0:46.2–0:50.1: "Ce certificat accompagne le troupeau pendant tout le voyage."

6. 0:50.4–0:56.4: A border post on a dusty road: on the right a small cream building with a terracotta roof and a window, a teal sign on the roof reading "FRONTIÈRE", a flagpole with a plain teal-and-yellow flag (not any real country's flag), and a red-and-white striped barrier arm lowered across the road from a dark post. A veterinary border officer in a khaki uniform and peaked cap stands to the right of the barrier, facing left. Moussa and the herd walk in from the left and stop in front of the barrier.
   Narration and captions:
  - 0:50.7–0:56.4: "À la frontière, un agent des services vétérinaires contrôle les documents et les animaux."

7. 0:56.4–1:08.6: Continuing the border scene. At 0.1 s the certificate (same design, now with the red stamp and signature) pops up between Moussa and the officer; Moussa holds his arm out to hand it over. From 0.7 s to 1.9 s a magnifying glass sweeps across it. At 2.0 s a green rectangular stamp "VALIDE" slams onto the certificate, then the certificate fades. From 2.6 s to 3.6 s the barrier arm swings up. From 3.4 s Moussa and the herd walk through and out of frame to the right while the officer waves.
   Narration and captions:
  - 0:56.6–1:02.2: "Le certificat est valable et les animaux sont en bonne santé : la barrière se lève."
  - 1:02.2–1:08.2: "Les règles harmonisées de la CEDEAO donnent un cadre commun aux contrôles sanitaires dans toute la région."

8. 1:08.6–1:38.6: Warm cream background (#F7E7C9) with a dot pattern and two very large, faint, slowly rocking question marks. Three questions, 10 s each. Each fades in as a centred cream card: teal label "Quiz · 1/3" (2/3, 3/3), the question in large bold text, and three option rows with dark lettered circles A, B, C. At 4.3 s into each question the correct option turns green with a white check, the others stay, and a one-line explanation appears under the options. Each card fades out in its last 0.3 s.
   Question 1 (1:08.6): "Qui délivre le certificat zoosanitaire ?" A "Le commerçant", B "Un vétérinaire officiel", C "Le chef du marché". Correct: B. Explanation: "Seul un vétérinaire officiel peut attester de la santé des animaux."
   Narration: "Qui délivre le certificat zoosanitaire ?" at 1:08.9, then "Seul un vétérinaire officiel peut attester de la santé des animaux." at 1:13.1 (no captions in the quiz; the card carries the text).
   Question 2 (1:18.6): "Pourquoi contrôler les animaux aux frontières ?" A "Pour empêcher la propagation des maladies", B "Pour ralentir le commerce", C "Pour compter les animaux". Correct: A. Explanation: "Le contrôle protège les troupeaux, les consommateurs et les marchés."
   Narration: "Pourquoi contrôler les animaux aux frontières ?" at 1:18.9, then "Le contrôle protège les troupeaux, les consommateurs et les marchés." at 1:23.1 (no captions in the quiz; the card carries the text).
   Question 3 (1:28.6): "Quel texte harmonise les règles sanitaires dans l’espace CEDEAO ?" A "Le Règlement C/REG.21/11/10", B "Le code de la route", C "Le règlement du marché". Correct: A. Explanation: "Il fixe les règles de santé animale, végétale et de sécurité des aliments."
   Narration: "Quel texte harmonise les règles sanitaires dans l’espace CEDEAO ?" at 1:28.9, then "Il fixe les règles de santé animale, végétale et de sécurité des aliments." at 1:33.1 (no captions in the quiz; the card carries the text).

9. 1:38.6–1:47.6: Same cream background. The title "Trois réflexes" fades in at the top. Three cream cards with soft shadows pop up in sequence (0.6 s, 1.5 s, 2.4 s), each with a terracotta number badge (1, 2, 3), a pastel circle with an icon and a bold two- or three-line text: 1 a teal syringe, "Vétérinaire officiel avant le départ"; 2 a certificate with a teal header and red stamp, "Le certificat voyage avec le troupeau"; 3 a raised striped barrier with a green check, "Contrôle sanitaire à la frontière".
   Narration and captions:
  - 1:38.9–1:47.6: "Trois réflexes pour un commerce de bétail sûr et ouvert."

10. 1:47.6–1:52.6: Dark brown background (#1E1712). Fade in, centred: small letter-spaced "Une production" in muted beige, the Paruto Media logo in white below it (use the uploaded paruto-media-logo-white.svg; if no file is uploaded, set "PARUTO MEDIA" in white, wide letter-spacing), then a small grey line: "Échantillon de démonstration · contenu à valider par les experts techniques".

When it looks right, render it as an MP4 at 1080p.
```

## English

```text
Create a 112.6-second animated explainer video in English, 1920×1080 (16:9), 25 fps, titled "Moussa’s Journey". It is a public-awareness video for livestock traders, herders and border officials in West Africa about animal health rules (sanitary standards) in the cross-border livestock trade.

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

4. 0:25.5–0:34.8: The savanna from the previous scene, herd and Moussa idle (the name tag and badge are gone). A large cream card (rounded corners, soft shadow) slides down into the upper half. Small teal uppercase label "Choice", the question in large bold text, then two option rows with numbered dark circles: 1 and 2 (texts below). From 1.4 s to 4.4 s show the line "Pause the video and choose: 1 or 2?" with a 3, 2, 1 countdown in an orange ring. At 4.6 s option 2 turns green with a white check mark in a green circle; option 1 dims to half opacity.
   Card text: question "Before leaving, what should Moussa do?"; option 1 "Leave now and sort out the papers at the border"; option 2 "Have an official veterinarian examine and vaccinate the animals".
   Narration and captions:
  - 0:25.8–0:29.9: "Before leaving, what should Moussa do?"
  - 0:30.3–0:34.6: "Answer 2: the health check starts before the journey."

5. 0:34.8–0:50.4: Same savanna, five cattle standing still, Moussa on the left. The official veterinarian walks in from the left: white coat, teal cap, teal trousers, stethoscope, clipboard. He stops in front of each front cow in turn (about 2.0 s, 3.6 s, 5.2 s), arm raised as if examining, and a green circle with a white check pops above each cow (2.4 s, 4.0 s, 5.6 s). At 3.0 s a pale-teal pill with a syringe icon pops: "Vaccinated". At 6.0 s a certificate card bounces in at upper right: cream paper, teal header reading "INTERNATIONAL ANIMAL HEALTH CERTIFICATE", grey text lines drawing on one by one, three small dots and "× 40", then at 7.3 s a red round stamp with a check slams on (scale from big to normal, tilted), and at 7.7 s a blue handwritten signature draws on. At 10.4 s the certificate shrinks and flies into Moussa's hand.
   Narration and captions:
  - 0:35.1–0:40.4: "Moussa calls the official veterinarian, who examines and vaccinates each animal."
  - 0:40.4–0:46.2: "The animals are healthy: the veterinarian issues an international animal health certificate."
  - 0:46.2–0:50.1: "The certificate travels with the herd for the whole journey."

6. 0:50.4–0:56.4: A border post on a dusty road: on the right a small cream building with a terracotta roof and a window, a teal sign on the roof reading "BORDER", a flagpole with a plain teal-and-yellow flag (not any real country's flag), and a red-and-white striped barrier arm lowered across the road from a dark post. A veterinary border officer in a khaki uniform and peaked cap stands to the right of the barrier, facing left. Moussa and the herd walk in from the left and stop in front of the barrier.
   Narration and captions:
  - 0:50.7–0:56.4: "At the border, a veterinary officer checks the documents and the animals."

7. 0:56.4–1:08.6: Continuing the border scene. At 0.1 s the certificate (same design, now with the red stamp and signature) pops up between Moussa and the officer; Moussa holds his arm out to hand it over. From 0.7 s to 1.9 s a magnifying glass sweeps across it. At 2.0 s a green rectangular stamp "VALID" slams onto the certificate, then the certificate fades. From 2.6 s to 3.6 s the barrier arm swings up. From 3.4 s Moussa and the herd walk through and out of frame to the right while the officer waves.
   Narration and captions:
  - 0:56.6–1:02.2: "The certificate is valid and the animals are healthy: the barrier lifts."
  - 1:02.2–1:08.2: "ECOWAS harmonised rules give health checks a common framework across the region."

8. 1:08.6–1:38.6: Warm cream background (#F7E7C9) with a dot pattern and two very large, faint, slowly rocking question marks. Three questions, 10 s each. Each fades in as a centred cream card: teal label "Quiz · 1/3" (2/3, 3/3), the question in large bold text, and three option rows with dark lettered circles A, B, C. At 4.3 s into each question the correct option turns green with a white check, the others stay, and a one-line explanation appears under the options. Each card fades out in its last 0.3 s.
   Question 1 (1:08.6): "Who issues the animal health certificate?" A "The trader", B "An official veterinarian", C "The market chief". Correct: B. Explanation: "Only an official veterinarian can attest to the animals’ health."
   Narration: "Who issues the animal health certificate?" at 1:08.9, then "Only an official veterinarian can attest to the animals’ health." at 1:13.1 (no captions in the quiz; the card carries the text).
   Question 2 (1:18.6): "Why are animals checked at borders?" A "To stop diseases from spreading", B "To slow trade down", C "To count the animals". Correct: A. Explanation: "Checks protect herds, consumers and markets."
   Narration: "Why are animals checked at borders?" at 1:18.9, then "Checks protect herds, consumers and markets." at 1:23.1 (no captions in the quiz; the card carries the text).
   Question 3 (1:28.6): "Which text harmonises health rules in the ECOWAS area?" A "Regulation C/REG.21/11/10", B "The highway code", C "The market by-laws". Correct: A. Explanation: "It sets the rules for animal health, plant health and food safety."
   Narration: "Which text harmonises health rules in the ECOWAS area?" at 1:28.9, then "It sets the rules for animal health, plant health and food safety." at 1:33.1 (no captions in the quiz; the card carries the text).

9. 1:38.6–1:47.6: Same cream background. The title "Three habits" fades in at the top. Three cream cards with soft shadows pop up in sequence (0.6 s, 1.5 s, 2.4 s), each with a terracotta number badge (1, 2, 3), a pastel circle with an icon and a bold two- or three-line text: 1 a teal syringe, "Official veterinarian before leaving"; 2 a certificate with a teal header and red stamp, "The certificate travels with the herd"; 3 a raised striped barrier with a green check, "Health check at the border".
   Narration and captions:
  - 1:38.9–1:47.6: "Three habits for a safe and open livestock trade."

10. 1:47.6–1:52.6: Dark brown background (#1E1712). Fade in, centred: small letter-spaced "Produced by" in muted beige, the Paruto Media logo in white below it (use the uploaded paruto-media-logo-white.svg; if no file is uploaded, set "PARUTO MEDIA" in white, wide letter-spacing), then a small grey line: "Demonstration sample · content to be validated by technical experts".

When it looks right, render it as an MP4 at 1080p.
```

## Portuguese (European)

```text
Create a 112.6-second animated explainer video in Portuguese (European), 1920×1080 (16:9), 25 fps, titled "A viagem de Moussa". It is a public-awareness video for livestock traders, herders and border officials in West Africa about animal health rules (sanitary standards) in the cross-border livestock trade.

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

4. 0:25.5–0:34.8: The savanna from the previous scene, herd and Moussa idle (the name tag and badge are gone). A large cream card (rounded corners, soft shadow) slides down into the upper half. Small teal uppercase label "Escolha", the question in large bold text, then two option rows with numbered dark circles: 1 and 2 (texts below). From 1.4 s to 4.4 s show the line "Pause o vídeo e escolha: 1 ou 2?" with a 3, 2, 1 countdown in an orange ring. At 4.6 s option 2 turns green with a white check mark in a green circle; option 1 dims to half opacity.
   Card text: question "Antes de partir, o que deve fazer Moussa?"; option 1 "Partir já e tratar dos papéis na fronteira"; option 2 "Pedir a um veterinário oficial que examine e vacine os animais".
   Narration and captions:
  - 0:25.8–0:29.9: "Antes de partir, o que deve fazer Moussa?"
  - 0:30.3–0:34.6: "Resposta 2: o controlo sanitário começa antes da partida."

5. 0:34.8–0:50.4: Same savanna, five cattle standing still, Moussa on the left. The official veterinarian walks in from the left: white coat, teal cap, teal trousers, stethoscope, clipboard. He stops in front of each front cow in turn (about 2.0 s, 3.6 s, 5.2 s), arm raised as if examining, and a green circle with a white check pops above each cow (2.4 s, 4.0 s, 5.6 s). At 3.0 s a pale-teal pill with a syringe icon pops: "Vacinado". At 6.0 s a certificate card bounces in at upper right: cream paper, teal header reading "CERTIFICADO ZOOSSANITÁRIO INTERNACIONAL", grey text lines drawing on one by one, three small dots and "× 40", then at 7.3 s a red round stamp with a check slams on (scale from big to normal, tilted), and at 7.7 s a blue handwritten signature draws on. At 10.4 s the certificate shrinks and flies into Moussa's hand.
   Narration and captions:
  - 0:35.1–0:40.4: "Moussa chama o veterinário oficial, que examina e vacina cada animal."
  - 0:40.4–0:46.2: "Os animais estão saudáveis: o veterinário emite um certificado zoossanitário internacional."
  - 0:46.2–0:50.1: "Este certificado acompanha o rebanho durante toda a viagem."

6. 0:50.4–0:56.4: A border post on a dusty road: on the right a small cream building with a terracotta roof and a window, a teal sign on the roof reading "FRONTEIRA", a flagpole with a plain teal-and-yellow flag (not any real country's flag), and a red-and-white striped barrier arm lowered across the road from a dark post. A veterinary border officer in a khaki uniform and peaked cap stands to the right of the barrier, facing left. Moussa and the herd walk in from the left and stop in front of the barrier.
   Narration and captions:
  - 0:50.7–0:56.4: "Na fronteira, um agente dos serviços veterinários controla os documentos e os animais."

7. 0:56.4–1:08.6: Continuing the border scene. At 0.1 s the certificate (same design, now with the red stamp and signature) pops up between Moussa and the officer; Moussa holds his arm out to hand it over. From 0.7 s to 1.9 s a magnifying glass sweeps across it. At 2.0 s a green rectangular stamp "VÁLIDO" slams onto the certificate, then the certificate fades. From 2.6 s to 3.6 s the barrier arm swings up. From 3.4 s Moussa and the herd walk through and out of frame to the right while the officer waves.
   Narration and captions:
  - 0:56.6–1:02.2: "O certificado é válido e os animais estão saudáveis: a cancela levanta-se."
  - 1:02.2–1:08.2: "As regras harmonizadas da CEDEAO dão aos controlos sanitários um quadro comum em toda a região."

8. 1:08.6–1:38.6: Warm cream background (#F7E7C9) with a dot pattern and two very large, faint, slowly rocking question marks. Three questions, 10 s each. Each fades in as a centred cream card: teal label "Quiz · 1/3" (2/3, 3/3), the question in large bold text, and three option rows with dark lettered circles A, B, C. At 4.3 s into each question the correct option turns green with a white check, the others stay, and a one-line explanation appears under the options. Each card fades out in its last 0.3 s.
   Question 1 (1:08.6): "Quem emite o certificado zoossanitário?" A "O comerciante", B "Um veterinário oficial", C "O chefe do mercado". Correct: B. Explanation: "Só um veterinário oficial pode atestar a saúde dos animais."
   Narration: "Quem emite o certificado zoossanitário?" at 1:08.9, then "Só um veterinário oficial pode atestar a saúde dos animais." at 1:13.1 (no captions in the quiz; the card carries the text).
   Question 2 (1:18.6): "Porque se controlam os animais nas fronteiras?" A "Para impedir a propagação de doenças", B "Para atrasar o comércio", C "Para contar os animais". Correct: A. Explanation: "O controlo protege os rebanhos, os consumidores e os mercados."
   Narration: "Porque se controlam os animais nas fronteiras?" at 1:18.9, then "O controlo protege os rebanhos, os consumidores e os mercados." at 1:23.1 (no captions in the quiz; the card carries the text).
   Question 3 (1:28.6): "Que texto harmoniza as regras sanitárias no espaço da CEDEAO?" A "O Regulamento C/REG.21/11/10", B "O código da estrada", C "O regulamento do mercado". Correct: A. Explanation: "Fixa as regras de sanidade animal, vegetal e de segurança sanitária dos alimentos."
   Narration: "Que texto harmoniza as regras sanitárias no espaço da CEDEAO?" at 1:28.9, then "Fixa as regras de sanidade animal, vegetal e de segurança sanitária dos alimentos." at 1:33.1 (no captions in the quiz; the card carries the text).

9. 1:38.6–1:47.6: Same cream background. The title "Três reflexos" fades in at the top. Three cream cards with soft shadows pop up in sequence (0.6 s, 1.5 s, 2.4 s), each with a terracotta number badge (1, 2, 3), a pastel circle with an icon and a bold two- or three-line text: 1 a teal syringe, "Veterinário oficial antes da partida"; 2 a certificate with a teal header and red stamp, "O certificado viaja com o rebanho"; 3 a raised striped barrier with a green check, "Controlo sanitário na fronteira".
   Narration and captions:
  - 1:38.9–1:47.6: "Três reflexos para um comércio de gado seguro e aberto."

10. 1:47.6–1:52.6: Dark brown background (#1E1712). Fade in, centred: small letter-spaced "Uma produção" in muted beige, the Paruto Media logo in white below it (use the uploaded paruto-media-logo-white.svg; if no file is uploaded, set "PARUTO MEDIA" in white, wide letter-spacing), then a small grey line: "Amostra de demonstração · conteúdo a validar por peritos técnicos".

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

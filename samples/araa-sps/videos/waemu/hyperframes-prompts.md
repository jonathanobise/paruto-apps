# HyperFrames prompts: Koffi’s Butcher Shop

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

Total length: 125.0 s (2:05.0).

## French

```text
Create a 125.0-second animated explainer video in French, 1920×1080 (16:9), 25 fps, titled "La boucherie de Koffi". It is a public-awareness video for butchers, livestock traders, abattoir staff and consumers in the WAEMU area about food safety rules: buying only inspected meat, traceability, and cooperation on health alerts.

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

1. 0:00.0–0:07.0: Dawn over the Sahel: sky gradient from #E7834A at the top to #F9D59C at the horizon, a large soft sun rising slowly, two flat acacia trees in dark olive silhouette, and five small dark-brown zebu cattle walking left to right along the horizon in a slow loop. From 0.8 s the title fades and slides up into the upper third: a small letter-spaced kicker "PARUTO MEDIA", the title "La boucherie de Koffi" (very large, extra bold, #2B1E16) and the subtitle "La sécurité sanitaire des aliments dans l’espace UEMOA" beneath it.
   Narration and captions:
  - 0:01.2–0:06.8: "La boucherie de Koffi : la sécurité sanitaire des aliments dans l’espace UEMOA."

2. 0:07.0–0:18.0: A busy city market: warm sky (#F2C584 to #FCEFD8), soft sand-coloured buildings with small windows in the background, a paved sand ground (#E7B77A). Market stalls have striped awnings with scalloped edges (terracotta and cream for meat stalls, teal and cream for vegetable stalls), wooden posts and a wooden counter. In the centre, Koffi's butcher stall: two cuts of meat hang from steel hooks at either side of the awning and cuts are laid on the counter. Koffi, a West African butcher: terracotta shirt, white apron, dark cap with a cream band, stands behind the counter facing left, working with a knife. Two customers walk in from the left (a woman in a yellow wrap dress with a terracotta head wrap, and a man in a light-blue shirt) and stop at the counter. At 1.4 s a cream speech-bubble name tag pops above Koffi: "Koffi · boucher". From 6.2 s Koffi hands a wrapped package of meat (marked with a small violet oval stamp) to the man.
   Narration and captions:
  - 0:07.4–0:10.8: "Voici Koffi, boucher au marché de la ville."
  - 0:10.8–0:17.8: "Sa viande vient d’éleveurs, passe par le marché à bétail et l’abattoir, avant d’arriver chez ses clients."

3. 0:18.0–0:33.6: Cream board (#FBF1DF) with a fine dot pattern. At 0.3 s a cream card pops in at the top: a small document icon, the title "Règlement n°007/2007/CM/UEMOA" and three small icons with labels "Végétaux" (a sprout), "Animaux" (a cow), "Aliments" (a bowl). From 1.6 s five round cream nodes pop in from left to right along the middle, linked by sand-coloured arrows that draw on: "Éleveur" (a zebu), "Marché à bétail" (a terracotta market tent), "Abattoir" (a white building with a terracotta roof and a violet stamp), "Boucher" (a striped awning with hanging meat), "Consommateur" (a plate with meat and cutlery). From 2.4 s a small orange folder travels from node to node, pausing at each. From 10.9 s a green check in a circle pops above each node in turn.
   Narration and captions:
  - 0:18.3–0:28.6: "Dans l’UEMOA, le Règlement n°007/2007/CM/UEMOA fixe des règles communes de sécurité sanitaire des végétaux, des animaux et des aliments."
  - 0:28.6–0:33.4: "Chaque acteur de la chaîne est responsable de la sécurité de ce qu’il vend."

4. 0:33.6–0:46.8: A busy city market: warm sky (#F2C584 to #FCEFD8), soft sand-coloured buildings with small windows in the background, a paved sand ground (#E7B77A). Market stalls have striped awnings with scalloped edges (terracotta and cream for meat stalls, teal and cream for vegetable stalls), wooden posts and a wooden counter. Koffi, a West African butcher: terracotta shirt, white apron, dark cap with a cream band, behind his counter facing left. A trader in a green boubou and cream cap walks in from the left (0–2.4 s) holding out a wooden tray with two cuts of meat, with no stamp on them. At 2.5 s a yellow pill "Moins cher !" pops near the tray, and at 3.1 s a red pill "Sans cachet". At 3.6 s a large cream card (rounded corners, soft shadow) slides down into the upper half: small teal uppercase label "Choix", the question in large bold text, then two option rows with numbered dark circles 1 and 2 (texts below). From 4.6 s show "Mettez la vidéo en pause et choisissez : 1 ou 2 ?" with a 3, 2, 1 countdown in an orange ring. At 7.8 s option 2 turns green with a white check in a green circle; option 1 dims to half opacity.
   Card text: question "Un vendeur propose à Koffi de la viande moins chère, sans cachet d’inspection. Que fait Koffi ?"; option 1 "Il l’achète : c’est une bonne affaire"; option 2 "Il refuse : la viande doit venir de l’abattoir et être inspectée".
   Narration and captions:
  - 0:33.9–0:39.8: "Un vendeur propose à Koffi de la viande moins chère, sans cachet d’inspection. Que fait Koffi ?"
  - 0:41.6–0:46.6: "Réponse 2 : on n’achète que de la viande inspectée, avec le cachet de l’abattoir."

5. 0:46.8–1:02.3: Outdoors at the edge of town (warm sky, sand hills, ochre ground, one acacia on the right, the sun at top left). On the left, a abattoir: white walls, terracotta roof, a teal sign reading "ABATTOIR", a window and a dark open doorway with a steel rail where a half carcass hangs. At 1.0 s a violet oval inspection stamp reading "INSPECTÉ" slams onto the carcass. A veterinarian (white coat, teal cap, clipboard) stands by the door. Koffi walks in from the right and stops facing left; at 2.8 s a wrapped package with the violet stamp passes from the veterinarian to Koffi. At 4.6 s a large open notebook pops in at the upper right: a teal spine with rings, the title "Mes achats" and three rows "Date", "Fournisseur", "Origine"; blue handwriting draws on each row in turn (5.4 s, 6.9 s, 8.4 s). At 10.0 s the notebook shrinks away. From 10.6 s a traceability line appears across the top: a round icon with a zebu on the left, a round icon with a plate on the right, a dotted teal line between them with a teal dot travelling back and forth, and a teal pill "Traçabilité" in the middle.
   Narration and captions:
  - 0:47.1–0:51.4: "Koffi achète à l’abattoir une viande inspectée, avec son cachet."
  - 0:51.4–0:57.2: "Dans son cahier, il note chaque achat : la date, le fournisseur, l’origine des animaux."
  - 0:57.2–1:02.0: "C’est la traçabilité : savoir d’où vient un produit et où il va."

6. 1:02.3–1:08.3: A busy city market: warm sky (#F2C584 to #FCEFD8), soft sand-coloured buildings with small windows in the background, a paved sand ground (#E7B77A). Market stalls have striped awnings with scalloped edges (terracotta and cream for meat stalls, teal and cream for vegetable stalls), wooden posts and a wooden counter. Three stalls in a row: vegetables on the left, Koffi's butcher stall in the centre (with a wooden tray holding two cuts of meat on the counter), another meat stall on the right. At 0.4 s a red pill with a white bell icon reading "Alerte sanitaire" pops at the top centre, with a red ring pulsing outward from it. From 1.2 s a veterinarian in a white coat and teal cap walks in from the left and stops in front of the left stall.
   Narration and captions:
  - 1:02.6–1:07.9: "Un jour, les services vétérinaires lancent une alerte sur un lot de viande."

7. 1:08.3–1:21.0: Continuing the market scene. At 0.3 s Koffi's notebook (same design, rows already written) pops up between Koffi and the veterinarian; Koffi holds it out. At 1.0 s a yellow highlighter sweeps across the "Fournisseur" row. At 1.8 s a red tag "Lot concerné" appears above the tray on Koffi's counter; from 2.6 s the tray lifts and moves off to the right and out of the market. At 3.4 s a teal pill "Lot retiré" pops; at 4.3 s a pale green pill "Le marché continue" and green checks above the other two stalls. At 5.0 s the notebook fades. At 6.0 s a large cream panel slides in at the top titled "États membres de l’UEMOA", with eight teal dots on a gentle arc; red curved lines draw from one dot to each of the others in turn, and red rings pulse outward from the dots as the alert reaches them. No real map, country names or flags.
   Narration and captions:
  - 1:08.5–1:14.3: "Grâce au cahier, le lot est retrouvé et retiré. Le reste du marché continue."
  - 1:14.3–1:20.7: "Dans l’UEMOA, les États membres coopèrent et partagent les alertes pour protéger les consommateurs."

8. 1:21.0–1:51.0: Warm cream background (#F7E7C9) with a dot pattern and two very large, faint, slowly rocking question marks. Three questions, 10 s each. Each fades in as a centred cream card: teal label "Quiz · 1/3" (2/3, 3/3), the question in large bold text, and three option rows with dark lettered circles A, B, C. At 4.3 s into each question the correct option turns green with a white check, and a one-line explanation appears under the options. Each card fades out in its last 0.3 s.
   Question 1 (1:21.0): "Qui est responsable de la sécurité de la viande vendue ?" A "Seulement l’État", B "Chaque acteur de la chaîne", C "Seulement le client". Correct: B. Explanation: "De l’éleveur au boucher, chacun répond de ce qu’il vend, sous le contrôle des services officiels."
   Narration: "Qui est responsable de la sécurité de la viande vendue ?" at 1:21.3, then "De l’éleveur au boucher, chacun répond de ce qu’il vend, sous le contrôle des services officiels." at 1:25.5 (no captions in the quiz; the card carries the text).
   Question 2 (1:31.0): "Que veut dire « traçabilité » ?" A "Savoir d’où vient un produit et où il va", B "Vendre plus vite", C "Baisser les prix". Correct: A. Explanation: "Elle permet de retrouver et de retirer vite un lot à risque."
   Narration: "Que veut dire « traçabilité » ?" at 1:31.3, then "Elle permet de retrouver et de retirer vite un lot à risque." at 1:35.5 (no captions in the quiz; the card carries the text).
   Question 3 (1:41.0): "Quel texte fixe les règles de sécurité sanitaire dans l’UEMOA ?" A "Le Règlement n°007/2007/CM/UEMOA", B "Le code de la route", C "Le règlement du marché". Correct: A. Explanation: "Il couvre la sécurité sanitaire des végétaux, des animaux et des aliments."
   Narration: "Quel texte fixe les règles de sécurité sanitaire dans l’UEMOA ?" at 1:41.3, then "Il couvre la sécurité sanitaire des végétaux, des animaux et des aliments." at 1:45.5 (no captions in the quiz; the card carries the text).

9. 1:51.0–2:00.0: Same cream background. The title "Trois réflexes" fades in at the top. Three cream cards with soft shadows pop up in sequence (0.6 s, 1.5 s, 2.4 s), each with a terracotta number badge (1, 2, 3), a pastel circle with an icon and a bold text of two to four lines: 1 a rubber stamp over a violet oval with a check, "Acheter seulement de la viande inspectée"; 2 a teal notebook with a pencil, "Noter ses achats et ses ventes"; 3 a phone showing a red alert with signal waves, "Signaler tout problème aux services vétérinaires".
   Narration and captions:
  - 1:51.3–2:00.0: "Une chaîne sûre, du troupeau à l’assiette."

10. 2:00.0–2:05.0: Dark brown background (#1E1712). Fade in, centred: small letter-spaced "Une production" in muted beige, the Paruto Media logo in white below it (use the uploaded paruto-media-logo-white.svg; if no file is uploaded, set "PARUTO MEDIA" in white, wide letter-spacing), then a small grey line: "Échantillon de démonstration · contenu à valider par les experts techniques".

When it looks right, render it as an MP4 at 1080p.
```

## English

```text
Create a 125.0-second animated explainer video in English, 1920×1080 (16:9), 25 fps, titled "Koffi’s Butcher Shop". It is a public-awareness video for butchers, livestock traders, abattoir staff and consumers in the WAEMU area about food safety rules: buying only inspected meat, traceability, and cooperation on health alerts.

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

1. 0:00.0–0:07.0: Dawn over the Sahel: sky gradient from #E7834A at the top to #F9D59C at the horizon, a large soft sun rising slowly, two flat acacia trees in dark olive silhouette, and five small dark-brown zebu cattle walking left to right along the horizon in a slow loop. From 0.8 s the title fades and slides up into the upper third: a small letter-spaced kicker "PARUTO MEDIA", the title "Koffi’s Butcher Shop" (very large, extra bold, #2B1E16) and the subtitle "Food safety rules in the WAEMU area" beneath it.
   Narration and captions:
  - 0:01.2–0:06.8: "Koffi’s butcher shop: food safety rules in the WAEMU area."

2. 0:07.0–0:18.0: A busy city market: warm sky (#F2C584 to #FCEFD8), soft sand-coloured buildings with small windows in the background, a paved sand ground (#E7B77A). Market stalls have striped awnings with scalloped edges (terracotta and cream for meat stalls, teal and cream for vegetable stalls), wooden posts and a wooden counter. In the centre, Koffi's butcher stall: two cuts of meat hang from steel hooks at either side of the awning and cuts are laid on the counter. Koffi, a West African butcher: terracotta shirt, white apron, dark cap with a cream band, stands behind the counter facing left, working with a knife. Two customers walk in from the left (a woman in a yellow wrap dress with a terracotta head wrap, and a man in a light-blue shirt) and stop at the counter. At 1.4 s a cream speech-bubble name tag pops above Koffi: "Koffi · butcher". From 6.2 s Koffi hands a wrapped package of meat (marked with a small violet oval stamp) to the man.
   Narration and captions:
  - 0:07.4–0:10.8: "This is Koffi, a butcher at the city market."
  - 0:10.8–0:17.8: "His meat comes from herders, passes through the livestock market and the abattoir, then reaches his customers."

3. 0:18.0–0:33.6: Cream board (#FBF1DF) with a fine dot pattern. At 0.3 s a cream card pops in at the top: a small document icon, the title "Regulation No. 007/2007/CM/UEMOA" and three small icons with labels "Plants" (a sprout), "Animals" (a cow), "Food" (a bowl). From 1.6 s five round cream nodes pop in from left to right along the middle, linked by sand-coloured arrows that draw on: "Herder" (a zebu), "Livestock market" (a terracotta market tent), "Abattoir" (a white building with a terracotta roof and a violet stamp), "Butcher" (a striped awning with hanging meat), "Consumer" (a plate with meat and cutlery). From 2.4 s a small orange folder travels from node to node, pausing at each. From 10.9 s a green check in a circle pops above each node in turn.
   Narration and captions:
  - 0:18.3–0:28.6: "In WAEMU, Regulation No. 007/2007/CM/UEMOA sets common rules for the safety of plants, animals and food."
  - 0:28.6–0:33.4: "Every actor in the chain is responsible for the safety of what they sell."

4. 0:33.6–0:46.8: A busy city market: warm sky (#F2C584 to #FCEFD8), soft sand-coloured buildings with small windows in the background, a paved sand ground (#E7B77A). Market stalls have striped awnings with scalloped edges (terracotta and cream for meat stalls, teal and cream for vegetable stalls), wooden posts and a wooden counter. Koffi, a West African butcher: terracotta shirt, white apron, dark cap with a cream band, behind his counter facing left. A trader in a green boubou and cream cap walks in from the left (0–2.4 s) holding out a wooden tray with two cuts of meat, with no stamp on them. At 2.5 s a yellow pill "Cheaper!" pops near the tray, and at 3.1 s a red pill "No stamp". At 3.6 s a large cream card (rounded corners, soft shadow) slides down into the upper half: small teal uppercase label "Choice", the question in large bold text, then two option rows with numbered dark circles 1 and 2 (texts below). From 4.6 s show "Pause the video and choose: 1 or 2?" with a 3, 2, 1 countdown in an orange ring. At 7.8 s option 2 turns green with a white check in a green circle; option 1 dims to half opacity.
   Card text: question "A trader offers Koffi cheaper meat with no inspection stamp. What does Koffi do?"; option 1 "He buys it: it’s a good deal"; option 2 "He refuses: meat must come from the abattoir and be inspected".
   Narration and captions:
  - 0:33.9–0:39.8: "A trader offers Koffi cheaper meat with no inspection stamp. What does Koffi do?"
  - 0:41.6–0:46.6: "Answer 2: only buy inspected meat, with the abattoir stamp."

5. 0:46.8–1:02.3: Outdoors at the edge of town (warm sky, sand hills, ochre ground, one acacia on the right, the sun at top left). On the left, a abattoir: white walls, terracotta roof, a teal sign reading "ABATTOIR", a window and a dark open doorway with a steel rail where a half carcass hangs. At 1.0 s a violet oval inspection stamp reading "INSPECTED" slams onto the carcass. A veterinarian (white coat, teal cap, clipboard) stands by the door. Koffi walks in from the right and stops facing left; at 2.8 s a wrapped package with the violet stamp passes from the veterinarian to Koffi. At 4.6 s a large open notebook pops in at the upper right: a teal spine with rings, the title "My purchases" and three rows "Date", "Supplier", "Origin"; blue handwriting draws on each row in turn (5.4 s, 6.9 s, 8.4 s). At 10.0 s the notebook shrinks away. From 10.6 s a traceability line appears across the top: a round icon with a zebu on the left, a round icon with a plate on the right, a dotted teal line between them with a teal dot travelling back and forth, and a teal pill "Traceability" in the middle.
   Narration and captions:
  - 0:47.1–0:51.4: "Koffi buys inspected meat at the abattoir, with its stamp."
  - 0:51.4–0:57.2: "In his notebook he records every purchase: the date, the supplier, where the animals came from."
  - 0:57.2–1:02.0: "That is traceability: knowing where a product comes from and where it goes."

6. 1:02.3–1:08.3: A busy city market: warm sky (#F2C584 to #FCEFD8), soft sand-coloured buildings with small windows in the background, a paved sand ground (#E7B77A). Market stalls have striped awnings with scalloped edges (terracotta and cream for meat stalls, teal and cream for vegetable stalls), wooden posts and a wooden counter. Three stalls in a row: vegetables on the left, Koffi's butcher stall in the centre (with a wooden tray holding two cuts of meat on the counter), another meat stall on the right. At 0.4 s a red pill with a white bell icon reading "Health alert" pops at the top centre, with a red ring pulsing outward from it. From 1.2 s a veterinarian in a white coat and teal cap walks in from the left and stops in front of the left stall.
   Narration and captions:
  - 1:02.6–1:07.9: "One day, the veterinary services issue an alert about a batch of meat."

7. 1:08.3–1:21.0: Continuing the market scene. At 0.3 s Koffi's notebook (same design, rows already written) pops up between Koffi and the veterinarian; Koffi holds it out. At 1.0 s a yellow highlighter sweeps across the "Supplier" row. At 1.8 s a red tag "Batch concerned" appears above the tray on Koffi's counter; from 2.6 s the tray lifts and moves off to the right and out of the market. At 3.4 s a teal pill "Batch withdrawn" pops; at 4.3 s a pale green pill "The market carries on" and green checks above the other two stalls. At 5.0 s the notebook fades. At 6.0 s a large cream panel slides in at the top titled "WAEMU member states", with eight teal dots on a gentle arc; red curved lines draw from one dot to each of the others in turn, and red rings pulse outward from the dots as the alert reaches them. No real map, country names or flags.
   Narration and captions:
  - 1:08.5–1:14.3: "Thanks to the notebook, the batch is found and withdrawn. The rest of the market carries on."
  - 1:14.3–1:20.7: "In WAEMU, member states cooperate and share alerts to protect consumers."

8. 1:21.0–1:51.0: Warm cream background (#F7E7C9) with a dot pattern and two very large, faint, slowly rocking question marks. Three questions, 10 s each. Each fades in as a centred cream card: teal label "Quiz · 1/3" (2/3, 3/3), the question in large bold text, and three option rows with dark lettered circles A, B, C. At 4.3 s into each question the correct option turns green with a white check, and a one-line explanation appears under the options. Each card fades out in its last 0.3 s.
   Question 1 (1:21.0): "Who is responsible for the safety of the meat sold?" A "Only the State", B "Every actor in the chain", C "Only the customer". Correct: B. Explanation: "Each actor answers for what they sell, under official controls."
   Narration: "Who is responsible for the safety of the meat sold?" at 1:21.3, then "Each actor answers for what they sell, under official controls." at 1:25.5 (no captions in the quiz; the card carries the text).
   Question 2 (1:31.0): "What does “traceability” mean?" A "Knowing where a product comes from and where it goes", B "Selling faster", C "Cutting prices". Correct: A. Explanation: "It makes it possible to find and withdraw a risky batch quickly."
   Narration: "What does “traceability” mean?" at 1:31.3, then "It makes it possible to find and withdraw a risky batch quickly." at 1:35.5 (no captions in the quiz; the card carries the text).
   Question 3 (1:41.0): "Which text sets the health safety rules in WAEMU?" A "Regulation No. 007/2007/CM/UEMOA", B "The highway code", C "The market by-laws". Correct: A. Explanation: "It covers the safety of plants, animals and food."
   Narration: "Which text sets the health safety rules in WAEMU?" at 1:41.3, then "It covers the safety of plants, animals and food." at 1:45.5 (no captions in the quiz; the card carries the text).

9. 1:51.0–2:00.0: Same cream background. The title "Three habits" fades in at the top. Three cream cards with soft shadows pop up in sequence (0.6 s, 1.5 s, 2.4 s), each with a terracotta number badge (1, 2, 3), a pastel circle with an icon and a bold text of two to four lines: 1 a rubber stamp over a violet oval with a check, "Buy only inspected meat"; 2 a teal notebook with a pencil, "Record your purchases and sales"; 3 a phone showing a red alert with signal waves, "Report any problem to the veterinary services".
   Narration and captions:
  - 1:51.3–2:00.0: "A safe chain, from herd to plate."

10. 2:00.0–2:05.0: Dark brown background (#1E1712). Fade in, centred: small letter-spaced "Produced by" in muted beige, the Paruto Media logo in white below it (use the uploaded paruto-media-logo-white.svg; if no file is uploaded, set "PARUTO MEDIA" in white, wide letter-spacing), then a small grey line: "Demonstration sample · content to be validated by technical experts".

When it looks right, render it as an MP4 at 1080p.
```

## Portuguese (European)

```text
Create a 125.0-second animated explainer video in Portuguese (European), 1920×1080 (16:9), 25 fps, titled "O talho de Koffi". It is a public-awareness video for butchers, livestock traders, abattoir staff and consumers in the WAEMU area about food safety rules: buying only inspected meat, traceability, and cooperation on health alerts.

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

1. 0:00.0–0:07.0: Dawn over the Sahel: sky gradient from #E7834A at the top to #F9D59C at the horizon, a large soft sun rising slowly, two flat acacia trees in dark olive silhouette, and five small dark-brown zebu cattle walking left to right along the horizon in a slow loop. From 0.8 s the title fades and slides up into the upper third: a small letter-spaced kicker "PARUTO MEDIA", the title "O talho de Koffi" (very large, extra bold, #2B1E16) and the subtitle "A segurança sanitária dos alimentos no espaço da UEMOA" beneath it.
   Narration and captions:
  - 0:01.2–0:06.8: "O talho de Koffi: a segurança sanitária dos alimentos no espaço da UEMOA."

2. 0:07.0–0:18.0: A busy city market: warm sky (#F2C584 to #FCEFD8), soft sand-coloured buildings with small windows in the background, a paved sand ground (#E7B77A). Market stalls have striped awnings with scalloped edges (terracotta and cream for meat stalls, teal and cream for vegetable stalls), wooden posts and a wooden counter. In the centre, Koffi's butcher stall: two cuts of meat hang from steel hooks at either side of the awning and cuts are laid on the counter. Koffi, a West African butcher: terracotta shirt, white apron, dark cap with a cream band, stands behind the counter facing left, working with a knife. Two customers walk in from the left (a woman in a yellow wrap dress with a terracotta head wrap, and a man in a light-blue shirt) and stop at the counter. At 1.4 s a cream speech-bubble name tag pops above Koffi: "Koffi · talhante". From 6.2 s Koffi hands a wrapped package of meat (marked with a small violet oval stamp) to the man.
   Narration and captions:
  - 0:07.4–0:10.8: "Este é Koffi, talhante no mercado da cidade."
  - 0:10.8–0:17.8: "A sua carne vem de criadores, passa pelo mercado de gado e pelo matadouro, antes de chegar aos seus clientes."

3. 0:18.0–0:33.6: Cream board (#FBF1DF) with a fine dot pattern. At 0.3 s a cream card pops in at the top: a small document icon, the title "Regulamento n.º 007/2007/CM/UEMOA" and three small icons with labels "Vegetais" (a sprout), "Animais" (a cow), "Alimentos" (a bowl). From 1.6 s five round cream nodes pop in from left to right along the middle, linked by sand-coloured arrows that draw on: "Criador" (a zebu), "Mercado de gado" (a terracotta market tent), "Matadouro" (a white building with a terracotta roof and a violet stamp), "Talhante" (a striped awning with hanging meat), "Consumidor" (a plate with meat and cutlery). From 2.4 s a small orange folder travels from node to node, pausing at each. From 10.9 s a green check in a circle pops above each node in turn.
   Narration and captions:
  - 0:18.3–0:28.6: "Na UEMOA, o Regulamento n.º 007/2007/CM/UEMOA fixa regras comuns de segurança sanitária dos vegetais, dos animais e dos alimentos."
  - 0:28.6–0:33.4: "Cada ator da cadeia é responsável pela segurança do que vende."

4. 0:33.6–0:46.8: A busy city market: warm sky (#F2C584 to #FCEFD8), soft sand-coloured buildings with small windows in the background, a paved sand ground (#E7B77A). Market stalls have striped awnings with scalloped edges (terracotta and cream for meat stalls, teal and cream for vegetable stalls), wooden posts and a wooden counter. Koffi, a West African butcher: terracotta shirt, white apron, dark cap with a cream band, behind his counter facing left. A trader in a green boubou and cream cap walks in from the left (0–2.4 s) holding out a wooden tray with two cuts of meat, with no stamp on them. At 2.5 s a yellow pill "Mais barato!" pops near the tray, and at 3.1 s a red pill "Sem carimbo". At 3.6 s a large cream card (rounded corners, soft shadow) slides down into the upper half: small teal uppercase label "Escolha", the question in large bold text, then two option rows with numbered dark circles 1 and 2 (texts below). From 4.6 s show "Pause o vídeo e escolha: 1 ou 2?" with a 3, 2, 1 countdown in an orange ring. At 7.8 s option 2 turns green with a white check in a green circle; option 1 dims to half opacity.
   Card text: question "Um vendedor oferece a Koffi carne mais barata, sem carimbo de inspeção. O que faz Koffi?"; option 1 "Compra-a: é um bom negócio"; option 2 "Recusa: a carne tem de vir do matadouro e ser inspecionada".
   Narration and captions:
  - 0:33.9–0:39.8: "Um vendedor oferece a Koffi carne mais barata, sem carimbo de inspeção. O que faz Koffi?"
  - 0:41.6–0:46.6: "Resposta 2: só se compra carne inspecionada, com o carimbo do matadouro."

5. 0:46.8–1:02.3: Outdoors at the edge of town (warm sky, sand hills, ochre ground, one acacia on the right, the sun at top left). On the left, a abattoir: white walls, terracotta roof, a teal sign reading "MATADOURO", a window and a dark open doorway with a steel rail where a half carcass hangs. At 1.0 s a violet oval inspection stamp reading "INSPECIONADO" slams onto the carcass. A veterinarian (white coat, teal cap, clipboard) stands by the door. Koffi walks in from the right and stops facing left; at 2.8 s a wrapped package with the violet stamp passes from the veterinarian to Koffi. At 4.6 s a large open notebook pops in at the upper right: a teal spine with rings, the title "As minhas compras" and three rows "Data", "Fornecedor", "Origem"; blue handwriting draws on each row in turn (5.4 s, 6.9 s, 8.4 s). At 10.0 s the notebook shrinks away. From 10.6 s a traceability line appears across the top: a round icon with a zebu on the left, a round icon with a plate on the right, a dotted teal line between them with a teal dot travelling back and forth, and a teal pill "Rastreabilidade" in the middle.
   Narration and captions:
  - 0:47.1–0:51.4: "Koffi compra no matadouro carne inspecionada, com o seu carimbo."
  - 0:51.4–0:57.2: "No seu caderno, regista cada compra: a data, o fornecedor, a origem dos animais."
  - 0:57.2–1:02.0: "É a rastreabilidade: saber de onde vem um produto e para onde vai."

6. 1:02.3–1:08.3: A busy city market: warm sky (#F2C584 to #FCEFD8), soft sand-coloured buildings with small windows in the background, a paved sand ground (#E7B77A). Market stalls have striped awnings with scalloped edges (terracotta and cream for meat stalls, teal and cream for vegetable stalls), wooden posts and a wooden counter. Three stalls in a row: vegetables on the left, Koffi's butcher stall in the centre (with a wooden tray holding two cuts of meat on the counter), another meat stall on the right. At 0.4 s a red pill with a white bell icon reading "Alerta sanitário" pops at the top centre, with a red ring pulsing outward from it. From 1.2 s a veterinarian in a white coat and teal cap walks in from the left and stops in front of the left stall.
   Narration and captions:
  - 1:02.6–1:07.9: "Um dia, os serviços veterinários lançam um alerta sobre um lote de carne."

7. 1:08.3–1:21.0: Continuing the market scene. At 0.3 s Koffi's notebook (same design, rows already written) pops up between Koffi and the veterinarian; Koffi holds it out. At 1.0 s a yellow highlighter sweeps across the "Fornecedor" row. At 1.8 s a red tag "Lote em causa" appears above the tray on Koffi's counter; from 2.6 s the tray lifts and moves off to the right and out of the market. At 3.4 s a teal pill "Lote retirado" pops; at 4.3 s a pale green pill "O mercado continua" and green checks above the other two stalls. At 5.0 s the notebook fades. At 6.0 s a large cream panel slides in at the top titled "Estados-membros da UEMOA", with eight teal dots on a gentle arc; red curved lines draw from one dot to each of the others in turn, and red rings pulse outward from the dots as the alert reaches them. No real map, country names or flags.
   Narration and captions:
  - 1:08.5–1:14.3: "Graças ao caderno, o lote é encontrado e retirado. O resto do mercado continua."
  - 1:14.3–1:20.7: "Na UEMOA, os Estados-membros cooperam e partilham os alertas para proteger os consumidores."

8. 1:21.0–1:51.0: Warm cream background (#F7E7C9) with a dot pattern and two very large, faint, slowly rocking question marks. Three questions, 10 s each. Each fades in as a centred cream card: teal label "Quiz · 1/3" (2/3, 3/3), the question in large bold text, and three option rows with dark lettered circles A, B, C. At 4.3 s into each question the correct option turns green with a white check, and a one-line explanation appears under the options. Each card fades out in its last 0.3 s.
   Question 1 (1:21.0): "Quem é responsável pela segurança da carne vendida?" A "Só o Estado", B "Cada ator da cadeia", C "Só o cliente". Correct: B. Explanation: "Do criador ao talhante, cada um responde pelo que vende, sob o controlo dos serviços oficiais."
   Narration: "Quem é responsável pela segurança da carne vendida?" at 1:21.3, then "Do criador ao talhante, cada um responde pelo que vende, sob o controlo dos serviços oficiais." at 1:25.5 (no captions in the quiz; the card carries the text).
   Question 2 (1:31.0): "O que quer dizer «rastreabilidade»?" A "Saber de onde vem um produto e para onde vai", B "Vender mais depressa", C "Baixar os preços". Correct: A. Explanation: "Permite encontrar e retirar depressa um lote de risco."
   Narration: "O que quer dizer «rastreabilidade»?" at 1:31.3, then "Permite encontrar e retirar depressa um lote de risco." at 1:35.5 (no captions in the quiz; the card carries the text).
   Question 3 (1:41.0): "Que texto fixa as regras de segurança sanitária na UEMOA?" A "O Regulamento n.º 007/2007/CM/UEMOA", B "O código da estrada", C "O regulamento do mercado". Correct: A. Explanation: "Abrange a segurança sanitária dos vegetais, dos animais e dos alimentos."
   Narration: "Que texto fixa as regras de segurança sanitária na UEMOA?" at 1:41.3, then "Abrange a segurança sanitária dos vegetais, dos animais e dos alimentos." at 1:45.5 (no captions in the quiz; the card carries the text).

9. 1:51.0–2:00.0: Same cream background. The title "Três reflexos" fades in at the top. Three cream cards with soft shadows pop up in sequence (0.6 s, 1.5 s, 2.4 s), each with a terracotta number badge (1, 2, 3), a pastel circle with an icon and a bold text of two to four lines: 1 a rubber stamp over a violet oval with a check, "Comprar só carne inspecionada"; 2 a teal notebook with a pencil, "Registar as compras e as vendas"; 3 a phone showing a red alert with signal waves, "Comunicar qualquer problema aos serviços veterinários".
   Narration and captions:
  - 1:51.3–2:00.0: "Uma cadeia segura, do rebanho ao prato."

10. 2:00.0–2:05.0: Dark brown background (#1E1712). Fade in, centred: small letter-spaced "Uma produção" in muted beige, the Paruto Media logo in white below it (use the uploaded paruto-media-logo-white.svg; if no file is uploaded, set "PARUTO MEDIA" in white, wide letter-spacing), then a small grey line: "Amostra de demonstração · conteúdo a validar por peritos técnicos".

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

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

Total length: 424.0 s (7:04.0).

## French

```text
Create a 424.0-second animated explainer video in French, 1920×1080 (16:9), 25 fps, titled "La boucherie de Koffi". It is a public-awareness video for butchers, livestock traders, abattoir staff and consumers in the WAEMU area about food safety rules: buying only inspected meat, traceability, and cooperation on health alerts.

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
  - 0:28.6–0:33.4: "Chaque opérateur du secteur alimentaire répond de la qualité sanitaire de ce qu’il vend."

4. 0:33.6–0:59.6: Cream board (#FBF1DF) with a fine dot pattern, no logos. At 0.3 s a teal pill pops at the top: "Règlement n°007/2007/CM/UEMOA". Four cream cards (rounded corners, soft shadow, a pastel circle at the top holding an icon, a bold label under it) pop in a row at 0.6 s, 7.6 s, 14.0 s and 20.6 s: a small teal temple "Normes internationales"; a microscope "Données scientifiques"; a green shield "Précaution"; two speech bubbles (teal and yellow) "Communication sur les risques".
   Narration and captions:
  - 0:33.9–0:41.0: "Le règlement repose sur des principes communs : les mesures suivent les normes internationales."
  - 0:41.0–0:47.4: "Les risques sont évalués sur des données scientifiques, et les mesures leur restent proportionnées."
  - 0:47.4–0:54.0: "Face à un risque de dommage grave, l’absence de certitude scientifique absolue n’est pas un prétexte pour attendre."
  - 0:54.0–0:59.2: "Et les risques sont expliqués aux consommateurs et aux professionnels."

5. 0:59.6–1:25.6: Cream board (#FBF1DF) with a fine dot pattern, no logos. At 0.3 s a teal pill pops at the top: "Commission de l’UEMOA". Four cream cards (rounded corners, soft shadow, a pastel circle at the top holding an icon, a bold label under it) pop in a row at 0.6 s, 7.6 s, 14.0 s and 20.4 s: a teal-roofed office with a small cow head "Comité régional et Comité vétérinaire"; an indigo network of linked dots "Réseaux d’experts, de laboratoires et d’alerte"; a teal-roofed office building "Administration vétérinaire et organisme national"; three people side by side "Conseil consultatif avec les consommateurs".
   Narration and captions:
  - 0:59.9–1:07.0: "Qui fait quoi ? Auprès de la Commission de l’UEMOA, un comité régional conseille, appuyé par le Comité vétérinaire."
  - 1:07.0–1:13.4: "Des réseaux d’experts, de laboratoires et d’alerte relient les États membres."
  - 1:13.4–1:19.8: "Chaque État a une administration vétérinaire et un organisme national de sécurité sanitaire des aliments,"
  - 1:19.8–1:25.2: "ainsi qu’un conseil consultatif où siègent aussi les consommateurs."

6. 1:25.6–1:38.8: A busy city market: warm sky (#F2C584 to #FCEFD8), soft sand-coloured buildings with small windows in the background, a paved sand ground (#E7B77A). Market stalls have striped awnings with scalloped edges (terracotta and cream for meat stalls, teal and cream for vegetable stalls), wooden posts and a wooden counter. Koffi, a West African butcher: terracotta shirt, white apron, dark cap with a cream band, behind his counter facing left. A trader in a green boubou and cream cap walks in from the left (0–2.4 s) holding out a wooden tray with two cuts of meat, with no stamp on them. At 2.5 s a yellow pill "Moins cher !" pops near the tray, and at 3.1 s a red pill "Sans cachet". At 3.6 s a large cream card (rounded corners, soft shadow) slides down into the upper half: small teal uppercase label "Choix", the question in large bold text, then two option rows with numbered dark circles 1 and 2 (texts below). From 4.6 s show "Mettez la vidéo en pause et choisissez : 1 ou 2 ?" with a 3, 2, 1 countdown in an orange ring. At 7.8 s option 2 turns green with a white check in a green circle; option 1 dims to half opacity.
   Card text: question "Un vendeur propose à Koffi de la viande moins chère, sans cachet d’inspection. Que fait Koffi ?"; option 1 "Il l’achète : c’est une bonne affaire"; option 2 "Il refuse : la viande doit venir de l’abattoir et être inspectée".
   Narration and captions:
  - 1:25.9–1:31.8: "Un vendeur propose à Koffi de la viande moins chère, sans cachet d’inspection. Que fait Koffi ?"
  - 1:33.6–1:38.6: "Réponse 2 : on n’achète que de la viande inspectée, avec le cachet de l’abattoir."

7. 1:38.8–1:54.3: Outdoors at the edge of town (warm sky, sand hills, ochre ground, one acacia on the right, the sun at top left). On the left, an abattoir: white walls, terracotta roof, a teal sign reading "ABATTOIR", a window and a dark open doorway with a steel rail where a half carcass hangs. At 1.0 s a violet oval inspection stamp reading "INSPECTÉ" slams onto the carcass. A veterinarian (white coat, teal cap, clipboard) stands by the door. Koffi walks in from the right and stops facing left; at 2.8 s a wrapped package with the violet stamp passes from the veterinarian to Koffi. At 4.6 s a large open notebook pops in at the upper right: a teal spine with rings, the title "Mes achats" and three rows "Date", "Fournisseur", "Origine"; blue handwriting draws on each row in turn (5.4 s, 6.9 s, 8.4 s). At 10.0 s the notebook shrinks away. From 10.6 s a traceability line appears across the top: a round icon with a zebu on the left, a round icon with a plate on the right, a dotted teal line between them with a teal dot travelling back and forth, and a teal pill "Traçabilité" in the middle.
   Narration and captions:
  - 1:39.1–1:43.4: "Koffi achète à l’abattoir une viande inspectée, avec son cachet."
  - 1:43.4–1:49.2: "Dans son cahier, il note chaque achat : la date, le fournisseur, l’origine des animaux."
  - 1:49.2–1:54.0: "C’est la traçabilité : savoir d’où vient un produit et où il va."

8. 1:54.3–2:18.3: A busy city market: warm sky (#F2C584 to #FCEFD8), soft sand-coloured buildings with small windows in the background, a paved sand ground (#E7B77A). Market stalls have striped awnings with scalloped edges (terracotta and cream for meat stalls, teal and cream for vegetable stalls), wooden posts and a wooden counter. Koffi's butcher stall in the centre, Koffi, a West African butcher: terracotta shirt, white apron, dark cap with a cream band, standing behind the counter. Pills pop at the top: a green "Produits sûrs" at the left at 0.6 s, a cream "Autocontrôles à chaque étape" in the middle (a little lower) at 7.8 s, a cream "Justificatifs pour les inspecteurs" at the right at 15.8 s. From 15.6 s a veterinarian (white coat, teal cap) walks in from the right and stops; Koffi holds out his arm, and at 17.6 s his open purchase notebook (teal spine, rows filled in) pops up between them.
   Narration and captions:
  - 1:54.6–2:01.9: "La règle est claire : les opérateurs du secteur alimentaire répondent de ce qu’ils vendent, et ne vendent que des produits sûrs."
  - 2:01.9–2:09.9: "Chacun contrôle ses propres opérations, à toutes les étapes : production, transformation, stockage et distribution."
  - 2:09.9–2:17.9: "Et chacun doit pouvoir montrer aux inspecteurs ses autocontrôles et les informations commerciales sur ses denrées."

9. 2:18.3–2:24.3: A busy city market: warm sky (#F2C584 to #FCEFD8), soft sand-coloured buildings with small windows in the background, a paved sand ground (#E7B77A). Market stalls have striped awnings with scalloped edges (terracotta and cream for meat stalls, teal and cream for vegetable stalls), wooden posts and a wooden counter. Three stalls in a row: vegetables on the left, Koffi's butcher stall in the centre (with a wooden tray holding two cuts of meat on the counter), another meat stall on the right. At 0.4 s a red pill with a white bell icon reading "Alerte sanitaire" pops at the top centre, with a red ring pulsing outward from it. From 1.2 s a veterinarian in a white coat and teal cap walks in from the left and stops in front of the left stall.
   Narration and captions:
  - 2:18.6–2:23.9: "Un jour, les services vétérinaires lancent une alerte sur un lot de viande."

10. 2:24.3–2:37.0: Continuing the market scene. At 0.3 s Koffi's notebook (same design, rows already written) pops up between Koffi and the veterinarian; Koffi holds it out. At 1.0 s a yellow highlighter sweeps across the "Fournisseur" row. At 1.8 s a red tag "Lot concerné" appears above the tray on Koffi's counter; from 2.6 s the tray lifts and moves off to the right and out of the market. At 3.4 s a teal pill "Lot retiré" pops; at 4.3 s a pale green pill "Le marché continue" and green checks above the other two stalls. At 5.0 s the notebook fades. At 6.0 s a large cream panel slides in at the top titled "États membres de l’UEMOA", with eight teal dots on a gentle arc; red curved lines draw from one dot to each of the others in turn, and red rings pulse outward from the dots as the alert reaches them. No real map, country names or flags.
   Narration and captions:
  - 2:24.5–2:30.3: "Grâce au cahier, le lot est retrouvé et retiré. Le reste du marché continue."
  - 2:30.3–2:36.7: "Dans l’UEMOA, les États membres coopèrent et partagent les alertes pour protéger les consommateurs."

11. 2:37.0–3:01.0: A busy city market: warm sky (#F2C584 to #FCEFD8), soft sand-coloured buildings with small windows in the background, a paved sand ground (#E7B77A). Market stalls have striped awnings with scalloped edges (terracotta and cream for meat stalls, teal and cream for vegetable stalls), wooden posts and a wooden counter. Koffi's stall in the centre, Koffi behind the counter, a veterinarian standing at the right edge. At 1.0 s a cream pill with an envelope icon pops at the upper left, "Informer les autorités"; at 1.4 s a small card with a teal-roofed office pops at the upper right and an envelope flies to it from Koffi (Koffi raises his arm). At 5.6 s a green pill "Protéger les consommateurs" pops under the first pill. From 9.8 s three red pills pop in a row across the upper middle, 1.6 s apart: "Suspendre la vente", "Retirer la denrée", "Détruire". At 16.8 s a cream pill "Autorités locales · 1 mois · 24 h" pops above them on the right.
   Narration and captions:
  - 2:37.3–2:46.4: "Si un opérateur pense qu’une denrée qu’il a vendue peut nuire à la santé, il doit informer les autorités et agir pour protéger les consommateurs."
  - 2:46.4–2:53.4: "En cas de danger grave, l’organisme national peut suspendre la vente, retirer la denrée ou la faire détruire."
  - 2:53.4–3:00.6: "En urgence, les autorités locales peuvent agir un mois au plus, en informant l’organisme national dans les 24 heures."

12. 3:01.0–3:25.0: Cream board (#FBF1DF) with a fine dot pattern, no logos. At 0.4 s a large cream card pops in the middle with the title "Maladies animales à déclaration obligatoire" and a teal subtitle "Règlement n°010/2009/COM/UEMOA". From 7.8 s four lines with a red dot appear one by one (1.4 s apart): "Fièvre aphteuse", "Péripneumonie contagieuse bovine", "Peste des petits ruminants", "Fièvre charbonneuse", and at 13.4 s a muted line "… plus de 120 autres". At 15.2 s the board cross-fades to a savanna yard (warm sky, sand hills, ochre ground, an acacia on the left). From 15.6 s a herder (green boubou, cream cap) walks in from the left with two zebu cattle and stops in the middle, holding out his arm towards Koffi, who stands on the right. At 19 s light-blue drool and small red sores appear at the cattle's mouths, and at 18.6 s a red pill "Bave · plaies dans la bouche" pops above them.
   Narration and captions:
  - 3:01.3–3:08.6: "En 2009, l’UEMOA a dressé la liste des maladies animales à déclaration obligatoire : plus de cent vingt."
  - 3:08.6–3:16.6: "Parmi elles : fièvre aphteuse, péripneumonie contagieuse bovine, peste des petits ruminants, fièvre charbonneuse."
  - 3:16.6–3:24.6: "Un matin, un éleveur propose à Koffi des bovins qui bavent, avec des plaies dans la bouche."

13. 3:25.0–3:38.0: The yard from the previous shot, still: the herder, the two drooling cattle with the red pill, Koffi on the right. A large cream card (rounded corners, soft shadow) slides down into the upper half at 3.6 s: small teal uppercase label "Choix", the question in large bold text, then two option rows with numbered dark circles 1 and 2 (texts below). Show "Mettez la vidéo en pause et choisissez : 1 ou 2 ?" with a 3, 2, 1 countdown in an orange ring, then option 2 turns green with a white check in a green circle and option 1 dims to half opacity (at 4.6 s and 7.8 s, as in the first choice).
   Card text: question "Des bovins bavent et ont des plaies dans la bouche. Que fait Koffi ?"; option 1 "Il les achète bon marché et les fait abattre vite"; option 2 "Il refuse et alerte les services vétérinaires".
   Narration and captions:
  - 3:25.3–3:29.6: "Que fait Koffi ?"
  - 3:33.0–3:37.8: "Réponse 2 : il refuse et alerte les services vétérinaires."

14. 3:38.0–4:02.0: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. Koffi's country is the large one on the left. At 0.2 s a red virus icon pops at a farm in the left country. At 0.6 s a cream badge with an info icon pops at the upper left, "Autorité vétérinaire", and an envelope flies to it from the farm. At 7.6 s a badge "Commission de l’UEMOA" (globe icon) pops at the upper right and a document flies to it; at 9.6 s a cream pill with a document icon pops under it: "Formulaire OMSA". At 15.8 s a dashed red ring closes around the farm and a red pill "Périmètre de contrôle" pops above it.
   Narration and captions:
  - 3:38.3–3:45.6: "Toute suspicion doit être portée immédiatement à la connaissance de l’autorité vétérinaire."
  - 3:45.6–3:53.6: "L’État notifie aussitôt la Commission de l’UEMOA, par écrit, sur le formulaire de l’OMSA."
  - 3:53.6–4:01.6: "Il déclare l’infection et applique des mesures dans un périmètre déterminé."

15. 4:02.0–4:20.0: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. Koffi's country is the large one on the left. The farm with its virus icon and the dashed red ring. At 0.4 s the badge "Commission de l’UEMOA" pops at the top centre with a teal pill "Réseau d’alerte" under it, and from 1.0 s three envelopes fly from the farm to the badge and to the two other countries. At 7.8 s a cream pill "Mesures de sauvegarde" replaces the teal one and two red X marks pop on the border. At 9.6 s a badge "OMSA" (small cow head) pops at the upper right and an envelope flies to it. From 13.6 s the virus and ring fade, a green pill "Crise éradiquée" pops and the red X marks become green checks.
   Narration and captions:
  - 4:02.3–4:09.6: "En cas de crise sanitaire, les États préviennent aussitôt la Commission et les autres États par le réseau d’alerte."
  - 4:09.6–4:15.6: "Ils prennent des mesures de sauvegarde et informent l’OMSA quand il s’agit des animaux."
  - 4:15.6–4:19.6: "Les mesures prennent fin une fois la crise éradiquée."

16. 4:20.0–4:44.0: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. Koffi's country is the large one on the left. From 0.6 s a small cow with a document above it walks from the left country to the lower right one, with a cream pill "Certificat vétérinaire" at the top; a green check pops at 6.6 s. From 7.8 s a cargo ship sails up the sea strip on the right, and at 9.0 s the top pill becomes "Certificat de salubrité"; a crate of meat arcs from the ship to the shore and a green check pops at 12.8 s. At 15.6 s the right part of the upper right country turns red with a virus icon, a red X pops at its border and a red pill "Seules les zones touchées" pops at the top; from 18 s a crate still travels from the unaffected part of that country to the left country, with a green check at 22.6 s.
   Narration and captions:
  - 4:20.3–4:27.6: "Les animaux envoyés vers un autre État membre voyagent avec un certificat vétérinaire délivré par un vétérinaire officiel."
  - 4:27.6–4:35.4: "La viande et les produits d’origine animale qui entrent dans l’Union ont un certificat de salubrité : animaux sains, hygiène respectée."
  - 4:35.4–4:43.6: "En cas d’épizootie, un État peut restreindre les animaux venant des seules parties du territoire touchées."

17. 4:44.0–5:08.0: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. Koffi's country is the large one on the left. Three cream crates of meat travel continuously in arcs between the three countries. Pills at the top: a green "Libre circulation" at 0.8 s (until 7.4 s), then a cream "Vendre dans tout État membre" at 7.8 s (until 14.8 s), then three pale-blue pills in a row, 1.2 s apart from 15.2 s: "Cohérentes", "Simples", "Transparentes".
   Narration and captions:
  - 4:44.3–4:51.6: "Les aliments et produits animaux conformes circulent librement dans l’Union."
  - 4:51.6–4:59.0: "Tout opérateur peut vendre dans un autre État membre les produits légalement commercialisés dans le sien."
  - 4:59.0–5:07.6: "Et les règles doivent rester cohérentes, simples et transparentes, sans entraves inutiles au commerce."

18. 5:08.0–5:28.0: Cream board (#FBF1DF) with a fine dot pattern, no logos. Three cream cards (rounded corners, soft shadow, a pastel circle at the top holding an icon, a bold label under it) pop in a row at 0.6 s, 7.2 s and 13.8 s: a green equals sign "Transparence, impartialité, proportionnalité"; three people side by side "Participation et information"; a terracotta radio "Sensibilisation".
   Narration and captions:
  - 5:08.3–5:15.0: "Et quand la boutique de Koffi est contrôlée, il a droit à la transparence, à l’impartialité et à la proportionnalité."
  - 5:15.0–5:21.6: "Les États associent les acteurs aux décisions et les informent des risques et des mesures prises."
  - 5:21.6–5:27.6: "Les campagnes de sensibilisation, comme celle-ci, aident chacun à détecter et prévenir les risques sanitaires."

19. 5:28.0–6:40.0: Warm cream background (#F7E7C9) with a dot pattern and two very large, faint, slowly rocking question marks. Six questions, 12 s each. Each fades in as a centred cream card: teal label "Quiz · 1/6" (2/6 and so on), the question in large bold text, and three option rows with dark lettered circles A, B, C. At 5.2 s into each question the correct option turns green with a white check, and a one-line explanation appears under the options. Each card fades out in its last 0.3 s.
   Question 1 (5:28.0): "Qui est responsable de la sécurité de la viande vendue ?" A "Seulement l’État", B "Les opérateurs qui la vendent", C "Seulement le client". Correct: B. Explanation: "De l’éleveur au boucher, chacun répond de ce qu’il vend, sous le contrôle des services officiels."
   Narration: "Qui est responsable de la sécurité de la viande vendue ?" at 5:28.3, then "De l’éleveur au boucher, chacun répond de ce qu’il vend, sous le contrôle des services officiels." at 5:33.4 (no captions in the quiz; the card carries the text).
   Question 2 (5:40.0): "Que veut dire « traçabilité » ?" A "Savoir d’où vient un produit et où il va", B "Vendre plus vite", C "Baisser les prix". Correct: A. Explanation: "Elle permet de retrouver et de retirer vite un lot à risque."
   Narration: "Que veut dire « traçabilité » ?" at 5:40.3, then "Elle permet de retrouver et de retirer vite un lot à risque." at 5:45.4 (no captions in the quiz; the card carries the text).
   Question 3 (5:52.0): "Quel texte fixe les règles de sécurité sanitaire dans l’UEMOA ?" A "Le Règlement n°007/2007/CM/UEMOA", B "Le code de la route", C "Le règlement du marché". Correct: A. Explanation: "Il couvre la sécurité sanitaire des végétaux, des animaux et des aliments."
   Narration: "Quel texte fixe les règles de sécurité sanitaire dans l’UEMOA ?" at 5:52.3, then "Il couvre la sécurité sanitaire des végétaux, des animaux et des aliments." at 5:57.4 (no captions in the quiz; the card carries the text).
   Question 4 (6:04.0): "Une denrée vendue peut nuire à la santé. Que doit faire l’opérateur ?" A "Rien", B "Informer les autorités et protéger les consommateurs", C "Baisser son prix". Correct: B. Explanation: "Le règlement en fait une obligation pour chaque opérateur."
   Narration: "Une denrée vendue peut nuire à la santé. Que doit faire l’opérateur ?" at 6:04.3, then "Le règlement en fait une obligation pour chaque opérateur." at 6:09.4 (no captions in the quiz; the card carries the text).
   Question 5 (6:16.0): "On soupçonne la fièvre aphteuse. Qui prévenir ?" A "Personne", B "Seulement les clients", C "L’autorité vétérinaire, immédiatement". Correct: C. Explanation: "C’est une maladie à déclaration obligatoire."
   Narration: "On soupçonne la fièvre aphteuse. Qui prévenir ?" at 6:16.3, then "C’est une maladie à déclaration obligatoire." at 6:21.4 (no captions in the quiz; the card carries the text).
   Question 6 (6:28.0): "Qui siège au conseil consultatif de sécurité des aliments ?" A "Administrations, professionnels et consommateurs", B "Seulement le gouvernement", C "Seulement les bouchers". Correct: A. Explanation: "Le conseil doit représenter les trois."
   Narration: "Qui siège au conseil consultatif de sécurité des aliments ?" at 6:28.3, then "Le conseil doit représenter les trois." at 6:33.4 (no captions in the quiz; the card carries the text).

20. 6:40.0–6:50.0: Warm cream background (#F7E7C9) with a dot pattern. The title "Quatre règles" fades in at the top. Four cream cards with soft shadows pop up in sequence (0.6 s, 1.4 s, 2.2 s, 3.0 s), each with a terracotta number badge (1 to 4), a pastel circle with an icon and a bold label: 1 a rubber stamp "Vendre seulement des produits sûrs"; 2 a teal notebook "Garder ses justificatifs"; 3 an envelope "Informer les autorités sans attendre"; 4 a red bell "Signaler toute maladie suspecte".
   Narration and captions:
  - 6:40.3–6:49.6: "Quatre règles : des produits sûrs, des justificatifs, l’information des autorités et le signalement des maladies."

21. 6:50.0–6:59.0: Same cream background. The title "Trois réflexes" fades in at the top. Three cream cards with soft shadows pop up in sequence (0.6 s, 1.5 s, 2.4 s), each with a terracotta number badge (1, 2, 3), a pastel circle with an icon and a bold text of two to four lines: 1 a rubber stamp over a violet oval with a check, "Acheter seulement de la viande inspectée"; 2 a teal notebook with a pencil, "Noter ses achats et ses ventes"; 3 a phone showing a red alert with signal waves, "Signaler tout problème aux services vétérinaires".
   Narration and captions:
  - 6:50.3–6:59.0: "Une chaîne sûre, du troupeau à l’assiette."

22. 6:59.0–7:04.0: Dark brown background (#1E1712). Fade in, centred: small letter-spaced "Une production" in muted beige, the Paruto Media logo in white below it (use the uploaded paruto-media-logo-white.svg; if no file is uploaded, set "PARUTO MEDIA" in white, wide letter-spacing), then a small grey line: "Échantillon de démonstration · contenu à valider par les experts techniques".

When it looks right, render it as an MP4 at 1080p.
```

## English

```text
Create a 424.0-second animated explainer video in English, 1920×1080 (16:9), 25 fps, titled "Koffi’s Butcher Shop". It is a public-awareness video for butchers, livestock traders, abattoir staff and consumers in the WAEMU area about food safety rules: buying only inspected meat, traceability, and cooperation on health alerts.

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
  - 0:28.6–0:33.4: "Every food business in the chain answers for the safety of what it sells."

4. 0:33.6–0:59.6: Cream board (#FBF1DF) with a fine dot pattern, no logos. At 0.3 s a teal pill pops at the top: "Regulation No. 007/2007/CM/UEMOA". Four cream cards (rounded corners, soft shadow, a pastel circle at the top holding an icon, a bold label under it) pop in a row at 0.6 s, 7.6 s, 14.0 s and 20.6 s: a small teal temple "International standards"; a microscope "Scientific data"; a green shield "Precaution"; two speech bubbles (teal and yellow) "Talking about risks".
   Narration and captions:
  - 0:33.9–0:41.0: "The regulation rests on common principles: measures follow international standards."
  - 0:41.0–0:47.4: "Risks are assessed on scientific data, and measures stay in proportion to them."
  - 0:47.4–0:54.0: "Faced with a risk of serious harm, a lack of full scientific certainty is no excuse to wait."
  - 0:54.0–0:59.2: "And risks are explained to consumers and professionals."

5. 0:59.6–1:25.6: Cream board (#FBF1DF) with a fine dot pattern, no logos. At 0.3 s a teal pill pops at the top: "WAEMU Commission". Four cream cards (rounded corners, soft shadow, a pastel circle at the top holding an icon, a bold label under it) pop in a row at 0.6 s, 7.6 s, 14.0 s and 20.4 s: a teal-roofed office with a small cow head "Regional committee and Veterinary Committee"; an indigo network of linked dots "Networks of experts, labs and alerts"; a teal-roofed office building "Veterinary administration and national body"; three people side by side "Advisory council with consumers".
   Narration and captions:
  - 0:59.9–1:07.0: "Who does what? Under the WAEMU Commission, a regional committee advises, backed by the Veterinary Committee."
  - 1:07.0–1:13.4: "Networks of experts, laboratories and alerts link the member states."
  - 1:13.4–1:19.8: "Each state has a veterinary administration and a national food safety body,"
  - 1:19.8–1:25.2: "and an advisory council where consumers also have a seat."

6. 1:25.6–1:38.8: A busy city market: warm sky (#F2C584 to #FCEFD8), soft sand-coloured buildings with small windows in the background, a paved sand ground (#E7B77A). Market stalls have striped awnings with scalloped edges (terracotta and cream for meat stalls, teal and cream for vegetable stalls), wooden posts and a wooden counter. Koffi, a West African butcher: terracotta shirt, white apron, dark cap with a cream band, behind his counter facing left. A trader in a green boubou and cream cap walks in from the left (0–2.4 s) holding out a wooden tray with two cuts of meat, with no stamp on them. At 2.5 s a yellow pill "Cheaper!" pops near the tray, and at 3.1 s a red pill "No stamp". At 3.6 s a large cream card (rounded corners, soft shadow) slides down into the upper half: small teal uppercase label "Choice", the question in large bold text, then two option rows with numbered dark circles 1 and 2 (texts below). From 4.6 s show "Pause the video and choose: 1 or 2?" with a 3, 2, 1 countdown in an orange ring. At 7.8 s option 2 turns green with a white check in a green circle; option 1 dims to half opacity.
   Card text: question "A trader offers Koffi cheaper meat with no inspection stamp. What does Koffi do?"; option 1 "He buys it: it’s a good deal"; option 2 "He refuses: meat must come from the abattoir and be inspected".
   Narration and captions:
  - 1:25.9–1:31.8: "A trader offers Koffi cheaper meat with no inspection stamp. What does Koffi do?"
  - 1:33.6–1:38.6: "Answer 2: only buy inspected meat, with the abattoir stamp."

7. 1:38.8–1:54.3: Outdoors at the edge of town (warm sky, sand hills, ochre ground, one acacia on the right, the sun at top left). On the left, an abattoir: white walls, terracotta roof, a teal sign reading "ABATTOIR", a window and a dark open doorway with a steel rail where a half carcass hangs. At 1.0 s a violet oval inspection stamp reading "INSPECTED" slams onto the carcass. A veterinarian (white coat, teal cap, clipboard) stands by the door. Koffi walks in from the right and stops facing left; at 2.8 s a wrapped package with the violet stamp passes from the veterinarian to Koffi. At 4.6 s a large open notebook pops in at the upper right: a teal spine with rings, the title "My purchases" and three rows "Date", "Supplier", "Origin"; blue handwriting draws on each row in turn (5.4 s, 6.9 s, 8.4 s). At 10.0 s the notebook shrinks away. From 10.6 s a traceability line appears across the top: a round icon with a zebu on the left, a round icon with a plate on the right, a dotted teal line between them with a teal dot travelling back and forth, and a teal pill "Traceability" in the middle.
   Narration and captions:
  - 1:39.1–1:43.4: "Koffi buys inspected meat at the abattoir, with its stamp."
  - 1:43.4–1:49.2: "In his notebook he records every purchase: the date, the supplier, where the animals came from."
  - 1:49.2–1:54.0: "That is traceability: knowing where a product comes from and where it goes."

8. 1:54.3–2:18.3: A busy city market: warm sky (#F2C584 to #FCEFD8), soft sand-coloured buildings with small windows in the background, a paved sand ground (#E7B77A). Market stalls have striped awnings with scalloped edges (terracotta and cream for meat stalls, teal and cream for vegetable stalls), wooden posts and a wooden counter. Koffi's butcher stall in the centre, Koffi, a West African butcher: terracotta shirt, white apron, dark cap with a cream band, standing behind the counter. Pills pop at the top: a green "Safe products" at the left at 0.6 s, a cream "Own checks at every stage" in the middle (a little lower) at 7.8 s, a cream "Records for inspectors" at the right at 15.8 s. From 15.6 s a veterinarian (white coat, teal cap) walks in from the right and stops; Koffi holds out his arm, and at 17.6 s his open purchase notebook (teal spine, rows filled in) pops up between them.
   Narration and captions:
  - 1:54.6–2:01.9: "The rule is clear: food businesses answer for what they sell, and sell only safe products."
  - 2:01.9–2:09.9: "Each one checks its own operations at every stage: production, processing, storage and distribution."
  - 2:09.9–2:17.9: "And each must be able to show inspectors its own checks and the trade records for its food."

9. 2:18.3–2:24.3: A busy city market: warm sky (#F2C584 to #FCEFD8), soft sand-coloured buildings with small windows in the background, a paved sand ground (#E7B77A). Market stalls have striped awnings with scalloped edges (terracotta and cream for meat stalls, teal and cream for vegetable stalls), wooden posts and a wooden counter. Three stalls in a row: vegetables on the left, Koffi's butcher stall in the centre (with a wooden tray holding two cuts of meat on the counter), another meat stall on the right. At 0.4 s a red pill with a white bell icon reading "Health alert" pops at the top centre, with a red ring pulsing outward from it. From 1.2 s a veterinarian in a white coat and teal cap walks in from the left and stops in front of the left stall.
   Narration and captions:
  - 2:18.6–2:23.9: "One day, the veterinary services issue an alert about a batch of meat."

10. 2:24.3–2:37.0: Continuing the market scene. At 0.3 s Koffi's notebook (same design, rows already written) pops up between Koffi and the veterinarian; Koffi holds it out. At 1.0 s a yellow highlighter sweeps across the "Supplier" row. At 1.8 s a red tag "Batch concerned" appears above the tray on Koffi's counter; from 2.6 s the tray lifts and moves off to the right and out of the market. At 3.4 s a teal pill "Batch withdrawn" pops; at 4.3 s a pale green pill "The market carries on" and green checks above the other two stalls. At 5.0 s the notebook fades. At 6.0 s a large cream panel slides in at the top titled "WAEMU member states", with eight teal dots on a gentle arc; red curved lines draw from one dot to each of the others in turn, and red rings pulse outward from the dots as the alert reaches them. No real map, country names or flags.
   Narration and captions:
  - 2:24.5–2:30.3: "Thanks to the notebook, the batch is found and withdrawn. The rest of the market carries on."
  - 2:30.3–2:36.7: "In WAEMU, member states cooperate and share alerts to protect consumers."

11. 2:37.0–3:01.0: A busy city market: warm sky (#F2C584 to #FCEFD8), soft sand-coloured buildings with small windows in the background, a paved sand ground (#E7B77A). Market stalls have striped awnings with scalloped edges (terracotta and cream for meat stalls, teal and cream for vegetable stalls), wooden posts and a wooden counter. Koffi's stall in the centre, Koffi behind the counter, a veterinarian standing at the right edge. At 1.0 s a cream pill with an envelope icon pops at the upper left, "Inform the authorities"; at 1.4 s a small card with a teal-roofed office pops at the upper right and an envelope flies to it from Koffi (Koffi raises his arm). At 5.6 s a green pill "Protect consumers" pops under the first pill. From 9.8 s three red pills pop in a row across the upper middle, 1.6 s apart: "Suspend sales", "Withdraw the food", "Destroy it". At 16.8 s a cream pill "Local authorities · 1 month · 24 h" pops above them on the right.
   Narration and captions:
  - 2:37.3–2:46.4: "If a business thinks a food it has sold may harm health, it must inform the authorities and act to protect consumers."
  - 2:46.4–2:53.4: "In serious danger, the national food safety body can suspend sales, withdraw the food or have it destroyed."
  - 2:53.4–3:00.6: "In an emergency, local authorities can act for up to a month, informing that body within 24 hours."

12. 3:01.0–3:25.0: Cream board (#FBF1DF) with a fine dot pattern, no logos. At 0.4 s a large cream card pops in the middle with the title "Notifiable animal diseases" and a teal subtitle "Regulation n°010/2009/COM/UEMOA". From 7.8 s four lines with a red dot appear one by one (1.4 s apart): "Foot-and-mouth disease", "Contagious bovine pleuropneumonia", "Peste des petits ruminants", "Anthrax", and at 13.4 s a muted line "… and more than 120 others". At 15.2 s the board cross-fades to a savanna yard (warm sky, sand hills, ochre ground, an acacia on the left). From 15.6 s a herder (green boubou, cream cap) walks in from the left with two zebu cattle and stops in the middle, holding out his arm towards Koffi, who stands on the right. At 19 s light-blue drool and small red sores appear at the cattle's mouths, and at 18.6 s a red pill "Drooling · mouth sores" pops above them.
   Narration and captions:
  - 3:01.3–3:08.6: "In 2009, WAEMU listed the animal diseases that must be notified: more than one hundred and twenty."
  - 3:08.6–3:16.6: "Among them: foot-and-mouth disease, contagious bovine pleuropneumonia, peste des petits ruminants and anthrax."
  - 3:16.6–3:24.6: "One morning, a herder offers Koffi cattle that are drooling, with sores in their mouths."

13. 3:25.0–3:38.0: The yard from the previous shot, still: the herder, the two drooling cattle with the red pill, Koffi on the right. A large cream card (rounded corners, soft shadow) slides down into the upper half at 3.6 s: small teal uppercase label "Choice", the question in large bold text, then two option rows with numbered dark circles 1 and 2 (texts below). Show "Pause the video and choose: 1 or 2?" with a 3, 2, 1 countdown in an orange ring, then option 2 turns green with a white check in a green circle and option 1 dims to half opacity (at 4.6 s and 7.8 s, as in the first choice).
   Card text: question "The cattle are drooling, with mouth sores. What does Koffi do?"; option 1 "He buys them cheap and has them slaughtered fast"; option 2 "He refuses and alerts the veterinary services".
   Narration and captions:
  - 3:25.3–3:29.6: "What does Koffi do?"
  - 3:33.0–3:37.8: "Answer 2: he refuses and alerts the veterinary services."

14. 3:38.0–4:02.0: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. Koffi's country is the large one on the left. At 0.2 s a red virus icon pops at a farm in the left country. At 0.6 s a cream badge with an info icon pops at the upper left, "Veterinary authority", and an envelope flies to it from the farm. At 7.6 s a badge "WAEMU Commission" (globe icon) pops at the upper right and a document flies to it; at 9.6 s a cream pill with a document icon pops under it: "WOAH form". At 15.8 s a dashed red ring closes around the farm and a red pill "Control area" pops above it.
   Narration and captions:
  - 3:38.3–3:45.6: "Any suspicion must be brought to the veterinary authority at once."
  - 3:45.6–3:53.6: "The state notifies the WAEMU Commission immediately, in writing, on WOAH’s form."
  - 3:53.6–4:01.6: "It declares the infection and applies measures within a defined area."

15. 4:02.0–4:20.0: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. Koffi's country is the large one on the left. The farm with its virus icon and the dashed red ring. At 0.4 s the badge "WAEMU Commission" pops at the top centre with a teal pill "Alert network" under it, and from 1.0 s three envelopes fly from the farm to the badge and to the two other countries. At 7.8 s a cream pill "Safeguard measures" replaces the teal one and two red X marks pop on the border. At 9.6 s a badge "WOAH" (small cow head) pops at the upper right and an envelope flies to it. From 13.6 s the virus and ring fade, a green pill "Crisis eradicated" pops and the red X marks become green checks.
   Narration and captions:
  - 4:02.3–4:09.6: "In a health crisis, states warn the Commission and each other at once through the alert network."
  - 4:09.6–4:15.6: "They take safeguard measures, and inform WOAH when animals are affected."
  - 4:15.6–4:19.6: "The measures end once the crisis is eradicated."

16. 4:20.0–4:44.0: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. Koffi's country is the large one on the left. From 0.6 s a small cow with a document above it walks from the left country to the lower right one, with a cream pill "Veterinary certificate" at the top; a green check pops at 6.6 s. From 7.8 s a cargo ship sails up the sea strip on the right, and at 9.0 s the top pill becomes "Health certificate"; a crate of meat arcs from the ship to the shore and a green check pops at 12.8 s. At 15.6 s the right part of the upper right country turns red with a virus icon, a red X pops at its border and a red pill "Affected areas only" pops at the top; from 18 s a crate still travels from the unaffected part of that country to the left country, with a green check at 22.6 s.
   Narration and captions:
  - 4:20.3–4:27.6: "Animals sent to another member state travel with a veterinary certificate from an official veterinarian."
  - 4:27.6–4:35.4: "Meat and animal products entering the Union carry a health certificate: healthy animals, hygienic handling."
  - 4:35.4–4:43.6: "In an epizootic, a state can restrict animals from just the affected parts of another state."

17. 4:44.0–5:08.0: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. Koffi's country is the large one on the left. Three cream crates of meat travel continuously in arcs between the three countries. Pills at the top: a green "Free movement" at 0.8 s (until 7.4 s), then a cream "Sell in any member state" at 7.8 s (until 14.8 s), then three pale-blue pills in a row, 1.2 s apart from 15.2 s: "Coherent", "Simple", "Transparent".
   Narration and captions:
  - 4:44.3–4:51.6: "Food and animal products that meet the rules move freely across the Union."
  - 4:51.6–4:59.0: "Any business can sell in another member state the products it sells lawfully in its own."
  - 4:59.0–5:07.6: "And rules must stay coherent, simple and transparent, with no needless barriers to trade."

18. 5:08.0–5:28.0: Cream board (#FBF1DF) with a fine dot pattern, no logos. Three cream cards (rounded corners, soft shadow, a pastel circle at the top holding an icon, a bold label under it) pop in a row at 0.6 s, 7.2 s and 13.8 s: a green equals sign "Transparency, impartiality, proportionality"; three people side by side "A say and information"; a terracotta radio "Awareness".
   Narration and captions:
  - 5:08.3–5:15.0: "And when Koffi’s shop is inspected, he is entitled to transparency, impartiality and proportionality."
  - 5:15.0–5:21.6: "States give the people concerned a say and tell them about risks and the measures taken."
  - 5:21.6–5:27.6: "Awareness campaigns, like this one, help everyone detect and prevent health risks."

19. 5:28.0–6:40.0: Warm cream background (#F7E7C9) with a dot pattern and two very large, faint, slowly rocking question marks. Six questions, 12 s each. Each fades in as a centred cream card: teal label "Quiz · 1/6" (2/6 and so on), the question in large bold text, and three option rows with dark lettered circles A, B, C. At 5.2 s into each question the correct option turns green with a white check, and a one-line explanation appears under the options. Each card fades out in its last 0.3 s.
   Question 1 (5:28.0): "Who is responsible for the safety of the meat sold?" A "Only the State", B "The businesses that sell it", C "Only the customer". Correct: B. Explanation: "Each actor answers for what they sell, under official controls."
   Narration: "Who is responsible for the safety of the meat sold?" at 5:28.3, then "Each actor answers for what they sell, under official controls." at 5:33.4 (no captions in the quiz; the card carries the text).
   Question 2 (5:40.0): "What does “traceability” mean?" A "Knowing where a product comes from and where it goes", B "Selling faster", C "Cutting prices". Correct: A. Explanation: "It makes it possible to find and withdraw a risky batch quickly."
   Narration: "What does “traceability” mean?" at 5:40.3, then "It makes it possible to find and withdraw a risky batch quickly." at 5:45.4 (no captions in the quiz; the card carries the text).
   Question 3 (5:52.0): "Which text sets the health safety rules in WAEMU?" A "Regulation No. 007/2007/CM/UEMOA", B "The highway code", C "The market by-laws". Correct: A. Explanation: "It covers the safety of plants, animals and food."
   Narration: "Which text sets the health safety rules in WAEMU?" at 5:52.3, then "It covers the safety of plants, animals and food." at 5:57.4 (no captions in the quiz; the card carries the text).
   Question 4 (6:04.0): "A food sold may harm health. What must the business do?" A "Nothing", B "Inform the authorities and protect consumers", C "Lower its price". Correct: B. Explanation: "The regulation makes this a duty for every food business."
   Narration: "A food sold may harm health. What must the business do?" at 6:04.3, then "The regulation makes this a duty for every food business." at 6:09.4 (no captions in the quiz; the card carries the text).
   Question 5 (6:16.0): "Foot-and-mouth disease is suspected. Who must be told?" A "Nobody", B "Only the customers", C "The veterinary authority, at once". Correct: C. Explanation: "It is a notifiable disease."
   Narration: "Foot-and-mouth disease is suspected. Who must be told?" at 6:16.3, then "It is a notifiable disease." at 6:21.4 (no captions in the quiz; the card carries the text).
   Question 6 (6:28.0): "Who sits on the food safety advisory council?" A "Officials, professionals and consumers", B "Only the government", C "Only the butchers". Correct: A. Explanation: "The council must represent all three."
   Narration: "Who sits on the food safety advisory council?" at 6:28.3, then "The council must represent all three." at 6:33.4 (no captions in the quiz; the card carries the text).

20. 6:40.0–6:50.0: Warm cream background (#F7E7C9) with a dot pattern. The title "Four rules" fades in at the top. Four cream cards with soft shadows pop up in sequence (0.6 s, 1.4 s, 2.2 s, 3.0 s), each with a terracotta number badge (1 to 4), a pastel circle with an icon and a bold label: 1 a rubber stamp "Sell only safe products"; 2 a teal notebook "Keep your records"; 3 an envelope "Inform the authorities at once"; 4 a red bell "Report any suspected disease".
   Narration and captions:
  - 6:40.3–6:49.6: "Four rules: safe products, good records, informing the authorities and reporting disease."

21. 6:50.0–6:59.0: Same cream background. The title "Three habits" fades in at the top. Three cream cards with soft shadows pop up in sequence (0.6 s, 1.5 s, 2.4 s), each with a terracotta number badge (1, 2, 3), a pastel circle with an icon and a bold text of two to four lines: 1 a rubber stamp over a violet oval with a check, "Buy only inspected meat"; 2 a teal notebook with a pencil, "Record your purchases and sales"; 3 a phone showing a red alert with signal waves, "Report any problem to the veterinary services".
   Narration and captions:
  - 6:50.3–6:59.0: "A safe chain, from herd to plate."

22. 6:59.0–7:04.0: Dark brown background (#1E1712). Fade in, centred: small letter-spaced "Produced by" in muted beige, the Paruto Media logo in white below it (use the uploaded paruto-media-logo-white.svg; if no file is uploaded, set "PARUTO MEDIA" in white, wide letter-spacing), then a small grey line: "Demonstration sample · content to be validated by technical experts".

When it looks right, render it as an MP4 at 1080p.
```

## Portuguese (European)

```text
Create a 424.0-second animated explainer video in Portuguese (European), 1920×1080 (16:9), 25 fps, titled "O talho de Koffi". It is a public-awareness video for butchers, livestock traders, abattoir staff and consumers in the WAEMU area about food safety rules: buying only inspected meat, traceability, and cooperation on health alerts.

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
  - 0:28.6–0:33.4: "Cada operador do setor alimentar responde pela qualidade sanitária do que vende."

4. 0:33.6–0:59.6: Cream board (#FBF1DF) with a fine dot pattern, no logos. At 0.3 s a teal pill pops at the top: "Regulamento n.º 007/2007/CM/UEMOA". Four cream cards (rounded corners, soft shadow, a pastel circle at the top holding an icon, a bold label under it) pop in a row at 0.6 s, 7.6 s, 14.0 s and 20.6 s: a small teal temple "Normas internacionais"; a microscope "Dados científicos"; a green shield "Precaução"; two speech bubbles (teal and yellow) "Comunicação sobre os riscos".
   Narration and captions:
  - 0:33.9–0:41.0: "O regulamento assenta em princípios comuns: as medidas seguem as normas internacionais."
  - 0:41.0–0:47.4: "Os riscos são avaliados com base em dados científicos, e as medidas mantêm-se proporcionais."
  - 0:47.4–0:54.0: "Perante um risco de dano grave, a falta de certeza científica absoluta não é pretexto para esperar."
  - 0:54.0–0:59.2: "E os riscos são explicados aos consumidores e aos profissionais."

5. 0:59.6–1:25.6: Cream board (#FBF1DF) with a fine dot pattern, no logos. At 0.3 s a teal pill pops at the top: "Comissão da UEMOA". Four cream cards (rounded corners, soft shadow, a pastel circle at the top holding an icon, a bold label under it) pop in a row at 0.6 s, 7.6 s, 14.0 s and 20.4 s: a teal-roofed office with a small cow head "Comité regional e Comité veterinário"; an indigo network of linked dots "Redes de peritos, laboratórios e alerta"; a teal-roofed office building "Administração veterinária e organismo nacional"; three people side by side "Conselho consultivo com os consumidores".
   Narration and captions:
  - 0:59.9–1:07.0: "Quem faz o quê? Junto da Comissão da UEMOA, um comité regional aconselha, apoiado pelo Comité veterinário."
  - 1:07.0–1:13.4: "Redes de peritos, laboratórios e alerta ligam os Estados-membros."
  - 1:13.4–1:19.8: "Cada Estado tem uma administração veterinária e um organismo nacional de segurança sanitária dos alimentos,"
  - 1:19.8–1:25.2: "e um conselho consultivo onde também têm assento os consumidores."

6. 1:25.6–1:38.8: A busy city market: warm sky (#F2C584 to #FCEFD8), soft sand-coloured buildings with small windows in the background, a paved sand ground (#E7B77A). Market stalls have striped awnings with scalloped edges (terracotta and cream for meat stalls, teal and cream for vegetable stalls), wooden posts and a wooden counter. Koffi, a West African butcher: terracotta shirt, white apron, dark cap with a cream band, behind his counter facing left. A trader in a green boubou and cream cap walks in from the left (0–2.4 s) holding out a wooden tray with two cuts of meat, with no stamp on them. At 2.5 s a yellow pill "Mais barato!" pops near the tray, and at 3.1 s a red pill "Sem carimbo". At 3.6 s a large cream card (rounded corners, soft shadow) slides down into the upper half: small teal uppercase label "Escolha", the question in large bold text, then two option rows with numbered dark circles 1 and 2 (texts below). From 4.6 s show "Pause o vídeo e escolha: 1 ou 2?" with a 3, 2, 1 countdown in an orange ring. At 7.8 s option 2 turns green with a white check in a green circle; option 1 dims to half opacity.
   Card text: question "Um vendedor oferece a Koffi carne mais barata, sem carimbo de inspeção. O que faz Koffi?"; option 1 "Compra-a: é um bom negócio"; option 2 "Recusa: a carne tem de vir do matadouro e ser inspecionada".
   Narration and captions:
  - 1:25.9–1:31.8: "Um vendedor oferece a Koffi carne mais barata, sem carimbo de inspeção. O que faz Koffi?"
  - 1:33.6–1:38.6: "Resposta 2: só se compra carne inspecionada, com o carimbo do matadouro."

7. 1:38.8–1:54.3: Outdoors at the edge of town (warm sky, sand hills, ochre ground, one acacia on the right, the sun at top left). On the left, an abattoir: white walls, terracotta roof, a teal sign reading "MATADOURO", a window and a dark open doorway with a steel rail where a half carcass hangs. At 1.0 s a violet oval inspection stamp reading "INSPECIONADO" slams onto the carcass. A veterinarian (white coat, teal cap, clipboard) stands by the door. Koffi walks in from the right and stops facing left; at 2.8 s a wrapped package with the violet stamp passes from the veterinarian to Koffi. At 4.6 s a large open notebook pops in at the upper right: a teal spine with rings, the title "As minhas compras" and three rows "Data", "Fornecedor", "Origem"; blue handwriting draws on each row in turn (5.4 s, 6.9 s, 8.4 s). At 10.0 s the notebook shrinks away. From 10.6 s a traceability line appears across the top: a round icon with a zebu on the left, a round icon with a plate on the right, a dotted teal line between them with a teal dot travelling back and forth, and a teal pill "Rastreabilidade" in the middle.
   Narration and captions:
  - 1:39.1–1:43.4: "Koffi compra no matadouro carne inspecionada, com o seu carimbo."
  - 1:43.4–1:49.2: "No seu caderno, regista cada compra: a data, o fornecedor, a origem dos animais."
  - 1:49.2–1:54.0: "É a rastreabilidade: saber de onde vem um produto e para onde vai."

8. 1:54.3–2:18.3: A busy city market: warm sky (#F2C584 to #FCEFD8), soft sand-coloured buildings with small windows in the background, a paved sand ground (#E7B77A). Market stalls have striped awnings with scalloped edges (terracotta and cream for meat stalls, teal and cream for vegetable stalls), wooden posts and a wooden counter. Koffi's butcher stall in the centre, Koffi, a West African butcher: terracotta shirt, white apron, dark cap with a cream band, standing behind the counter. Pills pop at the top: a green "Produtos seguros" at the left at 0.6 s, a cream "Autocontrolos em cada etapa" in the middle (a little lower) at 7.8 s, a cream "Registos para os inspetores" at the right at 15.8 s. From 15.6 s a veterinarian (white coat, teal cap) walks in from the right and stops; Koffi holds out his arm, and at 17.6 s his open purchase notebook (teal spine, rows filled in) pops up between them.
   Narration and captions:
  - 1:54.6–2:01.9: "A regra é clara: os operadores do setor alimentar respondem pelo que vendem, e só vendem produtos seguros."
  - 2:01.9–2:09.9: "Cada um controla as suas próprias operações em todas as etapas: produção, transformação, armazenamento e distribuição."
  - 2:09.9–2:17.9: "E cada um deve poder mostrar aos inspetores os seus autocontrolos e as informações comerciais sobre os seus produtos."

9. 2:18.3–2:24.3: A busy city market: warm sky (#F2C584 to #FCEFD8), soft sand-coloured buildings with small windows in the background, a paved sand ground (#E7B77A). Market stalls have striped awnings with scalloped edges (terracotta and cream for meat stalls, teal and cream for vegetable stalls), wooden posts and a wooden counter. Three stalls in a row: vegetables on the left, Koffi's butcher stall in the centre (with a wooden tray holding two cuts of meat on the counter), another meat stall on the right. At 0.4 s a red pill with a white bell icon reading "Alerta sanitário" pops at the top centre, with a red ring pulsing outward from it. From 1.2 s a veterinarian in a white coat and teal cap walks in from the left and stops in front of the left stall.
   Narration and captions:
  - 2:18.6–2:23.9: "Um dia, os serviços veterinários lançam um alerta sobre um lote de carne."

10. 2:24.3–2:37.0: Continuing the market scene. At 0.3 s Koffi's notebook (same design, rows already written) pops up between Koffi and the veterinarian; Koffi holds it out. At 1.0 s a yellow highlighter sweeps across the "Fornecedor" row. At 1.8 s a red tag "Lote em causa" appears above the tray on Koffi's counter; from 2.6 s the tray lifts and moves off to the right and out of the market. At 3.4 s a teal pill "Lote retirado" pops; at 4.3 s a pale green pill "O mercado continua" and green checks above the other two stalls. At 5.0 s the notebook fades. At 6.0 s a large cream panel slides in at the top titled "Estados-membros da UEMOA", with eight teal dots on a gentle arc; red curved lines draw from one dot to each of the others in turn, and red rings pulse outward from the dots as the alert reaches them. No real map, country names or flags.
   Narration and captions:
  - 2:24.5–2:30.3: "Graças ao caderno, o lote é encontrado e retirado. O resto do mercado continua."
  - 2:30.3–2:36.7: "Na UEMOA, os Estados-membros cooperam e partilham os alertas para proteger os consumidores."

11. 2:37.0–3:01.0: A busy city market: warm sky (#F2C584 to #FCEFD8), soft sand-coloured buildings with small windows in the background, a paved sand ground (#E7B77A). Market stalls have striped awnings with scalloped edges (terracotta and cream for meat stalls, teal and cream for vegetable stalls), wooden posts and a wooden counter. Koffi's stall in the centre, Koffi behind the counter, a veterinarian standing at the right edge. At 1.0 s a cream pill with an envelope icon pops at the upper left, "Informar as autoridades"; at 1.4 s a small card with a teal-roofed office pops at the upper right and an envelope flies to it from Koffi (Koffi raises his arm). At 5.6 s a green pill "Proteger os consumidores" pops under the first pill. From 9.8 s three red pills pop in a row across the upper middle, 1.6 s apart: "Suspender a venda", "Retirar o alimento", "Destruir". At 16.8 s a cream pill "Autoridades locais · 1 mês · 24 h" pops above them on the right.
   Narration and captions:
  - 2:37.3–2:46.4: "Se um operador pensar que um alimento que vendeu pode prejudicar a saúde, deve informar as autoridades e agir para proteger os consumidores."
  - 2:46.4–2:53.4: "Em caso de perigo grave, o organismo nacional pode suspender a venda, retirar o alimento ou mandá-lo destruir."
  - 2:53.4–3:00.6: "Em urgência, as autoridades locais podem agir até um mês, informando o organismo nacional em 24 horas."

12. 3:01.0–3:25.0: Cream board (#FBF1DF) with a fine dot pattern, no logos. At 0.4 s a large cream card pops in the middle with the title "Doenças animais de declaração obrigatória" and a teal subtitle "Regulamento n.º 010/2009/COM/UEMOA". From 7.8 s four lines with a red dot appear one by one (1.4 s apart): "Febre aftosa", "Peripneumonia contagiosa bovina", "Peste dos pequenos ruminantes", "Carbúnculo hemático", and at 13.4 s a muted line "… e mais de 120 outras". At 15.2 s the board cross-fades to a savanna yard (warm sky, sand hills, ochre ground, an acacia on the left). From 15.6 s a herder (green boubou, cream cap) walks in from the left with two zebu cattle and stops in the middle, holding out his arm towards Koffi, who stands on the right. At 19 s light-blue drool and small red sores appear at the cattle's mouths, and at 18.6 s a red pill "Baba · feridas na boca" pops above them.
   Narration and captions:
  - 3:01.3–3:08.6: "Em 2009, a UEMOA estabeleceu a lista das doenças animais de declaração obrigatória: mais de cento e vinte."
  - 3:08.6–3:16.6: "Entre elas: febre aftosa, peripneumonia contagiosa bovina, peste dos pequenos ruminantes e carbúnculo hemático."
  - 3:16.6–3:24.6: "Numa manhã, um criador propõe a Koffi bovinos que babam, com feridas na boca."

13. 3:25.0–3:38.0: The yard from the previous shot, still: the herder, the two drooling cattle with the red pill, Koffi on the right. A large cream card (rounded corners, soft shadow) slides down into the upper half at 3.6 s: small teal uppercase label "Escolha", the question in large bold text, then two option rows with numbered dark circles 1 and 2 (texts below). Show "Pause o vídeo e escolha: 1 ou 2?" with a 3, 2, 1 countdown in an orange ring, then option 2 turns green with a white check in a green circle and option 1 dims to half opacity (at 4.6 s and 7.8 s, as in the first choice).
   Card text: question "Os bovinos babam e têm feridas na boca. O que faz Koffi?"; option 1 "Compra-os barato e manda-os abater depressa"; option 2 "Recusa e alerta os serviços veterinários".
   Narration and captions:
  - 3:25.3–3:29.6: "O que faz Koffi?"
  - 3:33.0–3:37.8: "Resposta 2: recusa e alerta os serviços veterinários."

14. 3:38.0–4:02.0: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. Koffi's country is the large one on the left. At 0.2 s a red virus icon pops at a farm in the left country. At 0.6 s a cream badge with an info icon pops at the upper left, "Autoridade veterinária", and an envelope flies to it from the farm. At 7.6 s a badge "Comissão da UEMOA" (globe icon) pops at the upper right and a document flies to it; at 9.6 s a cream pill with a document icon pops under it: "Formulário da OMSA". At 15.8 s a dashed red ring closes around the farm and a red pill "Perímetro de controlo" pops above it.
   Narration and captions:
  - 3:38.3–3:45.6: "Qualquer suspeita deve ser levada de imediato ao conhecimento da autoridade veterinária."
  - 3:45.6–3:53.6: "O Estado notifica de imediato a Comissão da UEMOA, por escrito, no formulário da OMSA."
  - 3:53.6–4:01.6: "Declara a infeção e aplica medidas num perímetro determinado."

15. 4:02.0–4:20.0: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. Koffi's country is the large one on the left. The farm with its virus icon and the dashed red ring. At 0.4 s the badge "Comissão da UEMOA" pops at the top centre with a teal pill "Rede de alerta" under it, and from 1.0 s three envelopes fly from the farm to the badge and to the two other countries. At 7.8 s a cream pill "Medidas de salvaguarda" replaces the teal one and two red X marks pop on the border. At 9.6 s a badge "OMSA" (small cow head) pops at the upper right and an envelope flies to it. From 13.6 s the virus and ring fade, a green pill "Crise erradicada" pops and the red X marks become green checks.
   Narration and captions:
  - 4:02.3–4:09.6: "Em caso de crise sanitária, os Estados avisam de imediato a Comissão e os outros Estados através da rede de alerta."
  - 4:09.6–4:15.6: "Tomam medidas de salvaguarda e informam a OMSA quando se trata de animais."
  - 4:15.6–4:19.6: "As medidas terminam quando a crise é erradicada."

16. 4:20.0–4:44.0: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. Koffi's country is the large one on the left. From 0.6 s a small cow with a document above it walks from the left country to the lower right one, with a cream pill "Certificado veterinário" at the top; a green check pops at 6.6 s. From 7.8 s a cargo ship sails up the sea strip on the right, and at 9.0 s the top pill becomes "Certificado de salubridade"; a crate of meat arcs from the ship to the shore and a green check pops at 12.8 s. At 15.6 s the right part of the upper right country turns red with a virus icon, a red X pops at its border and a red pill "Só as zonas afetadas" pops at the top; from 18 s a crate still travels from the unaffected part of that country to the left country, with a green check at 22.6 s.
   Narration and captions:
  - 4:20.3–4:27.6: "Os animais enviados para outro Estado-membro viajam com um certificado veterinário emitido por um veterinário oficial."
  - 4:27.6–4:35.4: "A carne e os produtos de origem animal que entram na União têm um certificado de salubridade: animais saudáveis, higiene respeitada."
  - 4:35.4–4:43.6: "Em caso de epizootia, um Estado pode restringir os animais vindos apenas das partes do território afetadas."

17. 4:44.0–5:08.0: An invented map on a cream board (#FBF1DF) with a fine dot pattern, not a real map: three neighbouring countries drawn as soft angular shapes in sand tones separated by thick cream borders (a large one on the left, two on the right, one above the other), a pale-blue strip of sea with small white waves along the right edge, and a small plain two-colour flag on each country (invented, not any real flag). No country names. Koffi's country is the large one on the left. Three cream crates of meat travel continuously in arcs between the three countries. Pills at the top: a green "Livre circulação" at 0.8 s (until 7.4 s), then a cream "Vender em qualquer Estado-membro" at 7.8 s (until 14.8 s), then three pale-blue pills in a row, 1.2 s apart from 15.2 s: "Coerentes", "Simples", "Transparentes".
   Narration and captions:
  - 4:44.3–4:51.6: "Os alimentos e produtos animais conformes circulam livremente na União."
  - 4:51.6–4:59.0: "Qualquer operador pode vender noutro Estado-membro os produtos que comercializa legalmente no seu."
  - 4:59.0–5:07.6: "E as regras devem manter-se coerentes, simples e transparentes, sem entraves inúteis ao comércio."

18. 5:08.0–5:28.0: Cream board (#FBF1DF) with a fine dot pattern, no logos. Three cream cards (rounded corners, soft shadow, a pastel circle at the top holding an icon, a bold label under it) pop in a row at 0.6 s, 7.2 s and 13.8 s: a green equals sign "Transparência, imparcialidade, proporcionalidade"; three people side by side "Participação e informação"; a terracotta radio "Sensibilização".
   Narration and captions:
  - 5:08.3–5:15.0: "E quando o talho de Koffi é controlado, ele tem direito à transparência, à imparcialidade e à proporcionalidade."
  - 5:15.0–5:21.6: "Os Estados associam os intervenientes às decisões e informam-nos sobre os riscos e as medidas tomadas."
  - 5:21.6–5:27.6: "As campanhas de sensibilização, como esta, ajudam todos a detetar e prevenir os riscos sanitários."

19. 5:28.0–6:40.0: Warm cream background (#F7E7C9) with a dot pattern and two very large, faint, slowly rocking question marks. Six questions, 12 s each. Each fades in as a centred cream card: teal label "Quiz · 1/6" (2/6 and so on), the question in large bold text, and three option rows with dark lettered circles A, B, C. At 5.2 s into each question the correct option turns green with a white check, and a one-line explanation appears under the options. Each card fades out in its last 0.3 s.
   Question 1 (5:28.0): "Quem é responsável pela segurança da carne vendida?" A "Só o Estado", B "Os operadores que a vendem", C "Só o cliente". Correct: B. Explanation: "Do criador ao talhante, cada um responde pelo que vende, sob o controlo dos serviços oficiais."
   Narration: "Quem é responsável pela segurança da carne vendida?" at 5:28.3, then "Do criador ao talhante, cada um responde pelo que vende, sob o controlo dos serviços oficiais." at 5:33.4 (no captions in the quiz; the card carries the text).
   Question 2 (5:40.0): "O que quer dizer «rastreabilidade»?" A "Saber de onde vem um produto e para onde vai", B "Vender mais depressa", C "Baixar os preços". Correct: A. Explanation: "Permite encontrar e retirar depressa um lote de risco."
   Narration: "O que quer dizer «rastreabilidade»?" at 5:40.3, then "Permite encontrar e retirar depressa um lote de risco." at 5:45.4 (no captions in the quiz; the card carries the text).
   Question 3 (5:52.0): "Que texto fixa as regras de segurança sanitária na UEMOA?" A "O Regulamento n.º 007/2007/CM/UEMOA", B "O código da estrada", C "O regulamento do mercado". Correct: A. Explanation: "Abrange a segurança sanitária dos vegetais, dos animais e dos alimentos."
   Narration: "Que texto fixa as regras de segurança sanitária na UEMOA?" at 5:52.3, then "Abrange a segurança sanitária dos vegetais, dos animais e dos alimentos." at 5:57.4 (no captions in the quiz; the card carries the text).
   Question 4 (6:04.0): "Um alimento vendido pode prejudicar a saúde. O que deve fazer o operador?" A "Nada", B "Informar as autoridades e proteger os consumidores", C "Baixar o preço". Correct: B. Explanation: "O regulamento faz disto uma obrigação de cada operador."
   Narration: "Um alimento vendido pode prejudicar a saúde. O que deve fazer o operador?" at 6:04.3, then "O regulamento faz disto uma obrigação de cada operador." at 6:09.4 (no captions in the quiz; the card carries the text).
   Question 5 (6:16.0): "Suspeita-se de febre aftosa. Quem avisar?" A "Ninguém", B "Só os clientes", C "A autoridade veterinária, de imediato". Correct: C. Explanation: "É uma doença de declaração obrigatória."
   Narration: "Suspeita-se de febre aftosa. Quem avisar?" at 6:16.3, then "É uma doença de declaração obrigatória." at 6:21.4 (no captions in the quiz; the card carries the text).
   Question 6 (6:28.0): "Quem tem assento no conselho consultivo?" A "Administrações, profissionais e consumidores", B "Só o governo", C "Só os talhantes". Correct: A. Explanation: "O conselho deve representar os três."
   Narration: "Quem tem assento no conselho consultivo?" at 6:28.3, then "O conselho deve representar os três." at 6:33.4 (no captions in the quiz; the card carries the text).

20. 6:40.0–6:50.0: Warm cream background (#F7E7C9) with a dot pattern. The title "Quatro regras" fades in at the top. Four cream cards with soft shadows pop up in sequence (0.6 s, 1.4 s, 2.2 s, 3.0 s), each with a terracotta number badge (1 to 4), a pastel circle with an icon and a bold label: 1 a rubber stamp "Vender só produtos seguros"; 2 a teal notebook "Guardar os registos"; 3 an envelope "Informar as autoridades sem esperar"; 4 a red bell "Comunicar qualquer doença suspeita".
   Narration and captions:
  - 6:40.3–6:49.6: "Quatro regras: produtos seguros, registos, informar as autoridades e comunicar as doenças."

21. 6:50.0–6:59.0: Same cream background. The title "Três reflexos" fades in at the top. Three cream cards with soft shadows pop up in sequence (0.6 s, 1.5 s, 2.4 s), each with a terracotta number badge (1, 2, 3), a pastel circle with an icon and a bold text of two to four lines: 1 a rubber stamp over a violet oval with a check, "Comprar só carne inspecionada"; 2 a teal notebook with a pencil, "Registar as compras e as vendas"; 3 a phone showing a red alert with signal waves, "Comunicar qualquer problema aos serviços veterinários".
   Narration and captions:
  - 6:50.3–6:59.0: "Uma cadeia segura, do rebanho ao prato."

22. 6:59.0–7:04.0: Dark brown background (#1E1712). Fade in, centred: small letter-spaced "Uma produção" in muted beige, the Paruto Media logo in white below it (use the uploaded paruto-media-logo-white.svg; if no file is uploaded, set "PARUTO MEDIA" in white, wide letter-spacing), then a small grey line: "Amostra de demonstração · conteúdo a validar por peritos técnicos".

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

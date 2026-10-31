# HyperFrames prompts: Aïcha’s Market

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

Total length: 444.4 s (7:24.4).

## French

```text
Create a 444.4-second animated explainer video in French, 1920×1080 (16:9), 25 fps, titled "Le marché d’Aïcha". It is a public-awareness video for abattoir operators, meat traders and veterinary services in West Africa about the international standards behind safe meat trade: the WTO SPS Agreement (the right to protect health and its limits, risk assessment, harmonisation on the Codex Alimentarius, WOAH and IPPC standards, equivalence, disease-free zones, fair controls and transparency) and the WHO Code of Marketing of Breast-milk Substitutes.

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

1. 0:00.0–0:07.0: Dawn over the Sahel: sky gradient from #E7834A at the top to #F9D59C at the horizon, a large soft sun rising slowly, two flat acacia trees in dark olive silhouette, and five small dark-brown zebu cattle walking left to right along the horizon in a slow loop. From 0.8 s the title fades and slides up into the upper third: a small letter-spaced kicker "PARUTO MEDIA", the title "Le marché d’Aïcha" (very large, extra bold, #2B1E16) and the subtitle "Les normes internationales qui protègent la viande et ouvrent les marchés" beneath it.
   Narration and captions:
  - 0:01.2–0:06.8: "Le marché d’Aïcha : les normes internationales qui protègent la viande."

2. 0:07.0–0:18.6: Daytime savanna: warm sky (#F2C584 to #FCEFD8), sand hills (#E9C189), ochre ground (#E2A564). On the left a small cream abattoir building with a terracotta roof, two windows, an open door showing white tiles, and a teal sign on the roof reading "ABATTOIR". Beside it a wooden pen with three zebu cattle. Aïcha walks out and stops right of the building: a West African woman in a long terracotta wrapper dress with yellow and teal bands and a teal headwrap. From 2.6 s two buyers in city clothes walk in from the right and stop facing her (one in a blue shirt and dark cap, one in a cream shirt). At 1.6 s a cream name tag pops above Aïcha: "Aïcha · petit abattoir". At 5.8 s a teal pill above the buyers: "Acheteurs de la ville"; at 7.2 s a cream speech bubble above it in terracotta text: "Viande saine ?". Everything gently idles.
   Narration and captions:
  - 0:07.4–0:13.9: "Aïcha dirige un petit abattoir. Des acheteurs d’une grande ville côtière veulent sa viande."
  - 0:13.9–0:18.4: "Mais ils demandent une garantie : cette viande est-elle saine ?"

3. 0:18.6–0:42.6: Diagram on a cream board (#FBF1DF) with a fine dot pattern, no logos. Two rounded sand-coloured countries side by side, split by a dashed vertical border in the middle. Two invented flags tell the countries apart: Aïcha's is teal over gold with a small terracotta disc; the buyers' is split diagonally indigo and sand with a small cream dot. Never use a real flag. The left country holds Aïcha's small abattoir (cream building, terracotta roof, teal sign "ABATTOIR") and its flag; the right one holds a small city skyline and its flag. From 1.2 s a white meat crate (teal band, oval stamp) slides from the abattoir to the border and stops. From 7.8 s four different rule cards pop in one by one around the border (white cards with coloured top bands: pale blue, tan, pale green, pink), each showing a big terracotta "?" or "!", and the crate jitters, stuck. At 15.6 s the cards fly together and vanish into one large cream card with a blue globe icon and "OMC" in bold indigo. From 18.6 s the crate slides across the border into the city; a green check pops at 21.8 s.
   Narration and captions:
  - 0:18.9–0:26.2: "La ville se trouve dans un pays voisin, qui fixe ses propres règles sanitaires pour la viande qui entre."
  - 0:26.2–0:33.6: "Si chaque pays inventait ses propres règles, chaque frontière exigerait autre chose."
  - 0:33.6–0:42.2: "C’est pourquoi les pays se sont accordés sur des principes communs, à l’Organisation mondiale du commerce."

4. 0:42.6–0:56.6: Diagram on a cream board (#FBF1DF) with a fine dot pattern, no logos. At 0.4 s a teal pill at the top: "OMC · Accord SPS". At 1 s a large teal shield with a cream check mark grows in the centre. Three round cream badges pop in a row below it, joined to the shield by dotted lines, each with a teal label: at 6.2 s a person's bust "Personnes", at 8.4 s a cow's head "Animaux", at 10.6 s a green seedling "Végétaux".
   Narration and captions:
  - 0:42.9–0:48.0: "L’Accord SPS de l’OMC commence par un droit :"
  - 0:48.0–0:56.2: "chaque pays peut protéger la vie et la santé des personnes, des animaux et des végétaux."

5. 0:56.6–1:22.6: Continuing on the same board. The three badges fade and the shield shrinks and rises under the pill. A dashed terracotta rounded frame appears around the lower half of the frame (the limits). Four cream cards pop into it in a row, each with a pastel circle, an icon and a bold label: at 0.6 s a microscope "Fondée sur la science"; at 7.6 s a small gauge with its needle in the green "Seulement le nécessaire"; at 13.4 s a balance carrying both invented flags at the same height "Sans discrimination"; at 20 s a striped barrier crossed out with a red circle "Pas de barrière déguisée".
   Narration and captions:
  - 0:56.9–1:04.0: "Mais ce droit a des limites. Une mesure doit reposer sur des principes et des preuves scientifiques."
  - 1:04.0–1:09.8: "Elle ne s’applique que dans la mesure nécessaire pour protéger la santé."
  - 1:09.8–1:16.4: "Elle ne doit pas faire de discrimination entre des pays où les mêmes conditions existent."
  - 1:16.4–1:22.3: "Et elle ne doit jamais servir de barrière déguisée au commerce."

6. 1:22.6–1:46.6: Diagram on a cream board (#FBF1DF) with a fine dot pattern, no logos. On the left the official veterinarian (white coat, teal cap, stethoscope, clipboard) stands and watches. At 0.5 s a teal pill "Évaluation du risque" appears at the top, and below it a large semicircular gauge (green, yellow, red) whose needle swings back and forth, then settles in the green at about 9 s. At 8.2 s, 10.6 s and 13 s three cream cards pop in a row, each with a pastel circle, an icon and a label: a microscope "Preuves scientifiques"; a cow beside a small farm building "Élevage et transformation"; a red virus "Maladies présentes". A magnifying glass moves over each card in turn. At 15.4 s the gauge and cards fade and a large brown balance scale appears: on the left pan a small teal shield with a pill "Protection", on the right pan a meat crate with a pill "Commerce". The beam tips one way, then the other, and comes level at about 19.6 s; a green check pops above it at 20.4 s.
   Narration and captions:
  - 1:22.9–1:30.4: "Pour choisir une mesure, un pays évalue d’abord le risque, avec les méthodes des organisations internationales."
  - 1:30.4–1:38.2: "Il tient compte des preuves scientifiques, des méthodes d’élevage et de transformation, et des maladies présentes."
  - 1:38.2–1:46.2: "Puis il choisit une mesure qui protège assez, sans restreindre le commerce plus que nécessaire."

7. 1:46.6–2:04.2: Diagram on a cream board (#FBF1DF) with a fine dot pattern, no logos. At 0.4 s a teal temple roof (pediment and architrave, #1F7A6E) pops in with "OMC · Accord SPS" in white on the architrave, and a stone base appears below. Under the roof, two small market stalls (terracotta awnings) with a dashed arc between them and a small cream crate travelling along it, looping, until 8.4 s when they fade. Then three cream pillars rise under the roof, one by one at 9.4 s, 11.9 s and 14.2 s, each with a coloured top band, a round icon, a bold name and a teal subtitle: "Codex Alimentarius" with a plate of meat, "Aliments"; "OMSA" with a cow's head, "Santé animale"; "CIPV" with a green leafy seedling, "Végétaux".
   Narration and captions:
  - 1:46.9–1:54.0: "Pour rapprocher les règles, l’Accord demande de fonder les mesures sur les normes internationales."
  - 1:54.0–2:04.0: "Trois organisations les élaborent : le Codex Alimentarius pour les aliments, l’OMSA pour la santé animale et la CIPV pour les végétaux."

8. 2:04.2–2:22.2: Diagram on a cream board (#FBF1DF) with a fine dot pattern, no logos. A light baseline across the lower frame and a dashed teal horizontal line at mid height: the international standard, marked on the left by a round badge with a small teal temple (pediment, three columns) and a pale-teal pill "Norme internationale" under it. From 0.9 s a teal bar topped by Aïcha's flag at its foot grows up to exactly the dashed line; a green check pops above it at 3 s and a green pill "Conforme à l’Accord" at 3.8 s. From 8.8 s an indigo bar with the buyers' flag grows higher than the line; a yellow "?" pops above it at 11.2 s. At 12.4 s a cream card with a microscope flies in from the right and settles beside it; at 14 s the "?" becomes a green check and an indigo pill appears at the top: "Plus strict : justifié par la science".
   Narration and captions:
  - 2:04.5–2:12.6: "Une mesure conforme à ces normes est présumée nécessaire et conforme à l’Accord."
  - 2:12.6–2:21.8: "Un pays peut protéger plus strictement que la norme, mais il lui faut une justification scientifique."

9. 2:22.2–2:33.2: Aïcha's abattoir scene again, idle, with the buyers standing on the right. A pale-teal pill with a syringe icon sits over the cattle in the pen: "Traitée hier". A large cream card (rounded corners, soft shadow) slides down into the upper part of the frame. Small teal uppercase label "Choix", the question in large bold text, then two option rows with numbered dark circles 1 and 2 (texts below). From 1.4 s to 4.4 s show the line "Mettez la vidéo en pause et choisissez : 1 ou 2 ?" with a 3, 2, 1 countdown in an orange ring. At 4.6 s option 2 turns green with a white check mark in a green circle; option 1 dims to half opacity.
   Card text: question "Une vache a reçu un antibiotique hier. Que fait Aïcha ?"; option 1 "L’abattre aujourd’hui pour la vendre vite"; option 2 "Attendre la fin du délai d’attente du médicament".
   Narration and captions:
  - 2:22.5–2:26.8: "Une vache a reçu un antibiotique hier. Que fait Aïcha ?"
  - 2:27.0–2:33.0: "Réponse 2 : on respecte le délai d’attente pour éviter des résidus dans la viande."

10. 2:33.2–2:50.0: Inside the abattoir: walls of small white tiles, a pale grey-green floor. On the left a metal-railed pen with two zebu cattle; on the right a steel rail near the ceiling with three stylised carcasses hanging from hooks (simple rounded shapes in muted pink with cream fat edges and a few rib lines; clean and not gory). The official veterinarian (white coat, teal cap, stethoscope, clipboard) stands by the pen facing the cattle, arm raised as if examining; green check marks pop above each animal at 1.6 s and 2.9 s. From 4.8 s he walks to the carcasses and, at 6.4 s, 8.0 s and 9.6 s, raises his arm and a blue-violet oval inspection stamp with a check slams onto each carcass. At 9.9 s a pale-violet pill appears at the top: "Inspecté". From 11 s: a cream pill "Locaux propres" with small white sparkles twinkling on the floor; at 12.2 s a wall tap drips water and a pill "Eau potable" appears; at 13 s a worker in a white apron, white cap and white boots appears with a pill "Tenue de travail".
   Narration and captions:
  - 2:33.5–2:38.0: "Avant l’abattage, le vétérinaire inspecte les animaux vivants."
  - 2:38.0–2:43.8: "Après l’abattage, il inspecte chaque carcasse et appose le cachet d’inspection."
  - 2:43.8–2:49.8: "Locaux propres, eau potable, tenues de travail : l’hygiène protège le consommateur."

11. 2:50.0–3:14.0: Diagram on a cream board (#FBF1DF) with a fine dot pattern, no logos. Two invented flags tell the countries apart: Aïcha's is teal over gold with a small terracotta disc; the buyers' is split diagonally indigo and sand with a small cream dot. Never use a real flag. Two large cream panels side by side, each with its flag in the top-left corner and a label at the bottom. Left panel (Aïcha's country): a hanging carcass, stylised and not gory; at 2.6 s a blue-violet oval inspection stamp with a check slams onto it; label "Inspection et cachet". Right panel (the buyers' country): a rack of three test tubes that fill with teal liquid from 3.6 s, then a green check; label "Analyses en laboratoire". At 5.4 s a cream circle with a terracotta not-equal sign (≠) pops between the panels. At 7 s a dashed teal line with a small shield appears across the top, with a pale-teal pill "Même niveau de protection"; at 8.4 s and 9.2 s a short teal arrow grows from the top of each panel up to the line. At 15.6 s the ≠ turns into a green circle with a white equals sign, and at 16.6 s a green pill "Équivalent" appears below the panels.
   Narration and captions:
  - 2:50.3–2:56.8: "Le pays des acheteurs ne contrôle pas la viande exactement comme celui d’Aïcha."
  - 2:56.8–3:04.4: "Selon l’article 4, l’importateur doit accepter des mesures différentes comme équivalentes,"
  - 3:04.4–3:13.6: "si le pays exportateur démontre objectivement qu’elles atteignent le niveau de protection de l’importateur."

12. 3:14.0–3:38.0: Continuing with both panels. From 0.6 s three white documents arc one after another from the left panel to the right one. From 4 s a magnifying glass travels from the right panel to the left one and hovers over the stamped carcass; a green check pops at 6.6 s. At 8.2 s a cream speech bubble with a terracotta "?" appears over the left panel; at 11.4 s a calendar showing "6" appears at the top right with a cream pill "Réponse sous 6 mois". At 15.4 s these fade, the green pill below the panels fades, and a dashed road appears along the bottom; from 16 s a small refrigerated truck (white box with a teal snowflake, teal cab) drives steadily from left to right along it with a green pill "Le commerce continue" riding above it.
   Narration and captions:
  - 3:14.3–3:22.0: "L’exportateur fournit les données scientifiques et techniques, et donne accès aux inspections et aux tests."
  - 3:22.0–3:29.8: "Sur demande, l’importateur explique le risque visé par sa mesure, et répond normalement dans les six mois."
  - 3:29.8–3:37.6: "Entre-temps, le commerce en cours continue : une demande n’est pas une raison de l’arrêter."

13. 3:38.0–3:56.0: Diagram on a cream board (#FBF1DF) with a fine dot pattern, no logos. Two invented flags tell the countries apart: Aïcha's is teal over gold with a small terracotta disc; the buyers' is split diagonally indigo and sand with a small cream dot. Never use a real flag. A simple invented map: Aïcha's country divided into four sand-coloured regions by thin cream borders, with a small zebu in three of them, her abattoir and flag in the bottom-left region; on the right, separated by a border barrier (a striped pole, raised), the buyers' country with a small city skyline and its flag. At 2.6 s a red virus pops in the top-right region, which turns salmon red, and a red pill appears at the top: "Fièvre aphteuse". From 8.6 s a red dashed outline pulses around the whole country and a cream speech bubble with a terracotta "?" pops over the buyers' country, both gone by 12.4 s. From 12.6 s each region's outline flashes teal in turn.
   Narration and captions:
  - 3:38.3–3:46.0: "Un matin, la fièvre aphteuse est signalée dans une région éloignée de celle d’Aïcha."
  - 3:46.0–3:55.6: "Tout le pays doit-il arrêter de vendre ? L’article 6 demande d’adapter les mesures à la situation sanitaire de chaque zone."

14. 3:56.0–4:07.0: The map as at the end of the previous shot, still (the outbreak region red). A large cream card (rounded corners, soft shadow) slides down into the upper part of the frame. Small teal uppercase label "Choix", the question in large bold text, then two option rows with numbered dark circles 1 and 2 (texts below). From 1.4 s to 4.4 s show the line "Mettez la vidéo en pause et choisissez : 1 ou 2 ?" with a 3, 2, 1 countdown in an orange ring. At 4.6 s option 2 turns green with a white check mark in a green circle; option 1 dims to half opacity.
   Card text: question "Fièvre aphteuse dans une région lointaine. Que doit faire le pays d’Aïcha ?"; option 1 "Ne rien dire, pour continuer à vendre"; option 2 "Déclarer le foyer, contrôler la zone, prouver que le reste est indemne".
   Narration and captions:
  - 3:56.3–4:00.6: "Que doit faire le pays d’Aïcha ?"
  - 4:00.8–4:06.8: "Réponse 2 : déclarer le foyer, contrôler la zone et prouver que les autres zones sont indemnes."

15. 4:07.0–4:27.0: The same map. At 0.2 s a cream badge with a cow's head and "OMSA" appears at the top right, and an envelope flies to it from the red region. At 2.4 s a dashed teal circle closes around the red region and a teal pill replaces the red one at the top: "Zone sous contrôle". From 6.8 s a magnifying glass sweeps over the three other regions; each turns pale green with a green check (7.8 s, 9.1 s, 10.4 s), and a green pill "Indemne" appears at the top left at 11 s. From 13.6 s a small refrigerated truck leaves the abattoir region and drives towards the border, which stays open; a green check pops over the buyers' country at 18.4 s.
   Narration and captions:
  - 4:07.3–4:14.0: "Le foyer est déclaré à l’OMSA et la zone est placée sous contrôle."
  - 4:14.0–4:20.6: "Grâce à la surveillance et aux contrôles, le pays prouve que les autres zones sont indemnes,"
  - 4:20.6–4:26.6: "et les acheteurs peuvent continuer d’accepter la viande de ces zones."

16. 4:27.0–4:57.0: Diagram on a cream board (#FBF1DF) with a fine dot pattern, no logos. The frame is split by a faint dashed line. Left half: a wooden inspection table at a border post with two white meat crates, one marked with each invented flag, and a border officer in khaki uniform and cap standing beside it. At 1 s a stopwatch appears top left, its hand ticking briefly, with a cream pill "Sans retard injustifié"; from 3.2 s a magnifying glass passes over both crates and a green check pops above each (6.4 s, 6.9 s); at 8.4 s a green equals sign between them and a green pill "Même traitement". Right half, from 14 s: a cork notice board on which three documents are pinned one by one, a cream pill "Mesures publiées" above it, then a cream badge with a globe and "OMC" at the top right and an envelope flying to it from the board (18 s). From 21.6 s a teal counter with a round teal "i" sign above it and a teal pill "Point d’information SPS"; a buyer in a blue shirt walks up from the right, a speech bubble with "?" appears over him at 24.8 s and turns into a green check at 27 s.
   Narration and captions:
  - 4:27.3–4:34.6: "Les contrôles aussi ont des règles. Les inspections se font sans retard injustifié,"
  - 4:34.6–4:41.0: "et les produits importés ne sont pas traités moins bien que les produits locaux."
  - 4:41.0–4:48.8: "Les règles doivent aussi être connues : chaque pays publie ses mesures et notifie leurs changements à l’OMC,"
  - 4:48.8–4:56.6: "et tient un point d’information qui répond aux questions sur ces mesures."

17. 4:57.0–5:02.2: Outside the abattoir building (same design, left). In front of it a small wooden pallet; Aïcha walks out to it and three white meat crates (teal band, small oval stamp) pop onto the pallet one by one. To the right are parked an open yellow pickup and a refrigerated truck (white insulated box with a big teal snowflake, teal cab).
   Narration and captions:
  - 4:57.3–5:02.0: "La viande est prête à partir vers la ville."

18. 5:02.2–5:10.2: undefined
   Card text: question "Comment transporter la viande jusqu’à la ville ?"; option 1 "Dans une camionnette ouverte, au soleil"; option 2 "Dans un camion réfrigéré".
   Narration and captions:
  - 5:02.5–5:10.2: "Comment transporter la viande jusqu’à la ville ?"

19. 5:10.2–5:22.4: Continuing. From 0.3 s the three crates hop one by one into the back of the refrigerated truck; at 1.6 s a pale-teal pill with a snowflake appears above the truck: "Chaîne du froid". From 2.2 s the truck drives off to the right, wheels turning, the pill following it. At 4.4 s crossfade to a city: a skyline of simple sand-coloured buildings with lit windows and a market stall with a striped awning on the right, where a buyer in a cream shirt waits facing left. The refrigerated truck drives in from the left and stops, the pill reappears above it. At 7 s a crate appears in front of the buyer, a magnifying glass sweeps over its stamp, a green check pops at 8.7 s, and at 9.3 s a green pill "Marché conclu" appears above the buyer, who waves.
   Narration and captions:
  - 5:10.5–5:15.5: "Dans un camion réfrigéré, la chaîne du froid n’est jamais rompue."
  - 5:15.5–5:22.2: "Des règles fondées sur les mêmes normes internationales facilitent le commerce entre pays."

20. 5:22.4–5:48.4: A calm room: warm cream wall, a window with pale blue panes, a light wooden floor. At 0.6 s a teal pill at the top: "OMS · Code des substituts du lait maternel". On the left a mother in a purple wrapper dress and a yellow headwrap stands holding her baby, wrapped in a cream blanket, in her arms. At 9.2 s a billboard appears on the right showing a tin of infant formula and a megaphone; at 11.4 s a red cross stamps over it with a red pill "Pas de publicité". At 13.4 s a gift box with a small tin on it appears near the mother; at 14.8 s a red cross over it and a red pill "Pas d’échantillons gratuits". At 18 s both fade and a large formula tin appears on the right, its label carrying a red heart in a pale circle; at 20.2 s a green pill above it "L’allaitement d’abord" and at 21.2 s a green check.
   Narration and captions:
  - 5:22.7–5:31.8: "Un autre texte international protège les tout-petits : le Code international de commercialisation des substituts du lait maternel, de l’OMS."
  - 5:31.8–5:40.8: "Il protège l’allaitement : pas de publicité auprès du public pour ces produits, ni d’échantillons gratuits pour les mères."
  - 5:40.8–5:48.0: "Et leurs étiquettes doivent rappeler la supériorité de l’allaitement maternel."

21. 5:48.4–7:00.4: Warm cream background (#F7E7C9) with a dot pattern and two very large, faint, slowly rocking question marks. 6 questions, 12 s each. Each fades in as a centred cream card: teal label "Quiz · 1/6" and so on, the question in large bold text, and three option rows with dark lettered circles A, B, C. At 5.2 s into each question the correct option turns green with a white check, the others stay, and a one-line explanation appears under the options. Each card fades out in its last 0.3 s.
   Question 1 (5:48.4): "Quelle organisation élabore les normes internationales de santé animale ?" A "Le Codex Alimentarius", B "L’OMSA", C "L’OMC". Correct: B. Explanation: "L’OMSA élabore les normes de santé animale ; le Codex, celles des aliments."
   Narration: "Quelle organisation élabore les normes internationales de santé animale ?" at 5:48.7, then "L’OMSA élabore les normes de santé animale ; le Codex, celles des aliments." at 5:53.8 (no captions in the quiz; the card carries the text).
   Question 2 (6:00.4): "Pourquoi respecter le délai d’attente après un traitement ?" A "Pour éviter des résidus de médicaments dans la viande", B "Pour que l’animal grossisse", C "Pour payer moins de taxes". Correct: A. Explanation: "Pendant ce délai, l’organisme élimine le médicament."
   Narration: "Pourquoi respecter le délai d’attente après un traitement ?" at 6:00.7, then "Pendant ce délai, l’organisme élimine le médicament." at 6:05.8 (no captions in the quiz; the card carries the text).
   Question 3 (6:12.4): "Selon l’Accord SPS de l’OMC, une mesure sanitaire doit être…" A "Fondée sur des preuves scientifiques", B "Décidée sans justification", C "Réservée aux pays voisins". Correct: A. Explanation: "Elle doit reposer sur la science et ne pas restreindre le commerce plus que nécessaire."
   Narration: "Selon l’Accord SPS de l’OMC, une mesure sanitaire doit être…" at 6:12.7, then "Elle doit reposer sur la science et ne pas restreindre le commerce plus que nécessaire." at 6:17.8 (no captions in the quiz; the card carries the text).
   Question 4 (6:24.4): "Quand l’importateur doit-il accepter des mesures différentes ?" A "Jamais", B "Si elles atteignent son niveau de protection", C "Seulement si elles sont identiques". Correct: B. Explanation: "C’est l’équivalence (article 4) : des méthodes différentes, la même protection."
   Narration: "Quand l’importateur doit-il accepter des mesures différentes ?" at 6:24.7, then "C’est l’équivalence (article 4) : des méthodes différentes, la même protection." at 6:29.8 (no captions in the quiz; the card carries the text).
   Question 5 (6:36.4): "Une maladie dans une région : que permet l’article 6 ?" A "Continuer à vendre depuis les zones indemnes", B "Cacher le foyer", C "Fermer toutes les frontières". Correct: A. Explanation: "Les mesures s’adaptent à chaque zone, si le pays prouve qu’elle est indemne."
   Narration: "Une maladie dans une région : que permet l’article 6 ?" at 6:36.7, then "Les mesures s’adaptent à chaque zone, si le pays prouve qu’elle est indemne." at 6:41.8 (no captions in the quiz; the card carries the text).
   Question 6 (6:48.4): "Où se renseigner sur les mesures SPS d’un pays ?" A "À son point d’information SPS", B "Nulle part : elles sont secrètes", C "Seulement à la frontière". Correct: A. Explanation: "Chaque membre de l’OMC a un point d’information qui répond aux questions."
   Narration: "Où se renseigner sur les mesures SPS d’un pays ?" at 6:48.7, then "Chaque membre de l’OMC a un point d’information qui répond aux questions." at 6:53.8 (no captions in the quiz; the card carries the text).

22. 7:00.4–7:10.4: Warm cream background (#F7E7C9) with a dot pattern. The title "Quatre principes" fades in at the top. Four cream cards with soft shadows pop up in sequence (0.6 s, 1.4 s, 2.2 s, 3.0 s), each with a terracotta number badge (1 to 4), a pastel circle with an icon and a bold label: 1 a microscope "Fondé sur la science"; 2 a small teal temple "Normes communes"; 3 a green equals sign "Équivalence"; 4 a tiny map with one red and three green regions "Zones indemnes".
   Narration and captions:
  - 7:00.7–7:10.0: "Quatre principes à retenir : la science, des normes communes, l’équivalence et les zones indemnes."

23. 7:10.4–7:19.4: Same cream background. The title "Trois réflexes" fades in at the top. Three cream cards with soft shadows pop up in sequence (0.6 s, 1.5 s, 2.4 s), each with a terracotta number badge (1, 2, 3), a pastel circle with an icon and a bold two- or three-line text: 1 a teal syringe with a small clock, "Respecter le délai d’attente des médicaments"; 2 a blue-violet oval inspection stamp with a check, "Inspection et hygiène à l’abattoir"; 3 a small refrigerated truck with a snowflake, "Chaîne du froid jusqu’au client".
   Narration and captions:
  - 7:10.7–7:19.4: "Des normes communes pour une viande saine et des marchés ouverts."

24. 7:19.4–7:24.4: Dark brown background (#1E1712). Fade in, centred: small letter-spaced "Une production" in muted beige, the Paruto Media logo in white below it (use the uploaded paruto-media-logo-white.svg; if no file is uploaded, set "PARUTO MEDIA" in white, wide letter-spacing), then a small grey line: "Échantillon de démonstration · contenu à valider par les experts techniques".

When it looks right, render it as an MP4 at 1080p.
```

## English

```text
Create a 444.4-second animated explainer video in English, 1920×1080 (16:9), 25 fps, titled "Aïcha’s Market". It is a public-awareness video for abattoir operators, meat traders and veterinary services in West Africa about the international standards behind safe meat trade: the WTO SPS Agreement (the right to protect health and its limits, risk assessment, harmonisation on the Codex Alimentarius, WOAH and IPPC standards, equivalence, disease-free zones, fair controls and transparency) and the WHO Code of Marketing of Breast-milk Substitutes.

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

1. 0:00.0–0:07.0: Dawn over the Sahel: sky gradient from #E7834A at the top to #F9D59C at the horizon, a large soft sun rising slowly, two flat acacia trees in dark olive silhouette, and five small dark-brown zebu cattle walking left to right along the horizon in a slow loop. From 0.8 s the title fades and slides up into the upper third: a small letter-spaced kicker "PARUTO MEDIA", the title "Aïcha’s Market" (very large, extra bold, #2B1E16) and the subtitle "The international standards that keep meat safe and open markets" beneath it.
   Narration and captions:
  - 0:01.2–0:06.8: "Aïcha’s market: the international standards that keep meat safe."

2. 0:07.0–0:18.6: Daytime savanna: warm sky (#F2C584 to #FCEFD8), sand hills (#E9C189), ochre ground (#E2A564). On the left a small cream abattoir building with a terracotta roof, two windows, an open door showing white tiles, and a teal sign on the roof reading "ABATTOIR". Beside it a wooden pen with three zebu cattle. Aïcha walks out and stops right of the building: a West African woman in a long terracotta wrapper dress with yellow and teal bands and a teal headwrap. From 2.6 s two buyers in city clothes walk in from the right and stop facing her (one in a blue shirt and dark cap, one in a cream shirt). At 1.6 s a cream name tag pops above Aïcha: "Aïcha · small abattoir". At 5.8 s a teal pill above the buyers: "City buyers"; at 7.2 s a cream speech bubble above it in terracotta text: "Is the meat safe?". Everything gently idles.
   Narration and captions:
  - 0:07.4–0:13.9: "Aïcha runs a small abattoir. Buyers from a big coastal city want her meat."
  - 0:13.9–0:18.4: "But they ask for a guarantee: is this meat safe?"

3. 0:18.6–0:42.6: Diagram on a cream board (#FBF1DF) with a fine dot pattern, no logos. Two rounded sand-coloured countries side by side, split by a dashed vertical border in the middle. Two invented flags tell the countries apart: Aïcha's is teal over gold with a small terracotta disc; the buyers' is split diagonally indigo and sand with a small cream dot. Never use a real flag. The left country holds Aïcha's small abattoir (cream building, terracotta roof, teal sign "ABATTOIR") and its flag; the right one holds a small city skyline and its flag. From 1.2 s a white meat crate (teal band, oval stamp) slides from the abattoir to the border and stops. From 7.8 s four different rule cards pop in one by one around the border (white cards with coloured top bands: pale blue, tan, pale green, pink), each showing a big terracotta "?" or "!", and the crate jitters, stuck. At 15.6 s the cards fly together and vanish into one large cream card with a blue globe icon and "WTO" in bold indigo. From 18.6 s the crate slides across the border into the city; a green check pops at 21.8 s.
   Narration and captions:
  - 0:18.9–0:26.2: "The city is in a neighbouring country, which sets its own health rules for the meat it lets in."
  - 0:26.2–0:33.6: "If every country invented its own rules, every border would ask for something different."
  - 0:33.6–0:42.2: "That is why countries agreed on common principles, at the World Trade Organization."

4. 0:42.6–0:56.6: Diagram on a cream board (#FBF1DF) with a fine dot pattern, no logos. At 0.4 s a teal pill at the top: "WTO · SPS Agreement". At 1 s a large teal shield with a cream check mark grows in the centre. Three round cream badges pop in a row below it, joined to the shield by dotted lines, each with a teal label: at 6.2 s a person's bust "People", at 8.4 s a cow's head "Animals", at 10.6 s a green seedling "Plants".
   Narration and captions:
  - 0:42.9–0:48.0: "The WTO SPS Agreement starts with a right:"
  - 0:48.0–0:56.2: "every country may protect the life and health of people, animals and plants."

5. 0:56.6–1:22.6: Continuing on the same board. The three badges fade and the shield shrinks and rises under the pill. A dashed terracotta rounded frame appears around the lower half of the frame (the limits). Four cream cards pop into it in a row, each with a pastel circle, an icon and a bold label: at 0.6 s a microscope "Based on science"; at 7.6 s a small gauge with its needle in the green "Only what is needed"; at 13.4 s a balance carrying both invented flags at the same height "No discrimination"; at 20 s a striped barrier crossed out with a red circle "No hidden barrier".
   Narration and captions:
  - 0:56.9–1:04.0: "But this right has limits. A measure must rest on scientific principles and evidence."
  - 1:04.0–1:09.8: "It applies only as far as needed to protect health."
  - 1:09.8–1:16.4: "It must not discriminate between countries where the same conditions prevail."
  - 1:16.4–1:22.3: "And it must never be a hidden barrier to trade."

6. 1:22.6–1:46.6: Diagram on a cream board (#FBF1DF) with a fine dot pattern, no logos. On the left the official veterinarian (white coat, teal cap, stethoscope, clipboard) stands and watches. At 0.5 s a teal pill "Risk assessment" appears at the top, and below it a large semicircular gauge (green, yellow, red) whose needle swings back and forth, then settles in the green at about 9 s. At 8.2 s, 10.6 s and 13 s three cream cards pop in a row, each with a pastel circle, an icon and a label: a microscope "Scientific evidence"; a cow beside a small farm building "Farming and processing"; a red virus "Diseases present". A magnifying glass moves over each card in turn. At 15.4 s the gauge and cards fade and a large brown balance scale appears: on the left pan a small teal shield with a pill "Protection", on the right pan a meat crate with a pill "Trade". The beam tips one way, then the other, and comes level at about 19.6 s; a green check pops above it at 20.4 s.
   Narration and captions:
  - 1:22.9–1:30.4: "To choose a measure, a country first assesses the risk, using methods from the international organisations."
  - 1:30.4–1:38.2: "It weighs the scientific evidence, how animals are raised and processed, and which diseases are present."
  - 1:38.2–1:46.2: "Then it picks a measure that protects enough, without restricting trade more than required."

7. 1:46.6–2:04.2: Diagram on a cream board (#FBF1DF) with a fine dot pattern, no logos. At 0.4 s a teal temple roof (pediment and architrave, #1F7A6E) pops in with "WTO · SPS Agreement" in white on the architrave, and a stone base appears below. Under the roof, two small market stalls (terracotta awnings) with a dashed arc between them and a small cream crate travelling along it, looping, until 8.4 s when they fade. Then three cream pillars rise under the roof, one by one at 9.4 s, 11.9 s and 14.2 s, each with a coloured top band, a round icon, a bold name and a teal subtitle: "Codex Alimentarius" with a plate of meat, "Food"; "WOAH" with a cow's head, "Animal health"; "IPPC" with a green leafy seedling, "Plants".
   Narration and captions:
  - 1:46.9–1:54.0: "To bring rules closer, the Agreement asks countries to base their measures on international standards."
  - 1:54.0–2:04.0: "Three bodies write them: the Codex Alimentarius for food, WOAH for animal health and the IPPC for plants."

8. 2:04.2–2:22.2: Diagram on a cream board (#FBF1DF) with a fine dot pattern, no logos. A light baseline across the lower frame and a dashed teal horizontal line at mid height: the international standard, marked on the left by a round badge with a small teal temple (pediment, three columns) and a pale-teal pill "International standard" under it. From 0.9 s a teal bar topped by Aïcha's flag at its foot grows up to exactly the dashed line; a green check pops above it at 3 s and a green pill "In line with the Agreement" at 3.8 s. From 8.8 s an indigo bar with the buyers' flag grows higher than the line; a yellow "?" pops above it at 11.2 s. At 12.4 s a cream card with a microscope flies in from the right and settles beside it; at 14 s the "?" becomes a green check and an indigo pill appears at the top: "Stricter: backed by science".
   Narration and captions:
  - 2:04.5–2:12.6: "A measure that follows these standards is presumed necessary and consistent with the Agreement."
  - 2:12.6–2:21.8: "A country may protect more strictly than the standard, but it needs a scientific justification."

9. 2:22.2–2:33.2: Aïcha's abattoir scene again, idle, with the buyers standing on the right. A pale-teal pill with a syringe icon sits over the cattle in the pen: "Treated yesterday". A large cream card (rounded corners, soft shadow) slides down into the upper part of the frame. Small teal uppercase label "Choice", the question in large bold text, then two option rows with numbered dark circles 1 and 2 (texts below). From 1.4 s to 4.4 s show the line "Pause the video and choose: 1 or 2?" with a 3, 2, 1 countdown in an orange ring. At 4.6 s option 2 turns green with a white check mark in a green circle; option 1 dims to half opacity.
   Card text: question "A cow was given an antibiotic yesterday. What does Aïcha do?"; option 1 "Slaughter it today to sell it quickly"; option 2 "Wait until the medicine’s withdrawal period is over".
   Narration and captions:
  - 2:22.5–2:26.8: "A cow was given an antibiotic yesterday. What does Aïcha do?"
  - 2:27.0–2:33.0: "Answer 2: respect the withdrawal period to avoid residues in the meat."

10. 2:33.2–2:50.0: Inside the abattoir: walls of small white tiles, a pale grey-green floor. On the left a metal-railed pen with two zebu cattle; on the right a steel rail near the ceiling with three stylised carcasses hanging from hooks (simple rounded shapes in muted pink with cream fat edges and a few rib lines; clean and not gory). The official veterinarian (white coat, teal cap, stethoscope, clipboard) stands by the pen facing the cattle, arm raised as if examining; green check marks pop above each animal at 1.6 s and 2.9 s. From 4.8 s he walks to the carcasses and, at 6.4 s, 8.0 s and 9.6 s, raises his arm and a blue-violet oval inspection stamp with a check slams onto each carcass. At 9.9 s a pale-violet pill appears at the top: "Inspected". From 11 s: a cream pill "Clean premises" with small white sparkles twinkling on the floor; at 12.2 s a wall tap drips water and a pill "Clean water" appears; at 13 s a worker in a white apron, white cap and white boots appears with a pill "Work clothes".
   Narration and captions:
  - 2:33.5–2:38.0: "Before slaughter, the veterinarian inspects the live animals."
  - 2:38.0–2:43.8: "After slaughter, he inspects each carcass and applies the inspection stamp."
  - 2:43.8–2:49.8: "Clean premises, clean water, work clothes: hygiene protects the consumer."

11. 2:50.0–3:14.0: Diagram on a cream board (#FBF1DF) with a fine dot pattern, no logos. Two invented flags tell the countries apart: Aïcha's is teal over gold with a small terracotta disc; the buyers' is split diagonally indigo and sand with a small cream dot. Never use a real flag. Two large cream panels side by side, each with its flag in the top-left corner and a label at the bottom. Left panel (Aïcha's country): a hanging carcass, stylised and not gory; at 2.6 s a blue-violet oval inspection stamp with a check slams onto it; label "Inspection and stamp". Right panel (the buyers' country): a rack of three test tubes that fill with teal liquid from 3.6 s, then a green check; label "Laboratory tests". At 5.4 s a cream circle with a terracotta not-equal sign (≠) pops between the panels. At 7 s a dashed teal line with a small shield appears across the top, with a pale-teal pill "Same level of protection"; at 8.4 s and 9.2 s a short teal arrow grows from the top of each panel up to the line. At 15.6 s the ≠ turns into a green circle with a white equals sign, and at 16.6 s a green pill "Equivalent" appears below the panels.
   Narration and captions:
  - 2:50.3–2:56.8: "The buyers’ country does not check meat exactly the way Aïcha’s country does."
  - 2:56.8–3:04.4: "Under Article 4, the importer must accept different measures as equivalent,"
  - 3:04.4–3:13.6: "if the exporting country objectively shows that they reach the importer’s level of protection."

12. 3:14.0–3:38.0: Continuing with both panels. From 0.6 s three white documents arc one after another from the left panel to the right one. From 4 s a magnifying glass travels from the right panel to the left one and hovers over the stamped carcass; a green check pops at 6.6 s. At 8.2 s a cream speech bubble with a terracotta "?" appears over the left panel; at 11.4 s a calendar showing "6" appears at the top right with a cream pill "Reply within 6 months". At 15.4 s these fade, the green pill below the panels fades, and a dashed road appears along the bottom; from 16 s a small refrigerated truck (white box with a teal snowflake, teal cab) drives steadily from left to right along it with a green pill "Trade goes on" riding above it.
   Narration and captions:
  - 3:14.3–3:22.0: "The exporter supplies the scientific and technical data, and gives access for inspections and tests."
  - 3:22.0–3:29.8: "On request, the importer explains the risk its measure targets, and normally replies within six months."
  - 3:29.8–3:37.6: "Meanwhile, trade already under way goes on: a request is no reason to stop it."

13. 3:38.0–3:56.0: Diagram on a cream board (#FBF1DF) with a fine dot pattern, no logos. Two invented flags tell the countries apart: Aïcha's is teal over gold with a small terracotta disc; the buyers' is split diagonally indigo and sand with a small cream dot. Never use a real flag. A simple invented map: Aïcha's country divided into four sand-coloured regions by thin cream borders, with a small zebu in three of them, her abattoir and flag in the bottom-left region; on the right, separated by a border barrier (a striped pole, raised), the buyers' country with a small city skyline and its flag. At 2.6 s a red virus pops in the top-right region, which turns salmon red, and a red pill appears at the top: "Foot-and-mouth disease". From 8.6 s a red dashed outline pulses around the whole country and a cream speech bubble with a terracotta "?" pops over the buyers' country, both gone by 12.4 s. From 12.6 s each region's outline flashes teal in turn.
   Narration and captions:
  - 3:38.3–3:46.0: "One morning, foot-and-mouth disease is reported in a region far from Aïcha’s."
  - 3:46.0–3:55.6: "Must the whole country stop selling? Article 6 says measures must fit the health situation of each area."

14. 3:56.0–4:07.0: The map as at the end of the previous shot, still (the outbreak region red). A large cream card (rounded corners, soft shadow) slides down into the upper part of the frame. Small teal uppercase label "Choice", the question in large bold text, then two option rows with numbered dark circles 1 and 2 (texts below). From 1.4 s to 4.4 s show the line "Pause the video and choose: 1 or 2?" with a 3, 2, 1 countdown in an orange ring. At 4.6 s option 2 turns green with a white check mark in a green circle; option 1 dims to half opacity.
   Card text: question "Foot-and-mouth disease in a far-off region. What should Aïcha’s country do?"; option 1 "Say nothing, to keep selling"; option 2 "Report it, control the zone, prove the rest is disease-free".
   Narration and captions:
  - 3:56.3–4:00.6: "What should Aïcha’s country do?"
  - 4:00.8–4:06.8: "Answer 2: report the outbreak, control the zone and prove the other areas are free."

15. 4:07.0–4:27.0: The same map. At 0.2 s a cream badge with a cow's head and "WOAH" appears at the top right, and an envelope flies to it from the red region. At 2.4 s a dashed teal circle closes around the red region and a teal pill replaces the red one at the top: "Zone under control". From 6.8 s a magnifying glass sweeps over the three other regions; each turns pale green with a green check (7.8 s, 9.1 s, 10.4 s), and a green pill "Disease-free" appears at the top left at 11 s. From 13.6 s a small refrigerated truck leaves the abattoir region and drives towards the border, which stays open; a green check pops over the buyers' country at 18.4 s.
   Narration and captions:
  - 4:07.3–4:14.0: "The outbreak is reported to WOAH and the zone is put under control."
  - 4:14.0–4:20.6: "With surveillance and checks, the country proves the other areas are free of the disease,"
  - 4:20.6–4:26.6: "and buyers can keep accepting meat from those areas."

16. 4:27.0–4:57.0: Diagram on a cream board (#FBF1DF) with a fine dot pattern, no logos. The frame is split by a faint dashed line. Left half: a wooden inspection table at a border post with two white meat crates, one marked with each invented flag, and a border officer in khaki uniform and cap standing beside it. At 1 s a stopwatch appears top left, its hand ticking briefly, with a cream pill "No undue delay"; from 3.2 s a magnifying glass passes over both crates and a green check pops above each (6.4 s, 6.9 s); at 8.4 s a green equals sign between them and a green pill "Same treatment". Right half, from 14 s: a cork notice board on which three documents are pinned one by one, a cream pill "Measures published" above it, then a cream badge with a globe and "WTO" at the top right and an envelope flying to it from the board (18 s). From 21.6 s a teal counter with a round teal "i" sign above it and a teal pill "SPS enquiry point"; a buyer in a blue shirt walks up from the right, a speech bubble with "?" appears over him at 24.8 s and turns into a green check at 27 s.
   Narration and captions:
  - 4:27.3–4:34.6: "Checks have rules too. Inspections must be carried out without undue delay,"
  - 4:34.6–4:41.0: "and imported products are treated no less favourably than local ones."
  - 4:41.0–4:48.8: "Rules must also be known: each country publishes its measures and notifies changes to the WTO,"
  - 4:48.8–4:56.6: "and runs an enquiry point that answers questions about them."

17. 4:57.0–5:02.2: Outside the abattoir building (same design, left). In front of it a small wooden pallet; Aïcha walks out to it and three white meat crates (teal band, small oval stamp) pop onto the pallet one by one. To the right are parked an open yellow pickup and a refrigerated truck (white insulated box with a big teal snowflake, teal cab).
   Narration and captions:
  - 4:57.3–5:02.0: "The meat is ready to leave for the city."

18. 5:02.2–5:10.2: undefined
   Card text: question "How should the meat travel to the city?"; option 1 "In an open pickup, in the sun"; option 2 "In a refrigerated truck".
   Narration and captions:
  - 5:02.5–5:10.2: "How should the meat travel to the city?"

19. 5:10.2–5:22.4: Continuing. From 0.3 s the three crates hop one by one into the back of the refrigerated truck; at 1.6 s a pale-teal pill with a snowflake appears above the truck: "Cold chain". From 2.2 s the truck drives off to the right, wheels turning, the pill following it. At 4.4 s crossfade to a city: a skyline of simple sand-coloured buildings with lit windows and a market stall with a striped awning on the right, where a buyer in a cream shirt waits facing left. The refrigerated truck drives in from the left and stops, the pill reappears above it. At 7 s a crate appears in front of the buyer, a magnifying glass sweeps over its stamp, a green check pops at 8.7 s, and at 9.3 s a green pill "Deal done" appears above the buyer, who waves.
   Narration and captions:
  - 5:10.5–5:15.5: "In a refrigerated truck, the cold chain is never broken."
  - 5:15.5–5:22.2: "Rules based on the same international standards make trade between countries easier."

20. 5:22.4–5:48.4: A calm room: warm cream wall, a window with pale blue panes, a light wooden floor. At 0.6 s a teal pill at the top: "WHO · Breast-milk Substitutes Code". On the left a mother in a purple wrapper dress and a yellow headwrap stands holding her baby, wrapped in a cream blanket, in her arms. At 9.2 s a billboard appears on the right showing a tin of infant formula and a megaphone; at 11.4 s a red cross stamps over it with a red pill "No advertising". At 13.4 s a gift box with a small tin on it appears near the mother; at 14.8 s a red cross over it and a red pill "No free samples". At 18 s both fade and a large formula tin appears on the right, its label carrying a red heart in a pale circle; at 20.2 s a green pill above it "Breastfeeding first" and at 21.2 s a green check.
   Narration and captions:
  - 5:22.7–5:31.8: "Another international text protects the youngest: the WHO International Code of Marketing of Breast-milk Substitutes."
  - 5:31.8–5:40.8: "It protects breastfeeding: these products should not be advertised to the public, and mothers should not get free samples."
  - 5:40.8–5:48.0: "And their labels should state that breastfeeding is best."

21. 5:48.4–7:00.4: Warm cream background (#F7E7C9) with a dot pattern and two very large, faint, slowly rocking question marks. 6 questions, 12 s each. Each fades in as a centred cream card: teal label "Quiz · 1/6" and so on, the question in large bold text, and three option rows with dark lettered circles A, B, C. At 5.2 s into each question the correct option turns green with a white check, the others stay, and a one-line explanation appears under the options. Each card fades out in its last 0.3 s.
   Question 1 (5:48.4): "Which organisation develops international animal health standards?" A "The Codex Alimentarius", B "WOAH", C "The WTO". Correct: B. Explanation: "WOAH develops animal health standards; the Codex develops food standards."
   Narration: "Which organisation develops international animal health standards?" at 5:48.7, then "WOAH develops animal health standards; the Codex develops food standards." at 5:53.8 (no captions in the quiz; the card carries the text).
   Question 2 (6:00.4): "Why respect the withdrawal period after a treatment?" A "To avoid medicine residues in the meat", B "So the animal puts on weight", C "To pay less tax". Correct: A. Explanation: "During this period, the body eliminates the medicine."
   Narration: "Why respect the withdrawal period after a treatment?" at 6:00.7, then "During this period, the body eliminates the medicine." at 6:05.8 (no captions in the quiz; the card carries the text).
   Question 3 (6:12.4): "Under the WTO SPS Agreement, a health measure must be…" A "Based on scientific evidence", B "Decided without justification", C "Reserved for neighbouring countries". Correct: A. Explanation: "It must rest on science and not restrict trade more than necessary."
   Narration: "Under the WTO SPS Agreement, a health measure must be…" at 6:12.7, then "It must rest on science and not restrict trade more than necessary." at 6:17.8 (no captions in the quiz; the card carries the text).
   Question 4 (6:24.4): "When must an importer accept different measures?" A "Never", B "If they reach its level of protection", C "Only if they are identical". Correct: B. Explanation: "That is equivalence (Article 4): different methods, the same protection."
   Narration: "When must an importer accept different measures?" at 6:24.7, then "That is equivalence (Article 4): different methods, the same protection." at 6:29.8 (no captions in the quiz; the card carries the text).
   Question 5 (6:36.4): "Disease in one region: what does Article 6 allow?" A "Selling on from disease-free areas", B "Hiding the outbreak", C "Closing every border". Correct: A. Explanation: "Measures fit each area, if the country proves it is disease-free."
   Narration: "Disease in one region: what does Article 6 allow?" at 6:36.7, then "Measures fit each area, if the country proves it is disease-free." at 6:41.8 (no captions in the quiz; the card carries the text).
   Question 6 (6:48.4): "Where can you ask about a country’s SPS measures?" A "At its SPS enquiry point", B "Nowhere: they are secret", C "Only at the border". Correct: A. Explanation: "Every WTO member has an enquiry point that answers questions."
   Narration: "Where can you ask about a country’s SPS measures?" at 6:48.7, then "Every WTO member has an enquiry point that answers questions." at 6:53.8 (no captions in the quiz; the card carries the text).

22. 7:00.4–7:10.4: Warm cream background (#F7E7C9) with a dot pattern. The title "Four principles" fades in at the top. Four cream cards with soft shadows pop up in sequence (0.6 s, 1.4 s, 2.2 s, 3.0 s), each with a terracotta number badge (1 to 4), a pastel circle with an icon and a bold label: 1 a microscope "Based on science"; 2 a small teal temple "Common standards"; 3 a green equals sign "Equivalence"; 4 a tiny map with one red and three green regions "Disease-free zones".
   Narration and captions:
  - 7:00.7–7:10.0: "Four principles to remember: science, common standards, equivalence and disease-free zones."

23. 7:10.4–7:19.4: Same cream background. The title "Three habits" fades in at the top. Three cream cards with soft shadows pop up in sequence (0.6 s, 1.5 s, 2.4 s), each with a terracotta number badge (1, 2, 3), a pastel circle with an icon and a bold two- or three-line text: 1 a teal syringe with a small clock, "Respect medicine withdrawal periods"; 2 a blue-violet oval inspection stamp with a check, "Inspection and hygiene at the abattoir"; 3 a small refrigerated truck with a snowflake, "Cold chain all the way to the buyer".
   Narration and captions:
  - 7:10.7–7:19.4: "Shared standards for safe meat and open markets."

24. 7:19.4–7:24.4: Dark brown background (#1E1712). Fade in, centred: small letter-spaced "Produced by" in muted beige, the Paruto Media logo in white below it (use the uploaded paruto-media-logo-white.svg; if no file is uploaded, set "PARUTO MEDIA" in white, wide letter-spacing), then a small grey line: "Demonstration sample · content to be validated by technical experts".

When it looks right, render it as an MP4 at 1080p.
```

## Portuguese (European)

```text
Create a 444.4-second animated explainer video in Portuguese (European), 1920×1080 (16:9), 25 fps, titled "O mercado de Aïcha". It is a public-awareness video for abattoir operators, meat traders and veterinary services in West Africa about the international standards behind safe meat trade: the WTO SPS Agreement (the right to protect health and its limits, risk assessment, harmonisation on the Codex Alimentarius, WOAH and IPPC standards, equivalence, disease-free zones, fair controls and transparency) and the WHO Code of Marketing of Breast-milk Substitutes.

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

1. 0:00.0–0:07.0: Dawn over the Sahel: sky gradient from #E7834A at the top to #F9D59C at the horizon, a large soft sun rising slowly, two flat acacia trees in dark olive silhouette, and five small dark-brown zebu cattle walking left to right along the horizon in a slow loop. From 0.8 s the title fades and slides up into the upper third: a small letter-spaced kicker "PARUTO MEDIA", the title "O mercado de Aïcha" (very large, extra bold, #2B1E16) and the subtitle "As normas internacionais que protegem a carne e abrem mercados" beneath it.
   Narration and captions:
  - 0:01.2–0:06.8: "O mercado de Aïcha: as normas internacionais que protegem a carne."

2. 0:07.0–0:18.6: Daytime savanna: warm sky (#F2C584 to #FCEFD8), sand hills (#E9C189), ochre ground (#E2A564). On the left a small cream abattoir building with a terracotta roof, two windows, an open door showing white tiles, and a teal sign on the roof reading "MATADOURO". Beside it a wooden pen with three zebu cattle. Aïcha walks out and stops right of the building: a West African woman in a long terracotta wrapper dress with yellow and teal bands and a teal headwrap. From 2.6 s two buyers in city clothes walk in from the right and stop facing her (one in a blue shirt and dark cap, one in a cream shirt). At 1.6 s a cream name tag pops above Aïcha: "Aïcha · pequeno matadouro". At 5.8 s a teal pill above the buyers: "Compradores da cidade"; at 7.2 s a cream speech bubble above it in terracotta text: "A carne é segura?". Everything gently idles.
   Narration and captions:
  - 0:07.4–0:13.9: "Aïcha dirige um pequeno matadouro. Compradores de uma grande cidade costeira querem a sua carne."
  - 0:13.9–0:18.4: "Mas pedem uma garantia: esta carne é segura?"

3. 0:18.6–0:42.6: Diagram on a cream board (#FBF1DF) with a fine dot pattern, no logos. Two rounded sand-coloured countries side by side, split by a dashed vertical border in the middle. Two invented flags tell the countries apart: Aïcha's is teal over gold with a small terracotta disc; the buyers' is split diagonally indigo and sand with a small cream dot. Never use a real flag. The left country holds Aïcha's small abattoir (cream building, terracotta roof, teal sign "MATADOURO") and its flag; the right one holds a small city skyline and its flag. From 1.2 s a white meat crate (teal band, oval stamp) slides from the abattoir to the border and stops. From 7.8 s four different rule cards pop in one by one around the border (white cards with coloured top bands: pale blue, tan, pale green, pink), each showing a big terracotta "?" or "!", and the crate jitters, stuck. At 15.6 s the cards fly together and vanish into one large cream card with a blue globe icon and "OMC" in bold indigo. From 18.6 s the crate slides across the border into the city; a green check pops at 21.8 s.
   Narration and captions:
  - 0:18.9–0:26.2: "A cidade fica num país vizinho, que fixa as suas próprias regras sanitárias para a carne que entra."
  - 0:26.2–0:33.6: "Se cada país inventasse as suas próprias regras, cada fronteira exigiria outra coisa."
  - 0:33.6–0:42.2: "Por isso, os países acordaram princípios comuns, na Organização Mundial do Comércio."

4. 0:42.6–0:56.6: Diagram on a cream board (#FBF1DF) with a fine dot pattern, no logos. At 0.4 s a teal pill at the top: "OMC · Acordo SPS". At 1 s a large teal shield with a cream check mark grows in the centre. Three round cream badges pop in a row below it, joined to the shield by dotted lines, each with a teal label: at 6.2 s a person's bust "Pessoas", at 8.4 s a cow's head "Animais", at 10.6 s a green seedling "Plantas".
   Narration and captions:
  - 0:42.9–0:48.0: "O Acordo SPS da OMC começa por um direito:"
  - 0:48.0–0:56.2: "cada país pode proteger a vida e a saúde das pessoas, dos animais e das plantas."

5. 0:56.6–1:22.6: Continuing on the same board. The three badges fade and the shield shrinks and rises under the pill. A dashed terracotta rounded frame appears around the lower half of the frame (the limits). Four cream cards pop into it in a row, each with a pastel circle, an icon and a bold label: at 0.6 s a microscope "Baseada na ciência"; at 7.6 s a small gauge with its needle in the green "Só o necessário"; at 13.4 s a balance carrying both invented flags at the same height "Sem discriminação"; at 20 s a striped barrier crossed out with a red circle "Sem barreira disfarçada".
   Narration and captions:
  - 0:56.9–1:04.0: "Mas este direito tem limites. Uma medida deve assentar em princípios e provas científicas."
  - 1:04.0–1:09.8: "Só se aplica na medida necessária para proteger a saúde."
  - 1:09.8–1:16.4: "Não deve discriminar entre países onde existam as mesmas condições."
  - 1:16.4–1:22.3: "E nunca deve servir de barreira disfarçada ao comércio."

6. 1:22.6–1:46.6: Diagram on a cream board (#FBF1DF) with a fine dot pattern, no logos. On the left the official veterinarian (white coat, teal cap, stethoscope, clipboard) stands and watches. At 0.5 s a teal pill "Avaliação do risco" appears at the top, and below it a large semicircular gauge (green, yellow, red) whose needle swings back and forth, then settles in the green at about 9 s. At 8.2 s, 10.6 s and 13 s three cream cards pop in a row, each with a pastel circle, an icon and a label: a microscope "Provas científicas"; a cow beside a small farm building "Criação e transformação"; a red virus "Doenças presentes". A magnifying glass moves over each card in turn. At 15.4 s the gauge and cards fade and a large brown balance scale appears: on the left pan a small teal shield with a pill "Proteção", on the right pan a meat crate with a pill "Comércio". The beam tips one way, then the other, and comes level at about 19.6 s; a green check pops above it at 20.4 s.
   Narration and captions:
  - 1:22.9–1:30.4: "Para escolher uma medida, um país avalia primeiro o risco, com os métodos das organizações internacionais."
  - 1:30.4–1:38.2: "Tem em conta as provas científicas, os métodos de criação e de transformação, e as doenças presentes."
  - 1:38.2–1:46.2: "Depois escolhe uma medida que protege o suficiente, sem restringir o comércio mais do que o necessário."

7. 1:46.6–2:04.2: Diagram on a cream board (#FBF1DF) with a fine dot pattern, no logos. At 0.4 s a teal temple roof (pediment and architrave, #1F7A6E) pops in with "OMC · Acordo SPS" in white on the architrave, and a stone base appears below. Under the roof, two small market stalls (terracotta awnings) with a dashed arc between them and a small cream crate travelling along it, looping, until 8.4 s when they fade. Then three cream pillars rise under the roof, one by one at 9.4 s, 11.9 s and 14.2 s, each with a coloured top band, a round icon, a bold name and a teal subtitle: "Codex Alimentarius" with a plate of meat, "Alimentos"; "OMSA" with a cow's head, "Saúde animal"; "CIPV" with a green leafy seedling, "Vegetais".
   Narration and captions:
  - 1:46.9–1:54.0: "Para aproximar as regras, o Acordo pede que as medidas se baseiem nas normas internacionais."
  - 1:54.0–2:04.0: "Três organizações elaboram-nas: o Codex Alimentarius para os alimentos, a OMSA para a saúde animal e a CIPV para as plantas."

8. 2:04.2–2:22.2: Diagram on a cream board (#FBF1DF) with a fine dot pattern, no logos. A light baseline across the lower frame and a dashed teal horizontal line at mid height: the international standard, marked on the left by a round badge with a small teal temple (pediment, three columns) and a pale-teal pill "Norma internacional" under it. From 0.9 s a teal bar topped by Aïcha's flag at its foot grows up to exactly the dashed line; a green check pops above it at 3 s and a green pill "Conforme ao Acordo" at 3.8 s. From 8.8 s an indigo bar with the buyers' flag grows higher than the line; a yellow "?" pops above it at 11.2 s. At 12.4 s a cream card with a microscope flies in from the right and settles beside it; at 14 s the "?" becomes a green check and an indigo pill appears at the top: "Mais estrita: justificada pela ciência".
   Narration and captions:
  - 2:04.5–2:12.6: "Uma medida conforme a estas normas presume-se necessária e conforme ao Acordo."
  - 2:12.6–2:21.8: "Um país pode proteger de forma mais estrita do que a norma, mas precisa de uma justificação científica."

9. 2:22.2–2:33.2: Aïcha's abattoir scene again, idle, with the buyers standing on the right. A pale-teal pill with a syringe icon sits over the cattle in the pen: "Tratada ontem". A large cream card (rounded corners, soft shadow) slides down into the upper part of the frame. Small teal uppercase label "Escolha", the question in large bold text, then two option rows with numbered dark circles 1 and 2 (texts below). From 1.4 s to 4.4 s show the line "Pause o vídeo e escolha: 1 ou 2?" with a 3, 2, 1 countdown in an orange ring. At 4.6 s option 2 turns green with a white check mark in a green circle; option 1 dims to half opacity.
   Card text: question "Uma vaca recebeu um antibiótico ontem. O que faz Aïcha?"; option 1 "Abatê-la hoje para a vender depressa"; option 2 "Esperar pelo fim do intervalo de segurança do medicamento".
   Narration and captions:
  - 2:22.5–2:26.8: "Uma vaca recebeu um antibiótico ontem. O que faz Aïcha?"
  - 2:27.0–2:33.0: "Resposta 2: respeita-se o intervalo de segurança para evitar resíduos na carne."

10. 2:33.2–2:50.0: Inside the abattoir: walls of small white tiles, a pale grey-green floor. On the left a metal-railed pen with two zebu cattle; on the right a steel rail near the ceiling with three stylised carcasses hanging from hooks (simple rounded shapes in muted pink with cream fat edges and a few rib lines; clean and not gory). The official veterinarian (white coat, teal cap, stethoscope, clipboard) stands by the pen facing the cattle, arm raised as if examining; green check marks pop above each animal at 1.6 s and 2.9 s. From 4.8 s he walks to the carcasses and, at 6.4 s, 8.0 s and 9.6 s, raises his arm and a blue-violet oval inspection stamp with a check slams onto each carcass. At 9.9 s a pale-violet pill appears at the top: "Inspecionado". From 11 s: a cream pill "Instalações limpas" with small white sparkles twinkling on the floor; at 12.2 s a wall tap drips water and a pill "Água potável" appears; at 13 s a worker in a white apron, white cap and white boots appears with a pill "Roupa de trabalho".
   Narration and captions:
  - 2:33.5–2:38.0: "Antes do abate, o veterinário inspeciona os animais vivos."
  - 2:38.0–2:43.8: "Depois do abate, inspeciona cada carcaça e aplica o carimbo de inspeção."
  - 2:43.8–2:49.8: "Instalações limpas, água potável, roupa de trabalho: a higiene protege o consumidor."

11. 2:50.0–3:14.0: Diagram on a cream board (#FBF1DF) with a fine dot pattern, no logos. Two invented flags tell the countries apart: Aïcha's is teal over gold with a small terracotta disc; the buyers' is split diagonally indigo and sand with a small cream dot. Never use a real flag. Two large cream panels side by side, each with its flag in the top-left corner and a label at the bottom. Left panel (Aïcha's country): a hanging carcass, stylised and not gory; at 2.6 s a blue-violet oval inspection stamp with a check slams onto it; label "Inspeção e carimbo". Right panel (the buyers' country): a rack of three test tubes that fill with teal liquid from 3.6 s, then a green check; label "Análises laboratoriais". At 5.4 s a cream circle with a terracotta not-equal sign (≠) pops between the panels. At 7 s a dashed teal line with a small shield appears across the top, with a pale-teal pill "Mesmo nível de proteção"; at 8.4 s and 9.2 s a short teal arrow grows from the top of each panel up to the line. At 15.6 s the ≠ turns into a green circle with a white equals sign, and at 16.6 s a green pill "Equivalente" appears below the panels.
   Narration and captions:
  - 2:50.3–2:56.8: "O país dos compradores não controla a carne exatamente como o de Aïcha."
  - 2:56.8–3:04.4: "Segundo o artigo 4.º, o importador deve aceitar medidas diferentes como equivalentes,"
  - 3:04.4–3:13.6: "se o país exportador demonstrar objetivamente que atingem o nível de proteção do importador."

12. 3:14.0–3:38.0: Continuing with both panels. From 0.6 s three white documents arc one after another from the left panel to the right one. From 4 s a magnifying glass travels from the right panel to the left one and hovers over the stamped carcass; a green check pops at 6.6 s. At 8.2 s a cream speech bubble with a terracotta "?" appears over the left panel; at 11.4 s a calendar showing "6" appears at the top right with a cream pill "Resposta em 6 meses". At 15.4 s these fade, the green pill below the panels fades, and a dashed road appears along the bottom; from 16 s a small refrigerated truck (white box with a teal snowflake, teal cab) drives steadily from left to right along it with a green pill "O comércio continua" riding above it.
   Narration and captions:
  - 3:14.3–3:22.0: "O exportador fornece os dados científicos e técnicos, e dá acesso a inspeções e testes."
  - 3:22.0–3:29.8: "A pedido, o importador explica o risco visado pela sua medida, e responde normalmente no prazo de seis meses."
  - 3:29.8–3:37.6: "Entretanto, o comércio em curso continua: um pedido não é razão para o interromper."

13. 3:38.0–3:56.0: Diagram on a cream board (#FBF1DF) with a fine dot pattern, no logos. Two invented flags tell the countries apart: Aïcha's is teal over gold with a small terracotta disc; the buyers' is split diagonally indigo and sand with a small cream dot. Never use a real flag. A simple invented map: Aïcha's country divided into four sand-coloured regions by thin cream borders, with a small zebu in three of them, her abattoir and flag in the bottom-left region; on the right, separated by a border barrier (a striped pole, raised), the buyers' country with a small city skyline and its flag. At 2.6 s a red virus pops in the top-right region, which turns salmon red, and a red pill appears at the top: "Febre aftosa". From 8.6 s a red dashed outline pulses around the whole country and a cream speech bubble with a terracotta "?" pops over the buyers' country, both gone by 12.4 s. From 12.6 s each region's outline flashes teal in turn.
   Narration and captions:
  - 3:38.3–3:46.0: "Numa manhã, é detetada febre aftosa numa região longe da de Aïcha."
  - 3:46.0–3:55.6: "Todo o país tem de parar de vender? O artigo 6.º pede que as medidas se adaptem à situação sanitária de cada zona."

14. 3:56.0–4:07.0: The map as at the end of the previous shot, still (the outbreak region red). A large cream card (rounded corners, soft shadow) slides down into the upper part of the frame. Small teal uppercase label "Escolha", the question in large bold text, then two option rows with numbered dark circles 1 and 2 (texts below). From 1.4 s to 4.4 s show the line "Pause o vídeo e escolha: 1 ou 2?" with a 3, 2, 1 countdown in an orange ring. At 4.6 s option 2 turns green with a white check mark in a green circle; option 1 dims to half opacity.
   Card text: question "Febre aftosa numa região distante. O que deve fazer o país de Aïcha?"; option 1 "Não dizer nada, para continuar a vender"; option 2 "Declarar o foco, controlar a zona, provar que o resto está indemne".
   Narration and captions:
  - 3:56.3–4:00.6: "O que deve fazer o país de Aïcha?"
  - 4:00.8–4:06.8: "Resposta 2: declarar o foco, controlar a zona e provar que as outras zonas estão indemnes."

15. 4:07.0–4:27.0: The same map. At 0.2 s a cream badge with a cow's head and "OMSA" appears at the top right, and an envelope flies to it from the red region. At 2.4 s a dashed teal circle closes around the red region and a teal pill replaces the red one at the top: "Zona sob controlo". From 6.8 s a magnifying glass sweeps over the three other regions; each turns pale green with a green check (7.8 s, 9.1 s, 10.4 s), and a green pill "Indemne" appears at the top left at 11 s. From 13.6 s a small refrigerated truck leaves the abattoir region and drives towards the border, which stays open; a green check pops over the buyers' country at 18.4 s.
   Narration and captions:
  - 4:07.3–4:14.0: "O foco é declarado à OMSA e a zona é colocada sob controlo."
  - 4:14.0–4:20.6: "Com vigilância e controlos, o país prova que as outras zonas estão livres da doença,"
  - 4:20.6–4:26.6: "e os compradores podem continuar a aceitar a carne dessas zonas."

16. 4:27.0–4:57.0: Diagram on a cream board (#FBF1DF) with a fine dot pattern, no logos. The frame is split by a faint dashed line. Left half: a wooden inspection table at a border post with two white meat crates, one marked with each invented flag, and a border officer in khaki uniform and cap standing beside it. At 1 s a stopwatch appears top left, its hand ticking briefly, with a cream pill "Sem atrasos injustificados"; from 3.2 s a magnifying glass passes over both crates and a green check pops above each (6.4 s, 6.9 s); at 8.4 s a green equals sign between them and a green pill "Mesmo tratamento". Right half, from 14 s: a cork notice board on which three documents are pinned one by one, a cream pill "Medidas publicadas" above it, then a cream badge with a globe and "OMC" at the top right and an envelope flying to it from the board (18 s). From 21.6 s a teal counter with a round teal "i" sign above it and a teal pill "Ponto de informação SPS"; a buyer in a blue shirt walks up from the right, a speech bubble with "?" appears over him at 24.8 s and turns into a green check at 27 s.
   Narration and captions:
  - 4:27.3–4:34.6: "Os controlos também têm regras. As inspeções fazem-se sem atrasos injustificados,"
  - 4:34.6–4:41.0: "e os produtos importados não são tratados pior do que os produtos locais."
  - 4:41.0–4:48.8: "As regras também devem ser conhecidas: cada país publica as suas medidas e notifica as alterações à OMC,"
  - 4:48.8–4:56.6: "e mantém um ponto de informação que responde a perguntas sobre essas medidas."

17. 4:57.0–5:02.2: Outside the abattoir building (same design, left). In front of it a small wooden pallet; Aïcha walks out to it and three white meat crates (teal band, small oval stamp) pop onto the pallet one by one. To the right are parked an open yellow pickup and a refrigerated truck (white insulated box with a big teal snowflake, teal cab).
   Narration and captions:
  - 4:57.3–5:02.0: "A carne está pronta para partir para a cidade."

18. 5:02.2–5:10.2: undefined
   Card text: question "Como transportar a carne até à cidade?"; option 1 "Numa carrinha aberta, ao sol"; option 2 "Num camião frigorífico".
   Narration and captions:
  - 5:02.5–5:10.2: "Como transportar a carne até à cidade?"

19. 5:10.2–5:22.4: Continuing. From 0.3 s the three crates hop one by one into the back of the refrigerated truck; at 1.6 s a pale-teal pill with a snowflake appears above the truck: "Cadeia de frio". From 2.2 s the truck drives off to the right, wheels turning, the pill following it. At 4.4 s crossfade to a city: a skyline of simple sand-coloured buildings with lit windows and a market stall with a striped awning on the right, where a buyer in a cream shirt waits facing left. The refrigerated truck drives in from the left and stops, the pill reappears above it. At 7 s a crate appears in front of the buyer, a magnifying glass sweeps over its stamp, a green check pops at 8.7 s, and at 9.3 s a green pill "Negócio fechado" appears above the buyer, who waves.
   Narration and captions:
  - 5:10.5–5:15.5: "Num camião frigorífico, a cadeia de frio nunca é interrompida."
  - 5:15.5–5:22.2: "Regras baseadas nas mesmas normas internacionais facilitam o comércio entre países."

20. 5:22.4–5:48.4: A calm room: warm cream wall, a window with pale blue panes, a light wooden floor. At 0.6 s a teal pill at the top: "OMS · Código dos substitutos do leite materno". On the left a mother in a purple wrapper dress and a yellow headwrap stands holding her baby, wrapped in a cream blanket, in her arms. At 9.2 s a billboard appears on the right showing a tin of infant formula and a megaphone; at 11.4 s a red cross stamps over it with a red pill "Sem publicidade". At 13.4 s a gift box with a small tin on it appears near the mother; at 14.8 s a red cross over it and a red pill "Sem amostras grátis". At 18 s both fade and a large formula tin appears on the right, its label carrying a red heart in a pale circle; at 20.2 s a green pill above it "Aleitamento primeiro" and at 21.2 s a green check.
   Narration and captions:
  - 5:22.7–5:31.8: "Outro texto internacional protege os mais pequenos: o Código Internacional de Comercialização de Substitutos do Leite Materno, da OMS."
  - 5:31.8–5:40.8: "Protege o aleitamento: estes produtos não devem ser publicitados ao público, nem dadas amostras grátis às mães."
  - 5:40.8–5:48.0: "E os rótulos devem lembrar a superioridade do aleitamento materno."

21. 5:48.4–7:00.4: Warm cream background (#F7E7C9) with a dot pattern and two very large, faint, slowly rocking question marks. 6 questions, 12 s each. Each fades in as a centred cream card: teal label "Quiz · 1/6" and so on, the question in large bold text, and three option rows with dark lettered circles A, B, C. At 5.2 s into each question the correct option turns green with a white check, the others stay, and a one-line explanation appears under the options. Each card fades out in its last 0.3 s.
   Question 1 (5:48.4): "Que organização elabora as normas internacionais de saúde animal?" A "O Codex Alimentarius", B "A OMSA", C "A OMC". Correct: B. Explanation: "A OMSA elabora as normas de saúde animal; o Codex, as dos alimentos."
   Narration: "Que organização elabora as normas internacionais de saúde animal?" at 5:48.7, then "A OMSA elabora as normas de saúde animal; o Codex, as dos alimentos." at 5:53.8 (no captions in the quiz; the card carries the text).
   Question 2 (6:00.4): "Porque se respeita o intervalo de segurança depois de um tratamento?" A "Para evitar resíduos de medicamentos na carne", B "Para o animal engordar", C "Para pagar menos impostos". Correct: A. Explanation: "Durante este intervalo, o organismo elimina o medicamento."
   Narration: "Porque se respeita o intervalo de segurança depois de um tratamento?" at 6:00.7, then "Durante este intervalo, o organismo elimina o medicamento." at 6:05.8 (no captions in the quiz; the card carries the text).
   Question 3 (6:12.4): "Segundo o Acordo SPS da OMC, uma medida sanitária deve ser…" A "Baseada em provas científicas", B "Decidida sem justificação", C "Reservada aos países vizinhos". Correct: A. Explanation: "Deve assentar na ciência e não restringir o comércio mais do que o necessário."
   Narration: "Segundo o Acordo SPS da OMC, uma medida sanitária deve ser…" at 6:12.7, then "Deve assentar na ciência e não restringir o comércio mais do que o necessário." at 6:17.8 (no captions in the quiz; the card carries the text).
   Question 4 (6:24.4): "Quando deve o importador aceitar medidas diferentes?" A "Nunca", B "Se atingirem o seu nível de proteção", C "Só se forem idênticas". Correct: B. Explanation: "É a equivalência (artigo 4.º): métodos diferentes, a mesma proteção."
   Narration: "Quando deve o importador aceitar medidas diferentes?" at 6:24.7, then "É a equivalência (artigo 4.º): métodos diferentes, a mesma proteção." at 6:29.8 (no captions in the quiz; the card carries the text).
   Question 5 (6:36.4): "Doença numa região: o que permite o artigo 6.º?" A "Continuar a vender a partir das zonas indemnes", B "Esconder o foco", C "Fechar todas as fronteiras". Correct: A. Explanation: "As medidas adaptam-se a cada zona, se o país provar que está indemne."
   Narration: "Doença numa região: o que permite o artigo 6.º?" at 6:36.7, then "As medidas adaptam-se a cada zona, se o país provar que está indemne." at 6:41.8 (no captions in the quiz; the card carries the text).
   Question 6 (6:48.4): "Onde perguntar sobre as medidas SPS de um país?" A "No seu ponto de informação SPS", B "Em lado nenhum: são secretas", C "Só na fronteira". Correct: A. Explanation: "Cada membro da OMC tem um ponto de informação que responde a perguntas."
   Narration: "Onde perguntar sobre as medidas SPS de um país?" at 6:48.7, then "Cada membro da OMC tem um ponto de informação que responde a perguntas." at 6:53.8 (no captions in the quiz; the card carries the text).

22. 7:00.4–7:10.4: Warm cream background (#F7E7C9) with a dot pattern. The title "Quatro princípios" fades in at the top. Four cream cards with soft shadows pop up in sequence (0.6 s, 1.4 s, 2.2 s, 3.0 s), each with a terracotta number badge (1 to 4), a pastel circle with an icon and a bold label: 1 a microscope "Baseado na ciência"; 2 a small teal temple "Normas comuns"; 3 a green equals sign "Equivalência"; 4 a tiny map with one red and three green regions "Zonas indemnes".
   Narration and captions:
  - 7:00.7–7:10.0: "Quatro princípios a reter: a ciência, normas comuns, a equivalência e as zonas indemnes."

23. 7:10.4–7:19.4: Same cream background. The title "Três reflexos" fades in at the top. Three cream cards with soft shadows pop up in sequence (0.6 s, 1.5 s, 2.4 s), each with a terracotta number badge (1, 2, 3), a pastel circle with an icon and a bold two- or three-line text: 1 a teal syringe with a small clock, "Respeitar o intervalo de segurança"; 2 a blue-violet oval inspection stamp with a check, "Inspeção e higiene no matadouro"; 3 a small refrigerated truck with a snowflake, "Cadeia de frio até ao cliente".
   Narration and captions:
  - 7:10.7–7:19.4: "Normas comuns para uma carne segura e mercados abertos."

24. 7:19.4–7:24.4: Dark brown background (#1E1712). Fade in, centred: small letter-spaced "Uma produção" in muted beige, the Paruto Media logo in white below it (use the uploaded paruto-media-logo-white.svg; if no file is uploaded, set "PARUTO MEDIA" in white, wide letter-spacing), then a small grey line: "Amostra de demonstração · conteúdo a validar por peritos técnicos".

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

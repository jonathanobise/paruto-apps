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

Total length: 131.4 s (2:11.4).

## French

```text
Create a 131.4-second animated explainer video in French, 1920×1080 (16:9), 25 fps, titled "Le marché d’Aïcha". It is a public-awareness video for abattoir operators, meat traders and veterinary services in West Africa about the international standards behind safe meat trade: the WTO SPS Agreement and its three references, the Codex Alimentarius, WOAH and the IPPC.

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

3. 0:18.6–0:36.2: Diagram on a cream board (#FBF1DF) with a fine dot pattern, no logos. At 0.4 s a teal temple roof (pediment and architrave, #1F7A6E) pops in with "OMC · Accord SPS" in white on the architrave, and a stone base appears below. Under the roof, two small market stalls (terracotta awnings) with a dashed arc between them and a small cream crate travelling along it, looping, until 8.4 s when they fade. Then three cream pillars rise under the roof, one by one at 9.4 s, 11.9 s and 14.2 s, each with a coloured top band, a round icon, a bold name and a teal subtitle: "Codex Alimentarius" with a plate of meat, "Aliments"; "OMSA" with a cow's head, "Santé animale"; "CIPV" with a green leafy seedling, "Végétaux".
   Narration and captions:
  - 0:18.9–0:26.0: "Pour le commerce, l’OMC a un accord sur les mesures sanitaires et phytosanitaires : l’Accord SPS."
  - 0:26.0–0:36.0: "Il s’appuie sur trois références : le Codex Alimentarius pour les aliments, l’OMSA pour la santé animale et la CIPV pour les végétaux."

4. 0:36.2–0:47.2: Aïcha's abattoir scene again, idle, with the buyers standing on the right. A pale-teal pill with a syringe icon sits over the cattle in the pen: "Traitée hier". A large cream card (rounded corners, soft shadow) slides down into the upper part of the frame. Small teal uppercase label "Choix", the question in large bold text, then two option rows with numbered dark circles 1 and 2 (texts below). From 1.4 s to 4.4 s show the line "Mettez la vidéo en pause et choisissez : 1 ou 2 ?" with a 3, 2, 1 countdown in an orange ring. At 4.6 s option 2 turns green with a white check mark in a green circle; option 1 dims to half opacity.
   Card text: question "Une vache a reçu un antibiotique hier. Que fait Aïcha ?"; option 1 "L’abattre aujourd’hui pour la vendre vite"; option 2 "Attendre la fin du délai d’attente du médicament".
   Narration and captions:
  - 0:36.5–0:40.8: "Une vache a reçu un antibiotique hier. Que fait Aïcha ?"
  - 0:41.0–0:47.0: "Réponse 2 : on respecte le délai d’attente pour éviter des résidus dans la viande."

5. 0:47.2–1:04.0: Inside the abattoir: walls of small white tiles, a pale grey-green floor. On the left a metal-railed pen with two zebu cattle; on the right a steel rail near the ceiling with three stylised carcasses hanging from hooks (simple rounded shapes in muted pink with cream fat edges and a few rib lines; clean and not gory). The official veterinarian (white coat, teal cap, stethoscope, clipboard) stands by the pen facing the cattle, arm raised as if examining; green check marks pop above each animal at 1.6 s and 2.9 s. From 4.8 s he walks to the carcasses and, at 6.4 s, 8.0 s and 9.6 s, raises his arm and a blue-violet oval inspection stamp with a check slams onto each carcass. At 9.9 s a pale-violet pill appears at the top: "Inspecté". From 11 s: a cream pill "Locaux propres" with small white sparkles twinkling on the floor; at 12.2 s a wall tap drips water and a pill "Eau potable" appears; at 13 s a worker in a white apron, white cap and white boots appears with a pill "Tenue de travail".
   Narration and captions:
  - 0:47.5–0:52.0: "Avant l’abattage, le vétérinaire inspecte les animaux vivants."
  - 0:52.0–0:57.8: "Après l’abattage, il inspecte chaque carcasse et appose le cachet d’inspection."
  - 0:57.8–1:03.8: "Locaux propres, eau potable, tenues de travail : l’hygiène protège le consommateur."

6. 1:04.0–1:09.2: Outside the abattoir building (same design, left). In front of it a small wooden pallet; Aïcha walks out to it and three white meat crates (teal band, small oval stamp) pop onto the pallet one by one. To the right are parked an open yellow pickup and a refrigerated truck (white insulated box with a big teal snowflake, teal cab).
   Narration and captions:
  - 1:04.3–1:09.0: "La viande est prête à partir vers la ville."

7. 1:09.2–1:21.4: Continuing. From 0.3 s the three crates hop one by one into the back of the refrigerated truck; at 1.6 s a pale-teal pill with a snowflake appears above the truck: "Chaîne du froid". From 2.2 s the truck drives off to the right, wheels turning, the pill following it. At 4.4 s crossfade to a city: a skyline of simple sand-coloured buildings with lit windows and a market stall with a striped awning on the right, where a buyer in a cream shirt waits facing left. The refrigerated truck drives in from the left and stops, the pill reappears above it. At 7 s a crate appears in front of the buyer, a magnifying glass sweeps over its stamp, a green check pops at 8.7 s, and at 9.3 s a green pill "Marché conclu" appears above the buyer, who waves.
   Narration and captions:
  - 1:09.5–1:14.5: "Dans un camion réfrigéré, la chaîne du froid n’est jamais rompue."
  - 1:14.5–1:21.2: "Des règles fondées sur les mêmes normes internationales facilitent le commerce entre pays."

8. 1:21.4–1:57.4: Warm cream background (#F7E7C9) with a dot pattern and two very large, faint, slowly rocking question marks. Three questions, 12 s each. Each fades in as a centred cream card: teal label "Quiz · 1/3" (2/3, 3/3), the question in large bold text, and three option rows with dark lettered circles A, B, C. At 5.2 s into each question the correct option turns green with a white check, the others stay, and a one-line explanation appears under the options. Each card fades out in its last 0.3 s.
   Question 1 (1:21.4): "Quelle organisation élabore les normes internationales de santé animale ?" A "Le Codex Alimentarius", B "L’OMSA", C "L’OMC". Correct: B. Explanation: "L’OMSA élabore les normes de santé animale ; le Codex, celles des aliments."
   Narration: "Quelle organisation élabore les normes internationales de santé animale ?" at 1:21.7, then "L’OMSA élabore les normes de santé animale ; le Codex, celles des aliments." at 1:26.8 (no captions in the quiz; the card carries the text).
   Question 2 (1:33.4): "Pourquoi respecter le délai d’attente après un traitement ?" A "Pour éviter des résidus de médicaments dans la viande", B "Pour que l’animal grossisse", C "Pour payer moins de taxes". Correct: A. Explanation: "Pendant ce délai, l’organisme élimine le médicament."
   Narration: "Pourquoi respecter le délai d’attente après un traitement ?" at 1:33.7, then "Pendant ce délai, l’organisme élimine le médicament." at 1:38.8 (no captions in the quiz; the card carries the text).
   Question 3 (1:45.4): "Selon l’Accord SPS de l’OMC, une mesure sanitaire doit être…" A "Fondée sur des preuves scientifiques", B "Décidée sans justification", C "Réservée aux pays voisins". Correct: A. Explanation: "Elle doit reposer sur la science et ne pas restreindre le commerce plus que nécessaire."
   Narration: "Selon l’Accord SPS de l’OMC, une mesure sanitaire doit être…" at 1:45.7, then "Elle doit reposer sur la science et ne pas restreindre le commerce plus que nécessaire." at 1:50.8 (no captions in the quiz; the card carries the text).

9. 1:57.4–2:06.4: Same cream background. The title "Trois réflexes" fades in at the top. Three cream cards with soft shadows pop up in sequence (0.6 s, 1.5 s, 2.4 s), each with a terracotta number badge (1, 2, 3), a pastel circle with an icon and a bold two- or three-line text: 1 a teal syringe with a small clock, "Respecter le délai d’attente des médicaments"; 2 a blue-violet oval inspection stamp with a check, "Inspection et hygiène à l’abattoir"; 3 a small refrigerated truck with a snowflake, "Chaîne du froid jusqu’au client".
   Narration and captions:
  - 1:57.7–2:06.4: "Des normes communes pour une viande saine et des marchés ouverts."

10. 2:06.4–2:11.4: Dark brown background (#1E1712). Fade in, centred: small letter-spaced "Une production" in muted beige, the Paruto Media logo in white below it (use the uploaded paruto-media-logo-white.svg; if no file is uploaded, set "PARUTO MEDIA" in white, wide letter-spacing), then a small grey line: "Échantillon de démonstration · contenu à valider par les experts techniques".

When it looks right, render it as an MP4 at 1080p.
```

## English

```text
Create a 131.4-second animated explainer video in English, 1920×1080 (16:9), 25 fps, titled "Aïcha’s Market". It is a public-awareness video for abattoir operators, meat traders and veterinary services in West Africa about the international standards behind safe meat trade: the WTO SPS Agreement and its three references, the Codex Alimentarius, WOAH and the IPPC.

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

3. 0:18.6–0:36.2: Diagram on a cream board (#FBF1DF) with a fine dot pattern, no logos. At 0.4 s a teal temple roof (pediment and architrave, #1F7A6E) pops in with "WTO · SPS Agreement" in white on the architrave, and a stone base appears below. Under the roof, two small market stalls (terracotta awnings) with a dashed arc between them and a small cream crate travelling along it, looping, until 8.4 s when they fade. Then three cream pillars rise under the roof, one by one at 9.4 s, 11.9 s and 14.2 s, each with a coloured top band, a round icon, a bold name and a teal subtitle: "Codex Alimentarius" with a plate of meat, "Food"; "WOAH" with a cow's head, "Animal health"; "IPPC" with a green leafy seedling, "Plants".
   Narration and captions:
  - 0:18.9–0:26.0: "For trade, the WTO has an agreement on sanitary and phytosanitary measures: the SPS Agreement."
  - 0:26.0–0:36.0: "It relies on three references: the Codex Alimentarius for food, WOAH for animal health and the IPPC for plants."

4. 0:36.2–0:47.2: Aïcha's abattoir scene again, idle, with the buyers standing on the right. A pale-teal pill with a syringe icon sits over the cattle in the pen: "Treated yesterday". A large cream card (rounded corners, soft shadow) slides down into the upper part of the frame. Small teal uppercase label "Choice", the question in large bold text, then two option rows with numbered dark circles 1 and 2 (texts below). From 1.4 s to 4.4 s show the line "Pause the video and choose: 1 or 2?" with a 3, 2, 1 countdown in an orange ring. At 4.6 s option 2 turns green with a white check mark in a green circle; option 1 dims to half opacity.
   Card text: question "A cow was given an antibiotic yesterday. What does Aïcha do?"; option 1 "Slaughter it today to sell it quickly"; option 2 "Wait until the medicine’s withdrawal period is over".
   Narration and captions:
  - 0:36.5–0:40.8: "A cow was given an antibiotic yesterday. What does Aïcha do?"
  - 0:41.0–0:47.0: "Answer 2: respect the withdrawal period to avoid residues in the meat."

5. 0:47.2–1:04.0: Inside the abattoir: walls of small white tiles, a pale grey-green floor. On the left a metal-railed pen with two zebu cattle; on the right a steel rail near the ceiling with three stylised carcasses hanging from hooks (simple rounded shapes in muted pink with cream fat edges and a few rib lines; clean and not gory). The official veterinarian (white coat, teal cap, stethoscope, clipboard) stands by the pen facing the cattle, arm raised as if examining; green check marks pop above each animal at 1.6 s and 2.9 s. From 4.8 s he walks to the carcasses and, at 6.4 s, 8.0 s and 9.6 s, raises his arm and a blue-violet oval inspection stamp with a check slams onto each carcass. At 9.9 s a pale-violet pill appears at the top: "Inspected". From 11 s: a cream pill "Clean premises" with small white sparkles twinkling on the floor; at 12.2 s a wall tap drips water and a pill "Clean water" appears; at 13 s a worker in a white apron, white cap and white boots appears with a pill "Work clothes".
   Narration and captions:
  - 0:47.5–0:52.0: "Before slaughter, the veterinarian inspects the live animals."
  - 0:52.0–0:57.8: "After slaughter, he inspects each carcass and applies the inspection stamp."
  - 0:57.8–1:03.8: "Clean premises, clean water, work clothes: hygiene protects the consumer."

6. 1:04.0–1:09.2: Outside the abattoir building (same design, left). In front of it a small wooden pallet; Aïcha walks out to it and three white meat crates (teal band, small oval stamp) pop onto the pallet one by one. To the right are parked an open yellow pickup and a refrigerated truck (white insulated box with a big teal snowflake, teal cab).
   Narration and captions:
  - 1:04.3–1:09.0: "The meat is ready to leave for the city."

7. 1:09.2–1:21.4: Continuing. From 0.3 s the three crates hop one by one into the back of the refrigerated truck; at 1.6 s a pale-teal pill with a snowflake appears above the truck: "Cold chain". From 2.2 s the truck drives off to the right, wheels turning, the pill following it. At 4.4 s crossfade to a city: a skyline of simple sand-coloured buildings with lit windows and a market stall with a striped awning on the right, where a buyer in a cream shirt waits facing left. The refrigerated truck drives in from the left and stops, the pill reappears above it. At 7 s a crate appears in front of the buyer, a magnifying glass sweeps over its stamp, a green check pops at 8.7 s, and at 9.3 s a green pill "Deal done" appears above the buyer, who waves.
   Narration and captions:
  - 1:09.5–1:14.5: "In a refrigerated truck, the cold chain is never broken."
  - 1:14.5–1:21.2: "Rules based on the same international standards make trade between countries easier."

8. 1:21.4–1:57.4: Warm cream background (#F7E7C9) with a dot pattern and two very large, faint, slowly rocking question marks. Three questions, 12 s each. Each fades in as a centred cream card: teal label "Quiz · 1/3" (2/3, 3/3), the question in large bold text, and three option rows with dark lettered circles A, B, C. At 5.2 s into each question the correct option turns green with a white check, the others stay, and a one-line explanation appears under the options. Each card fades out in its last 0.3 s.
   Question 1 (1:21.4): "Which organisation develops international animal health standards?" A "The Codex Alimentarius", B "WOAH", C "The WTO". Correct: B. Explanation: "WOAH develops animal health standards; the Codex develops food standards."
   Narration: "Which organisation develops international animal health standards?" at 1:21.7, then "WOAH develops animal health standards; the Codex develops food standards." at 1:26.8 (no captions in the quiz; the card carries the text).
   Question 2 (1:33.4): "Why respect the withdrawal period after a treatment?" A "To avoid medicine residues in the meat", B "So the animal puts on weight", C "To pay less tax". Correct: A. Explanation: "During this period, the body eliminates the medicine."
   Narration: "Why respect the withdrawal period after a treatment?" at 1:33.7, then "During this period, the body eliminates the medicine." at 1:38.8 (no captions in the quiz; the card carries the text).
   Question 3 (1:45.4): "Under the WTO SPS Agreement, a health measure must be…" A "Based on scientific evidence", B "Decided without justification", C "Reserved for neighbouring countries". Correct: A. Explanation: "It must rest on science and not restrict trade more than necessary."
   Narration: "Under the WTO SPS Agreement, a health measure must be…" at 1:45.7, then "It must rest on science and not restrict trade more than necessary." at 1:50.8 (no captions in the quiz; the card carries the text).

9. 1:57.4–2:06.4: Same cream background. The title "Three habits" fades in at the top. Three cream cards with soft shadows pop up in sequence (0.6 s, 1.5 s, 2.4 s), each with a terracotta number badge (1, 2, 3), a pastel circle with an icon and a bold two- or three-line text: 1 a teal syringe with a small clock, "Respect medicine withdrawal periods"; 2 a blue-violet oval inspection stamp with a check, "Inspection and hygiene at the abattoir"; 3 a small refrigerated truck with a snowflake, "Cold chain all the way to the buyer".
   Narration and captions:
  - 1:57.7–2:06.4: "Shared standards for safe meat and open markets."

10. 2:06.4–2:11.4: Dark brown background (#1E1712). Fade in, centred: small letter-spaced "Produced by" in muted beige, the Paruto Media logo in white below it (use the uploaded paruto-media-logo-white.svg; if no file is uploaded, set "PARUTO MEDIA" in white, wide letter-spacing), then a small grey line: "Demonstration sample · content to be validated by technical experts".

When it looks right, render it as an MP4 at 1080p.
```

## Portuguese (European)

```text
Create a 131.4-second animated explainer video in Portuguese (European), 1920×1080 (16:9), 25 fps, titled "O mercado de Aïcha". It is a public-awareness video for abattoir operators, meat traders and veterinary services in West Africa about the international standards behind safe meat trade: the WTO SPS Agreement and its three references, the Codex Alimentarius, WOAH and the IPPC.

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

3. 0:18.6–0:36.2: Diagram on a cream board (#FBF1DF) with a fine dot pattern, no logos. At 0.4 s a teal temple roof (pediment and architrave, #1F7A6E) pops in with "OMC · Acordo SPS" in white on the architrave, and a stone base appears below. Under the roof, two small market stalls (terracotta awnings) with a dashed arc between them and a small cream crate travelling along it, looping, until 8.4 s when they fade. Then three cream pillars rise under the roof, one by one at 9.4 s, 11.9 s and 14.2 s, each with a coloured top band, a round icon, a bold name and a teal subtitle: "Codex Alimentarius" with a plate of meat, "Alimentos"; "OMSA" with a cow's head, "Saúde animal"; "CIPV" with a green leafy seedling, "Vegetais".
   Narration and captions:
  - 0:18.9–0:26.0: "Para o comércio, a OMC tem um acordo sobre medidas sanitárias e fitossanitárias: o Acordo SPS."
  - 0:26.0–0:36.0: "Apoia-se em três referências: o Codex Alimentarius para os alimentos, a OMSA para a saúde animal e a CIPV para os vegetais."

4. 0:36.2–0:47.2: Aïcha's abattoir scene again, idle, with the buyers standing on the right. A pale-teal pill with a syringe icon sits over the cattle in the pen: "Tratada ontem". A large cream card (rounded corners, soft shadow) slides down into the upper part of the frame. Small teal uppercase label "Escolha", the question in large bold text, then two option rows with numbered dark circles 1 and 2 (texts below). From 1.4 s to 4.4 s show the line "Pause o vídeo e escolha: 1 ou 2?" with a 3, 2, 1 countdown in an orange ring. At 4.6 s option 2 turns green with a white check mark in a green circle; option 1 dims to half opacity.
   Card text: question "Uma vaca recebeu um antibiótico ontem. O que faz Aïcha?"; option 1 "Abatê-la hoje para a vender depressa"; option 2 "Esperar pelo fim do intervalo de segurança do medicamento".
   Narration and captions:
  - 0:36.5–0:40.8: "Uma vaca recebeu um antibiótico ontem. O que faz Aïcha?"
  - 0:41.0–0:47.0: "Resposta 2: respeita-se o intervalo de segurança para evitar resíduos na carne."

5. 0:47.2–1:04.0: Inside the abattoir: walls of small white tiles, a pale grey-green floor. On the left a metal-railed pen with two zebu cattle; on the right a steel rail near the ceiling with three stylised carcasses hanging from hooks (simple rounded shapes in muted pink with cream fat edges and a few rib lines; clean and not gory). The official veterinarian (white coat, teal cap, stethoscope, clipboard) stands by the pen facing the cattle, arm raised as if examining; green check marks pop above each animal at 1.6 s and 2.9 s. From 4.8 s he walks to the carcasses and, at 6.4 s, 8.0 s and 9.6 s, raises his arm and a blue-violet oval inspection stamp with a check slams onto each carcass. At 9.9 s a pale-violet pill appears at the top: "Inspecionado". From 11 s: a cream pill "Instalações limpas" with small white sparkles twinkling on the floor; at 12.2 s a wall tap drips water and a pill "Água potável" appears; at 13 s a worker in a white apron, white cap and white boots appears with a pill "Roupa de trabalho".
   Narration and captions:
  - 0:47.5–0:52.0: "Antes do abate, o veterinário inspeciona os animais vivos."
  - 0:52.0–0:57.8: "Depois do abate, inspeciona cada carcaça e aplica o carimbo de inspeção."
  - 0:57.8–1:03.8: "Instalações limpas, água potável, roupa de trabalho: a higiene protege o consumidor."

6. 1:04.0–1:09.2: Outside the abattoir building (same design, left). In front of it a small wooden pallet; Aïcha walks out to it and three white meat crates (teal band, small oval stamp) pop onto the pallet one by one. To the right are parked an open yellow pickup and a refrigerated truck (white insulated box with a big teal snowflake, teal cab).
   Narration and captions:
  - 1:04.3–1:09.0: "A carne está pronta para partir para a cidade."

7. 1:09.2–1:21.4: Continuing. From 0.3 s the three crates hop one by one into the back of the refrigerated truck; at 1.6 s a pale-teal pill with a snowflake appears above the truck: "Cadeia de frio". From 2.2 s the truck drives off to the right, wheels turning, the pill following it. At 4.4 s crossfade to a city: a skyline of simple sand-coloured buildings with lit windows and a market stall with a striped awning on the right, where a buyer in a cream shirt waits facing left. The refrigerated truck drives in from the left and stops, the pill reappears above it. At 7 s a crate appears in front of the buyer, a magnifying glass sweeps over its stamp, a green check pops at 8.7 s, and at 9.3 s a green pill "Negócio fechado" appears above the buyer, who waves.
   Narration and captions:
  - 1:09.5–1:14.5: "Num camião frigorífico, a cadeia de frio nunca é interrompida."
  - 1:14.5–1:21.2: "Regras baseadas nas mesmas normas internacionais facilitam o comércio entre países."

8. 1:21.4–1:57.4: Warm cream background (#F7E7C9) with a dot pattern and two very large, faint, slowly rocking question marks. Three questions, 12 s each. Each fades in as a centred cream card: teal label "Quiz · 1/3" (2/3, 3/3), the question in large bold text, and three option rows with dark lettered circles A, B, C. At 5.2 s into each question the correct option turns green with a white check, the others stay, and a one-line explanation appears under the options. Each card fades out in its last 0.3 s.
   Question 1 (1:21.4): "Que organização elabora as normas internacionais de saúde animal?" A "O Codex Alimentarius", B "A OMSA", C "A OMC". Correct: B. Explanation: "A OMSA elabora as normas de saúde animal; o Codex, as dos alimentos."
   Narration: "Que organização elabora as normas internacionais de saúde animal?" at 1:21.7, then "A OMSA elabora as normas de saúde animal; o Codex, as dos alimentos." at 1:26.8 (no captions in the quiz; the card carries the text).
   Question 2 (1:33.4): "Porque se respeita o intervalo de segurança depois de um tratamento?" A "Para evitar resíduos de medicamentos na carne", B "Para o animal engordar", C "Para pagar menos impostos". Correct: A. Explanation: "Durante este intervalo, o organismo elimina o medicamento."
   Narration: "Porque se respeita o intervalo de segurança depois de um tratamento?" at 1:33.7, then "Durante este intervalo, o organismo elimina o medicamento." at 1:38.8 (no captions in the quiz; the card carries the text).
   Question 3 (1:45.4): "Segundo o Acordo SPS da OMC, uma medida sanitária deve ser…" A "Baseada em provas científicas", B "Decidida sem justificação", C "Reservada aos países vizinhos". Correct: A. Explanation: "Deve assentar na ciência e não restringir o comércio mais do que o necessário."
   Narration: "Segundo o Acordo SPS da OMC, uma medida sanitária deve ser…" at 1:45.7, then "Deve assentar na ciência e não restringir o comércio mais do que o necessário." at 1:50.8 (no captions in the quiz; the card carries the text).

9. 1:57.4–2:06.4: Same cream background. The title "Três reflexos" fades in at the top. Three cream cards with soft shadows pop up in sequence (0.6 s, 1.5 s, 2.4 s), each with a terracotta number badge (1, 2, 3), a pastel circle with an icon and a bold two- or three-line text: 1 a teal syringe with a small clock, "Respeitar o intervalo de segurança"; 2 a blue-violet oval inspection stamp with a check, "Inspeção e higiene no matadouro"; 3 a small refrigerated truck with a snowflake, "Cadeia de frio até ao cliente".
   Narration and captions:
  - 1:57.7–2:06.4: "Normas comuns para uma carne segura e mercados abertos."

10. 2:06.4–2:11.4: Dark brown background (#1E1712). Fade in, centred: small letter-spaced "Uma produção" in muted beige, the Paruto Media logo in white below it (use the uploaded paruto-media-logo-white.svg; if no file is uploaded, set "PARUTO MEDIA" in white, wide letter-spacing), then a small grey line: "Amostra de demonstração · conteúdo a validar por peritos técnicos".

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

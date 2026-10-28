// Writes hyperframes-prompts.md: one self-contained HyperFrames (HeyGen) prompt per language
// for the linear cut of Moussa's Journey, built from script.js and timeline.js so the words
// and timings always match the sample.   node tools/hyperframes-prompts.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const window = {};
for (const f of ['script.js', 'timeline.js']) new Function('window', fs.readFileSync(path.join(dir, f), 'utf8'))(window);
const S = window.SPS_SCRIPT, T = window.SPS_TIMELINE;
const NAMES = { fr: 'French', en: 'English', pt: 'Portuguese (European)' };

const mmss = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
const starts = {}; let acc = 0;
for (const id of T.linear) { starts[id] = acc; acc += T.segments[id].dur; }
const total = acc;
const span = (id) => `${mmss(starts[id])}–${mmss(starts[id] + T.segments[id].dur)}`;

const scenes = (u) => ({
  title: `Dawn over the Sahel: sky gradient from #E7834A at the top to #F9D59C at the horizon, a large soft sun rising slowly, two flat acacia trees in dark olive silhouette, and five small dark-brown zebu cattle walking left to right along the horizon in a slow loop. From 0.8 s the title fades and slides up into the upper third: a small letter-spaced kicker "PARUTO MEDIA", the title "${u.title}" (very large, extra bold, #2B1E16) and the subtitle "${u.subtitle}" beneath it.`,
  meet: `Daytime savanna: warm sky (#F2C584 to #FCEFD8), soft sand hills (#E9C189), ochre ground (#E2A564) with darker foreground (#D6934F), two green acacias and two small market stalls far right. Moussa walks in from the left and stops left of centre: a West African livestock trader in a long indigo boubou (#2E3A87), cream turban and a wooden staff. Six zebu cattle (white, tan and dark brown, with humps and lyre-shaped horns) walk in from the left in two rows and settle in the centre. At 3.6 s a cream speech-bubble name tag pops above Moussa: "${u.nameTag}". At 5.6 s a teal pill badge with a small cattle icon pops above the herd: "${u.herd}".`,
  diseases: `Abstract map board, not a real map: cream background (#FBF1DF) with a fine dot pattern. Five round town markers (cream circles with a small terracotta house icon) pop in, linked by six curved sand-coloured routes that draw on one after another. Tiny cattle walk along the routes continuously. From 3 s, red spiky virus icons appear riding with three of the animals and pulse; the routes those animals travel turn red as they go. From 4.6 s three cream pill labels with a red dot slide in at top left, one by one: "${u.diseases[0]}", "${u.diseases[1]}", "${u.diseases[2]}". No country borders, names or flags.`,
  choice1: `The savanna from the previous scene, herd and Moussa idle (the name tag and badge are gone). A large cream card (rounded corners, soft shadow) slides down into the upper half. Small teal uppercase label "${u.chapters[2]}", the question in large bold text, then two option rows with numbered dark circles: 1 and 2 (texts below). From 1.4 s to 4.4 s show the line "${u.pauseHint}" with a 3, 2, 1 countdown in an orange ring. At 4.6 s option 2 turns green with a white check mark in a green circle; option 1 dims to half opacity.`,
  vet: `Same savanna, five cattle standing still, Moussa on the left. The official veterinarian walks in from the left: white coat, teal cap, teal trousers, stethoscope, clipboard. He stops in front of each front cow in turn (about 2.0 s, 3.6 s, 5.2 s), arm raised as if examining, and a green circle with a white check pops above each cow (2.4 s, 4.0 s, 5.6 s). At 3.0 s a pale-teal pill with a syringe icon pops: "${u.vaccine}". At 6.0 s a certificate card bounces in at upper right: cream paper, teal header reading "${u.cert}", grey text lines drawing on one by one, three small dots and "× 40", then at 7.3 s a red round stamp with a check slams on (scale from big to normal, tilted), and at 7.7 s a blue handwritten signature draws on. At 10.4 s the certificate shrinks and flies into Moussa's hand.`,
  borderArrive: `A border post on a dusty road: on the right a small cream building with a terracotta roof and a window, a teal sign on the roof reading "${u.border}", a flagpole with a plain teal-and-yellow flag (not any real country's flag), and a red-and-white striped barrier arm lowered across the road from a dark post. A veterinary border officer in a khaki uniform and peaked cap stands to the right of the barrier, facing left. Moussa and the herd walk in from the left and stop in front of the barrier.`,
  borderCross: `Continuing the border scene. At 0.1 s the certificate (same design, now with the red stamp and signature) pops up between Moussa and the officer; Moussa holds his arm out to hand it over. From 0.7 s to 1.9 s a magnifying glass sweeps across it. At 2.0 s a green rectangular stamp "${u.valid}" slams onto the certificate, then the certificate fades. From 2.6 s to 3.6 s the barrier arm swings up. From 3.4 s Moussa and the herd walk through and out of frame to the right while the officer waves.`,
  quiz: `Warm cream background (#F7E7C9) with a dot pattern and two very large, faint, slowly rocking question marks. Three questions, ${T.quizLinear.each} s each. Each fades in as a centred cream card: teal label "${u.quiz} · 1/3" (2/3, 3/3), the question in large bold text, and three option rows with dark lettered circles A, B, C. At ${T.quizLinear.reveal} s into each question the correct option turns green with a white check, the others stay, and a one-line explanation appears under the options. Each card fades out in its last 0.3 s.`,
  recap: `Same cream background. The title "${u.recapTitle}" fades in at the top. Three cream cards with soft shadows pop up in sequence (0.6 s, 1.5 s, 2.4 s), each with a terracotta number badge (1, 2, 3), a pastel circle with an icon and a bold two- or three-line text: 1 a teal syringe, "${u.recap[0]}"; 2 a certificate with a teal header and red stamp, "${u.recap[1]}"; 3 a raised striped barrier with a green check, "${u.recap[2]}".`,
  end: `Dark brown background (#1E1712). Fade in, centred: small letter-spaced "${u.endBy}" in muted beige, the Paruto Media logo in white below it (use the uploaded paruto-media-logo-white.svg; if no file is uploaded, set "PARUTO MEDIA" in white, wide letter-spacing), then a small grey line: "${u.endLine}".`,
});

function prompt(lang) {
  const u = S.ui[lang], sc = scenes(u), L = (o) => o[lang];
  const narr = (id) => (S.captions[id] || []).filter((c) => c.a < T.segments[id].dur)
    .map((c) => `  - ${mmss(starts[id] + c.a)}–${mmss(starts[id] + Math.min(c.b, T.segments[id].dur))}: "${L(c)}"`);
  const out = [];
  out.push(`Create a ${total.toFixed(1)}-second animated explainer video in ${NAMES[lang]}, 1920×1080 (16:9), 25 fps, titled "${u.title}". It is a public-awareness video for livestock traders, herders and border officials in West Africa about animal health rules (sanitary standards) in the cross-border livestock trade.`);
  out.push(`
STYLE (use this instead of any preset brand look)
- Flat 2D vector illustration, warm Sahel palette, gentle motion design: characters walk with a light bob and leg swing, animals breathe and flick their tails, cards pop in with a slight overshoot. No photos, no 3D, no stock footage.
- Colours: ink #2B1E16, cream #FFF6E6, sand #E2A564, hills #E9C189, indigo #2E3A87, teal #1F7A6E, terracotta #C4572E, alert red #D64534, success green #2E9E5B, acacia green #6E8B3D.
- Typeface: Inter (bold or extra bold for titles, semibold for UI text).
- People are West African and drawn with dignity and warmth, simple faces in three-quarter view.
- Do not use any real logo, emblem or flag (no ECOWAS, WAEMU, ARAA or national flags) and no real map.
- Burned-in captions: centred near the bottom, white semibold text about 4% of frame height on a dark brown translucent rounded pill (rgba(24,16,10,0.8)), shown exactly at the narration times below.
- Use every on-screen text and narration line exactly as written. Do not add facts, figures, regulation names or claims.

VOICE-OVER
- A warm, calm, clear narrator in ${NAMES[lang]}, unhurried, speaking each line at its start time. If voice-over isn't available, keep the captions and leave the audio silent; studio narration will be added later. No music.

SCENES (each range is from the start of the video; times inside a scene's description count from that scene's start; narration times are from the start of the video)`);
  const order = T.linear;
  order.forEach((id, n) => {
    out.push(`\n${n + 1}. ${span(id)}: ${sc[id]}`);
    if (id === 'choice1') {
      const c = S.choices.choice1;
      out.push(`   Card text: question "${L(c.q)}"; option 1 "${L(c.options[0])}"; option 2 "${L(c.options[1])}".`);
    }
    if (id === 'quiz') S.quiz.forEach((q, i) => {
      out.push(`   Question ${i + 1} (${mmss(starts.quiz + i * T.quizLinear.each)}): "${L(q.q)}" A "${L(q.options[0])}", B "${L(q.options[1])}", C "${L(q.options[2])}". Correct: ${'ABC'[q.options.findIndex((o) => o.correct)]}. Explanation: "${L(q.why)}"`);
      out.push(`   Narration: "${L(q.q)}" at ${mmss(starts.quiz + i * T.quizLinear.each + 0.3)}, then "${L(q.why)}" at ${mmss(starts.quiz + i * T.quizLinear.each + T.quizLinear.reveal + 0.2)} (no captions in the quiz; the card carries the text).`);
    });
    const nl = narr(id);
    if (nl.length) out.push(`   Narration and captions:\n${nl.join('\n')}`);
  });
  out.push(`\nWhen it looks right, render it as an MP4 at 1080p.`);
  return out.join('\n');
}

const md = [];
md.push(`# HyperFrames prompts: Moussa's Journey

Prompts for HeyGen HyperFrames to produce the linear (WhatsApp) cut of the SPS awareness sample,
one per language. They match the words and timings in \`script.js\` and \`timeline.js\`. Regenerate
this file after changing those: \`node tools/hyperframes-prompts.mjs\`.

**How to use.** In a claude.ai chat with the **HyperFrames by HeyGen** connector turned on, attach
\`paruto-media-logo-white.svg\` and paste one prompt. Claude composes a HyperFrames project and
replies with a link to it in the HeyGen app; ask it to render once you're happy. Run each language
as its own project. Composing is blocked inside Claude Code, so use the claude.ai app (web or
desktop) for this.

**What HyperFrames can't do here.** The output is a linear video, so the choices and quiz are shown
with their answers revealed. The interactive version (viewers pick answers, wrong choices show the
consequence, quiz score) stays in this folder's \`index.html\` player and the H5P package.

Total length: ${total.toFixed(1)} s (${mmss(total)}).
`);
for (const lang of ['fr', 'en', 'pt']) md.push(`\n## ${NAMES[lang]}\n\n\`\`\`text\n${prompt(lang)}\n\`\`\`\n`);
md.push(`
## Follow-up prompts

Send these in the same chat after the first version, so they edit that project.

**Vertical cut for WhatsApp Status and phones**

\`\`\`text
Make a 1080×1920 (9:16) version of this video with the same timing, text and narration. Re-frame each scene for portrait: keep characters and the herd in the lower half, move cards, chips and the certificate into the upper half, stack the three recap cards vertically, and set captions about 12% above the bottom edge so phone controls don't cover them. Then render it as an MP4.
\`\`\`

**Lighter file for low-bandwidth sharing**

\`\`\`text
Render this video as an MP4 at 720p (1280×720), H.264, aiming for under 10 MB, keeping the captions sharp.
\`\`\`

**Swap in the studio voice later**

\`\`\`text
Replace the narration with the uploaded studio recordings: one audio file per line, named like the clips in our vo/ folder (title-0, meet-0, meet-1, …). Start each one at the time listed in the original prompt and keep everything else unchanged.
\`\`\`
`);
fs.writeFileSync(path.join(dir, 'hyperframes-prompts.md'), md.join(''));
console.log('wrote hyperframes-prompts.md', `${total.toFixed(1)}s`);

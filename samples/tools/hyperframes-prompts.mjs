// Writes videos/<module>/hyperframes-prompts.md: one self-contained HyperFrames (HeyGen) prompt per
// language for the module's linear cut, built from its script.js, timeline.js and hyperframes.mjs
// (the scene direction), so the words and timings always match the sample.
//   node tools/hyperframes-prompts.mjs <module>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const mod = process.argv[2];
const dir = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'videos', mod);
const { about, scenes } = await import(path.join(dir, 'hyperframes.mjs'));
const window = {};
for (const f of ['script.js', 'timeline.js']) new Function('window', fs.readFileSync(path.join(dir, f), 'utf8'))(window);
const S = window.SPS_SCRIPT, T = window.SPS_TIMELINE;
const NAMES = { fr: 'French', en: 'English', pt: 'Portuguese (European)' };

const mmss = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
const starts = {}; let acc = 0;
for (const id of T.linear) { starts[id] = acc; acc += T.segments[id].dur; }
const total = acc;
const span = (id) => `${mmss(starts[id])}–${mmss(starts[id] + T.segments[id].dur)}`;


function prompt(lang) {
  const u = S.ui[lang], sc = scenes(u, T), L = (o) => o[lang];
  const narr = (id) => (S.captions[id] || []).filter((c) => c.a < T.segments[id].dur)
    .map((c) => `  - ${mmss(starts[id] + c.a)}–${mmss(starts[id] + Math.min(c.b, T.segments[id].dur))}: "${L(c)}"`);
  const out = [];
  out.push(`Create a ${total.toFixed(1)}-second animated explainer video in ${NAMES[lang]}, 1920×1080 (16:9), 25 fps, titled "${u.title}". ${about}`);
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
    if (T.segments[id].kind === 'choice') {
      const c = S.choices[id];
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
md.push(`# HyperFrames prompts: ${S.ui.en.title}

Prompts for HeyGen HyperFrames to produce the linear (WhatsApp) cut of this SPS awareness module,
one per language. They match the words and timings in \`script.js\` and \`timeline.js\`. Regenerate
this file after changing those: \`node tools/hyperframes-prompts.mjs <module>\`.

**How to use.** In a claude.ai chat with the **HyperFrames by HeyGen** connector turned on, attach
\`shared/paruto-media-logo-white.svg\` and paste one prompt. Claude composes a HyperFrames project and
replies with a link to it in the HeyGen app; ask it to render once you're happy. Run each language
as its own project. Composing is blocked inside Claude Code, so use the claude.ai app (web or
desktop) for this.

**What HyperFrames can't do here.** The output is a linear video, so the choices and quiz are shown
with their answers revealed. The interactive version (viewers pick answers, wrong choices show the
consequence, quiz score) stays in this module's \`index.html\` player.

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
console.log(`wrote videos/${mod}/hyperframes-prompts.md`, `${total.toFixed(1)}s`);

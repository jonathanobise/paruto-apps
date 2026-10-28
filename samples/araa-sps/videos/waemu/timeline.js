// Segments of the WAEMU story. The interactive player follows `next` and the viewer's choices;
// the linear (WhatsApp) version plays `linear` straight through with the right answers shown.
window.SPS_TIMELINE = {
  slug: 'koffi', // file names: koffi-fr.mp4, koffi-fr.srt …
  segments: {
    title: { scene: 'title', dur: 7, ch: 0, next: 'meet' },
    meet: { scene: 'market', dur: 11, ch: 0, next: 'chain' },
    chain: { scene: 'chain', dur: 15.6, ch: 1, next: 'choice1' },
    choice1: { scene: 'offer', kind: 'choice', dur: 13.2, ch: 2 },
    blocked1: { scene: 'sick', variant: 1, dur: 10.9, ch: 2, back: 'choice1' },
    trace: { scene: 'abattoir', dur: 15.5, ch: 3, next: 'alertArrive' },
    alertArrive: { scene: 'alert', dur: 6, ch: 4, next: 'choice2' },
    choice2: { scene: 'alert', hold: 6, kind: 'choice', dur: 8, ch: 4 },
    blocked2: { scene: 'sick', variant: 2, dur: 7.7, ch: 4, back: 'choice2' },
    alertResolve: { scene: 'alert', offset: 6, dur: 12.7, ch: 4, next: 'quiz' },
    quiz: { scene: 'quizbg', kind: 'quiz', dur: 30, ch: 5, next: 'recap' },
    recap: { scene: 'recap', dur: 9, ch: 6, next: 'end' },
    end: { scene: 'end', dur: 5, ch: 6 },
  },
  linear: ['title', 'meet', 'chain', 'choice1', 'trace', 'alertArrive', 'alertResolve', 'quiz', 'recap', 'end'],
  chapterStart: ['title', 'chain', 'choice1', 'trace', 'alertArrive', 'quiz', 'recap'],
  // linear choice timing (seconds inside the segment)
  choiceLinear: { in: 3.6, countFrom: 4.6, reveal: 7.8 },
  quizLinear: { each: 10, reveal: 4.3 },
};

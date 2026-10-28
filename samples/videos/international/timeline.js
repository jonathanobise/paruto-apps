// Segments of the story. The interactive player follows `next` and the viewer's choices;
// the linear (WhatsApp) version plays `linear` straight through with the right answers shown.
window.SPS_TIMELINE = {
  slug: 'aicha', // file names: aicha-fr.mp4, aicha-fr.srt …
  segments: {
    title: { scene: 'title', dur: 7, ch: 0, next: 'meet' },
    meet: { scene: 'unit', dur: 11.6, ch: 0, next: 'standards' },
    standards: { scene: 'standards', dur: 17.6, ch: 1, next: 'choice1' },
    choice1: { scene: 'unit', hold: 13, kind: 'choice', dur: 11, ch: 2 },
    blocked1: { scene: 'lab', dur: 10, ch: 2, back: 'choice1' },
    hygiene: { scene: 'hygiene', dur: 16.8, ch: 3, next: 'transportArrive' },
    transportArrive: { scene: 'yard', dur: 5.2, ch: 4, next: 'choice2' },
    choice2: { scene: 'yard', hold: 5, kind: 'choice', dur: 8, ch: 4 },
    blocked2: { scene: 'heat', dur: 7.2, ch: 4, back: 'choice2' },
    transportGo: { scene: 'yard', offset: 5, dur: 12.2, ch: 4, next: 'quiz' },
    quiz: { scene: 'quizbg', kind: 'quiz', dur: 36, ch: 5, next: 'recap' },
    recap: { scene: 'recap', dur: 9, ch: 6, next: 'end' },
    end: { scene: 'end', dur: 5, ch: 6 },
  },
  linear: ['title', 'meet', 'standards', 'choice1', 'hygiene', 'transportArrive', 'transportGo', 'quiz', 'recap', 'end'],
  chapterStart: ['title', 'standards', 'choice1', 'hygiene', 'transportArrive', 'quiz', 'recap'],
  // linear choice timing (seconds inside the segment)
  choiceLinear: { in: 0.2, countFrom: 1.4, reveal: 4.6 },
  quizLinear: { each: 12, reveal: 5.2 },
};

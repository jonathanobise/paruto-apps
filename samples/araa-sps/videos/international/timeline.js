// Segments of the story. The interactive player follows `next` and the viewer's choices;
// the linear (WhatsApp) version plays `linear` straight through with the right answers shown.
// Full-length module (about 7.5 minutes), as ARAA's clarification bulletin n°1 asks.
window.SPS_TIMELINE = {
  slug: 'aicha', // file names: aicha-fr.mp4, aicha-fr.srt …
  segments: {
    title: { scene: 'title', dur: 7, ch: 0, next: 'meet' },
    meet: { scene: 'unit', dur: 11.6, ch: 0, next: 'why' },
    why: { scene: 'countries', dur: 24, ch: 0, next: 'right' },
    right: { scene: 'rights', dur: 14, ch: 1, next: 'limits' },
    limits: { scene: 'rights', offset: 14, dur: 26, ch: 1, next: 'risk' },
    risk: { scene: 'risk', dur: 24, ch: 1, next: 'standards' },
    standards: { scene: 'standards', dur: 17.6, ch: 2, next: 'harmonize' },
    harmonize: { scene: 'bar', dur: 18, ch: 2, next: 'choice1' },
    choice1: { scene: 'unit', hold: 13, kind: 'choice', dur: 11, ch: 2 },
    blocked1: { scene: 'lab', dur: 10, ch: 2, back: 'choice1' },
    hygiene: { scene: 'hygiene', dur: 16.8, ch: 3, next: 'equiv' },
    equiv: { scene: 'equiv', dur: 24, ch: 4, next: 'equiv2' },
    equiv2: { scene: 'equiv', offset: 24, dur: 24, ch: 4, next: 'zones' },
    zones: { scene: 'zones', dur: 18, ch: 5, next: 'choice3' },
    choice3: { scene: 'zones', hold: 17.9, kind: 'choice', dur: 11, ch: 5 },
    blocked3: { scene: 'zones', offset: 18, variant: 'hidden', dur: 10, ch: 5, back: 'choice3' },
    zonesGo: { scene: 'zones', offset: 18, dur: 20, ch: 5, next: 'checks' },
    checks: { scene: 'checks', dur: 30, ch: 6, next: 'transportArrive' },
    transportArrive: { scene: 'yard', dur: 5.2, ch: 7, next: 'choice2' },
    choice2: { scene: 'yard', hold: 5, kind: 'choice', dur: 8, ch: 7 },
    blocked2: { scene: 'heat', dur: 7.2, ch: 7, back: 'choice2' },
    transportGo: { scene: 'yard', offset: 5, dur: 12.2, ch: 7, next: 'infant' },
    infant: { scene: 'infant', dur: 26, ch: 8, next: 'quiz' },
    quiz: { scene: 'quizbg', kind: 'quiz', dur: 72, ch: 9, next: 'rules' },
    rules: { scene: 'rules', dur: 10, ch: 10, next: 'recap' },
    recap: { scene: 'recap', dur: 9, ch: 10, next: 'end' },
    end: { scene: 'end', dur: 5, ch: 10 },
  },
  linear: ['title', 'meet', 'why', 'right', 'limits', 'risk', 'standards', 'harmonize', 'choice1', 'hygiene', 'equiv', 'equiv2',
    'zones', 'choice3', 'zonesGo', 'checks', 'transportArrive', 'choice2', 'transportGo', 'infant', 'quiz', 'rules', 'recap', 'end'],
  chapterStart: ['title', 'right', 'standards', 'hygiene', 'equiv', 'zones', 'checks', 'transportArrive', 'infant', 'quiz', 'rules'],
  // linear choice timing (seconds inside the segment)
  choiceLinear: { in: 0.2, countFrom: 1.4, reveal: 4.6 },
  quizLinear: { each: 12, reveal: 5.2 },
};

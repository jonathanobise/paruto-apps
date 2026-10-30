// Segments of the story. The interactive player follows `next` and the viewer's choices;
// the linear (WhatsApp) version plays `linear` straight through with the right answers shown.
// Full-length module (about 7 minutes), as ARAA's clarification bulletin n°1 asks; the rules
// follow Regulation C/REG.21/11/10 (articles in the comments of script.js).
window.SPS_TIMELINE = {
  slug: 'moussa', // file names: moussa-fr.mp4, moussa-fr.srt …
  segments: {
    title: { scene: 'title', dur: 7, ch: 0, next: 'meet' },
    meet: { scene: 'village', dur: 9.5, ch: 0, next: 'diseases' },
    diseases: { scene: 'map', dur: 9, ch: 1, next: 'why' },
    why: { scene: 'ecomap', variant: 'region', dur: 22, ch: 1, next: 'principles' },
    principles: { scene: 'principles', dur: 26, ch: 1, next: 'freeMove' },
    freeMove: { scene: 'ecomap', variant: 'free', dur: 22, ch: 1, next: 'actors' },
    actors: { scene: 'actors', dur: 28, ch: 2, next: 'choice1' },
    choice1: { scene: 'village', hold: 9, kind: 'choice', dur: 9.3, ch: 3 },
    blocked1: { scene: 'blocked', variant: 1, dur: 9.4, ch: 3, back: 'choice1' },
    vet: { scene: 'vet', dur: 16.6, ch: 4, next: 'borderArrive' },
    borderArrive: { scene: 'border', dur: 6, ch: 5, next: 'choice2' },
    choice2: { scene: 'border', hold: 6, kind: 'choice', dur: 8, ch: 5 },
    blocked2: { scene: 'blocked', variant: 2, dur: 7.5, ch: 5, back: 'choice2' },
    borderCross: { scene: 'border', offset: 6, dur: 12.2, ch: 5, next: 'borderRules' },
    borderRules: { scene: 'ecomap', variant: 'posts', dur: 20, ch: 5, next: 'transhumance' },
    transhumance: { scene: 'ecomap', variant: 'trans', dur: 22, ch: 6, next: 'alert' },
    alert: { scene: 'ecomap', variant: 'outbreak', dur: 18, ch: 7, next: 'choice3' },
    choice3: { scene: 'ecomap', variant: 'outbreak', hold: 17.9, kind: 'choice', dur: 11, ch: 7 },
    blocked3: { scene: 'ecomap', variant: 'outbreakBad', offset: 18, dur: 10, ch: 7, back: 'choice3' },
    alertGo: { scene: 'ecomap', variant: 'outbreak', offset: 18, dur: 26, ch: 7, next: 'products' },
    products: { scene: 'ecomap', variant: 'products', dur: 22, ch: 8, next: 'operators' },
    operators: { scene: 'operators', dur: 24, ch: 8, next: 'outreach' },
    outreach: { scene: 'outreach', dur: 16, ch: 8, next: 'quiz' },
    quiz: { scene: 'quizbg', kind: 'quiz', dur: 72, ch: 9, next: 'rules' },
    rules: { scene: 'rules', dur: 10, ch: 10, next: 'recap' },
    recap: { scene: 'recap', dur: 9, ch: 10, next: 'end' },
    end: { scene: 'end', dur: 5, ch: 10 },
  },
  linear: ['title', 'meet', 'diseases', 'why', 'principles', 'freeMove', 'actors', 'choice1', 'vet', 'borderArrive', 'borderCross', 'borderRules',
    'transhumance', 'alert', 'choice3', 'alertGo', 'products', 'operators', 'outreach', 'quiz', 'rules', 'recap', 'end'],
  chapterStart: ['title', 'diseases', 'actors', 'choice1', 'vet', 'borderArrive', 'transhumance', 'alert', 'products', 'quiz', 'rules'],
  // linear choice timing (seconds inside the segment)
  choiceLinear: { in: 0.2, countFrom: 1.4, reveal: 4.6 },
  quizLinear: { each: 12, reveal: 5.2 },
};

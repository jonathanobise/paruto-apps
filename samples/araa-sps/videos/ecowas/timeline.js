// Segments of the story. The interactive player follows `next` and the viewer's choices;
// the linear (WhatsApp) version plays `linear` straight through with the right answers shown.
window.SPS_TIMELINE = {
  slug: 'moussa', // file names: moussa-fr.mp4, moussa-fr.srt …
  segments: {
    title: { scene: 'title', dur: 7, ch: 0, next: 'meet' },
    meet: { scene: 'village', dur: 9.5, ch: 0, next: 'diseases' },
    diseases: { scene: 'map', dur: 9, ch: 1, next: 'choice1' },
    choice1: { scene: 'village', hold: 9, kind: 'choice', dur: 9.3, ch: 2 },
    blocked1: { scene: 'blocked', variant: 1, dur: 9.4, ch: 2, back: 'choice1' },
    vet: { scene: 'vet', dur: 15.6, ch: 3, next: 'borderArrive' },
    borderArrive: { scene: 'border', dur: 6, ch: 4, next: 'choice2' },
    choice2: { scene: 'border', hold: 6, kind: 'choice', dur: 8, ch: 4 },
    blocked2: { scene: 'blocked', variant: 2, dur: 7.5, ch: 4, back: 'choice2' },
    borderCross: { scene: 'border', offset: 6, dur: 12.2, ch: 4, next: 'quiz' },
    quiz: { scene: 'quizbg', kind: 'quiz', dur: 30, ch: 5, next: 'recap' },
    recap: { scene: 'recap', dur: 9, ch: 6, next: 'end' },
    end: { scene: 'end', dur: 5, ch: 6 },
  },
  linear: ['title', 'meet', 'diseases', 'choice1', 'vet', 'borderArrive', 'borderCross', 'quiz', 'recap', 'end'],
  chapterStart: ['title', 'diseases', 'choice1', 'vet', 'borderArrive', 'quiz', 'recap'],
  // linear choice timing (seconds inside the segment)
  choiceLinear: { in: 0.2, countFrom: 1.4, reveal: 4.6 },
  quizLinear: { each: 10, reveal: 4.3 },
};

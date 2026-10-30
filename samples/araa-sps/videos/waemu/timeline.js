// Segments of the story. The interactive player follows `next` and the viewer's choices;
// the linear (WhatsApp) version plays `linear` straight through with the right answers shown.
// Full-length module (about 7 minutes), as ARAA's clarification bulletin n°1 asks; the rules
// follow Regulation n°07/2007/CM/UEMOA and its list of notifiable diseases (n°010/2009/COM/UEMOA).
window.SPS_TIMELINE = {
  slug: 'koffi', // file names: koffi-fr.mp4, koffi-fr.srt …
  segments: {
    title: { scene: 'title', dur: 7, ch: 0, next: 'meet' },
    meet: { scene: 'market', dur: 11, ch: 0, next: 'chain' },
    chain: { scene: 'chain', dur: 15.6, ch: 0, next: 'principles' },
    principles: { scene: 'principles', dur: 26, ch: 1, next: 'institutions' },
    institutions: { scene: 'institutions', dur: 26, ch: 2, next: 'choice1' },
    choice1: { scene: 'offer', kind: 'choice', dur: 13.2, ch: 3 },
    blocked1: { scene: 'sick', variant: 1, dur: 10.9, ch: 3, back: 'choice1' },
    trace: { scene: 'abattoir', dur: 15.5, ch: 4, next: 'duties' },
    duties: { scene: 'duties', dur: 24, ch: 4, next: 'alertArrive' },
    alertArrive: { scene: 'alert', dur: 6, ch: 5, next: 'choice2' },
    choice2: { scene: 'alert', hold: 6, kind: 'choice', dur: 8, ch: 5 },
    blocked2: { scene: 'sick', variant: 2, dur: 7.7, ch: 5, back: 'choice2' },
    alertResolve: { scene: 'alert', offset: 6, dur: 12.7, ch: 5, next: 'inform' },
    inform: { scene: 'inform', dur: 24, ch: 5, next: 'notifiable' },
    notifiable: { scene: 'notifiable', dur: 24, ch: 6, next: 'choice3' },
    choice3: { scene: 'notifiable', hold: 23.9, kind: 'choice', dur: 13, ch: 6 },
    blocked3: { scene: 'wmap', variant: 'spread', dur: 10, ch: 6, back: 'choice3' },
    notifyGo: { scene: 'wmap', variant: 'notify', dur: 24, ch: 6, next: 'crisis' },
    crisis: { scene: 'wmap', variant: 'crisis', dur: 18, ch: 6, next: 'imports' },
    imports: { scene: 'wmap', variant: 'imports', dur: 24, ch: 7, next: 'market2' },
    market2: { scene: 'wmap', variant: 'free', dur: 24, ch: 7, next: 'rights' },
    rights: { scene: 'rights', dur: 20, ch: 8, next: 'quiz' },
    quiz: { scene: 'quizbg', kind: 'quiz', dur: 72, ch: 9, next: 'rules' },
    rules: { scene: 'rules', dur: 10, ch: 10, next: 'recap' },
    recap: { scene: 'recap', dur: 9, ch: 10, next: 'end' },
    end: { scene: 'end', dur: 5, ch: 10 },
  },
  linear: ['title', 'meet', 'chain', 'principles', 'institutions', 'choice1', 'trace', 'duties', 'alertArrive', 'alertResolve', 'inform',
    'notifiable', 'choice3', 'notifyGo', 'crisis', 'imports', 'market2', 'rights', 'quiz', 'rules', 'recap', 'end'],
  chapterStart: ['title', 'principles', 'institutions', 'choice1', 'trace', 'alertArrive', 'notifiable', 'imports', 'rights', 'quiz', 'rules'],
  // linear choice timing (seconds inside the segment)
  choiceLinear: { in: 3.6, countFrom: 4.6, reveal: 7.8 },
  quizLinear: { each: 12, reveal: 5.2 },
};

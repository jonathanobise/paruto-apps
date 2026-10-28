// The player: interactive by default; ?render&lang=fr turns it into a frame-exact linear
// player that the MP4 renderer seeks through (window.SPS_RENDER).
(function () {
  const SCRIPT = window.SPS_SCRIPT, TL = window.SPS_TIMELINE, { scenes, defs, clamp } = window.SPS_SCENES;
  const params = new URLSearchParams(location.search);
  const RENDER = params.has('render');
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  let lang = params.get('lang') || store.get('sps-lang') || 'fr';
  if (!SCRIPT.ui[lang]) lang = 'fr';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ui = () => SCRIPT.ui[lang];
  const L = (o) => (o ? o[lang] ?? o.fr : '');
  let ccOn = store.get('sps-cc') !== '0', state = null, idle = 0;

  // ---------- build the stage ----------
  const svg = $('#svg');
  svg.innerHTML = defs + Object.entries(scenes).map(([k, s]) => `<g id="sc-${k}" style="display:none">${s.build()}</g>`).join('');
  Object.entries(scenes).forEach(([k, s]) => s.init($('#sc-' + k)));
  const caption = $('#caption'), choice = $('#choice'), quiz = $('#quiz');
  if (RENDER) document.body.classList.add('render');

  const wrap = (text, n) => {
    const out = []; let line = '';
    text.split(' ').forEach((w) => { if ((line + ' ' + w).trim().length > n && line) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); });
    if (line) out.push(line); return out;
  };
  const getKey = (key) => key.split('.').reduce((o, k) => (o == null ? o : o[k]), ui());
  function applyLang() {
    document.documentElement.lang = lang;
    $$('#svg [data-t]').forEach((el) => {
      const v = getKey(el.dataset.t) ?? '';
      if (el.dataset.wrap) {
        const lines = wrap(v, +el.dataset.wrap), lh = +(el.dataset.lh || 30), x = el.getAttribute('x') || 0;
        const y0 = -((lines.length - 1) * lh) / 2;
        el.innerHTML = lines.map((l, i) => `<tspan x="${x}" dy="${i ? lh : y0}">${l.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</tspan>`).join('');
      } else el.textContent = v;
    });
    $$('[data-ui]').forEach((el) => (el.textContent = getKey(el.dataset.ui) ?? ''));
    $$('.lang-btn').forEach((b) => b.classList.toggle('on', b.dataset.lang === lang));
    const sel = $('#lang'); if (sel) sel.value = lang;
    renderChapters();
    if (state) draw();
  }

  // ---------- drawing ----------
  let shown = null;
  function showScene(name) {
    if (shown === name) return;
    if (shown) $('#sc-' + shown).style.display = 'none';
    $('#sc-' + name).style.display = ''; shown = name;
  }
  const fade = (t, a, b, f = 0.25) => clamp(Math.min((t - a) / f, (b - t) / f));
  function drawCaption(segId, t, allow = true) {
    const list = SCRIPT.captions[segId] || [];
    const c = allow && ccOn ? list.find((x) => t >= x.a && t < x.b) : null;
    if (c) { if (caption.dataset.k !== segId + c.a + lang) { caption.firstElementChild.textContent = L(c); caption.dataset.k = segId + c.a + lang; } caption.style.opacity = fade(t, c.a, c.b); }
    else { caption.style.opacity = 0; caption.dataset.k = ''; caption.firstElementChild.textContent = ''; }
  }

  function fillChoice(id) {
    const c = SCRIPT.choices[id];
    $('.q', choice).textContent = L(c.q);
    $('.eyebrow', choice).textContent = ui().chapters[2];
    $$('.opt', choice).forEach((b, i) => { $('.txt', b).textContent = L(c.options[i]); b.classList.remove('right', 'wrong', 'picked'); b.disabled = RENDER; });
    $('.hint-text', choice).textContent = ui().pauseHint;
  }
  function fillQuiz(i) {
    const q = SCRIPT.quiz[i];
    $('.qn', quiz).textContent = `${i + 1}/${SCRIPT.quiz.length}`;
    $('.eyebrow-label', quiz).textContent = ui().quiz;
    $('.q', quiz).textContent = L(q.q);
    $$('.opt', quiz).forEach((b, k) => { $('.txt', b).textContent = L(q.options[k]); b.classList.remove('right', 'wrong', 'picked'); b.disabled = RENDER; });
    $('.why', quiz).textContent = L(q.why); quiz.classList.remove('revealed');
  }
  function revealQuiz(i, picked) {
    const q = SCRIPT.quiz[i];
    $$('.opt', quiz).forEach((b, k) => { if (q.options[k].correct) b.classList.add('right'); else if (k === picked) b.classList.add('wrong'); if (k === picked) b.classList.add('picked'); b.disabled = true; });
    quiz.classList.add('revealed');
  }

  // Linear: everything is a function of (segment, t).
  function drawLinear(segId, t, idle) {
    const seg = TL.segments[segId];
    showScene(seg.scene);
    scenes[seg.scene].update(seg.hold ?? (seg.offset || 0) + t, idle, seg.variant);
    drawCaption(segId, t);
    if (seg.kind === 'choice') {
      if (choice.dataset.k !== segId + lang) { fillChoice(segId); choice.dataset.k = segId + lang; }
      const C = TL.choiceLinear; choice.style.opacity = clamp((t - C.in) / 0.5) * clamp((seg.dur - t) / 0.4);
      choice.style.transform = `translateY(${(1 - clamp((t - C.in) / 0.5)) * 20}px)`;
      const n = 3 - Math.floor((t - C.countFrom)); const counting = t >= C.countFrom && t < C.reveal;
      $('.count', choice).textContent = counting ? Math.max(1, n) : '';
      $('.hint', choice).style.opacity = counting ? 1 : 0;
      const rev = t >= C.reveal, opts = SCRIPT.choices[segId].options;
      $$('.opt', choice).forEach((b, i) => { b.classList.toggle('right', rev && !!opts[i].correct); b.classList.toggle('wrong', rev && !opts[i].correct); });
      choice.classList.add('show');
    } else choice.classList.remove('show');
    if (seg.kind === 'quiz') {
      const Q = TL.quizLinear, i = Math.min(SCRIPT.quiz.length - 1, Math.floor(t / Q.each)), lt = t - i * Q.each;
      if (quiz.dataset.k !== i + lang) { fillQuiz(i); quiz.dataset.k = i + lang; }
      quiz.style.opacity = clamp(lt / 0.4) * clamp((Q.each - lt) / 0.3);
      if (lt >= Q.reveal && !quiz.classList.contains('revealed')) revealQuiz(i, -1);
      quiz.classList.add('show'); quiz.classList.remove('scored');
    } else quiz.classList.remove('show');
  }

  // ---------- render mode ----------
  if (RENDER) {
    const order = TL.linear.map((id) => ({ id, dur: TL.segments[id].dur }));
    const total = order.reduce((s, x) => s + x.dur, 0);
    ccOn = params.get('cc') !== '0';
    window.SPS_RENDER = {
      duration: total,
      seek(T) {
        let acc = 0;
        for (const s of order) { if (T < acc + s.dur || s === order.at(-1)) { drawLinear(s.id, Math.min(T - acc, s.dur - 1e-3), T); return; } acc += s.dur; }
      },
      seg(id, t) { drawLinear(id, t, t); },
      captions() { // absolute caption times for subtitle export
        let acc = 0; const out = [];
        order.forEach((s) => { (SCRIPT.captions[s.id] || []).forEach((c) => out.push({ a: acc + c.a, b: acc + Math.min(c.b, s.dur), text: L(c) })); acc += s.dur; });
        return out;
      },
    };
    applyLang(); window.SPS_RENDER.seek(0);
    document.body.dataset.ready = '1';
    return;
  }

  // ---------- interactive mode ----------
  let last = 0, playing = false, started = false;

  function go(segId) {
    state = { seg: segId, t: 0, waiting: false, picked: null, qi: 0, score: 0 };
    const seg = TL.segments[segId];
    choice.classList.remove('show', 'answered'); quiz.classList.remove('show', 'revealed', 'scored'); $('#backbar').classList.remove('show');
    if (seg.kind === 'choice') { fillChoice(segId); choice.dataset.k = ''; }
    if (seg.kind === 'quiz') { fillQuiz(0); quiz.dataset.k = ''; }
    renderChapters();
  }
  function onEnd() {
    const seg = TL.segments[state.seg];
    if (seg.back) { state.waiting = true; $('#backbar').classList.add('show'); return; }
    if (seg.next) go(seg.next); else { playing = false; state.waiting = true; $('#endbar').classList.add('show'); updatePlay(); }
  }
  function draw() {
    const seg = TL.segments[state.seg], t = state.t;
    showScene(seg.scene);
    scenes[seg.scene].update(seg.hold ?? (seg.offset || 0) + Math.min(t, seg.dur), idle, seg.variant);
    drawCaption(state.seg, Math.min(t, seg.dur), !seg.kind);
    if (seg.kind === 'choice') {
      choice.classList.add('show'); choice.style.opacity = clamp((t - 0.2) / 0.5); choice.style.transform = `translateY(${(1 - clamp((t - 0.2) / 0.5)) * 20}px)`;
      $('.hint', choice).style.opacity = 0;
    }
    if (seg.kind === 'quiz') { quiz.classList.add('show'); quiz.style.opacity = clamp(t / 0.4); }
    const pct = (k) => { const s = TL.segments[k]; return s.kind ? 1 : clamp(t / s.dur); };
    $('#bar').style.width = `${pct(state.seg) * 100}%`;
  }
  function frame(now) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (playing) {
      idle += dt; state.t += dt;
      const seg = TL.segments[state.seg];
      if (!seg.kind && !state.waiting && state.t >= seg.dur) { state.t = seg.dur; onEnd(); }
    }
    if (started) draw(); else { idle += dt; showScene('title'); scenes.title.update(0.6, idle); }
    requestAnimationFrame(frame);
  }

  // choices
  $$('.opt', choice).forEach((b, i) => b.addEventListener('click', () => {
    if (choice.classList.contains('answered')) return;
    const opt = SCRIPT.choices[state.seg].options[i];
    choice.classList.add('answered'); b.classList.add('picked', opt.correct ? 'right' : 'wrong');
    $('.feedback', choice).textContent = opt.correct ? ui().correct : ui().wrong;
    setTimeout(() => go(opt.next), 1300);
  }));
  $('#back').addEventListener('click', () => go(TL.segments[state.seg].back));
  // quiz
  $$('.opt', quiz).forEach((b, k) => b.addEventListener('click', () => {
    if (quiz.classList.contains('revealed')) return;
    if (SCRIPT.quiz[state.qi].options[k].correct) state.score++;
    revealQuiz(state.qi, k);
  }));
  $('.next', quiz).addEventListener('click', () => {
    if (state.qi < SCRIPT.quiz.length - 1) { state.qi++; fillQuiz(state.qi); }
    else { quiz.classList.add('scored'); $('.score-num', quiz).textContent = `${state.score}/${SCRIPT.quiz.length}`; }
  });
  $('.score-go', quiz).addEventListener('click', () => go('recap'));

  // chrome
  function renderChapters() {
    const box = $('#chapters'); if (!box) return;
    const cur = state ? TL.segments[state.seg].ch : -1;
    box.innerHTML = ui().chapters.map((c, i) => `<button class="chap${i === cur ? ' on' : ''}${i < cur ? ' done' : ''}" data-i="${i}">${c}${i === cur ? '<span id="bar"></span>' : ''}</button>`).join('');
    if (!$('#bar')) box.insertAdjacentHTML('beforeend', '<span id="bar" hidden></span>');
    $$('.chap', box).forEach((b) => b.addEventListener('click', () => { begin(); go(TL.chapterStart[+b.dataset.i]); playing = true; updatePlay(); }));
  }
  function updatePlay() { $('#play').dataset.state = playing ? 'playing' : 'paused'; $('#play .lbl').textContent = playing ? ui().pause : ui().play; }
  function begin() { if (!started) { started = true; $('#start').classList.add('gone'); } $('#endbar').classList.remove('show'); }
  $('#go').addEventListener('click', () => { begin(); go('title'); playing = true; updatePlay(); });
  $('#play').addEventListener('click', () => { if (!started) { $('#go').click(); return; } playing = !playing; updatePlay(); });
  $('#restart').addEventListener('click', () => { begin(); go('title'); playing = true; updatePlay(); });
  $('#replay').addEventListener('click', () => { begin(); go('title'); playing = true; updatePlay(); });
  $('#cc').addEventListener('click', () => { ccOn = !ccOn; store.set('sps-cc', ccOn ? '1' : '0'); $('#cc').classList.toggle('on', ccOn); });
  $('#cc').classList.toggle('on', ccOn);
  const setLang = (l) => { lang = l; store.set('sps-lang', l); choice.dataset.k = quiz.dataset.k = caption.dataset.k = ''; if (state) { const s = TL.segments[state.seg]; if (s.kind === 'choice') fillChoice(state.seg); if (s.kind === 'quiz' && !quiz.classList.contains('scored')) { fillQuiz(state.qi); } } applyLang(); updatePlay(); };
  $$('.lang-btn').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
  $('#lang').addEventListener('change', (e) => setLang(e.target.value));
  document.addEventListener('keydown', (e) => { if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); $('#play').click(); } });

  // fit the 1280×720 stage to the frame
  // On narrow screens the cards and captions would shrink with the stage, so they dock below it.
  const frameEl = $('#frame'), stage = $('#stage'), dock = $('#dock'), player = $('.player');
  const docked = [caption, choice, quiz, $('#backbar'), $('#endbar')];
  new ResizeObserver(() => {
    stage.style.setProperty('--s', frameEl.clientWidth / 1280);
    const narrow = frameEl.clientWidth < 760;
    if (narrow !== player.classList.contains('docked')) {
      player.classList.toggle('docked', narrow);
      docked.forEach((el) => (narrow ? dock : stage).appendChild(el));
    }
  }).observe(frameEl);

  applyLang(); updatePlay();
  requestAnimationFrame(frame);
})();

// ECOWAS module (full length): Moussa takes his herd across a border. Scenes built from the shared kit (shared/art.js).
(function () {
  const { C, clamp, ease, prog, lerp, tf, op, defs, acacia, landscape, cow, prepCow, poseCow, person, prepPerson, posePerson,
    chip, check, cross, syringe, certificate, receipt, borderPost, barrierArm, virus, titleScene, quizScene, recapScene, endScene,
    pop, board, flagA, flagB, card, label, ic, g1, fly } = window.SPS_ART;
  const S = {};
  S.title = titleScene();

  // ---------- 2. village (meet + choice 1) ----------
  const herdSpots = [[560, 556, .86], [700, 552, .86], [840, 558, .86], [620, 612, 1], [770, 616, 1], [920, 610, 1]];
  S.village = {
    build: () => `${landscape()}
      ${acacia(150, 500, 1.2)}${acacia(1150, 490, .95)}
      <g opacity=".75"><path d="M1010 470 L1050 432 L1090 470Z" fill="${C.terracotta}"/><rect x="1016" y="470" width="68" height="36" fill="#E8D2A8"/><path d="M1090 474 L1126 440 L1162 474Z" fill="#D9A33A"/><rect x="1096" y="474" width="60" height="32" fill="#EBD6B0"/></g>
      <g class="herd">${herdSpots.map((_, i) => cow(i)).join('')}</g>
      ${person('moussa')}
      ${chip('name', 400, 'nameTag', { tail: true })}
      ${chip('badge', 250, 'herd', { fill: C.teal, color: '#FFF6E6', tx: 18, icon: `<g transform="translate(-92 6) scale(.32)" fill="#FFF6E6"><ellipse cx="0" cy="-30" rx="44" ry="22"/><ellipse cx="24" cy="-50" rx="14" ry="11"/><path d="M40 -60 L70 -60 L66 -36 L44 -34Z"/><rect x="-34" y="-14" width="10" height="26"/><rect x="20" y="-14" width="10" height="26"/></g>` })}`,
    init(g) {
      this.sun = g.querySelector('.sun'); this.cows = [...g.querySelectorAll('.cow')]; this.cows.forEach(prepCow);
      this.m = g.querySelector('.person.moussa'); prepPerson(this.m); this.name = g.querySelector('.name'); this.badge = g.querySelector('.badge');
    },
    update(t, idle) {
      tf(this.sun, 1010, 150);
      this.cows.forEach((c, i) => {
        const [x, y, s] = herdSpots[i]; const t0 = 0.2 + (i % 3) * 0.25, t1 = 5.2 + (i % 3) * 0.3;
        const p = prog(t, t0, t1, ease.out); const moving = t > t0 && t < t1 ? 1 - p * p : 0;
        poseCow(c, lerp(x - 900, x, p), y, s, moving, t * 7 + i, idle);
      });
      const pm = prog(t, 0.6, 4.4, ease.out);
      posePerson(this.m, lerp(-120, 330, pm), 640, 1.05, t > 0.6 && t < 4.4 ? 1 - pm * pm : 0, t * 7.5, idle, t > 4.4 ? -10 : null);
      const pn = prog(t, 3.6, 4.4, ease.back); op(this.name, prog(t, 3.6, 3.9) * (1 - prog(t, 8.4, 8.9))); tf(this.name, 330, 418, lerp(0.6, 1, pn));
      const pb = prog(t, 5.6, 6.4, ease.back); op(this.badge, prog(t, 5.6, 5.9) * (1 - prog(t, 8.4, 8.9))); tf(this.badge, 740, 428, lerp(0.6, 1, pb));
    },
  };

  // ---------- 3. map: animals and diseases travel ----------
  const towns = [[150, 560], [370, 330], [640, 500], [900, 300], [1120, 520]];
  const routes = [[0, 1], [1, 2], [0, 2], [2, 3], [2, 4], [3, 4]];
  const routePath = ([a, b]) => { const [x1, y1] = towns[a], [x2, y2] = towns[b]; const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - 60; return `M${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`; };
  S.map = {
    build: () => `<rect width="1280" height="720" fill="#FBF1DF"/><rect width="1280" height="720" fill="url(#p-dots)"/>
      <g class="routes">${routes.map((r, i) => `<path class="route r${i}" pathLength="1" d="${routePath(r)}" stroke="#D9BC8C" stroke-width="9" fill="none" stroke-linecap="round"/>`).join('')}</g>
      <g class="routes-red">${routes.map((r, i) => `<path class="route-red rr${i}" pathLength="1" d="${routePath(r)}" stroke="${C.red}" stroke-width="9" fill="none" stroke-linecap="round" opacity="0" stroke-dasharray="1 1" stroke-dashoffset="1"/>`).join('')}</g>
      ${towns.map(([x, y], i) => `<g class="town t${i}" transform="translate(${x} ${y})"><circle r="34" fill="#FFF6E6" stroke="#D9BC8C" stroke-width="5"/><path d="M-14 8 V-4 L0 -16 L14 -4 V8Z" fill="${C.terracotta}"/><rect x="-5" y="-1" width="10" height="9" fill="#FFF6E6"/></g>`).join('')}
      <g class="movers">${[0, 1, 2, 3, 4, 5].map((i) => `<g class="mover m${i}">${cow(i)}</g>`).join('')}</g>
      <g class="viruses">${[0, 1, 2].map((i) => virus('v v' + i)).join('')}</g>
      <g class="dchips">${[0, 1, 2].map((i) => `<g class="dchip d${i}" opacity="0"><rect x="0" y="-24" width="470" height="48" rx="24" fill="#FFF6E6" filter="url(#f-shadow)"/><circle cx="26" cy="0" r="9" fill="${C.red}"/><text x="46" y="8" font-size="21" font-weight="650" fill="${C.ink}" data-t="diseases.${i}"></text></g>`).join('')}</g>`,
    init(g) {
      this.routes = [...g.querySelectorAll('.route')]; this.reds = [...g.querySelectorAll('.route-red')];
      this.towns = [...g.querySelectorAll('.town')]; this.movers = [...g.querySelectorAll('.mover')];
      this.cows = this.movers.map((m) => m.querySelector('.cow')); this.cows.forEach(prepCow);
      this.vir = [...g.querySelectorAll('.v')]; this.chips = [...g.querySelectorAll('.dchip')];
      this.len = this.routes.map((r) => r.getTotalLength());
    },
    update(t, idle) {
      this.routes.forEach((r, i) => { r.setAttribute('stroke-dasharray', '1 1'); r.setAttribute('stroke-dashoffset', (1 - prog(t, 0.2 + i * 0.18, 1.4 + i * 0.18)).toFixed(3)); });
      this.towns.forEach((tw, i) => { const p = prog(t, 0.1 + i * 0.12, 0.6 + i * 0.12, ease.back); const [x, y] = towns[i]; tf(tw, x, y, Math.max(0.001, p)); });
      // which routes the 6 animals walk, and which carry disease
      const plan = [0, 1, 3, 4, 2, 5], sick = [1, 3, 4];
      this.movers.forEach((m, i) => {
        const r = plan[i], route = this.routes[r];
        const u = ((t * 0.09 + i * 0.17) % 1); const pt = route.getPointAtLength(u * this.len[r]); const pt2 = route.getPointAtLength(Math.min(1, u + 0.01) * this.len[r]);
        const dir = pt2.x >= pt.x ? 1 : -1;
        tf(m, pt.x, pt.y + 6, 0.3, 0, 0.3 * dir); op(m, prog(t, 1.2 + i * 0.1, 1.8 + i * 0.1));
        poseCow(this.cows[i], 0, 0, 1, 1, t * 8 + i, idle);
        const k = sick.indexOf(i);
        if (k >= 0) {
          const pv = prog(t, 3 + k * 0.5, 3.6 + k * 0.5, ease.back);
          op(this.vir[k], prog(t, 3 + k * 0.5, 3.3 + k * 0.5)); tf(this.vir[k], pt.x + 20, pt.y - 40, Math.max(0.001, pv * (0.85 + Math.sin(idle * 5 + k) * 0.08)), idle * 40);
          const rr = this.reds[r]; op(rr, prog(t, 3.2 + k * 0.5, 3.6 + k * 0.5) * 0.85); rr.setAttribute('stroke-dashoffset', (1 - prog(t, 3.2 + k * 0.5, 5.5 + k * 0.5, ease.inOut)).toFixed(3));
        }
      });
      this.chips.forEach((c, i) => { const p = prog(t, 4.6 + i * 0.45, 5.3 + i * 0.45, ease.back); op(c, prog(t, 4.6 + i * 0.45, 4.9 + i * 0.45)); tf(c, lerp(-60, 40, p), 70 + i * 62); });
    },
  };

  // ---------- 4. veterinarian ----------
  const vetCows = [[560, 600], [760, 606], [960, 600], [660, 548, .82], [860, 546, .82]];
  S.vet = {
    build: () => `${landscape()}${acacia(110, 500, 1.1)}${acacia(1200, 488, .9)}
      <g class="herd">${[3, 4].map((i) => cow(i, 'back')).join('')}${[0, 1, 2].map((i) => cow(i, 'front')).join('')}</g>
      ${person('moussa')}${person('vet')}
      ${[0, 1, 2].map((i) => check('ok ok' + i)).join('')}
      ${chip('vac', 230, 'vaccine', { fill: '#E9F3F1', color: C.teal, tx: 22, icon: `<g transform="translate(-78 0) scale(.8)">${syringe}</g>`, tail: true })}
      ${certificate('cert')}`,
    init(g) {
      this.sun = g.querySelector('.sun'); this.cows = [...g.querySelectorAll('.cow')]; this.cows.forEach(prepCow);
      this.m = g.querySelector('.person.moussa'); prepPerson(this.m); this.v = g.querySelector('.person.vet'); prepPerson(this.v);
      this.oks = [...g.querySelectorAll('.ok')]; this.vac = g.querySelector('.vac');
      this.cert = g.querySelector('.cert'); this.lines = [...g.querySelectorAll('.cert .cert-lines path')]; this.sign = g.querySelector('.cert .cert-sign'); this.stamp = g.querySelector('.cert .cert-stamp');
    },
    update(t, idle) {
      tf(this.sun, 1060, 140);
      const order = [3, 4, 0, 1, 2];
      this.cows.forEach((c, k) => { const [x, y, s = 1] = vetCows[order[k]]; poseCow(c, x, y, s, 0, 0, idle); });
      // vet walks cow to cow
      const stops = [[-80, 0], [450, 2.0], [450, 2.8], [650, 3.6], [650, 4.4], [850, 5.2], [850, 6.0]];
      let vx = stops[0][0], walking = 0;
      for (let i = 1; i < stops.length; i++) {
        const [x0, t0] = stops[i - 1], [x1, t1] = stops[i];
        if (t >= t0 && t <= t1) { vx = lerp(x0, x1, ease.inOut((t - t0) / (t1 - t0))); walking = x0 !== x1 ? 1 : 0; break; }
        if (t > t1) vx = x1;
      }
      const examining = !walking && t > 2 && t < 6.2;
      posePerson(this.v, vx, 652, 1.04, walking, t * 8, idle, examining ? -60 + Math.sin(idle * 6) * 8 : null);
      posePerson(this.m, 230, 640, 1.05, 0, 0, idle, t > 10.4 ? -50 : null);
      [[560, 2.4], [760, 4.0], [960, 5.6]].forEach(([x, t0], i) => { const p = prog(t, t0, t0 + 0.4, ease.back); op(this.oks[i], prog(t, t0, t0 + 0.2)); tf(this.oks[i], x + 30, 470, Math.max(0.001, p)); });
      const pv = prog(t, 3.0, 3.5, ease.back); op(this.vac, prog(t, 3.0, 3.2) * (1 - prog(t, 6.0, 6.4))); tf(this.vac, 700, 420, lerp(0.6, 1, pv));
      // certificate: appears, fills, stamped, signed, then flies to Moussa
      const pc = prog(t, 6.0, 6.6, ease.back), fly = prog(t, 10.4, 11.6, ease.inOut);
      op(this.cert, prog(t, 6.0, 6.2));
      tf(this.cert, lerp(940, 262, fly), lerp(250, 520, fly), lerp(lerp(0.5, 1, pc), 0.22, fly), lerp(-3, -14, fly));
      this.lines.forEach((l, i) => l.setAttribute('stroke-dashoffset', (1 - prog(t, 6.4 + i * 0.12, 6.8 + i * 0.12)).toFixed(3)));
      this.lines.forEach((l) => l.setAttribute('stroke-dasharray', '1 1'));
      const ps = prog(t, 7.3, 7.6, ease.out); op(this.stamp, ps); this.stamp.setAttribute('transform', `translate(70 104) rotate(-14) scale(${lerp(2.2, 1, ps).toFixed(3)})`);
      this.sign.setAttribute('stroke-dasharray', '1 1'); this.sign.setAttribute('stroke-dashoffset', (1 - prog(t, 7.7, 8.4, ease.inOut)).toFixed(3));
    },
  };

  // ---------- 5. border (arrive 0–6, cross 6–14) and its blocked variants ----------
  const borderHerd = [[120, 560, .84], [250, 556, .84], [60, 612], [200, 616], [340, 610]];
  const borderBuild = (blocked) => `${landscape()}${acacia(90, 492, .9)}
      <path d="M0 560 Q 640 548 1280 560 V 700 Q 640 690 0 700Z" fill="#D9A867" opacity=".55"/>
      ${borderPost()}
      <g class="herd">${borderHerd.map((_, i) => cow(i)).join('')}</g>
      ${person('moussa')}${person('officer')}
      <g class="arm-pivot" transform="translate(913 486)">${barrierArm()}</g>
      ${blocked ? `${cross('xmark')}${chip('held', 330, 'blocked', { fill: C.red, color: '#FFF6E6' })}${chip('waitc', 470, 'wait', { size: 21 })}
        <g class="clock" opacity="0"><circle r="34" fill="#FFF6E6" stroke="${C.ink}" stroke-width="5" filter="url(#f-shadow)"/><path class="hand1" d="M0 0 V-22" stroke="${C.ink}" stroke-width="5" stroke-linecap="round"/><path class="hand2" d="M0 0 H16" stroke="${C.ink}" stroke-width="5" stroke-linecap="round"/></g>
        <g class="stop" opacity="0"><polygon points="-30,-72 30,-72 72,-30 72,30 30,72 -30,72 -72,30 -72,-30" fill="${C.red}" stroke="#FFF6E6" stroke-width="6" filter="url(#f-shadow)"/><text y="12" text-anchor="middle" font-size="34" font-weight="900" fill="#FFF6E6" letter-spacing="1" data-t="stop"></text></g>
        ${receipt('rcpt')}` : `${certificate('cert', 'valid')}
        <g class="lens" opacity="0"><circle r="44" fill="#CFE6EA" fill-opacity=".35" stroke="#3E3729" stroke-width="9"/><path d="M30 30 L70 70" stroke="#3E3729" stroke-width="14" stroke-linecap="round"/></g>`}`;
  const borderInit = function (g) {
    this.sun = g.querySelector('.sun'); this.cows = [...g.querySelectorAll('.cow')]; this.cows.forEach(prepCow);
    this.m = g.querySelector('.person.moussa'); prepPerson(this.m); this.o = g.querySelector('.person.officer'); prepPerson(this.o);
    this.arm = g.querySelector('.barrier-arm'); this.flag = g.querySelector('.flag');
    ['cert', 'lens', 'xmark', 'held', 'waitc', 'clock', 'stop', 'rcpt'].forEach((k) => (this[k] = g.querySelector('.' + k)));
    if (this.cert) { this.valid = this.cert.querySelector('.cert-valid'); this.cert.querySelectorAll('.cert-lines path, .cert-sign').forEach((p) => p.setAttribute('stroke-dasharray', '0 0')); this.cert.querySelector('.cert-stamp').setAttribute('opacity', '1'); this.cert.querySelector('.cert-stamp').setAttribute('transform', 'translate(70 104) rotate(-14)'); }
    if (this.clock) { this.h1 = this.clock.querySelector('.hand1'); this.h2 = this.clock.querySelector('.hand2'); }
  };
  const arrive = (self, t, idle, leaveAt = 1e6) => {
    tf(self.sun, 300, 130);
    self.flag.setAttribute('transform', `skewY(${(Math.sin(idle * 3) * 2).toFixed(2)})`);
    const leave = prog(t, leaveAt, leaveAt + 4.4, ease.inOut);
    self.cows.forEach((c, i) => {
      const [x, y, s = 1] = borderHerd[i]; const p = prog(t, 0.1 + (i % 3) * 0.2, 4.2 + (i % 3) * 0.2);
      const moving = (t > 0.1 && p < 1 ? 1 - p * p : 0) + (leave > 0 && leave < 1 ? 1 : 0);
      poseCow(c, lerp(x - 700, x, p) + leave * 1100, y, s, Math.min(1, moving), t * 7 + i, idle);
    });
    const pm = prog(t, 0.3, 4.4);
    const mWalk = (t > 0.3 && pm < 1 ? 1 - pm * pm : 0) + (leave > 0 && leave < 1 ? 1 : 0);
    return { mx: lerp(-140, 540, pm) + leave * 1000, mWalk: Math.min(1, mWalk), leave };
  };
  S.border = {
    build: () => borderBuild(false),
    init(g) { borderInit.call(this, g); },
    update(t, idle) {
      const { mx, mWalk } = arrive(this, t, idle, 9.4);
      const handing = t > 6.1 && t < 9.4;
      posePerson(this.m, mx, 650, 1.05, mWalk, t * 7.5, idle, handing ? -70 : null);
      const wave = t > 9.6 ? -120 + Math.sin(idle * 8) * 18 : t > 6.4 && t < 9 ? -55 : null;
      posePerson(this.o, 990, 652, 1.04, 0, 0, idle, wave, true);
      const pc = prog(t, 6.1, 6.6, ease.back), away = prog(t, 9.0, 9.5);
      op(this.cert, prog(t, 6.1, 6.3) * (1 - away)); tf(this.cert, 760, 290, lerp(0.4, 0.82, pc) * (1 - away * 0.3), -4);
      op(this.lens, prog(t, 6.7, 6.9) * (1 - prog(t, 7.9, 8.1)));
      const lp = prog(t, 6.7, 7.9, ease.inOut); tf(this.lens, 700 + lp * 130 + Math.sin(lp * 9) * 10, 240 + Math.sin(lp * 6) * 50);
      const pv = prog(t, 8.0, 8.3, ease.out); op(this.valid, pv); this.valid.setAttribute('transform', `translate(0 30) rotate(-10) scale(${lerp(2, 1, pv).toFixed(3)})`);
      this.arm.setAttribute('transform', `rotate(${(prog(t, 8.6, 9.6, ease.inOut) * 82).toFixed(2)})`);
    },
  };
  S.blocked = {
    build: () => borderBuild(true),
    init(g) { borderInit.call(this, g); },
    update(t, idle, variant = 1) {
      const T = t + 2.2; // join the walk late so the stop happens early
      const { mx, mWalk } = arrive(this, T, idle);
      posePerson(this.m, Math.min(mx, 540), 650, 1.05, mWalk, T * 7.5, idle, variant === 2 && t > 2 ? -70 : t > 3 ? 20 : null);
      posePerson(this.o, 990, 652, 1.04, 0, 0, idle, t > 1.2 ? -90 + Math.sin(idle * 2) * 4 : null, true);
      this.arm.setAttribute('transform', `rotate(${(Math.sin(idle * 1.3) * 0.4).toFixed(2)})`);
      const ps = prog(t, 0.9, 1.4, ease.back); op(this.stop, prog(t, 0.9, 1.1)); tf(this.stop, 760, 280, Math.max(0.001, ps * (1 + Math.sin(idle * 4) * 0.03)));
      if (variant === 2) { const pr = prog(t, 0.4, 0.9, ease.back); op(this.rcpt, prog(t, 0.4, 0.6)); tf(this.rcpt, 690, 330, lerp(0.5, 0.8, pr), -5); tf(this.stop, 900, 250, Math.max(0.001, ps)); }
      const px = prog(t, 2.0, 2.4, ease.back); op(this.xmark, prog(t, 2.0, 2.2)); tf(this.xmark, variant === 2 ? 750 : 300, variant === 2 ? 390 : 440, Math.max(0.001, px));
      const ph = prog(t, 2.6, 3.1, ease.back); op(this.held, prog(t, 2.6, 2.8)); tf(this.held, 300, 160, lerp(0.6, 1, ph));
      const pw = prog(t, 3.8, 4.3, ease.back); op(this.waitc, prog(t, 3.8, 4.0)); tf(this.waitc, 340, 226, lerp(0.6, 1, pw));
      op(this.clock, prog(t, 3.8, 4.1)); tf(this.clock, 62, 192, Math.max(0.001, pw));
      this.h1.setAttribute('transform', `rotate(${(idle * 360).toFixed(1)})`); this.h2.setAttribute('transform', `rotate(${(idle * 30).toFixed(1)})`);
    },
  };


  // ---------- full-length chapters: an invented map of three countries, and explainer cards ----------
  // Moussa's country (A, teal and gold flag) borders the coastal market country (B, indigo and sand)
  // and a third country (C, green). No real map or flag is drawn.
  const CA = 'M150 150 L 560 130 L 600 330 L 620 560 L 200 570 L 170 360Z';
  const CC = 'M560 130 L 1120 150 L 1100 340 L 600 330Z';
  const CB = 'M600 330 L 1100 340 L 1120 560 L 620 560Z';
  const cen = { A: [380, 350], B: [860, 450], C: [840, 235] };
  const flagC = (s = 1) => `<g transform="scale(${s})"><rect x="-3" y="-90" width="6" height="92" rx="2" fill="#7A6A55"/><rect x="3" y="-88" width="62" height="40" fill="${C.green}"/><path d="M3 -68 H65" stroke="#FFF6E6" stroke-width="7"/></g>`;
  const crate = (cls) => `<g class="${cls}" opacity="0"><rect x="-32" y="-44" width="64" height="44" rx="5" fill="#FFF8EC" stroke="#D8C6A2" stroke-width="2"/><rect x="-32" y="-30" width="64" height="9" fill="${C.teal}"/><path d="M4 -12 l6 6 l12 -12" stroke="${C.green}" stroke-width="4" fill="none" stroke-linecap="round"/></g>`;
  const smallCow = (i, cls = '') => `<g class="${cls}" opacity="0"><g transform="scale(.34)">${cow(i)}</g></g>`;
  const post = (x, y) => `<g transform="translate(${x} ${y})"><rect x="-14" y="-26" width="28" height="22" rx="3" fill="#FFF6E6" stroke="${C.teal}" stroke-width="3"/><rect x="-17" y="-32" width="34" height="8" rx="2" fill="${C.teal}"/><path d="M14 -10 H40" stroke="${C.red}" stroke-width="5" stroke-linecap="round"/></g>`;
  const pen = `<g><rect x="-58" y="-34" width="116" height="68" rx="6" fill="#F7EBDD" fill-opacity=".25" stroke="#8A5A2B" stroke-width="5" stroke-dasharray="10 6"/></g>`;
  const stallIcon = `<g><path d="M-46 -10 L46 -10 L38 -36 L-38 -36Z" fill="${C.terracotta}"/><rect x="-42" y="-10" width="6" height="40" fill="#7A6A55"/><rect x="36" y="-10" width="6" height="40" fill="#7A6A55"/><rect x="-44" y="16" width="88" height="10" rx="3" fill="#A9733F"/></g>`;
  const meatIcon = `<g><path d="M-26 -4 Q -28 -22 -6 -24 Q 18 -26 26 -8 Q 30 10 10 16 Q -16 20 -26 -4Z" fill="#D47A6B"/><path d="M-12 -10 Q 0 -16 12 -8" stroke="#F2DCCB" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="14" cy="4" r="5" fill="#F2DCCB"/></g>`;
  const milkIcon = `<g><path d="M-16 -26 H16 L22 -14 V24 Q 0 32 -22 24 V-14Z" fill="#E3E8E6" stroke="#A8BDB9" stroke-width="3"/><rect x="-12" y="-34" width="24" height="10" rx="3" fill="#A8BDB9"/><path d="M-22 0 H22" stroke="#FFFFFF" stroke-width="6"/></g>`;
  const hideIcon = `<g><path d="M-24 -24 Q -10 -16 0 -26 Q 10 -16 24 -24 Q 18 -4 26 8 Q 12 10 10 26 Q 0 18 -10 26 Q -12 10 -26 8 Q -18 -4 -24 -24Z" fill="#B07850" stroke="#8A5A2B" stroke-width="2"/></g>`;
  const ship = `<g><path d="M-50 0 H50 L38 22 H-38Z" fill="#3E5A73"/><rect x="-26" y="-22" width="40" height="22" fill="#E9DFC9"/><rect x="18" y="-34" width="10" height="34" fill="#C4572E"/></g>`;
  const envelope = ic.envelope;
  const badgeCard = (cls, key, icon) => g1(cls, `${card(300, 84)}<g transform="translate(-112 0) scale(.8)">${icon}</g><text x="30" y="9" text-anchor="middle" font-size="22" font-weight="800" fill="${C.ink}" data-t="${key}" data-wrap="16" data-lh="24"></text>`);
  const mapBg = () => `${board()}<rect x="1150" width="130" height="720" fill="#CFE6EA"/><path d="M1150 0 V720" stroke="#B9D9DE" stroke-width="4"/>${[150, 300, 450, 600].map((y) => `<path d="M1180 ${y} q 12 -8 24 0 t 24 0" stroke="#FFFFFF" stroke-width="3" fill="none"/>`).join('')}`;
  const lens = `<g><circle r="30" fill="#CFE6EA" fill-opacity=".35" stroke="#3E3729" stroke-width="6"/><path d="M21 21 L46 46" stroke="#3E3729" stroke-width="10" stroke-linecap="round"/></g>`;
  const travel = (el, t, t0, t1, a, b, arc = 40, s = 1, fade = true) => {
    const m = prog(t, t0, t1, ease.inOut); tf(el, lerp(a[0], b[0], m), lerp(a[1], b[1], m) - Math.sin(m * Math.PI) * arc, s);
    op(el, prog(t, t0 - 0.2, t0) * (fade ? 1 - prog(t, t1 + 0.6, t1 + 1) : 1));
  };
  S.ecomap = {
    build: () => `${mapBg()}
      <g class="lands">
        <path class="land la" d="${CA}" fill="#EBCB98" stroke="#FBF1DF" stroke-width="8" stroke-linejoin="round"/>
        <path class="land lc" d="${CC}" fill="#D9C99A" stroke="#FBF1DF" stroke-width="8" stroke-linejoin="round"/>
        <path class="land lb" d="${CB}" fill="#E3C49B" stroke="#FBF1DF" stroke-width="8" stroke-linejoin="round"/>
        <path class="hot" d="M600 330 L 1100 340 L 1120 560 L 620 560Z" fill="${C.red}" opacity="0"/>
        <g transform="translate(200 260)">${flagA(0.6)}</g><g transform="translate(1040 250)">${flagC(0.6)}</g><g transform="translate(1040 530)">${flagB(0.6)}</g>
      </g>
      <g class="postsG" opacity="0">${post(603, 395)}${post(609, 460)}${post(615, 525)}</g>
      <g class="stallG" opacity="0" transform="translate(880 470)">${stallIcon}</g>
      ${[0, 1, 2, 3, 4, 5].map((i) => smallCow(i % 5, 'mc mc' + i)).join('')}
      ${[0, 1, 2].map((i) => g1('mcr mcr' + i, `<g transform="scale(.8)">${crate('').replace('opacity="0"', '')}</g>`)).join('')}
      ${[0, 1, 2, 3].map((i) => virus('vv vv' + i)).join('')}
      <g class="herderG" opacity="0"><g transform="scale(.48)">${person('moussa')}</g></g>
      <g class="penG" opacity="0">${pen}</g>
      <g class="ringG" opacity="0"><circle r="120" fill="${C.red}" fill-opacity=".12" stroke="${C.red}" stroke-width="5" stroke-dasharray="14 9"/></g>
      ${[0, 1, 2, 3].map((i) => g1('env env' + i, envelope)).join('')}
      ${[0, 1].map((i) => g1('rx rx' + i, ic.redX)).join('')}
      ${[0, 1, 2].map((i) => check('mk mk' + i)).join('')}
      ${g1('lensM', lens)}${g1('askM', ic.ask)}
      ${[meatIcon, milkIcon, hideIcon].map((icon, i) => g1('prod prod' + i, `<circle r="40" fill="#FFF8EC" filter="url(#f-shadow)"/>${icon}${label('products.' + i, 66, 14, 20)}`)).join('')}
      ${g1('shipG', ship)}
      ${g1('regCard', `${card(660, 200)}<text y="-48" text-anchor="middle" font-size="28" font-weight="800" fill="${C.ink}" data-t="reg"></text>${[0, 1, 2].map((i) => `<g transform="translate(${(i - 1) * 190} 30)"><rect x="-82" y="-26" width="164" height="52" rx="26" fill="${['#E7F4EA', '#F7EBDD', '#EAF0F7'][i]}"/><text y="8" text-anchor="middle" font-size="22" font-weight="700" fill="${C.ink}" data-t="pillars.${i}"></text></g>`).join('')}`)}
      ${[0, 1, 2].map((i) => chip('stage st' + i, 220, 'stages.' + i, { fill: C.teal, color: '#FFF6E6' })).join('')}
      <g class="arrows" opacity="0">${[0, 1].map((i) => `<path d="M${520 + i * 240} 440 h 30 m -10 -10 l 10 10 l -10 10" stroke="${C.teal}" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('')}</g>
      ${chip('healthc', 400, 'health', { fill: '#FFF0EE', color: C.red })}
      ${g1('mutualCard', `${card(380, 150)}<g transform="translate(-120 40)">${flagA(0.6)}</g><g transform="translate(0 -4)">${ic.eq}</g><g transform="translate(80 40)">${flagB(0.6)}</g>`)}
      ${chip('freec', 300, 'freeLbl', { fill: C.green, color: '#FFF6E6' })}${chip('mutc', 340, 'mutual', { fill: '#FFF8EC' })}
      ${[0, 1, 2].map((i) => chip('rt rt' + i, 260, 'rights.' + i, { fill: '#EAF0F7', color: C.indigo })).join('')}
      ${chip('postsc', 280, 'posts', { fill: C.teal, color: '#FFF6E6' })}${chip('notc', 440, 'notifiable', { fill: C.red, color: '#FFF6E6', size: 21 })}
      ${chip('quarc', 240, 'quarantine', { fill: '#F7EBDD' })}${chip('reasc', 300, 'reasons', { fill: '#FFF8EC' })}
      ${chip('season0', 230, 'seasons.0', { fill: '#F9E3BF' })}${chip('season1', 260, 'seasons.1', { fill: '#DCEAF2' })}
      ${g1('transCard', `${card(330, 150)}<g transform="translate(-112 0)">${ic.doc}</g><text x="30" y="0" text-anchor="middle" font-size="22" font-weight="800" fill="${C.ink}" data-t="transCert" data-wrap="16" data-lh="26"></text>`)}
      ${chip('marketc', 200, 'market', { fill: '#FFF8EC' })}${chip('perc', 300, 'perimeter', { fill: C.red, color: '#FFF6E6' })}
      ${badgeCard('commB', 'commission', ic.globe)}${badgeCard('woahB', 'woah', `<g transform="translate(0 4) scale(.6)"><path d="M-20 -24 L 24 -24 Q 30 0 18 22 L -14 22 Q -26 0 -20 -24Z" fill="#A86F45"/><circle cx="-6" cy="-8" r="3" fill="#1D140E"/><circle cx="10" cy="-8" r="3" fill="#1D140E"/></g>`)}
      ${chip('netc', 280, 'alertNet', { fill: C.teal, color: '#FFF6E6' })}${chip('eradc', 300, 'eradicated', { fill: C.green, color: '#FFF6E6' })}${chip('restc', 380, 'restricted', { fill: C.red, color: '#FFF6E6' })}
      ${chip('certc', 300, 'certShort', { fill: '#FFF8EC', tx: 18, icon: `<g transform="translate(-118 0) scale(.6)">${ic.doc}</g>` })}
      ${chip('orig', 300, 'origin', { fill: '#FFF8EC' })}${chip('disf', 330, 'disinfection', { fill: '#FFF8EC' })}${chip('expc', 200, 'export', { fill: '#3E5A73', color: '#FFF6E6' })}`,
    init(g) {
      this.g = g; const q = (s) => g.querySelector(s), qa = (s) => [...g.querySelectorAll(s)];
      this.lands = q('.lands'); this.la = q('.la'); this.lb = q('.lb'); this.lc = q('.lc'); this.hot = q('.hot');
      ['postsG', 'stallG', 'herderG', 'penG', 'ringG', 'lensM', 'askM', 'shipG', 'regCard', 'arrows', 'healthc', 'mutualCard', 'freec', 'mutc', 'postsc', 'notc', 'quarc', 'reasc', 'season0', 'season1', 'transCard', 'marketc', 'perc', 'commB', 'woahB', 'netc', 'eradc', 'restc', 'certc', 'orig', 'disf', 'expc'].forEach((k) => (this[k] = q('.' + k)));
      this.mc = qa('.mc'); this.mcr = qa('.mcr'); this.vv = qa('.vv'); this.env = qa('.env'); this.rx = qa('.rx'); this.mk = qa('.mk'); this.prod = qa('.prod');
      this.stage = qa('.stage'); this.rt = qa('.rt'); this.all = qa('.ecomap-x');
      this.herderPerson = q('.herderG .person'); prepPerson(this.herderPerson); this.mc.forEach((m) => { m._cow = m.querySelector('.cow'); prepCow(m._cow); });
      this.over = [this.postsG, this.stallG, this.herderG, this.penG, this.ringG, this.lensM, this.askM, this.shipG, this.regCard, this.arrows, this.healthc, this.mutualCard, this.freec, this.mutc, this.postsc, this.notc, this.quarc, this.reasc, this.season0, this.season1, this.transCard, this.marketc, this.perc, this.commB, this.woahB, this.netc, this.eradc, this.restc, this.certc, this.orig, this.disf, this.expc, ...this.mc, ...this.mcr, ...this.vv, ...this.env, ...this.rx, ...this.mk, ...this.prod, ...this.stage, ...this.rt];
    },
    update(t, idle, variant) {
      this.over.forEach((el) => op(el, 0));
      op(this.lands, 1); op(this.hot, 0);
      ['la', 'lb', 'lc'].forEach((k) => this[k].setAttribute('fill', { la: '#EBCB98', lb: '#E3C49B', lc: '#D9C99A' }[k]));
      const cowAt = (i, x, y, walk = 0, flip = false) => { const m = this.mc[i]; op(m, 1); tf(m, x, y, 1, 0, flip ? -1 : 1); poseCow(m._cow, 0, 0, 1, walk, t * 7 + i, idle); };
      const V = variant || 'region';
      if (V === 'region') {
        const dim = prog(t, 7.0, 7.8); op(this.lands, 1 - dim * 0.65);
        [[cen.A, cen.B, 0.6], [cen.A, cen.C, 1.4], [cen.C, cen.B, 2.2]].forEach(([a, b, t0], i) => {
          const m = ((t - t0) / 3.2) % 1, u = t > t0 ? ease.inOut(m) : 0;
          const x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u) - Math.sin(u * Math.PI) * 30;
          cowAt(i, x, y + 16, 1, a[0] > b[0]); op(this.mc[i], prog(t, t0, t0 + 0.3) * (1 - dim));
          op(this.mcr[i], prog(t, t0 + 0.3, t0 + 0.6) * (1 - dim)); tf(this.mcr[i], x + 40, y);
        });
        pop(this.regCard, t, 7.4, 640, 230);
        this.stage.forEach((s, i) => pop(s, t, 14.8 + i * 0.6, 400 + i * 240, 440)); op(this.arrows, prog(t, 15.4, 16));
        pop(this.healthc, t, 17.8, 640, 540);
      } else if (V === 'free') {
        // a certified crate and a cow go from A to B without stopping
        [0, 1].forEach((i) => { const m = prog(t, 0.8 + i * 0.5, 5.6 + i * 0.5, ease.inOut); const x = lerp(380, 880, m), y = lerp(430, 470, m);
          if (i === 0) { op(this.mcr[0], prog(t, 0.6, 0.9)); tf(this.mcr[0], x, y - 30); } else cowAt(0, x - 60, y + 20, m > 0 && m < 1 ? 1 : 0); });
        pop(this.mk[0], t, 6.0, 900, 380, 0.01); pop(this.freec, t, 1.2, 640, 90); op(this.freec, prog(t, 1.2, 1.4) * (1 - prog(t, 14, 14.4)));
        pop(this.mutualCard, t, 7.8, 640, 260); pop(this.mutc, t, 8.4, 640, 368); op(this.mutualCard, prog(t, 7.8, 8) * (1 - prog(t, 14, 14.4))); op(this.mutc, prog(t, 8.4, 8.6) * (1 - prog(t, 14, 14.4)));
        this.rt.forEach((r, i) => pop(r, t, 14.6 + i * 1.6, 360 + i * 280, 90));
      } else if (V === 'posts') {
        op(this.postsG, prog(t, 0.6, 1.2)); pop(this.postsc, t, 1.2, 640, 90); op(this.postsc, prog(t, 1.2, 1.4) * (1 - prog(t, 6.6, 6.9)));
        const arrive = prog(t, 1.6, 5.6, ease.out), toPen = prog(t, 9.0, 11.0, ease.inOut);
        [0, 1, 2].forEach((i) => cowAt(i, lerp(330, 548, arrive) - i * 46 + toPen * (215 + i * 20), 470 + (i % 2) * 14 + toPen * 14, arrive > 0 && arrive < 1 || toPen > 0 && toPen < 1 ? 1 : 0));
        [0, 1, 2].forEach((i) => { const p = prog(t, 7.0 + i * 0.25, 7.45 + i * 0.25, ease.back); op(this.vv[i], prog(t, 7.0 + i * 0.25, 7.2 + i * 0.25)); tf(this.vv[i], 520 - i * 46 + toPen * (215 + i * 20), 446, Math.max(0.01, p) * 0.55); });
        pop(this.rx[0], t, 7.8, 609, 410, 0.01); op(this.rx[0], prog(t, 7.8, 8) * (1 - prog(t, 9, 9.3)));
        pop(this.notc, t, 7.0, 640, 90); op(this.notc, prog(t, 7, 7.2) * (1 - prog(t, 13.2, 13.5))); pop(this.penG, t, 8.8, 720, 485, 0.8); pop(this.quarc, t, 10.4, 820, 415);
        fly(this.env[0], t, 13.8, 15.4, [880, 470], [380, 300], 80); pop(this.reasc, t, 14.8, 640, 90);
      } else if (V === 'trans') {
        this.la.setAttribute('fill', '#F0D19E'); this.lb.setAttribute('fill', '#CFE0B4'); this.lc.setAttribute('fill', '#D6E3B8');
        op(this.postsG, prog(t, 0.4, 0.9));
        const go = prog(t, 0.8, 14.0, ease.inOut), x = lerp(260, 900, go), y = lerp(240, 470, go) - Math.sin(go * Math.PI) * 30;
        [0, 1, 2].forEach((i) => cowAt(i, x - i * 50, y + 30 + (i % 2) * 12, go > 0 && go < 1 ? 1 : 0));
        op(this.herderG, prog(t, 0.6, 1)); tf(this.herderG, x - 160, y + 50); posePerson(this.herderPerson, 0, 0, 1, go > 0 && go < 1 ? 1 : 0, t * 7.5, idle);
        pop(this.season0, t, 0.8, 330, 110); op(this.season0, prog(t, 0.8, 1) * (1 - prog(t, 6.6, 7)));
        pop(this.season1, t, 7.0, 860, 300); op(this.season1, prog(t, 7, 7.2) * (1 - prog(t, 14, 14.4)));
        pop(this.mk[0], t, 9.6, 609, 400, 0.01);
        pop(this.transCard, t, 14.8, 860, 190);
      } else if (V === 'outbreak' || V === 'outbreakBad') {
        const bad = V === 'outbreakBad';
        op(this.stallG, 1); pop(this.marketc, t, 0.6, 880, 380); op(this.marketc, prog(t, 0.6, 0.8) * (1 - prog(t, 18, 18.3)));
        cowAt(0, 820, 520); cowAt(1, 950, 530, 0, true);
        [0, 1].forEach((i) => pop(this.vv[i], t, 2.2 + i * 0.4, [820, 950][i], 470, 0.01));
        pop(this.notc, t, 7.4, 640, 90); op(this.notc, prog(t, 7.4, 7.6) * (1 - prog(t, 18, 18.3)));
        pop(this.askM, t, 8.2, 1000, 400); op(this.askM, prog(t, 8.2, 8.4) * (1 - prog(t, 18, 18.3)));
        if (bad) {
          [2, 3].forEach((i, k) => { const m = prog(t, 18.4 + k * 0.4, 20.6 + k * 0.4, ease.inOut); const to = [cen.A, cen.C][k]; op(this.vv[i], prog(t, 18.4, 18.6)); tf(this.vv[i], lerp(880, to[0], m), lerp(470, to[1], m), 0.9); });
          const red = prog(t, 19, 21.5); op(this.hot, red * 0.35);
          pop(this.rx[0], t, 22.6, 610, 450, 0.01); pop(this.rx[1], t, 23.0, 850, 335, 0.01); op(this.lb, 1 - prog(t, 22.6, 23.4) * 0.4);
          pop(this.restc, t, 23.6, 860, 400);
        } else {
          op(this.ringG, prog(t, 18.3, 18.9) * (1 - prog(t, 38.8, 39.6))); tf(this.ringG, 885, 500, lerp(1.3, 1, prog(t, 18.3, 19.1, ease.out)));
          pop(this.perc, t, 18.8, 880, 350); op(this.perc, prog(t, 18.8, 19) * (1 - prog(t, 25, 25.3)));
          pop(this.commB, t, 25.2, 300, 80); pop(this.woahB, t, 25.6, 980, 80); pop(this.netc, t, 25.8, 640, 160); op(this.netc, prog(t, 25.8, 26) * (1 - prog(t, 32, 32.3)));
          [[300, 80], [980, 80], cen.A, cen.C].forEach((to, i) => fly(this.env[i], t, 26 + i * 0.5, 27.4 + i * 0.5, [880, 460], to, 70));
          // only the area around the market is restricted; trade from A to C goes on
          const tr = prog(t, 32.6, 39.6, ease.inOut); op(this.mcr[0], prog(t, 32.6, 32.9) * (1 - prog(t, 39.4, 39.8))); tf(this.mcr[0], lerp(380, 840, tr), lerp(300, 235, tr) - Math.sin(tr * Math.PI) * 30);
          pop(this.mk[0], t, 39.8, 840, 180, 0.01);
          [0, 1].forEach((i) => op(this.vv[i], prog(t, 2.2 + i * 0.4, 2.4 + i * 0.4) * (1 - prog(t, 38.6, 39.2))));
          pop(this.eradc, t, 39.4, 880, 380);
        }
      } else if (V === 'products') {
        this.prod.forEach((p, i) => { const m = prog(t, 0.8 + i * 1.2, 6.4 + i * 1.2, ease.inOut); pop(p, t, 0.4 + i * 1.0, lerp(300, 740 + i * 130, m), lerp(250 + i * 110, 430, m)); });
        pop(this.certc, t, 7.8, 640, 110); op(this.certc, prog(t, 7.8, 8) * (1 - prog(t, 14, 14.3)));
        [0, 1, 2].forEach((i) => pop(this.mk[i], t, 8.6 + i * 0.6, 776 + i * 130, 396, 0.01));
        op(this.shipG, prog(t, 14.4, 14.9)); tf(this.shipG, 1215, 330 - Math.sin(idle * 1.5) * 4);
        if (t > 14.4) { const m = prog(t, 14.8, 17.2, ease.inOut); tf(this.prod[2], lerp(1000, 1210, m), lerp(430, 290, m) - Math.sin(m * Math.PI) * 60, lerp(1, 0.6, m)); op(this.prod[2], 1 - prog(t, 17.0, 17.3)); op(this.mk[2], 1 - prog(t, 14.4, 14.8)); }
        pop(this.orig, t, 17.4, 860, 150); pop(this.disf, t, 18.4, 860, 215); pop(this.expc, t, 15.0, 1170, 400); pop(this.mk[1], t, 19.4, 1215, 270, 0.01);
      }
    },
  };

  // ---------- explainer cards: principles, who does what, operators, outreach, the four rules ----------
  const cardRow = (n, keys, icons, fills, w = 250, h = 236) => icons.map((icon, i) => g1('crd crd' + i, `${card(w, h)}<circle cy="-46" r="54" fill="${fills[i]}"/><g transform="translate(0 -46)">${icon}</g>${label(keys + '.' + i, 58, 14, 22)}`)).join('');
  const cardsScene = (keys, icons, fills, at, head, extra = '') => ({
    build: () => `${board()}${head ? chip('hd', 520, head, { fill: C.teal, color: '#FFF6E6' }) : ''}${cardRow(icons.length, keys, icons, fills)}${extra}`,
    init(g) { this.hd = g.querySelector('.hd'); this.cards = [...g.querySelectorAll('.crd')]; this.g = g; if (this.initX) this.initX(g); },
    update(t, idle) {
      if (this.hd) pop(this.hd, t, 0.3, 640, 90);
      const n = this.cards.length, gap = n === 4 ? 283 : 330, x0 = 640 - ((n - 1) * gap) / 2;
      this.cards.forEach((c, i) => pop(c, t, at[i], x0 + i * gap, 380));
      if (this.updateX) this.updateX(t, idle);
    },
  });
  const building = `<g><path d="M-34 -10 L0 -34 L34 -10Z" fill="${C.teal}"/><rect x="-30" y="-10" width="60" height="38" fill="#FFF8EC" stroke="${C.teal}" stroke-width="3"/><rect x="-8" y="8" width="16" height="20" fill="${C.teal}"/><rect x="-24" y="-2" width="10" height="10" fill="#BFE3E6"/><rect x="14" y="-2" width="10" height="10" fill="#BFE3E6"/></g>`;
  const vetBust = (badge) => `<g><circle cy="-14" r="15" fill="${C.skin2}"/><path d="M-15 -26 Q -14 -38 2 -38 Q 18 -38 16 -26Z" fill="${C.teal}"/><path d="M-30 30 Q -30 2 0 2 Q 30 2 30 30Z" fill="#F7F5EE" stroke="#DDDACB" stroke-width="2"/>${badge}</g>`;
  const network = `<g stroke="${C.indigo}" stroke-width="3">${[[-28, -18], [26, -22], [0, 22], [-30, 22], [30, 18]].map(([x, y]) => `<path d="M0 0 L${x} ${y}"/>`).join('')}</g>${[[0, 0], [-28, -18], [26, -22], [0, 22], [-30, 22], [30, 18]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i ? 7 : 10}" fill="${i ? '#7F95AE' : C.indigo}"/>`).join('')}`;
  const truckIcon = `<g><rect x="-34" y="-18" width="44" height="30" rx="3" fill="#E3E8E6" stroke="#A8BDB9" stroke-width="2"/><path d="M10 12 V-10 H24 L34 2 V12Z" fill="${C.teal}"/><circle cx="-20" cy="16" r="7" fill="#2A2420"/><circle cx="22" cy="16" r="7" fill="#2A2420"/></g>`;
  const cowHead = `<g transform="translate(0 4) scale(.9)"><path d="M-8 -26 Q -18 -40 -6 -48 M 14 -26 Q 24 -40 12 -48" stroke="#F1E7D3" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M-20 -24 L 24 -24 Q 30 0 18 22 L -14 22 Q -26 0 -20 -24Z" fill="#A86F45"/><circle cx="-6" cy="-8" r="3" fill="#1D140E"/><circle cx="10" cy="-8" r="3" fill="#1D140E"/></g>`;
  const coins = `<g><ellipse cx="0" cy="14" rx="26" ry="8" fill="#C99A2E"/><ellipse cx="0" cy="6" rx="26" ry="8" fill="#E2B33C"/><ellipse cx="0" cy="-2" rx="26" ry="8" fill="#F2C14E"/><path d="M-8 -26 L 0 -38 L 8 -26 Z" fill="${C.green}"/></g>`;
  const people3 = `<g>${[-26, 0, 26].map((x, i) => `<g transform="translate(${x} ${i === 1 ? -6 : 4})"><circle cy="-12" r="11" fill="${['#8A5536', '#6B3E26', '#A0643C'][i]}"/><path d="M-18 22 Q -18 0 0 0 Q 18 0 18 22Z" fill="${[C.terracotta, C.teal, C.indigo][i]}"/></g>`).join('')}</g>`;
  const radio = `<g><rect x="-34" y="-20" width="68" height="44" rx="8" fill="${C.terracotta}"/><circle cx="-12" cy="2" r="12" fill="#FFF6E6"/><circle cx="-12" cy="2" r="5" fill="${C.ink}"/><rect x="6" y="-8" width="20" height="6" rx="2" fill="#FFF6E6"/><rect x="6" y="4" width="20" height="6" rx="2" fill="#FFF6E6"/><path d="M-20 -20 L 18 -40" stroke="${C.ink}" stroke-width="3"/></g>`;
  const phonePlay = `<g><rect x="-20" y="-36" width="40" height="72" rx="8" fill="${C.ink}"/><rect x="-15" y="-28" width="30" height="52" rx="3" fill="#BFE3E6"/><path d="M-5 -10 L 9 -2 L -5 6Z" fill="${C.teal}"/></g>`;
  const bell = `<g><path d="M-22 14 Q -22 -24 0 -26 Q 22 -24 22 14 L 30 22 H -30Z" fill="${C.red}"/><circle cy="28" r="7" fill="${C.red}"/><path d="M-30 -18 q -8 10 0 20 M 30 -18 q 8 10 0 20" stroke="${C.red}" stroke-width="4" fill="none" stroke-linecap="round"/></g>`;
  S.principles = cardsScene('principles', [ic.temple, ic.microscope, ic.shield(0.4), ic.noBarrier], ['#E3F1EE', '#EAF0F7', '#E7F4EA', '#F9E3DF'], [0.6, 7.4, 13.8, 20.2], 'reg');
  S.actors = cardsScene('actors', [building, vetBust(`<circle cx="14" cy="16" r="6" fill="#E2B33C"/>`), vetBust(`<g transform="translate(22 14) scale(.45)">${ic.doc}</g>`), network], ['#E3F1EE', '#EAF0F7', '#F7EBDD', '#EFEDFF'], [0.6, 7.6, 14.8, 21.4], 'reg');
  S.operators = Object.assign(cardsScene('operators', [cowHead, truckIcon, coins, meatIcon], ['#F7EBDD', '#EAF0F7', '#F9EEDA', '#F9E3DF'], [0.6, 1.4, 2.2, 3.0], null,
    `${chip('safec', 300, 'safe', { fill: C.green, color: '#FFF6E6' })}${chip('infc', 380, 'inform', { fill: '#FFF8EC', tx: 20, icon: `<g transform="translate(-150 0) scale(.6)">${ic.envelope}</g>` })}${g1('authB', `<g transform="scale(1.3)">${building}</g>`)}${g1('envO', ic.envelope)}`), {
    initX(g) { ['safec', 'infc', 'authB', 'envO'].forEach((k) => (this[k] = g.querySelector('.' + k))); },
    updateX(t) { pop(this.safec, t, 8.0, 640, 110); op(this.safec, prog(t, 8, 8.2) * (1 - prog(t, 15, 15.3))); pop(this.infc, t, 15.6, 640, 110); pop(this.authB, t, 16.2, 1150, 110); fly(this.envO, t, 16.6, 18.2, [640, 380], [1150, 120], 60); },
  });
  S.outreach = cardsScene('outreach', [people3, radio, phonePlay], ['#E7F4EA', '#F7EBDD', '#E3F1EE'], [0.6, 3.6, 8.0], null);
  S.rules = {
    build: () => `<rect width="1280" height="720" fill="#F7E7C9"/><rect width="1280" height="720" fill="url(#p-dots)"/>
      <text class="rt" x="640" y="118" text-anchor="middle" font-family="Inter Display, Inter, sans-serif" font-size="60" font-weight="800" fill="${C.ink}" letter-spacing="-1" data-t="rulesTitle" opacity="0"></text>
      ${[ic.microscope, `<g transform="scale(.9)">${crate('').replace('opacity="0"', '')}</g><g transform="translate(26 -26) scale(.6)">${ic.eq}</g>`, ic.doc, bell].map((icon, i) => `<g class="rc rc${i}" opacity="0">
        <rect x="-130" y="-170" width="260" height="320" rx="28" fill="#FFF8EC" filter="url(#f-shadow)"/>
        <circle cx="0" cy="-70" r="66" fill="${['#EAF0F7', '#E7F4EA', '#E3F1EE', '#F9E3DF'][i]}"/>
        <g transform="translate(0 -70)">${icon}</g>
        <circle cx="-96" cy="-136" r="22" fill="${C.terracotta}"/><text x="-96" y="-127" text-anchor="middle" font-size="24" font-weight="800" fill="#FFF6E6">${i + 1}</text>
        <text x="0" y="70" text-anchor="middle" font-size="25" font-weight="700" fill="${C.ink}" data-t="rules.${i}" data-wrap="15" data-lh="31"></text>
      </g>`).join('')}`,
    init(g) { this.rt = g.querySelector('.rt'); this.cards = [...g.querySelectorAll('.rc')]; },
    update(t) {
      op(this.rt, prog(t, 0.1, 0.6));
      this.cards.forEach((c, i) => { const p = prog(t, 0.6 + i * 0.8, 1.2 + i * 0.8, ease.back); op(c, prog(t, 0.6 + i * 0.8, 0.9 + i * 0.8)); tf(c, 205 + i * 290, 410 + (1 - p) * 60, lerp(0.85, 1, p)); });
    },
  };

  S.quizbg = quizScene();
  S.recap = recapScene(['syringe', 'certificate', 'barrier']);
  S.end = endScene();

  window.SPS_SCENES = { scenes: S, defs, clamp };
})();

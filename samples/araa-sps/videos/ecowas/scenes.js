// ECOWAS module: Moussa takes his herd across a border. Scenes built from the shared kit (shared/art.js).
(function () {
  const { C, clamp, ease, prog, lerp, tf, op, defs, acacia, landscape, cow, prepCow, poseCow, person, prepPerson, posePerson,
    chip, check, cross, syringe, certificate, receipt, borderPost, barrierArm, virus, titleScene, quizScene, recapScene, endScene } = window.SPS_ART;
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


  S.quizbg = quizScene();
  S.recap = recapScene(['syringe', 'certificate', 'barrier']);
  S.end = endScene();

  window.SPS_SCENES = { scenes: S, defs, clamp };
})();

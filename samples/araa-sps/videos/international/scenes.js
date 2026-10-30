// International standards module: Aïcha's small abattoir sells meat to a coastal city.
// Scenes built from the shared kit (shared/art.js); the art only this module needs is below.
(function () {
  const { C, ease, prog, lerp, tf, op, defs, acacia, landscape, cow, prepCow, poseCow, person, prepPerson, posePerson,
    chip, check, cross, syringe, virus, ICONS, clamp, titleScene, quizScene, recapScene, endScene,
    pop, popOut, board, flagA, flagB, card, label, ic, g1, fly } = window.SPS_ART;
  const S = {};
  const INK = '#4B47A6'; // inspection-stamp ink

  // ---------- module art ----------
  // More people, built like the shared ones (same classes, so prepPerson/posePerson pose them).
  const LOOKS = {
    aicha: { robe: C.terracotta, robe2: '#A9461F', legs: '#3B2A1E', skin: '#7A4429', dress: true,
      hat: `<path d="M-21 -150 Q -25 -184 2 -186 Q 27 -184 21 -150 Q 0 -161 -21 -150Z" fill="${C.teal}"/><path d="M-20 -161 Q 0 -171 21 -161" stroke="#F2C14E" stroke-width="5" fill="none"/><path d="M12 -180 q 16 -12 9 -26 q -12 5 -13 19Z" fill="${C.teal}"/>` },
    buyer: { robe: '#3E7CB1', robe2: '#2F6595', legs: '#2F3A4A', skin: '#5C3420', shirt: true,
      hat: `<path d="M-18 -156 Q -16 -175 2 -175 Q 20 -175 19 -156Z" fill="#2F3A4A"/><path d="M14 -158 L 33 -155 L 16 -151Z" fill="#2F3A4A"/>` },
    buyer2: { robe: '#E9DFC9', robe2: '#D6C9AE', legs: '#55473A', skin: C.skin2, shirt: true,
      hat: `<path d="M-18 -152 Q -19 -171 0 -171 Q 19 -171 18 -152 Q 0 -160 -18 -152Z" fill="#1A120C"/>` },
    mother: { robe: '#7B5EA7', robe2: '#614A8A', legs: '#3B2A1E', skin: '#6B3E26', dress: true,
      hat: `<path d="M-21 -150 Q -25 -186 2 -188 Q 27 -186 21 -150 Q 0 -160 -21 -150Z" fill="#F2C14E"/><path d="M-20 -160 Q 0 -170 21 -160" stroke="#7B5EA7" stroke-width="5" fill="none"/>` },
    worker: { robe: C.teal, robe2: '#17665C', legs: '#EDEDED', skin: '#6B3E26', apron: true,
      hat: `<path d="M-18 -152 Q -17 -175 1 -175 Q 19 -175 18 -152Z" fill="#FFFFFF" stroke="#D9D5C4" stroke-width="2"/>` },
  };
  const personX = (kind, item = '') => {
    const k = LOOKS[kind];
    const body = k.dress ? 'M-33 -8 L -22 -124 Q 0 -134 22 -124 L 35 -8 Q 0 -2 -33 -8Z'
      : k.shirt ? 'M-26 -66 L -22 -124 Q 0 -134 22 -124 L 26 -66 Q 0 -60 -26 -66Z'
        : 'M-30 -36 L -22 -124 Q 0 -134 22 -124 L 32 -36 Q 0 -30 -30 -36Z';
    const leg = (x) => `<g class="p-leg" data-x="${x}" transform="translate(${x} -44)"><rect x="-6" y="0" width="12" height="44" rx="5" fill="${k.legs}"/><rect x="-7" y="38" width="20" height="8" rx="4" fill="#3B2A1E"/></g>`;
    const items = { baby: `<g transform="translate(16 50) rotate(64)"><path d="M-38 -6 Q -36 -26 -6 -24 L 30 -18 Q 44 -4 30 12 L -6 18 Q -36 18 -38 -6Z" fill="#F7F1E4" stroke="#E2D2B2" stroke-width="2"/><path d="M-20 -20 Q -14 0 -20 16 M-4 -22 Q 2 0 -4 18" stroke="#9FC7C9" stroke-width="4" fill="none"/><circle cx="28" cy="-4" r="14" fill="#8A5536"/><path d="M18 -14 Q 30 -26 42 -12" stroke="#F7F1E4" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="33" cy="-2" r="1.8" fill="#140D08"/></g>`, phone: `<rect x="-7" y="46" width="15" height="26" rx="3" fill="#1F2430"/><rect x="-5" y="49" width="11" height="18" rx="1" fill="#7FB7C9"/>` };
    return `<g class="person ${kind}">
      <ellipse cx="0" cy="2" rx="34" ry="7" fill="#5A3A1A" opacity=".16"/>
      <g class="p-body">
        ${leg(-8)}${leg(8)}
        <g class="p-arm back" transform="translate(-10 -118)"><rect x="-6" y="0" width="12" height="56" rx="6" fill="${k.robe2}"/><circle cy="58" r="6.5" fill="${k.skin}"/></g>
        ${k.shirt ? `<path d="M-22 -72 L 22 -72 L 20 -40 L -20 -40Z" fill="${k.legs}"/>` : ''}
        <path d="${body}" fill="${k.robe}"/>
        ${k.dress ? `<path d="M-31 -30 Q 0 -24 33 -30" stroke="#F2C14E" stroke-width="5" fill="none"/><path d="M-29 -46 Q 0 -40 31 -46" stroke="${C.teal}" stroke-width="4" fill="none"/>` : ''}
        ${k.apron ? `<path d="M-17 -112 L 17 -112 L 24 -40 L -22 -40Z" fill="#FFFFFF"/><path d="M-17 -112 Q 0 -128 17 -112" stroke="#FFFFFF" stroke-width="3" fill="none"/>` : ''}
        <rect x="-6" y="-138" width="12" height="12" fill="${k.skin}"/>
        <g class="p-head">
          <circle cx="0" cy="-150" r="18" fill="${k.skin}"/>
          <circle cx="8" cy="-152" r="2.2" fill="#140D08"/>
          <path d="M6 -142 Q 11 -139 15 -143" stroke="#140D08" stroke-width="2" fill="none" stroke-linecap="round"/>
          ${k.hat}
        </g>
        <g class="p-arm front" transform="translate(12 -118)"><rect x="-6" y="0" width="12" height="56" rx="6" fill="${k.robe2}"/><circle cy="58" r="6.5" fill="${k.skin}"/>${items[item] || ''}</g>
      </g>
    </g>`;
  };
  const prep = (g, sel) => { const p = g.querySelector(sel); prepPerson(p); return p; };

  const snowflake = (s = 1, fill = C.teal) => `<g transform="scale(${s})" stroke="${fill}" stroke-width="4" stroke-linecap="round">${[0, 60, 120].map((a) => `<g transform="rotate(${a})"><path d="M0 -22 V22"/><path d="M-6 -16 L0 -10 L6 -16 M-6 16 L0 10 L6 16"/></g>`).join('')}</g>`;
  const stampMark = (s = 1) => `<g transform="scale(${s}) rotate(-12)"><ellipse rx="34" ry="22" fill="none" stroke="${INK}" stroke-width="4.5"/><path d="M-12 0 L-3 9 L14 -9" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;

  const abattoir = (x) => `<g transform="translate(${x} 0)">
      <rect x="0" y="340" width="360" height="220" fill="#F1E4CB"/>
      <rect x="-10" y="318" width="380" height="28" rx="4" fill="${C.terracotta}"/>
      <rect x="22" y="380" width="70" height="54" rx="4" fill="#9FC7C9" stroke="#C9B48E" stroke-width="5"/>
      <rect x="268" y="380" width="70" height="54" rx="4" fill="#9FC7C9" stroke="#C9B48E" stroke-width="5"/>
      <rect x="130" y="420" width="100" height="140" fill="#E9EEEC" stroke="#C9B48E" stroke-width="6"/>
      <path d="M133 452 H227 M133 484 H227 M133 516 H227 M163 423 V557 M197 423 V557" stroke="#D3DCD8" stroke-width="2"/>
      <rect x="104" y="306" width="6" height="14" fill="#7A6A55"/><rect x="250" y="306" width="6" height="14" fill="#7A6A55"/>
      <rect x="62" y="258" width="236" height="50" rx="8" fill="${C.teal}" filter="url(#f-shadow)"/>
      <text x="180" y="292" text-anchor="middle" font-size="24" font-weight="800" fill="#FFF6E6" letter-spacing="2" data-t="abattoir"></text>
    </g>`;
  const crate = (cls) => `<g class="${cls}" opacity="0"><rect x="-32" y="-44" width="64" height="44" rx="5" fill="#FFF8EC" stroke="#D8C6A2" stroke-width="2"/><rect x="-32" y="-30" width="64" height="9" fill="${C.teal}"/>${`<g transform="translate(14 -12)">${stampMark(0.32)}</g>`}</g>`;
  // Vehicles: origin at the rear wheel-line on the ground, driving right. Wheels turn by distance.
  const wheel = (x) => `<g class="wheel" data-x="${x}" transform="translate(${x} -24)"><circle r="24" fill="#2A2420"/><circle r="10" fill="#A9A39A"/><path d="M0 -10 V10 M-10 0 H10" stroke="#5E5545" stroke-width="3"/></g>`;
  const reefer = (cls) => `<g class="${cls}">
      <ellipse cx="190" cy="2" rx="200" ry="10" fill="#5A3A1A" opacity=".16"/>
      <rect x="0" y="-186" width="262" height="150" rx="8" fill="#F4F6F4" stroke="#D5DCDA" stroke-width="3"/>
      <rect x="0" y="-60" width="262" height="10" fill="#D5DCDA"/>
      <circle cx="131" cy="-118" r="40" fill="#E3F1EE"/>${`<g transform="translate(131 -118)">${snowflake(1.2)}</g>`}
      <rect x="228" y="-206" width="40" height="22" rx="4" fill="#C9D2D0"/>
      <path d="M266 -36 V-120 Q 266 -136 282 -136 H330 Q 350 -136 360 -110 L 380 -70 V-36Z" fill="${C.teal}"/>
      <path d="M300 -126 H332 Q 344 -126 350 -110 L 360 -88 H300Z" fill="#BFE3E6"/>
      <rect x="262" y="-42" width="122" height="12" rx="4" fill="#3E3729"/><rect x="-4" y="-42" width="40" height="12" rx="4" fill="#3E3729"/>
      ${wheel(60)}${wheel(200)}${wheel(330)}
    </g>`;
  const pickup = (cls, withCrates = false) => `<g class="${cls}">
      <ellipse cx="130" cy="2" rx="140" ry="9" fill="#5A3A1A" opacity=".16"/>
      ${withCrates ? `<g class="bed-crates">${[[40, -78], [100, -78], [70, -118]].map(([x, y], i) => `<g transform="translate(${x} ${y})"><rect x="-30" y="-40" width="60" height="40" rx="5" fill="#FFF8EC" stroke="#D8C6A2" stroke-width="2"/><rect x="-30" y="-27" width="60" height="8" fill="${C.teal}"/></g>`).join('')}</g>` : ''}
      <rect x="0" y="-80" width="170" height="44" rx="4" fill="#D9A33A"/><rect x="0" y="-84" width="170" height="8" rx="3" fill="#B8862A"/>
      <path d="M170 -36 V-112 Q 170 -122 182 -122 H226 Q 240 -122 248 -104 L 262 -76 V-36Z" fill="#D9A33A"/>
      <path d="M196 -112 H226 Q 234 -112 238 -100 L 246 -82 H196Z" fill="#BFE3E6"/>
      <rect x="-4" y="-42" width="270" height="10" rx="4" fill="#3E3729"/>
      ${wheel(48)}${wheel(214)}
    </g>`;
  const prepVehicle = (g) => { g._wheels = [...g.querySelectorAll('.wheel')]; };
  const poseVehicle = (g, x, y, dist = 0) => { tf(g, x, y); g._wheels.forEach((w) => w.setAttribute('transform', `translate(${w.dataset.x} -24) rotate(${((dist / 24) * 57.3).toFixed(1)})`)); };
  const stall = (x) => `<g transform="translate(${x} 0)">
      <rect x="10" y="420" width="8" height="150" fill="#7A6A55"/><rect x="222" y="420" width="8" height="150" fill="#7A6A55"/>
      <path d="M-6 420 L 246 420 L 232 380 L 8 380Z" fill="${C.terracotta}"/>
      ${[0, 1, 2, 3, 4].map((i) => `<path d="M${8 + i * 45} 380 L ${-6 + i * 50.4} 420 L ${19.2 + i * 50.4} 420 L ${30 + i * 45} 380Z" fill="#FFF6E6"/>`).join('')}
      <rect x="0" y="500" width="240" height="20" rx="4" fill="#A9733F"/><rect x="10" y="520" width="220" height="50" fill="#C8935A"/>
    </g>`;
  const city = () => `<g opacity=".9">
      <rect x="560" y="300" width="110" height="180" fill="#E3C49B"/><rect x="680" y="250" width="90" height="230" fill="#DDB98C"/>
      <rect x="780" y="320" width="130" height="160" fill="#E8CDA6"/><rect x="920" y="230" width="100" height="250" fill="#D9B184"/>
      <rect x="1030" y="290" width="120" height="190" fill="#E3C49B"/><rect x="1160" y="260" width="120" height="220" fill="#DDB98C"/>
      <g fill="#F6E7CC">${Array.from({ length: 30 }, (_, i) => { const cols = [585, 700, 805, 940, 1055, 1185], c = cols[i % 6], r = Math.floor(i / 6); return `<rect x="${c + (r % 2) * 34}" y="${330 + r * 30}" width="20" height="16" rx="2"/>`; }).join('')}</g>
    </g>`;
  const microbe = (cls) => `<g class="${cls}" opacity="0"><circle r="11" fill="#6FA84B"/><circle cx="-4" cy="-3" r="3" fill="#A9D67F"/>${[0, 72, 144, 216, 288].map((a) => `<path d="M0 -11 V-17" stroke="#6FA84B" stroke-width="3" stroke-linecap="round" transform="rotate(${a})"/>`).join('')}</g>`;
  const tiles = (id) => `<defs><pattern id="${id}" width="44" height="44" patternUnits="userSpaceOnUse"><rect width="44" height="44" fill="#F2F5F2"/><path d="M0 0 H44 M0 0 V44" stroke="#DCE4DF" stroke-width="2"/></pattern></defs>`;
  const sparkle = (cls) => `<g class="${cls}" opacity="0"><path d="M0 -16 L4 -4 L16 0 L4 4 L0 16 L-4 4 L-16 0 L-4 -4Z" fill="#FFFFFF" stroke="#BFE3E6" stroke-width="2"/></g>`;

  // ---------- 1. title ----------
  S.title = titleScene();

  // ---------- 2. Aïcha's unit (meet + choice 1) ----------
  const penCows = [[720, 562, .66], [640, 604, .8], [800, 600, .8]];
  S.unit = {
    build: () => `${landscape()}${acacia(80, 500, 1.05)}${acacia(1220, 488, .9)}
      ${abattoir(120)}
      <g class="pen-cows">${[3, 0, 1].map((i) => cow(i)).join('')}</g>
      <g stroke="#8A5A2B" stroke-width="7" stroke-linecap="round">${[580, 660, 740, 820, 900].map((x) => `<path d="M${x} 530 V612"/>`).join('')}<path d="M580 560 H900"/><path d="M580 592 H900"/></g>
      ${personX('aicha')}${personX('buyer')}${personX('buyer2')}
      ${chip('name', 390, 'nameTag', { tail: true })}
      ${chip('buyersc', 330, 'buyers', { fill: C.teal, color: '#FFF6E6' })}
      ${chip('ask', 280, 'question', { tail: true, color: C.terracotta })}
      ${chip('treated', 300, 'treated', { fill: '#E9F3F1', color: C.teal, tx: 20, icon: `<g transform="translate(-112 0) scale(.7)">${syringe}</g>` })}`,
    init(g) {
      this.sun = g.querySelector('.sun'); this.cows = [...g.querySelectorAll('.pen-cows .cow')]; this.cows.forEach(prepCow);
      this.a = prep(g, '.person.aicha'); this.b1 = prep(g, '.person.buyer'); this.b2 = prep(g, '.person.buyer2');
      ['name', 'buyersc', 'ask', 'treated'].forEach((k) => (this[k] = g.querySelector('.' + k)));
    },
    update(t, idle) {
      tf(this.sun, 1000, 140);
      this.cows.forEach((c, i) => { const [x, y, s] = penCows[i]; poseCow(c, x, y, s, 0, 0, idle); });
      const pa = prog(t, 0.3, 2.6, ease.out);
      posePerson(this.a, lerp(250, 520, pa), 646, 1.05, t > 0.3 && t < 2.6 ? 1 - pa * pa : 0, t * 7.5, idle, t > 7 && t < 11.6 ? -40 : null);
      [[this.b1, 1040, 2.6], [this.b2, 1150, 3.0]].forEach(([p, x, t0]) => { const q = prog(t, t0, t0 + 3, ease.out); posePerson(p, lerp(1420, x, q), 652, 1.04, t > t0 && q < 1 ? 1 - q * q : 0, t * 7.5, idle, p === this.b1 && t > 7 ? -30 : null, true); });
      popOut(this.name, t, 1.6, 11.6, 520, 420);
      popOut(this.buyersc, t, 5.8, 11.6, 1095, 400);
      popOut(this.ask, t, 7.2, 11.6, 1095, 330);
      pop(this.treated, t, 12, 790, 540);
    },
  };

  // ---------- 3. the standards: one agreement, three references ----------
  const pillarX = [330, 640, 950], pillarAt = [9.4, 11.9, 14.2];
  const pillarIcon = [
    `<circle r="34" fill="#FFFFFF" stroke="#C9D7E3" stroke-width="4"/><path d="M-16 4 Q -14 -14 4 -14 Q 20 -12 18 2 Q 14 14 -2 14 Q -16 14 -16 4Z" fill="#D47A6B"/><path d="M-6 -4 Q 2 -8 8 -2" stroke="#F2DCCB" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    `<path d="M-8 -26 Q -18 -40 -6 -48 M 14 -26 Q 24 -40 12 -48" stroke="#F1E7D3" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M-20 -24 L 24 -24 Q 30 0 18 22 L -14 22 Q -26 0 -20 -24Z" fill="#A86F45"/><circle cx="-6" cy="-8" r="3" fill="#1D140E"/><circle cx="10" cy="-8" r="3" fill="#1D140E"/><ellipse cx="2" cy="14" rx="12" ry="8" fill="#8A5835"/>`,
    `<path d="M0 30 V-4" stroke="#4E7A2E" stroke-width="5" stroke-linecap="round"/><path d="M0 4 Q -30 -4 -26 -34 Q 4 -30 0 4Z" fill="#6E8B3D"/><path d="M0 -4 Q 28 -14 26 -40 Q -2 -34 0 -4Z" fill="#86A24C"/>`,
  ];
  S.standards = {
    build: () => `<rect width="1280" height="720" fill="#FBF1DF"/><rect width="1280" height="720" fill="url(#p-dots)"/>
      <g class="roof" opacity="0">
        <polygon points="180,240 640,108 1100,240" fill="${C.teal}"/>
        <rect x="160" y="236" width="960" height="58" rx="6" fill="#17665C"/>
        <text x="640" y="276" text-anchor="middle" font-size="28" font-weight="800" fill="#FFF6E6" letter-spacing="1" data-t="sps"></text>
      </g>
      <g class="trade" opacity="0">
        ${[230, 1050].map((x) => `<g transform="translate(${x} 470)"><path d="M-70 -40 L 70 -40 L 58 -74 L -58 -74Z" fill="${C.terracotta}"/><rect x="-62" y="0" width="124" height="16" rx="4" fill="#A9733F"/><rect x="-56" y="16" width="112" height="44" fill="#C8935A"/><rect x="-60" y="-40" width="6" height="40" fill="#7A6A55"/><rect x="54" y="-40" width="6" height="40" fill="#7A6A55"/></g>`).join('')}
        <path class="lane" d="M320 440 Q 640 300 960 440" stroke="#D9BC8C" stroke-width="6" fill="none" stroke-dasharray="4 14" stroke-linecap="round"/>
        <g class="tcrate"><rect x="-26" y="-36" width="52" height="36" rx="5" fill="#FFF8EC" stroke="#D8C6A2" stroke-width="2"/><rect x="-26" y="-25" width="52" height="7" fill="${C.teal}"/></g>
      </g>
      ${pillarX.map((x, i) => `<g class="pillar p${i}" opacity="0">
        <rect x="${x - 125}" y="310" width="250" height="250" rx="16" fill="#FFF8EC" filter="url(#f-shadow)"/>
        <rect x="${x - 125}" y="310" width="250" height="14" rx="6" fill="${['#C9D7E3', '#E7C9A6', '#C9DDB5'][i]}"/>
        <g transform="translate(${x} 388)">${pillarIcon[i]}</g>
        <text x="${x}" y="474" text-anchor="middle" font-size="25" font-weight="800" fill="${C.ink}" data-t="pillars.${i}" data-wrap="12" data-lh="28"></text>
        <text x="${x}" y="532" text-anchor="middle" font-size="20" font-weight="650" fill="${C.teal}" data-t="pillarSub.${i}"></text>
      </g>`).join('')}
      <g class="base" opacity="0"><rect x="150" y="560" width="980" height="24" rx="4" fill="#E7D2AE"/><rect x="120" y="584" width="1040" height="24" rx="4" fill="#DCC39A"/></g>`,
    init(g) {
      this.roof = g.querySelector('.roof'); this.trade = g.querySelector('.trade'); this.tcrate = g.querySelector('.tcrate'); this.lane = g.querySelector('.lane');
      this.pillars = [...g.querySelectorAll('.pillar')]; this.base = g.querySelector('.base'); this.len = this.lane.getTotalLength();
    },
    update(t) {
      const pr = prog(t, 0.4, 1.3, ease.back); op(this.roof, prog(t, 0.4, 0.7)); this.roof.setAttribute('transform', `translate(640 240) scale(${lerp(0.7, 1, pr).toFixed(3)}) translate(-640 -240)`);
      op(this.base, prog(t, 0.6, 1.1));
      op(this.trade, prog(t, 1.4, 1.9) * (1 - prog(t, 8.4, 9.0)));
      const u = ((t - 1.4) * 0.28) % 1, pt = this.lane.getPointAtLength(Math.max(0, u) * this.len); tf(this.tcrate, pt.x, pt.y - 4);
      this.pillars.forEach((p, i) => { const q = prog(t, pillarAt[i], pillarAt[i] + 0.6, ease.back); op(p, prog(t, pillarAt[i], pillarAt[i] + 0.25)); p.setAttribute('transform', `translate(0 ${((1 - q) * 70).toFixed(1)})`); });
    },
  };

  // ---------- 4. lab check (wrong answer 1) ----------
  S.lab = {
    build: () => `${tiles('p-tiles-lab')}<rect width="1280" height="720" fill="url(#p-tiles-lab)"/><rect y="590" width="1280" height="130" fill="#C9D6D3"/>
      <g><rect x="90" y="150" width="300" height="14" rx="4" fill="#B98B57"/>${[130, 180, 230, 300, 350].map((x, i) => `<rect x="${x - 12}" y="${108 - (i % 2) * 10}" width="24" height="${42 + (i % 2) * 10}" rx="5" fill="${['#CFE8E4', '#F6E7CC', '#E3F1EE'][i % 3]}" stroke="#A8BDB9" stroke-width="2"/>`).join('')}</g>
      ${person('vet')}${personX('buyer', 'phone')}
      <g class="bench"><rect x="110" y="566" width="720" height="22" rx="4" fill="#A9733F"/><rect x="130" y="588" width="680" height="80" fill="#C8935A"/><rect x="130" y="622" width="680" height="4" fill="#B07D48"/></g>
      <g class="rack" transform="translate(420 566)"><rect x="-70" y="-30" width="140" height="30" rx="4" fill="#E3E8E6" stroke="#A8BDB9" stroke-width="2"/>
        ${[-40, 0, 40].map((x, i) => `<g transform="translate(${x} 0)"><rect x="-10" y="-96" width="20" height="90" rx="10" fill="#FFFFFF" fill-opacity=".7" stroke="#A8BDB9" stroke-width="2"/><rect x="-8" y="-50" width="16" height="42" rx="8" fill="#CFE8E4"/>${i === 1 ? '<rect class="tube-red" x="-8" y="-50" width="16" height="42" rx="8" fill="#D64534" opacity="0"/>' : ''}</g>`).join('')}</g>
      <g class="meat" transform="translate(660 566)"><rect x="-56" y="-62" width="112" height="62" rx="6" fill="#FFF8EC" stroke="#D8C6A2" stroke-width="2"/><rect x="-56" y="-46" width="112" height="10" fill="${C.teal}"/><g transform="translate(26 -18)">${stampMark(0.4)}</g></g>
      ${cross('xmark')}
      ${chip('resid', 300, 'residues', { fill: C.red, color: '#FFF6E6' })}
      ${chip('refusedc', 260, 'refused', { fill: C.red, color: '#FFF6E6' })}
      ${chip('cancel', 320, 'cancelled', { tail: true, color: C.red })}`,
    init(g) {
      this.v = prep(g, '.person.vet'); this.b = prep(g, '.person.buyer'); this.red = g.querySelector('.tube-red');
      ['xmark', 'resid', 'refusedc', 'cancel'].forEach((k) => (this[k] = g.querySelector('.' + k)));
    },
    update(t, idle) {
      posePerson(this.v, 250, 650, 1.04, 0, 0, idle, t > 0.6 && t < 3 ? -70 : null);
      posePerson(this.b, 1030, 652, 1.04, 0, 0, idle, t > 5.4 ? -150 : null, true);
      op(this.red, prog(t, 1.0, 1.7));
      pop(this.resid, t, 1.8, 400, 400);
      pop(this.xmark, t, 4.6, 722, 498); op(this.xmark, prog(t, 4.6, 4.8));
      pop(this.refusedc, t, 5.0, 680, 420);
      pop(this.cancel, t, 6.4, 1030, 410);
    },
  };

  // ---------- 5. hygiene at the abattoir ----------
  const carcassX = [790, 950, 1110];
  const carcass = `<g><path d="M0 -10 V 18" stroke="#8B8F94" stroke-width="5"/><path d="M0 18 q -10 6 -2 14" stroke="#8B8F94" stroke-width="4" fill="none"/>
      <path d="M-8 30 C 10 28 16 52 22 80 C 48 122 62 190 54 252 C 48 300 30 334 0 340 C -32 334 -48 300 -48 250 C -50 186 -34 120 -18 84 C -14 62 -22 34 -8 30Z" fill="#D47A6B"/><ellipse cx="2" cy="36" rx="12" ry="9" fill="#F2DCCB"/>
      <path d="M20 96 C 44 130 54 180 50 230 C 48 270 40 304 22 326" stroke="#F2DCCB" stroke-width="11" fill="none" stroke-linecap="round"/>
      <path d="M-30 120 Q 4 112 36 124 M-32 150 Q 4 142 38 154 M-34 180 Q 4 172 38 184 M-32 210 Q 4 202 36 214" stroke="#BE6658" stroke-width="5" fill="none" stroke-linecap="round"/></g>`;
  S.hygiene = {
    build: () => `${tiles('p-tiles-hy')}<rect width="1280" height="720" fill="url(#p-tiles-hy)"/><rect y="590" width="1280" height="130" fill="#C9D6D3"/><path d="M0 652 H1280" stroke="#B5C5C1" stroke-width="3"/>
      <rect x="680" y="140" width="560" height="12" rx="5" fill="#8B8F94"/>${[700, 1220].map((x) => `<rect x="${x - 4}" y="40" width="8" height="104" fill="#8B8F94"/>`).join('')}
      ${carcassX.map((x, i) => `<g class="carc" transform="translate(${x} 152)">${carcass}<g class="cstamp" opacity="0" transform="translate(-2 168)">${stampMark(0.8)}</g></g>`).join('')}
      <g class="pen-cows">${[1, 4].map((i) => cow(i)).join('')}</g>
      <g stroke="#9AA3A0" stroke-width="7" stroke-linecap="round">${[100, 190, 280, 370, 420].map((x) => `<path d="M${x} 520 V612"/>`).join('')}<path d="M100 552 H420"/><path d="M100 588 H420"/></g>
      <g class="tap" transform="translate(620 330)"><rect x="-6" y="-60" width="12" height="60" fill="#A8B1AE"/><path d="M-6 -4 H24 Q 34 -4 34 8 V14" stroke="#A8B1AE" stroke-width="12" fill="none" stroke-linecap="round"/><path class="drop" d="M34 24 q -6 9 0 13 q 6 -4 0 -13Z" fill="#6FB7D6"/></g>
      ${[250, 560, 880, 1150].map((x, i) => sparkle('spark s' + i)).join('')}
      ${person('vet')}${personX('worker')}
      ${[0, 1].map((i) => check('ok ok' + i)).join('')}
      ${chip('insp', 240, 'inspected', { fill: '#ECEBF7', color: INK })}
      ${chip('cleanc', 280, 'clean')}${chip('waterc', 280, 'water', { tail: true })}${chip('clothesc', 280, 'clothes', { tail: true })}`,
    init(g) {
      this.cows = [...g.querySelectorAll('.pen-cows .cow')]; this.cows.forEach(prepCow);
      this.v = prep(g, '.person.vet'); this.w = prep(g, '.person.worker');
      this.stamps = [...g.querySelectorAll('.cstamp')]; this.oks = [...g.querySelectorAll('.ok')]; this.drop = g.querySelector('.drop'); this.sparks = [...g.querySelectorAll('.spark')];
      ['insp', 'cleanc', 'waterc', 'clothesc'].forEach((k) => (this[k] = g.querySelector('.' + k)));
    },
    update(t, idle) {
      [[190, 604, .8], [330, 600, .8]].forEach(([x, y, s], i) => poseCow(this.cows[i], x, y, s, 0, 0, idle));
      // vet: inspects the live animals (facing left), then walks the rail stamping each carcass
      const stops = [[480, 0], [480, 4.8], [700, 5.8], [700, 6.8], [860, 7.6], [860, 8.4], [1020, 9.2]];
      let vx = stops[0][0], walking = 0;
      for (let i = 1; i < stops.length; i++) {
        const [x0, t0] = stops[i - 1], [x1, t1] = stops[i];
        if (t >= t0 && t <= t1) { vx = lerp(x0, x1, ease.inOut((t - t0) / (t1 - t0))); walking = x0 !== x1 ? 1 : 0; break; }
        if (t > t1) vx = x1;
      }
      const stampAt = [6.4, 8.0, 9.6], stamping = stampAt.some((s) => t > s - 0.5 && t < s + 0.3);
      posePerson(this.v, vx, 652, 1.04, walking, t * 8, idle, t < 4.8 && t > 0.8 ? -60 + Math.sin(idle * 5) * 6 : stamping ? -150 : null, t < 4.8);
      [[190, 1.6], [330, 2.9]].forEach(([x, t0], i) => pop(this.oks[i], t, t0, x + 20, 480, 0.01));
      this.stamps.forEach((s, i) => { const p = prog(t, stampAt[i], stampAt[i] + 0.25, ease.out); op(s, p); s.setAttribute('transform', `translate(-2 168) scale(${lerp(1.8, 1, p).toFixed(3)})`); });
      pop(this.insp, t, 9.9, 950, 90);
      // hygiene: clean premises, clean water, work clothes
      pop(this.cleanc, t, 11.0, 260, 330);
      this.sparks.forEach((s, i) => { const x = [250, 560, 880, 1150][i]; op(s, prog(t, 11 + i * 0.15, 11.3 + i * 0.15) * (0.6 + 0.4 * Math.sin(idle * 4 + i))); tf(s, x, 670, 0.8 + 0.25 * Math.sin(idle * 3 + i)); });
      const dy = ((idle * 1.4) % 1) * 40; this.drop.setAttribute('transform', `translate(0 ${dy.toFixed(1)})`); op(this.drop, prog(t, 12, 12.2) * (1 - (dy / 40)));
      pop(this.waterc, t, 12.2, 640, 220);
      const pw = prog(t, 13.0, 13.5); op(this.w, pw); posePerson(this.w, 520, 652, 1.04, 0, 0, idle);
      pop(this.clothesc, t, 13.4, 520, 400);
    },
  };

  // ---------- 6. the yard (transport, choice 2) and the delivery in the city ----------
  const pallet = [[440, 600], [504, 600], [472, 556]];
  S.yard = {
    build: () => `<g class="yardg">${landscape()}${acacia(1210, 488, .9)}${abattoir(40)}
        <rect x="400" y="600" width="140" height="12" rx="3" fill="#A9733F"/>
        ${pickup('pick')}
      </g>
      <g class="cityg" opacity="0">${landscape()}${city()}${stall(1000)}${personX('buyer2')}</g>
      ${reefer('truck')}
      ${pallet.map((_, i) => crate('cr cr' + i)).join('')}
      ${personX('aicha')}
      ${chip('coldc', 270, 'coldChain', { fill: '#E3F1EE', color: C.teal, tx: 20, icon: `<g transform="translate(-100 0)">${snowflake(0.62)}</g>` })}
      <g class="dcrate" opacity="0">${crate('inner').replace('opacity="0"', '')}</g>
      <g class="lens" opacity="0"><circle r="34" fill="#CFE6EA" fill-opacity=".35" stroke="#3E3729" stroke-width="7"/><path d="M24 24 L54 54" stroke="#3E3729" stroke-width="11" stroke-linecap="round"/></g>
      ${check('okd')}${chip('dealc', 270, 'deal', { fill: C.green, color: '#FFF6E6' })}`,
    init(g) {
      this.sun = [...g.querySelectorAll('.sun')]; this.yard = g.querySelector('.yardg'); this.city = g.querySelector('.cityg');
      this.truck = g.querySelector('.truck'); prepVehicle(this.truck); this.pick = g.querySelector('.pick'); prepVehicle(this.pick);
      this.crates = [...g.querySelectorAll('.cr')]; this.a = prep(g, '.person.aicha'); this.b = prep(g, '.cityg .person.buyer2');
      ['coldc', 'dcrate', 'lens', 'okd', 'dealc'].forEach((k) => (this[k] = g.querySelector('.' + k)));
    },
    update(t, idle) {
      this.sun.forEach((s) => tf(s, 300, 130));
      const toCity = prog(t, 9.4, 10.0, ease.inOut); op(this.yard, 1 - toCity); op(this.city, toCity);
      poseVehicle(this.pick, 560, 640);
      // the refrigerated truck: parked, drives off, then arrives in the city
      const off = prog(t, 7.2, 9.4, (x) => x * x), arrive = prog(t, 10.0, 11.8, ease.out);
      const tx = t < 9.7 ? 860 + off * 640 : lerp(-420, 330, arrive);
      poseVehicle(this.truck, tx, 640, t < 9.7 ? off * 640 : 1060 + arrive * 750);
      // Aïcha walks out to the pallet and watches the loading
      const pa = prog(t, 0.3, 2.4, ease.out);
      posePerson(this.a, lerp(200, 340, pa), 646, 1.05, t > 0.3 && t < 2.4 ? 1 - pa * pa : 0, t * 7.5, idle, t > 5.2 && t < 7 ? -40 : null);
      op(this.a, 1 - toCity);
      // crates: stacked on the pallet, then carried into the truck one by one
      this.crates.forEach((c, i) => {
        const [x, y] = pallet[i], t0 = 5.3 + i * 0.45, m = prog(t, t0, t0 + 0.5, ease.inOut);
        const s = lerp(0.6, 1, prog(t, 1.0 + i * 0.4, 1.45 + i * 0.4, ease.back));
        tf(c, lerp(x, 880, m), lerp(y, 520, m) - Math.sin(m * Math.PI) * 50, s);
        op(c, prog(t, 1.0 + i * 0.4, 1.2 + i * 0.4) * (1 - prog(t, t0 + 0.4, t0 + 0.5)));
      });
      const showCold = prog(t, 6.6, 7.0) * (1 - prog(t, 9.2, 9.4)) + prog(t, 10.4, 10.8);
      op(this.coldc, Math.min(1, showCold)); tf(this.coldc, tx + 190, 410, lerp(0.6, 1, prog(t, 6.6, 7.1, ease.back)));
      // delivery: the buyer checks the stamp on a crate, and the deal is done
      posePerson(this.b, 980, 652, 1.04, 0, 0, idle, t > 12.2 && t < 13.6 ? -60 : t > 14.4 ? -110 + Math.sin(idle * 7) * 10 : null, true);
      pop(this.dcrate, t, 12.0, 820, 600); op(this.dcrate, prog(t, 12.0, 12.2) * toCity);
      op(this.lens, prog(t, 12.4, 12.6) * (1 - prog(t, 13.5, 13.7)));
      const lp = prog(t, 12.4, 13.5, ease.inOut); tf(this.lens, 790 + lp * 40, 560 + Math.sin(lp * 7) * 8);
      pop(this.okd, t, 13.7, 840, 500, 0.01);
      pop(this.dealc, t, 14.3, 980, 380);
    },
  };

  // ---------- 7. no cold chain (wrong answer 2) ----------
  const bugs = Array.from({ length: 12 }, (_, i) => [350 + (i % 4) * 46 + ((i * 17) % 13), 470 - Math.floor(i / 4) * 34 - ((i * 7) % 11), 1.0 + i * 0.2]);
  S.heat = {
    build: () => `${landscape({ sky: 'g-dawn' })}${city()}${stall(1000)}
      <g class="haze" opacity=".5" stroke="#FFF1CF" stroke-width="3" fill="none">${[0, 1, 2].map((i) => `<path d="M${300 + i * 80} 300 q 10 -14 0 -28 q -10 -14 0 -28"/>`).join('')}</g>
      ${pickup('pickh', true)}${personX('buyer2')}
      <g class="thermo" transform="translate(620 230)" opacity="0"><rect x="-14" y="-90" width="28" height="120" rx="14" fill="#FFFFFF" stroke="${C.ink}" stroke-width="4"/><circle cy="44" r="24" fill="${C.red}" stroke="${C.ink}" stroke-width="4"/><rect class="merc" x="-6" y="-80" width="12" height="120" rx="6" fill="${C.red}"/></g>
      ${bugs.map((_, i) => microbe('mic m' + i)).join('')}
      ${cross('xmark')}${chip('refm', 270, 'refusedMeat', { fill: C.red, color: '#FFF6E6' })}`,
    init(g) {
      this.sun = g.querySelector('.sun'); this.p = g.querySelector('.pickh'); prepVehicle(this.p); this.b = prep(g, '.person.buyer2');
      this.mics = [...g.querySelectorAll('.mic')]; this.thermo = g.querySelector('.thermo'); this.merc = g.querySelector('.merc'); this.haze = g.querySelector('.haze');
      ['xmark', 'refm'].forEach((k) => (this[k] = g.querySelector('.' + k)));
    },
    update(t, idle) {
      tf(this.sun, 640, 140, 1.35);
      const a = prog(t, 0, 1.6, ease.out); poseVehicle(this.p, lerp(-300, 300, a), 640, a * 600);
      this.haze.setAttribute('transform', `translate(0 ${(Math.sin(idle * 3) * 6).toFixed(1)})`);
      op(this.thermo, prog(t, 0.6, 0.9)); const h = lerp(30, 110, prog(t, 0.8, 3.2, ease.inOut)); this.merc.setAttribute('y', (40 - h).toFixed(1)); this.merc.setAttribute('height', h.toFixed(1));
      this.mics.forEach((m, i) => { const [x, y, t0] = bugs[i]; const p = prog(t, t0, t0 + 0.3, ease.back); op(m, prog(t, t0, t0 + 0.15)); tf(m, x + Math.sin(idle * 2 + i) * 3, y + Math.cos(idle * 2.4 + i) * 3, Math.max(0.01, p)); });
      posePerson(this.b, 980, 652, 1.04, 0, 0, idle, t > 3.8 ? -95 : null, true);
      pop(this.xmark, t, 3.9, 420, 380, 0.01);
      pop(this.refm, t, 4.3, 790, 330);
    },
  };

  const miniAbattoir = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s}) translate(0 -258)">${abattoir(0)}</g>`;

  // ---------- why: two countries, many rules, one set of principles ----------
  const ruleCards = [[-120, -40, '#C9D7E3', '?'], [0, -110, '#E7C9A6', '!'], [120, -40, '#C9DDB5', '?'], [0, 30, '#E8B9AE', '!']];
  S.countries = {
    build: () => `${board()}
      <path d="M90 250 Q 110 160 300 168 Q 480 150 560 230 L 604 540 Q 420 610 220 578 Q 70 530 90 250Z" fill="#EBCB98" stroke="#D9B47A" stroke-width="4"/>
      <path d="M676 228 Q 770 148 960 162 Q 1160 168 1196 290 Q 1214 470 1126 562 Q 900 618 700 548Z" fill="#E3C49B" stroke="#D2AE7E" stroke-width="4"/>
      <path d="M640 140 V600" stroke="#B8946A" stroke-width="5" stroke-dasharray="14 12" stroke-linecap="round"/>
      ${miniAbattoir(170, 290, 0.48)}
      <g transform="translate(640 140) scale(.44)">${city()}</g>
      <g transform="translate(130 300)">${flagA(0.8)}</g><g transform="translate(1110 330)">${flagB(0.8)}</g>
      <g class="jam">${ruleCards.map(([x, y, c, g], i) => g1('rule r' + i, `<rect x="-46" y="-56" width="92" height="112" rx="12" fill="#FFFDF6" stroke="#E2D2B2" stroke-width="2" filter="url(#f-shadow)"/><rect x="-46" y="-56" width="92" height="26" rx="10" fill="${c}"/><text y="30" text-anchor="middle" font-size="52" font-weight="800" fill="${C.terracotta}">${g}</text>`)).join('')}</g>
      ${crate('wcrate')}
      ${g1('wto', `${card(330, 132)}<g transform="translate(-104 0)">${ic.globe}</g><text x="24" y="14" text-anchor="middle" font-size="40" font-weight="800" fill="${C.indigo}" letter-spacing="2" data-t="wto"></text>`)}
      ${check('okw')}`,
    init(g) { ['wcrate', 'wto', 'okw'].forEach((k) => (this[k] = g.querySelector('.' + k))); this.rules = [...g.querySelectorAll('.rule')]; },
    update(t, idle) {
      const go = prog(t, 1.2, 4.2, ease.inOut), cross = prog(t, 18.6, 21.6, ease.inOut);
      const shake = t > 10 && t < 16.4 ? Math.sin(idle * 26) * 3 : 0;
      tf(this.wcrate, lerp(330, 580, go) + lerp(0, 330, cross) + shake, 480, 1.3); op(this.wcrate, prog(t, 0.6, 1.0));
      this.rules.forEach((r, i) => {
        const [x, y] = ruleCards[i], t0 = 7.8 + i * 0.9, m = prog(t, 15.6, 16.6, ease.inOut);
        const p = prog(t, t0, t0 + 0.45, ease.back);
        tf(r, lerp(640 + x, 640, m), lerp(300 + y, 230, m), lerp(0.5, 1, p) * (1 - m * 0.6), (i % 2 ? 1 : -1) * 6 * (1 - m));
        op(r, prog(t, t0, t0 + 0.2) * (1 - prog(t, 16.2, 16.6)));
      });
      pop(this.wto, t, 16.4, 640, 230);
      pop(this.okw, t, 21.8, 960, 400, 0.01);
    },
  };

  // ---------- right + limits: the right to protect, and its four limits ----------
  const protIcons = [ic.person, `<g transform="translate(0 6)">${pillarIcon[1]}</g>`, `<g transform="translate(0 4)">${pillarIcon[2]}</g>`];
  const limitIcons = [ic.microscope, ic.gauge, ic.fair, ic.noBarrier], limitAt = [14.6, 21.6, 27.4, 34.0];
  S.rights = {
    build: () => `${board()}
      ${chip('spsc', 380, 'sps', { fill: C.teal, color: '#FFF6E6' })}
      <g class="shield">${ic.shield()}</g>
      ${[400, 640, 880].map((x, i) => g1('pi pi' + i, `<path d="M0 -60 L ${(640 - x) * 0.5} -150" stroke="#CDBB9A" stroke-width="4" stroke-dasharray="6 9" stroke-linecap="round"/><circle r="54" fill="#FFF8EC" filter="url(#f-shadow)"/>${protIcons[i]}${label(['people', 'animals', 'plants'][i], 92, 14, 24, C.teal)}`)).join('')}
      <rect class="frame" x="70" y="318" width="1140" height="280" rx="34" fill="none" stroke="${C.terracotta}" stroke-width="4" stroke-dasharray="16 12" opacity="0"/>
      ${limitIcons.map((icon, i) => g1('lim l' + i, `${card(250, 236)}<circle cy="-46" r="54" fill="${['#EAF0F7', '#E7F4EA', '#F7EBDD', '#F9E3DF'][i]}"/><g transform="translate(0 -46)">${icon}</g>${label('limits.' + i, 58, 14, 23)}`)).join('')}`,
    init(g) { this.spsc = g.querySelector('.spsc'); this.shield = g.querySelector('.shield'); this.pis = [...g.querySelectorAll('.pi')]; this.frame = g.querySelector('.frame'); this.lims = [...g.querySelectorAll('.lim')]; },
    update(t) {
      pop(this.spsc, t, 0.4, 640, 70);
      const sp = prog(t, 1.0, 1.6, ease.back), up = prog(t, 14.0, 15.0, ease.inOut);
      op(this.shield, prog(t, 1.0, 1.2)); tf(this.shield, 640, lerp(300, 196, up), lerp(0.4, 1, sp) * lerp(1, 0.58, up));
      this.pis.forEach((p, i) => { pop(p, t, [6.2, 8.4, 10.6][i], [400, 640, 880][i], 470); op(p, prog(t, [6.2, 8.4, 10.6][i], [6.2, 8.4, 10.6][i] + 0.2) * (1 - prog(t, 14.0, 14.5))); });
      op(this.frame, prog(t, 14.3, 14.8) * 0.8);
      this.lims.forEach((l, i) => pop(l, t, limitAt[i], 215 + i * 283, 458));
    },
  };

  // ---------- risk: assess the risk, then weigh protection against trade ----------
  S.risk = {
    build: () => `${board()}
      ${person('vet')}
      ${chip('rtag', 330, 'riskT', { fill: C.teal, color: '#FFF6E6' })}
      <g class="gauge" opacity="0"><path d="M-110 0 A 110 110 0 0 1 -55 -95" stroke="${C.green}" stroke-width="30" fill="none"/><path d="M-51 -97 A 110 110 0 0 1 51 -97" stroke="#F2C14E" stroke-width="30" fill="none"/><path d="M55 -95 A 110 110 0 0 1 110 0" stroke="${C.red}" stroke-width="30" fill="none"/><g class="needle"><path d="M0 0 V-92" stroke="${C.ink}" stroke-width="8" stroke-linecap="round"/></g><circle r="14" fill="${C.ink}"/></g>
      ${[ic.microscope, `<g transform="translate(-4 10) scale(.5)">${cow(1)}</g><g transform="translate(26 -8)"><rect x="-16" y="-24" width="32" height="34" fill="#D9C3A0"/><path d="M-20 -24 L0 -40 L20 -24Z" fill="${C.terracotta}"/></g>`, `<g transform="scale(1.1)">${virus('').replace('opacity="0"', '')}</g>`].map((icon, i) => g1('ev ev' + i, `${card(230, 200)}<circle cy="-34" r="50" fill="${['#EAF0F7', '#F7EBDD', '#F9E3DF'][i]}"/><g transform="translate(0 -34)">${icon}</g>${label('evidence.' + i, 58, 14, 22)}`)).join('')}
      <g class="lensr" opacity="0"><circle r="34" fill="#CFE6EA" fill-opacity=".35" stroke="#3E3729" stroke-width="7"/><path d="M24 24 L54 54" stroke="#3E3729" stroke-width="11" stroke-linecap="round"/></g>
      <g class="scale" opacity="0">
        <rect x="-70" y="-14" width="140" height="18" rx="6" fill="#7A6A55"/><rect x="-9" y="-232" width="18" height="222" rx="5" fill="#8C7B62"/>
        <g class="beam"><rect x="-190" y="-8" width="380" height="16" rx="8" fill="#6B5A45"/><circle r="14" fill="#4E4232"/></g>
        ${[0, 1].map((i) => `<g class="pan pan${i}"><path d="M0 0 L-60 110 M0 0 L60 110" stroke="#8C7B62" stroke-width="3"/><path d="M-80 110 Q 0 150 80 110Z" fill="#B59A72"/><g transform="translate(0 ${i ? 92 : 82})">${i ? `<g transform="scale(1.3)">${crate('pc').replace('opacity="0"', '')}</g>` : ic.shield(0.42)}</g><g transform="translate(0 182)">${chip('', 210, i ? 'trade' : 'protection', { fill: i ? '#EAF0F7' : '#E3F1EE', color: i ? C.indigo : C.teal }).replace('opacity="0"', '')}</g></g>`).join('')}
      </g>
      ${check('okr')}`,
    init(g) {
      this.v = prep(g, '.person.vet'); ['rtag', 'gauge', 'needle', 'lensr', 'scale', 'beam', 'okr'].forEach((k) => (this[k] = g.querySelector('.' + k)));
      this.evs = [...g.querySelectorAll('.ev')]; this.pans = [...g.querySelectorAll('.pan')];
    },
    update(t, idle) {
      posePerson(this.v, 170, 640, 1.35, 0, 0, idle, t > 8 && t < 15 ? -40 : null);
      const out = prog(t, 15.4, 16.0);
      pop(this.rtag, t, 0.5, 740, 80); op(this.rtag, prog(t, 0.5, 0.7) * (1 - out));
      op(this.gauge, prog(t, 0.8, 1.2) * (1 - out)); tf(this.gauge, 740, 290, 1);
      const sweep = t < 7.8 ? Math.sin(t * 1.3) * 70 : lerp(Math.sin(7.8 * 1.3) * 70, -18, prog(t, 7.8, 9));
      this.needle.setAttribute('transform', `rotate(${sweep.toFixed(1)})`);
      this.evs.forEach((e, i) => { pop(e, t, 8.2 + i * 2.4, 500 + i * 250, 470); op(e, prog(t, 8.2 + i * 2.4, 8.4 + i * 2.4) * (1 - out)); });
      const lx = t < 10.6 ? 500 : t < 13 ? lerp(500, 750, prog(t, 10.6, 11.4, ease.inOut)) : lerp(750, 1000, prog(t, 13, 13.8, ease.inOut));
      op(this.lensr, prog(t, 8.6, 8.9) * (1 - prog(t, 15.0, 15.4))); tf(this.lensr, lx + 40 + Math.sin(idle * 3) * 6, 440 + Math.cos(idle * 2.4) * 5);
      // the balance: protection on one side, trade on the other, until they level
      op(this.scale, prog(t, 16.0, 16.5)); tf(this.scale, 740, 520, lerp(0.85, 1, prog(t, 16.0, 16.6, ease.back)));
      const a = t < 19.6 ? lerp(-9, 7, prog(t, 16.6, 18.0, ease.inOut)) * (1 - prog(t, 18.0, 19.6, ease.inOut)) + Math.sin(t * 3) * 1.5 * (1 - prog(t, 18.4, 19.6)) : 0;
      this.beam.setAttribute('transform', `translate(0 -232) rotate(${a.toFixed(2)})`);
      this.pans.forEach((p, i) => { const s = i ? 1 : -1, r = (a * Math.PI) / 180; p.setAttribute('transform', `translate(${(s * 165 * Math.cos(r)).toFixed(1)} ${(-232 + s * 165 * Math.sin(r)).toFixed(1)})`); });
      pop(this.okr, t, 20.4, 740, 240, 0.01);
    },
  };

  // ---------- harmonize: following the standard, or going further with science ----------
  S.bar = {
    build: () => `${board()}
      <path d="M250 560 H1030" stroke="#CDBB9A" stroke-width="6" stroke-linecap="round"/>
      <g class="stdline" opacity="0"><path d="M250 300 H1030" stroke="${C.teal}" stroke-width="5" stroke-dasharray="14 10"/><circle cx="180" cy="300" r="56" fill="#FFF8EC" filter="url(#f-shadow)"/><g transform="translate(180 302) scale(.9)">${ic.temple}</g></g>
      ${chip('stdc', 300, 'std', { fill: '#E3F1EE', color: C.teal })}
      ${[[470, C.teal, flagA], [810, C.indigo, flagB]].map(([x, c, f], i) => `<g class="bar b${i}"><rect class="col" x="${x - 62}" y="560" width="124" height="0" rx="12" fill="${c}"/><g transform="translate(${x - 26} 548)">${f(0.5)}</g></g>`).join('')}
      ${check('okb')}${chip('okc', 360, 'okStd', { fill: C.green, color: '#FFF6E6' })}
      <g class="qb" opacity="0"><circle r="30" fill="#F2C14E" filter="url(#f-shadow)"/><text y="13" text-anchor="middle" font-size="38" font-weight="800" fill="#FFF6E6">?</text></g>
      ${g1('sci', `${card(120, 120)}<g transform="scale(.9)">${ic.microscope}</g>`)}
      ${check('okb2')}${chip('strc', 470, 'stricter', { fill: C.indigo, color: '#FFF6E6' })}`,
    init(g) { ['stdline', 'stdc', 'okb', 'okc', 'qb', 'sci', 'okb2', 'strc'].forEach((k) => (this[k] = g.querySelector('.' + k))); this.cols = [...g.querySelectorAll('.col')]; },
    update(t) {
      op(this.stdline, prog(t, 0.3, 0.8)); pop(this.stdc, t, 0.5, 180, 396);
      const h = [lerp(0, 260, prog(t, 0.9, 2.6, ease.out)), lerp(0, 360, prog(t, 8.8, 10.8, ease.out))];
      this.cols.forEach((c, i) => { c.setAttribute('y', (560 - h[i]).toFixed(1)); c.setAttribute('height', h[i].toFixed(1)); });
      pop(this.okb, t, 3.0, 470, 252, 0.01); pop(this.okc, t, 3.8, 470, 176);
      op(this.qb, prog(t, 11.2, 11.4) * (1 - prog(t, 14.0, 14.2))); tf(this.qb, 810, 154, lerp(0.5, 1, prog(t, 11.2, 11.6, ease.back)));
      fly(this.sci, t, 12.4, 13.6, [1180, 420], [960, 210], 40); op(this.sci, prog(t, 12.4, 12.6));
      pop(this.okb2, t, 14.0, 810, 154, 0.01); pop(this.strc, t, 14.6, 810, 82);
    },
  };

  // ---------- equivalence: different controls, the same protection ----------
  S.equiv = {
    build: () => `${board()}
      <g class="lvl" opacity="0"><path d="M150 112 H1130" stroke="${C.teal}" stroke-width="5" stroke-dasharray="14 10"/><g transform="translate(640 112)">${ic.shield(0.3)}</g></g>
      ${chip('lvlc', 390, 'level', { fill: '#E3F1EE', color: C.teal })}
      ${[[340, flagA], [940, flagB]].map(([x, f], i) => `<g class="panel pn${i}" opacity="0"><rect x="${x - 250}" y="150" width="500" height="380" rx="28" fill="#FFF8EC" filter="url(#f-shadow)"/><g transform="translate(${x - 220} 250)">${f(0.7)}</g><text x="${x}" y="500" text-anchor="middle" font-size="25" font-weight="750" fill="${C.ink}" data-t="methods.${i}"></text>
        <path class="arr" pathLength="1" d="M${x} 150 V122" stroke="${C.teal}" stroke-width="6" stroke-linecap="round" stroke-dasharray="1" stroke-dashoffset="1"/></g>`).join('')}
      <g transform="translate(366 220) scale(.58)">${carcass}</g>
      <g class="estamp" opacity="0">${stampMark(1.1)}</g>
      <g class="rackq" transform="translate(940 440) scale(1.3)"><rect x="-70" y="-30" width="140" height="30" rx="4" fill="#E3E8E6" stroke="#A8BDB9" stroke-width="2"/>${[-40, 0, 40].map((x) => `<g transform="translate(${x} 0)"><rect x="-10" y="-96" width="20" height="90" rx="10" fill="#FFFFFF" fill-opacity=".7" stroke="#A8BDB9" stroke-width="2"/><rect class="liq" x="-8" y="-8" width="16" height="0" rx="8" fill="#7CC4B5"/></g>`).join('')}</g>
      ${check('okl')}
      <g class="neq" opacity="0">${ic.neq}</g><g class="eqs" opacity="0">${ic.eq}</g>
      ${chip('eqc', 260, 'equivalent', { fill: C.green, color: '#FFF6E6' })}
      ${[0, 1, 2].map((i) => g1('dd dd' + i, ic.doc)).join('')}
      <g class="lense" opacity="0"><circle r="34" fill="#CFE6EA" fill-opacity=".35" stroke="#3E3729" stroke-width="7"/><path d="M24 24 L54 54" stroke="#3E3729" stroke-width="11" stroke-linecap="round"/></g>
      ${check('oki')}
      <g class="askq" opacity="0">${ic.ask}</g>
      ${g1('cal', ic.calendar)}${chip('calc', 310, 'sixMonths', { fill: '#FFF8EC' })}
      <g class="lane" opacity="0"><path d="M0 610 H1280" stroke="#E7D2AE" stroke-width="6" stroke-dasharray="20 16"/></g>
      <g class="etruck">${reefer('et')}</g>
      ${chip('goc', 280, 'tradeGoes', { fill: C.green, color: '#FFF6E6' })}`,
    init(g) {
      ['lvl', 'lvlc', 'estamp', 'okl', 'neq', 'eqs', 'eqc', 'lense', 'oki', 'askq', 'cal', 'calc', 'lane', 'goc'].forEach((k) => (this[k] = g.querySelector('.' + k)));
      this.panels = [...g.querySelectorAll('.panel')]; this.arrs = [...g.querySelectorAll('.arr')]; this.liqs = [...g.querySelectorAll('.liq')]; this.docs = [...g.querySelectorAll('.dd')];
      this.truck = g.querySelector('.et'); prepVehicle(this.truck); this.tg = g.querySelector('.etruck');
    },
    update(t, idle) {
      this.panels.forEach((p, i) => { op(p, prog(t, 0.4 + i * 0.4, 0.8 + i * 0.4)); p.setAttribute('transform', `translate(0 ${((1 - prog(t, 0.4 + i * 0.4, 1.0 + i * 0.4, ease.out)) * 40).toFixed(1)})`); });
      const sp = prog(t, 2.6, 2.9, ease.out); op(this.estamp, sp); tf(this.estamp, 366, 330, lerp(1.8, 1, sp));
      this.liqs.forEach((l, i) => { const h = lerp(0, 46, prog(t, 3.6 + i * 0.3, 4.6 + i * 0.3)); l.setAttribute('y', (-8 - h).toFixed(1)); l.setAttribute('height', h.toFixed(1)); });
      pop(this.okl, t, 5.0, 1050, 300, 0.01);
      op(this.lvl, prog(t, 7.0, 7.6)); pop(this.lvlc, t, 7.4, 640, 60);
      this.arrs.forEach((a, i) => a.setAttribute('stroke-dashoffset', (1 - prog(t, 8.4 + i * 0.8, 9.4 + i * 0.8)).toFixed(3)));
      op(this.neq, prog(t, 5.4, 5.7) * (1 - prog(t, 15.6, 16.0))); tf(this.neq, 640, 340, lerp(0.6, 1, prog(t, 5.4, 5.9, ease.back)));
      op(this.eqs, prog(t, 15.6, 16.0)); tf(this.eqs, 640, 340, lerp(0.6, 1, prog(t, 15.6, 16.2, ease.back)));
      pop(this.eqc, t, 16.6, 640, 566); op(this.eqc, prog(t, 16.6, 16.8) * (1 - prog(t, 39.2, 39.6)));
      // part 2: data goes over, inspectors come to see, the importer explains and answers
      this.docs.forEach((d, i) => fly(d, t, 24.6 + i * 0.6, 25.8 + i * 0.6, [420, 300], [860, 300], 90));
      const lm = prog(t, 28.0, 30.4, ease.inOut); op(this.lense, prog(t, 27.8, 28.1) * (1 - prog(t, 31.2, 31.5))); tf(this.lense, lerp(980, 380, lm) + Math.sin(idle * 3) * 5, 320 + Math.sin(lm * Math.PI) * -60);
      pop(this.oki, t, 30.6, 470, 230, 0.01); op(this.oki, prog(t, 30.6, 30.8) * (1 - prog(t, 39.4, 39.8)));
      pop(this.askq, t, 32.2, 560, 220); op(this.askq, prog(t, 32.2, 32.4) * (1 - prog(t, 39.4, 39.8)));
      pop(this.cal, t, 35.4, 1060, 230); op(this.cal, prog(t, 35.4, 35.6) * (1 - prog(t, 39.4, 39.8)));
      pop(this.calc, t, 36.0, 940, 160); op(this.calc, prog(t, 36.0, 36.2) * (1 - prog(t, 39.4, 39.8)));
      op(this.lane, prog(t, 39.8, 40.3));
      const X = lerp(-260, 1320, prog(t, 40.0, 47.8, ease.lin)); this.tg.setAttribute('transform', `translate(${X.toFixed(1)} 596) scale(.5)`); poseVehicle(this.truck, 0, 0, X * 2); op(this.tg, prog(t, 40.0, 40.2));
      op(this.goc, prog(t, 41.0, 41.3)); tf(this.goc, X + 95, 470);
    },
  };

  // ---------- zones: an outbreak far away; regionalisation keeps the rest trading ----------
  const REG = [
    'M150 196 L 420 150 L 468 330 L 166 360Z', 'M420 150 L 812 176 L 852 322 L 468 330Z',
    'M166 360 L 468 330 L 498 548 L 196 530Z', 'M468 330 L 852 322 L 872 516 L 498 548Z',
  ];
  const regC = [[312, 262], [636, 246], [330, 446], [680, 432]];
  S.zones = {
    build: () => `${board()}
      ${REG.map((d, i) => `<path class="reg rg${i}" d="${d}" fill="#EBCB98" stroke="#FBF1DF" stroke-width="8" stroke-linejoin="round"/>`).join('')}
      <path d="M150 196 L 420 150 L 812 176 L 852 322 L 872 516 L 498 548 L 196 530 L 166 360Z" fill="none" stroke="#C9A36B" stroke-width="5" stroke-linejoin="round"/>
      <path class="whole" d="M150 196 L 420 150 L 812 176 L 852 322 L 872 516 L 498 548 L 196 530 L 166 360Z" fill="none" stroke="${C.red}" stroke-width="8" stroke-linejoin="round" stroke-dasharray="18 12" opacity="0"/>
      ${REG.map((d, i) => `<path class="hi hi${i}" d="${d}" fill="none" stroke="${C.teal}" stroke-width="7" stroke-linejoin="round" opacity="0"/>`).join('')}
      <g class="buyc"><path d="M922 196 L 1190 186 L 1206 540 L 940 532Z" fill="#E3C49B" stroke="#D2AE7E" stroke-width="5" stroke-linejoin="round"/><g transform="translate(700 186) scale(.42)">${city()}</g><g transform="translate(980 500)">${flagB(0.7)}</g></g>
      <g transform="translate(250 456) scale(.32) translate(0 -258)">${abattoir(0)}</g><g transform="translate(206 520)">${flagA(0.6)}</g>
      ${[[300, 300], [610, 280], [700, 470]].map(([x, y]) => `<g transform="translate(${x} ${y}) scale(.42)">${cow(2)}</g>`).join('')}
      ${[0, 1, 2, 3].map((i) => virus('vz vz' + i)).join('')}
      ${chip('obc', 380, 'outbreak', { fill: C.red, color: '#FFF6E6' })}
      <g class="askz" opacity="0">${ic.ask}</g>
      ${g1('env', ic.envelope)}
      ${g1('woahb', `${card(220, 96)}<g transform="translate(-62 6) scale(.62)">${pillarIcon[1]}</g><text x="24" y="12" text-anchor="middle" font-size="32" font-weight="800" fill="${C.ink}" data-t="woah"></text>`)}
      <g class="ring" opacity="0"><circle r="150" fill="none" stroke="${C.teal}" stroke-width="6" stroke-dasharray="16 10"/></g>
      ${chip('ctrl', 330, 'underControl', { fill: C.teal, color: '#FFF6E6' })}
      <g class="lensz" opacity="0"><circle r="34" fill="#CFE6EA" fill-opacity=".35" stroke="#3E3729" stroke-width="7"/><path d="M24 24 L54 54" stroke="#3E3729" stroke-width="11" stroke-linecap="round"/></g>
      ${[0, 1, 2].map((i) => check('fz fz' + i)).join('')}
      ${chip('freec', 240, 'free', { fill: C.green, color: '#FFF6E6' })}
      <g class="ztruck">${reefer('zt')}</g>${check('okz')}
      <g class="bar2"><rect x="884" y="380" width="16" height="70" rx="3" fill="#5E5545"/><g class="barm" transform="translate(892 392)"><rect x="-8" y="-150" width="16" height="150" rx="8" fill="url(#p-stripes)" stroke="#9E3A2C" stroke-width="2"/></g></g>
      ${g1('xz', ic.redX)}${chip('closec', 320, 'closed', { fill: C.red, color: '#FFF6E6' })}`,
    init(g) {
      this.regs = [...g.querySelectorAll('.reg')]; this.his = [...g.querySelectorAll('.hi')]; this.vz = [...g.querySelectorAll('.vz')]; this.fz = [...g.querySelectorAll('.fz')];
      ['whole', 'buyc', 'obc', 'askz', 'env', 'woahb', 'ring', 'ctrl', 'lensz', 'freec', 'okz', 'barm', 'xz', 'closec'].forEach((k) => (this[k] = g.querySelector('.' + k)));
      this.truck = g.querySelector('.zt'); prepVehicle(this.truck); this.tg = g.querySelector('.ztruck');
    },
    update(t, idle, variant) {
      const bad = variant === 'hidden', tb = t - 18, mix = (a, b, p) => { const h = (c) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16)); const A = h(a), B = h(b); return `rgb(${A.map((x, i) => Math.round(lerp(x, B[i], p))).join(',')})`; };
      const sick = [bad ? prog(tb, 1.0, 2.0) : 0, prog(t, 2.8, 3.8), bad ? prog(tb, 1.6, 2.6) : 0, bad ? prog(tb, 1.3, 2.3) : 0];
      const freeAt = [25.6, 0, 26.9, 28.2], free = freeAt.map((f, i) => (!bad && i !== 1 ? prog(t, f, f + 0.5) : 0));
      this.regs.forEach((r, i) => r.setAttribute('fill', free[i] ? mix('#EBCB98', '#BFDDB0', free[i]) : mix('#EBCB98', '#EBA28F', sick[i])));
      // the outbreak, and in the hidden branch its spread
      pop(this.vz[1], t, 2.6, regC[1][0], regC[1][1], 0.01);
      [0, 2, 3].forEach((i) => { if (!bad) return op(this.vz[i], 0); const m = prog(tb, 0.4, 1.8, ease.inOut); op(this.vz[i], prog(tb, 0.4, 0.6)); tf(this.vz[i], lerp(regC[1][0], regC[i][0], m), lerp(regC[1][1], regC[i][1], m), 0.8); });
      pop(this.obc, t, 3.2, 636, 96); op(this.obc, prog(t, 3.2, 3.4) * (1 - (bad ? 0 : prog(t, 20.2, 20.5))));
      op(this.whole, (prog(t, 8.6, 9.0) * (1 - prog(t, 11.8, 12.2))) * (0.6 + 0.4 * Math.sin(idle * 6)));
      pop(this.askz, t, 8.8, 940, 140); op(this.askz, prog(t, 8.8, 9.0) * (1 - prog(t, 12, 12.4)));
      this.his.forEach((h, i) => op(h, prog(t, 12.6 + i * 0.9, 12.9 + i * 0.9) * (1 - prog(t, 13.4 + i * 0.9, 13.8 + i * 0.9))));
      // reported, controlled, the rest proven free, trade goes on
      if (!bad) fly(this.env, t, 18.4, 19.8, regC[1], [1060, 104], 80); else op(this.env, 0);
      pop(this.woahb, t, bad ? 99 : 18.2, 1060, 104);
      op(this.ring, bad ? 0 : prog(t, 20.4, 21.0)); tf(this.ring, regC[1][0], regC[1][1] + 6, lerp(1.3, 1, prog(t, 20.4, 21.2, ease.out)));
      pop(this.ctrl, t, bad ? 99 : 20.6, 636, 96);
      const lp = prog(t, 24.8, 28.4, ease.inOut), path = [regC[0], regC[2], regC[3]], k = Math.min(1.999, lp * 2), a = path[Math.floor(k)], b = path[Math.floor(k) + 1];
      op(this.lensz, bad ? 0 : prog(t, 24.6, 24.9) * (1 - prog(t, 29.0, 29.4))); tf(this.lensz, lerp(a[0], b[0], k % 1) + 30, lerp(a[1], b[1], k % 1) - 20);
      [0, 2, 3].forEach((r, i) => pop(this.fz[i], t, bad ? 99 : freeAt[r] + 0.2, regC[r][0], regC[r][1] - 30, 0.01));
      pop(this.freec, t, bad ? 99 : 29.0, 300, 110);
      const dz = Math.max(0, t - 31.6) * 150; this.tg.setAttribute('transform', `translate(${(330 + dz * 0.42).toFixed(1)} 560) scale(.42)`); poseVehicle(this.truck, 0, 0, dz);
      op(this.tg, bad ? 0 : prog(t, 31.6, 31.9) * (1 - prog(t, 36.6, 37))); pop(this.okz, t, bad ? 99 : 36.4, 1070, 300, 0.01);
      // the border barrier: open, or closed on the whole country
      const close = bad ? prog(tb, 4.6, 5.4, ease.inOut) : 0; this.barm.setAttribute('transform', `translate(892 392) rotate(${lerp(-10, -90, close).toFixed(1)})`);
      op(this.buyc, 1 - close * 0.45); pop(this.xz, t, bad ? 18 + 5.6 : 99, 1070, 330, 0.01); pop(this.closec, t, bad ? 18 + 6.2 : 99, 1070, 420);
    },
  };

  // ---------- checks: fair inspections, published rules, an enquiry point ----------
  S.checks = {
    build: () => `${board()}
      <path d="M640 140 V600" stroke="#E2CDA8" stroke-width="4" stroke-dasharray="10 12"/>
      <g class="bench"><rect x="110" y="520" width="420" height="20" rx="4" fill="#A9733F"/><rect x="128" y="540" width="384" height="80" fill="#C8935A"/></g>
      ${crate('ck0')}${crate('ck1')}
      <g transform="translate(232 524)">${flagA(0.45)}</g><g transform="translate(400 524)">${flagB(0.45)}</g>
      ${person('officer')}
      ${g1('watch', ic.stopwatch)}${chip('nd', 330, 'noDelay', { fill: '#FFF8EC' })}
      <g class="lensc" opacity="0"><circle r="30" fill="#CFE6EA" fill-opacity=".35" stroke="#3E3729" stroke-width="6"/><path d="M21 21 L46 46" stroke="#3E3729" stroke-width="10" stroke-linecap="round"/></g>
      ${check('c0')}${check('c1')}
      <g class="eqc2" opacity="0">${ic.eq}</g>${chip('same', 300, 'sameTreatment', { fill: C.green, color: '#FFF6E6' })}
      <g class="nboard" opacity="0"><rect x="-150" y="-90" width="300" height="180" rx="10" fill="#C8935A" stroke="#A9733F" stroke-width="8"/><rect x="-136" y="-76" width="272" height="152" fill="#E9D3AE"/></g>
      ${[-80, 0, 80].map((x, i) => g1('pp pp' + i, `<g transform="rotate(${[-4, 3, -2][i]})">${ic.doc}</g><circle cy="-26" r="5" fill="${C.red}"/>`)).join('')}
      ${chip('pub', 300, 'published', { fill: '#FFF8EC' })}
      ${g1('wtob', `${card(170, 84)}<g transform="translate(-42 0) scale(.8)">${ic.globe}</g><text x="26" y="11" text-anchor="middle" font-size="28" font-weight="800" fill="${C.indigo}" data-t="wto"></text>`)}
      ${g1('envc', ic.envelope)}
      <g class="desk" opacity="0"><rect x="-120" y="-70" width="240" height="70" rx="6" fill="${C.teal}"/><rect x="-130" y="-80" width="260" height="16" rx="5" fill="#17665C"/></g>
      ${g1('infoc', ic.info)}${chip('enq', 340, 'enquiry', { fill: C.teal, color: '#FFF6E6' })}
      ${personX('buyer')}
      <g class="askc" opacity="0">${ic.ask}</g>${check('okc3')}`,
    init(g) {
      ['ck0', 'ck1', 'watch', 'nd', 'lensc', 'c0', 'c1', 'eqc2', 'same', 'nboard', 'pub', 'wtob', 'envc', 'desk', 'infoc', 'enq', 'askc', 'okc3'].forEach((k) => (this[k] = g.querySelector('.' + k)));
      this.hand = g.querySelector('.watch .hand'); this.pps = [...g.querySelectorAll('.pp')];
      this.o = prep(g, '.person.officer'); this.b = prep(g, '.person.buyer');
    },
    update(t, idle) {
      [[230, 0.5], [400, 0.8]].forEach(([x, t0], i) => pop(this['ck' + i], t, t0, x, 520));
      posePerson(this.o, 580, 650, 1.04, 0, 0, idle, t > 3 && t < 6.4 ? -70 : null, true);
      pop(this.watch, t, 1.0, 200, 250); this.hand.setAttribute('transform', `rotate(${(lerp(0, 120, prog(t, 1.2, 6.5)) + (t > 6.5 ? 0 : 0)).toFixed(1)})`);
      pop(this.nd, t, 2.2, 230, 150);
      const lx = lerp(230, 400, prog(t, 3.6, 5.6, ease.inOut)); op(this.lensc, prog(t, 3.2, 3.5) * (1 - prog(t, 6.2, 6.5))); tf(this.lensc, lx + 14, 440 + Math.sin(idle * 4) * 5);
      pop(this.c0, t, 6.4, 230, 420, 0.01); pop(this.c1, t, 6.9, 400, 420, 0.01);
      pop(this.eqc2, t, 8.4, 315, 470, 0.4); pop(this.same, t, 9.0, 315, 345);
      op(this.nboard, prog(t, 14.0, 14.4)); tf(this.nboard, 860, 260);
      this.pps.forEach((p, i) => pop(p, t, 14.6 + i * 0.6, 860 + [-80, 0, 80][i], 268));
      pop(this.pub, t, 16.4, 860, 132);
      pop(this.wtob, t, 17.4, 1130, 200); fly(this.envc, t, 18.0, 19.6, [860, 260], [1100, 200], 70);
      op(this.desk, prog(t, 21.6, 22.0)); tf(this.desk, 960, 590);
      pop(this.infoc, t, 22.0, 960, 450); pop(this.enq, t, 22.6, 900, 380);
      const bw = prog(t, 22.4, 24.6, ease.out); posePerson(this.b, lerp(1400, 1150, bw), 652, 1.04, t > 22.4 && bw < 1 ? 1 - bw * bw : 0, t * 7.5, idle, t > 25 ? -40 : null, true);
      pop(this.askc, t, 24.8, 1160, 380); op(this.askc, prog(t, 24.8, 25.0) * (1 - prog(t, 26.6, 26.9)));
      pop(this.okc3, t, 27.0, 1160, 400, 0.01);
    },
  };

  // ---------- infant: the WHO Code of Marketing of Breast-milk Substitutes ----------
  S.infant = {
    build: () => `<rect width="1280" height="720" fill="#F6E6CF"/><rect y="440" width="1280" height="160" fill="#EEDABB"/><rect y="600" width="1280" height="120" fill="#E2C9A3"/><path d="M0 440 H1280" stroke="#DCC39A" stroke-width="6"/>
      <g transform="translate(110 150)"><rect width="180" height="150" rx="8" fill="#BFE3E6" stroke="#FFF6E6" stroke-width="10"/><path d="M90 0 V150 M0 75 H180" stroke="#FFF6E6" stroke-width="6"/></g>
      ${chip('whoc', 560, 'who', { fill: C.teal, color: '#FFF6E6', size: 22 })}
      <g class="bill" opacity="0"><rect x="-8" y="70" width="14" height="190" fill="#7A6A55"/><rect x="186" y="70" width="14" height="190" fill="#7A6A55"/><rect x="-30" y="-110" width="250" height="180" rx="10" fill="#FFFDF6" stroke="#D8C6A2" stroke-width="5"/><g transform="translate(40 -20) scale(.75)">${ic.tin}</g><g transform="translate(150 -20)">${ic.megaphone}</g></g>
      ${g1('xbill', ic.redX)}${chip('noad', 280, 'noAds', { fill: C.red, color: '#FFF6E6' })}
      ${g1('giftg', `${ic.gift}<g transform="translate(0 -60) scale(.42)">${ic.tin}</g>`)}${g1('xgift', ic.redX)}${chip('nosam', 320, 'noSamples', { fill: C.red, color: '#FFF6E6' })}
      ${personX('mother', 'baby')}
      ${g1('bigtin', `<g transform="scale(1.7)">${ic.tin}</g><g class="lab" transform="translate(0 -24)"><circle r="40" fill="#FFF0EE" stroke="${C.red}" stroke-width="4"/>${ic.heart}</g>`)}
      ${check('okn')}${chip('bf', 340, 'breast', { fill: C.green, color: '#FFF6E6' })}`,
    init(g) {
      ['whoc', 'bill', 'xbill', 'noad', 'giftg', 'xgift', 'nosam', 'bigtin', 'okn', 'bf'].forEach((k) => (this[k] = g.querySelector('.' + k)));
      this.m = prep(g, '.person.mother');
    },
    update(t, idle) {
      posePerson(this.m, 320, 640, 1.3, 0, 0, idle, -64 + Math.sin(idle * 1.6) * 3);
      pop(this.whoc, t, 0.6, 640, 74);
      const away = prog(t, 18.0, 18.6);
      op(this.bill, prog(t, 9.2, 9.6) * (1 - away)); tf(this.bill, 760, 300, lerp(0.85, 1, prog(t, 9.2, 9.8, ease.back)));
      pop(this.xbill, t, 11.4, 875, 290, 0.01); op(this.xbill, prog(t, 11.4, 11.6) * (1 - away));
      pop(this.noad, t, 11.8, 875, 160); op(this.noad, prog(t, 11.8, 12) * (1 - away));
      pop(this.giftg, t, 13.4, 560, 560); op(this.giftg, prog(t, 13.4, 13.6) * (1 - away));
      pop(this.xgift, t, 14.8, 560, 520, 0.01); op(this.xgift, prog(t, 14.8, 15) * (1 - away));
      pop(this.nosam, t, 15.2, 560, 420); op(this.nosam, prog(t, 15.2, 15.4) * (1 - away));
      pop(this.bigtin, t, 18.6, 860, 420, 0.7);
      pop(this.okn, t, 21.2, 960, 290, 0.01); pop(this.bf, t, 20.2, 860, 170);
    },
  };

  // ---------- rules: four principles to remember ----------
  S.rules = {
    build: () => `<rect width="1280" height="720" fill="#F7E7C9"/><rect width="1280" height="720" fill="url(#p-dots)"/>
      <text class="rt" x="640" y="118" text-anchor="middle" font-family="Inter Display, Inter, sans-serif" font-size="60" font-weight="800" fill="${C.ink}" letter-spacing="-1" data-t="rulesTitle" opacity="0"></text>
      ${[ic.microscope, ic.temple, ic.eq, `<g transform="scale(.17) translate(-511 -349)">${REG.map((d, i) => `<path d="${d}" fill="${i === 1 ? '#EBA28F' : '#BFDDB0'}" stroke="#FFF8EC" stroke-width="10"/>`).join('')}</g>`].map((icon, i) => `<g class="rc rc${i}" opacity="0">
        <rect x="-130" y="-170" width="260" height="320" rx="28" fill="#FFF8EC" filter="url(#f-shadow)"/>
        <circle cx="0" cy="-70" r="66" fill="${['#EAF0F7', '#E3F1EE', '#E7F4EA', '#F7EBDD'][i]}"/>
        <g transform="translate(0 -70)">${icon}</g>
        <circle cx="-96" cy="-136" r="22" fill="${C.terracotta}"/><text x="-96" y="-127" text-anchor="middle" font-size="24" font-weight="800" fill="#FFF6E6">${i + 1}</text>
        <text x="0" y="70" text-anchor="middle" font-size="26" font-weight="700" fill="${C.ink}" data-t="rules.${i}" data-wrap="14" data-lh="32"></text>
      </g>`).join('')}`,
    init(g) { this.rt = g.querySelector('.rt'); this.cards = [...g.querySelectorAll('.rc')]; },
    update(t) {
      op(this.rt, prog(t, 0.1, 0.6));
      this.cards.forEach((c, i) => { const p = prog(t, 0.6 + i * 0.8, 1.2 + i * 0.8, ease.back); op(c, prog(t, 0.6 + i * 0.8, 0.9 + i * 0.8)); tf(c, 205 + i * 290, 410 + (1 - p) * 60, lerp(0.85, 1, p)); });
    },
  };

  // ---------- 8. quiz, recap, end ----------
  S.quizbg = quizScene();
  S.recap = recapScene([
    `${ICONS.syringe}<g transform="translate(34 30)"><circle r="20" fill="#FFFFFF" stroke="${C.ink}" stroke-width="4"/><path d="M0 0 V-11 M0 0 H8" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/></g>`,
    stampMark(1.3),
    `<g transform="translate(-44 26) scale(.26)">${reefer('mini').replace(/class="wheel"/g, 'class="w"')}</g>`,
  ]);
  S.end = endScene();

  window.SPS_SCENES = { scenes: S, defs, clamp };
})();

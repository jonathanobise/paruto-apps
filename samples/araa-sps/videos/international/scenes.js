// International standards module: Aïcha's small abattoir sells meat to a coastal city.
// Scenes built from the shared kit (shared/art.js); the art only this module needs is below.
(function () {
  const { C, ease, prog, lerp, tf, op, defs, acacia, landscape, cow, prepCow, poseCow, person, prepPerson, posePerson,
    chip, check, cross, syringe, ICONS, clamp, titleScene, quizScene, recapScene, endScene } = window.SPS_ART;
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
    worker: { robe: C.teal, robe2: '#17665C', legs: '#EDEDED', skin: '#6B3E26', apron: true,
      hat: `<path d="M-18 -152 Q -17 -175 1 -175 Q 19 -175 18 -152Z" fill="#FFFFFF" stroke="#D9D5C4" stroke-width="2"/>` },
  };
  const personX = (kind, item = '') => {
    const k = LOOKS[kind];
    const body = k.dress ? 'M-33 -8 L -22 -124 Q 0 -134 22 -124 L 35 -8 Q 0 -2 -33 -8Z'
      : k.shirt ? 'M-26 -66 L -22 -124 Q 0 -134 22 -124 L 26 -66 Q 0 -60 -26 -66Z'
        : 'M-30 -36 L -22 -124 Q 0 -134 22 -124 L 32 -36 Q 0 -30 -30 -36Z';
    const leg = (x) => `<g class="p-leg" data-x="${x}" transform="translate(${x} -44)"><rect x="-6" y="0" width="12" height="44" rx="5" fill="${k.legs}"/><rect x="-7" y="38" width="20" height="8" rx="4" fill="#3B2A1E"/></g>`;
    const items = { phone: `<rect x="-7" y="46" width="15" height="26" rx="3" fill="#1F2430"/><rect x="-5" y="49" width="11" height="18" rx="1" fill="#7FB7C9"/>` };
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
  const pop = (el, t, t0, x, y, s0 = 0.6) => { const p = prog(t, t0, t0 + 0.45, ease.back); op(el, prog(t, t0, t0 + 0.2)); tf(el, x, y, lerp(s0, 1, p)); };
  const popOut = (el, t, t0, t1, x, y, s0 = 0.6) => { pop(el, t, t0, x, y, s0); op(el, prog(t, t0, t0 + 0.2) * (1 - prog(t, t1, t1 + 0.4))); };

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

// WAEMU module (full length): Koffi, a city butcher, buys only inspected meat and keeps a notebook that lets
// the veterinary services trace a batch. Scenes built from the shared kit (shared/art.js).
(function () {
  const { C, clamp, ease, prog, lerp, tf, op, defs, landscape, acacia, cow, prepCow, poseCow, person, prepPerson, posePerson,
    chip, check, cross, virus, titleScene, quizScene, recapScene, endScene,
    pop, board, flagA, flagB, card, label, ic, g1, fly } = window.SPS_ART;
  const S = {};
  S.title = titleScene();

  // ---------- module art ----------
  const VIOLET = '#6B4FA0', MEAT = '#C8483A', MEAT2 = '#A9372C', FAT = '#F2CDBE', STEEL = '#8E8A80';

  // People with the shared rig (same classes, so prepPerson/posePerson drive them).
  const human = (cls, look) => `<g class="person ${cls}">
      <ellipse cx="0" cy="2" rx="34" ry="7" fill="#5A3A1A" opacity=".16"/>
      <g class="p-body">
        <g class="p-leg" data-x="-8" transform="translate(-8 -44)"><rect x="-6" y="0" width="12" height="44" rx="5" fill="${look.pants}"/><rect x="-7" y="38" width="20" height="8" rx="4" fill="#3B2A1E"/></g>
        <g class="p-leg" data-x="8" transform="translate(8 -44)"><rect x="-6" y="0" width="12" height="44" rx="5" fill="${look.pants}"/><rect x="-7" y="38" width="20" height="8" rx="4" fill="#3B2A1E"/></g>
        <g class="p-arm back" transform="translate(-10 -118)"><rect x="-6" y="0" width="12" height="56" rx="6" fill="${look.robe2}"/><circle cy="58" r="6.5" fill="${look.skin}"/></g>
        <path d="${look.body || 'M-30 -36 L -22 -124 Q 0 -134 22 -124 L 32 -36 Q 0 -30 -30 -36Z'}" fill="${look.robe}"/>
        ${look.extra || ''}
        <rect x="-6" y="-138" width="12" height="12" fill="${look.skin}"/>
        <g class="p-head">
          <circle cx="0" cy="-150" r="18" fill="${look.skin}"/>
          <circle cx="8" cy="-152" r="2.2" fill="#140D08"/>
          <path class="mouth" d="${look.mouth || 'M6 -142 Q 11 -139 15 -143'}" stroke="#140D08" stroke-width="2" fill="none" stroke-linecap="round"/>
          ${look.hat || ''}
        </g>
        <g class="p-arm front" transform="translate(12 -118)"><rect x="-6" y="0" width="12" height="56" rx="6" fill="${look.robe2}"/><circle cy="58" r="6.5" fill="${look.skin}"/>${look.item || ''}</g>
      </g>
    </g>`;
  const meatCut = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-22 -4 Q -24 -18 -6 -20 Q 18 -22 24 -8 Q 28 8 8 12 Q -18 14 -22 -4Z" fill="${MEAT}"/><path d="M-22 -4 Q -24 -18 -6 -20 Q 18 -22 24 -8" stroke="${FAT}" stroke-width="5" fill="none"/><circle cx="6" cy="-2" r="4" fill="#F7F1E6"/></g>`;
  const package_ = (stamped) => `<g><rect x="-26" y="-16" width="52" height="32" rx="6" fill="#F4E6CC" stroke="#D9C3A0" stroke-width="2"/><path d="M-26 -2 H26" stroke="#D9C3A0" stroke-width="2"/>${stamped ? `<ellipse cx="10" cy="6" rx="10" ry="6" fill="none" stroke="${VIOLET}" stroke-width="2.5"/>` : ''}</g>`;
  const LOOKS = {
    koffi: { robe: '#B5562F', robe2: '#9A4524', pants: '#3E3A4F', skin: '#5A3320',
      hat: `<path d="M-18 -158 Q -16 -174 2 -174 Q 20 -174 18 -158Z" fill="#2B1E16"/><path d="M-18 -158 H 18" stroke="#F1E6CF" stroke-width="3"/>`,
      extra: `<path d="M-19 -112 L 19 -112 L 27 -40 Q 0 -34 -25 -40Z" fill="#F7F5EE"/><path d="M-14 -112 Q 0 -132 14 -112" stroke="#F7F5EE" stroke-width="4" fill="none"/><path d="M-22 -86 H 24" stroke="#E2DED0" stroke-width="3"/>` },
    trader: { robe: '#5E7A3A', robe2: '#4B632D', pants: '#E9DFC9', skin: '#6B3E26',
      hat: `<path d="M-17 -158 Q -16 -172 2 -172 Q 20 -172 17 -158Z" fill="#F1E6CF"/>`,
      item: `<g transform="translate(-4 60)"><rect x="-32" y="0" width="64" height="9" rx="3" fill="#8A5A2B"/>${meatCut(-14, -8, .55)}${meatCut(14, -8, .55)}</g>` },
    awa: { robe: '#E2B33C', robe2: '#C99520', pants: '#C99520', skin: '#7A4A2E', mouth: 'M7 -142 Q 11 -140 14 -142',
      body: 'M-34 -36 L -22 -124 Q 0 -134 22 -124 L 36 -36 Q 0 -28 -34 -36Z',
      hat: `<path d="M-20 -152 Q -24 -182 2 -184 Q 26 -182 20 -152 Q 0 -160 -20 -152Z" fill="${C.terracotta}"/><path d="M14 -178 Q 30 -186 24 -168" fill="${C.terracotta}"/>`,
      extra: `<path d="M-30 -70 Q 0 -62 34 -70" stroke="${C.terracotta}" stroke-width="6" fill="none"/>` },
    sam: { robe: '#7FA7C9', robe2: '#6A90B0', pants: '#3E3A4F', skin: '#4E2C1B',
      hat: `<path d="M-18 -156 Q -14 -172 2 -170 Q 18 -170 18 -156 Q 2 -162 -18 -156Z" fill="#1D140E"/>` },
  };
  const koffi = () => human('koffi', LOOKS.koffi);

  // A market stall; origin = middle of the counter's foot. Split in two so a vendor can stand between.
  const stall = (cls, x, y, s, kind) => {
    const stripes = Array.from({ length: 10 }, (_, i) => `<rect x="${-170 + i * 34}" y="-300" width="34" height="40" fill="${i % 2 ? '#FFF6E6' : (kind === 'veg' ? C.teal : C.terracotta)}"/>`).join('');
    const scallops = Array.from({ length: 10 }, (_, i) => `<circle cx="${-153 + i * 34}" cy="-260" r="17" fill="${i % 2 ? '#FFF6E6' : (kind === 'veg' ? C.teal : C.terracotta)}"/>`).join('');
    const hanging = kind === 'butcher' ? [-122, 122].map((hx) => `<path d="M${hx} -238 v10" stroke="${STEEL}" stroke-width="3"/><path d="M${hx - 16} -226 Q ${hx} -236 ${hx + 16} -226 Q ${hx + 22} -190 ${hx + 8} -160 Q ${hx} -150 ${hx - 8} -160 Q ${hx - 22} -190 ${hx - 16} -226Z" fill="${MEAT}"/><path d="M${hx - 8} -218 Q ${hx - 2} -196 ${hx - 6} -172" stroke="${FAT}" stroke-width="4" fill="none"/>`).join('') : '';
    const goods = kind === 'veg'
      ? [[-96, '#D64534'], [-66, '#D64534'], [-81, '#D64534'], [40, '#E9A14B'], [70, '#E9A14B'], [55, '#E9A14B'], [-10, '#6E8B3D'], [10, '#86A24C']].map(([gx, f], i) => `<circle cx="${gx}" cy="${i % 3 === 2 ? -114 : -102}" r="13" fill="${f}"/>`).join('')
      : kind === 'butcher' ? `${meatCut(-92, -106, .8)}${meatCut(92, -106, .8)}<rect x="-60" y="-104" width="34" height="6" rx="2" fill="#7A6A55"/>` : `${meatCut(-60, -106, .8)}${meatCut(0, -106, .8)}${meatCut(60, -106, .8)}`;
    return {
      back: `<g class="${cls}-back" transform="translate(${x} ${y}) scale(${s})">
        <rect x="-166" y="-300" width="8" height="300" fill="#7A5A3A"/><rect x="158" y="-300" width="8" height="300" fill="#7A5A3A"/>
        <path d="M-180 -312 L 180 -312 L 172 -298 L -172 -298Z" fill="#7A3A22"/>${stripes}${scallops}
        ${kind === 'butcher' ? `<path d="M-140 -240 H 140" stroke="${STEEL}" stroke-width="4"/>` : ''}${hanging}</g>`,
      front: `<g class="${cls}-front" transform="translate(${x} ${y}) scale(${s})">
        <rect x="-150" y="-98" width="300" height="98" rx="6" fill="#A9733F"/><rect x="-140" y="-82" width="280" height="74" rx="4" fill="#8F5E32"/>
        <rect x="-156" y="-104" width="312" height="12" rx="4" fill="#C08A55"/>${goods}
        <g class="shutter" transform="translate(0 -258) scale(1 0)"><rect x="-166" y="0" width="332" height="258" fill="${STEEL}"/>${Array.from({ length: 12 }, (_, i) => `<path d="M-166 ${i * 21 + 12} H166" stroke="#77736A" stroke-width="3"/>`).join('')}</g>
        <g class="closed-sign" opacity="0"><rect x="-90" y="-176" width="180" height="56" rx="8" fill="${C.red}" filter="url(#f-shadow)"/><text y="-138" text-anchor="middle" font-size="27" font-weight="900" fill="#FFF6E6" letter-spacing="2" data-t="closed"></text></g>
      </g>`,
    };
  };
  const prepStall = (root, cls) => ({ shutter: root.querySelector(`.${cls}-front .shutter`), sign: root.querySelector(`.${cls}-front .closed-sign`) });
  const shut = (st, p, signP) => { st.shutter.setAttribute('transform', `translate(0 -258) scale(1 ${Math.max(0.0001, p).toFixed(3)})`); op(st.sign, signP); };

  const cityBg = () => `<rect width="1280" height="720" fill="url(#g-sky)"/>
      <g class="sun"><circle r="150" fill="url(#g-sun)" opacity=".55"/><circle r="62" fill="#F8C062"/></g>
      <g fill="#E9C793">${[[0, 330, 140], [130, 290, 110], [230, 350, 160], [380, 300, 120], [490, 340, 150], [630, 280, 110], [730, 320, 170], [890, 300, 120], [1000, 345, 150], [1140, 310, 140]].map(([bx, by, bw]) => `<rect x="${bx}" y="${by}" width="${bw}" height="${480 - by}"/>`).join('')}</g>
      <g fill="#F4DDB3">${[[30, 360], [70, 360], [160, 320], [270, 380], [310, 380], [420, 330], [530, 370], [570, 370], [660, 310], [770, 350], [820, 350], [920, 330], [1040, 375], [1180, 340], [1220, 340]].map(([wx, wy]) => `<rect x="${wx}" y="${wy}" width="18" height="24" rx="2"/>`).join('')}</g>
      <rect y="470" width="1280" height="250" fill="#E7B77A"/><path d="M0 470 H1280" stroke="#D9A066" stroke-width="6"/>
      <path d="M0 640 Q 400 620 800 632 T 1280 626 V720 H0Z" fill="#D9A066"/>`;

  const notebook = (cls) => `<g class="${cls}" opacity="0">
      <g filter="url(#f-shadow)"><rect x="-190" y="-150" width="380" height="300" rx="12" fill="#FFFBF2" stroke="#E2D2B2" stroke-width="2"/></g>
      <rect x="-190" y="-150" width="34" height="300" rx="10" fill="${C.teal}"/>
      ${[-120, -80, -40, 0, 40, 80, 120].map((sy) => `<circle cx="-173" cy="${sy}" r="5" fill="#FFF6E6"/>`).join('')}
      <text x="-130" y="-104" font-size="25" font-weight="800" fill="${C.ink}" data-t="notebook"></text>
      <path d="M-130 -88 H 164" stroke="#E8D8BB" stroke-width="3"/>
      ${[0, 1, 2].map((i) => `<g class="nb-row nb${i}">
        <rect class="hl" x="-138" y="${-62 + i * 66}" width="310" height="50" rx="8" fill="#F7D774" opacity="0"/>
        <text x="-128" y="${-30 + i * 66}" font-size="20" font-weight="700" fill="#7A6748" data-t="nb.${i}"></text>
        <path class="ink" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1" d="M10 ${-34 + i * 66} c 10 -14 18 8 28 -4 s 16 -10 24 2 s 18 6 30 -6 s 20 4 30 0 s 14 -8 24 2" stroke="#2B3A8A" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      </g>`).join('')}
    </g>`;

  const bell = `<g><path d="M-16 10 Q -16 -18 0 -20 Q 16 -18 16 10 L 22 16 H -22Z" fill="#FFF6E6"/><circle cy="20" r="5" fill="#FFF6E6"/><path d="M0 -20 V -26" stroke="#FFF6E6" stroke-width="4" stroke-linecap="round"/></g>`;
  const phoneIcon = `<g><rect x="-30" y="-52" width="60" height="104" rx="12" fill="${C.ink}"/><rect x="-24" y="-40" width="48" height="76" rx="4" fill="#FBEBD0"/><circle cy="44" r="4" fill="#FBEBD0"/><circle cx="0" cy="-4" r="17" fill="${C.red}"/><path d="M0 -14 V -1" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/><circle cy="7" r="2.6" fill="#fff"/><path d="M40 -28 q 12 12 0 24 M50 -38 q 22 22 0 44" stroke="${C.red}" stroke-width="5" fill="none" stroke-linecap="round"/></g>`;
  const stampIcon = `<g><rect x="-12" y="-62" width="24" height="34" rx="10" fill="#8A5A2B"/><rect x="-30" y="-30" width="60" height="14" rx="4" fill="#5E3E22"/><ellipse cx="0" cy="22" rx="46" ry="28" fill="none" stroke="${VIOLET}" stroke-width="6"/><path d="M-16 22 L -4 33 L 18 10" stroke="${VIOLET}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  const notebookIcon = `<g><rect x="-40" y="-50" width="80" height="100" rx="8" fill="#FFFBF2" stroke="${C.teal}" stroke-width="5"/><rect x="-40" y="-50" width="18" height="100" rx="6" fill="${C.teal}"/><path d="M-12 -24 H 28 M-12 -4 H 28 M-12 16 H 18" stroke="#CDBB9A" stroke-width="6" stroke-linecap="round"/><path d="M14 34 l 30 -30 l 8 8 l -30 30 l -11 3z" fill="#E9A14B"/></g>`;

  // ---------- 1. market (meet) ----------
  const cust = [['awa', 380, 0.4, 3.4], ['sam', 470, 0.8, 3.8]];
  S.market = {
    build() {
      const k = stall('ks', 700, 610, 1, 'butcher'), v = stall('vl', 160, 520, .62, 'veg'), r = stall('vr', 1150, 520, .62, 'veg');
      return `${cityBg()}${v.back}${v.front}${r.back}${r.front}${k.back}${koffi()}${k.front}
        ${cust.map(([c]) => human('c-' + c, LOOKS[c])).join('')}
        <g class="pkg" opacity="0">${package_(true)}</g>
        ${chip('name', 300, 'nameTag', { tail: true })}`;
    },
    init(g) {
      this.sun = g.querySelector('.sun'); this.k = g.querySelector('.person.koffi'); prepPerson(this.k);
      this.cs = cust.map(([c]) => { const p = g.querySelector('.person.c-' + c); prepPerson(p); return p; });
      this.name = g.querySelector('.name'); this.pkg = g.querySelector('.pkg');
    },
    update(t, idle) {
      tf(this.sun, 1040, 140);
      const handing = t > 6 && t < 8;
      posePerson(this.k, 700, 600, 1.05, 0, 0, idle, handing ? -70 : t > 2 && t < 5.5 ? -40 + Math.sin(idle * 7) * 14 : null, true);
      cust.forEach(([, x, t0, t1], i) => {
        const p = prog(t, t0, t1); posePerson(this.cs[i], lerp(-120 - i * 90, x, p), 640, 1.02, t > t0 && p < 1 ? 1 - p * p : 0, t * 7.5 + i, idle + i, i === 1 && t > 7 && t < 9 ? -60 : null);
      });
      const pn = prog(t, 1.4, 2.2, ease.back); op(this.name, prog(t, 1.4, 1.7)); tf(this.name, 700, 300, lerp(0.6, 1, pn));
      const pp = prog(t, 6.2, 8.0, ease.inOut); op(this.pkg, prog(t, 6.0, 6.3)); tf(this.pkg, lerp(640, 500, pp), lerp(500, 540, pp) - Math.sin(pp * Math.PI) * 40);
    },
  };

  // ---------- 2. chain: from herd to plate ----------
  const nodesX = [170, 405, 640, 875, 1110], NY = 420;
  const nodeIcon = [
    `<g transform="translate(2 22) scale(.42)">${cow(0)}</g>`,
    `<g><path d="M-40 -2 L 0 -38 L 40 -2Z" fill="${C.terracotta}"/><rect x="-34" y="-2" width="68" height="30" fill="#F1E2C4"/><g transform="translate(0 30) scale(.24)" fill="#7A4E2D"><ellipse cx="0" cy="-30" rx="44" ry="22"/><ellipse cx="24" cy="-50" rx="14" ry="11"/><path d="M40 -60 L70 -60 L66 -36 L44 -34Z"/></g></g>`,
    `<g><rect x="-38" y="-14" width="76" height="46" fill="#F7F5EE" stroke="#D8CDB6" stroke-width="2"/><path d="M-46 -12 L 0 -40 L 46 -12Z" fill="${C.terracotta}"/><rect x="-10" y="8" width="20" height="24" fill="#9FC7C9"/><ellipse cx="22" cy="-2" rx="9" ry="6" fill="none" stroke="${VIOLET}" stroke-width="3"/></g>`,
    `<g><rect x="-40" y="-36" width="80" height="16" fill="${C.terracotta}"/><path d="M-40 -20 h80" stroke="#FFF6E6" stroke-width="4" stroke-dasharray="10 10"/><path d="M-14 -16 Q 0 -22 14 -16 Q 18 6 6 22 Q 0 28 -6 22 Q -18 6 -14 -16Z" fill="${MEAT}"/><rect x="-44" y="22" width="88" height="12" rx="3" fill="#A9733F"/></g>`,
    `<g><ellipse cx="0" cy="10" rx="40" ry="16" fill="#FFFBF2" stroke="#D8CDB6" stroke-width="3"/><ellipse cx="0" cy="8" rx="26" ry="9" fill="#EFE3CC"/>${meatCut(0, 6, .6)}<path d="M-52 -20 V 26 M52 -20 V 26 M56 -20 V -2" stroke="#8E8A80" stroke-width="4" stroke-linecap="round"/></g>`,
  ];
  const pillarIcon = [
    `<g><path d="M0 18 V -4" stroke="#5E7A3A" stroke-width="4"/><path d="M0 -2 Q -18 -6 -16 -22 Q 0 -18 0 -2Z M0 -6 Q 16 -12 18 -26 Q 2 -24 0 -6Z" fill="#6E8B3D"/></g>`,
    `<g transform="translate(0 16) scale(.3)">${cow(1)}</g>`,
    `<g><ellipse cx="0" cy="8" rx="22" ry="9" fill="#FFFBF2" stroke="#D8CDB6" stroke-width="2"/><path d="M-14 6 Q -12 -14 0 -14 Q 12 -14 14 6Z" fill="#E9A14B"/></g>`,
  ];
  S.chain = {
    build: () => `<rect width="1280" height="720" fill="#FBF1DF"/><rect width="1280" height="720" fill="url(#p-dots)"/>
      <g class="reg" opacity="0">
        <rect x="-330" y="-46" width="660" height="92" rx="20" fill="#FFF8EC" filter="url(#f-shadow)"/>
        <rect x="-306" y="-28" width="44" height="56" rx="4" fill="#FFFBF2" stroke="${C.teal}" stroke-width="3"/><path d="M-298 -14 h28 M-298 -2 h28 M-298 10 h18" stroke="#CDBB9A" stroke-width="3"/>
        <text x="-246" y="-6" font-size="24" font-weight="800" fill="${C.ink}" data-t="reg"></text>
        ${[0, 1, 2].map((i) => `<g transform="translate(${-200 + i * 160} 22)"><g transform="translate(-6 0) scale(.62)">${pillarIcon[i]}</g><text x="14" y="7" font-size="17" font-weight="650" fill="#6B5440" data-t="pillars.${i}"></text></g>`).join('')}
      </g>
      <defs><marker id="w-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#C9A673"/></marker></defs>
      ${nodesX.slice(0, 4).map((x, i) => `<path class="link l${i}" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1" d="M${x + 72} ${NY} H ${nodesX[i + 1] - 76}" stroke="#C9A673" stroke-width="6" stroke-linecap="round" marker-end="url(#w-arrow)"/>`).join('')}
      ${nodesX.map((x, i) => `<g class="node n${i}" opacity="0">
        <circle r="64" fill="#FFF8EC" stroke="#E2C99C" stroke-width="5" filter="url(#f-shadow)"/>${nodeIcon[i]}
        <text y="104" text-anchor="middle" font-size="21" font-weight="700" fill="${C.ink}" data-t="chain.${i}" data-wrap="15" data-lh="25"></text>
      </g>`).join('')}
      <g class="folder" opacity="0"><rect x="-22" y="-16" width="44" height="32" rx="4" fill="#E9A14B"/><path d="M-22 -16 h16 l6 -6 h22 v6" fill="#E9A14B"/><rect x="-16" y="-10" width="32" height="20" rx="2" fill="#FFF6E6"/><path d="M-10 -3 h20 M-10 3 h14" stroke="#CDBB9A" stroke-width="2.5"/></g>
      ${nodesX.map((_, i) => check('ok ok' + i)).join('')}`,
    init(g) {
      this.reg = g.querySelector('.reg'); this.links = [...g.querySelectorAll('.link')]; this.nodes = [...g.querySelectorAll('.node')];
      this.folder = g.querySelector('.folder'); this.oks = [...g.querySelectorAll('.ok')];
    },
    update(t, idle) {
      const pr = prog(t, 0.3, 1.0, ease.back); op(this.reg, prog(t, 0.3, 0.6)); tf(this.reg, 640, 130, lerp(0.85, 1, pr));
      this.nodes.forEach((n, i) => { const p = prog(t, 1.6 + i * 0.9, 2.2 + i * 0.9, ease.back); op(n, prog(t, 1.6 + i * 0.9, 1.9 + i * 0.9)); tf(n, nodesX[i], NY, lerp(0.5, 1, p)); });
      this.links.forEach((l, i) => l.setAttribute('stroke-dashoffset', (1 - prog(t, 2.1 + i * 0.9, 2.6 + i * 0.9)).toFixed(3)));
      // the record travels node to node, pausing at each
      const u = clamp((t - 2.4) / 7.2) * 4, k = Math.min(3, Math.floor(u)), f = ease.inOut(clamp((u - k) * 1.6 - 0.3));
      op(this.folder, prog(t, 2.4, 2.7)); tf(this.folder, lerp(nodesX[k], nodesX[k + 1], u >= 4 ? 1 : f), NY - 92 + Math.sin(idle * 3) * 3);
      this.oks.forEach((o, i) => { const p = prog(t, 10.9 + i * 0.45, 11.3 + i * 0.45, ease.back); op(o, prog(t, 10.9 + i * 0.45, 11.1 + i * 0.45)); tf(o, nodesX[i] + 48, NY - 50, Math.max(0.001, p)); });
    },
  };

  // ---------- 3. offer (choice 1): cheap meat without a stamp ----------
  S.offer = {
    build() {
      const k = stall('ks', 760, 610, 1, 'butcher'), v = stall('vl', 140, 520, .62, 'veg');
      return `${cityBg()}${v.back}${v.front}${k.back}${koffi()}${k.front}${human('trader', LOOKS.trader)}
        ${chip('cheap', 240, 'cheap', { fill: '#F2C14E', size: 25 })}
        ${chip('nostamp', 240, 'noStamp', { fill: C.red, color: '#FFF6E6', size: 25 })}`;
    },
    init(g) {
      this.sun = g.querySelector('.sun'); this.k = g.querySelector('.person.koffi'); prepPerson(this.k);
      this.tr = g.querySelector('.person.trader'); prepPerson(this.tr); this.cheap = g.querySelector('.cheap'); this.ns = g.querySelector('.nostamp');
    },
    update(t, idle) {
      tf(this.sun, 1040, 140);
      posePerson(this.k, 760, 600, 1.05, 0, 0, idle, null, true);
      const p = prog(t, 0.1, 2.4);
      posePerson(this.tr, lerp(-120, 470, p), 640, 1.05, p < 1 ? 1 - p * p : 0, t * 7.5, idle, p >= 1 ? -62 + Math.sin(idle * 2) * 3 : -40);
      const pc = prog(t, 2.5, 3.0, ease.back); op(this.cheap, prog(t, 2.5, 2.7)); tf(this.cheap, 220, 470, lerp(0.6, 1, pc), -4);
      const pn = prog(t, 3.1, 3.6, ease.back); op(this.ns, prog(t, 3.1, 3.3)); tf(this.ns, 230, 540, lerp(0.6, 1, pn), 3);
    },
  };

  // ---------- 4. sick: the consequences (variant 1: ill customers, shop closed; variant 2: market stopped) ----------
  const swirl = (cls) => `<g class="${cls}" opacity="0"><circle r="22" fill="#E3F1C8" stroke="#8DB04A" stroke-width="3"/><path d="M-8 -2 q 4 -8 8 0 t 8 0" stroke="#5E7A3A" stroke-width="3" fill="none"/><path d="M-9 8 q 9 -6 18 0" stroke="#5E7A3A" stroke-width="3" fill="none"/></g>`;
  S.sick = {
    build() {
      const a = stall('sa', 210, 560, .7, 'veg'), k = stall('ks', 640, 600, 1, 'butcher'), b = stall('sb', 1070, 560, .7, 'meat');
      return `${cityBg()}${a.back}${a.front}${b.back}${b.front}${k.back}${koffi()}${k.front}
        ${human('c-awa', LOOKS.awa)}${human('c-sam', LOOKS.sam)}${person('vet')}
        ${swirl('sw sw0')}${swirl('sw sw1')}${cross('xmark')}
        <g class="qs" opacity="0" fill="${C.ink}" font-size="44" font-weight="900"><text x="-34" y="0">?</text><text x="0" y="-22">?</text><text x="30" y="2">?</text></g>
        ${chip('inv', 400, 'investigation', { size: 23 })}
        ${chip('stopc', 330, 'salesStopped', { fill: C.red, color: '#FFF6E6' })}`;
    },
    init(g) {
      this.sun = g.querySelector('.sun'); this.k = g.querySelector('.person.koffi'); prepPerson(this.k);
      this.a = g.querySelector('.person.c-awa'); prepPerson(this.a); this.s = g.querySelector('.person.c-sam'); prepPerson(this.s);
      this.v = g.querySelector('.person.vet'); prepPerson(this.v);
      this.st = ['sa', 'ks', 'sb'].map((c) => prepStall(g, c));
      this.sw = [...g.querySelectorAll('.sw')]; ['xmark', 'qs', 'inv', 'stopc'].forEach((c) => (this[c] = g.querySelector('.' + c)));
    },
    update(t, idle, variant = 1) {
      tf(this.sun, 1040, 140);
      const v2 = variant === 2;
      // customers (variant 1: unwell, hands to stomach)
      posePerson(this.a, 250, 650, 1.02, 0, 0, idle, v2 ? null : -30, false);
      posePerson(this.s, 360, 655, 1.02, 0, 0, idle + 1, v2 ? null : -34, false);
      this.sw.forEach((w, i) => { const p = prog(t, 0.6 + i * 0.4, 1.0 + i * 0.4, ease.back); op(w, v2 ? 0 : prog(t, 0.6 + i * 0.4, 0.8 + i * 0.4)); tf(w, [250, 360][i] + 28, 455 - Math.sin(idle * 2 + i) * 4, Math.max(0.001, p)); });
      // the vet arrives
      const pv = prog(t, v2 ? 0.2 : 4.4, v2 ? 2.4 : 6.4);
      posePerson(this.v, lerp(1400, 900, pv), 652, 1.04, pv > 0 && pv < 1 ? 1 : 0, t * 7.5, idle, pv >= 1 ? -50 : null, true);
      const pq = prog(t, 2.4, 2.8, ease.back); op(this.qs, v2 ? prog(t, 2.4, 2.6) * (1 - prog(t, 3.6, 3.9)) : 0); tf(this.qs, 900, 440 + Math.sin(idle * 3) * 3, Math.max(0.001, pq));
      posePerson(this.k, 640, 590, 1.05, 0, 0, idle, null, true);
      if (v2) {
        this.st.forEach((st, i) => shut(st, prog(t, 3.9 + i * 0.35, 4.7 + i * 0.35, ease.inOut), prog(t, 4.7 + i * 0.35, 4.9 + i * 0.35)));
        op(this.xmark, 0); op(this.inv, 0);
        const ps = prog(t, 5.4, 5.9, ease.back); op(this.stopc, prog(t, 5.4, 5.6)); tf(this.stopc, 640, 150, lerp(0.6, 1, ps));
      } else {
        shut(this.st[1], prog(t, 5.0, 6.0, ease.inOut), prog(t, 6.0, 6.2)); shut(this.st[0], 0, 0); shut(this.st[2], 0, 0);
        const px = prog(t, 1.6, 2.0, ease.back); op(this.xmark, prog(t, 1.6, 1.8)); tf(this.xmark, 640, 220, Math.max(0.001, px));
        const pi = prog(t, 6.6, 7.1, ease.back); op(this.inv, prog(t, 6.6, 6.8)); tf(this.inv, 980, 400, lerp(0.6, 1, pi));
        op(this.stopc, 0);
      }
    },
  };

  // ---------- 5. abattoir: inspected meat and the notebook ----------
  S.abattoir = {
    build: () => `${landscape()}${acacia(1180, 488, .9)}
      <g class="abt">
        <rect x="90" y="300" width="460" height="290" fill="#F4EEE3"/><path d="M70 304 L 320 236 L 570 304Z" fill="${C.terracotta}"/>
        <rect x="150" y="248" width="340" height="56" rx="8" fill="${C.teal}" filter="url(#f-shadow)"/>
        <text x="320" y="286" text-anchor="middle" font-size="26" font-weight="800" fill="#FFF6E6" letter-spacing="2" data-t="abattoir"></text>
        <rect x="140" y="360" width="70" height="60" rx="4" fill="#9FC7C9" stroke="#C9B48E" stroke-width="4"/>
        <rect x="290" y="380" width="220" height="210" fill="#5A4636"/><rect x="300" y="390" width="200" height="200" fill="#6E5844"/>
        <path d="M300 410 H 500" stroke="${STEEL}" stroke-width="5"/>
      </g>
      <g class="carcass"><path d="M400 410 v14" stroke="${STEEL}" stroke-width="4"/><path d="M372 426 Q 400 414 428 426 Q 444 480 424 540 Q 400 566 376 540 Q 356 480 372 426Z" fill="${MEAT}"/><path d="M386 436 Q 396 480 388 530" stroke="${FAT}" stroke-width="6" fill="none"/><path d="M414 440 Q 420 470 414 500" stroke="${MEAT2}" stroke-width="5" fill="none"/>
        <g class="mstamp" opacity="0"><ellipse rx="26" ry="17" fill="none" stroke="${VIOLET}" stroke-width="4"/><text y="5" text-anchor="middle" font-size="9.5" font-weight="900" fill="${VIOLET}" data-t="inspected"></text></g></g>
      ${person('vet')}${koffi()}
      <g class="pkg" opacity="0">${package_(true)}</g>
      ${notebook('nbk')}
      <g class="tr" opacity="0">
        <path class="trline" d="M-300 0 H 300" stroke="${C.teal}" stroke-width="5" stroke-dasharray="4 12" stroke-linecap="round"/>
        <g transform="translate(-340 0)"><circle r="44" fill="#FFF8EC" stroke="#E2C99C" stroke-width="4" filter="url(#f-shadow)"/><g transform="translate(2 16) scale(.36)">${cow(2)}</g></g>
        <g transform="translate(340 0)"><circle r="44" fill="#FFF8EC" stroke="#E2C99C" stroke-width="4" filter="url(#f-shadow)"/><g transform="scale(.8)">${nodeIcon[4]}</g></g>
        <circle class="dot" r="10" fill="${C.teal}"/>
        <g transform="translate(0 -2)"><rect x="-130" y="-26" width="260" height="52" rx="26" fill="${C.teal}" filter="url(#f-shadow)"/><text y="9" text-anchor="middle" font-size="24" font-weight="750" fill="#FFF6E6" data-t="trace"></text></g>
      </g>`,
    init(g) {
      this.sun = g.querySelector('.sun'); this.v = g.querySelector('.person.vet'); prepPerson(this.v); this.k = g.querySelector('.person.koffi'); prepPerson(this.k);
      this.ms = g.querySelector('.mstamp'); this.pkg = g.querySelector('.pkg'); this.nb = g.querySelector('.nbk');
      this.inks = [...this.nb.querySelectorAll('.ink')]; this.tr = g.querySelector('.tr'); this.dot = g.querySelector('.tr .dot');
    },
    update(t, idle) {
      tf(this.sun, 140, 100);
      posePerson(this.v, 560, 640, 1.02, 0, 0, idle, t > 2.6 && t < 3.6 ? -64 : null);
      const pk = prog(t, 0.2, 2.4);
      posePerson(this.k, lerp(1380, 720, pk), 646, 1.05, pk > 0 && pk < 1 ? 1 - pk * pk : 0, t * 7.5, idle, t > 3.6 && t < 10 ? -46 : null, true);
      const ps = prog(t, 1.0, 1.3); op(this.ms, ps); this.ms.setAttribute('transform', `translate(402 486) rotate(-8) scale(${lerp(2, 1, ps).toFixed(3)})`);
      const pp = prog(t, 2.8, 3.8, ease.inOut); op(this.pkg, prog(t, 2.7, 2.9) * (1 - prog(t, 10.0, 10.3))); tf(this.pkg, lerp(600, 690, pp), lerp(540, 552, pp) - Math.sin(pp * Math.PI) * 30);
      // the notebook: written row by row, then tucked away
      const pn = prog(t, 4.6, 5.2, ease.back), away = prog(t, 10.0, 10.6, ease.inOut);
      op(this.nb, prog(t, 4.6, 4.8) * (1 - away)); tf(this.nb, 930, 270, lerp(0.6, 1, pn) * (1 - away * 0.6), -2);
      this.inks.forEach((p, i) => p.setAttribute('stroke-dashoffset', (1 - prog(t, 5.4 + i * 1.5, 6.6 + i * 1.5, ease.inOut)).toFixed(3)));
      // traceability: from the herd to the plate, and back
      op(this.tr, prog(t, 10.6, 11.0)); tf(this.tr, 640, 150, lerp(0.9, 1, prog(t, 10.6, 11.2, ease.back)));
      const u = (Math.sin((t - 10.6) * 1.4 - Math.PI / 2) + 1) / 2; tf(this.dot, lerp(-290, 290, u), 0);
    },
  };

  // ---------- 6. alert: arrive 0–6, resolve 6–18.7 ----------
  const statesN = 8, SRC = 3;
  const stateXY = (i) => [640 + Math.cos(Math.PI + (i / (statesN - 1)) * Math.PI) * 300, 200 + Math.sin(Math.PI + (i / (statesN - 1)) * Math.PI) * 90 + 90];
  S.alert = {
    build() {
      const a = stall('sa', 200, 570, .72, 'veg'), k = stall('ks', 680, 610, 1, 'butcher'), b = stall('sb', 1120, 570, .72, 'meat');
      return `${cityBg()}${a.back}${a.front}${b.back}${b.front}${k.back}${koffi()}${k.front}
        <g class="tray"><rect x="-44" y="-8" width="88" height="10" rx="3" fill="#7A6A55"/>${meatCut(-18, -14, .6)}${meatCut(18, -14, .6)}
          <g class="tag" opacity="0"><path d="M30 -30 l 0 -4" stroke="${C.ink}" stroke-width="2"/><rect x="-60" y="-78" width="120" height="40" rx="8" fill="${C.red}"/><text y="-52" text-anchor="middle" font-size="15" font-weight="800" fill="#FFF6E6" data-t="batch"></text></g></g>
        ${person('vet')}
        <g class="al" opacity="0"><circle class="ring" r="60" fill="none" stroke="${C.red}" stroke-width="4"/>
          <rect x="-190" y="-34" width="380" height="68" rx="34" fill="${C.red}" filter="url(#f-shadow)"/><g transform="translate(-148 0)">${bell}</g>
          <text x="22" y="10" text-anchor="middle" font-size="28" font-weight="800" fill="#FFF6E6" data-t="alert"></text></g>
        ${notebook('nbk')}
        ${chip('wd', 300, 'withdrawn', { fill: C.teal, color: '#FFF6E6' })}
        ${chip('carry', 360, 'carryOn', { fill: '#E9F6EE', color: C.green })}
        ${check('okA')}${check('okB')}
        <g class="net" opacity="0">
          <rect x="300" y="64" width="680" height="300" rx="28" fill="#FFF8EC" filter="url(#f-shadow)"/>
          <text x="640" y="114" text-anchor="middle" font-size="26" font-weight="800" fill="${C.ink}" data-t="members"></text>
          ${Array.from({ length: statesN }, (_, i) => { if (i === SRC) return ''; const [x, y] = stateXY(SRC), [x2, y2] = stateXY(i); return `<path class="nl" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1" d="M${x.toFixed(1)} ${y.toFixed(1)} Q ${((x + x2) / 2).toFixed(1)} ${(Math.max(y, y2) + 40).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${C.red}" stroke-opacity=".55" stroke-width="3" fill="none"/>`; }).join('')}
          ${Array.from({ length: statesN }, (_, i) => { const [x, y] = stateXY(i); return `<g class="sn" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle class="pulse" r="22" fill="none" stroke="${C.red}" stroke-width="3" opacity="0"/><circle r="18" fill="${C.teal}"/><circle r="7" fill="#FFF6E6"/></g>`; }).join('')}
        </g>`;
    },
    init(g) {
      this.sun = g.querySelector('.sun'); this.k = g.querySelector('.person.koffi'); prepPerson(this.k); this.v = g.querySelector('.person.vet'); prepPerson(this.v);
      this.al = g.querySelector('.al'); this.ring = g.querySelector('.al .ring'); this.tray = g.querySelector('.tray'); this.tag = g.querySelector('.tray .tag');
      this.nb = g.querySelector('.nbk'); this.inks = [...this.nb.querySelectorAll('.ink')]; this.hl = this.nb.querySelector('.nb1 .hl');
      ['wd', 'carry', 'okA', 'okB', 'net'].forEach((c) => (this[c] = g.querySelector('.' + c)));
      this.nls = [...g.querySelectorAll('.nl')]; this.pulses = [...g.querySelectorAll('.sn .pulse')];
    },
    update(t, idle) {
      tf(this.sun, 1040, 140);
      // 0–6: the alert goes out, a veterinary officer comes to the market
      const pa = prog(t, 0.4, 0.9, ease.back); op(this.al, prog(t, 0.4, 0.6) * (1 - prog(t, 6.2, 6.6)));
      tf(this.al, 640, 120, lerp(0.6, 1, pa)); const rp = (idle * 0.8) % 1; this.ring.setAttribute('r', (60 + rp * 160).toFixed(1)); op(this.ring, (1 - rp) * 0.6);
      const pv = prog(t, 1.2, 4.2);
      posePerson(this.v, lerp(-120, 400, pv), 652, 1.04, pv > 0 && pv < 1 ? 1 - pv * pv : 0, t * 7.5, idle, pv >= 1 && t < 6.2 ? -40 : t > 6.2 && t < 11 ? -60 : null);
      posePerson(this.k, 680, 600, 1.05, 0, 0, idle, t > 6.2 && t < 11 ? -70 : null, true);
      // 6–11: the notebook finds the batch; it is withdrawn, the rest of the market carries on
      this.inks.forEach((p) => p.setAttribute('stroke-dashoffset', '0'));
      const pn = prog(t, 6.3, 6.9, ease.back); op(this.nb, prog(t, 6.3, 6.5) * (1 - prog(t, 11.0, 11.4))); tf(this.nb, 420, 300, lerp(0.4, 0.66, pn), -3);
      this.hl.setAttribute('width', (310 * prog(t, 7.0, 7.6, ease.inOut)).toFixed(1)); op(this.hl, 0.85);
      op(this.tag, prog(t, 7.8, 8.0)); const pt = prog(t, 8.6, 9.8, ease.inOut);
      tf(this.tray, lerp(700, 1400, pt), 500 - Math.sin(pt * Math.PI) * 60); op(this.tray, 1 - prog(t, 9.6, 9.8));
      const pw = prog(t, 9.4, 9.9, ease.back); op(this.wd, prog(t, 9.4, 9.6) * (1 - prog(t, 11.6, 12.0))); tf(this.wd, 960, 300, lerp(0.6, 1, pw));
      const pc = prog(t, 10.3, 10.8, ease.back); op(this.carry, prog(t, 10.3, 10.5) * (1 - prog(t, 11.6, 12.0))); tf(this.carry, 640, 400, lerp(0.6, 1, pc));
      [[this.okA, 200, 10.4], [this.okB, 1120, 10.6]].forEach(([o, x, t0]) => { op(o, prog(t, t0, t0 + 0.2)); tf(o, x, 330, Math.max(0.001, prog(t, t0, t0 + 0.4, ease.back))); });
      // 12+: member states share the alert
      const pnet = prog(t, 12.0, 12.6, ease.back); op(this.net, prog(t, 12.0, 12.3)); this.net.setAttribute('transform', `translate(640 214) scale(${lerp(0.9, 1, pnet).toFixed(3)}) translate(-640 -214)`);
      this.nls.forEach((l, i) => l.setAttribute('stroke-dashoffset', (1 - prog(t, 12.8 + i * 0.3, 13.6 + i * 0.3, ease.inOut)).toFixed(3)));
      this.pulses.forEach((p, i) => { const order = i === SRC ? 0 : (i < SRC ? i + 1 : i), start = i === SRC ? 12.5 : 13.6 + (order - 1) * 0.3; const ph = ((idle * 0.9 + i * 0.13) % 1); p.setAttribute('r', (20 + ph * 22).toFixed(1)); op(p, t > start ? (1 - ph) * 0.7 : 0); });
    },
  };

  // ---------- full-length chapters: explainer cards, Koffi's duties, notifiable diseases, an invented map ----------
  const cardsScene = (keys, icons, fills, at, head) => ({
    build: () => `${board()}${head ? chip('hd', 560, head, { fill: C.teal, color: '#FFF6E6' }) : ''}${icons.map((icon, i) => g1('crd crd' + i, `${card(250, 236)}<circle cy="-46" r="54" fill="${fills[i]}"/><g transform="translate(0 -46)">${icon}</g>${label(keys + '.' + i, 58, 15, 21)}`)).join('')}`,
    init(g) { this.hd = g.querySelector('.hd'); this.cards = [...g.querySelectorAll('.crd')]; },
    update(t) {
      if (this.hd) pop(this.hd, t, 0.3, 640, 90);
      const n = this.cards.length, gap = n === 4 ? 283 : 330, x0 = 640 - ((n - 1) * gap) / 2;
      this.cards.forEach((c, i) => pop(c, t, at[i], x0 + i * gap, 380));
    },
  });
  const building = `<g><path d="M-34 -10 L0 -34 L34 -10Z" fill="${C.teal}"/><rect x="-30" y="-10" width="60" height="38" fill="#FFF8EC" stroke="${C.teal}" stroke-width="3"/><rect x="-8" y="8" width="16" height="20" fill="${C.teal}"/><rect x="-24" y="-2" width="10" height="10" fill="#BFE3E6"/><rect x="14" y="-2" width="10" height="10" fill="#BFE3E6"/></g>`;
  const network = `<g stroke="${C.indigo}" stroke-width="3">${[[-28, -18], [26, -22], [0, 22], [-30, 22], [30, 18]].map(([x, y]) => `<path d="M0 0 L${x} ${y}"/>`).join('')}</g>${[[0, 0], [-28, -18], [26, -22], [0, 22], [-30, 22], [30, 18]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i ? 7 : 10}" fill="${i ? '#7F95AE' : C.indigo}"/>`).join('')}`;
  const people3 = `<g>${[-26, 0, 26].map((x, i) => `<g transform="translate(${x} ${i === 1 ? -6 : 4})"><circle cy="-12" r="11" fill="${['#8A5536', '#6B3E26', '#A0643C'][i]}"/><path d="M-18 22 Q -18 0 0 0 Q 18 0 18 22Z" fill="${[C.terracotta, C.teal, C.indigo][i]}"/></g>`).join('')}</g>`;
  const talk = `<g><path d="M-36 -26 H8 Q 16 -26 16 -18 V2 Q 16 10 8 10 H-14 L-24 22 L-22 10 H-36 Q -44 10 -44 2 V-18 Q -44 -26 -36 -26Z" fill="${C.teal}"/><path d="M-2 -6 H34 Q 42 -6 42 2 V20 Q 42 28 34 28 H22 L24 38 L12 28 H-2 Q -10 28 -10 20 V2 Q -10 -6 -2 -6Z" fill="#F2C14E"/></g>`;
  const committee = `<g>${building}<g transform="translate(26 18) scale(.5)"><path d="M-20 -24 L 24 -24 Q 30 0 18 22 L -14 22 Q -26 0 -20 -24Z" fill="#A86F45"/><circle cx="-6" cy="-8" r="3" fill="#1D140E"/><circle cx="10" cy="-8" r="3" fill="#1D140E"/></g></g>`;
  const radio = `<g><rect x="-34" y="-20" width="68" height="44" rx="8" fill="${C.terracotta}"/><circle cx="-12" cy="2" r="12" fill="#FFF6E6"/><circle cx="-12" cy="2" r="5" fill="${C.ink}"/><rect x="6" y="-8" width="20" height="6" rx="2" fill="#FFF6E6"/><rect x="6" y="4" width="20" height="6" rx="2" fill="#FFF6E6"/><path d="M-20 -20 L 18 -40" stroke="${C.ink}" stroke-width="3"/></g>`;
  const redBell = `<g><path d="M-22 14 Q -22 -24 0 -26 Q 22 -24 22 14 L 30 22 H -30Z" fill="${C.red}"/><circle cy="28" r="7" fill="${C.red}"/></g>`;
  S.principles = cardsScene('principles', [ic.temple, ic.microscope, ic.shield(0.4), talk], ['#E3F1EE', '#EAF0F7', '#E7F4EA', '#F9EEDA'], [0.6, 7.6, 14.0, 20.6], 'reg');
  S.institutions = cardsScene('inst', [committee, network, building, people3], ['#E3F1EE', '#EFEDFF', '#EAF0F7', '#F7EBDD'], [0.6, 7.6, 14.0, 20.4], 'commission');
  S.rights = cardsScene('rightsT', [ic.eq, people3, radio], ['#E7F4EA', '#F7EBDD', '#F9EEDA'], [0.6, 7.2, 13.8], null);

  // Koffi at his stall, with the chips for his duties (duties) or for the duty to inform (inform)
  const shopScene = (mode) => ({
    build() {
      const k = stall('ks2', 640, 610, 1, 'butcher');
      return `${cityBg()}${k.back}${koffi()}${k.front}${person('vet')}
        ${mode === 'duties'
          ? `${[0, 1, 2].map((i) => chip('du du' + i, 360, 'duties.' + i, { fill: i ? '#FFF8EC' : C.green, color: i ? C.ink : '#FFF6E6' })).join('')}${notebook('nbk2')}`
          : `${chip('inf', 330, 'informL', { fill: '#FFF8EC', tx: 20, icon: `<g transform="translate(-132 0) scale(.6)">${ic.envelope}</g>` })}${chip('prot', 330, 'protect', { fill: C.green, color: '#FFF6E6' })}
             ${g1('auth', `${card(140, 110)}<g transform="scale(1.1)">${building}</g>`)}${g1('envI', ic.envelope)}
             ${[0, 1, 2].map((i) => chip('pw pw' + i, 280, 'powers.' + i, { fill: C.red, color: '#FFF6E6' })).join('')}${chip('loc', 470, 'local', { fill: '#FFF8EC', size: 22 })}`}`;
    },
    init(g) {
      this.sun = g.querySelector('.sun'); this.k = g.querySelector('.person.koffi'); prepPerson(this.k); this.v = g.querySelector('.person.vet'); prepPerson(this.v);
      ['nbk2', 'inf', 'prot', 'auth', 'envI', 'loc'].forEach((c) => (this[c] = g.querySelector('.' + c)));
      this.du = [...g.querySelectorAll('.du')]; this.pw = [...g.querySelectorAll('.pw')];
      if (this.nbk2) { this.nbk2.querySelectorAll('.ink').forEach((p) => p.setAttribute('stroke-dashoffset', '0')); }
    },
    update(t, idle) {
      tf(this.sun, 1060, 130);
      posePerson(this.k, 640, 560, 0.92, 0, 0, idle, mode === 'duties' && t > 16 ? -70 : mode === 'inform' && t < 6 && t > 1 ? -100 + Math.sin(idle * 6) * 6 : null);
      if (mode === 'duties') {
        [[360, 120, 0.6], [640, 120, 7.8], [920, 120, 15.8]].forEach(([x, y, t0], i) => pop(this.du[i], t, t0, x, y + (i % 2) * 64));
        const vw = prog(t, 15.6, 17.4, ease.out); posePerson(this.v, lerp(1420, 1080, vw), 640, 1.04, t > 15.6 && vw < 1 ? 1 - vw * vw : 0, t * 7.5, idle, null, true);
        pop(this.nbk2, t, 17.6, 900, 380, 0.4); if (t > 17.6) tf(this.nbk2, 900, 380, lerp(0.4, 0.6, prog(t, 17.6, 18.1, ease.back)));
      } else {
        pop(this.inf, t, 1.0, 360, 100); pop(this.prot, t, 5.6, 360, 170);
        pop(this.auth, t, 1.4, 1150, 110); fly(this.envI, t, 2.0, 3.6, [700, 420], [1150, 120], 80);
        [0, 1, 2].forEach((i) => pop(this.pw[i], t, 9.8 + i * 1.6, 350 + i * 290, 245));
        pop(this.loc, t, 16.8, 820, 170);
        posePerson(this.v, 1420, 640, 1, 0, 0, idle);
      }
    },
  });
  S.duties = shopScene('duties');
  S.inform = shopScene('inform');

  // notifiable diseases: the list (0–15.4), then a herder offers Koffi sick cattle (15.6–24)
  S.notifiable = {
    build: () => `<g class="nbBoard">${board()}
        ${g1('list', `${card(760, 470)}<text y="-178" text-anchor="middle" font-size="30" font-weight="800" fill="${C.ink}" data-t="listTitle"></text><text y="-142" text-anchor="middle" font-size="20" font-weight="600" fill="${C.teal}" data-t="listSub"></text>
          ${[0, 1, 2, 3].map((i) => `<g class="dl dl${i}" opacity="0" transform="translate(-300 ${-80 + i * 62})"><circle r="10" fill="${C.red}"/><text x="26" y="9" font-size="26" font-weight="700" fill="${C.ink}" data-t="diseases.${i}"></text></g>`).join('')}
          <text class="dmore" x="0" y="186" text-anchor="middle" font-size="22" font-weight="600" fill="#7A6748" data-t="more" opacity="0"></text>`, 1)}
      </g>
      <g class="yard" opacity="0">${landscape()}${acacia(120, 492, 1)}
        ${[0, 1].map((i) => `<g class="ycow yc${i}">${cow(i + 1)}</g>`).join('')}
        ${human('herder', { ...LOOKS.trader, item: '' })}${koffi()}
        ${[0, 1].map((i) => `<g class="drool dr${i}" opacity="0"><path d="M0 0 q -4 10 0 16 q 4 -6 0 -16Z" fill="#9FD1E6"/><circle cx="-10" cy="-6" r="4" fill="${C.red}"/></g>`).join('')}
        ${chip('droolc', 360, 'drool', { fill: C.red, color: '#FFF6E6' })}
      </g>`,
    init(g) {
      this.board = g.querySelector('.nbBoard'); this.list = g.querySelector('.list'); this.dl = [...g.querySelectorAll('.dl')]; this.more = g.querySelector('.dmore');
      this.yard = g.querySelector('.yard'); this.sun = g.querySelector('.yard .sun'); this.cows = [...g.querySelectorAll('.ycow .cow')]; this.cows.forEach(prepCow);
      this.h = g.querySelector('.person.herder'); prepPerson(this.h); this.k = g.querySelector('.person.koffi'); prepPerson(this.k);
      this.dr = [...g.querySelectorAll('.drool')]; this.droolc = g.querySelector('.droolc');
    },
    update(t, idle) {
      const swap = prog(t, 15.2, 15.8); op(this.board, 1 - swap); op(this.yard, swap);
      pop(this.list, t, 0.4, 640, 360, 0.9);
      this.dl.forEach((d, i) => { op(d, prog(t, 7.8 + i * 1.4, 8.1 + i * 1.4)); });
      op(this.more, prog(t, 13.4, 13.8));
      tf(this.sun, 1050, 140);
      const tt = t - 15.6, w = prog(tt, 0, 3, ease.out);
      [[560, 600, .9], [700, 606, .9]].forEach(([x, y, s], i) => poseCow(this.cows[i], lerp(x - 600, x, w), y, s, tt > 0 && w < 1 ? 1 : 0, t * 7 + i, idle));
      posePerson(this.h, lerp(-160, 360, w), 640, 1.02, tt > 0 && w < 1 ? 1 - w * w : 0, t * 7.5, idle, tt > 3.4 ? -40 : null);
      posePerson(this.k, 1020, 640, 1.02, 0, 0, idle, tt > 5 ? 10 : null, true);
      this.dr.forEach((d, i) => { op(d, prog(tt, 3.4 + i * 0.4, 3.7 + i * 0.4)); tf(d, [612, 752][i] + 30, 540 + Math.sin(idle * 3 + i) * 2); });
      pop(this.droolc, t, 18.6, 640, 330);
    },
  };

  // an invented map: Koffi's country (A), and two neighbours (B coastal, C)
  const CA = 'M150 150 L 560 130 L 600 330 L 620 560 L 200 570 L 170 360Z', CC = 'M560 130 L 1120 150 L 1100 340 L 600 330Z', CB = 'M600 330 L 1100 340 L 1120 560 L 620 560Z';
  const CC2 = 'M850 142 L 1120 150 L 1100 340 L 870 336Z';
  const cen = { A: [380, 350], B: [860, 450], C: [840, 235] };
  const flagC = (s = 1) => `<g transform="scale(${s})"><rect x="-3" y="-90" width="6" height="92" rx="2" fill="#7A6A55"/><rect x="3" y="-88" width="62" height="40" fill="${C.green}"/><path d="M3 -68 H65" stroke="#FFF6E6" stroke-width="7"/></g>`;
  const crateW = `<g><rect x="-30" y="-40" width="60" height="40" rx="5" fill="#FFF8EC" stroke="#D8C6A2" stroke-width="2"/><rect x="-30" y="-27" width="60" height="8" fill="${C.teal}"/>${meatCut(0, -8, .4)}</g>`;
  const shipW = `<g><path d="M-50 0 H50 L38 22 H-38Z" fill="#3E5A73"/><rect x="-26" y="-22" width="40" height="22" fill="#E9DFC9"/><rect x="18" y="-34" width="10" height="34" fill="#C4572E"/></g>`;
  const badge = (cls, key, icon) => g1(cls, `${card(300, 84)}<g transform="translate(-112 0) scale(.8)">${icon}</g><text x="30" y="9" text-anchor="middle" font-size="22" font-weight="800" fill="${C.ink}" data-t="${key}" data-wrap="16" data-lh="24"></text>`);
  const cowBadge = `<g transform="translate(0 4) scale(.6)"><path d="M-20 -24 L 24 -24 Q 30 0 18 22 L -14 22 Q -26 0 -20 -24Z" fill="#A86F45"/><circle cx="-6" cy="-8" r="3" fill="#1D140E"/><circle cx="10" cy="-8" r="3" fill="#1D140E"/></g>`;
  S.wmap = {
    build: () => `${board()}<rect x="1150" width="130" height="720" fill="#CFE6EA"/><path d="M1150 0 V720" stroke="#B9D9DE" stroke-width="4"/>
      <path class="la" d="${CA}" fill="#EBCB98" stroke="#FBF1DF" stroke-width="8" stroke-linejoin="round"/>
      <path class="lc" d="${CC}" fill="#D9C99A" stroke="#FBF1DF" stroke-width="8" stroke-linejoin="round"/>
      <path class="lb" d="${CB}" fill="#E3C49B" stroke="#FBF1DF" stroke-width="8" stroke-linejoin="round"/>
      <path class="hotA" d="${CA}" fill="${C.red}" opacity="0"/><path class="hotC" d="${CC2}" fill="${C.red}" opacity="0"/>
      <g transform="translate(200 260)">${flagA(0.6)}</g><g transform="translate(1040 250)">${flagC(0.6)}</g><g transform="translate(1040 530)">${flagB(0.6)}</g>
      <g class="ringW" opacity="0"><circle r="110" fill="${C.red}" fill-opacity=".12" stroke="${C.red}" stroke-width="5" stroke-dasharray="14 9"/></g>
      ${[0, 1, 2, 3].map((i) => virus('wv wv' + i)).join('')}
      ${[0, 1, 2].map((i) => g1('wc wc' + i, crateW)).join('')}
      <g class="wcow" opacity="0"><g transform="scale(.34)">${cow(2)}</g></g>
      ${[0, 1, 2, 3].map((i) => g1('we we' + i, ic.envelope)).join('')}${g1('wdoc', ic.doc)}${g1('wship', shipW)}
      ${[0, 1, 2].map((i) => g1('wx wx' + i, ic.redX)).join('')}${[0, 1, 2].map((i) => check('wk wk' + i)).join('')}
      ${badge('bVet', 'vetAuth', ic.info)}${badge('bCom', 'commission', ic.globe)}${badge('bWoah', 'woah', cowBadge)}
      ${chip('cForm', 280, 'form', { fill: '#FFF8EC', tx: 18, icon: `<g transform="translate(-112 0) scale(.6)">${ic.doc}</g>` })}${chip('cPer', 300, 'perimeter', { fill: C.red, color: '#FFF6E6' })}
      ${chip('cNet', 280, 'alertNet', { fill: C.teal, color: '#FFF6E6' })}${chip('cSafe', 330, 'safeguard', { fill: '#FFF8EC' })}${chip('cOver', 280, 'over', { fill: C.green, color: '#FFF6E6' })}
      ${chip('cRest', 380, 'restricted', { fill: C.red, color: '#FFF6E6' })}${chip('cVet', 330, 'certVet', { fill: '#FFF8EC' })}${chip('cSal', 330, 'salubrity', { fill: '#FFF8EC' })}${chip('cPart', 330, 'partial', { fill: C.red, color: '#FFF6E6' })}
      ${chip('cFree', 300, 'freeLbl', { fill: C.green, color: '#FFF6E6' })}${chip('cSell', 400, 'sellAny', { fill: '#FFF8EC' })}${[0, 1, 2].map((i) => chip('cs cs' + i, 230, 'simple.' + i, { fill: '#EAF0F7', color: C.indigo })).join('')}`,
    init(g) {
      const q = (s) => g.querySelector(s), qa = (s) => [...g.querySelectorAll(s)];
      ['la', 'lb', 'lc', 'hotA', 'hotC', 'ringW', 'wcow', 'wdoc', 'wship', 'bVet', 'bCom', 'bWoah', 'cForm', 'cPer', 'cNet', 'cSafe', 'cOver', 'cRest', 'cVet', 'cSal', 'cPart', 'cFree', 'cSell'].forEach((k) => (this[k] = q('.' + k)));
      this.wv = qa('.wv'); this.wc = qa('.wc'); this.we = qa('.we'); this.wx = qa('.wx'); this.wk = qa('.wk'); this.cs = qa('.cs');
      this.cowG = this.wcow.querySelector('.cow'); prepCow(this.cowG);
      this.over = [this.hotA, this.hotC, this.ringW, this.wcow, this.wdoc, this.wship, this.bVet, this.bCom, this.bWoah, this.cForm, this.cPer, this.cNet, this.cSafe, this.cOver, this.cRest, this.cVet, this.cSal, this.cPart, this.cFree, this.cSell, ...this.wv, ...this.wc, ...this.we, ...this.wx, ...this.wk, ...this.cs];
    },
    update(t, idle, variant) {
      this.over.forEach((el) => op(el, 0)); op(this.lb, 1); op(this.lc, 1);
      const farm = [400, 440];
      if (variant === 'spread') {
        pop(this.wv[0], t, 0.2, farm[0], farm[1], 0.6);
        [[cen.A[0] - 120, 230], cen.B, cen.C].forEach((to, i) => { const m = prog(t, 0.6 + i * 0.4, 2.6 + i * 0.4, ease.inOut); op(this.wv[i + 1], prog(t, 0.6, 0.8)); tf(this.wv[i + 1], lerp(farm[0], to[0], m), lerp(farm[1], to[1], m), 0.8); });
        op(this.hotA, prog(t, 1, 3) * 0.35);
        pop(this.wx[0], t, 4.8, 600, 330, 0.01); pop(this.wx[1], t, 5.1, 610, 450, 0.01); pop(this.wx[2], t, 5.4, 580, 200, 0.01);
        pop(this.cRest, t, 5.8, 380, 90);
      } else if (variant === 'notify') {
        pop(this.wv[0], t, 0.2, farm[0], farm[1], 0.6);
        pop(this.bVet, t, 0.6, 330, 80); fly(this.we[0], t, 1.0, 2.6, farm, [330, 90], 70);
        pop(this.bCom, t, 7.6, 900, 80); fly(this.wdoc, t, 8.2, 10, farm, [900, 90], 90); pop(this.cForm, t, 9.6, 900, 160);
        op(this.ringW, prog(t, 15.8, 16.4)); tf(this.ringW, farm[0], farm[1], lerp(1.3, 1, prog(t, 15.8, 16.6, ease.out))); pop(this.cPer, t, 16.4, farm[0], farm[1] - 150);
      } else if (variant === 'crisis') {
        pop(this.wv[0], t, 0.1, farm[0], farm[1], 0.6); op(this.ringW, 1 - prog(t, 13.6, 14.4)); tf(this.ringW, farm[0], farm[1]);
        pop(this.bCom, t, 0.4, 640, 80); pop(this.cNet, t, 0.6, 640, 160); op(this.cNet, prog(t, 0.6, 0.8) * (1 - prog(t, 7.4, 7.7)));
        [[640, 90], cen.B, cen.C].forEach((to, i) => fly(this.we[i], t, 1.0 + i * 0.4, 2.6 + i * 0.4, farm, to, 70));
        pop(this.cSafe, t, 7.8, 640, 160); op(this.cSafe, prog(t, 7.8, 8) * (1 - prog(t, 13.4, 13.7)));
        [[600, 330], [610, 450]].forEach(([x, y], i) => { pop(this.wx[i], t, 8.2 + i * 0.3, x, y, 0.01); op(this.wx[i], prog(t, 8.2 + i * 0.3, 8.4 + i * 0.3) * (1 - prog(t, 13.8, 14.1))); });
        pop(this.bWoah, t, 9.6, 1000, 80); fly(this.we[3], t, 10, 11.6, farm, [1000, 90], 80);
        op(this.wv[0], 1 - prog(t, 13.6, 14.2));
        pop(this.cOver, t, 13.8, 640, 160); [[600, 330], [610, 450]].forEach(([x, y], i) => pop(this.wk[i], t, 14.2 + i * 0.3, x, y, 0.01));
      } else if (variant === 'imports') {
        const m = prog(t, 0.6, 6.4, ease.inOut); op(this.wcow, prog(t, 0.4, 0.7)); tf(this.wcow, lerp(380, 860, m), lerp(430, 470, m)); poseCow(this.cowG, 0, 0, 1, m > 0 && m < 1 ? 1 : 0, t * 7, idle);
        op(this.wdoc, prog(t, 0.4, 0.7)); tf(this.wdoc, lerp(380, 860, m) + 50, lerp(430, 470, m) - 60, 0.8); pop(this.cVet, t, 1.0, 640, 90); op(this.cVet, prog(t, 1, 1.2) * (1 - prog(t, 7.4, 7.7)));
        pop(this.wk[0], t, 6.6, 900, 380, 0.01);
        const s = prog(t, 7.8, 10.6, ease.inOut); op(this.wship, prog(t, 7.6, 8)); tf(this.wship, 1215, lerp(660, 470, s) - Math.sin(idle * 1.5) * 3);
        op(this.wc[0], prog(t, 10.6, 10.9)); const u = prog(t, 10.8, 12.6, ease.inOut); tf(this.wc[0], lerp(1200, 1000, u), lerp(450, 470, u) - Math.sin(u * Math.PI) * 50);
        pop(this.cSal, t, 9.0, 640, 90); op(this.cSal, prog(t, 9, 9.2) * (1 - prog(t, 15.2, 15.5))); pop(this.wk[1], t, 12.8, 1000, 410, 0.01);
        op(this.hotC, prog(t, 15.6, 16.4) * 0.35); pop(this.wv[0], t, 15.8, 990, 230, 0.6);
        pop(this.wx[0], t, 17.2, 860, 336, 0.01); pop(this.cPart, t, 16.6, 640, 90);
        op(this.wc[1], prog(t, 18, 18.3)); const v = prog(t, 18.4, 22.4, ease.inOut); tf(this.wc[1], lerp(680, 380, v), lerp(240, 320, v) - Math.sin(v * Math.PI) * 30); pop(this.wk[2], t, 22.6, 380, 260, 0.01);
      } else if (variant === 'free') {
        [[cen.A, cen.B], [cen.B, cen.C], [cen.C, cen.A]].forEach(([a, b], i) => { const m = ((t * 0.22 + i / 3) % 1); op(this.wc[i], prog(t, 0.4 + i * 0.3, 0.7 + i * 0.3)); tf(this.wc[i], lerp(a[0], b[0], m), lerp(a[1], b[1], m) - Math.sin(m * Math.PI) * 40); });
        pop(this.cFree, t, 0.8, 640, 90); op(this.cFree, prog(t, 0.8, 1) * (1 - prog(t, 7.4, 7.7)));
        pop(this.cSell, t, 7.8, 640, 90); op(this.cSell, prog(t, 7.8, 8) * (1 - prog(t, 14.8, 15.1)));
        this.cs.forEach((c, i) => pop(c, t, 15.2 + i * 1.2, 360 + i * 280, 90));
      }
    },
  };

  S.rules = {
    build: () => `<rect width="1280" height="720" fill="#F7E7C9"/><rect width="1280" height="720" fill="url(#p-dots)"/>
      <text class="rt" x="640" y="118" text-anchor="middle" font-family="Inter Display, Inter, sans-serif" font-size="60" font-weight="800" fill="${C.ink}" letter-spacing="-1" data-t="rulesTitle" opacity="0"></text>
      ${[stampIcon, notebookIcon, `<g transform="scale(1.4)">${ic.envelope}</g>`, redBell].map((icon, i) => `<g class="rc rc${i}" opacity="0">
        <rect x="-130" y="-170" width="260" height="320" rx="28" fill="#FFF8EC" filter="url(#f-shadow)"/>
        <circle cx="0" cy="-70" r="66" fill="${['#EFEDFF', '#E3F1EE', '#EAF0F7', '#F9E3DF'][i]}"/>
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
  S.recap = recapScene([stampIcon, notebookIcon, phoneIcon]);
  S.end = endScene();

  window.SPS_SCENES = { scenes: S, defs, clamp };
})();

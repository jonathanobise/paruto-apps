// WAEMU module: Koffi, a city butcher, buys only inspected meat and keeps a notebook that lets
// the veterinary services trace a batch. Scenes built from the shared kit (shared/art.js).
(function () {
  const { C, clamp, ease, prog, lerp, tf, op, defs, landscape, acacia, cow, prepCow, poseCow, person, prepPerson, posePerson,
    chip, check, cross, titleScene, quizScene, recapScene, endScene } = window.SPS_ART;
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

  S.quizbg = quizScene();
  S.recap = recapScene([stampIcon, notebookIcon, phoneIcon]);
  S.end = endScene();

  window.SPS_SCENES = { scenes: S, defs, clamp };
})();

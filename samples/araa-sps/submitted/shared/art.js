// Shared illustration kit for the SPS awareness modules: palette, easing, landscape, cattle,
// people, cards and the scenes every module shares (title, quiz backdrop, recap, end card).
// A module's scenes.js builds its own scenes from these. Each scene builds its SVG once, then
// update(t, idle) poses everything for scene time t (idle = a free-running clock for breathing
// and tails), so the player and the MP4 renderer draw identical frames.
(function () {
  const C = {
    ink: '#2B1E16', cream: '#FFF6E6', sand: '#E2A564', sand2: '#D6934F', hill: '#E9C189',
    indigo: '#2E3A87', indigo2: '#232C6B', teal: '#1F7A6E', terracotta: '#C4572E',
    red: '#D64534', green: '#2E9E5B', leaf: '#6E8B3D', leaf2: '#86A24C', bark: '#6B4226',
    skin: '#6B3E26', skin2: '#8A5536', khaki: '#8C8455', khaki2: '#6F6942', white: '#F7F5EE',
  };
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ease = {
    out: (t) => 1 - Math.pow(1 - t, 3),
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    back: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    lin: (t) => t,
  };
  const prog = (t, t0, t1, e = ease.out) => e(clamp((t - t0) / (t1 - t0)));
  const lerp = (a, b, p) => a + (b - a) * p;
  const tf = (el, x, y, s = 1, r = 0, sx) => el && el.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${r.toFixed(2)}) scale(${(sx ?? s).toFixed(3)} ${s.toFixed(3)})`);
  const op = (el, o) => el && el.setAttribute('opacity', clamp(o).toFixed(3));

  // ---------- shared art ----------
  const defs = `
  <defs>
    <linearGradient id="g-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F2C584"/><stop offset=".55" stop-color="#FAE3BE"/><stop offset="1" stop-color="#FCEFD8"/></linearGradient>
    <linearGradient id="g-dawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E7834A"/><stop offset=".6" stop-color="#F4B46E"/><stop offset="1" stop-color="#F9D59C"/></linearGradient>
    <linearGradient id="g-paper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFBF2"/><stop offset="1" stop-color="#F6EBD3"/></linearGradient>
    <radialGradient id="g-sun"><stop offset="0" stop-color="#FFE3A3"/><stop offset=".55" stop-color="#F7B955"/><stop offset="1" stop-color="#F7B955" stop-opacity="0"/></radialGradient>
    <pattern id="p-stripes" width="44" height="16" patternUnits="userSpaceOnUse"><rect width="22" height="16" fill="${C.red}"/><rect x="22" width="22" height="16" fill="#FFF6E6"/></pattern>
    <pattern id="p-dots" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.6" fill="#E7D2AE"/></pattern>
    <filter id="f-shadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#5A3A1A" flood-opacity=".22"/></filter>
  </defs>`;

  const acacia = (x, y, s = 1, fill = C.leaf, fill2 = C.leaf2, bark = C.bark) => `
    <g transform="translate(${x} ${y}) scale(${s})">
      <path d="M0 0 C 2 -30 -2 -50 -6 -66 M-5 -60 C -18 -80 -34 -90 -52 -100 M-5 -62 C 8 -84 26 -96 44 -104" stroke="${bark}" stroke-width="8" fill="none" stroke-linecap="round"/>
      <ellipse cx="-4" cy="-110" rx="96" ry="20" fill="${fill}"/>
      <ellipse cx="-20" cy="-122" rx="58" ry="14" fill="${fill2}"/>
    </g>`;

  const grass = (x, y, s = 1, fill = '#B9873F') => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 0 L-6 -18 L-1 -4 L2 -24 L5 -3 L12 -16 L8 0Z" fill="${fill}"/>`;

  const landscape = (opts = {}) => `
    <rect width="1280" height="720" fill="url(#${opts.sky || 'g-sky'})"/>
    <g class="sun"><circle r="150" fill="url(#g-sun)" opacity=".55"/><circle r="62" fill="#F8C062"/></g>
    <path d="M0 462 Q 170 410 360 446 T 760 432 T 1120 420 T 1280 430 V720 H0Z" fill="${opts.hill || C.hill}"/>
    <path d="M0 486 Q 320 462 640 482 T 1280 474 V720 H0Z" fill="${opts.ground || C.sand}"/>
    <path d="M0 640 Q 400 612 800 628 T 1280 618 V720 H0Z" fill="${opts.ground2 || C.sand2}"/>
    ${grass(90, 650, 1.2)}${grass(380, 668)}${grass(720, 640, 1.1)}${grass(1010, 676, 1.3)}${grass(1210, 650)}
    ${grass(260, 520, .7, '#C99A4E')}${grass(940, 512, .7, '#C99A4E')}`;

  // Zebu facing right; origin between the feet.
  const COWS = [
    { body: '#F3ECE0', shade: '#D9CDB9', head: '#EFE6D6' },
    { body: '#C79A6B', shade: '#A97C51', head: '#BD8F60' },
    { body: '#6E4B35', shade: '#563826', head: '#664330' },
    { body: '#E9DCC6', shade: '#CDBB9E', head: '#E1D2B8' },
    { body: '#A86F45', shade: '#8A5835', head: '#9E663F' },
  ];
  const cow = (i, cls = '') => {
    const p = COWS[i % COWS.length];
    const leg = (x, fill) => `<g class="leg" data-x="${x}" transform="translate(${x} -34)"><rect x="-5" y="0" width="10" height="36" rx="4" fill="${fill}"/><rect x="-5" y="30" width="10" height="6" rx="2" fill="#3B2A1E"/></g>`;
    return `<g class="cow ${cls}">
      <ellipse class="shadow" cx="0" cy="2" rx="62" ry="8" fill="#5A3A1A" opacity=".16"/>
      <g class="cow-body">
        ${leg(-36, p.shade)}${leg(30, p.shade)}
        <path class="tail" d="M-52 -58 Q -66 -40 -62 -16" stroke="${p.shade}" stroke-width="5" fill="none" stroke-linecap="round"/>
        <ellipse cx="-2" cy="-56" rx="56" ry="26" fill="${p.body}"/>
        <ellipse cx="26" cy="-80" rx="17" ry="13" fill="${p.body}"/>
        <path d="M30 -46 Q 40 -20 52 -44Z" fill="${p.shade}"/>
        ${leg(-24, p.body)}${leg(40, p.body)}
        <g class="cow-head" transform="translate(50 -70)">
          <path d="M6 -6 Q 0 -30 16 -36" stroke="#F1E7D3" stroke-width="6" fill="none" stroke-linecap="round"/>
          <path d="M0 -4 L28 -6 Q 38 4 34 18 L 18 26 Q 6 22 2 10Z" fill="${p.head}"/>
          <path d="M2 -2 L-12 -10 L-8 2Z" fill="${p.shade}"/>
          <circle cx="20" cy="2" r="2.4" fill="#1D140E"/>
          <ellipse cx="32" cy="18" rx="5" ry="4" fill="${p.shade}"/>
        </g>
      </g>
    </g>`;
  };
  const prepCow = (g) => { g._legs = [...g.querySelectorAll('.leg')]; g._body = g.querySelector('.cow-body'); g._tail = g.querySelector('.tail'); g._head = g.querySelector('.cow-head'); };
  const poseCow = (g, x, y, s, walk, phase, idle = 0) => {
    tf(g, x, y, s);
    const bob = walk ? -Math.abs(Math.sin(phase)) * 4 * walk : Math.sin(idle * 1.6 + x) * 0.8;
    g._body.setAttribute('transform', `translate(0 ${bob.toFixed(2)})`);
    g._legs.forEach((l, i) => {
      const a = walk ? Math.sin(phase + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 20 * walk : 0;
      l.setAttribute('transform', `translate(${l.dataset.x} -34) rotate(${a.toFixed(2)})`);
    });
    g._tail.setAttribute('transform', `rotate(${(Math.sin(idle * 2.2 + x * 0.1) * 8).toFixed(2)} -52 -58)`);
    g._head.setAttribute('transform', `translate(50 -70) rotate(${(walk ? Math.sin(phase * 2) * 3 : Math.sin(idle * 0.9 + x) * 4).toFixed(2)})`);
  };

  // People facing right; origin between the feet. kind: moussa | vet | officer
  const person = (kind) => {
    const look = {
      moussa: { robe: C.indigo, robe2: C.indigo2, pants: '#E9DFC9', skin: C.skin, hat: `<path d="M-19 -150 Q -20 -178 2 -180 Q 22 -178 19 -150 Q 0 -158 -19 -150Z" fill="#F1E6CF"/><path d="M-18 -152 Q 0 -160 19 -152 L 18 -146 Q 0 -152 -18 -146Z" fill="#DCCDAE"/>` },
      vet: { robe: C.white, robe2: '#DDDACB', pants: C.teal, skin: C.skin2, hat: `<path d="M-17 -152 Q -16 -176 2 -176 Q 20 -176 18 -152Z" fill="${C.teal}"/>` },
      officer: { robe: C.khaki, robe2: C.khaki2, pants: C.khaki2, skin: '#5C3420', hat: `<path d="M-18 -154 L -16 -174 L 18 -174 L 19 -154Z" fill="${C.khaki2}"/><path d="M8 -156 L 32 -152 L 18 -150Z" fill="#2F2B1C"/><circle cx="2" cy="-166" r="3.5" fill="#E2B33C"/>` },
    }[kind];
    const item = kind === 'moussa'
      ? `<path d="M0 0 L 10 -110" stroke="#8A5A2B" stroke-width="5" stroke-linecap="round" transform="translate(0 56)"/>`
      : kind === 'vet'
        ? `<g transform="translate(-14 34)"><rect width="30" height="38" rx="3" fill="#B98B57"/><rect x="4" y="6" width="22" height="28" fill="#FFF8EA"/><path d="M8 14 H22 M8 20 H22 M8 26 H18" stroke="#B9A88B" stroke-width="2"/></g>`
        : '';
    return `<g class="person ${kind}">
      <ellipse cx="0" cy="2" rx="34" ry="7" fill="#5A3A1A" opacity=".16"/>
      <g class="p-body">
        <g class="p-leg" data-x="-8" transform="translate(-8 -44)"><rect x="-6" y="0" width="12" height="44" rx="5" fill="${look.pants}"/><rect x="-7" y="38" width="20" height="8" rx="4" fill="#3B2A1E"/></g>
        <g class="p-leg" data-x="8" transform="translate(8 -44)"><rect x="-6" y="0" width="12" height="44" rx="5" fill="${look.pants}"/><rect x="-7" y="38" width="20" height="8" rx="4" fill="#3B2A1E"/></g>
        <g class="p-arm back" transform="translate(-10 -118)"><rect x="-6" y="0" width="12" height="56" rx="6" fill="${look.robe2}"/><circle cy="58" r="6.5" fill="${look.skin}"/></g>
        <path d="M-30 -36 L -22 -124 Q 0 -134 22 -124 L 32 -36 Q 0 -30 -30 -36Z" fill="${look.robe}"/>
        ${kind === 'vet' ? `<path d="M0 -126 L 0 -40" stroke="#D9D5C4" stroke-width="2"/><path d="M-8 -126 Q 0 -100 10 -112" stroke="#444" stroke-width="2.5" fill="none"/><circle cx="10" cy="-110" r="4" fill="#666"/>` : ''}
        ${kind === 'officer' ? `<path d="M-24 -84 L 26 -84" stroke="#5E5838" stroke-width="5"/><rect x="6" y="-116" width="12" height="9" rx="2" fill="#E2B33C"/>` : ''}
        ${kind === 'moussa' ? `<path d="M-26 -60 Q 0 -54 30 -60" stroke="#F1E6CF" stroke-width="3" fill="none" opacity=".6"/>` : ''}
        <rect x="-6" y="-138" width="12" height="12" fill="${look.skin}"/>
        <g class="p-head">
          <circle cx="0" cy="-150" r="18" fill="${look.skin}"/>
          <circle cx="8" cy="-152" r="2.2" fill="#140D08"/>
          <path d="M6 -142 Q 11 -139 15 -143" stroke="#140D08" stroke-width="2" fill="none" stroke-linecap="round"/>
          ${look.hat}
        </g>
        <g class="p-arm front" transform="translate(12 -118)"><rect x="-6" y="0" width="12" height="56" rx="6" fill="${look.robe2}"/><circle cy="58" r="6.5" fill="${look.skin}"/>${item}</g>
      </g>
    </g>`;
  };
  const prepPerson = (g) => { g._legs = [...g.querySelectorAll('.p-leg')]; g._body = g.querySelector('.p-body'); g._arm = g.querySelector('.p-arm.front'); g._armB = g.querySelector('.p-arm.back'); g._head = g.querySelector('.p-head'); };
  const posePerson = (g, x, y, s, walk, phase, idle = 0, armAngle = null, flip = false) => {
    tf(g, x, y, s, 0, flip ? -s : s);
    const bob = walk ? -Math.abs(Math.sin(phase)) * 5 * walk : Math.sin(idle * 1.4) * 0.8;
    g._body.setAttribute('transform', `translate(0 ${bob.toFixed(2)})`);
    g._legs.forEach((l, i) => l.setAttribute('transform', `translate(${l.dataset.x} -44) rotate(${(walk ? Math.sin(phase + i * Math.PI) * 22 * walk : 0).toFixed(2)})`));
    const swing = walk ? Math.sin(phase) * 18 * walk : Math.sin(idle * 1.2) * 2;
    g._arm.setAttribute('transform', `translate(12 -118) rotate(${(armAngle ?? -swing).toFixed(2)})`);
    g._armB.setAttribute('transform', `translate(-10 -118) rotate(${swing.toFixed(2)})`);
    g._head.setAttribute('transform', `rotate(${(Math.sin(idle * 0.7) * 2).toFixed(2)} 0 -140)`);
  };

  const chip = (cls, w, key, opts = {}) => `<g class="${cls}" opacity="0">
      <rect x="${-w / 2}" y="-26" width="${w}" height="52" rx="26" fill="${opts.fill || C.cream}" filter="url(#f-shadow)"/>
      ${opts.icon || ''}
      <text x="${opts.tx || 0}" y="9" text-anchor="middle" font-size="${opts.size || 24}" font-weight="650" fill="${opts.color || C.ink}" data-t="${key}"></text>
      ${opts.tail ? `<path d="M-10 25 L0 40 L10 25Z" fill="${opts.fill || C.cream}"/>` : ''}
    </g>`;

  const check = (cls) => `<g class="${cls}" opacity="0"><circle r="24" fill="${C.green}" filter="url(#f-shadow)"/><path d="M-11 0 L-3 8 L12 -9" stroke="#fff" stroke-width="5.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  const cross = (cls) => `<g class="${cls}" opacity="0"><circle r="30" fill="${C.red}" filter="url(#f-shadow)"/><path d="M-11 -11 L11 11 M11 -11 L-11 11" stroke="#fff" stroke-width="6" stroke-linecap="round"/></g>`;
  const syringe = `<g transform="rotate(-35)"><rect x="-26" y="-7" width="40" height="14" rx="3" fill="#E9F3F1" stroke="${C.teal}" stroke-width="3"/><rect x="-18" y="-4" width="20" height="8" fill="#7CC4B5"/><path d="M14 0 H30" stroke="${C.teal}" stroke-width="3"/><path d="M-26 -10 V10 M-34 0 H-26" stroke="${C.teal}" stroke-width="4"/></g>`;

  // Certificate: origin at its centre (260 x 330).
  const certificate = (cls, stampKey = null) => `<g class="${cls}" opacity="0">
      <g filter="url(#f-shadow)"><rect x="-130" y="-165" width="260" height="330" rx="10" fill="url(#g-paper)" stroke="#E2D2B2" stroke-width="2"/></g>
      <rect x="-130" y="-165" width="260" height="54" rx="10" fill="${C.teal}"/><rect x="-130" y="-125" width="260" height="14" fill="${C.teal}"/>
      <circle cx="-98" cy="-138" r="14" fill="#FFF6E6" opacity=".9"/><path d="M-104 -138 l4 4 l9 -9" stroke="${C.teal}" stroke-width="3" fill="none"/>
      <text class="cert-title" x="12" y="-143" text-anchor="middle" font-size="12.5" font-weight="750" fill="#FFF6E6" letter-spacing=".4" data-t="cert" data-wrap="26" data-lh="15"></text>
      <g class="cert-lines" stroke="#CDBB9A" stroke-width="5" stroke-linecap="round">
        <path pathLength="1" d="M-100 -80 H 70"/><path pathLength="1" d="M-100 -56 H 100"/><path pathLength="1" d="M-100 -32 H 40"/>
        <path pathLength="1" d="M-100 0 H 100"/><path pathLength="1" d="M-100 24 H 80"/><path pathLength="1" d="M-100 48 H 100"/>
      </g>
      <g class="cert-cows" fill="#B79E74" opacity=".9"><circle cx="-90" cy="84" r="5"/><circle cx="-74" cy="84" r="5"/><circle cx="-58" cy="84" r="5"/><text x="-44" y="90" font-size="16" font-weight="700" fill="#8A7550">× 40</text></g>
      <path class="cert-sign" pathLength="1" d="M-96 132 C -80 104 -70 140 -56 120 S -30 108 -20 128 S 0 112 12 124" stroke="#2B3A8A" stroke-width="3" fill="none" stroke-linecap="round"/>
      <g class="cert-stamp" opacity="0"><circle r="40" fill="none" stroke="${C.red}" stroke-width="5" opacity=".85"/><circle r="31" fill="none" stroke="${C.red}" stroke-width="2" opacity=".85"/><path d="M-14 0 L-4 10 L16 -12" stroke="${C.red}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/></g>
      ${stampKey ? `<g class="cert-valid" opacity="0"><rect x="-80" y="-24" width="160" height="48" rx="8" fill="none" stroke="${C.green}" stroke-width="5"/><text y="12" text-anchor="middle" font-size="30" font-weight="800" fill="${C.green}" letter-spacing="3" data-t="${stampKey}"></text></g>` : ''}
    </g>`;

  const receipt = (cls) => `<g class="${cls}" opacity="0">
      <g filter="url(#f-shadow)"><path d="M-90 -120 H90 V110 l-15 10 l-15 -10 l-15 10 l-15 -10 l-15 10 l-15 -10 l-15 10 l-15 -10 l-15 10 l-15 -10 l-15 10 l-15 -10Z" fill="#FFFDF6" stroke="#E2D2B2" stroke-width="2"/></g>
      <text y="-82" text-anchor="middle" font-size="17" font-weight="800" fill="${C.ink}" letter-spacing="1" data-t="receipt"></text>
      <g stroke="#D8C9AA" stroke-width="5" stroke-linecap="round"><path d="M-64 -50 H40"/><path d="M-64 -24 H64"/><path d="M-64 2 H24"/><path d="M-64 28 H64"/></g>
      <text x="62" y="80" text-anchor="end" font-size="24" font-weight="800" fill="#7A6748">40 × </text>
    </g>`;

  const borderPost = () => `
    <g class="post">
      <rect x="980" y="380" width="200" height="190" fill="#E8D7B5"/>
      <rect x="970" y="362" width="220" height="26" rx="4" fill="${C.terracotta}"/>
      <rect x="1004" y="420" width="70" height="56" rx="4" fill="#9FC7C9" stroke="#C9B48E" stroke-width="5"/>
      <rect x="1100" y="470" width="50" height="100" fill="#A9733F"/>
      <rect x="1196" y="250" width="6" height="320" fill="#7A6A55"/>
      <g class="flag"><rect x="1202" y="254" width="70" height="22" fill="${C.teal}"/><rect x="1202" y="276" width="70" height="22" fill="#F2C14E"/></g>
      <rect x="1030" y="340" width="6" height="24" fill="#7A6A55"/><rect x="1124" y="340" width="6" height="24" fill="#7A6A55"/>
      <rect x="988" y="290" width="184" height="54" rx="8" fill="${C.teal}" filter="url(#f-shadow)"/>
      <text x="1080" y="326" text-anchor="middle" font-size="25" font-weight="800" fill="#FFF6E6" letter-spacing="2" data-t="border"></text>
    </g>
    <g class="barrier-post"><rect x="900" y="470" width="26" height="110" rx="4" fill="#5E5545"/><circle cx="913" cy="486" r="10" fill="#3E3729"/></g>`;
  const barrierArm = () => `<g class="barrier-arm"><rect x="-300" y="-8" width="300" height="16" rx="8" fill="url(#p-stripes)" stroke="#9E3A2C" stroke-width="2"/><rect x="0" y="-12" width="34" height="24" rx="5" fill="#3E3729"/></g>`;

  const virus = (cls) => `<g class="${cls}" opacity="0">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M0 0 L0 -26" stroke="${C.red}" stroke-width="4" stroke-linecap="round" transform="rotate(${a})"/><circle cy="-27" r="4.5" fill="${C.red}" transform="rotate(${a})"/>`).join('')}<circle r="17" fill="${C.red}"/><circle cx="-5" cy="-4" r="4" fill="#F59A8D"/><circle cx="6" cy="5" r="3" fill="#F59A8D"/></g>`;

  // ---------- explainer pieces: pop-ins, the cream board, invented flags, cards and icons ----------
  // (first drawn for the full-length international module; used by every module)
  const pop = (el, t, t0, x, y, s0 = 0.6) => { const p = prog(t, t0, t0 + 0.45, ease.back); op(el, prog(t, t0, t0 + 0.2)); tf(el, x, y, lerp(s0, 1, p)); };
  const popOut = (el, t, t0, t1, x, y, s0 = 0.6) => { pop(el, t, t0, x, y, s0); op(el, prog(t, t0, t0 + 0.2) * (1 - prog(t, t1, t1 + 0.4))); };
  // Explainer scenes sit on the cream board of the standards scene; the two countries are told
  // apart by invented flags (teal and gold for Aïcha's, indigo and sand for the buyers').
  const board = () => `<rect width="1280" height="720" fill="#FBF1DF"/><rect width="1280" height="720" fill="url(#p-dots)"/>`;
  const flagA = (s = 1) => `<g transform="scale(${s})"><rect x="-3" y="-90" width="6" height="92" rx="2" fill="#7A6A55"/><rect x="3" y="-88" width="62" height="20" fill="${C.teal}"/><rect x="3" y="-68" width="62" height="20" fill="#F2C14E"/><circle cx="34" cy="-68" r="7" fill="${C.terracotta}"/></g>`;
  const flagB = (s = 1) => `<g transform="scale(${s})"><rect x="-3" y="-90" width="6" height="92" rx="2" fill="#7A6A55"/><path d="M3 -88 H65 L3 -48Z" fill="${C.indigo}"/><path d="M65 -88 V-48 H3Z" fill="#E2B36C"/><circle cx="18" cy="-76" r="5" fill="#FFF6E6"/></g>`;
  const card = (w, h, fill = '#FFF8EC') => `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="22" fill="${fill}" filter="url(#f-shadow)"/>`;
  const label = (key, y, wrap = 16, size = 22, color = C.ink) => `<text x="0" y="${y}" text-anchor="middle" font-size="${size}" font-weight="750" fill="${color}" data-t="${key}" data-wrap="${wrap}" data-lh="${Math.round(size * 1.2)}"></text>`;
  const ic = {
    microscope: `<g><rect x="-36" y="28" width="72" height="11" rx="5" fill="#4B5D73"/><path d="M14 28 Q 40 4 22 -26" stroke="#4B5D73" stroke-width="10" fill="none" stroke-linecap="round"/><rect x="-26" y="6" width="44" height="8" rx="3" fill="#4B5D73"/><g transform="rotate(-28 -6 -18)"><rect x="-15" y="-52" width="20" height="50" rx="5" fill="#7F95AE"/><rect x="-18" y="-58" width="26" height="9" rx="3" fill="#4B5D73"/><rect x="-11" y="-4" width="12" height="12" rx="2" fill="#4B5D73"/></g></g>`,
    gauge: `<g><circle r="40" fill="#FFFFFF" stroke="#D9CDB9" stroke-width="3"/><path d="M-28 12 A 30 30 0 0 1 -14 -24" stroke="${C.green}" stroke-width="9" fill="none"/><path d="M-12 -25 A 30 30 0 0 1 12 -25" stroke="#F2C14E" stroke-width="9" fill="none"/><path d="M14 -24 A 30 30 0 0 1 28 12" stroke="${C.red}" stroke-width="9" fill="none"/><path d="M0 8 L-10 -16" stroke="${C.ink}" stroke-width="5" stroke-linecap="round"/><circle cy="8" r="6" fill="${C.ink}"/></g>`,
    fair: `<g><path d="M0 -40 V34 M-28 34 H28" stroke="#7A6A55" stroke-width="6" stroke-linecap="round"/><path d="M-46 -24 H46" stroke="#7A6A55" stroke-width="6" stroke-linecap="round"/><g transform="translate(-40 6)">${flagA(0.42)}</g><g transform="translate(24 6)">${flagB(0.42)}</g><path d="M-58 14 Q -40 28 -22 14Z M22 14 Q 40 28 58 14Z" fill="#C9A36B"/></g>`,
    noBarrier: `<g><rect x="34" y="-30" width="14" height="62" rx="3" fill="#5E5545"/><g transform="translate(40 -18)"><rect x="-96" y="-8" width="96" height="16" rx="8" fill="url(#p-stripes)" stroke="#9E3A2C" stroke-width="2"/></g><g transform="translate(-16 -14)"><circle r="22" fill="${C.red}"/><path d="M-9 -9 L9 9 M9 -9 L-9 9" stroke="#fff" stroke-width="5" stroke-linecap="round"/></g></g>`,
    person: `<g><circle cy="-16" r="15" fill="#8A5536"/><path d="M-28 26 Q -28 0 0 0 Q 28 0 28 26Z" fill="${C.terracotta}"/></g>`,
    globe: `<g><circle r="24" fill="#E7F1FB" stroke="${C.indigo}" stroke-width="4"/><ellipse rx="10" ry="24" fill="none" stroke="${C.indigo}" stroke-width="3"/><path d="M-24 0 H24 M-20 -12 H20 M-20 12 H20" stroke="${C.indigo}" stroke-width="3"/></g>`,
    envelope: `<g><rect x="-24" y="-16" width="48" height="32" rx="4" fill="#FFFDF6" stroke="${C.ink}" stroke-width="3"/><path d="M-24 -14 L0 4 L24 -14" stroke="${C.ink}" stroke-width="3" fill="none" stroke-linejoin="round"/></g>`,
    doc: `<g><rect x="-22" y="-28" width="44" height="56" rx="4" fill="#FFFDF6" stroke="#D8C6A2" stroke-width="2"/><path d="M-13 -14 H13 M-13 -4 H13 M-13 6 H6" stroke="#CDBB9A" stroke-width="3.5" stroke-linecap="round"/><path d="M-13 16 l5 5 l9 -9" stroke="${C.teal}" stroke-width="3" fill="none"/></g>`,
    temple: `<g><polygon points="-38,-12 0,-38 38,-12" fill="${C.teal}"/><rect x="-40" y="-14" width="80" height="9" rx="2" fill="#17665C"/>${[-24, 0, 24].map((x) => `<rect x="${x - 6}" y="-3" width="12" height="30" fill="#FFF8EC" stroke="#17665C" stroke-width="2.5"/>`).join('')}<rect x="-42" y="27" width="84" height="9" rx="2" fill="#17665C"/></g>`,
    shield: (s = 1) => `<g transform="scale(${s})"><path d="M0 -112 L 92 -78 V -6 Q 92 80 0 120 Q -92 80 -92 -6 V -78Z" fill="${C.teal}"/><path d="M0 -92 L 74 -64 V -6 Q 74 66 0 100 Q -74 66 -74 -6 V -64Z" fill="#2A8E80"/><path d="M-32 2 L-8 26 L36 -22" stroke="#FFF6E6" stroke-width="14" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`,
    eq: `<g><circle r="40" fill="${C.green}" filter="url(#f-shadow)"/><path d="M-18 -9 H18 M-18 9 H18" stroke="#fff" stroke-width="7" stroke-linecap="round"/></g>`,
    neq: `<g><circle r="40" fill="#FFF8EC" filter="url(#f-shadow)"/><path d="M-18 -9 H18 M-18 9 H18" stroke="${C.terracotta}" stroke-width="7" stroke-linecap="round"/><path d="M10 -24 L-10 24" stroke="${C.terracotta}" stroke-width="7" stroke-linecap="round"/></g>`,
    ask: `<g><path d="M-34 -30 H34 Q 44 -30 44 -20 V12 Q 44 22 34 22 H-4 L-18 38 L-16 22 H-34 Q -44 22 -44 12 V-20 Q -44 -30 -34 -30Z" fill="#FFF8EC" filter="url(#f-shadow)"/><text y="6" text-anchor="middle" font-size="40" font-weight="800" fill="${C.terracotta}">?</text></g>`,
    calendar: `<g><rect x="-30" y="-28" width="60" height="58" rx="8" fill="#FFFDF6" stroke="${C.ink}" stroke-width="3"/><rect x="-30" y="-28" width="60" height="16" rx="6" fill="${C.terracotta}"/><path d="M-16 -36 V-22 M16 -36 V-22" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/><text y="22" text-anchor="middle" font-size="28" font-weight="800" fill="${C.ink}">6</text></g>`,
    stopwatch: `<g><circle r="42" fill="#FFF8EC" stroke="${C.ink}" stroke-width="5" filter="url(#f-shadow)"/><rect x="-8" y="-60" width="16" height="13" rx="3" fill="${C.ink}"/><path d="M30 -34 l9 -9" stroke="${C.ink}" stroke-width="5" stroke-linecap="round"/><path d="M0 -30 A 30 30 0 0 1 26 -15" stroke="${C.green}" stroke-width="7" fill="none"/><g class="hand"><path d="M0 0 V-28" stroke="${C.terracotta}" stroke-width="5" stroke-linecap="round"/></g><circle r="5" fill="${C.ink}"/></g>`,
    info: `<g><circle r="30" fill="${C.teal}" filter="url(#f-shadow)"/><circle cy="-14" r="5" fill="#FFF6E6"/><rect x="-5" y="-4" width="10" height="24" rx="3" fill="#FFF6E6"/></g>`,
    tin: `<g><rect x="-50" y="-70" width="100" height="134" rx="10" fill="#F4F6F4" stroke="#C9D2D0" stroke-width="3"/><rect x="-55" y="-84" width="110" height="22" rx="7" fill="#BFD7E6"/><rect x="-50" y="-36" width="100" height="62" fill="#FFFFFF" stroke="#E2E7E5" stroke-width="2"/><g transform="translate(-14 -6)"><circle r="8" fill="#B07850"/><path d="M-14 22 Q -14 6 0 6 Q 14 6 14 22Z" fill="#D9A33A"/></g><g transform="translate(16 2)"><circle cy="-4" r="5" fill="#C98E62"/><path d="M-8 12 Q -8 2 0 2 Q 8 2 8 12Z" fill="#FFF6E6" stroke="#E7D2AE" stroke-width="1.5"/></g></g>`,
    heart: `<path d="M0 14 C -26 -4 -16 -30 0 -16 C 16 -30 26 -4 0 14Z" fill="${C.red}"/>`,
    megaphone: `<g><path d="M-30 -12 L 14 -30 V 30 L -30 12Z" fill="${C.terracotta}"/><rect x="-44" y="-12" width="16" height="24" rx="4" fill="${C.ink}"/><path d="M24 -18 q 12 18 0 36 M34 -28 q 20 28 0 56" stroke="${C.ink}" stroke-width="4" fill="none" stroke-linecap="round"/></g>`,
    gift: `<g><rect x="-42" y="-30" width="84" height="62" rx="6" fill="${C.terracotta}"/><rect x="-7" y="-30" width="14" height="62" fill="#F2C14E"/><rect x="-46" y="-44" width="92" height="17" rx="4" fill="#D9663F"/><path d="M0 -44 q -24 -22 -28 -4 M0 -44 q 24 -22 28 -4" stroke="#F2C14E" stroke-width="6" fill="none"/></g>`,
    redX: `<g><circle r="30" fill="${C.red}" filter="url(#f-shadow)"/><path d="M-11 -11 L11 11 M11 -11 L-11 11" stroke="#fff" stroke-width="6" stroke-linecap="round"/></g>`,
  };
  const g1 = (cls, inner, o = 0) => `<g class="${cls}" opacity="${o}">${inner}</g>`;
  const fly = (el, t, t0, t1, [x0, y0], [x1, y1], arc = 60, s = 1) => {
    const m = prog(t, t0, t1, ease.inOut);
    tf(el, lerp(x0, x1, m), lerp(y0, y1, m) - Math.sin(m * Math.PI) * arc, s);
    op(el, prog(t, t0, t0 + 0.15) * (1 - prog(t, t1, t1 + 0.25)));
  };

  // ---------- shared scenes ----------
  const titleScene = () => ({
    build: () => `${landscape({ sky: 'g-dawn', hill: '#D99A5C', ground: '#C98448', ground2: '#B87239' })}
      ${acacia(170, 492, 1.1, '#5B5B2E', '#6C6B35', '#4E3220')}${acacia(1120, 486, .9, '#5B5B2E', '#6C6B35', '#4E3220')}
      <g class="herd">${[0, 1, 2, 3, 4].map((i) => cow(2, 'c' + i)).join('')}</g>
      <g class="titles" opacity="0">
        <text x="640" y="236" text-anchor="middle" font-family="Inter Display, Inter, sans-serif" font-size="84" font-weight="800" fill="${C.ink}" letter-spacing="-1.5" data-t="title"></text>
        <text x="640" y="292" text-anchor="middle" font-size="27" font-weight="500" fill="#4A3424" data-t="subtitle"></text>
      </g>
      <text class="tkick" x="640" y="150" text-anchor="middle" font-size="18" font-weight="700" fill="#5B3A22" letter-spacing="5" opacity="0">PARUTO MEDIA</text>`,
    init(g) { this.sun = g.querySelector('.sun'); this.cows = [...g.querySelectorAll('.cow')]; this.cows.forEach(prepCow); this.titles = g.querySelector('.titles'); this.kicker = g.querySelector('.tkick'); },
    update(t, idle) {
      tf(this.sun, 640, lerp(560, 370, prog(t, 0, 6, ease.out)));
      this.cows.forEach((c, i) => { const x = -160 + ((t * 70 + i * 150) % 1650); poseCow(c, x, 560 + (i % 2) * 18, 0.58, 1, t * 6.2 + i, idle); });
      const p = prog(t, 0.8, 2.2);
      op(this.titles, p); this.titles.setAttribute('transform', `translate(0 ${((1 - p) * 24).toFixed(1)})`);
      op(this.kicker, prog(t, 1.6, 2.8));
    },
  });

  const quizScene = () => ({
    build: () => `<rect width="1280" height="720" fill="#F7E7C9"/><rect width="1280" height="720" fill="url(#p-dots)"/>
      <g opacity=".08" fill="${C.ink}" font-family="Inter Display, Inter, sans-serif" font-weight="900"><text class="q1" x="120" y="300" font-size="300">?</text><text class="q2" x="1000" y="640" font-size="380">?</text></g>`,
    init(g) { this.q1 = g.querySelector('.q1'); this.q2 = g.querySelector('.q2'); },
    update(t, idle) { this.q1.setAttribute('transform', `rotate(${(Math.sin(idle * 0.6) * 4).toFixed(2)} 200 200)`); this.q2.setAttribute('transform', `rotate(${(Math.sin(idle * 0.5 + 1) * 4).toFixed(2)} 1100 500)`); },
  });

  const ICONS = {
    syringe: `<g transform="scale(2.2)">${syringe}</g>`,
    certificate: `<g transform="scale(.42)"><rect x="-90" y="-115" width="180" height="230" rx="10" fill="#FFFBF2" stroke="${C.teal}" stroke-width="8"/><rect x="-90" y="-115" width="180" height="40" fill="${C.teal}"/><path d="M-60 -40 H60 M-60 -10 H60 M-60 20 H30" stroke="#CDBB9A" stroke-width="10" stroke-linecap="round"/><circle cx="44" cy="70" r="26" fill="none" stroke="${C.red}" stroke-width="7"/></g>`,
    barrier: `<g transform="scale(.55)"><rect x="70" y="-40" width="24" height="110" rx="4" fill="#5E5545"/><g transform="translate(82 -26) rotate(-28)"><rect x="-210" y="-10" width="210" height="20" rx="10" fill="url(#p-stripes)" stroke="#9E3A2C" stroke-width="2"/></g><circle cx="-40" cy="40" r="34" fill="${C.green}"/><path d="M-56 40 L-44 52 L-22 28" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`,
  };

  // recap: three numbered cards; icons = three ICONS keys or SVG strings
  const recapScene = (icons) => ({
    build: () => `<rect width="1280" height="720" fill="#F7E7C9"/><rect width="1280" height="720" fill="url(#p-dots)"/>
      <text class="rt" x="640" y="118" text-anchor="middle" font-family="Inter Display, Inter, sans-serif" font-size="60" font-weight="800" fill="${C.ink}" letter-spacing="-1" data-t="recapTitle" opacity="0"></text>
      ${[0, 1, 2].map((i) => `<g class="rc rc${i}" opacity="0">
        <rect x="-170" y="-170" width="340" height="320" rx="28" fill="#FFF8EC" filter="url(#f-shadow)"/>
        <circle cx="0" cy="-70" r="70" fill="${['#E3F1EE', '#EAF0F7', '#E7F4EA'][i]}"/>
        <g transform="translate(0 -70)">${ICONS[icons[i]] || icons[i]}</g>
        <circle cx="-130" cy="-130" r="24" fill="${C.terracotta}"/><text x="-130" y="-121" text-anchor="middle" font-size="26" font-weight="800" fill="#FFF6E6">${i + 1}</text>
        <text x="0" y="70" text-anchor="middle" font-size="28" font-weight="700" fill="${C.ink}" data-t="recap.${i}" data-wrap="18" data-lh="36"></text>
      </g>`).join('')}`,
    init(g) { this.rt = g.querySelector('.rt'); this.cards = [...g.querySelectorAll('.rc')]; },
    update(t) {
      op(this.rt, prog(t, 0.1, 0.6));
      this.cards.forEach((c, i) => { const p = prog(t, 0.6 + i * 0.9, 1.2 + i * 0.9, ease.back); op(c, prog(t, 0.6 + i * 0.9, 0.9 + i * 0.9)); tf(c, 250 + i * 390, 410 + (1 - p) * 60, lerp(0.85, 1, p)); });
    },
  });

  const endScene = () => ({
    build: () => `<rect width="1280" height="720" fill="#1E1712"/>
      <g class="eb" opacity="0"><text x="640" y="250" text-anchor="middle" font-size="22" font-weight="600" fill="#C9B79A" letter-spacing="3" data-t="endBy"></text></g>
      <image class="logo" href="../../shared/paruto-media-logo-white.svg" x="340" y="282" width="600" height="153" opacity="0"/>
      <text class="el" x="640" y="520" text-anchor="middle" font-size="21" font-weight="500" fill="#A8977C" data-t="endLine" opacity="0"></text>`,
    init(g) { this.eb = g.querySelector('.eb'); this.logo = g.querySelector('.logo'); this.el = g.querySelector('.el'); },
    update(t) { op(this.eb, prog(t, 0.2, 0.9)); op(this.logo, prog(t, 0.5, 1.4)); op(this.el, prog(t, 1.2, 2.0)); },
  });

  window.SPS_ART = { C, clamp, ease, prog, lerp, tf, op, defs, acacia, grass, landscape, cow, prepCow, poseCow, person, prepPerson, posePerson, chip, check, cross, syringe, certificate, receipt, borderPost, barrierArm, virus, ICONS, titleScene, quizScene, recapScene, endScene,
    pop, popOut, board, flagA, flagB, card, label, ic, g1, fly };
})();

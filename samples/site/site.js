// media.paruto.com: renders site/projects.js (MEDIA_SITE) in English or French: the index of every
// proposal at the top (the newest one large, its teaser playing; the others play on hover), then
// a section per proposal. Adds the motion: nav compaction, reveals, count-ups, the panel spotlight,
// and the hero light, which takes the accent of the project under the pointer.
(function () {
  const D = window.MEDIA_SITE, S = D.site;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  // the language is shared with the project kits on this domain
  let lang = new URLSearchParams(location.search).get('lang') || store.get('kit-lang') || ((navigator.language || '').startsWith('fr') ? 'fr' : 'en');
  if (lang !== 'fr') lang = 'en';
  const L = (o) => (o ? o[lang] ?? o.en : '');
  // last word in italic serif, like apps.paruto.com
  // *word* marks the emphasis explicitly; otherwise it falls on the last word
  const serifLast = (t) => { t = String(t); if (/\*[^*]+\*/.test(t)) return esc(t).replace(/\*([^*]+)\*/, '<em>$1</em>'); const m = t.match(/^(.*\s)(\S+?)([.!?…]*)$/); return m ? `${esc(m[1])}<em>${esc(m[2])}</em>${esc(m[3])}` : esc(t); };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const arrow = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICON = {
    play: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10.5 9.5v5l4.2-2.5z" fill="currentColor"/></svg>',
    motion: '<svg viewBox="0 0 24 24"><path d="M3 17c3-8 6-8 9 0s6 8 9 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="17" r="1.8" fill="currentColor"/></svg>',
    radio: '<svg viewBox="0 0 24 24"><rect x="4" y="9" width="16" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="15.5" cy="14.5" r="2.4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7.5 13h3M7.5 16h3M8 9l9-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    voice: '<svg viewBox="0 0 24 24"><path d="M4 6.5h9M8.5 4v2.5M6 6.5c.6 3 2.6 5.3 5 6.5M11 6.5c-.8 3.4-3 6-6.5 7.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M12.5 20l3.5-9 3.5 9M13.8 17h4.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><rect x="7" y="3" width="10" height="18" rx="2.6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M11 18h2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    board: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="8" height="7" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="13" y="4" width="8" height="7" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="3" y="13" width="8" height="7" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M14 15h6M14 18h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  };
  const latest = D.projects[0];
  const pickL = (v) => (typeof v === 'string' ? v : L(v));

  function render() {
    document.documentElement.lang = lang;
    document.title = lang === 'fr' ? 'Paruto Media · Propositions et réalisations' : 'Paruto Media · Proposals and sample work';
    $$('[data-t]').forEach((el) => { const v = S[el.dataset.t]; const txt = typeof v === 'object' && !Array.isArray(v) ? L(v) : v; el.innerHTML = ['headline', 'projectsTitle', 'capTitle', 'appTitle', 'ctaTitle'].includes(el.dataset.t) ? serifLast(txt) : esc(txt); });
    $$('[data-nav]').forEach((a) => (a.textContent = L(S.nav)[+a.dataset.nav]));
    $$('.seg button').forEach((b) => b.classList.toggle('on', b.dataset.lang === lang));
    $('.seg').dataset.on = lang === 'fr' ? '1' : '0';
    $('#ctaBtn').href = S.ctaHref;

    // the index: every proposal at a glance, newest first and largest
    const n = D.projects.length;
    $('#count').textContent = `${String(n).padStart(2, '0')} ${L(S.count)[n === 1 ? 0 : 1]} · ${[...new Set(D.projects.map((p) => p.year))].join(', ')}`;
    $('#index').setAttribute('aria-label', L(S.indexLabel));
    $('#index').dataset.n = Math.min(n, 4);
    $('#index').innerHTML = D.projects.map((p, i) => `
      <a class="tile panel" role="listitem" href="${esc(p.href)}?lang=${lang}" style="--a:${p.accent};--b:${p.accent2}" data-i="${i}">
        <span class="tile-media"><img src="${esc(pickL(p.poster))}" alt="" ${i ? 'loading="lazy"' : ''}><video muted loop playsinline preload="none" aria-hidden="true" data-src="${esc(pickL(p.teaser))}"></video>
          <span class="tile-no mono">${String(i + 1).padStart(2, '0')}${i === 0 ? ` · ${esc(L(S.newest))}` : ''}</span></span>
        <span class="tile-body">
          <span class="tile-kicker mono">${esc(L(p.kicker))}</span>
          <span class="tile-title">${serifLast(L(p.title))}</span>
          <span class="tile-meta"><span class="status"><span class="pulse" aria-hidden="true"></span>${esc(L(p.status))}</span><span>${esc(L(p.client).split(',')[0])} · ${esc(p.call)} · ${esc(p.year)}</span></span>
          <span class="tile-go" aria-hidden="true">${arrow}</span>
        </span>
      </a>`).join('');
    tiles();

    const words = D.capabilities.map((c) => L(c.t)).concat(['WhatsApp', lang === 'fr' ? 'Storyboards' : 'Storyboards', lang === 'fr' ? 'Radios communautaires' : 'Community radio']);
    $('#ticker').innerHTML = [...words, ...words].map((w) => `<span>${esc(w)}</span>`).join('');

    $('#projectList').innerHTML = D.projects.map((p, i) => `
      <article class="project panel reveal" style="--a:${p.accent};--b:${p.accent2}">
        <div class="p-top"><span class="p-no mono">${String(i + 1).padStart(2, '0')}</span><span class="status"><span class="pulse" aria-hidden="true"></span>${esc(L(p.status))}</span><span class="mono">${esc(p.call)} · ${esc(p.year)}</span></div>
        <div class="p-grid">
          <div>
            <p class="p-kicker mono">${esc(L(p.kicker))}</p>
            <h3>${serifLast(L(p.title))}</h3>
            <p class="p-sum">${esc(L(p.summary))}</p>
            <div class="p-stats">${p.stats.map((s) => `<div><b data-count="${s.n}">${reduce ? s.n : 0}</b><span>${esc(L(s.l))}</span></div>`).join('')}</div>
            <dl class="p-meta"><dt>${esc(L(S.meta.client))}</dt><dd>${esc(L(p.client))}</dd><dt>${esc(L(S.meta.call))}</dt><dd>${esc(p.call)}</dd><dt>${esc(L(S.meta.programme))}</dt><dd>${esc(p.programme)}</dd></dl>
            <div class="p-cta"><a class="btn primary" href="${esc(p.href)}?lang=${lang}">${esc(L(p.open))}${arrow}</a><a class="btn ghost" href="${esc(p.playHref)}?lang=${lang}">${esc(L(p.play))}</a></div>
          </div>
          <div class="fan">${p.gallery.map((g) => `<a href="${esc(g.href)}?lang=${lang}"><img src="${esc(typeof g.src === 'string' ? g.src : L(g.src))}" alt="" loading="lazy"><span class="cap">${esc(L(g.label))}</span></a>`).join('')}</div>
        </div>
      </article>`).join('') + `
      <div class="next reveal"><span class="p-no mono">${String(D.projects.length + 1).padStart(2, '0')}</span><div><b>${esc(L(S.next.title))}</b><p>${esc(L(S.next.text))}</p></div><span class="plus" aria-hidden="true">+</span></div>`;

    $('#caps').innerHTML = D.capabilities.map((c) => `<li class="cap panel reveal"><span class="ic">${ICON[c.icon]}</span><h3>${esc(L(c.t))}</h3><p>${esc(L(c.d))}</p></li>`).join('');
    $('#steps').innerHTML = D.approach.map((s) => `<li class="step reveal"><h3>${esc(L(s.t))}</h3><p>${esc(L(s.d))}</p></li>`).join('');
    $('#family').innerHTML = D.family.map((f) => `<li><a class="family-link" href="${esc(f.url)}">
      ${f.logo ? `<span class="family-logo"><img class="only-dark" src="${f.logo}-white.svg" alt="${esc(f.name)}"><img class="only-light" src="${f.logo}-black.svg" alt="" aria-hidden="true"></span>` : `<span class="family-name">${esc(f.name)}</span>`}
      <span class="family-note">${esc(L(f.note))}</span><span class="family-host">${esc(f.url.replace(/^https?:\/\//, ''))}</span>
      <span class="family-arrow" aria-hidden="true"><svg viewBox="0 0 12 12"><path d="M3 9l6-6M4 3h5v5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span></a></li>`).join('');
    observe();
  }

  // reveals and count-ups as things scroll into view
  let io;
  function observe() {
    if (io) io.disconnect();
    io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in'); io.unobserve(e.target);
      $$('[data-count]', e.target).forEach(countUp);
    }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('.reveal').forEach((el, i) => { el.style.transitionDelay = `${(i % 3) * 70}ms`; io.observe(el); });
  }
  function countUp(el) {
    const n = +el.dataset.count; if (reduce) { el.textContent = n; return; }
    const t0 = performance.now(), d = 1200;
    const step = (now) => { const p = Math.min(1, (now - t0) / d), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(n * e); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  // teasers in the index, muted: the newest plays while on screen, the others while hovered or
  // focused; stills only for reduced motion. The hero light follows the project under the pointer.
  const root = document.documentElement, hover = matchMedia('(hover: hover)').matches;
  const light = (p) => { root.style.setProperty('--a', p.accent); root.style.setProperty('--b', p.accent2); };
  light(latest);
  let seen;
  function tiles() {
    if (seen) seen.disconnect();
    const play = (v) => { if (reduce) return; if (!v.src) v.src = v.dataset.src; v.play().then(() => v.classList.add('on')).catch(() => {}); };
    const stop = (v) => { v.pause(); v.classList.remove('on'); };
    $$('.tile').forEach((t) => {
      const v = $('video', t), p = D.projects[+t.dataset.i];
      if (t.dataset.i === '0') {
        seen = new IntersectionObserver(([e]) => (e.isIntersecting ? play(v) : stop(v)), { threshold: 0.25 });
        seen.observe(t);
      } else if (hover) {
        t.addEventListener('pointerenter', () => play(v)); t.addEventListener('pointerleave', () => stop(v));
        t.addEventListener('focus', () => play(v)); t.addEventListener('blur', () => stop(v));
      }
      t.addEventListener('pointerenter', () => light(p)); t.addEventListener('focus', () => light(p));
    });
  }
  $('#index').addEventListener('pointerleave', () => light(latest));

  // spotlight on panels
  document.addEventListener('pointermove', (e) => {
    const p = e.target.closest && e.target.closest('.panel'); if (!p) return;
    const r = p.getBoundingClientRect(); p.style.setProperty('--mx', `${e.clientX - r.left}px`); p.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });

  // nav compacts while scrolling down, opens again when scrolling up
  const nav = $('#nav'); let lastY = scrollY;
  addEventListener('scroll', () => { const y = scrollY; nav.classList.toggle('compact', y > 120 && y > lastY); lastY = y; }, { passive: true });

  // theme: dark default, light opt-in, remembered
  const tbtn = $('#themeToggle');
  const syncTheme = () => { const light = root.dataset.theme === 'light'; tbtn.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode'); $('meta[name="theme-color"]').content = light ? '#f5f5f7' : '#060608'; };
  tbtn.addEventListener('click', () => { const light = root.dataset.theme !== 'light'; if (light) root.dataset.theme = 'light'; else delete root.dataset.theme; store.set('theme', light ? 'light' : 'dark'); syncTheme(); });
  syncTheme();

  $$('.seg button').forEach((b) => b.addEventListener('click', () => { if (b.dataset.lang === lang) return; lang = b.dataset.lang; store.set('kit-lang', lang); render(); $$('.reveal').forEach((el) => el.classList.add('in')); $$('[data-count]').forEach((el) => (el.textContent = el.dataset.count)); }));
  render();
})();

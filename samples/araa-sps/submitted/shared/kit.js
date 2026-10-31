// SPS kit — shared chrome behaviour: the light/dark toggle (dark by default, remembered), the nav
// compacting while scrolling down, the segmented control's thumb following the selected language,
// the panel spotlight and reveals. Each page keeps its own language switching.
(function () {
  const root = document.documentElement, $$ = (s) => [...document.querySelectorAll(s)];
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };

  const tbtn = document.querySelector('.theme-toggle');
  const syncTheme = () => {
    const light = root.dataset.theme === 'light';
    if (tbtn) tbtn.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = light ? '#f5f5f7' : '#060608';
  };
  if (tbtn) tbtn.addEventListener('click', () => { const light = root.dataset.theme !== 'light'; if (light) root.dataset.theme = 'light'; else delete root.dataset.theme; store.set('theme', light ? 'light' : 'dark'); syncTheme(); });
  syncTheme();

  const nav = document.querySelector('.nav'); let lastY = scrollY;
  if (nav) addEventListener('scroll', () => { const y = scrollY; nav.classList.toggle('compact', y > 120 && y > lastY); lastY = y; }, { passive: true });

  // the thumb sits under whichever button has .on (pages toggle .on when the language changes)
  $$('.seg').forEach((seg) => {
    const sync = () => { const i = [...seg.querySelectorAll('button')].findIndex((b) => b.classList.contains('on')); seg.style.setProperty('--i', Math.max(0, i)); };
    new MutationObserver(sync).observe(seg, { subtree: true, attributes: true, attributeFilter: ['class'] }); sync();
  });

  document.addEventListener('pointermove', (e) => {
    const p = e.target.closest && e.target.closest('.panel'); if (!p) return;
    const r = p.getBoundingClientRect(); p.style.setProperty('--mx', `${e.clientX - r.left}px`); p.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });

  // reveal blocks as they scroll in; pages that re-render call KIT.reveal()
  let io;
  const reveal = () => {
    if (io) io.disconnect();
    io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });
    $$('.reveal:not(.in)').forEach((el) => io.observe(el));
  };
  window.KIT = { reveal };
  reveal();
})();

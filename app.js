/* Paruto Apps showcase — renders everything from apps.json. No build step. */
(() => {
  const STATUS = {
    "live": "Live",
    "beta": "Beta",
    "in-development": "In development",
    "coming-soon": "Coming soon",
  };
  const STATUS_ORDER = ["live", "beta", "in-development", "coming-soon"];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, "0");
  const state = { data: null, apps: [], filter: { key: "all", value: null }, lb: { items: [], i: 0 } };

  // Tiny safe element builder (never injects HTML from data)
  function h(tag, props = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "style") el.style.cssText = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false || kid === "") continue;
      el.append(kid.nodeType ? kid : document.createTextNode(kid));
    }
    return el;
  }
  function svg(markup) {
    const t = document.createElement("template");
    t.innerHTML = markup.trim(); // static markup only
    return t.content.firstChild;
  }
  const ARROW = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg>';
  const EXT = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11 11 5M6 5h5v5"/></svg>';

  const accentStyle = (app) => `--a:${app.accent || "#8e8e93"};--b:${app.accent2 || app.accent || "#636366"}`;
  const statusEl = (s, extra = "") => h("span", { class: `status s-${s} ${extra}`.trim() }, STATUS[s] || s);
  const numberOf = (app) => pad(state.apps.indexOf(app) + 1);
  const iconEl = (app) => h("span", { class: "app-icon", style: accentStyle(app), "aria-hidden": "true" }, h("span", {}, app.icon || app.name[0]));

  // Visual helpers
  const media = (app) => app.media || [];
  const landscapeSrc = (app) => app.cover || media(app).find((m) => m.type === "image" && m.device !== "phone")?.src;
  const phoneMedia = (app) => media(app).find((m) => m.type === "image" && m.device === "phone");
  const galleryOf = (app) => (media(app).length ? media(app) : app.cover ? [{ type: "image", src: app.cover }] : []);
  const hostOf = (url) => { try { return new URL(url).host; } catch { return ""; } };

  /* ---------- Page chrome ---------- */
  function renderChrome() {
    const s = state.data.site;
    document.title = s.name;
    const [first, ...rest] = s.name.split(" ");
    $("brandName").replaceChildren(first, ...(rest.length ? [h("span", { class: "dim" }, " " + rest.join(" "))] : []));

    // Headline: words rise in one by one; the last word is set in italic serif
    const words = s.headline.trim().split(/\s+/);
    $("headline").replaceChildren(...words.flatMap((w, i) => {
      const last = i === words.length - 1;
      const span = h("span", { class: `w${last ? " serif" : ""}`, style: `animation-delay:${120 + i * 80}ms` }, w);
      return last ? [span] : [span, " "];
    }));
    $("subheadline").textContent = s.subheadline || "";
    $("eyebrow").textContent = s.eyebrow || "Now building";
    $("eyebrowCount").textContent = `${pad(state.apps.length)} ${state.apps.length === 1 ? "app" : "apps"}`;
    $("footerText").textContent = s.footer || "";
    $("wordmark").textContent = s.wordmark || first;

    const email = s.contactEmail;
    const mail = email ? `mailto:${email}` : null;
    $("contactLink").href = mail || "#contact";
    $("heroContact").href = mail || "#contact";
    $("footerEmail").hidden = !email;
    if (email) $("footerEmail").replaceChildren(email, svg(ARROW));
    $("footerEmail").href = mail || "#";

    // Only show honest, non-zero counts
    const stat = (n, label) => h("div", {}, h("dt", {}, label), h("dd", {}, pad(n)));
    const byStatus = STATUS_ORDER.map((st) => [st, state.apps.filter((a) => a.status === st).length]).filter(([, n]) => n);
    const cats = new Set(state.apps.map((a) => a.category).filter(Boolean)).size;
    $("stats").replaceChildren(
      stat(state.apps.length, state.apps.length === 1 ? "App" : "Apps"),
      ...byStatus.map(([st, n]) => stat(n, STATUS[st])),
      ...(cats ? [stat(cats, cats === 1 ? "Category" : "Categories")] : [])
    );
  }

  /* ---------- Hero wall: every app visual, drifting on a tilted plane ---------- */
  function renderWall() {
    const pool = state.apps.flatMap((app) => {
      const imgs = [app.cover, ...media(app).filter((m) => m.type === "image").map((m) => m.src)].filter(Boolean);
      const unique = [...new Set(imgs)];
      return unique.length ? unique.map((src) => ({ app, src })) : [{ app }];
    });
    if (!pool.length) { $("wall").hidden = true; return; }

    const tile = ({ app, src }) => src
      ? h("div", { class: "tile" }, h("img", { src, alt: "", decoding: "async" }))
      : h("div", { class: "tile poster", style: accentStyle(app) }, iconEl(app), h("span", { class: "nm" }, app.name));

    const ROWS = 3, PER_ROW = 8;
    const rows = Array.from({ length: ROWS }, (_, r) => {
      const set = Array.from({ length: Math.max(PER_ROW, pool.length) }, (_, i) => pool[(i + r * 2) % pool.length]);
      const nodes = [...set, ...set].map(tile); // duplicated for a seamless loop
      return h("div", { class: "wall-row" }, h("div", { class: "wall-track", style: `--dur:${90 + r * 25}s` }, nodes));
    });
    $("wall").replaceChildren(h("div", { class: "wall-plane" }, rows));
  }

  /* ---------- Filters: segmented control with a sliding glass thumb ---------- */
  function renderFilters() {
    const cats = [...new Set(state.apps.map((a) => a.category).filter(Boolean))].sort();
    const statuses = STATUS_ORDER.filter((s) => state.apps.some((a) => a.status === s));
    const items = [
      { key: "all", value: null, label: "All", n: state.apps.length },
      ...statuses.map((s) => ({ key: "status", value: s, label: STATUS[s], n: state.apps.filter((a) => a.status === s).length })),
      ...cats.map((c) => ({ key: "category", value: c, label: c, n: state.apps.filter((a) => a.category === c).length })),
    ];
    $("filters").replaceChildren(
      h("span", { class: "seg-thumb", "aria-hidden": "true" }),
      ...items.map((it) =>
        h("button", {
          class: "filter", type: "button", role: "tab",
          "aria-selected": String(it.key === state.filter.key && it.value === state.filter.value),
          onclick: (e) => {
            state.filter = { key: it.key, value: it.value };
            $("filters").querySelectorAll(".filter").forEach((b) => b.setAttribute("aria-selected", String(b === e.currentTarget)));
            moveThumb(); renderApps();
          },
        }, it.label, h("sup", {}, pad(it.n)))
      )
    );
    requestAnimationFrame(() => moveThumb(true));
  }
  function moveThumb(instant = false) {
    const wrap = $("filters");
    const sel = wrap.querySelector('.filter[aria-selected="true"]');
    const thumb = wrap.querySelector(".seg-thumb");
    if (!sel || !thumb) return;
    if (instant) thumb.style.transition = "none";
    thumb.style.translate = `${sel.offsetLeft}px 0`;
    thumb.style.width = `${sel.offsetWidth}px`;
    if (instant) { void thumb.offsetWidth; thumb.style.transition = ""; }
  }

  const matches = (app) => {
    const { key, value } = state.filter;
    return key === "all" || app[key] === value;
  };

  /* ---------- Index rows ---------- */
  function row(app) {
    return h("li", { class: "reveal" },
      h("a", {
        class: "row", href: `#/${app.id}`, style: accentStyle(app), "data-id": app.id,
        onclick: (e) => { e.preventDefault(); history.pushState(null, "", `#/${app.id}`); route(); },
      },
        h("span", { class: "row-num" }, numberOf(app)),
        h("span", { class: "row-name" }, iconEl(app), app.name),
        h("span", { class: "row-tag" }, app.tagline),
        h("span", { class: "row-cat" }, app.category || ""),
        statusEl(app.status),
        h("span", { class: "row-arrow", "aria-hidden": "true" }, svg(ARROW))
      )
    );
  }

  /* ---------- Showcase panels ---------- */
  function visual(app) {
    const gallery = galleryOf(app);
    const openAt = (src) => () => openLightbox(gallery, Math.max(0, gallery.findIndex((m) => m.src === src)));
    const land = landscapeSrc(app);
    const phone = phoneMedia(app);
    const bar = h("div", { class: "bar" }, h("i"), h("i"), h("i"), h("span", { class: "url" }, hostOf(app.url) || app.name));

    const frames = [];
    if (land) {
      frames.push(h("button", { class: "frame browser", type: "button", "aria-label": `Enlarge ${app.name} preview`, onclick: openAt(land) },
        bar, h("img", { src: land, alt: `${app.name} screenshot`, loading: "lazy" })));
    } else if (!phone) {
      frames.push(h("div", { class: "frame browser poster" }, bar,
        h("div", { class: "stage" },
          iconEl(app),
          h("span", { class: "soon glass" }, "Screenshots coming soon"))));
    }
    if (phone) {
      frames.push(h("button", { class: "frame phone", type: "button", "aria-label": `Enlarge ${app.name} phone preview`, onclick: openAt(phone.src) },
        h("img", { src: phone.src, alt: phone.caption || `${app.name} on a phone`, loading: "lazy" })));
    }
    const cls = ["app-visual", "reveal", phone && land && "has-phone", phone && !land && "phone-only"].filter(Boolean).join(" ");
    return h("div", { class: cls },
      h("div", { class: "glow", "aria-hidden": "true" }),
      h("div", { class: "tilt" }, frames));
  }

  function strip(app) {
    const gallery = galleryOf(app);
    if (gallery.length < 2) return null;
    return h("div", { class: "strip" },
      h("div", { class: "strip-head" }, h("p", { class: "label mono" }, "Gallery"), h("p", { class: "label mono" }, `${pad(gallery.length)} items`)),
      h("div", { class: "strip-row" },
        gallery.map((m, i) =>
          h("button", { class: "thumb", type: "button", "aria-label": m.caption || `Image ${i + 1}`, onclick: () => openLightbox(gallery, i) },
            m.type === "video"
              ? [h("video", { src: m.src, poster: m.poster, muted: true, playsinline: true, preload: "metadata" }), h("span", { class: "play", "aria-hidden": "true" }, "▶")]
              : h("img", { src: m.src, alt: m.caption || "", loading: "lazy" }))
        ))
    );
  }

  function section(app) {
    const links = [
      app.url && { label: "Open app", url: app.url, primary: true },
      ...(app.links || []),
    ].filter(Boolean);

    return h("article", { class: "app panel reveal", id: `app-${app.id}`, style: accentStyle(app) },
      h("div", { class: "app-grid" },
        h("div", { class: "app-info" },
          h("div", { class: "app-top" }, iconEl(app), h("span", { class: "app-num mono" }, `${numberOf(app)} / ${pad(state.apps.length)}`)),
          h("h3", {}, app.name),
          h("p", { class: "app-tagline" }, app.tagline),
          h("div", { class: "app-meta" },
            statusEl(app.status, "pill"),
            app.category && h("span", { class: "pill" }, app.category),
            (app.platforms || []).map((p) => h("span", { class: "pill" }, p))),
          app.description && h("p", { class: "app-desc" }, app.description),
          (app.highlights || []).length > 0 && h("ul", { class: "app-hl" }, app.highlights.map((t) => h("li", {}, t))),
          links.length > 0 && h("div", { class: "app-actions" },
            links.map((l) => h("a", { class: `btn ${l.primary ? "primary" : "ghost glass"}`, href: l.url, target: "_blank", rel: "noopener" }, l.label, svg(EXT))))
        ),
        visual(app)
      ),
      strip(app)
    );
  }

  function renderApps() {
    const visible = state.apps.filter(matches);
    $("list").replaceChildren(...visible.map(row));
    $("apps").replaceChildren(...visible.map(section));
    $("empty").hidden = visible.length > 0;
    observeReveals();
  }

  /* ---------- Scroll reveal ---------- */
  const io = "IntersectionObserver" in window && !reduceMotion
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 })
    : null;
  function observeReveals() {
    document.querySelectorAll(".reveal:not(.in)").forEach((el, i) => {
      if (!io) return el.classList.add("in");
      el.style.transitionDelay = el.closest(".list") ? `${Math.min(i, 8) * 60}ms` : el.classList.contains("app-visual") ? "120ms" : "";
      io.observe(el);
    });
  }

  /* ---------- Pointer effects: panel spotlight + 3D tilt on app visuals ---------- */
  function setupPointerFx() {
    if (!finePointer || reduceMotion) return;
    document.addEventListener("pointermove", (e) => {
      const panel = e.target.closest?.(".panel");
      if (panel) {
        const r = panel.getBoundingClientRect();
        panel.style.setProperty("--mx", `${e.clientX - r.left}px`);
        panel.style.setProperty("--my", `${e.clientY - r.top}px`);
      }
      const vis = e.target.closest?.(".app-visual");
      if (vis) {
        const r = vis.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        vis.style.setProperty("--ry", `${(px * 10).toFixed(2)}deg`);
        vis.style.setProperty("--rx", `${(-py * 8).toFixed(2)}deg`);
      }
    }, { passive: true });
    document.addEventListener("pointerout", (e) => {
      const vis = e.target.closest?.(".app-visual");
      if (vis && !vis.contains(e.relatedTarget)) { vis.style.removeProperty("--rx"); vis.style.removeProperty("--ry"); }
      const panel = e.target.closest?.(".panel");
      if (panel && !panel.contains(e.relatedTarget)) { panel.style.removeProperty("--mx"); panel.style.removeProperty("--my"); }
    });
  }

  /* ---------- Cursor-following preview over the index ---------- */
  function setupPeek() {
    if (!finePointer) return;
    const peek = $("peek");
    const W = 320, H = 200;
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0, active = false;
    const place = () => {
      const px = x + 28 + W > innerWidth ? x - 28 - W : x + 28;
      const py = Math.min(Math.max(y - H / 2, 12), innerHeight - H - 12);
      peek.style.translate = `${px}px ${py}px`;
    };
    const tick = () => {
      x += (tx - x) * 0.18; y += (ty - y) * 0.18; place();
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(tick) : 0;
    };
    const hide = () => { peek.classList.remove("on"); active = false; delete peek.dataset.id; };
    const list = $("list");
    list.addEventListener("pointermove", (e) => {
      tx = e.clientX; ty = e.clientY;
      if (!active) { x = tx; y = ty; place(); }
      if (!raf) raf = requestAnimationFrame(tick);
    });
    list.addEventListener("pointerover", (e) => {
      const r = e.target.closest(".row");
      if (!r || r.dataset.id === peek.dataset.id) return;
      const app = state.apps.find((a) => a.id === r.dataset.id);
      if (!app) return;
      const src = landscapeSrc(app) || phoneMedia(app)?.src;
      peek.dataset.id = app.id;
      peek.style.setProperty("--a", app.accent || "#8e8e93");
      peek.replaceChildren(src ? h("img", { src, alt: "" }) : h("div", { class: "poster-mini" }, iconEl(app)));
      peek.classList.add("on"); active = true;
    });
    list.addEventListener("pointerleave", hide);
    addEventListener("scroll", () => { if (active) hide(); }, { passive: true });
  }

  /* ---------- Nav: compacts while scrolling down, expands on scroll up ---------- */
  function setupNav() {
    const nav = $("nav");
    let lastY = scrollY;
    addEventListener("scroll", () => {
      const y = scrollY;
      if (Math.abs(y - lastY) < 6) return;
      nav.classList.toggle("compact", y > 240 && y > lastY);
      lastY = y;
    }, { passive: true });
  }

  /* ---------- Theme: dark by default, light is opt-in and remembered ---------- */
  function setupThemeToggle() {
    const btn = $("themeToggle");
    const root = document.documentElement;
    const sync = () => {
      const light = root.dataset.theme === "light";
      btn.setAttribute("aria-label", light ? "Switch to dark mode" : "Switch to light mode");
      document.querySelector('meta[name="theme-color"]').content = light ? "#f5f5f7" : "#060608";
    };
    btn.addEventListener("click", () => {
      const light = root.dataset.theme !== "light";
      if (light) root.dataset.theme = "light"; else delete root.dataset.theme;
      try { localStorage.setItem("theme", light ? "light" : "dark"); } catch {}
      sync();
    });
    sync();
  }

  /* ---------- Lightbox ---------- */
  function openLightbox(items, i) {
    if (!items.length) return;
    state.lb = { items, i };
    paintLightbox();
    $("lightbox").hidden = false;
    document.body.classList.add("locked");
  }
  function paintLightbox() {
    const { items, i } = state.lb;
    const m = items[i];
    const node = m.type === "video"
      ? h("video", { src: m.src, poster: m.poster, controls: true, autoplay: true, loop: true, playsinline: true })
      : h("img", { src: m.src, alt: m.caption || "" });
    $("lbFigure").replaceChildren(node, ...(m.caption ? [h("figcaption", {}, m.caption)] : []));
    $("lbCount").textContent = `${pad(i + 1)} / ${pad(items.length)}`;
    $("lbPrev").hidden = $("lbNext").hidden = items.length < 2;
  }
  function stepLightbox(d) {
    const n = state.lb.items.length;
    state.lb.i = (state.lb.i + d + n) % n;
    paintLightbox();
  }
  function closeLightbox() {
    $("lightbox").hidden = true;
    $("lbFigure").replaceChildren();
    document.body.classList.remove("locked");
  }

  /* ---------- Routing: #/app-id scrolls to that app ---------- */
  function route() {
    const m = location.hash.match(/^#\/(.+)$/);
    if (!m) return;
    const id = decodeURIComponent(m[1]);
    const app = state.apps.find((a) => a.id === id);
    if (!app) return;
    if (!matches(app)) { state.filter = { key: "all", value: null }; renderFilters(); renderApps(); }
    const el = $(`app-${id}`);
    [el, ...el.querySelectorAll(".reveal")].forEach((r) => r.classList.add("in"));
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  /* ---------- Boot ---------- */
  async function init() {
    try {
      const res = await fetch(`apps.json?v=${Date.now()}`, { cache: "no-cache" });
      if (!res.ok) throw new Error(res.status);
      state.data = await res.json();
    } catch {
      $("headline").textContent = "Couldn't load apps.";
      $("subheadline").textContent = "apps.json failed to load. If you opened this file directly, run a local server (see README).";
      return;
    }
    // Featured apps first, then newest first
    state.apps = [...state.data.apps].sort((a, b) =>
      (b.featured === true) - (a.featured === true) || (b.added || "").localeCompare(a.added || ""));

    renderChrome(); renderWall(); renderFilters(); renderApps(); setupPeek(); setupPointerFx(); setupNav(); setupThemeToggle();
    if (location.hash.startsWith("#/")) requestAnimationFrame(route);

    addEventListener("hashchange", route);
    addEventListener("resize", () => moveThumb(true));
    document.fonts?.ready.then(() => moveThumb(true));
    $("lightbox").addEventListener("click", (e) => {
      if (e.target.closest("[data-lb-close]") || e.target === $("lightbox") || e.target === $("lbFigure")) closeLightbox();
    });
    $("lbPrev").addEventListener("click", () => stepLightbox(-1));
    $("lbNext").addEventListener("click", () => stepLightbox(1));
    document.addEventListener("keydown", (e) => {
      if ($("lightbox").hidden) return;
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") stepLightbox(-1);
      else if (e.key === "ArrowRight") stepLightbox(1);
    });
  }
  init();
})();

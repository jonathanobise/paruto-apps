/* Paruto Apps showcase — renders everything from apps.json. No build step.
   (01) the Atrium: every app on a turning ring · (02) the Index · (03) Files: unannounced projects, redacted. */
(() => {
  const STATUS = {
    "live": "Live",
    "beta": "Beta",
    "in-development": "In development",
    "coming-soon": "Coming soon",
  };
  const STATUS_ORDER = ["live", "beta", "in-development", "coming-soon"];
  // Unannounced projects are listed under codenames in this category, and appear only in Files
  const SEALED = "Unannounced";
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, "0");
  const state = { data: null, apps: [], open: null, lastFocus: null, lb: { items: [], i: 0 } };

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
  const iconEl = (app) => app.iconImage
    ? h("span", { class: "app-icon has-img", style: accentStyle(app), "aria-hidden": "true" },
        h("img", { class: "only-dark", src: `${app.iconImage}-dark.svg`, alt: "" }),
        h("img", { class: "only-light", src: `${app.iconImage}-light.svg`, alt: "" }))
    : h("span", { class: "app-icon", style: accentStyle(app), "aria-hidden": "true" }, h("span", {}, app.icon || app.name[0]));
  const chipsEl = (app, all = false) => h("ul", { class: "chips" },
    h("li", { class: `chip status s-${app.status}` }, STATUS[app.status] || app.status),
    app.category && h("li", { class: "chip" }, app.category),
    ...(app.platforms || []).slice(0, all ? 9 : 1).map((p) => h("li", { class: "chip" }, p)));

  // Visual helpers
  const media = (app) => app.media || [];
  const landscapeSrc = (app) => app.cover || media(app).find((m) => m.type === "image" && m.device !== "phone")?.src;
  const phoneSrc = (app) => media(app).find((m) => m.type === "image" && m.device === "phone")?.src;
  // Small WebP copies made by scripts/wall-thumbs.mjs (assets/wall/...), with the original for sharp screens
  const thumb = (src) => src.startsWith("assets/apps/") ? src.replace(/^assets\/apps\//, "assets/wall/").replace(/\.[a-z0-9]+$/i, ".webp") : src;
  const hostOf = (url) => { try { return new URL(url).host; } catch { return ""; } };

  /* ---------- Page chrome ---------- */
  function renderChrome() {
    const s = state.data.site;
    document.title = s.name;
    const [first, ...rest] = s.name.split(" ");
    $("brandName").replaceChildren(first, ...(rest.length ? [h("span", { class: "dim" }, " " + rest.join(" "))] : []));

    // Headline: the last word is set in italic serif
    const words = s.headline.trim().split(/\s+/);
    $("headline").replaceChildren(...words.flatMap((w, i) => (i === words.length - 1 ? [h("span", { class: "serif" }, w)] : [w, " "])));
    $("eyebrow").textContent = s.eyebrow || "Now building";
    $("eyebrowCount").textContent = `${pad(state.apps.length)} ${state.apps.length === 1 ? "app" : "apps"}`;
    $("footerText").textContent = s.footer || "";
    $("wordmark").textContent = s.wordmark || first;

    // The Paruto family: sister companies, from site.family
    const family = (s.family || []).filter((f) => f && f.name && f.url);
    $("family").hidden = !family.length;
    $("familyLinks").replaceChildren(...family.map((f) =>
      h("li", {},
        h("a", { class: "family-link", href: f.url, target: "_blank", rel: "noopener" },
          f.logo && h("span", { class: "family-logo", "aria-hidden": "true" },
            h("img", { class: "only-dark", src: `${f.logo}-white.svg`, alt: "", loading: "lazy" }),
            h("img", { class: "only-light", src: `${f.logo}-black.svg`, alt: "", loading: "lazy" })),
          h("span", { class: f.logo ? "family-name sr-only" : "family-name" }, f.name),
          f.note && h("span", { class: "family-note" }, f.note),
          h("span", { class: "family-host" }, hostOf(f.url).replace(/^www\./, "")),
          h("span", { class: "family-arrow", "aria-hidden": "true" }, svg(EXT))))
    ));

    const email = s.contactEmail;
    const mail = email ? `mailto:${email}` : null;
    $("contactLink").href = mail || "#contact";
    $("footerEmail").hidden = !email;
    if (email) $("footerEmail").replaceChildren(email, svg(ARROW));
    $("footerEmail").href = mail || "#";
  }

  /* ---------- (01) Atrium: the ring ---------- */
  function renderAtrium(apps) {
    const N = apps.length, step = 360 / N;
    const ring = $("ring"), stage = $("ringStage"), atrium = $("atrium");
    ring.replaceChildren(...apps.map((app, i) => {
      const wide = landscapeSrc(app), tall = phoneSrc(app);
      const near = i < 4 || i > N - 3; // the cards that start in view load first
      const shot = wide ? h("div", { class: "rc-shot" }, h("img", { src: thumb(wide), alt: "", decoding: "async", loading: near ? "eager" : "lazy" }))
        : tall ? h("div", { class: "rc-shot phone" }, h("img", { src: thumb(tall), alt: "", decoding: "async", loading: near ? "eager" : "lazy" }))
        : h("div", { class: "rc-shot" }, iconEl(app));
      return h("div", { class: "rc", style: `${accentStyle(app)};--angle:${(i * step).toFixed(3)}deg`, "data-i": i },
        h("button", { class: "rc-face", type: "button", tabindex: "-1", "aria-label": app.name }, shot, h("span", { class: "rc-bar" }, iconEl(app), h("b", {}, app.name))));
    }));
    const cards = [...ring.children];

    const radius = () => {
      const w = ring.getBoundingClientRect().width || 300;
      ring.style.setProperty("--r", `${Math.round((w / 2) / Math.tan(Math.PI / N) * 1.08)}px`);
    };
    radius(); addEventListener("resize", radius);

    let theta = 0, front = -1;
    const norm = (d) => ((d % 360) + 540) % 360 - 180;
    const paint = () => {
      ring.style.setProperty("--turn", `${(-theta).toFixed(2)}deg`);
      cards.forEach((c, i) => {
        const d = Math.abs(norm(i * step - theta));
        c.style.setProperty("--vis", d > 110 ? 0 : (1 - (d / 110) * 0.78).toFixed(3));
        c.classList.toggle("is-front", d < step / 2);
      });
      const f = ((Math.round(theta / step) % N) + N) % N;
      if (f !== front) { front = f; showFront(apps[f], f, N); atrium.style.cssText = accentStyle(apps[f]); }
    };
    const snapTo = (t) => { ring.classList.add("snap"); theta = t; paint(); };
    ring.addEventListener("transitionend", () => ring.classList.remove("snap"));
    const turnBy = (k) => { stopAuto(); snapTo(Math.round(theta / step) * step + k * step); };
    $("prev").onclick = () => turnBy(-1);
    $("next").onclick = () => turnBy(1);
    stage.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); turnBy(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); turnBy(-1); }
      if (e.key === "Enter") { e.preventDefault(); openSheet(apps[front]); }
    });

    // Drag or swipe to turn; a tap on the front card opens it, a tap on another card turns to it
    let drag = null;
    stage.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      stopAuto(); ring.classList.remove("snap");
      drag = { x: e.clientX, y: e.clientY, t0: theta, moved: false, id: e.pointerId };
    });
    addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(e.clientY - drag.y)) { drag.moved = true; stage.setPointerCapture(e.pointerId); }
      if (drag.moved) { theta = drag.t0 - dx * (step / (ring.offsetWidth * 0.9)); paint(); }
    });
    addEventListener("pointerup", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag; drag = null;
      if (d.moved) { snapTo(Math.round(theta / step) * step); return; }
      const card = e.target.closest?.(".rc");
      if (!card) return;
      const i = +card.dataset.i;
      if (i === front) openSheet(apps[i]);
      else snapTo(theta + norm(i * step - theta));
    });
    addEventListener("pointercancel", () => { if (drag) { drag = null; snapTo(Math.round(theta / step) * step); } });
    stage.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // leave vertical scrolling to the page
      e.preventDefault(); stopAuto(); ring.classList.remove("snap");
      theta += e.deltaX * 0.08; paint();
      clearTimeout(stage._wheel); stage._wheel = setTimeout(() => snapTo(Math.round(theta / step) * step), 140);
    }, { passive: false });

    // A slow turn until someone takes over (never under Reduce Motion, paused off screen)
    let auto = !reduceMotion, visible = true, last = 0, raf = 0;
    const tick = (t) => {
      raf = 0;
      if (!auto || !visible || document.hidden) return;
      if (last) { theta += Math.min(64, t - last) * 0.0045; paint(); }
      last = t; raf = requestAnimationFrame(tick);
    };
    const kick = () => { last = 0; if (auto && !raf) raf = requestAnimationFrame(tick); };
    function stopAuto() { auto = false; }
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; kick(); }).observe(stage);
    document.addEventListener("visibilitychange", kick);
    paint(); kick();
  }

  function showFront(app, i, n) {
    $("pos").textContent = `${pad(i + 1)} / ${pad(n)}`;
    $("now").replaceChildren(
      h("h2", {}, app.name),
      h("p", {}, app.tagline),
      chipsEl(app),
      h("div", { class: "row" },
        app.url && h("a", { class: "btn primary", href: app.url, target: "_blank", rel: "noopener" }, "Open app", svg(EXT)),
        h("button", { class: "btn quiet", type: "button", onclick: () => openSheet(app) }, "Up close", svg(ARROW))));
  }

  /* ---------- (02) Index ---------- */
  function renderIndex(apps) {
    const follow = $("follow"), img = follow.querySelector("img");
    $("ix").replaceChildren(...apps.map((app, i) => {
      const pic = landscapeSrc(app) || phoneSrc(app);
      return h("li", {}, h("button", { class: "ix-row", type: "button", style: accentStyle(app), "aria-label": `${app.name}: ${app.tagline}. ${STATUS[app.status] || ""}`,
          onclick: () => openSheet(app),
          onpointerenter: () => { if (!finePointer || !pic) return; img.src = thumb(pic); follow.classList.add("on"); },
          onpointerleave: () => follow.classList.remove("on") },
        h("span", { class: "ix-num" }, pad(i + 1)),
        h("span", { class: "ix-name" }, iconEl(app), h("span", {}, app.name)),
        h("span", { class: "ix-cat" }, app.category || ""),
        chipsEl(app).firstChild));
    }));
    // The picture eases after the pointer with a slight lean (mouse only, not under Reduce Motion)
    if (finePointer && !reduceMotion) {
      let x = 0, y = 0, fx = 0, fy = 0, raf = 0;
      const loop = () => {
        fx += (x - fx) * 0.18; fy += (y - fy) * 0.18;
        follow.style.transform = `translate(${fx + 28}px, ${fy - 110}px) rotate(${Math.max(-6, Math.min(6, (x - fx) * 0.06))}deg)`;
        raf = Math.abs(x - fx) + Math.abs(y - fy) > 0.5 ? requestAnimationFrame(loop) : 0;
      };
      addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; if (!raf) raf = requestAnimationFrame(loop); }, { passive: true });
    }
  }

  /* ---------- (03) Files ---------- */
  function renderFiles(apps) {
    $("files").hidden = !apps.length;
    $("fl").replaceChildren(...apps.map((app, i) => {
      const id = `file-${app.id}`;
      const words = (app.description || "").split(/\s+/).filter(Boolean);
      const li = h("li", { class: "file", style: accentStyle(app), "data-id": app.id },
        h("button", { class: "file-head", type: "button", "aria-expanded": "false", "aria-controls": id, onclick: () => toggleFile(li) },
          h("span", { class: "file-no" }, `File ${pad(i + 1)}`),
          h("span", { class: "file-name" }, app.name.replace(/^Project /, ""), " ", h("i", { "aria-hidden": "true" }, "●")),
          h("span", { class: "file-tag" }, app.tagline),
          h("span", { class: "file-plus", "aria-hidden": "true" })),
        h("div", { class: "file-body", id },
          h("div", {}, h("div", { class: "file-inner" },
            h("span", { class: "stamp" }, `${app.name} · Classified`),
            h("p", { class: "file-text" }, ...words.flatMap((w, k) => [h("span", { class: "ln", style: `--k:${k}` }, w), " "])),
            h("p", { class: "file-sign" }, "Released when ready")))));
      return li;
    }));
  }
  function toggleFile(li, open = !li.hasAttribute("open-file")) {
    li.toggleAttribute("open-file", open);
    li.querySelector(".file-head").setAttribute("aria-expanded", String(open));
  }

  /* ---------- Sheet: an app up close ---------- */
  function sheetContent(app) {
    const wide = landscapeSrc(app);
    const gallery = media(app).filter((m) => m.type === "image" || m.type === "video");
    return h("article", { style: accentStyle(app) },
      h("div", { class: "sh-cover" }, wide ? h("img", { src: wide, alt: `${app.name} screenshot` }) : iconEl(app)),
      h("div", { class: "sh-main" },
        iconEl(app),
        h("h2", { id: "sheetTitle" }, app.name),
        h("p", { class: "sh-tag" }, app.tagline),
        chipsEl(app, true),
        h("div", { class: "row", style: "display:flex;flex-wrap:wrap;gap:10px" },
          app.url && h("a", { class: "btn primary", href: app.url, target: "_blank", rel: "noopener" }, "Open app", svg(EXT)),
          ...(app.links || []).map((l) => h("a", { class: "btn quiet", href: l.url, target: "_blank", rel: "noopener" }, l.label, svg(EXT)))),
        app.description && h("p", { class: "sh-desc" }, app.description),
        (app.highlights || []).length ? h("ul", { class: "ticks" }, ...app.highlights.map((t) => h("li", {}, t))) : null,
        gallery.length > 1 && h("div", { class: "sh-gallery" }, ...gallery.map((m, i) => {
          const still = m.type === "video" ? m.poster : m.src;
          return h("figure", { class: m.device === "phone" ? "tall" : "" },
            h("button", { type: "button", "aria-label": `View ${m.caption || `image ${i + 1}`} full size`, onclick: () => openLightbox(gallery, i) },
              still ? h("img", { src: thumb(still), srcset: `${thumb(still)} 640w, ${still} 1600w`, sizes: "300px", alt: m.caption || "", loading: "lazy" }) : h("span", {}, "▶")),
            m.caption && h("figcaption", {}, m.caption));
        }))));
  }
  function openSheet(app, push = true) {
    if (!app) return;
    state.lastFocus = document.activeElement;
    state.open = app;
    $("sheetScroll").replaceChildren(sheetContent(app));
    $("sheetScroll").scrollTop = 0;
    for (const id of ["scrim", "sheet"]) { $(id).hidden = false; $(id).classList.remove("out"); }
    document.body.classList.add("locked");
    $("sheetClose").focus({ preventScroll: true });
    if (push) history.pushState({ app: app.id }, "", `#/${app.id}`);
  }
  function closeSheet(pop = false) {
    if (!state.open) return;
    state.open = null;
    const done = () => { $("scrim").hidden = true; $("sheet").hidden = true; document.body.classList.remove("locked"); state.lastFocus?.focus?.({ preventScroll: true }); };
    if (reduceMotion) done();
    else { $("scrim").classList.add("out"); $("sheet").classList.add("out"); setTimeout(done, 340); }
    if (!pop && location.hash.startsWith("#/")) history.back();
  }

  /* ---------- Lightbox ---------- */
  function openLightbox(items, i) {
    if (!items.length) return;
    state.lb = { items, i };
    paintLightbox();
    $("lightbox").hidden = false;
    $("lightbox").querySelector("[data-lb-close]").focus({ preventScroll: true });
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
  }

  /* ---------- Keyboard: Escape closes the top layer; focus stays inside it ---------- */
  function trapFocus(e, root) {
    const f = [...root.querySelectorAll("a[href],button:not([disabled]):not([hidden]),video")].filter((el) => el.offsetParent !== null);
    if (!f.length) return;
    const [first, last] = [f[0], f[f.length - 1]];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  document.addEventListener("keydown", (e) => {
    if (!$("lightbox").hidden) {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") stepLightbox(-1);
      else if (e.key === "ArrowRight") stepLightbox(1);
      else if (e.key === "Tab") trapFocus(e, $("lightbox"));
      return;
    }
    if (!state.open) return;
    if (e.key === "Escape") closeSheet();
    else if (e.key === "Tab") trapFocus(e, $("sheet"));
  });

  /* ---------- Nav: compacts while scrolling down, returns when scrolling up ---------- */
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

  /* ---------- Cursor spotlight on the contact panel ---------- */
  function setupPointerFx() {
    if (!finePointer || reduceMotion) return;
    document.addEventListener("pointermove", (e) => {
      const panel = e.target.closest?.(".panel");
      if (!panel) return;
      const r = panel.getBoundingClientRect();
      panel.style.setProperty("--mx", `${e.clientX - r.left}px`);
      panel.style.setProperty("--my", `${e.clientY - r.top}px`);
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

  /* ---------- Routing: #/app-id opens that app (or its file, for an unannounced one) ---------- */
  function route(push = false) {
    const m = location.hash.match(/^#\/(.+)$/);
    if (!m) { closeSheet(true); return; }
    const id = decodeURIComponent(m[1]);
    // Old ids of renamed apps (listed in "aliases") still work; the address bar switches to the current id
    const app = state.apps.find((a) => a.id === id || (a.aliases || []).includes(id));
    if (!app) return;
    if (app.id !== id) history.replaceState(null, "", `#/${app.id}`);
    if (app.category === SEALED) {
      const li = document.querySelector(`.file[data-id="${app.id}"]`);
      if (!li) return;
      toggleFile(li, true);
      li.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
      return;
    }
    if (state.open?.id !== app.id) openSheet(app, push);
  }

  /* ---------- Boot ---------- */
  async function init() {
    setupNav(); setupThemeToggle(); setupPointerFx();
    $("sheetClose").onclick = () => closeSheet();
    $("scrim").onclick = () => closeSheet();
    $("lightbox").addEventListener("click", (e) => {
      if (e.target.closest("[data-lb-close]") || e.target === $("lightbox") || e.target === $("lbFigure")) closeLightbox();
    });
    $("lbPrev").addEventListener("click", () => stepLightbox(-1));
    $("lbNext").addEventListener("click", () => stepLightbox(1));
    try {
      // Preloaded in index.html; Cloudflare serves it with "revalidate every time", so it's never stale.
      const res = await fetch("apps.json");
      if (!res.ok) throw new Error(res.status);
      state.data = await res.json();
    } catch {
      $("headline").textContent = "Couldn't load apps.";
      $("now").textContent = "apps.json failed to load. If you opened this file directly, run a local server (see README).";
      return;
    }
    // Live apps first (then beta, in development, coming soon); within a status, featured first, then newest
    const rank = (app) => { const i = STATUS_ORDER.indexOf(app.status); return i === -1 ? STATUS_ORDER.length : i; };
    state.apps = [...state.data.apps].sort((a, b) =>
      rank(a) - rank(b) || (b.featured === true) - (a.featured === true) || (b.added || "").localeCompare(a.added || ""));
    const named = state.apps.filter((a) => a.category !== SEALED);

    renderChrome();
    renderAtrium(named);
    renderIndex(named);
    renderFiles(state.apps.filter((a) => a.category === SEALED));
    if (location.hash.startsWith("#/")) route();
    addEventListener("popstate", () => route());
  }
  init();
})();

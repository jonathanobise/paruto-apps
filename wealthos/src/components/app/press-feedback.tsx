"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const CONTROL = "button, [role=button], summary, a.spring, a[data-press]";

/** The clipping layer a press draws into, so a ripple never spills past a capsule's corners. */
function layer(el: HTMLElement): HTMLElement {
  let ink = el.querySelector<HTMLElement>(":scope > .vio-ink");
  if (!ink) {
    if (getComputedStyle(el).position === "static") el.style.position = "relative";
    ink = document.createElement("span");
    ink.className = "vio-ink";
    ink.setAttribute("aria-hidden", "true");
    el.appendChild(ink);
  }
  return ink;
}

/**
 * Press feedback for every control in the app (Paruto design language, Buttons): a soft ripple from
 * where it was touched, the spring dip (`:active` in globals.css), and a busy state on the button
 * that sent a form (aria-busy, a sheen sweeping across, further presses held back) until the page
 * moves on. Reduce Motion keeps the busy state and drops the ripple.
 */
export function PressFeedback() {
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || reduce.matches) return;
      const el = (e.target as Element | null)?.closest?.(CONTROL) as HTMLElement | null;
      if (!el || el.matches(":disabled, [aria-disabled=true], [data-no-ink]") || el.closest("[data-no-ink]")) return;
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return;
      const size = Math.max(r.width, r.height) * 2.2;
      const dot = document.createElement("span");
      dot.className = "vio-ripple";
      dot.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
      layer(el).appendChild(dot);
      dot.addEventListener("animationend", () => dot.remove(), { once: true });
      window.setTimeout(() => dot.remove(), 1200);
    };
    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement;
      const btn = (e.submitter as HTMLElement | null) ?? form.querySelector<HTMLElement>("button[type=submit], button:not([type])");
      // SubmitButton shows its own pending state (useFormStatus); everything else gets this one.
      if (!btn || btn.hasAttribute("data-busy") || btn.hasAttribute("data-own-busy") || form.hasAttribute("data-no-busy")) return;
      // After React has taken the submission, so the button is never disabled before it's sent.
      window.setTimeout(() => {
        btn.setAttribute("data-busy", "");
        btn.setAttribute("aria-busy", "true");
        layer(btn);
        // Done when the page answers: its first change after a moment (or, at most, 12 seconds).
        const settle = () => {
          watch.disconnect();
          clearBusy(btn);
        };
        const watch = new MutationObserver((records) => {
          if (records.some((r) => !(r.target instanceof Element && r.target.closest(".vio-ink")) && r.attributeName !== "data-busy" && r.attributeName !== "aria-busy")) settle();
        });
        window.setTimeout(() => btn.isConnected && watch.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true }), 250);
        window.setTimeout(settle, 12_000);
      }, 0);
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("submit", onSubmit);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("submit", onSubmit);
    };
  }, []);

  // The page moved on (or the action re-rendered it): nothing is busy any more.
  useEffect(() => {
    document.querySelectorAll<HTMLElement>("[data-busy]").forEach(clearBusy);
  }, [pathname, search]);

  return null;
}

function clearBusy(el: HTMLElement) {
  el.removeAttribute("data-busy");
  if (el.getAttribute("aria-busy") === "true" && !el.closest("[data-keep-busy]")) el.removeAttribute("aria-busy");
}

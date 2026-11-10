"use client";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { connection, subscribeConnection } from "@/lib/connection";
import { BUILD, isNewBuild, isVersion, versionLabel } from "@/lib/updates/version";
import { announceWaiting, refreshToLatest } from "@/lib/updates/waiting";

const LATER_KEY = "vio-update-later";
/** How often an open, visible app asks whether a new version is live. */
const EVERY_MS = 30 * 60_000;

/**
 * A new version, from one place for every page (paruto-standards STANDARDS.md, Updates). The app asks
 * what's live (GET /__version) at calm moments: 20 s after it opens, on coming back to it, on
 * reconnecting, and every half hour while it's on screen. When a newer build is live, the new
 * service worker installs in the background and, online, a small glass pill offers Refresh; Later
 * hides it for that version until the app is next opened. Offline, nothing is shown. A page whose
 * code can't load because it went with an earlier version (ChunkLoadError) gets the same pill.
 */
export function UpdateNudge() {
  const online = useSyncExternalStore(subscribeConnection, () => connection() === "online", () => true);
  const [live, setLive] = useState<string | null>(null);
  const [release, setRelease] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [later, setLater] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const check = useCallback(async () => {
    if (BUILD === "dev" || document.visibilityState !== "visible" || connection() === "offline") return;
    const answer = await fetch("/__version", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ build?: unknown; release?: unknown }>) : null))
      .catch(() => null);
    const build = typeof answer?.build === "string" ? answer.build : null;
    if (!isNewBuild(BUILD, build)) return;
    setLive(build);
    setRelease(isVersion(answer?.release) ? answer.release : null);
    announceWaiting(isVersion(answer?.release) ? answer.release : "");
    if ("serviceWorker" in navigator) navigator.serviceWorker.register(`/sw.js?v=${build}`, { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the tab's storage once
      setLater(sessionStorage.getItem(LATER_KEY));
    } catch {}
    const soon = window.setTimeout(() => void check(), 20_000);
    const every = window.setInterval(() => void check(), EVERY_MS);
    const onVisible = () => document.visibilityState === "visible" && void check();
    const offConnection = subscribeConnection(() => connection() === "online" && void check());
    const onError = (e: ErrorEvent | PromiseRejectionEvent) => {
      const reason = "reason" in e ? e.reason : e.error;
      if (reason && /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/i.test(`${reason?.name ?? ""} ${reason?.message ?? reason}`)) {
        setStale(true);
        void check();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onError);
    return () => {
      window.clearTimeout(soon);
      window.clearInterval(every);
      offConnection();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onError);
    };
  }, [check]);

  const key = live ?? (stale ? "stale" : null);
  if (!key || !online || later === key) return null;

  const dismiss = () => {
    setLater(key);
    try {
      sessionStorage.setItem(LATER_KEY, key);
    } catch {}
  };
  const title = stale && !live ? `${BRAND} has been updated` : release ? `${BRAND} ${versionLabel(release)} is ready` : `A new version of ${BRAND} is ready`;

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[72] flex justify-center px-4 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:top-auto lg:px-0 print:hidden">
      <div className="vio-nudge glass pointer-events-auto flex min-h-14 max-w-md items-center gap-3 rounded-full py-1.5 pl-2 pr-1.5">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-[image:var(--vio-cta)] text-white shadow-[0_8px_20px_-8px_rgb(124_77_255/0.8)]">
          <Sparkles className="size-[1.1rem]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold text-text sm:hidden">{stale && !live ? "Updated" : "Update ready"}</span>
          <span className="hidden text-[14px] font-semibold text-text sm:block">{title}</span>
          <span className="hidden text-[12px] text-text-3 sm:block">{stale && !live ? "Refresh to keep going." : "Refresh for the latest."}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            setBusy(true);
            void refreshToLatest();
          }}
          disabled={busy}
          aria-busy={busy || undefined}
          className="spring inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-[image:var(--vio-cta)] px-4 text-[14px] font-semibold text-white disabled:opacity-80"
        >
          <RefreshCw className={cn("size-4", busy && "animate-spin motion-reduce:animate-none")} aria-hidden />
          {busy ? "Refreshing…" : "Refresh"}
        </button>
        <button type="button" onClick={dismiss} aria-label="Later" className="spring grid size-11 shrink-0 place-items-center rounded-full text-text-3 hover:bg-text/10 hover:text-text">
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

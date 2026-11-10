/**
 * One connection state for the whole page (paruto-standards STANDARDS.md, Connection): whether
 * VioWealth's own server can be reached, not just whether the device has a network. The browser's
 * online/offline events are only a starting point ("online" fires behind captive Wi-Fi, installed
 * iPhone apps sometimes miss them), so while offline the page asks its own server (GET /__version,
 * no-store, a few bytes) every few seconds, backing off to 30 s, and counts as back only after two
 * answers in a row that carry Cloudflare's CF-Ray (any answer on localhost). It checks again when the
 * app comes back to the foreground; `reportFailedRequest()` marks it offline at once.
 */
export type Connection = "online" | "offline";

let state: Connection = "online";
let started = false;
let timer: number | undefined;
let delay = 3_000;
let good = 0;
const listeners = new Set<() => void>();

export const connection = () => state;

function set(next: Connection) {
  if (state === next) return;
  state = next;
  for (const l of listeners) l();
}

const local = () => /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

/** One probe: true when the answer really came from our server (not a captive portal or a cache). */
async function reachable(): Promise<boolean> {
  try {
    const res = await fetch(`/__version?probe=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(6_000) });
    return res.ok && (local() || res.headers.has("cf-ray"));
  } catch {
    return false;
  }
}

function schedule() {
  window.clearTimeout(timer);
  timer = window.setTimeout(probe, delay);
}

async function probe() {
  if (await reachable()) {
    good += 1;
    if (good >= 2) {
      good = 0;
      delay = 3_000;
      set("online");
      return;
    }
    // A second answer soon after the first, so "back" means back.
    timer = window.setTimeout(probe, 1_000);
    return;
  }
  good = 0;
  set("offline");
  delay = Math.min(delay * 2, 30_000);
  schedule();
}

function goOffline() {
  good = 0;
  delay = 3_000;
  set("offline");
  schedule();
}

/** A request that should have worked failed: offline at once, and start checking for the way back. */
export function reportFailedRequest() {
  if (typeof window !== "undefined") goOffline();
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  if (!navigator.onLine) goOffline();
  window.addEventListener("offline", goOffline);
  // The device says it's back: check with our own server before believing it.
  window.addEventListener("online", () => {
    good = 0;
    void probe();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    good = 0;
    void probe();
  });
}

export function subscribeConnection(listener: () => void) {
  start();
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

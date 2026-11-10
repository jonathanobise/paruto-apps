/**
 * Whether a newer version of VioWealth is live and waiting for a refresh, shared by the update pill
 * (src/components/pwa/update-nudge.tsx), which finds out, and the version capsule, which shows it.
 * `""` when the new build has no release number.
 */
let waiting: string | null = null;
const listeners = new Set<() => void>();

export const readWaiting = () => waiting;

export function subscribeWaiting(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function announceWaiting(release: string) {
  if (waiting === release) return;
  waiting = release;
  for (const l of listeners) l();
}

/** Opens the new version: gives the new service worker a moment to take over first. */
export async function refreshToLatest() {
  if ("serviceWorker" in navigator) await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(r, 1500))]).catch(() => {});
  location.reload();
}

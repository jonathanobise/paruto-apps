"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowRight, Bell, BellRing, CheckCheck, RefreshCw, Sparkles, X } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { CURRENT_RELEASE, compareVersions, isVersion, releaseAnchor, versionLabel } from "@/lib/updates/version";
import { NOTES } from "@/lib/updates/notes";
import { readWaiting, refreshToLatest, subscribeWaiting } from "@/lib/updates/waiting";
import { connection, subscribeConnection } from "@/lib/connection";
import { bellFeedAction, markAllReadAction, type BellItem } from "@/app/(app)/bell-actions";
import { ShippedAt } from "./shipped-at";
import { LogoMark } from "@/components/app/logo";

/**
 * The one bell (paruto-standards STANDARDS.md, Notification bell): the person's notifications and
 * VioWealth's updates together. Its badge adds the unread notifications to the updates shipped since
 * the person last looked (a mark kept on this device). Every bell on the page shares one copy; the
 * panel opens on the half with something new, notifications first.
 */
const SEEN_KEY = "vio-updates-seen";
const released = NOTES.filter((n) => isVersion(n.version) && (!CURRENT_RELEASE || compareVersions(n.version, CURRENT_RELEASE) <= 0)).sort((a, b) => compareVersions(b.version!, a.version!));

type Store = { unread: number; unseen: number; items: BellItem[] | null; open: boolean };
let store: Store = { unread: 0, unseen: 0, items: null, open: false };
let seeded = false;
let loadedAt = 0;
const listeners = new Set<() => void>();
const emit = (patch: Partial<Store>) => {
  store = { ...store, ...patch };
  for (const l of listeners) l();
};
const subscribe = (l: () => void) => (listeners.add(l), () => void listeners.delete(l));
const serverStore: Store = { unread: 0, unseen: 0, items: null, open: false };

function unseenCount() {
  let seen: string | null = null;
  try {
    seen = localStorage.getItem(SEEN_KEY);
  } catch {}
  return released.filter((n) => !isVersion(seen) || compareVersions(n.version!, seen) > 0).length;
}
function markSeen() {
  try {
    if (released[0]) localStorage.setItem(SEEN_KEY, released[0].version!);
  } catch {}
  emit({ unseen: 0 });
}
async function load(force = false) {
  if (!force && Date.now() - loadedAt < 60_000) return;
  if (connection() === "offline") return;
  loadedAt = Date.now();
  const feed = await bellFeedAction().catch(() => null);
  if (feed) emit({ items: feed.items, unread: feed.unread });
}

export function openBell() {
  emit({ open: true });
  void load(true);
}

/** A bell button (sidebar header, rail, phone header). `unread` is the server's count for first paint. */
export function BellButton({ unread, className }: { unread: number; className?: string }) {
  const s = useSyncExternalStore(subscribe, () => store, () => ({ ...serverStore, unread }));
  const total = s.unread + s.unseen;
  const [swing, setSwing] = useState(false);
  const last = useRef(total);

  useEffect(() => {
    if (seeded) return;
    seeded = true;
    emit({ unread, unseen: unseenCount() });
    const settle = window.setTimeout(() => void load(), 4_000);
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    const off = subscribeConnection(() => connection() === "online" && void load());
    return () => {
      window.clearTimeout(settle);
      document.removeEventListener("visibilitychange", onVisible);
      off();
      seeded = false;
    };
  }, [unread]);

  useEffect(() => {
    if (total > last.current) {
      setSwing(true);
      const t = window.setTimeout(() => setSwing(false), 900);
      last.current = total;
      return () => window.clearTimeout(t);
    }
    last.current = total;
  }, [total]);

  return (
    <button
      type="button"
      onClick={openBell}
      aria-haspopup="dialog"
      aria-label={total ? `Notifications and updates, ${total} new` : "Notifications and updates"}
      title="Notifications and What's New"
      className={cn("spring relative grid size-9 place-items-center rounded-full text-text-2 hover:bg-text/10 hover:text-text", className)}
    >
      <Bell className={cn("size-[18px]", swing && "vio-bell-swing")} aria-hidden />
      {total ? <span className="num absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-accent px-1 text-center text-[10px] font-semibold leading-4 text-brand-ink">{total > 99 ? "99+" : total}</span> : null}
    </button>
  );
}

type Half = "notifications" | "updates";

/** The panel, once per page: a sheet with a sliding Notifications / What's New control. */
export function BellSheet({ timezone }: { timezone: string }) {
  const s = useSyncExternalStore(subscribe, () => store, () => serverStore);
  const dialog = useRef<HTMLDialogElement>(null);
  const [half, setHalf] = useState<Half>("notifications");
  const chose = useRef(false);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (s.open && !d.open) {
      chose.current = false;
      setHalf(store.unread ? "notifications" : store.unseen ? "updates" : "notifications");
      d.showModal();
    }
    if (!s.open && d.open) d.close();
  }, [s.open]);

  // Notifications still on their way take the front once they arrive, unless a half was chosen.
  useEffect(() => {
    if (s.open && !chose.current && s.unread) setHalf("notifications");
  }, [s.open, s.unread]);

  useEffect(() => {
    if (s.open && half === "updates" && s.unseen) markSeen();
  }, [s.open, half, s.unseen]);

  const pick = useCallback((h: Half) => {
    chose.current = true;
    setHalf(h);
  }, []);

  return (
    <dialog ref={dialog} onClose={() => emit({ open: false })} onClick={(e) => e.target === e.currentTarget && emit({ open: false })} aria-label="Notifications and What's New" className="vio-sheet">
      {s.open ? (
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div role="tablist" aria-label="Show" className="vio-seg flex-1" style={{ "--n": 2, "--i": half === "notifications" ? 0 : 1 } as React.CSSProperties}>
              <span aria-hidden className="vio-seg-thumb" />
              {(["notifications", "updates"] as const).map((h) => {
                const n = h === "notifications" ? s.unread : s.unseen;
                return (
                  <button key={h} type="button" role="tab" aria-selected={half === h} onClick={() => pick(h)} data-no-ink className="!flex items-center justify-center gap-1.5 !px-3 text-[13px] font-semibold">
                    {h === "notifications" ? "Notifications" : "What's New"}
                    {n ? <span className="num rounded-full bg-accent px-1.5 text-[10px] leading-4 text-brand-ink">{n}</span> : null}
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={() => emit({ open: false })} aria-label="Close" className="spring grid size-9 shrink-0 place-items-center rounded-full text-text-3 hover:bg-text/10 hover:text-text">
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <div className="mt-5">{half === "notifications" ? <Notifications items={s.items} unread={s.unread} timezone={timezone} /> : <Updates />}</div>
        </div>
      ) : null}
    </dialog>
  );
}

function groupOf(d: Date, now: Date) {
  const day = 86_400_000;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (d.getTime() >= start) return "Today";
  if (d.getTime() >= start - 6 * day) return "This week";
  return "Earlier";
}

function Notifications({ items, unread, timezone }: { items: BellItem[] | null; unread: number; timezone: string }) {
  const [busy, setBusy] = useState(false);
  if (!items) {
    return (
      <div aria-busy="true" aria-label="Loading notifications" className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-[16px] bg-surface-2" />
        ))}
      </div>
    );
  }
  if (!items.length) {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-accent-soft text-accent">
          <BellRing className="size-6" aria-hidden />
        </span>
        <p className="mt-4 text-[16px] font-semibold">You&apos;re all caught up</p>
        <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-text-3">When an alert you set fires, a price moves past your line or a report is ready, it appears here.</p>
        <Link href="/alerts" onClick={() => emit({ open: false })} className="spring mt-5 inline-flex h-10 items-center gap-1.5 rounded-full border border-border px-4 text-[13px] font-medium hover:bg-text/5">
          Set up an alert <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    );
  }
  const now = new Date();
  const groups = new Map<string, BellItem[]>();
  for (const n of items) {
    const g = groupOf(new Date(n.createdAt), now);
    groups.set(g, [...(groups.get(g) ?? []), n]);
  }
  const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: timezone || undefined });
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[13px] text-text-3">{unread ? `${unread} unread` : "All read"}</p>
        {unread ? (
          <button
            type="button"
            disabled={busy}
            aria-busy={busy || undefined}
            onClick={async () => {
              setBusy(true);
              const r = await markAllReadAction().catch(() => null);
              if (r) emit({ unread: 0, items: (store.items ?? []).map((i) => ({ ...i, read: true })) });
              setBusy(false);
            }}
            className="spring inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-accent hover:bg-accent-soft"
          >
            <CheckCheck className="size-3.5" aria-hidden /> {busy ? "Marking…" : "Mark all read"}
          </button>
        ) : null}
      </div>
      {[...groups].map(([label, list]) => (
        <section key={label} className="mb-4">
          <h3 className="kicker mb-1.5 px-1">{label}</h3>
          <ul className="overflow-hidden rounded-[18px] border border-border bg-surface-2/50">
            {list.map((n) => {
              const body = (
                <>
                  <span aria-hidden className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                    <Bell className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium leading-snug text-text">{n.title}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-text-2">{n.body}</span>
                    <span className="mt-1 block text-[11px] text-text-3">{fmt.format(new Date(n.createdAt))}</span>
                  </span>
                  {!n.read ? <span className="mt-2 size-2 shrink-0 rounded-full bg-accent" role="img" aria-label="Unread" /> : null}
                </>
              );
              return (
                <li key={n.id} className="border-t border-border first:border-t-0">
                  {n.link ? (
                    <Link href={n.link} onClick={() => emit({ open: false })} className="flex gap-3 px-3.5 py-3 hover:bg-text/[0.03]">
                      {body}
                    </Link>
                  ) : (
                    <div className="flex gap-3 px-3.5 py-3">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <Link href="/notifications" onClick={() => emit({ open: false })} className="spring flex h-10 items-center justify-center gap-1.5 rounded-full text-[13px] font-medium text-text-2 hover:bg-text/5">
        All notifications <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </div>
  );
}

function Updates() {
  const waiting = useSyncExternalStore(subscribeWaiting, readWaiting, () => null);
  const online = useSyncExternalStore(subscribeConnection, () => connection() === "online", () => true);
  const [busy, setBusy] = useState(false);
  return (
    <div>
      {waiting !== null && online ? (
        <div className="flex items-center gap-3 rounded-[18px] bg-accent-soft p-3 pl-4">
          <Sparkles className="size-4 shrink-0 text-accent" aria-hidden />
          <p className="min-w-0 flex-1 text-[14px] font-medium">{isVersion(waiting) ? `${BRAND} ${versionLabel(waiting)} is ready` : `A new version of ${BRAND} is ready`}</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void refreshToLatest();
            }}
            className="spring inline-flex h-9 items-center gap-1.5 rounded-full bg-[image:var(--vio-cta)] px-4 text-[13px] font-semibold text-white"
          >
            <RefreshCw className={cn("size-3.5", busy && "animate-spin motion-reduce:animate-none")} aria-hidden /> Refresh
          </button>
        </div>
      ) : CURRENT_RELEASE ? (
        <div className="flex items-center gap-3 rounded-[18px] border border-border p-3">
          <LogoMark className="size-9" />
          <div className="min-w-0">
            <p className="text-[14px] font-semibold">
              You&apos;re on {BRAND} <span className="num">{versionLabel(CURRENT_RELEASE)}</span>
            </p>
            <p className="text-[12px] text-text-3">The newest version</p>
          </div>
        </div>
      ) : null}
      <ul className="mt-4 space-y-3">
        {released.slice(0, 3).map((n) => (
          <li key={n.id} className="rounded-[18px] border border-border bg-surface-2/40 p-4">
            <p className="num text-[12px] text-text-3">
              {BRAND} {versionLabel(n.version!)} · <ShippedAt at={n.at} />
            </p>
            <p className="mt-1 text-[15px] font-semibold tracking-[-0.015em]">{n.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-text-2">{n.summary}</p>
            <Link href={`/whats-new#${releaseAnchor(n.version!)}`} onClick={() => emit({ open: false })} className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">
              Read more <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </li>
        ))}
        {!released.length ? <li className="py-6 text-center text-[13px] text-text-3">Updates appear here as each version of {BRAND} ships.</li> : null}
      </ul>
      <Link href="/whats-new" onClick={() => emit({ open: false })} className="spring mt-4 flex h-10 items-center justify-center gap-1.5 rounded-full text-[13px] font-medium text-text-2 hover:bg-text/5">
        Every release <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </div>
  );
}

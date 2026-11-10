"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LogOut, PanelLeftClose, PanelLeftOpen, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import { SIDEBAR_KEY, type Depth, type ThemeChoice } from "@/lib/appearance";
import { Logo, LogoMark } from "./logo";
import { ConnectionLight } from "@/components/pwa/connection";
import { BellButton } from "@/components/updates/bell";
import { VersionCapsule } from "@/components/updates/version-capsule";
import { AppearanceControl, AppearanceCycle } from "./appearance";

/** Whether the sidebar is the full panel or the icon rail, remembered on this device. */
const railListeners = new Set<() => void>();
const isRail = () => document.documentElement.getAttribute("data-sidebar") === "rail";
function setRail(rail: boolean) {
  if (rail) document.documentElement.setAttribute("data-sidebar", "rail");
  else document.documentElement.removeAttribute("data-sidebar");
  try {
    localStorage.setItem(SIDEBAR_KEY, rail ? "rail" : "full");
  } catch {}
  for (const l of railListeners) l();
}
const subscribeRail = (l: () => void) => (railListeners.add(l), () => void railListeners.delete(l));

/**
 * The floating glass sidebar (paruto-standards STANDARDS.md, Sidebar): collapsible to an icon rail
 * from its header toggle or ⌃⌘S (Ctrl+\ elsewhere). In the rail it peeks: after ~140 ms of hover the
 * full sidebar slides out over the page (the page never moves) and tucks back ~250 ms after the
 * pointer leaves; keyboard focus opens it too, Escape closes it, touch never peeks, and while it
 * peeks the toggle reads "Keep sidebar open". Labels stay for screen readers and show as tooltips.
 */
export function Sidebar({
  nav,
  unread,
  user,
  appearance,
  signOut,
  disclosure,
}: {
  nav: React.ReactNode;
  unread: number;
  user: { name: string; email: string };
  appearance: { theme: ThemeChoice; depth: Depth };
  signOut: (form: FormData) => Promise<void>;
  disclosure: string;
}) {
  const rail = useSyncExternalStore(subscribeRail, isRail, () => false);
  const [peek, setPeek] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const aside = useRef<HTMLElement>(null);

  const later = useCallback((open: boolean, ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPeek(open), ms);
  }, []);

  useEffect(() => {
    const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    const onKey = (e: KeyboardEvent) => {
      const hit = mac ? e.ctrlKey && e.metaKey && e.key.toLowerCase() === "s" : e.ctrlKey && !e.metaKey && e.key === "\\";
      if (hit) {
        e.preventDefault();
        setPeek(false);
        setRail(!isRail());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const peeking = rail && peek;
  const toggle = () => {
    window.clearTimeout(timer.current);
    if (peeking) {
      // "Keep sidebar open": pin it as the full sidebar.
      setPeek(false);
      setRail(false);
    } else {
      setPeek(false);
      setRail(!rail);
    }
  };
  const initial = user.name.trim().charAt(0).toUpperCase() || "?";
  const iconBtn = "spring grid size-9 place-items-center rounded-full text-text-2 hover:bg-text/10 hover:text-text";

  return (
    <aside
      ref={aside}
      aria-label="Sidebar"
      data-peek={peeking ? "" : undefined}
      onPointerEnter={(e) => rail && e.pointerType !== "touch" && later(true, 140)}
      onPointerLeave={(e) => rail && e.pointerType !== "touch" && later(false, 250)}
      // Keyboard focus opens it (a mouse press doesn't: the rail's own buttons must take the click).
      onFocus={(e) => rail && (e.target as Element).matches(":focus-visible") && (window.clearTimeout(timer.current), setPeek(true))}
      onBlur={(e) => rail && !aside.current?.contains(e.relatedTarget as Node | null) && later(false, 0)}
      onKeyDown={(e) => {
        if (e.key === "Escape" && peeking) {
          setPeek(false);
          (document.activeElement as HTMLElement | null)?.blur();
        }
      }}
      className="vio-sidebar glass sticky top-3 m-3 mr-0 hidden h-[calc(100dvh-24px)] flex-col gap-4 overflow-hidden rounded-[28px] pb-3 pt-4 lg:flex print:hidden"
    >
      {/* Header: the logo with its connection light, the bell, the collapse toggle. */}
      <div className="vio-full flex items-center gap-1 pl-5 pr-3">
        <Link href="/dashboard" className="spring flex min-w-0 items-center gap-2" aria-label={`${BRAND} home`}>
          <Logo />
        </Link>
        <ConnectionLight className="ml-1.5" />
        <span className="flex-1" />
        <BellButton unread={unread} />
        <button type="button" onClick={toggle} className={iconBtn} aria-label={peeking ? "Keep sidebar open" : "Collapse sidebar"} title={peeking ? "Keep sidebar open" : "Collapse sidebar (⌃⌘S)"}>
          {peeking ? <Pin className="size-4" aria-hidden /> : <PanelLeftClose className="size-[18px]" aria-hidden />}
        </button>
      </div>
      <div className="vio-rail flex-col items-center gap-1.5 px-3">
        <Link href="/dashboard" className="spring relative" aria-label={`${BRAND} home`}>
          <LogoMark className="size-9" />
          <ConnectionLight className="absolute -bottom-0.5 -right-0.5 ring-2 ring-[var(--surface)]" />
        </Link>
        <BellButton unread={unread} className="mt-2" />
        <button type="button" onClick={toggle} className={iconBtn} aria-label="Expand sidebar" title="Expand sidebar (⌃⌘S)">
          <PanelLeftOpen className="size-[18px]" aria-hidden />
        </button>
      </div>

      {/* Only the navigation scrolls; the header and foot stay put (and the glass rim stays on the edge). */}
      <div className="vio-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-2">
        {nav}
        <p className="vio-full mt-5 px-3 text-[11px] leading-relaxed text-text-3">{disclosure}</p>
      </div>

      {/* Foot: appearance, the person, sign out, the version. */}
      <div className="flex flex-col gap-2.5 border-t border-border px-3 pt-3">
        <AppearanceControl initial={appearance} className="vio-full px-1" />
        <div className="vio-rail flex-col items-center gap-1">
          <AppearanceCycle initial={appearance} />
        </div>
        <Link href="/settings" className="spring flex items-center gap-3 rounded-full p-1 pr-3 hover:bg-text/5" title={`${user.name} · Settings`}>
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-[14px] font-semibold text-accent">
            {initial}
          </span>
          <span className="vio-full min-w-0 flex-col">
            <span className="block truncate text-[14px] font-medium text-text">{user.name}</span>
            <span className="block truncate text-[11.5px] text-text-3">{user.email}</span>
          </span>
          <span className="sr-only">Settings</span>
        </Link>
        <form action={signOut}>
          <button className="spring flex w-full items-center gap-3 rounded-full px-3 py-2 text-[13.5px] font-medium text-text-2 hover:bg-text/5 hover:text-text" title="Sign out">
            <LogOut className="size-4 text-text-3" aria-hidden />
            <span className="vio-full">Sign out</span>
            <span className="sr-only vio-rail">Sign out</span>
          </button>
        </form>
        <div className="vio-full px-1">
          <VersionCapsule />
        </div>
        <div className="vio-rail justify-center">
          <VersionCapsule compact />
        </div>
      </div>
    </aside>
  );
}

/** The phone menu's foot: the same appearance, account and version, in the menu sheet. */
export function MenuFoot({ user, appearance, signOut }: { user: { name: string }; appearance: { theme: ThemeChoice; depth: Depth }; signOut: (form: FormData) => Promise<void> }) {
  return (
    <div className={cn("mt-4 flex flex-col gap-3 border-t border-border pt-4")}>
      <AppearanceControl initial={appearance} />
      <div className="flex items-center justify-between gap-2">
        <Link href="/settings" className="flex min-w-0 items-center gap-2.5 rounded-full p-1 pr-3 hover:bg-text/5">
          <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent">
            {user.name.trim().charAt(0).toUpperCase() || "?"}
          </span>
          <span className="truncate text-[14px] font-medium">{user.name}</span>
        </Link>
        <form action={signOut}>
          <button className="spring flex items-center gap-2 rounded-full px-3 py-2 text-[13.5px] font-medium text-text-2 hover:bg-text/5">
            <LogOut className="size-4 text-text-3" aria-hidden /> Sign out
          </button>
        </form>
      </div>
      <VersionCapsule className="self-start" />
    </div>
  );
}

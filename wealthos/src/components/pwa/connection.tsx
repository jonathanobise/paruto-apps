"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { connection, subscribeConnection } from "@/lib/connection";

const useOnline = () => useSyncExternalStore(subscribeConnection, () => connection() === "online", () => true);

/**
 * The connection light (paruto-standards STANDARDS.md, Connection): beside the logo in the sidebar
 * and the phone header. A soft green glow while VioWealth's server can be reached (still under
 * Reduce Motion); offline, an orange badge with a no-Wi-Fi glyph, a change of shape as well as
 * colour. Passive status: named for screen readers and in its tooltip, never an alert.
 */
export function ConnectionLight({ className }: { className?: string }) {
  const online = useOnline();
  const label = online ? "Online" : "Offline";
  return (
    <span role="img" aria-label={label} title={label} className={cn("vio-conn", online ? "vio-conn-on" : "vio-conn-off", className)}>
      {online ? null : <WifiOff className="size-2.5" strokeWidth={2.75} aria-hidden />}
    </span>
  );
}

/**
 * One per page: a polite live region ("You're offline…", "Back online"), and the way back. When the
 * connection returns, the page refetches its data, or opens the page someone tapped while offline.
 */
export function ConnectionStatus() {
  const online = useOnline();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const pending = useRef<string | null>(null);
  const was = useRef(true);

  useEffect(() => {
    if (online === was.current) return;
    was.current = online;
    if (!online) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- announcing a change of connection
      setMessage("You're offline. What's on screen stays here; new figures need a connection.");
      return;
    }
    setMessage("Back online.");
    const next = pending.current;
    pending.current = null;
    if (next) router.push(next);
    else router.refresh();
  }, [online, router]);

  // While offline, a tap on one of VioWealth's own links waits for the connection instead of failing.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (connection() === "online" || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target || a.origin !== location.origin || a.hasAttribute("download")) return;
      e.preventDefault();
      pending.current = a.pathname + a.search + a.hash;
      setMessage("You're offline. That page will open when you're back online.");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return (
    <p role="status" aria-live="polite" className="sr-only">
      {message}
    </p>
  );
}

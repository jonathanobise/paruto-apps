"use client";
import { useEffect } from "react";
import { BUILD } from "@/lib/updates/version";

/** Registers the privacy-first service worker (offline page only) in production builds, per build. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(`/sw.js?v=${BUILD}`, { scope: "/", updateViaCache: "none" }).catch(() => undefined);
  }, []);
  return null;
}

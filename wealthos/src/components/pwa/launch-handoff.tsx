"use client";
import { useEffect } from "react";
import { LAUNCH_HOLD_MS } from "./launch-screen";

/** Fades the launch screen once the app has started and the hold has passed; a tap skips it. */
export function LaunchHandoff() {
  useEffect(() => {
    const root = document.documentElement;
    if (root.getAttribute("data-launch") !== "show") return;
    const done = () => root.setAttribute("data-launched", "");
    const screen = document.getElementById("vio-launch");
    screen?.addEventListener("pointerdown", done, { once: true });
    // From when the page began (the launch screen painted with it), not from when this ran.
    const timer = window.setTimeout(done, Math.max(0, LAUNCH_HOLD_MS - performance.now()));
    return () => {
      window.clearTimeout(timer);
      screen?.removeEventListener("pointerdown", done);
    };
  }, []);
  return null;
}

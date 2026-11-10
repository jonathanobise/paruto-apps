/**
 * Appearance (paruto-standards STANDARDS.md, Themes; ADR-027): Light / Dark / System, and how dark
 * Dark gets. Dark is the default for everyone; System follows the device only when someone chooses
 * it. Kept in cookies (so the server paints the right theme, no flash) and saved to the person's
 * preferences. Every depth swaps only a few base tokens (globals.css), so contrast holds everywhere.
 */
export const THEME_COOKIE = "wos_theme";
export const DEPTH_COOKIE = "wos_depth";
export const SIDEBAR_KEY = "vio-sidebar";

export type ThemeChoice = "light" | "dark" | "system";
export const THEMES: ThemeChoice[] = ["light", "dark", "system"];
export const isTheme = (v: unknown): v is ThemeChoice => v === "light" || v === "dark" || v === "system";

export type Depth = "night" | "graphite" | "midnight" | "oled";
/** `bg`/`surface`/`bar`: the swatch's base, panel and the line drawn in it. */
export const DEPTHS: { value: Depth; label: string; bg: string; surface: string }[] = [
  { value: "night", label: "Night", bg: "#060608", surface: "#16161b" },
  { value: "graphite", label: "Graphite", bg: "#18181d", surface: "#2a2a31" },
  { value: "midnight", label: "Midnight", bg: "#07061a", surface: "#17153a" },
  { value: "oled", label: "OLED", bg: "#000000", surface: "#121214" },
];
export const isDepth = (v: unknown): v is Depth => DEPTHS.some((d) => d.value === v);

/** The browser-bar colour for each base. */
export const themeColor = (theme: "light" | "dark", depth: Depth) => (theme === "light" ? "#f5f5f7" : DEPTHS.find((d) => d.value === depth)!.bg);

/**
 * Before first paint: System follows the device (and keeps following it); the sidebar's rail choice
 * is read from this device. Inline in <head>, with the page's CSP nonce.
 */
export const APPEARANCE_SCRIPT = `(function(){try{var d=document.documentElement,m=matchMedia("(prefers-color-scheme: light)"),f=function(){if(d.getAttribute("data-theme-pref")==="system")d.setAttribute("data-theme",m.matches?"light":"dark")};f();m.addEventListener("change",f);if(localStorage.getItem("${SIDEBAR_KEY}")==="rail")d.setAttribute("data-sidebar","rail")}catch(e){}})();`;

/** Apply a choice now, in the page (the cookies carry it to the next page and the server). */
export function applyAppearance(theme: ThemeChoice, depth: Depth) {
  const d = document.documentElement;
  const resolved = theme === "system" ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : theme;
  d.setAttribute("data-theme-pref", theme);
  d.setAttribute("data-theme", resolved);
  d.setAttribute("data-depth", depth);
  const year = 60 * 60 * 24 * 365;
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${year}; samesite=lax`;
  document.cookie = `${DEPTH_COOKIE}=${depth}; path=/; max-age=${year}; samesite=lax`;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor(resolved, depth));
}

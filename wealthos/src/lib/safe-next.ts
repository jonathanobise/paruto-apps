/** A post-sign-in destination: same-site relative paths only (no open redirects). */
export function safeNext(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string" || value.length > 300) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\") || /[\r\n]/.test(value)) return fallback;
  try {
    const u = new URL(value, "https://wealthos.invalid");
    if (u.origin !== "https://wealthos.invalid") return fallback;
    return `${u.pathname}${u.search}`;
  } catch {
    return fallback;
  }
}

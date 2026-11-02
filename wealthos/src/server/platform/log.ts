/**
 * Structured JSON logs (one line per event) for the platform's log collector. Never log secrets,
 * tokens, passwords, financial amounts or free text a user typed.
 */
type Level = "debug" | "info" | "warn" | "error";
const REDACT = /(password|token|secret|authorization|cookie|key)$/i;

export function log(level: Level, event: string, fields: Record<string, unknown> = {}): void {
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) safe[k] = REDACT.test(k) ? "[redacted]" : v instanceof Error ? { name: v.name, message: v.message.slice(0, 500), stack: v.stack?.split("\n").slice(0, 6).join("\n") } : v;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, service: "wealthos", env: process.env.APP_ENV ?? process.env.NODE_ENV, ...safe });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

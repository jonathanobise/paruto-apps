/**
 * Presentation formatting. Values arrive as exact decimal strings from the engine; Intl
 * formats decimal strings without converting them to binary floating point.
 */
const SYMBOLS: Record<string, string> = { NGN: "₦", USD: "$", GBP: "£", EUR: "€" };

export function formatMoney(value: string | null | undefined, currency: string, opts: { compact?: boolean; signed?: boolean; decimals?: number } = {}): string {
  if (value === null || value === undefined) return "—";
  const decimals = opts.decimals ?? 2;
  const fmt = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: opts.compact ? 0 : decimals,
    maximumFractionDigits: opts.compact ? 1 : decimals,
    notation: opts.compact ? "compact" : "standard",
    signDisplay: opts.signed ? "exceptZero" : "auto",
  });
  return fmt.format(value as unknown as number).replace("NGN", "₦");
}

export function formatNumber(value: string | null | undefined, maxDecimals = 4): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-NG", { maximumFractionDigits: maxDecimals }).format(value as unknown as number);
}

export function formatPercent(value: string | number | null | undefined, opts: { signed?: boolean; decimals?: number } = {}): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-NG", { style: "percent", minimumFractionDigits: opts.decimals ?? 1, maximumFractionDigits: opts.decimals ?? 1, signDisplay: opts.signed ? "exceptZero" : "auto" }).format(Number(value));
}

export function formatDate(iso: string | null | undefined, style: "medium" | "short" = "medium"): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: style === "medium" ? "numeric" : "2-digit", timeZone: "UTC" }).format(d);
}

export function sign(value: string | null | undefined): -1 | 0 | 1 {
  if (!value) return 0;
  const n = Number(value);
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}

export function currencySymbol(code: string): string {
  return SYMBOLS[code] ?? code;
}

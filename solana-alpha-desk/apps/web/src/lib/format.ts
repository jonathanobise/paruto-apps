export const micro = (v: string | number | null | undefined): number | null =>
  v === null || v === undefined || v === '' ? null : Number(v) / 1e6;

export function usd(
  v: number | string | null | undefined,
  opts: { sign?: boolean; compact?: boolean; dp?: number } = {},
): string {
  if (v === null || v === undefined || v === '' || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  const abs = Math.abs(n);
  const s =
    opts.compact && abs >= 1000
      ? new Intl.NumberFormat('en-US', {
          notation: 'compact',
          maximumFractionDigits: abs >= 1e6 ? 2 : 1,
        }).format(abs)
      : abs.toLocaleString('en-US', {
          minimumFractionDigits: opts.dp ?? 2,
          maximumFractionDigits: opts.dp ?? 2,
        });
  const sign = n < 0 ? '−' : opts.sign && n > 0 ? '+' : '';
  return `${sign}$${s}`;
}

export function pct(
  v: number | string | null | undefined,
  opts: { sign?: boolean; dp?: number } = {},
): string {
  if (v === null || v === undefined || v === '' || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  const sign = n < 0 ? '−' : opts.sign && n > 0 ? '+' : '';
  return `${sign}${Math.abs(n).toFixed(opts.dp ?? 2)}%`;
}

export function price(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  if (n === 0) return '$0';
  if (n < 0.0001) return `$${n.toExponential(3)}`;
  if (n < 1) return `$${n.toPrecision(4)}`;
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 4 })}`;
}

export function num(v: number | string | null | undefined, dp = 0): string {
  if (v === null || v === undefined || v === '') return '—';
  return Number(v).toLocaleString('en-US', { maximumFractionDigits: dp, minimumFractionDigits: dp });
}

export function shortAddr(a: string | null | undefined, n = 4): string {
  if (!a) return '—';
  return a.length <= n * 2 + 1 ? a : `${a.slice(0, n)}…${a.slice(-n)}`;
}

export function ago(ms: number | null | undefined, now = Date.now()): string {
  if (!ms) return '—';
  const s = Math.round((now - ms) / 1000);
  if (s < 0) return 'in ' + ago(now - (ms - now), now);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function age(fromMs: number | null | undefined, now = Date.now()): string {
  if (!fromMs) return '—';
  const m = Math.floor((now - fromMs) / 60000);
  if (m < 60) return `${m}m`;
  if (m < 1440) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`;
}

export function dt(ms: number | null | undefined): string {
  if (!ms) return '—';
  return new Date(ms).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
}

export const tone = (n: number | null | undefined) =>
  n === null || n === undefined || n === 0 ? 'text-fg-2' : n > 0 ? 'text-up' : 'text-down';

export function parseJson<T>(s: unknown, fallback: T): T {
  if (typeof s !== 'string') return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export const SOLSCAN = (a: string, kind: 'token' | 'account' | 'tx' = 'token') =>
  `https://solscan.io/${kind}/${a}`;
export const DEXSCREENER = (pair: string) => `https://dexscreener.com/solana/${pair}`;

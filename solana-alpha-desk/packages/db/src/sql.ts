/** Helpers for the decimal-integer TEXT columns. */
export const big = (v: unknown): bigint => (v === null || v === undefined || v === '' ? 0n : BigInt(String(v)));
export const bigOrNull = (v: unknown): bigint | null => (v === null || v === undefined || v === '' ? null : BigInt(String(v)));
export const json = <T>(v: unknown, fallback: T): T => {
  if (typeof v !== 'string' || v === '') return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
};

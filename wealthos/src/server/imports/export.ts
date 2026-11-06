/**
 * CSV cell encoding for exports. Every cell is quoted; text that a spreadsheet would execute as a
 * formula (=, +, -, @, tab, CR at the start, unless it is a plain number) gets a leading apostrophe.
 */
export function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  const safe = /^[=+\-@\t\r]/.test(s) && !/^[-+]?\d+(\.\d+)?$/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Time-sortable unique id: 12 hex chars of milliseconds + 20 random hex chars. */
export function newId(prefix: string, now: number = Date.now()): string {
  const time = now.toString(16).padStart(12, '0');
  const rand = new Uint8Array(10);
  crypto.getRandomValues(rand);
  return `${prefix}_${time}${[...rand].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

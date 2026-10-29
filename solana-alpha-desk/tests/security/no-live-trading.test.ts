import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RUNTIME_MODES } from '@alpha-desk/shared';

const ROOT = new URL('../..', import.meta.url).pathname;
function files(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    if (['node_modules', '.next', 'out', 'dist', '.wrangler', 'data', 'tests'].includes(f)) continue;
    const p = join(dir, f);
    if (statSync(p).isDirectory()) files(p, out);
    else if (/\.(ts|tsx|js|mjs)$/.test(f)) out.push(p);
  }
  return out;
}

describe('no live trading path exists (release 1.0)', () => {
  const src = [
    ...files(join(ROOT, 'apps')),
    ...files(join(ROOT, 'packages')),
    ...files(join(ROOT, 'workers')),
  ];
  it('scans a meaningful amount of source', () => expect(src.length).toBeGreaterThan(40));
  it('never signs, sends or broadcasts a transaction, and never handles key material', () => {
    const forbidden = [
      /sendTransaction/,
      /sendRawTransaction/,
      /signTransaction/,
      /signAllTransactions/,
      /Keypair\b/,
      /secretKey/,
      /fromSecretKey/,
      /\/swap['"`]/,
      /swap-instructions/,
      /privateKey/i,
      /@solana\/web3\.js/,
      /@solana\/kit/,
    ];
    const hits = src.flatMap((f) =>
      forbidden.filter((re) => re.test(readFileSync(f, 'utf8'))).map((re) => `${f}: ${re}`),
    );
    expect(hits).toEqual([]);
  });
  it('has no live runtime mode', () => {
    expect(RUNTIME_MODES.some((m) => /LIVE|REAL/.test(m))).toBe(false);
  });
});

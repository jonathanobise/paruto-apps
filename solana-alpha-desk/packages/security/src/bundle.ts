import type { ParsedTx } from '@alpha-desk/providers';
import { Decimal } from '@alpha-desk/shared';

export interface LaunchBuy {
  signature: string;
  slot: number;
  timestamp: number;
  buyer: string;
  feePayer: string;
  /** Token amount received, in UI units as reported by the indexer. */
  uiAmount: Decimal;
}

export interface BundleAnalysis {
  status: 'PASS' | 'FAIL' | 'UNVERIFIED';
  windowSeconds: number;
  launchBuys: number;
  coordinatedGroups: Array<{
    key: string;
    wallets: string[];
    pct: string;
    signatures: string[];
    basis: string;
  }>;
  bundledPct: string | null;
  notes: string[];
}

export function launchBuysFrom(
  txs: ParsedTx[],
  mint: string,
  poolCreatedAt: number,
  windowSeconds: number,
): LaunchBuy[] {
  const end = poolCreatedAt + windowSeconds * 1000;
  const buys: LaunchBuy[] = [];
  for (const tx of txs) {
    if (tx.failed || tx.timestamp < poolCreatedAt || tx.timestamp > end) continue;
    if (tx.type !== 'SWAP') continue;
    for (const t of tx.tokenTransfers) {
      if (t.mint === mint && t.to) {
        buys.push({
          signature: tx.signature,
          slot: tx.slot,
          timestamp: tx.timestamp,
          buyer: t.to,
          feePayer: tx.feePayer,
          uiAmount: new Decimal(t.uiAmount),
        });
      }
    }
  }
  return buys;
}

/**
 * Launch-bundle detection. Early buying alone is not bundling: buys count as coordinated only when
 * distinct wallets that bought in the launch window are *linked* — the same fee payer signed buys for
 * different recipients, or the buyers share a funding wallet (from the indexer's funding trace).
 */
export function analyseBundle(input: {
  buys: LaunchBuy[] | null;
  totalSupplyUi: Decimal;
  funders: Map<string, string> | null; // buyer → first funder
  fundersComplete: boolean;
  windowSeconds: number;
  maxBundledPct: number;
}): BundleAnalysis {
  const notes: string[] = [];
  if (!input.buys) {
    return {
      status: 'UNVERIFIED',
      windowSeconds: input.windowSeconds,
      launchBuys: 0,
      coordinatedGroups: [],
      bundledPct: null,
      notes: ['launch transactions unavailable (indexer required)'],
    };
  }
  // union-find over buyers
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    if (!parent.has(x)) parent.set(x, x);
    const p = parent.get(x)!;
    if (p === x) return x;
    const r = find(p);
    parent.set(x, r);
    return r;
  };
  const union = (a: string, b: string) => parent.set(find(a), find(b));
  const basis = new Map<string, Set<string>>();
  const note = (w: string, why: string) => {
    if (!basis.has(w)) basis.set(w, new Set());
    basis.get(w)!.add(why);
  };

  for (const b of input.buys) find(b.buyer);
  const byPayer = groupBy(input.buys, (b) => b.feePayer);
  for (const [payer, list] of byPayer) {
    const wallets = [...new Set(list.map((b) => b.buyer))];
    if (wallets.length < 2) continue;
    for (const w of wallets) {
      union(w, wallets[0]!);
      note(w, `same fee payer ${payer.slice(0, 6)}…`);
    }
  }
  if (input.funders) {
    const byFunder = groupBy(
      input.buys.filter((b) => input.funders!.has(b.buyer)),
      (b) => input.funders!.get(b.buyer)!,
    );
    for (const [funder, list] of byFunder) {
      const wallets = [...new Set(list.map((b) => b.buyer))];
      if (wallets.length < 2) continue;
      for (const w of wallets) {
        union(w, wallets[0]!);
        note(w, `shared funder ${funder.slice(0, 6)}…`);
      }
    }
  }

  const groups = groupBy(input.buys, (b) => find(b.buyer));
  const coordinated: BundleAnalysis['coordinatedGroups'] = [];
  let bundled = new Decimal(0);
  for (const [key, list] of groups) {
    const wallets = [...new Set(list.map((b) => b.buyer))];
    if (wallets.length < 2) continue;
    const amount = list.reduce((s, b) => s.add(b.uiAmount), new Decimal(0));
    bundled = bundled.add(amount);
    coordinated.push({
      key,
      wallets,
      pct: input.totalSupplyUi.gt(0) ? amount.div(input.totalSupplyUi).mul(100).toFixed(4) : '0',
      signatures: [...new Set(list.map((b) => b.signature))],
      basis: [...new Set(wallets.flatMap((w) => [...(basis.get(w) ?? [])]))].join('; '),
    });
  }
  const pct = input.totalSupplyUi.gt(0) ? bundled.div(input.totalSupplyUi).mul(100) : null;
  const allBuysPct = input.totalSupplyUi.gt(0)
    ? input.buys
        .reduce((sum, b) => sum.add(b.uiAmount), new Decimal(0))
        .div(input.totalSupplyUi)
        .mul(100)
    : null;
  let status: BundleAnalysis['status'];
  if (pct && pct.gt(input.maxBundledPct)) status = 'FAIL';
  else if (pct && input.funders && input.fundersComplete) status = 'PASS';
  else if (allBuysPct && allBuysPct.lte(input.maxBundledPct)) {
    // Coordinated buying cannot exceed all launch buying together, so the limit holds whatever the links.
    status = 'PASS';
    notes.push(`all launch buys together are ${allBuysPct.toFixed(4)}% of supply`);
  } else {
    status = 'UNVERIFIED';
    notes.push('funding links of launch buyers not fully traced');
  }
  return {
    status,
    windowSeconds: input.windowSeconds,
    launchBuys: input.buys.length,
    coordinatedGroups: coordinated,
    bundledPct: pct?.toFixed(4) ?? null,
    notes,
  };
}

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const i of items) {
    const k = key(i);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(i);
  }
  return m;
}

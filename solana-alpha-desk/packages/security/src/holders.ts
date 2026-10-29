import { Decimal } from '@alpha-desk/shared';
import { BURN_ADDRESSES, DEX_AUTHORITIES, DEX_PROGRAMS, PROTOCOL_PROGRAMS } from './pools.ts';
import { PROGRAMS } from '@alpha-desk/config';

export type HolderClass =
  | 'INDIVIDUAL'
  | 'DEVELOPER'
  | 'LP_VAULT'
  | 'DEX_VAULT'
  | 'BURN'
  | 'PROTOCOL'
  | 'ESCROW_OR_PROGRAM'
  | 'UNKNOWN';

export interface TokenAccountHolding {
  tokenAccount: string;
  /** Token-account authority (the wallet or PDA that controls it). */
  owner: string | null;
  amount: bigint;
}

export interface OwnerInfo {
  address: string;
  exists: boolean;
  /** Program that owns the authority account (System Program for ordinary wallets). */
  programOwner: string | null;
  executable: boolean;
}

export interface ClassifiedHolding extends TokenAccountHolding {
  class: HolderClass;
  label: string | null;
  clusterId: string | null;
}

export interface HolderAnalysis {
  status: 'PASS' | 'FAIL' | 'UNVERIFIED';
  totalSupply: string;
  excludedSupply: string;
  circulatingSupply: string;
  /** Top-10 individual owners (grouped by authority) ÷ circulating supply. Clustering can only raise it. */
  top10PctLowerBound: string | null;
  /** Upper estimate: unknown and program accounts are counted as if they were holders. */
  top10PctUpperBound: string | null;
  /** Concentration over beneficial-owner clusters, available only with an indexer. */
  top10PctClustered: string | null;
  clusteringVerified: boolean;
  holdings: ClassifiedHolding[];
  notes: string[];
}

/**
 * Classifies the largest token accounts by who controls them and measures concentration defensibly:
 * pool vaults, burn addresses and protocol accounts are excluded from circulating supply; raw accounts
 * are grouped by authority before ranking. Without a clustering source this yields a *lower bound*:
 * enough to FAIL a token, never enough to PASS one when clustering is required.
 */
export function analyseHolders(input: {
  totalSupply: bigint;
  holdings: TokenAccountHolding[];
  owners: Map<string, OwnerInfo>;
  poolVaults: Set<string>;
  poolAddresses: Set<string>;
  developerWallets: Set<string>;
  clusters?: Map<string, string> | null; // wallet → cluster id, from an indexer
  maxTop10Pct: number;
  requireClustering: boolean;
}): HolderAnalysis {
  const notes: string[] = [];
  const holdings: ClassifiedHolding[] = input.holdings.map((h) => {
    const o = h.owner ? input.owners.get(h.owner) : undefined;
    let cls: HolderClass = 'UNKNOWN';
    let label: string | null = null;
    if (input.poolVaults.has(h.tokenAccount)) {
      cls = 'LP_VAULT';
      label = 'pool vault';
    } else if (h.owner && BURN_ADDRESSES.has(h.owner)) {
      cls = 'BURN';
      label = 'burn address';
    } else if (h.owner && input.poolAddresses.has(h.owner)) {
      cls = 'DEX_VAULT';
      label = 'pool-owned account';
    } else if (h.owner && DEX_AUTHORITIES[h.owner]) {
      cls = 'DEX_VAULT';
      label = DEX_AUTHORITIES[h.owner]!;
    } else if (o?.programOwner && DEX_PROGRAMS[o.programOwner]) {
      cls = 'DEX_VAULT';
      label = DEX_PROGRAMS[o.programOwner]!;
    } else if (o?.programOwner && PROTOCOL_PROGRAMS[o.programOwner]) {
      cls = 'PROTOCOL';
      label = PROTOCOL_PROGRAMS[o.programOwner]!;
    } else if (h.owner && input.developerWallets.has(h.owner)) {
      cls = 'DEVELOPER';
      label = 'developer-linked';
    } else if (o?.exists && o.programOwner === PROGRAMS.system && !o.executable) {
      cls = 'INDIVIDUAL';
    } else if (o?.exists && o.programOwner) {
      cls = 'ESCROW_OR_PROGRAM';
      label = `program ${o.programOwner.slice(0, 6)}…`;
    }
    return { ...h, class: cls, label, clusterId: (h.owner && input.clusters?.get(h.owner)) ?? null };
  });

  const excluded = holdings
    .filter((h) => ['LP_VAULT', 'DEX_VAULT', 'BURN', 'PROTOCOL'].includes(h.class))
    .reduce((s, h) => s + h.amount, 0n);
  const circulating = input.totalSupply - excluded;
  const base = {
    totalSupply: input.totalSupply.toString(),
    excludedSupply: excluded.toString(),
    circulatingSupply: circulating.toString(),
    holdings,
  };
  if (circulating <= 0n) {
    return {
      status: 'UNVERIFIED',
      ...base,
      top10PctLowerBound: null,
      top10PctUpperBound: null,
      top10PctClustered: null,
      clusteringVerified: false,
      notes: ['no circulating supply outside pools'],
    };
  }

  const pctOfTop10 = (groups: Map<string, bigint>) => {
    const top = [...groups.values()].sort((a, b) => (b > a ? 1 : b < a ? -1 : 0)).slice(0, 10);
    return new Decimal(top.reduce((s, v) => s + v, 0n).toString()).div(circulating.toString()).mul(100);
  };
  const group = (filter: (h: ClassifiedHolding) => boolean, key: (h: ClassifiedHolding) => string) => {
    const m = new Map<string, bigint>();
    for (const h of holdings.filter(filter)) m.set(key(h), (m.get(key(h)) ?? 0n) + h.amount);
    return m;
  };

  const lower = pctOfTop10(
    group(
      (h) => h.class === 'INDIVIDUAL' || h.class === 'DEVELOPER',
      (h) => h.owner ?? h.tokenAccount,
    ),
  );
  const upper = pctOfTop10(
    group(
      (h) => ['INDIVIDUAL', 'DEVELOPER', 'UNKNOWN', 'ESCROW_OR_PROGRAM'].includes(h.class),
      (h) => h.owner ?? h.tokenAccount,
    ),
  );
  const clusteringVerified = Boolean(input.clusters && input.clusters.size > 0);
  const clustered = clusteringVerified
    ? pctOfTop10(
        group(
          (h) => h.class === 'INDIVIDUAL' || h.class === 'DEVELOPER' || h.class === 'UNKNOWN',
          (h) => h.clusterId ?? h.owner ?? h.tokenAccount,
        ),
      )
    : null;

  let status: HolderAnalysis['status'];
  if (lower.gt(input.maxTop10Pct)) {
    status = 'FAIL';
    notes.push(`top-10 individual owners hold at least ${lower.toFixed(2)}% of circulating supply`);
  } else if (clustered) {
    status = clustered.gt(input.maxTop10Pct) ? 'FAIL' : 'PASS';
  } else if (!input.requireClustering && upper.lte(input.maxTop10Pct)) {
    status = 'PASS';
    notes.push('passed on the conservative upper bound without clustering');
  } else {
    status = 'UNVERIFIED';
    notes.push(
      'beneficial-owner clustering unavailable; concentration cannot be established to sufficient confidence',
    );
  }
  const unknown = holdings.filter((h) => h.class === 'UNKNOWN' || h.class === 'ESCROW_OR_PROGRAM').length;
  if (unknown) notes.push(`${unknown} of the largest accounts have unidentified controllers`);
  return {
    status,
    ...base,
    top10PctLowerBound: lower.toFixed(4),
    top10PctUpperBound: upper.toFixed(4),
    top10PctClustered: clustered?.toFixed(4) ?? null,
    clusteringVerified,
    notes,
  };
}

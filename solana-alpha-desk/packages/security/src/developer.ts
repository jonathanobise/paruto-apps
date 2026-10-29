import type { ParsedTx } from '@alpha-desk/providers';
import { Decimal } from '@alpha-desk/shared';

export type LinkStrength = 'CONFIRMED' | 'PROBABLE' | 'WEAK';

export interface WalletLink {
  wallet: string;
  relation: 'DEPLOYER' | 'TOKEN_RECIPIENT' | 'FUNDED_BY_DEPLOYER' | 'FUNDER_OF_DEPLOYER' | 'SHARED_FUNDER';
  strength: LinkStrength;
  evidence: string[]; // transaction signatures
}

export interface RugFinding {
  criterion: 'R1_LIQUIDITY_PULL';
  mint: string | null;
  wallet: string;
  signature: string;
  at: number;
}

export interface DeveloperAnalysis {
  ownershipStatus: 'PASS' | 'FAIL' | 'UNVERIFIED';
  historyStatus: 'PASS' | 'FAIL' | 'UNVERIFIED';
  deployer: string | null;
  deployerSource: string | null;
  links: WalletLink[];
  ownershipPctLowerBound: string | null;
  ownershipPct: string | null;
  priorTokens: string[];
  rugFindings: RugFinding[];
  notes: string[];
}

/**
 * Developer-wallet intelligence.
 * Ownership: deployer holdings alone are a lower bound (can FAIL); PASS needs the linked-wallet graph.
 * History: a rug is reported only under predefined criteria with transaction evidence
 * (R1: a deployer-linked wallet withdrew liquidity from a pool of a token the deployer created).
 * Finding no rugs counts as PASS only when the deployer's history was read completely;
 * absence of evidence is otherwise UNVERIFIED.
 */
export function analyseDeveloper(input: {
  mint: string;
  deployer: string | null;
  deployerSource: string | null;
  circulatingSupply: bigint | null;
  deployerHoldings: bigint | null;
  /** Holdings of linked wallets, by wallet; only available with an indexer. */
  linkedHoldings: Map<string, bigint> | null;
  /** Deployer transaction history from an indexer, and whether it was read to the beginning. */
  deployerHistory: { txs: ParsedTx[]; complete: boolean } | null;
  maxOwnershipPct: number;
}): DeveloperAnalysis {
  const notes: string[] = [];
  const links: WalletLink[] = [];
  const pct = (amount: bigint) =>
    input.circulatingSupply && input.circulatingSupply > 0n
      ? new Decimal(amount.toString()).div(input.circulatingSupply.toString()).mul(100)
      : null;

  if (!input.deployer) {
    return {
      ownershipStatus: 'UNVERIFIED',
      historyStatus: 'UNVERIFIED',
      deployer: null,
      deployerSource: null,
      links,
      ownershipPctLowerBound: null,
      ownershipPct: null,
      priorTokens: [],
      rugFindings: [],
      notes: ['deployer could not be identified'],
    };
  }
  links.push({ wallet: input.deployer, relation: 'DEPLOYER', strength: 'CONFIRMED', evidence: [] });

  const priorTokens = new Set<string>();
  const rugFindings: RugFinding[] = [];
  if (input.deployerHistory) {
    for (const tx of input.deployerHistory.txs) {
      if (tx.failed) continue;
      for (const t of tx.tokenTransfers) {
        if (t.mint === input.mint && t.from === input.deployer && t.to && t.to !== input.deployer) {
          addLink(links, {
            wallet: t.to,
            relation: 'TOKEN_RECIPIENT',
            strength: 'CONFIRMED',
            evidence: [tx.signature],
          });
        }
      }
      for (const n of tx.nativeTransfers) {
        if (n.from === input.deployer && n.to && n.to !== input.deployer && n.lamports >= 100_000_000n) {
          addLink(links, {
            wallet: n.to,
            relation: 'FUNDED_BY_DEPLOYER',
            strength: 'PROBABLE',
            evidence: [tx.signature],
          });
        }
        if (n.to === input.deployer && n.from && n.from !== input.deployer && n.lamports >= 100_000_000n) {
          addLink(links, {
            wallet: n.from,
            relation: 'FUNDER_OF_DEPLOYER',
            strength: 'WEAK',
            evidence: [tx.signature],
          });
        }
      }
      if (
        (tx.type === 'CREATE' || tx.type === 'TOKEN_MINT' || tx.type === 'CREATE_POOL') &&
        tx.feePayer === input.deployer
      ) {
        for (const t of tx.tokenTransfers) if (t.mint !== input.mint) priorTokens.add(t.mint);
      }
      if (tx.type === 'WITHDRAW_LIQUIDITY' && tx.feePayer === input.deployer) {
        const otherMint =
          tx.tokenTransfers.find((t) => t.mint !== input.mint && t.to === input.deployer)?.mint ?? null;
        if (otherMint !== input.mint) {
          rugFindings.push({
            criterion: 'R1_LIQUIDITY_PULL',
            mint: otherMint,
            wallet: input.deployer,
            signature: tx.signature,
            at: tx.timestamp,
          });
        }
      }
    }
  }

  // Ownership
  const lower = input.deployerHoldings !== null ? pct(input.deployerHoldings) : null;
  let ownershipStatus: DeveloperAnalysis['ownershipStatus'] = 'UNVERIFIED';
  let full: Decimal | null = null;
  if (lower && lower.gt(input.maxOwnershipPct)) {
    ownershipStatus = 'FAIL';
    notes.push(`deployer alone holds ${lower.toFixed(2)}%`);
  } else if (input.linkedHoldings && input.deployerHistory?.complete && input.deployerHoldings !== null) {
    const strong = links
      .filter((l) => l.strength !== 'WEAK' && l.relation !== 'DEPLOYER')
      .map((l) => l.wallet);
    const total = strong.reduce((s, w) => s + (input.linkedHoldings!.get(w) ?? 0n), input.deployerHoldings);
    full = pct(total);
    ownershipStatus = full === null ? 'UNVERIFIED' : full.gt(input.maxOwnershipPct) ? 'FAIL' : 'PASS';
  } else {
    notes.push('linked-wallet graph unavailable: developer ownership is a lower bound only');
  }

  // History
  let historyStatus: DeveloperAnalysis['historyStatus'] = 'UNVERIFIED';
  if (rugFindings.length > 0) historyStatus = 'FAIL';
  else if (input.deployerHistory?.complete) historyStatus = 'PASS';
  else notes.push('deployer history not read completely; absence of rugs is not evidence');

  return {
    ownershipStatus,
    historyStatus,
    deployer: input.deployer,
    deployerSource: input.deployerSource,
    links,
    ownershipPctLowerBound: lower?.toFixed(4) ?? null,
    ownershipPct: full?.toFixed(4) ?? null,
    priorTokens: [...priorTokens],
    rugFindings,
    notes,
  };
}

function addLink(links: WalletLink[], link: WalletLink): void {
  const existing = links.find((l) => l.wallet === link.wallet);
  if (!existing) {
    links.push(link);
    return;
  }
  const rank = { CONFIRMED: 3, PROBABLE: 2, WEAK: 1 } as const;
  if (rank[link.strength] > rank[existing.strength]) {
    existing.strength = link.strength;
    existing.relation = link.relation;
  }
  existing.evidence.push(...link.evidence);
}

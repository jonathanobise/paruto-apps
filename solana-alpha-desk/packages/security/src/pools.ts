import { PROGRAMS } from '@alpha-desk/config';
import { base58Encode, Decimal } from '@alpha-desk/shared';

export type PoolType = 'PUMPSWAP_AMM' | 'RAYDIUM_CPMM' | 'RAYDIUM_AMM_V4';

export interface DecodedPool {
  poolType: PoolType;
  program: string;
  baseMint: string;
  quoteMint: string;
  baseVault: string;
  quoteVault: string;
  lpMint: string;
  /** LP supply as tracked by the pool program's own accounting (not reduced by direct SPL burns). */
  lpSupplyTracked: bigint;
  creator: string | null;
  /** PumpSwap only: the original pump.fun coin creator recorded on-chain at migration. */
  coinCreator: string | null;
}

const pk = (d: Uint8Array, o: number) => base58Encode(d.subarray(o, o + 32));
const u64 = (d: Uint8Array, o: number) => new DataView(d.buffer, d.byteOffset + o, 8).getBigUint64(0, true);

/**
 * Pool-state decoders. Offsets were verified on 29 Oct 2026 against live mainnet accounts
 * (base/quote mints decoded from the account matched DexScreener's pair data):
 *  - PumpSwap AMM pool (Anchor, 301 bytes)
 *  - Raydium CPMM PoolState (Anchor, 637 bytes)
 *  - Raydium AMM v4 LiquidityStateV4 (752 bytes)
 */
export function decodePool(program: string, data: Uint8Array): DecodedPool | null {
  try {
    if (program === PROGRAMS.pumpSwapAmm && data.length >= 211) {
      return {
        poolType: 'PUMPSWAP_AMM',
        program,
        creator: pk(data, 11),
        baseMint: pk(data, 43),
        quoteMint: pk(data, 75),
        lpMint: pk(data, 107),
        baseVault: pk(data, 139),
        quoteVault: pk(data, 171),
        lpSupplyTracked: u64(data, 203),
        coinCreator: data.length >= 243 ? pk(data, 211) : null,
      };
    }
    if (program === PROGRAMS.raydiumCpmm && data.length >= 341) {
      // token_0 / token_1 are sorted by mint, so either may be the traded token.
      return {
        poolType: 'RAYDIUM_CPMM',
        program,
        creator: pk(data, 40),
        baseVault: pk(data, 72),
        quoteVault: pk(data, 104),
        lpMint: pk(data, 136),
        baseMint: pk(data, 168),
        quoteMint: pk(data, 200),
        lpSupplyTracked: u64(data, 333),
        coinCreator: null,
      };
    }
    if (program === PROGRAMS.raydiumAmmV4 && data.length >= 728) {
      return {
        poolType: 'RAYDIUM_AMM_V4',
        program,
        creator: null,
        baseVault: pk(data, 336),
        quoteVault: pk(data, 368),
        baseMint: pk(data, 400),
        quoteMint: pk(data, 432),
        lpMint: pk(data, 464),
        lpSupplyTracked: u64(data, 720),
        coinCreator: null,
      };
    }
  } catch {
    return null;
  }
  return null;
}

/** Addresses whose LP holdings cannot be withdrawn by anyone. */
export const BURN_ADDRESSES = new Set([
  '1nc1nerator11111111111111111111111111111111',
  '11111111111111111111111111111111',
]);

export interface LpHolder {
  tokenAccount: string;
  owner: string | null;
  amount: bigint;
}

export interface LiquiditySafety {
  status: 'PASS' | 'FAIL' | 'UNVERIFIED';
  lpSupplyTracked: string;
  lpSupplyOutstanding: string;
  burnedViaSupply: string;
  heldByBurnAddresses: string;
  withdrawable: string;
  nonWithdrawablePct: string | null;
  largestWithdrawableHolders: Array<{ owner: string | null; pct: string }>;
  notes: string[];
}

/**
 * LP withdrawal-control model for the supported constant-product pools: LP that was burned
 * (tracked supply minus outstanding mint supply) or sits with a burn address can never be redeemed.
 * Everything else — including LP held by lock programs, whose expiry and revocation rights are not
 * independently verified by this release — is treated as withdrawable (fail closed).
 */
export function assessLpSafety(
  pool: DecodedPool,
  lpOutstanding: bigint,
  largestLpHolders: LpHolder[],
  minNonWithdrawablePct: number,
): LiquiditySafety {
  const notes: string[] = [];
  const tracked = pool.lpSupplyTracked;
  const base = {
    lpSupplyTracked: tracked.toString(),
    lpSupplyOutstanding: lpOutstanding.toString(),
  };
  if (tracked <= 0n) {
    return {
      status: 'UNVERIFIED',
      ...base,
      burnedViaSupply: '0',
      heldByBurnAddresses: '0',
      withdrawable: lpOutstanding.toString(),
      nonWithdrawablePct: null,
      largestWithdrawableHolders: [],
      notes: ['pool reports zero tracked LP supply'],
    };
  }
  if (lpOutstanding > tracked) {
    return {
      status: 'UNVERIFIED',
      ...base,
      burnedViaSupply: '0',
      heldByBurnAddresses: '0',
      withdrawable: lpOutstanding.toString(),
      nonWithdrawablePct: null,
      largestWithdrawableHolders: [],
      notes: ['outstanding LP exceeds pool accounting; model does not apply'],
    };
  }
  const burnedViaSupply = tracked - lpOutstanding;
  const heldByBurn = largestLpHolders
    .filter((h) => h.owner && BURN_ADDRESSES.has(h.owner))
    .reduce((s, h) => s + h.amount, 0n);
  const withdrawable = lpOutstanding - heldByBurn;
  const pct = new Decimal((tracked - withdrawable).toString()).div(tracked.toString()).mul(100);
  const holders = largestLpHolders
    .filter((h) => !(h.owner && BURN_ADDRESSES.has(h.owner)) && h.amount > 0n)
    .slice(0, 5)
    .map((h) => ({
      owner: h.owner,
      pct: new Decimal(h.amount.toString()).div(tracked.toString()).mul(100).toFixed(4),
    }));
  if (withdrawable > 0n) notes.push(`${holders.length} LP holder(s) could redeem liquidity`);
  return {
    status: pct.gte(minNonWithdrawablePct) ? 'PASS' : 'FAIL',
    ...base,
    burnedViaSupply: burnedViaSupply.toString(),
    heldByBurnAddresses: heldByBurn.toString(),
    withdrawable: withdrawable.toString(),
    nonWithdrawablePct: pct.toFixed(4),
    largestWithdrawableHolders: holders,
    notes,
  };
}

/** Programs whose accounts hold pooled or protocol-controlled tokens (used in holder classification). */
export const DEX_PROGRAMS: Record<string, string> = {
  [PROGRAMS.pumpSwapAmm]: 'PumpSwap AMM',
  [PROGRAMS.raydiumCpmm]: 'Raydium CPMM',
  [PROGRAMS.raydiumAmmV4]: 'Raydium AMM v4',
  CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK: 'Raydium CLMM',
  LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj: 'Raydium LaunchLab',
  whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc: 'Orca Whirlpool',
  LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo: 'Meteora DLMM',
  cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG: 'Meteora DAMM v2',
  Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB: 'Meteora DAMM v1',
  dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN: 'Meteora DBC',
};

export const PROTOCOL_PROGRAMS: Record<string, string> = {
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P': 'pump.fun bonding curve',
};

/** Pool authority PDAs that are not accounts themselves. */
export const DEX_AUTHORITIES: Record<string, string> = {
  '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1': 'Raydium AMM v4 authority',
  GpMZbSM2GgvTKHJirzeGfMFoaZ8UR2X7F4v8vHTvxFbL: 'Raydium CPMM authority',
};

/** Constant-product pool: the quote side is half the pool's value. */
export function onChainLiquidityUsd(quoteVaultUi: Decimal, quotePriceUsd: Decimal): Decimal {
  return quoteVaultUi.mul(quotePriceUsd).mul(2);
}

/** Orient a decoded pool around the token being evaluated (CPMM sorts its two mints). */
export function orientPool(
  pool: DecodedPool,
  mint: string,
): { tokenVault: string; quoteVault: string; quoteMint: string } | null {
  if (pool.baseMint === mint)
    return { tokenVault: pool.baseVault, quoteVault: pool.quoteVault, quoteMint: pool.quoteMint };
  if (pool.quoteMint === mint)
    return { tokenVault: pool.quoteVault, quoteVault: pool.baseVault, quoteMint: pool.baseMint };
  return null;
}

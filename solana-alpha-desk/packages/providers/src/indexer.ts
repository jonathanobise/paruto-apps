import type { Observed } from './http.ts';

/** Provider-neutral parsed transaction used by developer, bundle, buyer and smart-wallet analysis. */
export interface ParsedTx {
  signature: string;
  slot: number;
  timestamp: number;
  type: string; // SWAP, TRANSFER, CREATE, TOKEN_MINT, WITHDRAW_LIQUIDITY, ...
  source: string | null;
  feePayer: string;
  failed: boolean;
  nativeTransfers: Array<{ from: string | null; to: string | null; lamports: bigint }>;
  tokenTransfers: Array<{ from: string | null; to: string | null; mint: string; uiAmount: string }>;
}

export interface TransactionIndexer {
  readonly id: string;
  readonly configured: boolean;
  transactions(address: string, opts?: { before?: string; limit?: number; type?: string }): Promise<Observed<ParsedTx[]>>;
  holderCount(mint: string, maxPages?: number): Promise<Observed<{ holders: number; complete: boolean }>>;
}

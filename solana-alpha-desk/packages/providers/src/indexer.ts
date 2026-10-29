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

/** History query: a page cursor, sort order and a time window (epoch ms). */
export interface HistoryQuery {
  /** Cursor from the previous page's `next`. */
  cursor?: string;
  sortOrder?: 'asc' | 'desc';
  gteTime?: number;
  lteTime?: number;
  limit?: number;
}

/**
 * One page of history. `next` is the cursor for the following page, or null at the end. `unparsed` counts
 * transactions the indexer returned but could not parse: they are absent from `txs`, so a read that met any
 * cannot be treated as complete.
 */
export interface HistoryPage {
  txs: ParsedTx[];
  next: string | null;
  unparsed: number;
}

export interface TransactionIndexer {
  readonly id: string;
  readonly configured: boolean;
  transactions(address: string, opts?: HistoryQuery): Promise<Observed<HistoryPage>>;
  holderCount(mint: string, maxPages?: number): Promise<Observed<{ holders: number; complete: boolean }>>;
}

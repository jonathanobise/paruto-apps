import { DexScreener } from './dexscreener.ts';
import { GeckoTerminal } from './geckoterminal.ts';
import { Jupiter } from './jupiter.ts';
import { RugCheck } from './rugcheck.ts';
import { SolanaRpc } from './solana-rpc.ts';
import { Helius, type CreditBudget } from './helius.ts';
import type { CallMetric } from './http.ts';
import type { Clock } from '@alpha-desk/shared';

export interface ProviderEnv {
  SOLANA_RPC_URL?: string;
  JUPITER_API_KEY?: string;
  HELIUS_API_KEY?: string;
}

export interface Providers {
  dex: DexScreener;
  gecko: GeckoTerminal;
  rpc: SolanaRpc;
  jupiter: Jupiter;
  rugcheck: RugCheck;
  helius: Helius;
}

/** A configured RPC wins; otherwise a Helius key gives a private Helius RPC; otherwise the public endpoint. */
export function rpcUrl(env: ProviderEnv): string {
  if (env.SOLANA_RPC_URL) return env.SOLANA_RPC_URL;
  if (env.HELIUS_API_KEY)
    return `https://mainnet.helius-rpc.com/?api-key=${encodeURIComponent(env.HELIUS_API_KEY)}`;
  return 'https://api.mainnet-beta.solana.com';
}

export function createProviders(
  env: ProviderEnv,
  hooks: {
    onMetric?: (m: CallMetric) => void;
    budget?: () => boolean;
    clock?: Clock;
    /** Daily credit budget for the indexer's billed calls. */
    credits?: CreditBudget;
  } = {},
): Providers {
  return {
    dex: new DexScreener(hooks),
    gecko: new GeckoTerminal(hooks),
    rpc: new SolanaRpc(rpcUrl(env), hooks),
    jupiter: new Jupiter({ ...hooks, apiKey: env.JUPITER_API_KEY || undefined }),
    rugcheck: new RugCheck(hooks),
    helius: new Helius(env.HELIUS_API_KEY || undefined, hooks),
  };
}

export interface ProviderStatus {
  id: string;
  integration: 'OPERATIONAL' | 'BLOCKED_BY_CREDENTIALS';
  requiresCredentials: boolean;
  note: string;
}

export function providerStatuses(env: ProviderEnv): ProviderStatus[] {
  return [
    {
      id: 'dexscreener',
      integration: 'OPERATIONAL',
      requiresCredentials: false,
      note: 'Primary discovery and market data (keyless).',
    },
    {
      id: 'geckoterminal',
      integration: 'OPERATIONAL',
      requiresCredentials: false,
      note: 'Supplementary new-pool discovery (keyless, shared rate limit).',
    },
    {
      id: 'solana-rpc',
      integration: 'OPERATIONAL',
      requiresCredentials: false,
      note: env.SOLANA_RPC_URL
        ? 'Custom RPC endpoint.'
        : env.HELIUS_API_KEY
          ? 'Helius RPC (derived from HELIUS_API_KEY).'
          : 'Public mainnet-beta endpoint (rate limited; set SOLANA_RPC_URL or HELIUS_API_KEY).',
    },
    {
      id: 'jupiter',
      integration: 'OPERATIONAL',
      requiresCredentials: false,
      note: env.JUPITER_API_KEY ? 'api.jup.ag with API key.' : 'lite-api.jup.ag (keyless, ~1 req/s).',
    },
    {
      id: 'rugcheck',
      integration: 'OPERATIONAL',
      requiresCredentials: false,
      note: 'Corroborating claims only; never decisive.',
    },
    {
      id: 'helius',
      integration: env.HELIUS_API_KEY ? 'OPERATIONAL' : 'BLOCKED_BY_CREDENTIALS',
      requiresCredentials: true,
      note: 'Holder counts, parsed transaction history: developer graph, launch bundling, unique buyers, buy/sell value, smart wallets.',
    },
  ];
}

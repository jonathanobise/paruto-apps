import { Decimal, fromBaseUnits } from '@alpha-desk/shared';
import type { Observed } from './http.ts';
import type { Quote, QuoteProvider } from './jupiter.ts';

export const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const WSOL = 'So11111111111111111111111111111111111111112';

/** Executable price per whole token from a quote (USDC per token), for sells or buys. */
export function quotePriceUsd(q: Quote, tokenDecimals: number, side: 'SELL' | 'BUY'): Decimal {
  if (side === 'SELL') {
    const tokens = fromBaseUnits(q.inAmount, tokenDecimals);
    return tokens.isZero() ? new Decimal(0) : fromBaseUnits(q.outAmount, 6).div(tokens);
  }
  const tokens = fromBaseUnits(q.outAmount, tokenDecimals);
  return tokens.isZero() ? new Decimal(0) : fromBaseUnits(q.inAmount, 6).div(tokens);
}

export function sellQuote(jup: QuoteProvider, mint: string, amount: bigint, slippageBps: number): Promise<Observed<Quote>> {
  return jup.quote({ inputMint: mint, outputMint: USDC, amount, slippageBps });
}

export function buyQuote(jup: QuoteProvider, mint: string, usdcMicro: bigint, slippageBps: number): Promise<Observed<Quote>> {
  return jup.quote({ inputMint: USDC, outputMint: mint, amount: usdcMicro, slippageBps });
}

/** SOL/USD from an executable 1 SOL → USDC quote, cached briefly. */
export class SolPrice {
  private cached: { price: Decimal; at: number; obs: Observed<Quote> } | null = null;
  constructor(private readonly jup: QuoteProvider, private readonly ttlMs = 30_000) {}
  async get(now: number): Promise<{ price: Decimal; obs: Observed<Quote> }> {
    if (this.cached && now - this.cached.at < this.ttlMs) return this.cached;
    const obs = await this.jup.quote({ inputMint: WSOL, outputMint: USDC, amount: 1_000_000_000n, slippageBps: 50 });
    this.cached = { price: fromBaseUnits(obs.data.outAmount, 6), at: now, obs };
    return this.cached;
  }
}

import type { DexScreener, GeckoTerminal, Observed } from '@alpha-desk/providers';
import { MINUTE, HOUR } from '@alpha-desk/shared';

export interface SeedResult {
  mints: Map<string, Set<string>>; // mint → feeds that surfaced it
  observations: Observed<unknown>[];
  errors: Array<{ source: string; error: string }>;
}

/**
 * Collects candidate mints from the discovery feeds. DexScreener has no "new pairs" endpoint, so its
 * profile / boost / takeover feeds are combined with GeckoTerminal's new-pools feed; every mint is then
 * verified against DexScreener pair data by the Scout.
 */
export async function collectSeeds(
  dex: DexScreener,
  gecko: GeckoTerminal | null,
  now: number,
  maxAgeHours: number,
  minAgeMinutes: number,
): Promise<SeedResult> {
  const mints = new Map<string, Set<string>>();
  const observations: Observed<unknown>[] = [];
  const errors: SeedResult['errors'] = [];
  const add = (mint: string, src: string) => {
    if (!mints.has(mint)) mints.set(mint, new Set());
    mints.get(mint)!.add(src);
  };

  const feeds: Array<[string, () => Promise<Observed<Array<{ chainId: string; tokenAddress: string }>>>]> = [
    ['dexscreener:profiles', () => dex.latestProfiles()],
    ['dexscreener:boosts', () => dex.latestBoosts()],
    ['dexscreener:top-boosts', () => dex.topBoosts()],
    ['dexscreener:takeovers', () => dex.latestTakeovers()],
  ];
  for (const [name, fn] of feeds) {
    try {
      const res = await fn();
      observations.push(res);
      for (const item of res.data) if (item.chainId === 'solana') add(item.tokenAddress, name);
    } catch (e) {
      errors.push({ source: name, error: (e as Error).message });
    }
  }

  if (gecko) {
    for (const page of [1, 2, 3]) {
      try {
        const res = await gecko.newPools(page);
        observations.push(res);
        for (const p of res.data) {
          // Only pools old enough to be eligible soon and young enough to still be in range.
          if (p.createdAt && now - p.createdAt <= maxAgeHours * HOUR && now - p.createdAt >= minAgeMinutes * MINUTE * 0.5) {
            add(p.baseMint, 'geckoterminal:new-pools');
          }
        }
      } catch (e) {
        errors.push({ source: `geckoterminal:new-pools:${page}`, error: (e as Error).message });
        break;
      }
    }
  }
  return { mints, observations, errors };
}

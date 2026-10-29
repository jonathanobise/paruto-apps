// SYNTHETIC TEST FIXTURE — constructed evidence for rule tests, not market data.
import { PROGRAMS } from '@alpha-desk/config';
import type {
  BundleAnalysis,
  DeveloperAnalysis,
  HolderAnalysis,
  SecurityEvidence,
} from '@alpha-desk/security';

export const T_NOW = 1_800_000_000_000;
export const T_MINT = 'HMYd9tosnUXuNHmq7pXmoePRVBLBBjA3JBfydq6upump';
export const T_PAIR = '12jc1DzJpzbCDaKuM4brAKh9jcFry2TLG1FfGsL4ftCG';

const fact = <T>(value: T, ids = ['ev_test']) => ({
  status: 'OK' as const,
  value,
  evidenceIds: ids,
  observedAt: T_NOW - 10_000,
});

export function passingEvidence(): SecurityEvidence {
  const holders: HolderAnalysis = {
    status: 'PASS',
    totalSupply: '1000',
    excludedSupply: '200',
    circulatingSupply: '800',
    top10PctLowerBound: '10',
    top10PctUpperBound: '15',
    top10PctClustered: '12',
    clusteringVerified: true,
    holdings: [],
    notes: [],
  };
  const developer: DeveloperAnalysis = {
    ownershipStatus: 'PASS',
    historyStatus: 'PASS',
    deployer: 'Dev1111111111111111111111111111111111111111',
    deployerSource: 'test',
    links: [],
    ownershipPctLowerBound: '0.5',
    ownershipPct: '1',
    priorTokens: [],
    rugFindings: [],
    notes: [],
  };
  const bundle: BundleAnalysis = {
    status: 'PASS',
    windowSeconds: 120,
    launchBuys: 30,
    coordinatedGroups: [],
    bundledPct: '2',
    notes: [],
  };
  return {
    mint: T_MINT,
    pairAddress: T_PAIR,
    mintFacts: fact({
      tokenProgram: PROGRAMS.splToken,
      mintAuthority: null,
      freezeAuthority: null,
      supply: 1_000_000_000_000_000n,
      decimals: 6,
      extensions: [],
    }),
    pool: fact({
      pairAddress: T_PAIR,
      programOwner: PROGRAMS.pumpSwapAmm,
      decoded: {
        poolType: 'PUMPSWAP_AMM',
        program: PROGRAMS.pumpSwapAmm,
        baseMint: T_MINT,
        quoteMint: 'So11111111111111111111111111111111111111112',
        baseVault: 'V1',
        quoteVault: 'V2',
        lpMint: 'LP',
        lpSupplyTracked: 1000n,
        creator: null,
        coinCreator: null,
      },
      lp: {
        status: 'PASS',
        lpSupplyTracked: '1000',
        lpSupplyOutstanding: '0',
        burnedViaSupply: '1000',
        heldByBurnAddresses: '0',
        withdrawable: '0',
        nonWithdrawablePct: '100.0000',
        largestWithdrawableHolders: [],
        notes: [],
      },
      onChainLiquidityUsd: '100000',
      quotePriceUsd: '100',
    }),
    market: fact({
      liquidityUsd: 101_000,
      volume1hUsd: 75_000,
      priceChange1hPct: 12,
      marketCapUsd: 1_000_000,
      fdvUsd: 1_000_000,
      priceUsd: '0.001',
    }),
    route: fact({
      ok: true,
      noRouteReason: null,
      sellAmountTokens: '800000000',
      outUsd: '790',
      smallPriceUsd: '0.00099',
      sizedPriceUsd: '0.000975',
      priceImpactPct: '1.5',
      routeLabels: ['Pump.fun Amm'],
    }),
    holders: fact(holders),
    developer: fact(developer),
    bundle: fact(bundle),
    corroboration: fact({ provider: 'rugcheck', claims: {} }),
  };
}

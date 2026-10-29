import { z } from 'zod';
import { hashObject } from '@alpha-desk/shared';

/** A piecewise-linear normalisation: metric value → 0..1. Points must be sorted by x. */
const Curve = z
  .array(z.tuple([z.number(), z.number().min(0).max(1)]))
  .min(2)
  .refine((pts) => pts.every((p, i) => i === 0 || p[0] > pts[i - 1]![0]), 'curve x values must increase');

const Factor = z.object({
  weight: z.number().min(0).max(100),
  version: z.string(),
  curve: Curve,
  minSamples: z.number().int().min(0),
  required: z.boolean(),
});

export const StrategyConfigSchema = z
  .object({
    strategyVersion: z.string(),
    discovery: z.object({
      minPairAgeMinutes: z.number().positive(),
      maxPairAgeHours: z.number().positive(),
      minMarketCapUsd: z.number().positive(),
      maxMarketCapUsd: z.number().positive(),
      pollIntervalSeconds: z.number().int().min(15),
      reevaluateAfterMinutes: z.number().positive(),
      maxCandidatesPerCycle: z.number().int().positive(),
      supportedQuoteMints: z.array(z.string()),
    }),
    filter: z.object({
      minLiquidityUsd: z.number(),
      minVolume1hUsd: z.number(),
      maxTop10HolderPct: z.number(),
      maxDeveloperOwnershipPct: z.number(),
      maxBundledLaunchPct: z.number(),
      maxPriceChange1hPct: z.number(),
      minLpNonWithdrawablePct: z.number(),
      launchWindowSeconds: z.number().int().positive(),
      dataFreshnessSeconds: z.number().int().positive(),
      maxProviderDiscrepancyPct: z.number().positive(),
      maxSellPriceImpactPct: z.number().positive(),
      requireHolderClustering: z.boolean(),
      complianceScreeningRequired: z.boolean(),
      allowedToken2022Extensions: z.array(z.string()),
      supportedPoolPrograms: z.array(z.string()),
      supportedTokenPrograms: z.array(z.string()),
      approvalTtlSeconds: z.number().int().positive(),
    }),
    analyst: z.object({
      passThreshold: z.number().min(0).max(100),
      minVerifiedWeight: z.number().min(0).max(100),
      approvalTtlSeconds: z.number().int().positive(),
      factors: z.object({
        momentum: Factor,
        uniqueBuyers: Factor,
        buySellValueRatio: Factor,
        holderGrowth: Factor,
        liquidityToMcap: Factor,
        smartWallets: Factor,
      }),
    }),
    risk: z.object({
      maxAllocationPct: z.number().positive().max(100),
      riskBudgetPct: z.number().positive(),
      maxCombinedExposurePct: z.number().positive().max(100),
      maxConcurrentPositions: z.number().int().positive(),
      initialStopPct: z.number().positive().max(50),
      trailingActivationPct: z.number().positive(),
      trailingDistancePct: z.number().positive().max(50),
      executionBufferPct: z.number().min(0),
      maxEntryCostPct: z.number().positive(),
      maxLiquidityParticipationPct: z.number().positive(),
      dailyLossLimitPct: z.number().positive(),
      maxDrawdownPct: z.number().positive(),
      authorizationTtlSeconds: z.number().int().positive(),
      maxQuoteAgeSeconds: z.number().int().positive(),
      maxPriceMoveSinceAuthPct: z.number().positive(),
      routeFailurePauseCount: z.number().int().positive(),
      routeFailureWindowMinutes: z.number().int().positive(),
      liquidityDropAlertPct: z.number().positive(),
      maxDailyTrades: z.number().int().positive(),
      startingEquityUsd: z.number().positive(),
    }),
    execution: z.object({
      slippageBps: z.number().int().min(1).max(5000),
      simulatedLatencyMs: z.number().int().min(0),
      baseFeeLamports: z.number().int().min(0),
      computeUnits: z.number().int().positive(),
      priorityFeePercentile: z.number().min(0).max(100),
      minPriorityFeeMicroLamportsPerCu: z.number().int().min(0),
      exitRetryLimit: z.number().int().min(0),
      exitRetryDelaySeconds: z.number().int().min(1),
      quoteMint: z.string(),
      quoteDecimals: z.number().int(),
    }),
    monitoring: z.object({
      positionPollMs: z.number().int().min(500),
      candidateSnapshotSeconds: z.number().int().min(5),
      staleMarkSeconds: z.number().int().positive(),
    }),
  })
  .superRefine((c, ctx) => {
    const total = Object.values(c.analyst.factors).reduce((s, f) => s + f.weight, 0);
    if (Math.abs(total - 100) > 1e-9) ctx.addIssue({ code: 'custom', message: `factor weights sum to ${total}, not 100` });
    if (c.discovery.minMarketCapUsd >= c.discovery.maxMarketCapUsd)
      ctx.addIssue({ code: 'custom', message: 'market cap bounds inverted' });
    if (c.discovery.minPairAgeMinutes / 60 >= c.discovery.maxPairAgeHours)
      ctx.addIssue({ code: 'custom', message: 'pair age bounds inverted' });
  });

export type StrategyConfig = z.infer<typeof StrategyConfigSchema>;

export const WSOL_MINT = 'So11111111111111111111111111111111111111112';
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

export const PROGRAMS = {
  splToken: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  token2022: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
  pumpSwapAmm: 'pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA',
  raydiumCpmm: 'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C',
  raydiumAmmV4: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  system: '11111111111111111111111111111111',
} as const;

/** Version 1 of the strategy: every threshold from the product specification lives here. */
export const DEFAULT_STRATEGY: StrategyConfig = {
  strategyVersion: 'alpha-desk-v1.0.0',
  discovery: {
    minPairAgeMinutes: 30,
    maxPairAgeHours: 72,
    minMarketCapUsd: 300_000,
    maxMarketCapUsd: 20_000_000,
    pollIntervalSeconds: 60,
    reevaluateAfterMinutes: 15,
    maxCandidatesPerCycle: 60,
    supportedQuoteMints: [WSOL_MINT, USDC_MINT],
  },
  filter: {
    minLiquidityUsd: 40_000,
    minVolume1hUsd: 50_000,
    maxTop10HolderPct: 25,
    maxDeveloperOwnershipPct: 3,
    maxBundledLaunchPct: 10,
    maxPriceChange1hPct: 80,
    minLpNonWithdrawablePct: 95,
    launchWindowSeconds: 120,
    dataFreshnessSeconds: 120,
    maxProviderDiscrepancyPct: 15,
    maxSellPriceImpactPct: 5,
    requireHolderClustering: true,
    complianceScreeningRequired: false,
    allowedToken2022Extensions: [
      'metadataPointer',
      'tokenMetadata',
      'groupPointer',
      'groupMemberPointer',
      'tokenGroup',
      'tokenGroupMember',
      'immutableOwner',
    ],
    supportedPoolPrograms: [PROGRAMS.pumpSwapAmm, PROGRAMS.raydiumCpmm, PROGRAMS.raydiumAmmV4],
    supportedTokenPrograms: [PROGRAMS.splToken, PROGRAMS.token2022],
    approvalTtlSeconds: 300,
  },
  analyst: {
    passThreshold: 70,
    minVerifiedWeight: 85,
    approvalTtlSeconds: 180,
    factors: {
      // momentum composite (0..1 already) → score
      momentum: { weight: 20, version: 'momentum-v1', curve: [[0, 0], [1, 1]], minSamples: 3, required: true },
      // distinct buyer clusters in the last hour
      uniqueBuyers: { weight: 20, version: 'unique-buyers-v1', curve: [[20, 0], [150, 0.6], [400, 1]], minSamples: 20, required: true },
      // buy value / sell value over 1h
      buySellValueRatio: { weight: 15, version: 'buy-sell-value-v1', curve: [[0.8, 0], [1.1, 0.5], [1.6, 1]], minSamples: 30, required: true },
      // % holder growth per hour over the observation window
      holderGrowth: { weight: 15, version: 'holder-growth-v1', curve: [[0, 0], [2, 0.5], [6, 1]], minSamples: 2, required: false },
      // liquidity / market cap, %, depth-adjusted
      liquidityToMcap: { weight: 15, version: 'liquidity-mcap-v1', curve: [[3, 0], [8, 0.5], [20, 1]], minSamples: 1, required: true },
      // count of verified smart-wallet clusters buying
      smartWallets: { weight: 15, version: 'smart-wallets-v1', curve: [[0, 0], [2, 0.6], [5, 1]], minSamples: 1, required: false },
    },
  },
  risk: {
    maxAllocationPct: 8,
    riskBudgetPct: 0.5,
    maxCombinedExposurePct: 24,
    maxConcurrentPositions: 3,
    initialStopPct: 6,
    trailingActivationPct: 12,
    trailingDistancePct: 6,
    executionBufferPct: 1.5,
    maxEntryCostPct: 3,
    maxLiquidityParticipationPct: 2,
    dailyLossLimitPct: 3,
    maxDrawdownPct: 8,
    authorizationTtlSeconds: 45,
    maxQuoteAgeSeconds: 15,
    maxPriceMoveSinceAuthPct: 3,
    routeFailurePauseCount: 5,
    routeFailureWindowMinutes: 30,
    liquidityDropAlertPct: 30,
    maxDailyTrades: 12,
    startingEquityUsd: 10_000,
  },
  execution: {
    slippageBps: 300,
    simulatedLatencyMs: 1500,
    baseFeeLamports: 5000,
    computeUnits: 300_000,
    priorityFeePercentile: 75,
    minPriorityFeeMicroLamportsPerCu: 10_000,
    exitRetryLimit: 20,
    exitRetryDelaySeconds: 5,
    quoteMint: USDC_MINT,
    quoteDecimals: 6,
  },
  monitoring: {
    positionPollMs: 2000,
    candidateSnapshotSeconds: 15,
    staleMarkSeconds: 20,
  },
};

export interface VersionedConfig {
  config: StrategyConfig;
  /** Content hash; any change to any threshold is a new version. */
  configVersion: string;
}

export async function versionConfig(config: StrategyConfig): Promise<VersionedConfig> {
  const parsed = StrategyConfigSchema.parse(config);
  const hash = await hashObject(parsed);
  return { config: parsed, configVersion: `cfg_${hash.slice(0, 16)}` };
}

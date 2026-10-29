import type { StrategyConfig } from '@alpha-desk/config';
import { PROGRAMS } from '@alpha-desk/config';
import { Decimal, type RuleOutcome } from '@alpha-desk/shared';
import type { BundleAnalysis } from './bundle.ts';
import type { DeveloperAnalysis } from './developer.ts';
import type { HolderAnalysis } from './holders.ts';
import type { DecodedPool, LiquiditySafety } from './pools.ts';

export const RULE_IDS = [
  'F001',
  'F002',
  'F003',
  'F004',
  'F005',
  'F006',
  'F007',
  'F008',
  'F009',
  'F010',
  'F011',
  'F012',
  'F013',
  'F014',
  'F015',
  'F016',
  'F017',
  'F018',
] as const;
export type RuleId = (typeof RULE_IDS)[number];

export const RULE_TITLES: Record<RuleId, string> = {
  F001: 'Mint authority revoked',
  F002: 'Freeze authority revoked',
  F003: 'Pool liquidity non-withdrawable',
  F004: 'Relevant liquidity ≥ minimum',
  F005: 'One-hour volume ≥ minimum',
  F006: 'Top-10 beneficial holders ≤ limit',
  F007: 'Developer-linked ownership ≤ limit',
  F008: 'No confirmed developer rug history',
  F009: 'Bundled launch acquisition ≤ limit',
  F010: 'One-hour price rise ≤ limit',
  F011: 'No dangerous Token-2022 extensions',
  F012: 'Sell route executable',
  F013: 'Required evidence present',
  F014: 'Providers consistent',
  F015: 'Data fresh',
  F016: 'No transfer restrictions or confiscation',
  F017: 'Supported token and pool programs',
  F018: 'Compliance screening',
};

/** A value with its evidence. `null` value with status UNAVAILABLE means the fact could not be obtained. */
export interface Fact<T> {
  status: 'OK' | 'UNAVAILABLE' | 'ERROR';
  value: T | null;
  evidenceIds: string[];
  observedAt: number | null;
  error?: string;
}

export interface MintFacts {
  tokenProgram: string;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  supply: bigint;
  decimals: number;
  extensions: Array<{ name: string; state: Record<string, unknown> }>;
}

export interface PoolFacts {
  pairAddress: string;
  programOwner: string;
  decoded: DecodedPool | null;
  lp: LiquiditySafety | null;
  onChainLiquidityUsd: string | null;
  quotePriceUsd: string | null;
}

export interface MarketFacts {
  liquidityUsd: number | null;
  volume1hUsd: number | null;
  priceChange1hPct: number | null;
  marketCapUsd: number | null;
  fdvUsd: number | null;
  priceUsd: string | null;
}

export interface RouteFacts {
  ok: boolean;
  noRouteReason: string | null;
  sellAmountTokens: string;
  outUsd: string | null;
  smallPriceUsd: string | null;
  sizedPriceUsd: string | null;
  priceImpactPct: string | null;
  routeLabels: string[];
}

export interface CorroborationFacts {
  provider: string;
  claims: Record<string, unknown>;
}

export interface SecurityEvidence {
  mint: string;
  pairAddress: string;
  mintFacts: Fact<MintFacts>;
  pool: Fact<PoolFacts>;
  market: Fact<MarketFacts>;
  route: Fact<RouteFacts>;
  holders: Fact<HolderAnalysis>;
  developer: Fact<DeveloperAnalysis>;
  bundle: Fact<BundleAnalysis>;
  corroboration: Fact<CorroborationFacts>;
}

export interface RuleResult {
  ruleId: RuleId;
  title: string;
  outcome: RuleOutcome;
  observed: unknown;
  threshold: string | null;
  reason: string;
  evidenceIds: string[];
}

export type FilterOutcome = 'FILTER_APPROVED' | 'FILTER_REJECTED' | 'FILTER_UNVERIFIED' | 'FILTER_ERROR';

const DANGEROUS_EXTENSIONS: Record<string, string> = {
  permanentDelegate: 'a permanent delegate can move or burn any holder’s tokens',
  transferHook: 'a transfer hook program runs on every transfer and can block sells',
  nonTransferable: 'tokens cannot be transferred',
  defaultAccountState: 'new accounts can start frozen',
  pausable: 'transfers can be paused',
  transferFeeConfig: 'transfers carry a fee that can be raised',
  confidentialTransferMint: 'confidential transfers hide balances',
  mintCloseAuthority: 'the mint can be closed',
  scaledUiAmountConfig: 'displayed balances can be rescaled',
  interestBearingConfig: 'displayed balances accrue interest set by an authority',
};

function r(
  ruleId: RuleId,
  outcome: RuleOutcome,
  reason: string,
  observed: unknown,
  threshold: string | null,
  evidenceIds: string[],
): RuleResult {
  return { ruleId, title: RULE_TITLES[ruleId], outcome, reason, observed, threshold, evidenceIds };
}

function unavailable(ruleId: RuleId, fact: Fact<unknown>, what: string): RuleResult {
  return r(
    ruleId,
    fact.status === 'ERROR' ? 'ERROR' : 'UNVERIFIED',
    `${what} unavailable${fact.error ? `: ${fact.error}` : ''}`,
    null,
    null,
    fact.evidenceIds,
  );
}

/**
 * Filter Agent rules. Deterministic over the gathered evidence; every rule returns PASS, FAIL,
 * UNVERIFIED, ERROR (or NOT_REQUIRED for F018 when screening is not required) with its evidence.
 * Missing data never becomes a PASS.
 */
export function evaluateRules(e: SecurityEvidence, cfg: StrategyConfig['filter'], now: number): RuleResult[] {
  const out: RuleResult[] = [];
  const m = e.mintFacts;

  // F001 / F002 — on-chain authorities
  if (m.status !== 'OK' || !m.value) {
    out.push(unavailable('F001', m, 'mint account'), unavailable('F002', m, 'mint account'));
  } else {
    out.push(
      m.value.mintAuthority
        ? r(
            'F001',
            'FAIL',
            `mint authority ${m.value.mintAuthority} can mint more supply`,
            m.value.mintAuthority,
            'revoked',
            m.evidenceIds,
          )
        : r('F001', 'PASS', 'mint authority is revoked on-chain', null, 'revoked', m.evidenceIds),
      m.value.freezeAuthority
        ? r(
            'F002',
            'FAIL',
            `freeze authority ${m.value.freezeAuthority} can freeze holders`,
            m.value.freezeAuthority,
            'revoked',
            m.evidenceIds,
          )
        : r('F002', 'PASS', 'freeze authority is revoked on-chain', null, 'revoked', m.evidenceIds),
    );
  }

  // F003 — liquidity withdrawal control (per pool adapter)
  const p = e.pool;
  if (p.status !== 'OK' || !p.value) out.push(unavailable('F003', p, 'pool state'));
  else if (!p.value.decoded)
    out.push(
      r(
        'F003',
        'UNVERIFIED',
        'no verified adapter for this pool type',
        p.value.programOwner,
        null,
        p.evidenceIds,
      ),
    );
  else if (!p.value.lp)
    out.push(r('F003', 'UNVERIFIED', 'LP holdings could not be read', null, null, p.evidenceIds));
  else {
    const lp = p.value.lp;
    const thr = `≥ ${cfg.minLpNonWithdrawablePct}% non-withdrawable`;
    out.push(
      lp.status === 'PASS'
        ? r(
            'F003',
            'PASS',
            `${lp.nonWithdrawablePct}% of LP is burned or held by burn addresses`,
            lp,
            thr,
            p.evidenceIds,
          )
        : lp.status === 'FAIL'
          ? r(
              'F003',
              'FAIL',
              `only ${lp.nonWithdrawablePct}% of LP is non-withdrawable`,
              lp,
              thr,
              p.evidenceIds,
            )
          : r('F003', 'UNVERIFIED', lp.notes.join('; ') || 'LP model not verifiable', lp, thr, p.evidenceIds),
    );
  }

  // F004 — liquidity (on-chain vault value preferred; provider value as fallback is not accepted)
  const mk = e.market;
  if (p.status === 'OK' && p.value?.onChainLiquidityUsd) {
    const liq = new Decimal(p.value.onChainLiquidityUsd);
    out.push(
      liq.lt(cfg.minLiquidityUsd)
        ? r(
            'F004',
            'FAIL',
            `on-chain pool liquidity $${liq.toFixed(0)} below minimum`,
            liq.toFixed(2),
            `≥ $${cfg.minLiquidityUsd}`,
            p.evidenceIds,
          )
        : r(
            'F004',
            'PASS',
            `on-chain pool liquidity $${liq.toFixed(0)}`,
            liq.toFixed(2),
            `≥ $${cfg.minLiquidityUsd}`,
            p.evidenceIds,
          ),
    );
  } else if (
    mk.status === 'OK' &&
    mk.value?.liquidityUsd !== null &&
    mk.value?.liquidityUsd !== undefined &&
    mk.value.liquidityUsd < cfg.minLiquidityUsd
  ) {
    // A provider value below the minimum is enough to reject; it is never enough to pass.
    out.push(
      r(
        'F004',
        'FAIL',
        `reported liquidity $${mk.value.liquidityUsd.toFixed(0)} below minimum`,
        mk.value.liquidityUsd,
        `≥ $${cfg.minLiquidityUsd}`,
        mk.evidenceIds,
      ),
    );
  } else
    out.push(
      r('F004', 'UNVERIFIED', 'on-chain pool liquidity unavailable', null, `≥ $${cfg.minLiquidityUsd}`, [
        ...p.evidenceIds,
        ...mk.evidenceIds,
      ]),
    );

  // F005 — volume, F010 — price rise
  if (mk.status !== 'OK' || !mk.value)
    out.push(unavailable('F005', mk, 'market data'), unavailable('F010', mk, 'market data'));
  else {
    const v = mk.value.volume1hUsd;
    out.push(
      v === null
        ? r(
            'F005',
            'UNVERIFIED',
            'one-hour volume not reported',
            null,
            `≥ $${cfg.minVolume1hUsd}`,
            mk.evidenceIds,
          )
        : v < cfg.minVolume1hUsd
          ? r(
              'F005',
              'FAIL',
              `one-hour volume $${v.toFixed(0)} below minimum`,
              v,
              `≥ $${cfg.minVolume1hUsd}`,
              mk.evidenceIds,
            )
          : r(
              'F005',
              'PASS',
              `one-hour volume $${v.toFixed(0)}`,
              v,
              `≥ $${cfg.minVolume1hUsd}`,
              mk.evidenceIds,
            ),
    );
    const c = mk.value.priceChange1hPct;
    out.push(
      c === null
        ? r(
            'F010',
            'UNVERIFIED',
            'one-hour price change not reported',
            null,
            `≤ ${cfg.maxPriceChange1hPct}%`,
            mk.evidenceIds,
          )
        : c > cfg.maxPriceChange1hPct
          ? r(
              'F010',
              'FAIL',
              `price rose ${c}% in one hour`,
              c,
              `≤ ${cfg.maxPriceChange1hPct}%`,
              mk.evidenceIds,
            )
          : r('F010', 'PASS', `one-hour change ${c}%`, c, `≤ ${cfg.maxPriceChange1hPct}%`, mk.evidenceIds),
    );
  }

  // F006 — holder concentration
  const h = e.holders;
  if (h.status !== 'OK' || !h.value) out.push(unavailable('F006', h, 'holder data'));
  else {
    const hv = h.value;
    const obs = {
      lowerBound: hv.top10PctLowerBound,
      upperBound: hv.top10PctUpperBound,
      clustered: hv.top10PctClustered,
    };
    out.push(
      r(
        'F006',
        hv.status,
        hv.notes.join('; ') || `top-10 clusters ${hv.top10PctClustered ?? hv.top10PctUpperBound}%`,
        obs,
        `≤ ${cfg.maxTop10HolderPct}%`,
        h.evidenceIds,
      ),
    );
  }

  // F007 / F008 — developer
  const d = e.developer;
  if (d.status !== 'OK' || !d.value)
    out.push(unavailable('F007', d, 'developer analysis'), unavailable('F008', d, 'developer analysis'));
  else {
    const dv = d.value;
    out.push(
      r(
        'F007',
        dv.ownershipStatus,
        dv.ownershipStatus === 'PASS'
          ? `developer-linked ownership ${dv.ownershipPct}%`
          : dv.notes.join('; ') || 'developer ownership unverified',
        { lowerBound: dv.ownershipPctLowerBound, full: dv.ownershipPct, deployer: dv.deployer },
        `≤ ${cfg.maxDeveloperOwnershipPct}%`,
        d.evidenceIds,
      ),
      r(
        'F008',
        dv.historyStatus,
        dv.historyStatus === 'FAIL'
          ? `${dv.rugFindings.length} confirmed rug finding(s)`
          : dv.historyStatus === 'PASS'
            ? `no rug under the predefined criteria across ${dv.priorTokens.length} prior token(s)`
            : 'developer history not assessable to sufficient depth',
        { findings: dv.rugFindings, priorTokens: dv.priorTokens.length },
        'no confirmed rug',
        d.evidenceIds,
      ),
    );
  }

  // F009 — launch bundling
  const b = e.bundle;
  if (b.status !== 'OK' || !b.value) out.push(unavailable('F009', b, 'launch transactions'));
  else
    out.push(
      r(
        'F009',
        b.value.status,
        b.value.status === 'UNVERIFIED'
          ? b.value.notes.join('; ')
          : `coordinated launch acquisition ${b.value.bundledPct}%`,
        { bundledPct: b.value.bundledPct, groups: b.value.coordinatedGroups.length },
        `≤ ${cfg.maxBundledLaunchPct}%`,
        b.evidenceIds,
      ),
    );

  // F011 / F016 — extensions and control mechanisms
  if (m.status !== 'OK' || !m.value)
    out.push(unavailable('F011', m, 'mint account'), unavailable('F016', m, 'mint account'));
  else {
    const exts = m.value.extensions;
    const bad = exts.filter((x) => !cfg.allowedToken2022Extensions.includes(x.name));
    out.push(
      bad.length
        ? r(
            'F011',
            'FAIL',
            bad
              .map((x) => `${x.name}: ${DANGEROUS_EXTENSIONS[x.name] ?? 'not on the approved list'}`)
              .join('; '),
            bad.map((x) => x.name),
            'approved extensions only',
            m.evidenceIds,
          )
        : r(
            'F011',
            'PASS',
            exts.length
              ? `only approved extensions (${exts.map((x) => x.name).join(', ')})`
              : 'no Token-2022 extensions',
            exts.map((x) => x.name),
            'approved extensions only',
            m.evidenceIds,
          ),
    );
    const controls = exts.filter((x) =>
      ['permanentDelegate', 'transferHook', 'nonTransferable', 'defaultAccountState', 'pausable'].includes(
        x.name,
      ),
    );
    out.push(
      controls.length || m.value.freezeAuthority
        ? r(
            'F016',
            'FAIL',
            [
              ...controls.map((x) => DANGEROUS_EXTENSIONS[x.name]),
              m.value.freezeAuthority ? 'freeze authority active' : null,
            ]
              .filter(Boolean)
              .join('; '),
            controls.map((x) => x.name),
            'none',
            m.evidenceIds,
          )
        : r(
            'F016',
            'PASS',
            'no transfer-restriction or confiscation mechanism on the mint',
            null,
            'none',
            m.evidenceIds,
          ),
    );
  }

  // F012 — sell route
  const rt = e.route;
  if (rt.status === 'ERROR')
    out.push(
      r('F012', 'ERROR', `quote provider error: ${rt.error ?? 'unknown'}`, null, null, rt.evidenceIds),
    );
  else if (rt.status !== 'OK' || !rt.value) out.push(unavailable('F012', rt, 'sell route'));
  else if (!rt.value.ok)
    out.push(
      r(
        'F012',
        'FAIL',
        `no executable sell route: ${rt.value.noRouteReason ?? 'unknown'}`,
        rt.value,
        null,
        rt.evidenceIds,
      ),
    );
  else {
    const impact = rt.value.priceImpactPct ? new Decimal(rt.value.priceImpactPct) : null;
    out.push(
      impact === null
        ? r(
            'F012',
            'UNVERIFIED',
            'sell price impact could not be measured',
            rt.value,
            `impact ≤ ${cfg.maxSellPriceImpactPct}%`,
            rt.evidenceIds,
          )
        : impact.gt(cfg.maxSellPriceImpactPct)
          ? r(
              'F012',
              'FAIL',
              `selling a full position moves price ${impact.toFixed(2)}%`,
              rt.value,
              `impact ≤ ${cfg.maxSellPriceImpactPct}%`,
              rt.evidenceIds,
            )
          : r(
              'F012',
              'PASS',
              `sell route via ${rt.value.routeLabels.join(' → ')} with ${impact.toFixed(2)}% impact`,
              rt.value,
              `impact ≤ ${cfg.maxSellPriceImpactPct}%`,
              rt.evidenceIds,
            ),
    );
  }

  // F013 — required evidence
  const required: Array<[string, Fact<unknown>]> = [
    ['mint account', m],
    ['pool state', p],
    ['market data', mk],
    ['sell route', rt],
  ];
  const missing = required.filter(([, f]) => f.status !== 'OK').map(([n]) => n);
  out.push(
    missing.length
      ? r(
          'F013',
          'UNVERIFIED',
          `missing: ${missing.join(', ')}`,
          missing,
          'all core evidence',
          required.flatMap(([, f]) => f.evidenceIds),
        )
      : r(
          'F013',
          'PASS',
          'mint, pool, market and route evidence present',
          null,
          'all core evidence',
          required.flatMap(([, f]) => f.evidenceIds),
        ),
  );

  // F014 — provider consistency (critical values only; never averaged)
  const discrepancies: string[] = [];
  if (p.value?.onChainLiquidityUsd && mk.value?.liquidityUsd) {
    const a = new Decimal(p.value.onChainLiquidityUsd);
    const bv = new Decimal(mk.value.liquidityUsd);
    if (a.gt(0) && a.sub(bv).abs().div(a).mul(100).gt(cfg.maxProviderDiscrepancyPct)) {
      discrepancies.push(`liquidity: on-chain $${a.toFixed(0)} vs DexScreener $${bv.toFixed(0)}`);
    }
  }
  if (m.value && mk.value?.fdvUsd && mk.value.priceUsd) {
    const onchainFdv = new Decimal(m.value.supply.toString())
      .div(new Decimal(10).pow(m.value.decimals))
      .mul(mk.value.priceUsd);
    if (
      onchainFdv.gt(0) &&
      onchainFdv.sub(mk.value.fdvUsd).abs().div(onchainFdv).mul(100).gt(cfg.maxProviderDiscrepancyPct)
    ) {
      discrepancies.push(
        `FDV: supply×price $${onchainFdv.toFixed(0)} vs DexScreener $${mk.value.fdvUsd.toFixed(0)}`,
      );
    }
  }
  if (mk.value?.marketCapUsd && mk.value.fdvUsd && mk.value.marketCapUsd > mk.value.fdvUsd * 1.0001) {
    discrepancies.push('market cap exceeds FDV');
  }
  if (rt.value?.sizedPriceUsd && mk.value?.priceUsd) {
    const exec = new Decimal(rt.value.smallPriceUsd ?? rt.value.sizedPriceUsd);
    const last = new Decimal(mk.value.priceUsd);
    if (last.gt(0) && exec.sub(last).abs().div(last).mul(100).gt(cfg.maxProviderDiscrepancyPct)) {
      discrepancies.push(
        `price: executable $${exec.toSignificantDigits(6)} vs last trade $${last.toSignificantDigits(6)}`,
      );
    }
  }
  const authorityClaims = e.corroboration.value?.claims as
    { mintAuthorityRisk?: boolean; freezeAuthorityRisk?: boolean } | undefined;
  const notes: string[] = [];
  if (authorityClaims && m.value) {
    if (authorityClaims.mintAuthorityRisk && !m.value.mintAuthority)
      notes.push('RugCheck reports mint authority; on-chain shows revoked (on-chain preferred)');
    if (authorityClaims.freezeAuthorityRisk && !m.value.freezeAuthority)
      notes.push('RugCheck reports freeze authority; on-chain shows revoked (on-chain preferred)');
  }
  const consistencyEvidence = [
    ...p.evidenceIds,
    ...mk.evidenceIds,
    ...m.evidenceIds,
    ...e.corroboration.evidenceIds,
  ];
  if (discrepancies.length)
    out.push(
      r(
        'F014',
        'FAIL',
        discrepancies.join('; '),
        { discrepancies, notes },
        `≤ ${cfg.maxProviderDiscrepancyPct}% divergence`,
        consistencyEvidence,
      ),
    );
  else if (!p.value?.onChainLiquidityUsd || !mk.value)
    out.push(
      r(
        'F014',
        'UNVERIFIED',
        'not enough independent values to cross-check',
        { notes },
        `≤ ${cfg.maxProviderDiscrepancyPct}% divergence`,
        consistencyEvidence,
      ),
    );
  else
    out.push(
      r(
        'F014',
        'PASS',
        notes.length ? `critical values agree; ${notes.join('; ')}` : 'critical values agree across sources',
        { notes },
        `≤ ${cfg.maxProviderDiscrepancyPct}% divergence`,
        consistencyEvidence,
      ),
    );

  // F015 — freshness of every decisive observation
  const times = [m, p, mk, rt].map((f) => f.observedAt).filter((t): t is number => t !== null);
  const oldest = times.length ? Math.min(...times) : null;
  const ageS = oldest === null ? null : (now - oldest) / 1000;
  out.push(
    ageS === null
      ? r('F015', 'UNVERIFIED', 'no timestamped observations', null, `≤ ${cfg.dataFreshnessSeconds}s`, [])
      : ageS > cfg.dataFreshnessSeconds
        ? r(
            'F015',
            'UNVERIFIED',
            `oldest decisive observation is ${ageS.toFixed(0)}s old`,
            ageS,
            `≤ ${cfg.dataFreshnessSeconds}s`,
            [],
          )
        : r(
            'F015',
            'PASS',
            `oldest decisive observation ${ageS.toFixed(0)}s old`,
            ageS,
            `≤ ${cfg.dataFreshnessSeconds}s`,
            [],
          ),
  );

  // F017 — programs
  if (m.status !== 'OK' || !m.value || p.status !== 'OK' || !p.value)
    out.push(
      r('F017', 'UNVERIFIED', 'token or pool program unknown', null, null, [
        ...m.evidenceIds,
        ...p.evidenceIds,
      ]),
    );
  else {
    const tokenOk = cfg.supportedTokenPrograms.includes(m.value.tokenProgram);
    const poolOk = cfg.supportedPoolPrograms.includes(p.value.programOwner) && p.value.decoded !== null;
    out.push(
      tokenOk && poolOk
        ? r(
            'F017',
            'PASS',
            `${m.value.tokenProgram === PROGRAMS.token2022 ? 'Token-2022' : 'SPL Token'} on ${p.value.decoded!.poolType}`,
            { token: m.value.tokenProgram, pool: p.value.programOwner },
            'supported programs',
            [...m.evidenceIds, ...p.evidenceIds],
          )
        : r(
            'F017',
            'FAIL',
            `${tokenOk ? '' : 'unsupported token program; '}${poolOk ? '' : `pool program ${p.value.programOwner} has no verified adapter`}`.trim(),
            { token: m.value.tokenProgram, pool: p.value.programOwner },
            'supported programs',
            [...m.evidenceIds, ...p.evidenceIds],
          ),
    );
  }

  // F018 — compliance
  out.push(
    cfg.complianceScreeningRequired
      ? r(
          'F018',
          'UNVERIFIED',
          'compliance screening required but no authoritative screening service is configured',
          null,
          'screened',
          [],
        )
      : r(
          'F018',
          'NOT_REQUIRED',
          'screening not required by the configured operating jurisdiction (strategy config)',
          null,
          null,
          [],
        ),
  );

  return RULE_IDS.map((id) => out.find((x) => x.ruleId === id)!);
}

export function aggregateFilter(results: RuleResult[]): FilterOutcome {
  if (results.some((x) => x.outcome === 'FAIL')) return 'FILTER_REJECTED';
  if (results.some((x) => x.outcome === 'ERROR')) return 'FILTER_ERROR';
  if (results.some((x) => x.outcome === 'UNVERIFIED')) return 'FILTER_UNVERIFIED';
  if (results.every((x) => x.outcome === 'PASS' || x.outcome === 'NOT_REQUIRED')) return 'FILTER_APPROVED';
  return 'FILTER_UNVERIFIED';
}

import type { Statement } from '@alpha-desk/db';
import { EvidenceCollector } from '@alpha-desk/providers';
import {
  buySellValueFactor,
  decideAnalyst,
  holderGrowthFactor,
  liquidityFactor,
  momentumFactor,
  rankOpportunities,
  smartWalletFactor,
  uniqueBuyersFactor,
  type HolderPoint,
  type TradeFlowInput,
} from '@alpha-desk/scoring';
import { HOUR, MINUTE, newId, toJson } from '@alpha-desk/shared';
import { auditStmt } from './audit-writer.ts';
import type { Ctx } from './context.ts';
import { persistEvidence } from './evidence-store.ts';
import { transition, type CandidateRow } from './handoffs.ts';
import { schedule } from './queue.ts';
import { getCandidate, getRuntime } from './repo.ts';
import type { StageResult } from './stage-result.ts';

interface SnapRow {
  observed_at: number;
  price_usd: string | null;
  market_cap_usd: string | null;
  volume_m5: string | null;
  volume_h1: string | null;
  change_m5: string | null;
  change_h1: string | null;
  change_h6: string | null;
  buys_h1: number | null;
  sells_h1: number | null;
}

const num = (v: string | null | undefined) => (v === null || v === undefined ? null : Number(v));

/**
 * Analyst stage. Scores only Filter-approved candidates from observations persisted with real timestamps.
 * If the momentum series is still too short and the Filter approval has time left, the stage defers
 * instead of scoring on thin data.
 */
export async function processAnalyst(ctx: Ctx, candidateId: string): Promise<StageResult> {
  const c = await getCandidate(ctx.db, candidateId);
  if (!c) return { kind: 'SKIPPED', reason: 'candidate not found' };
  if (c.state !== 'ANALYST_PENDING') return { kind: 'SKIPPED', reason: `candidate is ${c.state}` };
  const { config: cfg } = await ctx.config();
  const now = ctx.clock.now();
  const assessment = await ctx.db.first<{ id: string; valid_until: number | null; summary: string }>(
    `SELECT id, valid_until, summary FROM token_security_assessments WHERE candidate_id = ? AND outcome = 'FILTER_APPROVED' ORDER BY completed_at DESC LIMIT 1`,
    [c.id],
  );
  const filterValidUntil = assessment?.valid_until ?? null;

  const windowStart = now - 30 * MINUTE;
  const series = await ctx.db.all<SnapRow>(
    `SELECT observed_at, price_usd, market_cap_usd, volume_m5, volume_h1, change_m5, change_h1, change_h6, buys_h1, sells_h1
     FROM market_snapshots WHERE pair_address = ? AND observed_at >= ? ORDER BY observed_at`,
    [c.pair_address, windowStart],
  );
  const minSamples = cfg.analyst.factors.momentum.minSamples;
  if (series.length < minSamples && filterValidUntil && filterValidUntil - now > 30_000) {
    return {
      kind: 'DEFER',
      untilMs: now + cfg.monitoring.candidateSnapshotSeconds * 1000,
      reason: `momentum series has ${series.length}/${minSamples} samples`,
    };
  }
  const latest = series[series.length - 1];
  const summary = JSON.parse(assessment?.summary ?? '{}') as {
    onChainLiquidityUsd?: string | null;
    sellImpactPct?: string | null;
  };

  // Trade flow and holder counts need an indexer; without one these stay null and score zero.
  const ev = new EvidenceCollector();
  let trades: TradeFlowInput['trades'] = null;
  let holderPoints: HolderPoint[] | null = null;
  const helius = ctx.providers.helius;
  if (helius.configured && latest?.price_usd) {
    try {
      trades = [];
      let before: string | undefined;
      for (let page = 0; page < 5; page++) {
        const res = await helius.transactions(c.pair_address, { before, limit: 100, type: 'SWAP' });
        ev.add(res, 'IDX_POOL_SWAPS', 'PROVIDER_CLAIM');
        for (const tx of res.data) {
          if (tx.failed || tx.timestamp < now - HOUR) continue;
          const t = tx.tokenTransfers.find((x) => x.mint === c.mint);
          if (!t) continue;
          const usd = Number(t.uiAmount) * Number(latest.price_usd);
          if (t.to === tx.feePayer)
            trades.push({ wallet: tx.feePayer, cluster: null, side: 'BUY', usd, at: tx.timestamp });
          else if (t.from === tx.feePayer)
            trades.push({ wallet: tx.feePayer, cluster: null, side: 'SELL', usd, at: tx.timestamp });
        }
        if (res.data.length < 100 || res.data[res.data.length - 1]!.timestamp < now - HOUR) break;
        before = res.data[res.data.length - 1]!.signature;
      }
      const hc = await helius.holderCount(c.mint);
      ev.add(hc, 'IDX_HOLDER_COUNT', 'PROVIDER_CLAIM');
      if (hc.data.complete) {
        await ctx.db.run(
          `INSERT INTO holder_snapshots (id, mint, observed_at, provider_id, total_supply, holder_count, classification) VALUES (?, ?, ?, 'helius', '0', ?, '[]')`,
          [newId('hs', now), c.mint, hc.provenance.observedAt, hc.data.holders],
        );
      }
    } catch (e) {
      ctx.log.warn('indexer data unavailable for analyst', { candidateId, error: (e as Error).message });
      trades = null;
    }
  }
  if (helius.configured) {
    const rows = await ctx.db.all<{ observed_at: number; holder_count: number }>(
      `SELECT observed_at, holder_count FROM holder_snapshots WHERE mint = ? AND holder_count IS NOT NULL AND observed_at >= ? ORDER BY observed_at`,
      [c.mint, now - 6 * HOUR],
    );
    holderPoints = rows.map((r) => ({ at: r.observed_at, holders: r.holder_count }));
  }
  const registry = await ctx.db.all<{ id: string; created_at: number }>(
    `SELECT id, created_at FROM wallet_clusters WHERE kind = 'SMART_WALLET' AND confidence = 'CONFIRMED' AND created_at <= ?`,
    [now],
  );
  const smartMembers = registry.length
    ? await ctx.db.all<{ wallet_a: string }>(
        `SELECT wallet_a FROM wallet_relationships WHERE relation = 'CLUSTER_MEMBER' AND cluster_id IN (${registry.map(() => '?').join(',')})`,
        registry.map((r) => r.id),
      )
    : [];

  const flow: TradeFlowInput = {
    trades,
    windowStart: now - HOUR,
    windowEnd: now,
    countBuys: latest?.buys_h1 ?? null,
    countSells: latest?.sells_h1 ?? null,
  };
  const factors = [
    momentumFactor(
      {
        change: { m5: num(latest?.change_m5), h1: num(latest?.change_h1), h6: num(latest?.change_h6) },
        volume: { m5: num(latest?.volume_m5), h1: num(latest?.volume_h1) },
        series: series
          .filter((s) => s.price_usd)
          .map((s) => ({ at: s.observed_at, priceUsd: Number(s.price_usd) })),
        observedAt: latest?.observed_at ?? now,
      },
      cfg.analyst.factors.momentum,
    ),
    uniqueBuyersFactor(flow, cfg.analyst.factors.uniqueBuyers),
    buySellValueFactor(flow, cfg.analyst.factors.buySellValueRatio),
    holderGrowthFactor(holderPoints, cfg.analyst.factors.holderGrowth),
    liquidityFactor(
      {
        onChainLiquidityUsd: num(summary.onChainLiquidityUsd),
        marketCapUsd: num(latest?.market_cap_usd),
        sellImpactPct: num(summary.sellImpactPct),
      },
      cfg.analyst.factors.liquidityToMcap,
    ),
    smartWalletFactor(
      {
        buyers: trades ? trades.filter((t) => t.side === 'BUY').map((t) => t.wallet) : null,
        registry: new Set(smartMembers.map((m) => m.wallet_a)),
        registryBuiltAt: registry.length ? Math.max(...registry.map((r) => r.created_at)) : null,
        decisionAt: now,
      },
      cfg.analyst.factors.smartWallets,
    ),
  ];
  const decision = decideAnalyst(factors, cfg.analyst, { now, filterValidUntil });
  if (ev.records.length) await ctx.db.batch(await persistEvidence(ctx.evidenceStore, ev.records));

  const scoreId = newId('as', now);
  const extra: Statement[] = [
    {
      sql: `INSERT INTO analyst_scores (id, candidate_id, mint, total_score, verified_weight, outcome, config_version, observed_at, scored_at, valid_until, reasons) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        scoreId,
        c.id,
        c.mint,
        decision.totalScore,
        String(decision.verifiedWeight),
        decision.outcome,
        c.config_version,
        latest?.observed_at ?? now,
        now,
        decision.validUntil,
        JSON.stringify(decision.reasons),
      ],
    },
    ...decision.factors.map((f) => ({
      sql: `INSERT INTO score_factors (id, score_id, factor, version, raw_metric, normalized, factor_score, weight, data_quality, window_start, window_end, evidence) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        `${scoreId}_${f.factor}`,
        scoreId,
        f.factor,
        f.version,
        f.rawMetric,
        f.normalized,
        f.score,
        String(f.weight),
        f.quality,
        f.windowStart,
        f.windowEnd,
        toJson(f.evidence),
      ],
    })),
    await auditStmt({
      category: 'SCORE',
      action: decision.outcome,
      actor: 'ANALYST',
      subjectType: 'candidate',
      subjectId: c.id,
      correlationId: c.correlation_id,
      detail: {
        score: decision.totalScore,
        verifiedWeight: decision.verifiedWeight,
        reasons: decision.reasons,
      },
      evidenceIds: ev.records.map((r) => r.id),
      at: now,
    }),
  ];
  if (decision.outcome === 'ANALYST_APPROVED') {
    const ub = factors.find((f) => f.factor === 'uniqueBuyers');
    extra.push({
      sql: `INSERT INTO opportunities (id, candidate_id, mint, score, data_quality, execution_depth_usd, buyer_clusters, signal_at, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)`,
      params: [
        newId('op', now),
        c.id,
        c.mint,
        decision.totalScore,
        String(decision.verifiedWeight),
        summary.onChainLiquidityUsd ?? null,
        ub?.rawMetric ? Number(ub.rawMetric) : null,
        now,
        now,
      ],
    });
  }
  const t = await transition(ctx.db, {
    candidate: c,
    next: decision.outcome,
    by: 'ANALYST',
    to: decision.outcome === 'ANALYST_APPROVED' ? 'RISK' : 'LOGGER',
    eventType: 'ANALYST_DECIDED',
    observedAt: latest?.observed_at ?? now,
    now,
    expiresAt: decision.validUntil,
    payload: {
      scoreId,
      score: decision.totalScore,
      verifiedWeight: decision.verifiedWeight,
      reasons: decision.reasons,
    },
    extra,
    set: { analyst_score: decision.totalScore, eligible_until: decision.validUntil },
  });
  if (t.status !== 'COMMITTED') return { kind: 'SKIPPED', reason: t.status };
  if (decision.outcome === 'ANALYST_APPROVED') {
    await rerank(ctx, now, `new opportunity ${c.id}`);
    const rt = await getRuntime(ctx.db);
    if (rt.mode === 'PAPER_AUTONOMOUS') {
      const row: CandidateRow = { ...c, state: 'ANALYST_APPROVED', state_version: c.state_version + 1 };
      const t2 = await transition(ctx.db, {
        candidate: row,
        next: 'RISK_PENDING',
        by: 'ANALYST',
        to: 'RISK',
        eventType: 'RISK_REQUESTED',
        observedAt: now,
        now,
        expiresAt: decision.validUntil,
      });
      if (t2.status === 'COMMITTED')
        await schedule(ctx, 'risk', `risk:${c.id}`, { candidateId: c.id }, now, c.id);
    }
  }
  return { kind: 'DONE', state: decision.outcome };
}

/** Recomputes ranks of active opportunities and records every change. */
export async function rerank(ctx: Ctx, now: number, reason: string): Promise<void> {
  const rows = await ctx.db.all<{
    id: string;
    candidate_id: string;
    score: string;
    data_quality: string;
    execution_depth_usd: string | null;
    buyer_clusters: number | null;
    signal_at: number;
    rank: number | null;
    state: string;
  }>(
    `SELECT o.id, o.candidate_id, o.score, o.data_quality, o.execution_depth_usd, o.buyer_clusters, o.signal_at, o.rank, c.state
     FROM opportunities o JOIN candidate_discoveries c ON c.id = o.candidate_id WHERE o.status = 'ACTIVE'`,
  );
  const ranked = rankOpportunities(
    rows.map((r) => ({
      ...r,
      eligible: ['ANALYST_APPROVED', 'RISK_PENDING', 'RISK_AUTHORIZED'].includes(r.state),
      score: Number(r.score),
      verifiedWeight: Number(r.data_quality),
      executionDepthUsd: Number(r.execution_depth_usd ?? 0),
      buyerClusters: r.buyer_clusters ?? 0,
      signalAt: r.signal_at,
    })),
  );
  const stmts: Statement[] = [];
  ranked.forEach((r, i) => {
    const rank = i + 1;
    if (r.rank !== rank) {
      stmts.push({
        sql: 'UPDATE opportunities SET rank = ?, updated_at = ? WHERE id = ?',
        params: [rank, now, r.id],
      });
      stmts.push({
        sql: 'INSERT INTO ranking_changes (id, opportunity_id, previous_rank, new_rank, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        params: [newId('rc', now), r.id, r.rank, rank, reason, now],
      });
    }
  });
  if (stmts.length) await ctx.db.batch(stmts);
}

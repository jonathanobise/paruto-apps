import { collectSeeds, evaluateBatch, type ScoutDecision, type ScoutSnapshot } from '@alpha-desk/discovery';
import type { SqlDb, Statement } from '@alpha-desk/db';
import { EvidenceCollector, type DexPair } from '@alpha-desk/providers';
import { buildHandoff, HOUR, MINUTE, newId, sha256Hex } from '@alpha-desk/shared';
import { auditStmt } from './audit-writer.ts';
import type { Ctx } from './context.ts';
import { persistEvidence } from './evidence-store.ts';
import { transition, type CandidateRow } from './handoffs.ts';
import { recordJob } from './health.ts';
import { schedule } from './queue.ts';
import { getRuntime } from './repo.ts';

export interface DiscoveryCycleResult {
  seeds: number;
  evaluated: number;
  discovered: number;
  rejected: number;
  skipped: number;
  errors: string[];
}

const s = (v: number | null | undefined) => (v === null || v === undefined ? null : String(v));

/** Statements that record a token, its pools and (optionally) a market snapshot. */
async function marketStmts(
  d: ScoutDecision,
  now: number,
  evidenceId: string,
): Promise<{ stmts: Statement[]; snapshotId: string | null }> {
  const stmts: Statement[] = [];
  const snap = d.snapshot;
  stmts.push({
    sql: `INSERT INTO tokens (mint, symbol, name, first_seen_at, last_seen_at, earliest_pool_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(mint) DO UPDATE SET symbol = COALESCE(excluded.symbol, symbol), name = COALESCE(excluded.name, name), last_seen_at = excluded.last_seen_at,
            earliest_pool_at = CASE WHEN earliest_pool_at IS NULL OR (excluded.earliest_pool_at IS NOT NULL AND excluded.earliest_pool_at < earliest_pool_at) THEN excluded.earliest_pool_at ELSE earliest_pool_at END,
            updated_at = excluded.updated_at`,
    params: [d.mint, snap?.symbol ?? null, snap?.name ?? null, now, now, snap?.earliestPoolAt ?? null, now],
  });
  for (const p of d.pools) {
    stmts.push({
      sql: `INSERT INTO token_pools (pair_address, mint, dex_id, pool_type, quote_mint, quote_symbol, pair_created_at, first_seen_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(pair_address) DO UPDATE SET last_seen_at = excluded.last_seen_at`,
      params: [
        p.pairAddress,
        d.mint,
        p.dexId,
        p.labels.join(',') || null,
        p.quoteMint,
        p.quoteSymbol,
        p.pairCreatedAt,
        now,
        now,
      ],
    });
  }
  let snapshotId: string | null = null;
  if (snap) {
    snapshotId = newId('ms', now);
    stmts.push(snapshotStmt(snapshotId, snap, now, now, evidenceId, await sha256Hex(JSON.stringify(snap))));
  }
  return { stmts, snapshotId };
}

export function snapshotStmt(
  id: string,
  snap: ScoutSnapshot,
  observedAt: number,
  ingestedAt: number,
  evidenceId: string | null,
  contentHash: string,
): Statement {
  return {
    sql: `INSERT OR IGNORE INTO market_snapshots (id, mint, pair_address, provider_id, external_id, observed_at, ingested_at, price_usd, price_native, market_cap_usd, fdv_usd,
            liquidity_usd, total_liquidity_usd, volume_m5, volume_h1, volume_h6, volume_h24, change_m5, change_h1, change_h6, change_h24,
            buys_h1, sells_h1, buys_h24, sells_h24, txns_h1, evidence_id)
          VALUES (?, ?, ?, 'dexscreener', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    params: [
      id,
      snap.mint,
      snap.pairAddress,
      `${snap.pairAddress}:${contentHash.slice(0, 32)}`,
      observedAt,
      ingestedAt,
      snap.priceUsd,
      snap.priceNative,
      s(snap.marketCapUsd),
      s(snap.fdvUsd),
      s(snap.liquidityUsd),
      s(snap.totalAccessibleLiquidityUsd),
      s(snap.volume.m5),
      s(snap.volume.h1),
      s(snap.volume.h6),
      s(snap.volume.h24),
      s(snap.priceChange.m5),
      s(snap.priceChange.h1),
      s(snap.priceChange.h6),
      s(snap.priceChange.h24),
      snap.txns.h1?.buys ?? null,
      snap.txns.h1?.sells ?? null,
      snap.txns.h24?.buys ?? null,
      snap.txns.h24?.sells ?? null,
      snap.txns.h1 ? snap.txns.h1.buys + snap.txns.h1.sells : null,
      evidenceId,
    ],
  };
}

/** Mints that already have an active run or were evaluated too recently to be worth re-checking. */
/**
 * Rules whose failure cannot change with time: who bought at launch (F009) and a developer's confirmed rug
 * history (F008) are facts about the past. A token that failed one is not re-checked under the same
 * strategy version, which saves the indexer credits a full check costs.
 */
export const PERMANENT_REJECTIONS = ['F008', 'F009'] as const;

async function recentlyEvaluated(
  db: SqlDb,
  mints: string[],
  now: number,
  reevaluateMinutes: number,
  configVersion: string,
): Promise<Set<string>> {
  const skip = new Set<string>();
  for (let i = 0; i < mints.length; i += 90) {
    const chunk = mints.slice(i, i + 90);
    const rows = await db.all<{
      mint: string;
      terminal: number;
      updated_at: number;
      rejection_codes: string | null;
    }>(
      `SELECT mint, terminal, updated_at, rejection_codes FROM candidate_discoveries
       WHERE mint IN (${chunk.map(() => '?').join(',')}) AND (terminal = 0 OR updated_at > ?)`,
      [...chunk, now - 6 * HOUR],
    );
    const permanent = await db.all<{ mint: string }>(
      `SELECT DISTINCT a.mint FROM token_security_assessments a
       JOIN security_rule_results r ON r.assessment_id = a.id
       WHERE a.mint IN (${chunk.map(() => '?').join(',')}) AND a.config_version = ?
         AND r.rule_id IN (${PERMANENT_REJECTIONS.map(() => '?').join(',')}) AND r.outcome = 'FAIL'`,
      [...chunk, configVersion, ...PERMANENT_REJECTIONS],
    );
    for (const p of permanent) skip.add(p.mint);
    for (const r of rows) {
      if (r.terminal === 0) skip.add(r.mint);
      else if ((r.rejection_codes ?? '').includes('PAIR_TOO_OLD')) skip.add(r.mint);
      else if (now - r.updated_at < reevaluateMinutes * MINUTE) skip.add(r.mint);
    }
  }
  return skip;
}

/**
 * One Scout cycle: collect seeds from the discovery feeds, verify each mint against DexScreener pair data,
 * record every decision (accepted and rejected) with its evidence, and hand accepted candidates to the
 * Filter through the work queue.
 */
export async function runDiscoveryCycle(ctx: Ctx): Promise<DiscoveryCycleResult> {
  const started = ctx.clock.now();
  const { config: cfg, configVersion } = await ctx.config();
  const rt = await getRuntime(ctx.db);
  const result: DiscoveryCycleResult = {
    seeds: 0,
    evaluated: 0,
    discovered: 0,
    rejected: 0,
    skipped: 0,
    errors: [],
  };
  if (rt.mode === 'STOPPED') return result;

  const seeds = await collectSeeds(
    ctx.providers.dex,
    ctx.providers.gecko,
    started,
    cfg.discovery.maxPairAgeHours,
    cfg.discovery.minPairAgeMinutes,
  );
  result.errors.push(...seeds.errors.map((e) => `${e.source}: ${e.error}`));
  result.seeds = seeds.mints.size;
  const all = [...seeds.mints.keys()];
  const skip = await recentlyEvaluated(
    ctx.db,
    all,
    started,
    cfg.discovery.reevaluateAfterMinutes,
    configVersion,
  );
  const todo = all.filter((m) => !skip.has(m)).slice(0, cfg.discovery.maxCandidatesPerCycle);
  result.skipped = all.length - todo.length;

  for (let i = 0; i < todo.length; i += 30) {
    const batch = todo.slice(i, i + 30);
    let pairs: DexPair[];
    const ev = new EvidenceCollector();
    let evidenceId: string;
    try {
      const obs = await ctx.providers.dex.tokens(batch);
      evidenceId = ev.add(obs, 'DEX_TOKENS', 'PROVIDER_CLAIM');
      pairs = obs.data;
    } catch (e) {
      result.errors.push(`dexscreener tokens: ${(e as Error).message}`);
      await ctx.db.batch([
        await auditStmt({
          category: 'API_ERROR',
          action: 'DEX_TOKENS_FAILED',
          actor: 'SCOUT',
          detail: { error: (e as Error).message, mints: batch.length },
          at: ctx.clock.now(),
        }),
      ]);
      continue;
    }
    const now = ctx.clock.now();
    await ctx.db.batch(await persistEvidence(ctx.evidenceStore, ev.records));
    const decisions = evaluateBatch(batch, pairs, now, cfg.discovery);
    for (const d of decisions) {
      result.evaluated++;
      const sources = [...(seeds.mints.get(d.mint) ?? [])].join(',');
      try {
        if (d.outcome === 'DISCOVERED') {
          const ok = await createCandidate(ctx, d, {
            now,
            evidenceId,
            sources,
            configVersion,
            strategyVersion: cfg.strategyVersion,
          });
          if (ok) result.discovered++;
          else result.skipped++;
        } else {
          await createCandidate(ctx, d, {
            now,
            evidenceId,
            sources,
            configVersion,
            strategyVersion: cfg.strategyVersion,
          });
          result.rejected++;
        }
      } catch (e) {
        result.errors.push(`${d.mint}: ${(e as Error).message}`);
      }
    }
  }
  await recordJob(ctx.db, 'scout', {
    now: ctx.clock.now(),
    // Supplementary feeds (GeckoTerminal) failing does not degrade the Scout; DexScreener failing does.
    ok: !result.errors.some((e) => e.startsWith('dexscreener')),
    error: result.errors[0] ?? null,
    processed: result.evaluated,
    rejected: result.rejected,
    latencyMs: ctx.clock.now() - started,
    instanceId: ctx.instanceId,
  });
  return result;
}

/** Inserts a candidate run with its creating handoff; accepted runs move straight to FILTER_PENDING. */
async function createCandidate(
  ctx: Ctx,
  d: ScoutDecision,
  o: { now: number; evidenceId: string; sources: string; configVersion: string; strategyVersion: string },
): Promise<boolean> {
  const id = newId('cd', o.now);
  const correlationId = newId('cor', o.now);
  const state = d.outcome;
  const { stmts, snapshotId } = await marketStmts(d, o.now, o.evidenceId);
  const snap = d.snapshot;
  const handoff = await buildHandoff({
    correlationId,
    candidateId: id,
    tokenMint: d.mint.length >= 32 && d.mint.length <= 44 ? d.mint : d.mint.padEnd(32, '?').slice(0, 44),
    source: 'SCOUT',
    destination: state === 'DISCOVERED' ? 'FILTER' : 'LOGGER',
    eventType: state === 'DISCOVERED' ? 'CANDIDATE_DISCOVERED' : 'CANDIDATE_REJECTED',
    previous: null,
    next: state,
    observedAt: o.now,
    generatedAt: o.now,
    evidenceIds: [o.evidenceId],
    configVersion: o.configVersion,
    strategyVersion: o.strategyVersion,
    payload: { reasons: d.reasons, ageMinutes: d.ageMinutes, sources: o.sources },
  });
  const body = JSON.stringify(handoff);
  const terminal = state === 'DISCOVERY_REJECTED' ? 1 : 0;
  const all: Statement[] = [
    ...stmts,
    {
      sql: `INSERT INTO candidate_discoveries (id, correlation_id, mint, pair_address, state, state_version, terminal, rejection_codes, source, snapshot_id, config_version,
              strategy_version, pair_created_at, earliest_pool_at, market_cap_usd, fdv_usd, liquidity_usd, volume_1h_usd, price_change_1h_pct, discovered_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        id,
        correlationId,
        d.mint,
        snap?.pairAddress ?? d.pools[0]?.pairAddress ?? 'unknown',
        state,
        terminal,
        JSON.stringify(d.reasons),
        o.sources,
        snapshotId,
        o.configVersion,
        o.strategyVersion,
        snap?.pairCreatedAt ?? null,
        snap?.earliestPoolAt ?? null,
        s(snap?.marketCapUsd),
        s(snap?.fdvUsd),
        s(snap?.liquidityUsd),
        s(snap?.volume.h1),
        s(snap?.priceChange.h1),
        o.now,
        o.now,
      ],
    },
    {
      sql: `INSERT INTO handoff_events (event_id, idempotency_key, correlation_id, candidate_id, token_mint, source_agent, destination_agent, event_type,
              previous_state, next_state, observed_at, generated_at, expires_at, config_version, strategy_version, body, checksum)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, NULL, ?, ?, ?, ?)`,
      params: [
        handoff.event_id,
        handoff.idempotency_key,
        correlationId,
        id,
        d.mint,
        'SCOUT',
        handoff.destination_agent,
        handoff.event_type,
        state,
        o.now,
        o.now,
        o.configVersion,
        o.strategyVersion,
        body,
        await sha256Hex(body),
      ],
    },
    await auditStmt({
      category: 'DISCOVERY',
      action: state,
      actor: 'SCOUT',
      subjectType: 'candidate',
      subjectId: id,
      correlationId,
      detail: { mint: d.mint, reasons: d.reasons, ageMinutes: d.ageMinutes },
      evidenceIds: [o.evidenceId],
      at: o.now,
    }),
  ];
  try {
    await ctx.db.batch(all);
  } catch (e) {
    // The unique index allows one active run per token: a concurrent cycle already created it.
    if (/UNIQUE|constraint/i.test((e as Error).message)) return false;
    throw e;
  }
  if (state === 'DISCOVERED') {
    const row: CandidateRow = {
      id,
      correlation_id: correlationId,
      mint: d.mint,
      pair_address: snap!.pairAddress,
      state,
      state_version: 1,
      config_version: o.configVersion,
      strategy_version: o.strategyVersion,
    };
    const t = await transition(ctx.db, {
      candidate: row,
      next: 'FILTER_PENDING',
      by: 'SCOUT',
      to: 'FILTER',
      eventType: 'FILTER_REQUESTED',
      observedAt: o.now,
      now: o.now,
      evidenceIds: [o.evidenceId],
    });
    if (t.status === 'COMMITTED')
      await schedule(ctx, 'filter', `filter:${id}`, { candidateId: id }, o.now, id);
  }
  return true;
}

import type { Statement } from '@alpha-desk/db';
import { gatherSecurityEvidence, runFilter } from '@alpha-desk/security';
import { Decimal, microToUsd, newId, toJson } from '@alpha-desk/shared';
import { auditStmt } from './audit-writer.ts';
import type { Ctx } from './context.ts';
import { persistEvidence } from './evidence-store.ts';
import { transition, type CandidateRow } from './handoffs.ts';
import { schedule } from './queue.ts';
import { equityOf, getCandidate, getRuntime } from './repo.ts';
import type { StageResult } from './stage-result.ts';

/**
 * Filter stage: gathers on-chain and provider evidence, runs rules F001–F018, stores the full rule-by-rule
 * matrix and moves the candidate to FILTER_APPROVED / REJECTED / UNVERIFIED / ERROR. Only an approval is
 * handed to the Analyst.
 */
export async function processFilter(ctx: Ctx, candidateId: string): Promise<StageResult> {
  const c = await getCandidate(ctx.db, candidateId);
  if (!c) return { kind: 'SKIPPED', reason: 'candidate not found' };
  if (c.state !== 'FILTER_PENDING') return { kind: 'SKIPPED', reason: `candidate is ${c.state}` };
  const { config: cfg, configVersion } = await ctx.config();
  const started = ctx.clock.now();
  if (c.config_version !== configVersion) {
    await transition(ctx.db, {
      candidate: c,
      next: 'EXPIRED',
      by: 'SYSTEM',
      to: 'LOGGER',
      eventType: 'CONFIG_SUPERSEDED',
      observedAt: started,
      now: started,
    });
    return { kind: 'DONE', state: 'EXPIRED' };
  }
  const rt = await getRuntime(ctx.db);
  const eq = rt.active_portfolio_id ? await equityOf(ctx.db, rt.active_portfolio_id) : null;
  const maxPositionUsd = eq
    ? microToUsd(eq.equity).mul(cfg.risk.maxAllocationPct).div(100)
    : new Decimal(cfg.risk.startingEquityUsd).mul(cfg.risk.maxAllocationPct).div(100);
  const pools = await ctx.db.all<{ pair_address: string }>(
    'SELECT pair_address FROM token_pools WHERE mint = ? AND pair_address <> ?',
    [c.mint, c.pair_address],
  );

  const { evidence, records } = await gatherSecurityEvidence(
    {
      rpc: ctx.providers.rpc,
      dex: ctx.providers.dex,
      jupiter: ctx.providers.jupiter,
      rugcheck: ctx.providers.rugcheck,
      helius: ctx.providers.helius,
      solPrice: ctx.solPrice,
      clock: ctx.clock,
    },
    {
      mint: c.mint,
      pairAddress: c.pair_address,
      pairCreatedAt: (c.pair_created_at as number | null) ?? null,
      otherPoolAddresses: pools.map((p) => p.pair_address),
      maxPositionUsd,
      cfg,
    },
  );
  const now = ctx.clock.now();
  const decision = runFilter(evidence, cfg.filter, now);
  await ctx.db.batch(await persistEvidence(ctx.evidenceStore, records));

  const assessmentId = newId('sa', now);
  const m = evidence.mintFacts.value;
  const p = evidence.pool.value;
  const summary = {
    tokenProgram: m?.tokenProgram ?? null,
    decimals: m?.decimals ?? null,
    supply: m?.supply.toString() ?? null,
    poolType: p?.decoded?.poolType ?? null,
    poolProgram: p?.programOwner ?? null,
    quoteMint: p?.decoded ? (p.decoded.baseMint === c.mint ? p.decoded.quoteMint : p.decoded.baseMint) : null,
    onChainLiquidityUsd: p?.onChainLiquidityUsd ?? null,
    lpNonWithdrawablePct: p?.lp?.nonWithdrawablePct ?? null,
    sellImpactPct: evidence.route.value?.priceImpactPct ?? null,
    sizedSellPriceUsd: evidence.route.value?.sizedPriceUsd ?? null,
    smallSellPriceUsd: evidence.route.value?.smallPriceUsd ?? null,
    deployer: evidence.developer.value?.deployer ?? null,
    failed: decision.failed,
    unverified: decision.unverified,
    errors: decision.errors,
  };
  const extra: Statement[] = [
    {
      sql: `INSERT INTO token_security_assessments (id, candidate_id, mint, outcome, config_version, observed_at, completed_at, valid_until, slot, summary)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        assessmentId,
        c.id,
        c.mint,
        decision.outcome,
        configVersion,
        decision.observedAt,
        now,
        decision.validUntil,
        records.find((r) => r.slot)?.slot ?? null,
        JSON.stringify(summary),
      ],
    },
    ...decision.results.map((r) => ({
      sql: `INSERT INTO security_rule_results (id, assessment_id, rule_id, outcome, observed, threshold, reason, evidence_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        `${assessmentId}_${r.ruleId}`,
        assessmentId,
        r.ruleId,
        r.outcome,
        toJson(r.observed ?? null),
        r.threshold,
        r.reason.slice(0, 2000),
        JSON.stringify(r.evidenceIds),
      ],
    })),
    {
      sql: 'UPDATE tokens SET token_program = COALESCE(?, token_program), decimals = COALESCE(?, decimals), updated_at = ? WHERE mint = ?',
      params: [m?.tokenProgram ?? null, m?.decimals ?? null, now, c.mint],
    },
    {
      sql: 'UPDATE token_pools SET pool_program = ?, pool_type = COALESCE(?, pool_type) WHERE pair_address = ?',
      params: [
        p?.programOwner ?? null,
        p?.decoded?.poolType ?? (p ? `UNSUPPORTED:${p.programOwner.slice(0, 8)}` : null),
        c.pair_address,
      ],
    },
  ];
  const h = evidence.holders.value;
  if (h && m) {
    extra.push({
      sql: `INSERT INTO holder_snapshots (id, mint, observed_at, slot, provider_id, total_supply, circulating_supply, holder_count, top10_pct_lower_bound, top10_pct_clustered, classification, evidence_id)
            VALUES (?, ?, ?, NULL, 'solana-rpc', ?, ?, NULL, ?, ?, ?, NULL)`,
      params: [
        newId('hs', now),
        c.mint,
        evidence.holders.observedAt ?? now,
        h.totalSupply,
        h.circulatingSupply,
        h.top10PctLowerBound,
        h.top10PctClustered,
        toJson(h.holdings.map((x) => ({ a: x.tokenAccount, o: x.owner, c: x.class, amt: x.amount }))),
      ],
    });
  }
  const d = evidence.developer.value;
  if (d) {
    extra.push({
      sql: `INSERT INTO developer_histories (id, mint, deployer, linked_wallets, developer_ownership_pct, prior_tokens, confirmed_rugs, status, findings, observed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        newId('dh', now),
        c.mint,
        d.deployer,
        JSON.stringify(d.links),
        d.ownershipPct ?? d.ownershipPctLowerBound,
        d.priorTokens.length,
        d.rugFindings.length,
        d.ownershipStatus === 'FAIL' || d.historyStatus === 'FAIL'
          ? 'FAIL'
          : d.ownershipStatus === 'PASS' && d.historyStatus === 'PASS'
            ? 'PASS'
            : 'UNVERIFIED',
        toJson({ rugs: d.rugFindings, notes: d.notes, source: d.deployerSource }),
        now,
      ],
    });
  }
  const b = evidence.bundle.value;
  if (b) {
    extra.push({
      sql: `INSERT INTO launch_bundle_assessments (id, mint, pair_address, window_seconds, bundled_pct, linked_buyers, status, findings, observed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        newId('lb', now),
        c.mint,
        c.pair_address,
        b.windowSeconds,
        b.bundledPct,
        b.coordinatedGroups.reduce((s, g) => s + g.wallets.length, 0),
        b.status,
        toJson({ groups: b.coordinatedGroups, notes: b.notes }),
        now,
      ],
    });
  }
  extra.push(
    await auditStmt({
      category: 'RULE',
      action: decision.outcome,
      actor: 'FILTER',
      subjectType: 'candidate',
      subjectId: c.id,
      correlationId: c.correlation_id,
      detail: {
        failed: decision.failed,
        unverified: decision.unverified,
        errors: decision.errors,
        latencyMs: now - started,
      },
      evidenceIds: records.map((r) => r.id),
      at: now,
    }),
  );

  const t = await transition(ctx.db, {
    candidate: c,
    next: decision.outcome,
    by: 'FILTER',
    to: decision.outcome === 'FILTER_APPROVED' ? 'ANALYST' : 'LOGGER',
    eventType: 'FILTER_DECIDED',
    observedAt: decision.observedAt,
    now,
    expiresAt: decision.validUntil,
    evidenceIds: records.map((r) => r.id),
    payload: {
      assessmentId,
      failed: decision.failed,
      unverified: decision.unverified,
      errors: decision.errors,
    },
    extra,
    set: {
      filter_status: decision.outcome,
      eligible_until: decision.validUntil,
      rejection_codes: JSON.stringify([...decision.failed, ...decision.unverified, ...decision.errors]),
    },
  });
  if (t.status !== 'COMMITTED') return { kind: 'SKIPPED', reason: t.status };
  if (decision.outcome === 'FILTER_APPROVED') {
    const row: CandidateRow = { ...c, state: 'FILTER_APPROVED', state_version: c.state_version + 1 };
    const t2 = await transition(ctx.db, {
      candidate: row,
      next: 'ANALYST_PENDING',
      by: 'FILTER',
      to: 'ANALYST',
      eventType: 'ANALYST_REQUESTED',
      observedAt: now,
      now,
      expiresAt: decision.validUntil,
    });
    if (t2.status === 'COMMITTED')
      await schedule(ctx, 'analyst', `analyst:${c.id}`, { candidateId: c.id }, now, c.id);
  }
  return { kind: 'DONE', state: decision.outcome };
}

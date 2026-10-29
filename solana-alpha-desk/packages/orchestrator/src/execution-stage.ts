import { big, type Statement } from '@alpha-desk/db';
import {
  closeMath,
  estimateNetworkFee,
  FILL_MODEL_VERSION,
  simulateFill,
  type FeeEstimate,
} from '@alpha-desk/execution';
import { buyJournal, sellJournal } from '@alpha-desk/ledger';
import { buyQuote, EvidenceCollector, quotePriceUsd, sellQuote } from '@alpha-desk/providers';
import { authorize, initialStop, validateAuthorization, type StoredAuthorization } from '@alpha-desk/risk';
import { Decimal, microToUsd, newId, toBaseUnits, toJson, usdToMicro } from '@alpha-desk/shared';
import { alertStmt, auditStmt } from './audit-writer.ts';
import { journalStmts, localDate } from './bootstrap.ts';
import type { Ctx } from './context.ts';
import { persistEvidence } from './evidence-store.ts';
import {
  advanced,
  commitTransitions,
  guardStmt,
  GUARD_CLEANUP,
  transition,
  transitionStatements,
  type CandidateRow,
} from './handoffs.ts';
import { schedule } from './queue.ts';
import {
  activeBreakers,
  equityOf,
  getCandidate,
  getPortfolio,
  getRuntime,
  type PositionRow,
} from './repo.ts';
import type { StageResult } from './stage-result.ts';

/** Optimistic portfolio lock (ADR-3): the batch aborts if another commit took this version first. */
export function portfolioCas(portfolioId: string, version: number, reason: string, now: number): Statement[] {
  return [
    guardStmt('EXISTS (SELECT 1 FROM portfolios WHERE id = ? AND version = ?)', [portfolioId, version]),
    {
      sql: 'INSERT INTO portfolio_versions (portfolio_id, version, committed_at, reason) VALUES (?, ?, ?, ?)',
      params: [portfolioId, version + 1, now, reason],
    },
    {
      sql: 'UPDATE portfolios SET version = version + 1 WHERE id = ? AND version = ?',
      params: [portfolioId, version],
    },
  ];
}

/**
 * Commits an execution-plane batch under the portfolio lock, re-reading the version and rebuilding the
 * batch if another commit won the race (bounded retries).
 */
async function commitUnderLock(
  ctx: Ctx,
  portfolioId: string,
  reason: string,
  build: () => Promise<{
    stmts: Statement[];
    transitions: Array<{
      candidate: CandidateRow;
      event: Awaited<ReturnType<typeof transitionStatements>>['event'];
    }>;
  }>,
): Promise<Awaited<ReturnType<typeof commitTransitions>>> {
  let last: unknown;
  for (let i = 0; i < 4; i++) {
    const portfolio = await getPortfolio(ctx.db, portfolioId);
    const { stmts, transitions } = await build();
    try {
      return await commitTransitions(
        ctx.db,
        [...portfolioCas(portfolioId, portfolio.version, reason, ctx.clock.now()), ...stmts, GUARD_CLEANUP],
        transitions,
      );
    } catch (e) {
      last = e;
      const now = await getPortfolio(ctx.db, portfolioId);
      if (now.version === portfolio.version) throw e; // not a lock conflict
    }
  }
  throw last;
}

async function feeEstimate(ctx: Ctx, accounts: string[]): Promise<FeeEstimate> {
  const { config: cfg } = await ctx.config();
  const sol = await ctx.solPrice.get(ctx.clock.now());
  let fees: number[];
  try {
    fees = (await ctx.providers.rpc.getRecentPrioritizationFees(accounts.slice(0, 5))).data;
  } catch {
    fees = []; // the floor in config still applies
  }
  return estimateNetworkFee(fees, sol.price, cfg.execution);
}

async function tradesToday(ctx: Ctx, portfolioId: string, tz: string): Promise<number> {
  const today = localDate(ctx.clock.now(), tz);
  const rows = await ctx.db.all<{ created_at: number }>(
    `SELECT created_at FROM paper_orders WHERE portfolio_id = ? AND side = 'BUY' AND status = 'FILLED' AND created_at > ?`,
    [portfolioId, ctx.clock.now() - 36 * 3_600_000],
  );
  return rows.filter((r) => localDate(r.created_at, tz) === today).length;
}

/**
 * Risk stage: independent pre-trade authorization with fresh executable quotes, sizing and every
 * portfolio limit. Writes a proposed order and a risk authorization row for every verdict.
 */
export async function processRisk(ctx: Ctx, candidateId: string): Promise<StageResult> {
  const c = await getCandidate(ctx.db, candidateId);
  if (!c) return { kind: 'SKIPPED', reason: 'candidate not found' };
  if (c.state !== 'RISK_PENDING') return { kind: 'SKIPPED', reason: `candidate is ${c.state}` };
  const { config: cfg, configVersion } = await ctx.config();
  const rt = await getRuntime(ctx.db);
  const portfolioId = rt.active_portfolio_id!;
  const ev = new EvidenceCollector();
  const token = await ctx.db.first<{ decimals: number | null; symbol: string | null }>(
    'SELECT decimals, symbol FROM tokens WHERE mint = ?',
    [c.mint],
  );
  const assessment = await ctx.db.first<{ summary: string }>(
    `SELECT summary FROM token_security_assessments WHERE candidate_id = ? AND outcome = 'FILTER_APPROVED' ORDER BY completed_at DESC LIMIT 1`,
    [c.id],
  );
  const score = await ctx.db.first<{ valid_until: number | null }>(
    `SELECT valid_until FROM analyst_scores WHERE candidate_id = ? AND outcome = 'ANALYST_APPROVED' ORDER BY scored_at DESC LIMIT 1`,
    [c.id],
  );
  const summary = JSON.parse(assessment?.summary ?? '{}') as { onChainLiquidityUsd?: string };
  const decimals = token?.decimals;
  const eq = await equityOf(ctx.db, portfolioId);
  const reasons: string[] = [];

  let refPrice = new Decimal(0);
  let entryCostPct = new Decimal(100);
  let exitCostPct = new Decimal(100);
  let quoteAt = 0;
  let quoteEvidence: string | null = null;
  let fee: FeeEstimate | null = null;
  try {
    if (decimals === null || decimals === undefined) throw new Error('token decimals unknown');
    const pair = await ctx.providers.dex.pair(c.pair_address);
    ev.add(pair, 'DEX_PAIR', 'PROVIDER_CLAIM');
    const last = new Decimal(pair.data?.priceUsd ?? '0');
    if (last.lte(0)) throw new Error('no last-trade price');
    const plannedUsd = microToUsd(eq.equity).mul(cfg.risk.maxAllocationPct).div(100);
    const small = await buyQuote(ctx.providers.jupiter, c.mint, 20_000_000n, cfg.execution.slippageBps);
    ev.add(small, 'JUP_BUY_QUOTE_REFERENCE', 'DERIVED');
    const sized = await buyQuote(
      ctx.providers.jupiter,
      c.mint,
      usdToMicro(plannedUsd),
      cfg.execution.slippageBps,
    );
    quoteEvidence = ev.add(sized, 'JUP_BUY_QUOTE_SIZED', 'DERIVED');
    const sellAmt = toBaseUnits(plannedUsd.div(last), decimals);
    const sell = await sellQuote(
      ctx.providers.jupiter,
      c.mint,
      sellAmt > 0n ? sellAmt : 1n,
      cfg.execution.slippageBps,
    );
    ev.add(sell, 'JUP_SELL_QUOTE_SIZED', 'DERIVED');
    fee = await feeEstimate(ctx, [c.pair_address]);
    const feePct = plannedUsd.gt(0) ? microToUsd(fee.usdMicro).div(plannedUsd).mul(100) : new Decimal(0);
    refPrice = quotePriceUsd(small.data, decimals, 'BUY');
    const sizedBuy = quotePriceUsd(sized.data, decimals, 'BUY');
    const sizedSell = quotePriceUsd(sell.data, decimals, 'SELL');
    entryCostPct = Decimal.max(0, sizedBuy.div(last).sub(1).mul(100)).add(feePct);
    exitCostPct = Decimal.max(0, new Decimal(1).sub(sizedSell.div(last)).mul(100)).add(feePct);
    quoteAt = sized.provenance.observedAt;
  } catch (e) {
    reasons.push(`pre-trade quotes unavailable: ${(e as Error).message.slice(0, 200)}`);
  }
  const now = ctx.clock.now();
  if (ev.records.length) await ctx.db.batch(await persistEvidence(ctx.evidenceStore, ev.records));

  const positions = eq.positions;
  const verdict = reasons.length
    ? { decision: 'RISK_REJECTED' as const, reasons, sizing: null, maxNotionalMicro: 0n, expiresAt: now }
    : authorize(
        {
          mint: c.mint,
          portfolioId,
          proposedOrderId: '',
          referencePriceUsd: refPrice,
          sizing: {
            equityMicro: eq.equity,
            cashMicro: eq.cash,
            openExposureMicro: eq.positionsValue,
            estEntryCostPct: entryCostPct,
            estExitCostPct: exitCostPct,
            liquidityUsd: new Decimal(summary.onChainLiquidityUsd ?? '0'),
            feeReserveMicro: (fee?.usdMicro ?? 0n) * 2n,
          },
        },
        {
          now,
          mode: rt.mode,
          manualApproval: rt.mode === 'PAPER_MANUAL',
          activeBreakers: await activeBreakers(ctx.db, portfolioId),
          entriesPausedReason: rt.entries_paused_reason,
          openPositions: positions.length,
          openMints: new Set(positions.map((p) => p.mint)),
          tradesToday: await tradesToday(ctx, portfolioId, rt.timezone),
          analystValidUntil: score?.valid_until ?? null,
          quoteObservedAt: quoteAt,
          configVersion: c.config_version,
          activeConfigVersion: configVersion,
        },
        cfg.risk,
      );

  const orderId = newId('po', now);
  const authId = newId('ra', now);
  const extra: Statement[] = [
    {
      sql: `INSERT INTO proposed_orders (id, candidate_id, portfolio_id, mint, side, requested_notional_micro, reference_price_usd, quote_evidence_id, sizing, status, config_version, created_at)
            VALUES (?, ?, ?, ?, 'BUY', ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        orderId,
        c.id,
        portfolioId,
        c.mint,
        verdict.maxNotionalMicro.toString(),
        refPrice.toString(),
        quoteEvidence,
        toJson({
          ...verdict.sizing,
          entryCostPct: entryCostPct.toFixed(4),
          exitCostPct: exitCostPct.toFixed(4),
          feeMicro: fee?.usdMicro ?? null,
        }),
        verdict.decision === 'RISK_AUTHORIZED' ? 'AUTHORIZED' : 'REJECTED',
        c.config_version,
        now,
      ],
    },
    {
      sql: `INSERT INTO risk_authorizations (id, proposed_order_id, portfolio_id, mint, max_notional_micro, reference_price_usd, config_version, decision, reasons, issued_at, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        authId,
        orderId,
        portfolioId,
        c.mint,
        verdict.maxNotionalMicro.toString(),
        refPrice.toString(),
        c.config_version,
        verdict.decision,
        JSON.stringify(verdict.reasons),
        now,
        verdict.expiresAt,
      ],
    },
    await auditStmt({
      category: 'RISK',
      action: verdict.decision,
      actor: 'RISK',
      subjectType: 'candidate',
      subjectId: c.id,
      correlationId: c.correlation_id,
      detail: { reasons: verdict.reasons, sizing: verdict.sizing, authorizationId: authId },
      evidenceIds: ev.records.map((r) => r.id),
      at: now,
    }),
  ];
  const t = await transition(ctx.db, {
    candidate: c,
    next: verdict.decision,
    by: 'RISK',
    to: verdict.decision === 'RISK_AUTHORIZED' ? 'EXECUTOR' : 'LOGGER',
    eventType: 'RISK_DECIDED',
    observedAt: quoteAt || now,
    now,
    expiresAt: verdict.decision === 'RISK_AUTHORIZED' ? verdict.expiresAt : null,
    evidenceIds: ev.records.map((r) => r.id),
    payload: {
      authorizationId: authId,
      maxNotionalMicro: verdict.maxNotionalMicro.toString(),
      reasons: verdict.reasons,
    },
    extra,
  });
  if (t.status !== 'COMMITTED') return { kind: 'SKIPPED', reason: t.status };
  if (verdict.decision === 'RISK_AUTHORIZED')
    await schedule(
      ctx,
      'execute',
      `execute:${c.id}`,
      { candidateId: c.id, authorizationId: authId },
      now,
      c.id,
    );
  return { kind: 'DONE', state: verdict.decision };
}

async function loadAuthorization(ctx: Ctx, id: string): Promise<StoredAuthorization | null> {
  const r = await ctx.db.first<Record<string, string | number | null>>(
    'SELECT * FROM risk_authorizations WHERE id = ?',
    [id],
  );
  if (!r) return null;
  return {
    id: String(r.id),
    portfolioId: String(r.portfolio_id),
    mint: String(r.mint),
    proposedOrderId: String(r.proposed_order_id),
    maxNotionalMicro: big(r.max_notional_micro),
    referencePriceUsd: new Decimal(String(r.reference_price_usd)),
    configVersion: String(r.config_version),
    decision: r.decision as StoredAuthorization['decision'],
    expiresAt: Number(r.expires_at),
    consumedAt: r.consumed_at === null ? null : Number(r.consumed_at),
    invalidatedAt: r.invalidated_at === null ? null : Number(r.invalidated_at),
  };
}

/**
 * Executor entry: re-validates the single-use authorization against a fresh quote, consumes it while
 * creating the PENDING order (atomically, so it can never be used twice), simulates the fill, and commits
 * fill + position + stop + ledger under the portfolio lock.
 */
export async function processEntry(
  ctx: Ctx,
  candidateId: string,
  authorizationId: string,
): Promise<StageResult> {
  const c = await getCandidate(ctx.db, candidateId);
  if (!c) return { kind: 'SKIPPED', reason: 'candidate not found' };
  if (c.state !== 'RISK_AUTHORIZED') return { kind: 'SKIPPED', reason: `candidate is ${c.state}` };
  const { config: cfg, configVersion } = await ctx.config();
  const auth = await loadAuthorization(ctx, authorizationId);
  const token = await ctx.db.first<{ decimals: number; symbol: string | null }>(
    'SELECT decimals, symbol FROM tokens WHERE mint = ?',
    [c.mint],
  );
  const ev = new EvidenceCollector();
  const decimals = token?.decimals ?? 0;

  let currentRef = new Decimal(0);
  try {
    const q = await buyQuote(ctx.providers.jupiter, c.mint, 20_000_000n, cfg.execution.slippageBps);
    ev.add(q, 'JUP_BUY_QUOTE_REVALIDATION', 'DERIVED');
    currentRef = quotePriceUsd(q.data, decimals, 'BUY');
  } catch {
    /* validation below fails on a zero reference */
  }
  const now = ctx.clock.now();
  const check = validateAuthorization(
    auth,
    {
      now,
      mint: c.mint,
      portfolioId: auth?.portfolioId ?? '',
      proposedOrderId: auth?.proposedOrderId ?? '',
      notionalMicro: auth?.maxNotionalMicro ?? 0n,
      currentReferencePriceUsd: currentRef,
      activeConfigVersion: configVersion,
    },
    cfg.risk,
  );
  const refuse = (why: string) => {
    check.reasons.push(why);
    check.valid = false;
  };
  if (currentRef.lte(0)) refuse('no fresh executable route');
  const rt = await getRuntime(ctx.db);
  if (rt.mode === 'EMERGENCY_PAUSED' || rt.mode === 'STOPPED' || rt.mode === 'DISCOVERY_ONLY')
    refuse(`runtime mode ${rt.mode}`);
  if (auth && (await activeBreakers(ctx.db, auth.portfolioId)).length) refuse('circuit breaker active');
  if (ev.records.length) await ctx.db.batch(await persistEvidence(ctx.evidenceStore, ev.records));

  if (!check.valid || !auth) {
    await transition(ctx.db, {
      candidate: c,
      next: 'EXPIRED',
      by: 'RISK',
      to: 'LOGGER',
      eventType: 'AUTHORIZATION_INVALIDATED',
      observedAt: now,
      now,
      payload: { reasons: check.reasons },
      extra: auth
        ? [
            {
              sql: 'UPDATE risk_authorizations SET invalidated_at = ?, invalidated_reason = ? WHERE id = ? AND invalidated_at IS NULL AND consumed_at IS NULL',
              params: [now, check.reasons.join('; '), auth.id],
            },
          ]
        : [],
    });
    return { kind: 'DONE', state: 'EXPIRED' };
  }

  // Consume the authorization and create the order in one atomic step.
  const orderId = newId('ord', now);
  const t1 = await transition(ctx.db, {
    candidate: c,
    next: 'PAPER_ORDER_PENDING',
    by: 'EXECUTOR',
    to: 'EXECUTOR',
    eventType: 'ORDER_SUBMITTED',
    observedAt: now,
    now,
    payload: { orderId, authorizationId: auth.id },
    extra: [
      guardStmt(
        'EXISTS (SELECT 1 FROM risk_authorizations WHERE id = ? AND consumed_at IS NULL AND invalidated_at IS NULL AND expires_at > ?)',
        [auth.id, now],
      ),
      {
        sql: 'UPDATE risk_authorizations SET consumed_at = ?, consumed_by_order = ? WHERE id = ?',
        params: [now, orderId, auth.id],
      },
      { sql: `UPDATE proposed_orders SET status = 'CONSUMED' WHERE id = ?`, params: [auth.proposedOrderId] },
      {
        sql: `INSERT INTO paper_orders (id, portfolio_id, authorization_id, candidate_id, mint, side, kind, reason, requested_in_amount, status, idempotency_key, config_version, strategy_version, created_at)
              VALUES (?, ?, ?, ?, ?, 'BUY', 'MARKET', 'ENTRY', ?, 'PENDING', ?, ?, ?, ?)`,
        params: [
          orderId,
          auth.portfolioId,
          auth.id,
          c.id,
          c.mint,
          auth.maxNotionalMicro.toString(),
          `entry:${auth.id}`,
          c.config_version,
          c.strategy_version,
          now,
        ],
      },
      await auditStmt({
        category: 'ORDER',
        action: 'PAPER_ORDER_PENDING',
        actor: 'EXECUTOR',
        subjectType: 'order',
        subjectId: orderId,
        correlationId: c.correlation_id,
        detail: { side: 'BUY', notionalMicro: auth.maxNotionalMicro.toString() },
        at: now,
      }),
    ],
  });
  if (t1.status !== 'COMMITTED') return { kind: 'SKIPPED', reason: t1.status };
  const pending = advanced(c, 'PAPER_ORDER_PENDING');

  const fee = await feeEstimate(ctx, [c.pair_address]);
  const fillEv = new EvidenceCollector();
  const fill = await simulateFill(
    {
      jupiter: ctx.providers.jupiter,
      clock: ctx.clock,
      sleep: ctx.sleep,
      evidence: fillEv,
      latencyMs: cfg.execution.simulatedLatencyMs,
    },
    {
      side: 'BUY',
      mint: c.mint,
      tokenDecimals: decimals,
      amountIn: auth.maxNotionalMicro,
      slippageBps: cfg.execution.slippageBps,
      fee,
    },
  );
  // Executable exit reference right after entry: what the position could be sold for.
  let entryRef: Decimal | null = null;
  if (fill.status === 'FILLED') {
    try {
      const q = await sellQuote(ctx.providers.jupiter, c.mint, fill.tokenQuantity, cfg.execution.slippageBps);
      fillEv.add(q, 'JUP_ENTRY_REFERENCE', 'DERIVED');
      entryRef = quotePriceUsd(q.data, decimals, 'SELL');
    } catch {
      entryRef = null;
    }
  }
  const t = ctx.clock.now();
  await ctx.db.batch(await persistEvidence(ctx.evidenceStore, fillEv.records));

  if (fill.status !== 'FILLED') {
    const st = await transitionStatements({
      candidate: pending,
      next: 'PAPER_REJECTED',
      by: 'EXECUTOR',
      to: 'LOGGER',
      eventType: 'ORDER_FAILED',
      observedAt: t,
      now: t,
      payload: { orderId, reason: fill.reason },
    });
    await commitTransitions(
      ctx.db,
      [
        ...st.stmts,
        {
          sql: `UPDATE paper_orders SET status = ?, failure_reason = ?, resolved_at = ? WHERE id = ? AND status = 'PENDING'`,
          params: [fill.status === 'REJECTED' ? 'REJECTED' : 'FAILED', fill.reason, t, orderId],
        },
        await auditStmt({
          category: 'ORDER',
          action: `PAPER_${fill.status}`,
          actor: 'EXECUTOR',
          subjectType: 'order',
          subjectId: orderId,
          correlationId: c.correlation_id,
          detail: { reason: fill.reason },
          evidenceIds: fillEv.records.map((r) => r.id),
          at: t,
        }),
        GUARD_CLEANUP,
      ],
      [{ candidate: pending, event: st.event }],
    );
    return { kind: 'DONE', state: 'PAPER_REJECTED' };
  }

  const reference =
    entryRef ?? fill.priceUsd.mul(new Decimal(1).sub(new Decimal(cfg.risk.executionBufferPct).div(100)));
  const stop = initialStop(reference, cfg.risk);
  const entryCost = fill.usdAmountMicro + fill.networkFeeMicro;
  const sizing = await ctx.db.first<{ sizing: string }>('SELECT sizing FROM proposed_orders WHERE id = ?', [
    auth.proposedOrderId,
  ]);
  const lossFraction = new Decimal(
    (JSON.parse(sizing?.sizing ?? '{}') as { lossFraction?: string }).lossFraction ?? '0.1',
  );
  const plannedRisk = usdToMicro(microToUsd(entryCost).mul(lossFraction));
  const fillId = newId('fl', t);
  const positionId = newId('pos', t);
  const res = await commitUnderLock(ctx, auth.portfolioId, `entry ${orderId}`, async () => {
    const s1 = await transitionStatements({
      candidate: pending,
      next: 'PAPER_FILLED',
      by: 'EXECUTOR',
      to: 'EXECUTOR',
      eventType: 'ORDER_FILLED',
      observedAt: fill.simulatedAt,
      now: t,
      evidenceIds: fillEv.records.map((r) => r.id),
      payload: { orderId, fillId },
    });
    const s2 = await transitionStatements({
      candidate: advanced(pending, 'PAPER_FILLED'),
      next: 'POSITION_OPEN',
      by: 'EXECUTOR',
      to: 'RISK',
      eventType: 'POSITION_OPENED',
      observedAt: fill.simulatedAt,
      now: t,
      payload: { positionId },
    });
    return {
      stmts: [
        ...s1.stmts,
        ...s2.stmts,
        {
          sql: `UPDATE paper_orders SET status = 'FILLED', position_id = ?, resolved_at = ? WHERE id = ? AND status = 'PENDING'`,
          params: [positionId, t, orderId],
        },
        fillStmt(fillId, orderId, auth.portfolioId, c.mint, decimals, fill),
        {
          sql: `INSERT INTO positions (id, portfolio_id, candidate_id, mint, symbol, status, entry_order_id, entry_at, quantity, token_decimals, entry_price_usd, entry_reference_price_usd,
                entry_cost_micro, entry_fees_micro, planned_risk_micro, initial_stop_usd, effective_stop_usd, trailing_active, highest_reference_usd, lowest_reference_usd,
                last_mark_usd, last_mark_at, config_version, strategy_version, updated_at)
              VALUES (?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`,
          params: [
            positionId,
            auth.portfolioId,
            c.id,
            c.mint,
            token?.symbol ?? null,
            orderId,
            fill.simulatedAt,
            fill.tokenQuantity.toString(),
            decimals,
            fill.priceUsd.toString(),
            reference.toString(),
            entryCost.toString(),
            fill.networkFeeMicro.toString(),
            plannedRisk.toString(),
            stop.toString(),
            stop.toString(),
            reference.toString(),
            reference.toString(),
            reference.toString(),
            t,
            c.config_version,
            c.strategy_version,
            t,
          ],
        },
        {
          sql: `INSERT INTO stop_events (id, position_id, kind, previous_stop_usd, new_stop_usd, reference_price_usd, created_at) VALUES (?, ?, 'INITIALIZED', NULL, ?, ?, ?)`,
          params: [newId('se', t), positionId, stop.toString(), reference.toString(), t],
        },
        ...journalStmts(
          buyJournal(
            auth.portfolioId,
            fillId,
            c.mint,
            fill.tokenQuantity,
            fill.usdAmountMicro,
            fill.networkFeeMicro,
            t,
          ),
        ),
        {
          sql: `UPDATE opportunities SET status = 'TAKEN', updated_at = ? WHERE candidate_id = ?`,
          params: [t, c.id],
        },
        await auditStmt({
          category: 'FILL',
          action: 'PAPER_FILLED',
          actor: 'EXECUTOR',
          subjectType: 'position',
          subjectId: positionId,
          correlationId: c.correlation_id,
          detail: {
            side: 'BUY',
            qty: fill.tokenQuantity,
            usdMicro: fill.usdAmountMicro,
            feeMicro: fill.networkFeeMicro,
            price: fill.priceUsd.toString(),
            slippageBps: fill.slippageBps.toFixed(2),
            entryReference: reference.toString(),
            referenceEstimated: entryRef === null,
            stop: stop.toString(),
          },
          evidenceIds: fillEv.records.map((r) => r.id),
          at: t,
        }),
      ],
      transitions: [{ candidate: pending, event: s1.event }],
    };
  });
  if (res.status !== 'COMMITTED') {
    // Lost the portfolio lock or the candidate moved: the order stays PENDING and recovery resolves it.
    ctx.log.warn('entry commit not applied', { candidateId, orderId, status: res.status });
    return { kind: 'SKIPPED', reason: `commit ${res.status}` };
  }
  return { kind: 'DONE', state: 'POSITION_OPEN' };
}

function fillStmt(
  fillId: string,
  orderId: string,
  portfolioId: string,
  mint: string,
  decimals: number,
  f: Extract<Awaited<ReturnType<typeof simulateFill>>, { status: 'FILLED' }>,
): Statement {
  return {
    sql: `INSERT INTO fills (id, order_id, portfolio_id, mint, side, token_quantity, token_decimals, usd_amount_micro, network_fee_micro, price_usd, quote_price_usd, slippage_bps,
            price_impact_pct, route, quote_evidence_id, requote_evidence_id, latency_ms, simulated_at, model_version)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    params: [
      fillId,
      orderId,
      portfolioId,
      mint,
      f.side,
      f.tokenQuantity.toString(),
      decimals,
      f.usdAmountMicro.toString(),
      f.networkFeeMicro.toString(),
      f.priceUsd.toString(),
      f.quotePriceUsd.toString(),
      f.slippageBps.toFixed(4),
      f.priceImpactPct,
      JSON.stringify(f.route),
      f.quoteEvidenceId,
      f.requoteEvidenceId,
      f.latencyMs,
      f.simulatedAt,
      FILL_MODEL_VERSION,
    ],
  };
}

export type ExitReason =
  'STOP' | 'TRAILING_STOP' | 'MANUAL' | 'EMERGENCY' | 'LIQUIDITY' | 'DEVELOPER' | 'STOP_NO_ROUTE';

/** Moves an open (or failed-exit) position to EXIT_PENDING. Idempotent. */
export async function requestExit(
  ctx: Ctx,
  position: PositionRow,
  reason: ExitReason,
  by: 'RISK' | 'OWNER',
  detail: Record<string, unknown> = {},
): Promise<boolean> {
  const c = await getCandidate(ctx.db, position.candidate_id);
  if (!c || (c.state !== 'POSITION_OPEN' && c.state !== 'EXIT_FAILED')) return false;
  const now = ctx.clock.now();
  const r = await transition(ctx.db, {
    candidate: c,
    next: 'EXIT_PENDING',
    by,
    to: 'EXECUTOR',
    eventType: 'EXIT_REQUESTED',
    observedAt: now,
    now,
    payload: { positionId: position.id, reason, ...detail },
    extra: [
      {
        sql: `UPDATE positions SET status = 'EXIT_PENDING', exit_reason = COALESCE(exit_reason, ?), updated_at = ? WHERE id = ? AND status IN ('OPEN', 'EXIT_FAILED')`,
        params: [reason, now, position.id],
      },
      await auditStmt({
        category: 'POSITION',
        action: 'EXIT_REQUESTED',
        actor: by,
        subjectType: 'position',
        subjectId: position.id,
        correlationId: c.correlation_id,
        detail: { reason, ...detail },
        at: now,
      }),
    ],
  });
  return r.status === 'COMMITTED';
}

/**
 * Executor exit: simulates the sell with the route available now. A failed exit is recorded as
 * EXIT_FAILED (never as a fill) and retried with progressively wider slippage tolerance.
 */
export async function processExit(ctx: Ctx, positionId: string): Promise<StageResult> {
  const p = await ctx.db.first<PositionRow>('SELECT * FROM positions WHERE id = ?', [positionId]);
  if (!p || p.status !== 'EXIT_PENDING')
    return { kind: 'SKIPPED', reason: `position is ${p?.status ?? 'missing'}` };
  const c = await getCandidate(ctx.db, p.candidate_id);
  if (!c || c.state !== 'EXIT_PENDING')
    return { kind: 'SKIPPED', reason: `candidate is ${c?.state ?? 'missing'}` };
  const { config: cfg } = await ctx.config();
  const now = ctx.clock.now();
  const attempt = p.exit_attempts + 1;
  const orderId = newId('ord', now);
  await ctx.db.batch([
    {
      sql: `INSERT INTO paper_orders (id, portfolio_id, position_id, candidate_id, mint, side, kind, reason, requested_in_amount, status, idempotency_key, attempt, config_version, strategy_version, created_at)
            VALUES (?, ?, ?, ?, ?, 'SELL', 'MARKET', ?, ?, 'PENDING', ?, ?, ?, ?, ?)`,
      params: [
        orderId,
        p.portfolio_id,
        p.id,
        c.id,
        p.mint,
        p.exit_reason ?? 'STOP',
        p.quantity,
        `exit:${p.id}:${attempt}`,
        attempt,
        p.config_version,
        p.strategy_version,
        now,
      ],
    },
    {
      sql: 'UPDATE positions SET exit_attempts = ?, updated_at = ? WHERE id = ? AND exit_attempts = ?',
      params: [attempt, now, p.id, p.exit_attempts],
    },
    await auditStmt({
      category: 'ORDER',
      action: 'EXIT_ORDER_PENDING',
      actor: 'EXECUTOR',
      subjectType: 'position',
      subjectId: p.id,
      correlationId: c.correlation_id,
      detail: { orderId, attempt },
      at: now,
    }),
  ]);

  const slippage = Math.min(1500, cfg.execution.slippageBps * attempt);
  const fee = await feeEstimate(ctx, [c.pair_address]);
  const ev = new EvidenceCollector();
  const fill = await simulateFill(
    {
      jupiter: ctx.providers.jupiter,
      clock: ctx.clock,
      sleep: ctx.sleep,
      evidence: ev,
      latencyMs: cfg.execution.simulatedLatencyMs,
    },
    {
      side: 'SELL',
      mint: p.mint,
      tokenDecimals: p.token_decimals,
      amountIn: big(p.quantity),
      slippageBps: slippage,
      fee,
    },
  );
  const t = ctx.clock.now();
  await ctx.db.batch(await persistEvidence(ctx.evidenceStore, ev.records));

  if (fill.status !== 'FILLED') {
    const st = await transitionStatements({
      candidate: c,
      next: 'EXIT_FAILED',
      by: 'EXECUTOR',
      to: 'RISK',
      eventType: 'EXIT_FAILED',
      observedAt: t,
      now: t,
      payload: { orderId, attempt, reason: fill.reason },
    });
    await commitTransitions(
      ctx.db,
      [
        ...st.stmts,
        {
          sql: `UPDATE paper_orders SET status = 'FAILED', failure_reason = ?, resolved_at = ? WHERE id = ?`,
          params: [fill.reason, t, orderId],
        },
        {
          sql: `UPDATE positions SET status = 'EXIT_FAILED', updated_at = ? WHERE id = ? AND status = 'EXIT_PENDING'`,
          params: [t, p.id],
        },
        {
          sql: `INSERT INTO stop_events (id, position_id, kind, previous_stop_usd, new_stop_usd, reference_price_usd, created_at) VALUES (?, ?, 'EXIT_RETRY', ?, ?, NULL, ?)`,
          params: [newId('se', t), p.id, p.effective_stop_usd, p.effective_stop_usd, t],
        },
        alertStmt(
          attempt >= 3 ? 'CRITICAL' : 'WARNING',
          'executor',
          `Paper exit failed (attempt ${attempt})`,
          `${p.symbol ?? p.mint}: ${fill.reason}`,
          t,
          `exit-failed:${p.id}:${attempt}`,
        ),
        await auditStmt({
          category: 'ORDER',
          action: 'EXIT_FAILED',
          actor: 'EXECUTOR',
          subjectType: 'position',
          subjectId: p.id,
          correlationId: c.correlation_id,
          detail: { orderId, attempt, reason: fill.reason },
          evidenceIds: ev.records.map((r) => r.id),
          at: t,
        }),
        GUARD_CLEANUP,
      ],
      [{ candidate: c, event: st.event }],
    );
    return { kind: 'DONE', state: 'EXIT_FAILED' };
  }

  const fillId = newId('fl', t);
  const costBasis = big(p.entry_cost_micro) - big(p.entry_fees_micro);
  const math = closeMath(
    {
      quantity: big(p.quantity),
      tokenDecimals: p.token_decimals,
      entryCostMicro: big(p.entry_cost_micro),
      plannedRiskMicro: big(p.planned_risk_micro),
    },
    fill.usdAmountMicro,
    fill.networkFeeMicro,
  );
  const res = await commitUnderLock(ctx, p.portfolio_id, `exit ${orderId}`, async () => {
    const st = await transitionStatements({
      candidate: c,
      next: 'POSITION_CLOSED',
      by: 'EXECUTOR',
      to: 'LOGGER',
      eventType: 'POSITION_CLOSED',
      observedAt: fill.simulatedAt,
      now: t,
      evidenceIds: ev.records.map((r) => r.id),
      payload: {
        orderId,
        fillId,
        realizedPnlMicro: math.realizedPnlMicro.toString(),
        rMultiple: math.rMultiple,
      },
    });
    return {
      stmts: [
        ...st.stmts,
        {
          sql: `UPDATE paper_orders SET status = 'FILLED', resolved_at = ? WHERE id = ? AND status = 'PENDING'`,
          params: [t, orderId],
        },
        fillStmt(fillId, orderId, p.portfolio_id, p.mint, p.token_decimals, fill),
        {
          sql: `UPDATE positions SET status = 'CLOSED', exit_order_id = ?, exit_at = ?, exit_price_usd = ?, exit_proceeds_micro = ?, exit_fees_micro = ?, realized_pnl_micro = ?, updated_at = ?
            WHERE id = ? AND status = 'EXIT_PENDING'`,
          params: [
            orderId,
            fill.simulatedAt,
            fill.priceUsd.toString(),
            fill.usdAmountMicro.toString(),
            fill.networkFeeMicro.toString(),
            math.realizedPnlMicro.toString(),
            t,
            p.id,
          ],
        },
        ...journalStmts(
          sellJournal(
            p.portfolio_id,
            fillId,
            p.mint,
            big(p.quantity),
            costBasis,
            fill.usdAmountMicro,
            fill.networkFeeMicro,
            t,
          ),
        ),
        await auditStmt({
          category: 'FILL',
          action: 'POSITION_CLOSED',
          actor: 'EXECUTOR',
          subjectType: 'position',
          subjectId: p.id,
          correlationId: c.correlation_id,
          detail: {
            side: 'SELL',
            reason: p.exit_reason,
            proceedsMicro: fill.usdAmountMicro,
            feeMicro: fill.networkFeeMicro,
            price: fill.priceUsd.toString(),
            realizedPnlMicro: math.realizedPnlMicro,
            rMultiple: math.rMultiple,
            attempt,
          },
          evidenceIds: ev.records.map((r) => r.id),
          at: t,
        }),
      ],
      transitions: [{ candidate: c, event: st.event }],
    };
  });
  if (res.status !== 'COMMITTED') {
    ctx.log.warn('exit commit not applied', { positionId, orderId, status: res.status });
    return { kind: 'SKIPPED', reason: `commit ${res.status}` };
  }
  return { kind: 'DONE', state: 'POSITION_CLOSED' };
}

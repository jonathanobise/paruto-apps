import type { SqlDb, Statement } from '@alpha-desk/db';
import { isConstraintError } from '@alpha-desk/db';
import { buildHandoff, sha256Hex, TERMINAL_STATES, type Agent, type CandidateState, type HandoffEvent } from '@alpha-desk/shared';
import { auditStmt } from './audit-writer.ts';

export interface CandidateRow {
  id: string;
  correlation_id: string;
  mint: string;
  pair_address: string;
  state: CandidateState;
  state_version: number;
  config_version: string;
  strategy_version: string;
}

export interface TransitionInput {
  candidate: CandidateRow;
  next: CandidateState;
  by: Agent;
  to: Agent;
  eventType: string;
  observedAt: number;
  now: number;
  expiresAt?: number | null;
  evidenceIds?: string[];
  payload?: Record<string, unknown>;
  /** Extra statements committed atomically with the transition. */
  extra?: Statement[];
  /** Column updates on the candidate row applied with the state change. */
  set?: Record<string, string | number | null>;
}

export type TransitionResult =
  | { status: 'COMMITTED'; event: HandoffEvent }
  | { status: 'DUPLICATE'; existingNextState: CandidateState }
  | { status: 'STALE'; currentState: CandidateState | null };

/**
 * Commits one state transition: validates the handoff contract (shared Zod schema + permitted agent),
 * compare-and-swaps the candidate's state/version, appends the handoff and audit events, and applies any
 * extra statements — all in one atomic batch. A redelivered message hits the idempotency key and returns
 * the previously committed outcome instead of acting twice.
 */
export async function transition(db: SqlDb, t: TransitionInput): Promise<TransitionResult> {
  const { stmts, event } = await transitionStatements(t);
  return commitTransitions(db, [...stmts, ...(t.extra ?? []), GUARD_CLEANUP], [{ candidate: t.candidate, event }]);
}

/**
 * Commits a batch that contains one or more transitions (each built by transitionStatements, in order).
 * On a constraint failure, distinguishes a redelivered duplicate from a lost race.
 */
export async function commitTransitions(db: SqlDb, stmts: Statement[], transitions: Array<{ candidate: CandidateRow; event: HandoffEvent }>): Promise<TransitionResult> {
  try {
    await db.batch(stmts);
    return { status: 'COMMITTED', event: transitions[transitions.length - 1]!.event };
  } catch (e) {
    if (!isConstraintError(e)) throw e;
    const first = transitions[0]!;
    const prior = await db.first<{ next_state: CandidateState }>('SELECT next_state FROM handoff_events WHERE idempotency_key = ?', [first.event.idempotency_key]);
    if (prior) return { status: 'DUPLICATE', existingNextState: prior.next_state };
    const c = first.candidate;
    const cur = await db.first<{ state: CandidateState; state_version: number }>('SELECT state, state_version FROM candidate_discoveries WHERE id = ?', [c.id]);
    if (!cur || cur.state !== c.state || cur.state_version !== c.state_version) return { status: 'STALE', currentState: cur?.state ?? null };
    throw e;
  }
}

/** The guarded statements for one transition (no cleanup; callers append GUARD_CLEANUP once at the end). */
export async function transitionStatements(t: TransitionInput): Promise<{ stmts: Statement[]; event: HandoffEvent }> {
  const c = t.candidate;
  const event = await buildHandoff({
    correlationId: c.correlation_id,
    candidateId: c.id,
    tokenMint: c.mint,
    source: t.by,
    destination: t.to,
    eventType: t.eventType,
    previous: c.state,
    next: t.next,
    observedAt: t.observedAt,
    generatedAt: t.now,
    expiresAt: t.expiresAt ?? null,
    evidenceIds: t.evidenceIds,
    configVersion: c.config_version,
    strategyVersion: c.strategy_version,
    payload: t.payload,
  });
  const body = JSON.stringify(event);
  const checksum = await sha256Hex(body);
  const guardParams = [c.id, c.state, c.state_version];
  const sets = Object.entries(t.set ?? {});
  const stmts: Statement[] = [
    guardStmt('EXISTS (SELECT 1 FROM candidate_discoveries WHERE id = ? AND state = ? AND state_version = ?)', guardParams),
    {
      sql: `INSERT INTO handoff_events (event_id, idempotency_key, correlation_id, candidate_id, token_mint, source_agent, destination_agent, event_type,
              previous_state, next_state, observed_at, generated_at, expires_at, config_version, strategy_version, body, checksum)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        event.event_id, event.idempotency_key, event.correlation_id, event.candidate_id, event.token_mint, event.source_agent,
        event.destination_agent, event.event_type, event.previous_state, event.next_state, t.observedAt, t.now, t.expiresAt ?? null,
        event.config_version, event.strategy_version, body, checksum,
      ],
    },
    {
      sql: `UPDATE candidate_discoveries SET state = ?, state_version = state_version + 1, terminal = ?, updated_at = ?
            ${sets.map(([k]) => `, ${k} = ?`).join('')}
            WHERE id = ? AND state = ? AND state_version = ?`,
      params: [t.next, TERMINAL_STATES.has(t.next) ? 1 : 0, t.now, ...sets.map(([, v]) => v), ...guardParams],
    },
    await auditStmt({
      category: 'AUTOMATION',
      action: `${c.state}→${t.next}`,
      actor: t.by,
      subjectType: 'candidate',
      subjectId: c.id,
      correlationId: c.correlation_id,
      detail: { eventType: t.eventType, eventId: event.event_id, ...(t.payload ? { payload: t.payload } : {}) },
      evidenceIds: t.evidenceIds,
      at: t.now,
    }),
  ];
  return { stmts, event };
}

/** The row as it will be after `t` commits — for chaining a second transition in the same batch. */
export function advanced(c: CandidateRow, next: CandidateState): CandidateRow {
  return { ...c, state: next, state_version: c.state_version + 1 };
}

/** First statement of a guarded batch: aborts the whole batch unless `condition` holds. */
export function guardStmt(condition: string, params: Array<string | number | null>): Statement {
  return { sql: `INSERT INTO txn_guards (ok) SELECT CASE WHEN ${condition} THEN 1 ELSE 0 END`, params };
}

export const GUARD_CLEANUP: Statement = { sql: 'DELETE FROM txn_guards', params: [] };

import { z } from 'zod';
import { AGENTS, CANDIDATE_STATES, assertTransition, type Agent, type CandidateState } from './states.ts';
import { newId } from './ids.ts';
import { canonicalJson } from './json.ts';
import { sha256Hex } from './hash.ts';

export const HANDOFF_SCHEMA_VERSION = '1.0.0';

const isoDate = z.string().datetime({ offset: true });

export const HandoffEventSchema = z
  .object({
    event_id: z.string().min(8),
    schema_version: z.literal(HANDOFF_SCHEMA_VERSION),
    correlation_id: z.string().min(8),
    candidate_id: z.string().min(8),
    token_mint: z.string().min(32).max(44),
    source_agent: z.enum(AGENTS),
    destination_agent: z.enum(AGENTS),
    event_type: z.string().min(3).max(64),
    previous_state: z.enum(CANDIDATE_STATES).nullable(),
    next_state: z.enum(CANDIDATE_STATES),
    observed_at: isoDate,
    generated_at: isoDate,
    expires_at: isoDate.nullable(),
    evidence_ids: z.array(z.string()),
    config_version: z.string().min(1),
    strategy_version: z.string().min(1),
    idempotency_key: z.string().min(16),
    payload: z.record(z.string(), z.unknown()),
  })
  .strict()
  .superRefine((e, ctx) => {
    try {
      assertTransition(e.previous_state, e.next_state, e.source_agent);
    } catch (err) {
      ctx.addIssue({ code: 'custom', message: (err as Error).message, path: ['next_state'] });
    }
    if (Date.parse(e.generated_at) < Date.parse(e.observed_at) - 5_000) {
      ctx.addIssue({ code: 'custom', message: 'generated_at precedes observed_at', path: ['generated_at'] });
    }
    if (e.expires_at && Date.parse(e.expires_at) <= Date.parse(e.generated_at)) {
      ctx.addIssue({ code: 'custom', message: 'expires_at must be after generated_at', path: ['expires_at'] });
    }
  });

export type HandoffEvent = z.infer<typeof HandoffEventSchema>;

export interface HandoffInput {
  correlationId: string;
  candidateId: string;
  tokenMint: string;
  source: Agent;
  destination: Agent;
  eventType: string;
  previous: CandidateState | null;
  next: CandidateState;
  observedAt: number;
  generatedAt: number;
  expiresAt?: number | null;
  evidenceIds?: string[];
  configVersion: string;
  strategyVersion: string;
  payload?: Record<string, unknown>;
}

/**
 * The idempotency key is derived from what the transition *is* (candidate, edge, config),
 * so a redelivered message produces the same key and is deduplicated.
 */
export async function idempotencyKeyFor(input: Pick<HandoffInput, 'candidateId' | 'previous' | 'next' | 'configVersion'>): Promise<string> {
  return sha256Hex(canonicalJson([input.candidateId, input.previous, input.next, input.configVersion]));
}

export async function buildHandoff(input: HandoffInput): Promise<HandoffEvent> {
  const event = {
    event_id: newId('evt', input.generatedAt),
    schema_version: HANDOFF_SCHEMA_VERSION,
    correlation_id: input.correlationId,
    candidate_id: input.candidateId,
    token_mint: input.tokenMint,
    source_agent: input.source,
    destination_agent: input.destination,
    event_type: input.eventType,
    previous_state: input.previous,
    next_state: input.next,
    observed_at: new Date(input.observedAt).toISOString(),
    generated_at: new Date(input.generatedAt).toISOString(),
    expires_at: input.expiresAt ? new Date(input.expiresAt).toISOString() : null,
    evidence_ids: input.evidenceIds ?? [],
    config_version: input.configVersion,
    strategy_version: input.strategyVersion,
    idempotency_key: await idempotencyKeyFor(input),
    payload: JSON.parse(canonicalJson(input.payload ?? {})) as Record<string, unknown>,
  };
  return HandoffEventSchema.parse(event);
}

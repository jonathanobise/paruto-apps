export const AGENTS = [
  'SCOUT',
  'FILTER',
  'ANALYST',
  'RISK',
  'EXECUTOR',
  'LOGGER',
  'SYSTEM',
  'OWNER',
] as const;
export type Agent = (typeof AGENTS)[number];

export const CANDIDATE_STATES = [
  'DISCOVERED',
  'DISCOVERY_REJECTED',
  'FILTER_PENDING',
  'FILTER_APPROVED',
  'FILTER_REJECTED',
  'FILTER_UNVERIFIED',
  'FILTER_ERROR',
  'ANALYST_PENDING',
  'ANALYST_APPROVED',
  'ANALYST_REJECTED',
  'ANALYST_UNVERIFIED',
  'RISK_PENDING',
  'RISK_AUTHORIZED',
  'RISK_REJECTED',
  'RISK_PAUSED',
  'PAPER_ORDER_PENDING',
  'PAPER_FILLED',
  'PAPER_REJECTED',
  'POSITION_OPEN',
  'EXIT_PENDING',
  'EXIT_FAILED',
  'POSITION_CLOSED',
  'EXPIRED',
] as const;
export type CandidateState = (typeof CANDIDATE_STATES)[number];

/** States that end a candidate run. A token can be evaluated again later only as a new run. */
export const TERMINAL_STATES: ReadonlySet<CandidateState> = new Set([
  'DISCOVERY_REJECTED',
  'FILTER_REJECTED',
  'FILTER_UNVERIFIED',
  'FILTER_ERROR',
  'ANALYST_REJECTED',
  'ANALYST_UNVERIFIED',
  'RISK_REJECTED',
  'RISK_PAUSED',
  'PAPER_REJECTED',
  'POSITION_CLOSED',
  'EXPIRED',
]);

type Edge = { from: CandidateState | null; to: CandidateState; by: readonly Agent[] };

/**
 * The only legal transitions, and which agent may make each one.
 * Anything not listed here is refused by `assertTransition`.
 */
export const TRANSITIONS: readonly Edge[] = [
  { from: null, to: 'DISCOVERED', by: ['SCOUT'] },
  { from: null, to: 'DISCOVERY_REJECTED', by: ['SCOUT'] },
  { from: 'DISCOVERED', to: 'FILTER_PENDING', by: ['SCOUT'] },
  { from: 'DISCOVERED', to: 'EXPIRED', by: ['SYSTEM'] },
  { from: 'FILTER_PENDING', to: 'FILTER_APPROVED', by: ['FILTER'] },
  { from: 'FILTER_PENDING', to: 'FILTER_REJECTED', by: ['FILTER'] },
  { from: 'FILTER_PENDING', to: 'FILTER_UNVERIFIED', by: ['FILTER'] },
  { from: 'FILTER_PENDING', to: 'FILTER_ERROR', by: ['FILTER'] },
  { from: 'FILTER_PENDING', to: 'EXPIRED', by: ['SYSTEM'] },
  { from: 'FILTER_APPROVED', to: 'ANALYST_PENDING', by: ['FILTER'] },
  { from: 'FILTER_APPROVED', to: 'EXPIRED', by: ['SYSTEM'] },
  { from: 'ANALYST_PENDING', to: 'ANALYST_APPROVED', by: ['ANALYST'] },
  { from: 'ANALYST_PENDING', to: 'ANALYST_REJECTED', by: ['ANALYST'] },
  { from: 'ANALYST_PENDING', to: 'ANALYST_UNVERIFIED', by: ['ANALYST'] },
  { from: 'ANALYST_PENDING', to: 'EXPIRED', by: ['SYSTEM'] },
  { from: 'ANALYST_APPROVED', to: 'RISK_PENDING', by: ['ANALYST', 'OWNER'] },
  { from: 'ANALYST_APPROVED', to: 'EXPIRED', by: ['SYSTEM'] },
  { from: 'RISK_PENDING', to: 'RISK_AUTHORIZED', by: ['RISK'] },
  { from: 'RISK_PENDING', to: 'RISK_REJECTED', by: ['RISK'] },
  { from: 'RISK_PENDING', to: 'RISK_PAUSED', by: ['RISK'] },
  { from: 'RISK_PENDING', to: 'EXPIRED', by: ['SYSTEM'] },
  { from: 'RISK_AUTHORIZED', to: 'PAPER_ORDER_PENDING', by: ['EXECUTOR'] },
  { from: 'RISK_AUTHORIZED', to: 'EXPIRED', by: ['SYSTEM', 'RISK'] },
  { from: 'PAPER_ORDER_PENDING', to: 'PAPER_FILLED', by: ['EXECUTOR'] },
  { from: 'PAPER_ORDER_PENDING', to: 'PAPER_REJECTED', by: ['EXECUTOR'] },
  { from: 'PAPER_FILLED', to: 'POSITION_OPEN', by: ['EXECUTOR'] },
  { from: 'POSITION_OPEN', to: 'EXIT_PENDING', by: ['RISK', 'OWNER'] },
  { from: 'EXIT_PENDING', to: 'POSITION_CLOSED', by: ['EXECUTOR'] },
  { from: 'EXIT_PENDING', to: 'EXIT_FAILED', by: ['EXECUTOR'] },
  { from: 'EXIT_FAILED', to: 'EXIT_PENDING', by: ['RISK', 'OWNER'] },
];

export class TransitionError extends Error {
  constructor(
    message: string,
    readonly from: CandidateState | null,
    readonly to: CandidateState,
    readonly by: Agent,
  ) {
    super(message);
    this.name = 'TransitionError';
  }
}

export function isAllowedTransition(from: CandidateState | null, to: CandidateState, by: Agent): boolean {
  return TRANSITIONS.some((e) => e.from === from && e.to === to && e.by.includes(by));
}

export function assertTransition(from: CandidateState | null, to: CandidateState, by: Agent): void {
  if (from !== null && TERMINAL_STATES.has(from)) {
    throw new TransitionError(`${from} is terminal`, from, to, by);
  }
  if (!TRANSITIONS.some((e) => e.from === from && e.to === to)) {
    throw new TransitionError(`illegal transition ${from ?? '∅'} → ${to}`, from, to, by);
  }
  if (!isAllowedTransition(from, to, by)) {
    throw new TransitionError(`${by} may not move ${from ?? '∅'} → ${to}`, from, to, by);
  }
}

export const RUNTIME_MODES = [
  'STOPPED',
  'DISCOVERY_ONLY',
  'PAPER_MANUAL',
  'PAPER_AUTONOMOUS',
  'EMERGENCY_PAUSED',
] as const;
export type RuntimeMode = (typeof RUNTIME_MODES)[number];

export const HEALTH_STATUSES = ['HEALTHY', 'DEGRADED', 'UNAVAILABLE', 'PAUSED'] as const;
export type HealthStatus = (typeof HEALTH_STATUSES)[number];

/** Outcome of a single verification rule. Only PASS lets a candidate advance. */
export const RULE_OUTCOMES = ['PASS', 'FAIL', 'UNVERIFIED', 'ERROR', 'NOT_REQUIRED'] as const;
export type RuleOutcome = (typeof RULE_OUTCOMES)[number];

export const DATA_QUALITY = ['VERIFIED', 'PARTIAL', 'INSUFFICIENT', 'UNAVAILABLE', 'STALE'] as const;
export type DataQuality = (typeof DATA_QUALITY)[number];

import { sha256Hex, type Clock, systemClock } from '@alpha-desk/shared';

export type ProviderErrorKind =
  | 'RATE_LIMITED'
  | 'HTTP'
  | 'TIMEOUT'
  | 'NETWORK'
  | 'CIRCUIT_OPEN'
  | 'INVALID_RESPONSE'
  | 'BLOCKED_BY_CREDENTIALS'
  | 'BUDGET_EXCEEDED';

export class ProviderError extends Error {
  constructor(
    readonly provider: string,
    readonly kind: ProviderErrorKind,
    message: string,
    readonly status?: number,
    readonly retryAfterMs?: number,
  ) {
    super(`${provider}: ${kind}: ${message}`);
    this.name = 'ProviderError';
  }
  get retryable(): boolean {
    return (
      this.kind === 'RATE_LIMITED' ||
      this.kind === 'TIMEOUT' ||
      this.kind === 'NETWORK' ||
      (this.kind === 'HTTP' && (this.status ?? 0) >= 500)
    );
  }
}

/** Where an observation came from. Every value used in a decision carries one of these. */
export interface Provenance {
  provider: string;
  endpoint: string;
  method: string;
  observedAt: number;
  ingestedAt: number;
  latencyMs: number;
  status: number;
  sha256: string;
  /** Raw response body, kept so it can be stored as evidence. */
  raw: string;
  slot?: number;
}

export interface Observed<T> {
  data: T;
  provenance: Provenance;
}

export interface CallMetric {
  provider: string;
  endpoint: string;
  ok: boolean;
  latencyMs: number;
  rateLimited: boolean;
  error?: string;
  at: number;
}

export interface ProviderPolicy {
  /** Minimum spacing between requests (simple pacing that keeps us under published limits). */
  minIntervalMs: number;
  timeoutMs: number;
  maxRetries: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
  /** Consecutive failures before the circuit opens. */
  circuitThreshold: number;
  circuitCooldownMs: number;
}

export const DEFAULT_POLICY: ProviderPolicy = {
  minIntervalMs: 250,
  timeoutMs: 12_000,
  maxRetries: 3,
  baseBackoffMs: 500,
  maxBackoffMs: 8_000,
  circuitThreshold: 5,
  circuitCooldownMs: 60_000,
};

export interface HttpClientOptions {
  provider: string;
  policy?: Partial<ProviderPolicy>;
  fetchImpl?: typeof fetch;
  clock?: Clock;
  onMetric?: (m: CallMetric) => void;
  /** Returns false when a daily API budget is exhausted. */
  budget?: () => boolean;
  sleep?: (ms: number) => Promise<void>;
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * HTTP client shared by every provider adapter: pacing, timeouts, bounded exponential backoff with jitter,
 * Retry-After / x-ratelimit-reset handling, a per-provider circuit breaker and call metrics.
 */
export class HttpClient {
  readonly provider: string;
  private readonly policy: ProviderPolicy;
  private readonly fetchImpl: typeof fetch;
  private readonly clock: Clock;
  private readonly sleep: (ms: number) => Promise<void>;
  private nextSlot = 0;
  private failures = 0;
  private openedAt: number | null = null;

  constructor(private readonly opts: HttpClientOptions) {
    this.provider = opts.provider;
    this.policy = { ...DEFAULT_POLICY, ...opts.policy };
    this.fetchImpl = opts.fetchImpl ?? ((...a) => fetch(...a));
    this.clock = opts.clock ?? systemClock;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  get circuit(): CircuitState {
    if (this.openedAt === null) return 'CLOSED';
    return this.clock.now() - this.openedAt >= this.policy.circuitCooldownMs ? 'HALF_OPEN' : 'OPEN';
  }

  private async pace(): Promise<void> {
    const now = this.clock.now();
    const wait = this.nextSlot - now;
    this.nextSlot = Math.max(now, this.nextSlot) + this.policy.minIntervalMs;
    if (wait > 0) await this.sleep(wait);
  }

  private backoff(attempt: number, hintMs?: number): number {
    const exp = Math.min(this.policy.maxBackoffMs, this.policy.baseBackoffMs * 2 ** attempt);
    const jitter = Math.random() * exp * 0.25;
    return Math.max(hintMs ?? 0, exp + jitter);
  }

  private recordFailure(): void {
    this.failures++;
    if (this.failures >= this.policy.circuitThreshold) this.openedAt = this.clock.now();
  }

  private recordSuccess(): void {
    this.failures = 0;
    this.openedAt = null;
  }

  async request<T>(
    endpoint: string,
    url: string,
    init: RequestInit = {},
    parse: (json: unknown) => T = (j) => j as T,
  ): Promise<Observed<T>> {
    if (this.circuit === 'OPEN') {
      throw new ProviderError(this.provider, 'CIRCUIT_OPEN', `circuit open after ${this.failures} failures`);
    }
    if (this.opts.budget && !this.opts.budget()) {
      throw new ProviderError(this.provider, 'BUDGET_EXCEEDED', 'daily API call budget exhausted');
    }
    let lastErr: ProviderError | null = null;
    for (let attempt = 0; attempt <= this.policy.maxRetries; attempt++) {
      await this.pace();
      const started = this.clock.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.policy.timeoutMs);
      try {
        const res = await this.fetchImpl(url, { ...init, signal: controller.signal });
        const raw = await res.text();
        const latencyMs = this.clock.now() - started;
        if (res.status === 429) {
          const hint = retryHintMs(res.headers, this.clock.now());
          lastErr = new ProviderError(this.provider, 'RATE_LIMITED', 'HTTP 429', 429, hint);
          this.metric(endpoint, false, latencyMs, true, 'HTTP 429');
          if (attempt < this.policy.maxRetries) {
            await this.sleep(Math.min(this.backoff(attempt, hint), 30_000));
            continue;
          }
          break;
        }
        if (!res.ok) {
          lastErr = new ProviderError(this.provider, 'HTTP', `HTTP ${res.status} ${raw.slice(0, 200)}`, res.status);
          this.metric(endpoint, false, latencyMs, false, `HTTP ${res.status}`);
          if (lastErr.retryable && attempt < this.policy.maxRetries) {
            await this.sleep(this.backoff(attempt));
            continue;
          }
          break;
        }
        let json: unknown;
        try {
          json = JSON.parse(raw);
        } catch {
          lastErr = new ProviderError(this.provider, 'INVALID_RESPONSE', 'body is not JSON', res.status);
          this.metric(endpoint, false, latencyMs, false, 'invalid JSON');
          break;
        }
        let data: T;
        try {
          data = parse(json);
        } catch (e) {
          lastErr = new ProviderError(this.provider, 'INVALID_RESPONSE', (e as Error).message.slice(0, 300), res.status);
          this.metric(endpoint, false, latencyMs, false, 'schema mismatch');
          break;
        }
        this.recordSuccess();
        this.metric(endpoint, true, latencyMs, false);
        return {
          data,
          provenance: {
            provider: this.provider,
            endpoint,
            method: init.method ?? 'GET',
            observedAt: started,
            ingestedAt: this.clock.now(),
            latencyMs,
            status: res.status,
            sha256: await sha256Hex(raw),
            raw,
          },
        };
      } catch (e) {
        const latencyMs = this.clock.now() - started;
        const aborted = (e as Error).name === 'AbortError';
        lastErr = new ProviderError(this.provider, aborted ? 'TIMEOUT' : 'NETWORK', (e as Error).message);
        this.metric(endpoint, false, latencyMs, false, lastErr.kind);
        if (attempt < this.policy.maxRetries) {
          await this.sleep(this.backoff(attempt));
          continue;
        }
      } finally {
        clearTimeout(timer);
      }
    }
    this.recordFailure();
    throw lastErr ?? new ProviderError(this.provider, 'NETWORK', 'request failed');
  }

  private metric(endpoint: string, ok: boolean, latencyMs: number, rateLimited: boolean, error?: string): void {
    this.opts.onMetric?.({ provider: this.provider, endpoint, ok, latencyMs, rateLimited, error, at: this.clock.now() });
  }
}

function retryHintMs(headers: Headers, now: number): number | undefined {
  const retryAfter = headers.get('retry-after');
  if (retryAfter) {
    const secs = Number(retryAfter);
    if (Number.isFinite(secs)) return secs * 1000;
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.max(0, date - now);
  }
  const reset = headers.get('x-ratelimit-reset');
  if (reset) {
    const v = Number(reset);
    // Some providers send epoch seconds, others seconds-until-reset.
    if (Number.isFinite(v)) return v > 1e9 ? Math.max(0, v * 1000 - now) : v * 1000;
  }
  return undefined;
}

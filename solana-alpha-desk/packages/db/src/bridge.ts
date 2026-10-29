import { hmacSha256Hex, newId } from '@alpha-desk/shared';
import { ConstraintError, type RunResult, type SqlDb, type SqlValue, type Statement } from './driver.ts';

export const BRIDGE_PATH = '/internal/v1/sql';
export const BRIDGE_MAX_SKEW_MS = 30_000;

export interface BridgeRequest {
  op: 'all' | 'first' | 'run' | 'batch';
  statements: Statement[];
}

export function bridgeSigningString(timestamp: string, nonce: string, body: string): string {
  return `${timestamp}\n${nonce}\n${body}`;
}

/**
 * Signed SQL bridge used by the Node monitor in production: every request is HMAC-SHA256 signed with a
 * shared secret, timestamped and nonce-protected; the API Worker executes it with the D1 binding, whose
 * batch() is atomic. See docs/architecture.md (ADR-2).
 */
export class BridgeDb implements SqlDb {
  readonly driver = 'bridge' as const;
  constructor(
    private readonly baseUrl: string,
    private readonly secret: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async call<T>(req: BridgeRequest): Promise<T> {
    const body = JSON.stringify(req);
    const ts = Date.now().toString();
    const nonce = newId('n');
    const sig = await hmacSha256Hex(this.secret, bridgeSigningString(ts, nonce, body));
    const res = await this.fetchImpl(new URL(BRIDGE_PATH, this.baseUrl), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-ad-timestamp': ts,
        'x-ad-nonce': nonce,
        'x-ad-signature': sig,
      },
      body,
    });
    const json = (await res.json()) as { ok: boolean; result?: T; error?: string; constraint?: boolean };
    if (!res.ok || !json.ok) {
      if (json.constraint) throw new ConstraintError(json.error ?? 'constraint');
      throw new Error(`bridge ${res.status}: ${json.error ?? 'unknown error'}`);
    }
    return json.result as T;
  }

  all<T>(sql: string, params: SqlValue[] = []): Promise<T[]> {
    return this.call<T[]>({ op: 'all', statements: [{ sql, params }] });
  }
  first<T>(sql: string, params: SqlValue[] = []): Promise<T | null> {
    return this.call<T | null>({ op: 'first', statements: [{ sql, params }] });
  }
  run(sql: string, params: SqlValue[] = []): Promise<RunResult> {
    return this.call<RunResult>({ op: 'run', statements: [{ sql, params }] });
  }
  batch(statements: Statement[]): Promise<RunResult[]> {
    return this.call<RunResult[]>({ op: 'batch', statements });
  }
}

import {
  BRIDGE_MAX_SKEW_MS,
  bridgeSigningString,
  isConstraintError,
  type BridgeRequest,
  type SqlDb,
} from '@alpha-desk/db';
import { hmacSha256Hex, timingSafeEqualHex } from '@alpha-desk/shared';

/**
 * Verifies and executes one signed SQL bridge request from the monitor (ADR-2). Requests must carry a fresh
 * timestamp, an unused nonce and an HMAC-SHA256 signature over timestamp, nonce and body.
 */
export async function handleBridge(
  db: SqlDb,
  secret: string | undefined,
  headers: Headers,
  body: string,
  now: number,
): Promise<{ status: number; json: unknown }> {
  if (!secret || secret.length < 32) return { status: 503, json: { ok: false, error: 'bridge disabled' } };
  const ts = headers.get('x-ad-timestamp') ?? '';
  const nonce = headers.get('x-ad-nonce') ?? '';
  const sig = headers.get('x-ad-signature') ?? '';
  if (!/^\d+$/.test(ts) || Math.abs(now - Number(ts)) > BRIDGE_MAX_SKEW_MS)
    return { status: 401, json: { ok: false, error: 'stale or missing timestamp' } };
  if (!/^[A-Za-z0-9_]{8,80}$/.test(nonce)) return { status: 401, json: { ok: false, error: 'bad nonce' } };
  const expected = await hmacSha256Hex(secret, bridgeSigningString(ts, nonce, body));
  if (!timingSafeEqualHex(expected, sig)) return { status: 401, json: { ok: false, error: 'bad signature' } };
  const fresh = await db.run('INSERT OR IGNORE INTO internal_nonces (nonce, seen_at) VALUES (?, ?)', [
    nonce,
    now,
  ]);
  if (fresh.changes === 0) return { status: 409, json: { ok: false, error: 'replayed nonce' } };
  let req: BridgeRequest;
  try {
    req = JSON.parse(body) as BridgeRequest;
    if (
      !['all', 'first', 'run', 'batch'].includes(req.op) ||
      !Array.isArray(req.statements) ||
      req.statements.length === 0
    )
      throw new Error();
  } catch {
    return { status: 400, json: { ok: false, error: 'malformed request' } };
  }
  try {
    const s = req.statements[0]!;
    const result =
      req.op === 'all'
        ? await db.all(s.sql, s.params)
        : req.op === 'first'
          ? await db.first(s.sql, s.params)
          : req.op === 'run'
            ? await db.run(s.sql, s.params)
            : await db.batch(req.statements);
    return { status: 200, json: { ok: true, result } };
  } catch (e) {
    return {
      status: 400,
      json: { ok: false, error: (e as Error).message.slice(0, 500), constraint: isConstraintError(e) },
    };
  }
}

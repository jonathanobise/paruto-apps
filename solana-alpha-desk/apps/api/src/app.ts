import { Hono, type Context } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { SqlDb } from '@alpha-desk/db';
import { OWNER_USER_ID, auditStmt, type Ctx, type EvidenceStore } from '@alpha-desk/orchestrator';
import { sha256Hex } from '@alpha-desk/shared';
import { handleBridge } from './bridge.ts';
import {
  hashPassword,
  newTotpSecret,
  randomToken,
  sessionHash,
  verifyPassword,
  verifyTotp,
} from './crypto.ts';
import { readRoutes } from './routes/read.ts';
import { controlRoutes } from './routes/control.ts';

export interface AppEnv {
  BRIDGE_SECRET?: string;
  SETUP_TOKEN?: string;
  APP_ENV: 'development' | 'test' | 'production';
  COOKIE_SECURE: boolean;
}

export interface AppDeps {
  db: SqlDb;
  ctx: () => Ctx;
  evidence: EvidenceStore;
  env: AppEnv;
  now: () => number;
}

export interface SessionInfo {
  idHash: string;
  userId: string;
  email: string;
  csrf: string;
  mfaVerified: boolean;
  mfaEnabled: boolean;
}

export type HonoEnv = { Variables: { deps: AppDeps; session: SessionInfo } };
export type C = Context<HonoEnv>;

const SESSION_COOKIE = 'ad_session';
const SESSION_TTL = 12 * 3_600_000;
const SESSION_IDLE = 2 * 3_600_000;

export const ok = (c: C, data: unknown, status = 200) => c.json({ ok: true, data }, status as 200);
export const fail = (c: C, status: number, error: string) => c.json({ ok: false, error }, status as 400);

/** Fixed-window rate limit stored in D1; returns false when the bucket is exhausted. */
async function rateLimit(
  db: SqlDb,
  bucket: string,
  limit: number,
  windowMs: number,
  now: number,
): Promise<boolean> {
  const window = Math.floor(now / windowMs) * windowMs;
  await db.run(
    `INSERT INTO rate_limits (bucket, window_start, count) VALUES (?, ?, 1) ON CONFLICT(bucket, window_start) DO UPDATE SET count = count + 1`,
    [bucket, window],
  );
  const r = await db.first<{ count: number }>(
    'SELECT count FROM rate_limits WHERE bucket = ? AND window_start = ?',
    [bucket, window],
  );
  return Number(r?.count ?? 0) <= limit;
}

async function clientKey(c: C): Promise<string> {
  const ip =
    c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  return (await sha256Hex(`ip:${ip}`)).slice(0, 24);
}

export function createApp(getDeps: (c: Context) => AppDeps): Hono<HonoEnv> {
  const app = new Hono<HonoEnv>();

  app.use('*', async (c, next) => {
    c.set('deps', getDeps(c));
    await next();
    c.header('x-content-type-options', 'nosniff');
    c.header('referrer-policy', 'no-referrer');
    c.header('x-frame-options', 'DENY');
    c.header('cache-control', 'no-store');
  });

  // ── signed internal bridge (monitor → D1); never reachable with a browser session
  app.post('/internal/v1/sql', async (c) => {
    const d = c.get('deps');
    const body = await c.req.text();
    const r = await handleBridge(d.db, d.env.BRIDGE_SECRET, c.req.raw.headers, body, d.now());
    return c.json(r.json as object, r.status as 200);
  });

  const api = new Hono<HonoEnv>();

  // ── authentication
  api.get('/auth/status', async (c) => {
    const d = c.get('deps');
    const acct = await d.db.first<{ id: string }>(`SELECT id FROM accounts WHERE user_id = ?`, [
      OWNER_USER_ID,
    ]);
    return ok(c, { ownerConfigured: Boolean(acct) });
  });

  /** First-run owner setup. Requires the SETUP_TOKEN secret, so an exposed deployment cannot be claimed. */
  api.post('/auth/setup', async (c) => {
    const d = c.get('deps');
    const body = (await c.req.json().catch(() => ({}))) as {
      setupToken?: string;
      email?: string;
      password?: string;
    };
    if (!d.env.SETUP_TOKEN || body.setupToken !== d.env.SETUP_TOKEN)
      return fail(c, 403, 'invalid setup token');
    if (await d.db.first(`SELECT id FROM accounts WHERE user_id = ?`, [OWNER_USER_ID]))
      return fail(c, 409, 'owner already configured');
    if (!body.email || !/^[^@\s]+@[^@\s]+$/.test(body.email)) return fail(c, 400, 'valid email required');
    if (!body.password || body.password.length < 12)
      return fail(c, 400, 'password must be at least 12 characters');
    const now = d.now();
    await d.db.batch([
      { sql: `UPDATE users SET email = ? WHERE id = ?`, params: [body.email.toLowerCase(), OWNER_USER_ID] },
      {
        sql: `INSERT INTO accounts (id, user_id, kind, password_hash, created_at, updated_at) VALUES (?, ?, 'PASSWORD', ?, ?, ?)`,
        params: ['acc_owner', OWNER_USER_ID, await hashPassword(body.password), now, now],
      },
      await auditStmt({ category: 'AUTH', action: 'OWNER_SETUP', actor: OWNER_USER_ID, at: now }),
    ]);
    return ok(c, { configured: true });
  });

  api.post('/auth/login', async (c) => {
    const d = c.get('deps');
    const now = d.now();
    const key = await clientKey(c);
    if (!(await rateLimit(d.db, `login:${key}`, 5, 60_000, now)))
      return fail(c, 429, 'too many attempts; wait a minute');
    const body = (await c.req.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
      totp?: string;
    };
    const acct = await d.db.first<{
      id: string;
      password_hash: string;
      totp_enabled: number;
      totp_secret: string | null;
      failed_attempts: number;
      locked_until: number | null;
      email: string;
    }>(
      `SELECT a.id, a.password_hash, a.totp_enabled, a.totp_secret, a.failed_attempts, a.locked_until, u.email FROM accounts a JOIN users u ON u.id = a.user_id WHERE u.email = ?`,
      [(body.email ?? '').toLowerCase()],
    );
    const generic = () => fail(c, 401, 'invalid credentials');
    if (!acct) {
      await hashPassword('timing-equaliser', 1000);
      return generic();
    }
    if (acct.locked_until && acct.locked_until > now) return fail(c, 423, 'account temporarily locked');
    const passOk = await verifyPassword(body.password ?? '', acct.password_hash);
    const mfaOk = acct.totp_enabled ? await verifyTotp(acct.totp_secret!, body.totp ?? '', now) : true;
    if (!passOk || !mfaOk) {
      const failures = acct.failed_attempts + 1;
      await d.db.batch([
        {
          sql: `UPDATE accounts SET failed_attempts = ?, locked_until = ?, updated_at = ? WHERE id = ?`,
          params: [failures, failures >= 10 ? now + 15 * 60_000 : null, now, acct.id],
        },
        await auditStmt({
          category: 'AUTH',
          action: 'LOGIN_FAILED',
          actor: 'anonymous',
          detail: { reason: passOk ? 'mfa' : 'password', failures },
          at: now,
        }),
      ]);
      return passOk && acct.totp_enabled ? fail(c, 401, 'invalid or missing MFA code') : generic();
    }
    const token = randomToken();
    const csrf = randomToken(24);
    await d.db.batch([
      {
        sql: `UPDATE accounts SET failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?`,
        params: [now, acct.id],
      },
      {
        sql: `INSERT INTO sessions (id_hash, user_id, csrf_token, mfa_verified, created_at, expires_at, last_seen_at, ip_hash, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          await sessionHash(token),
          OWNER_USER_ID,
          csrf,
          acct.totp_enabled ? 1 : 0,
          now,
          now + SESSION_TTL,
          now,
          key,
          (c.req.header('user-agent') ?? '').slice(0, 200),
        ],
      },
      await auditStmt({
        category: 'AUTH',
        action: 'LOGIN',
        actor: OWNER_USER_ID,
        detail: { mfa: Boolean(acct.totp_enabled) },
        at: now,
      }),
    ]);
    setCookie(c, SESSION_COOKIE, token, {
      httpOnly: true,
      secure: d.env.COOKIE_SECURE,
      sameSite: 'Strict',
      path: '/',
      maxAge: SESSION_TTL / 1000,
    });
    return ok(c, { email: acct.email, csrfToken: csrf, mfaEnabled: Boolean(acct.totp_enabled) });
  });

  // ── everything below requires a session
  api.use('*', async (c, next) => {
    if (
      c.req.path.endsWith('/auth/login') ||
      c.req.path.endsWith('/auth/setup') ||
      c.req.path.endsWith('/auth/status')
    )
      return next();
    const d = c.get('deps');
    const token = getCookie(c, SESSION_COOKIE);
    if (!token) return fail(c, 401, 'not signed in');
    const now = d.now();
    const s = await d.db.first<{
      id_hash: string;
      user_id: string;
      csrf_token: string;
      mfa_verified: number;
      expires_at: number;
      last_seen_at: number;
      revoked_at: number | null;
      email: string;
      totp_enabled: number;
    }>(
      `SELECT s.id_hash, s.user_id, s.csrf_token, s.mfa_verified, s.expires_at, s.last_seen_at, s.revoked_at, u.email, COALESCE(a.totp_enabled, 0) AS totp_enabled
       FROM sessions s JOIN users u ON u.id = s.user_id LEFT JOIN accounts a ON a.user_id = u.id WHERE s.id_hash = ?`,
      [await sessionHash(token)],
    );
    if (!s || s.revoked_at || s.expires_at < now || now - s.last_seen_at > SESSION_IDLE) {
      deleteCookie(c, SESSION_COOKIE, { path: '/' });
      return fail(c, 401, 'session expired');
    }
    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      if (c.req.header('x-csrf-token') !== s.csrf_token) return fail(c, 403, 'CSRF token missing or invalid');
      const origin = c.req.header('origin');
      if (origin && new URL(origin).host !== new URL(c.req.url).host)
        return fail(c, 403, 'cross-origin request refused');
    }
    if (!(await rateLimit(d.db, `api:${s.id_hash.slice(0, 16)}`, 600, 60_000, now)))
      return fail(c, 429, 'rate limit exceeded');
    if (now - s.last_seen_at > 60_000)
      await d.db.run('UPDATE sessions SET last_seen_at = ? WHERE id_hash = ?', [now, s.id_hash]);
    c.set('session', {
      idHash: s.id_hash,
      userId: s.user_id,
      email: s.email,
      csrf: s.csrf_token,
      mfaVerified: Boolean(s.mfa_verified),
      mfaEnabled: Boolean(s.totp_enabled),
    });
    return next();
  });

  api.get('/auth/me', (c) => {
    const s = c.get('session');
    return ok(c, { email: s.email, csrfToken: s.csrf, mfaEnabled: s.mfaEnabled, mfaVerified: s.mfaVerified });
  });

  api.post('/auth/logout', async (c) => {
    const d = c.get('deps');
    await d.db.run('UPDATE sessions SET revoked_at = ? WHERE id_hash = ?', [
      d.now(),
      c.get('session').idHash,
    ]);
    deleteCookie(c, SESSION_COOKIE, { path: '/' });
    return ok(c, { signedOut: true });
  });

  api.post('/auth/mfa/enroll', async (c) => {
    const d = c.get('deps');
    const s = c.get('session');
    if (s.mfaEnabled) return fail(c, 409, 'MFA already enabled');
    const secret = newTotpSecret();
    await d.db.run('UPDATE accounts SET totp_secret = ?, updated_at = ? WHERE user_id = ?', [
      secret,
      d.now(),
      s.userId,
    ]);
    return ok(c, {
      secret,
      otpauth: `otpauth://totp/Solana%20Alpha%20Desk:${encodeURIComponent(s.email)}?secret=${secret}&issuer=Solana%20Alpha%20Desk&digits=6&period=30`,
    });
  });

  api.post('/auth/mfa/verify', async (c) => {
    const d = c.get('deps');
    const s = c.get('session');
    const { code } = (await c.req.json().catch(() => ({}))) as { code?: string };
    const acct = await d.db.first<{ totp_secret: string | null }>(
      'SELECT totp_secret FROM accounts WHERE user_id = ?',
      [s.userId],
    );
    if (!acct?.totp_secret || !(await verifyTotp(acct.totp_secret, code ?? '', d.now())))
      return fail(c, 400, 'code does not match');
    await d.db.batch([
      {
        sql: 'UPDATE accounts SET totp_enabled = 1, updated_at = ? WHERE user_id = ?',
        params: [d.now(), s.userId],
      },
      { sql: 'UPDATE sessions SET mfa_verified = 1 WHERE id_hash = ?', params: [s.idHash] },
      await auditStmt({ category: 'AUTH', action: 'MFA_ENABLED', actor: s.userId, at: d.now() }),
    ]);
    return ok(c, { mfaEnabled: true });
  });

  readRoutes(api);
  controlRoutes(api);

  app.route('/api/v1', api);
  app.notFound((c) =>
    c.req.path.startsWith('/api/') ? fail(c as unknown as C, 404, 'not found') : c.text('Not found', 404),
  );
  app.onError((err, c) => {
    console.error(JSON.stringify({ level: 'error', msg: 'api error', error: err.message, path: c.req.path }));
    return c.json(
      { ok: false, error: err instanceof SyntaxError ? 'malformed request' : 'internal error' },
      err instanceof SyntaxError ? 400 : 500,
    );
  });
  return app;
}

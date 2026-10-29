import { describe, expect, it } from 'vitest';
import { BRIDGE_PATH, bridgeSigningString } from '@alpha-desk/db';
import { recordJob } from '@alpha-desk/orchestrator';
import { hmacSha256Hex } from '@alpha-desk/shared';
import { createApp } from '../src/app.ts';
import { totp } from '../src/crypto.ts';
import { makeHarness } from '../../../tests/fixtures/world.ts';
import { openPositionFlow } from '../../../tests/fixtures/flows.ts';

const SETUP = 'setup-token-for-tests-0123456789';
const SECRET = 'bridge-secret-for-tests-0123456789abcdef';

async function setup(appEnv: 'development' | 'production' = 'development') {
  const h = await makeHarness();
  const app = createApp(() => ({
    db: h.db,
    ctx: () => h.ctx,
    evidence: h.store,
    env: { SETUP_TOKEN: SETUP, BRIDGE_SECRET: SECRET, APP_ENV: appEnv, COOKIE_SECURE: false },
    now: () => h.world.clock.now(),
  }));
  const call = (path: string, init: RequestInit & { cookie?: string; csrf?: string } = {}) =>
    app.request(`http://desk.test${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(init.cookie ? { cookie: init.cookie } : {}),
        ...(init.csrf ? { 'x-csrf-token': init.csrf } : {}),
        ...(init.headers as Record<string, string>),
      },
    });
  return { h, app, call };
}

async function signIn(call: Awaited<ReturnType<typeof setup>>['call']) {
  await call('/api/v1/auth/setup', {
    method: 'POST',
    body: JSON.stringify({
      setupToken: SETUP,
      email: 'owner@example.com',
      password: 'correct horse battery staple',
    }),
  });
  const res = await call('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'owner@example.com', password: 'correct horse battery staple' }),
  });
  const cookie = res.headers.get('set-cookie')!.split(';')[0]!;
  const csrf = ((await res.json()) as { data: { csrfToken: string } }).data.csrfToken;
  return { cookie, csrf };
}

describe('authentication', () => {
  it('requires the setup token, then a session for every private endpoint', async () => {
    const { call } = await setup();
    expect((await call('/api/v1/overview')).status).toBe(401);
    expect(
      (
        await call('/api/v1/auth/setup', {
          method: 'POST',
          body: JSON.stringify({ setupToken: 'wrong', email: 'a@b.c', password: 'x'.repeat(12) }),
        })
      ).status,
    ).toBe(403);
    const { cookie } = await signIn(call);
    expect(cookie).toMatch(/^ad_session=/);
    expect((await call('/api/v1/overview', { cookie })).status).toBe(200);
    expect(
      (
        await call('/api/v1/auth/setup', {
          method: 'POST',
          body: JSON.stringify({ setupToken: SETUP, email: 'x@y.z', password: 'y'.repeat(12) }),
        })
      ).status,
    ).toBe(409);
  });
  it('sets a hardened session cookie', async () => {
    const { call } = await setup();
    await call('/api/v1/auth/setup', {
      method: 'POST',
      body: JSON.stringify({
        setupToken: SETUP,
        email: 'owner@example.com',
        password: 'correct horse battery staple',
      }),
    });
    const res = await call('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'owner@example.com', password: 'correct horse battery staple' }),
    });
    const c = res.headers.get('set-cookie')!;
    expect(c).toMatch(/HttpOnly/);
    expect(c).toMatch(/SameSite=Strict/);
  });
  it('rejects bad passwords and rate-limits attempts', async () => {
    const { call } = await setup();
    await signIn(call);
    const statuses = [];
    for (let i = 0; i < 6; i++)
      statuses.push(
        (
          await call('/api/v1/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: 'owner@example.com', password: 'wrong password!' }),
          })
        ).status,
      );
    expect(statuses.slice(0, 4).every((s) => s === 401)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });
  it('enforces CSRF tokens and same-origin on mutations', async () => {
    const { call } = await setup();
    const { cookie, csrf } = await signIn(call);
    const body = JSON.stringify({ mode: 'PAPER_MANUAL', reason: 'test' });
    expect((await call('/api/v1/control/mode', { method: 'POST', cookie, body })).status).toBe(403);
    expect(
      (
        await call('/api/v1/control/mode', {
          method: 'POST',
          cookie,
          csrf,
          body,
          headers: { origin: 'https://evil.example' },
        })
      ).status,
    ).toBe(403);
    expect((await call('/api/v1/control/mode', { method: 'POST', cookie, csrf, body })).status).toBe(200);
  });
  it('requires MFA for administrative controls in production and supports TOTP enrollment', async () => {
    const { call, h } = await setup('production');
    const { cookie, csrf } = await signIn(call);
    expect(
      (
        await call('/api/v1/control/mode', {
          method: 'POST',
          cookie,
          csrf,
          body: JSON.stringify({ mode: 'PAPER_MANUAL', reason: 'test' }),
        })
      ).status,
    ).toBe(403);
    const enroll = (await (
      await call('/api/v1/auth/mfa/enroll', { method: 'POST', cookie, csrf })
    ).json()) as { data: { secret: string } };
    const code = await totp(enroll.data.secret, h.world.clock.now());
    expect(
      (
        await call('/api/v1/auth/mfa/verify', {
          method: 'POST',
          cookie,
          csrf,
          body: JSON.stringify({ code }),
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await call('/api/v1/control/mode', {
          method: 'POST',
          cookie,
          csrf,
          body: JSON.stringify({ mode: 'PAPER_MANUAL', reason: 'test' }),
        })
      ).status,
    ).toBe(200);
    // later logins need the code
    const noCode = await call('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'owner@example.com', password: 'correct horse battery staple' }),
    });
    expect(noCode.status).toBe(401);
  });
  it('logout revokes the session', async () => {
    const { call } = await setup();
    const { cookie, csrf } = await signIn(call);
    await call('/api/v1/auth/logout', { method: 'POST', cookie, csrf });
    expect((await call('/api/v1/overview', { cookie })).status).toBe(401);
  });
});

describe('signed internal bridge', () => {
  const signed = async (
    body: string,
    ts = Date.now(),
    nonce = `n_${Math.random().toString(16).slice(2, 14)}`,
    secret = SECRET,
  ) => ({
    'x-ad-timestamp': String(ts),
    'x-ad-nonce': nonce,
    'x-ad-signature': await hmacSha256Hex(secret, bridgeSigningString(String(ts), nonce, body)),
  });
  it('executes signed batches and refuses unsigned, stale, forged or replayed ones', async () => {
    const { call, h } = await setup();
    const body = JSON.stringify({
      op: 'first',
      statements: [{ sql: 'SELECT mode FROM runtime_state WHERE id = 1', params: [] }],
    });
    const now = h.world.clock.now();
    const good = await signed(body, now);
    const r = await call(BRIDGE_PATH, { method: 'POST', body, headers: good });
    expect(r.status).toBe(200);
    expect(((await r.json()) as { result: { mode: string } }).result.mode).toBe('PAPER_AUTONOMOUS');
    expect((await call(BRIDGE_PATH, { method: 'POST', body, headers: good })).status).toBe(409); // replay
    expect((await call(BRIDGE_PATH, { method: 'POST', body })).status).toBe(401);
    expect(
      (await call(BRIDGE_PATH, { method: 'POST', body, headers: await signed(body, now - 120_000) })).status,
    ).toBe(401);
    expect(
      (
        await call(BRIDGE_PATH, {
          method: 'POST',
          body,
          headers: await signed(body, now, undefined, 'x'.repeat(40)),
        })
      ).status,
    ).toBe(401);
    const tampered = await signed(body, now);
    expect(
      (await call(BRIDGE_PATH, { method: 'POST', body: body.replace('mode', 'timezone'), headers: tampered }))
        .status,
    ).toBe(401);
  });
  it('reports constraint violations so the monitor can detect lost races', async () => {
    const { call, h } = await setup();
    const body = JSON.stringify({ op: 'run', statements: [{ sql: 'DELETE FROM audit_events', params: [] }] });
    const r = await call(BRIDGE_PATH, {
      method: 'POST',
      body,
      headers: await signed(body, h.world.clock.now()),
    });
    expect(r.status).toBe(400);
    expect(((await r.json()) as { constraint: boolean }).constraint).toBe(true);
  });
});

describe('dashboard endpoints return persisted data', () => {
  it('serves overview, candidates, token intelligence, risk, agents, journal, analytics and health', async () => {
    const { call, h } = await setup();
    const { cookie, csrf } = await signIn(call);
    const tok = await openPositionFlow(h);
    const get = async (p: string) => {
      const r = await call(p, { cookie });
      expect(r.status, p).toBe(200);
      return ((await r.json()) as { data: Record<string, unknown> }).data;
    };
    const ov = await get('/api/v1/overview');
    expect(ov.kind).toBe('PAPER');
    expect((ov.portfolio as { activePositions: number }).activePositions).toBe(1);
    const cands = await get('/api/v1/candidates?sort=mcap&dir=desc');
    expect((cands.rows as unknown[]).length).toBe(1);
    const ti = await get(`/api/v1/tokens/${tok.mint}`);
    expect((ti.rules as unknown[]).length).toBe(18);
    expect((ti.factors as unknown[]).length).toBe(6);
    const risk = await get('/api/v1/risk');
    expect(Number(risk.exposurePct)).toBeLessThanOrEqual(24);
    expect((await get('/api/v1/agents')).agents).toHaveLength(6);
    expect((await get('/api/v1/journal')).rows).toHaveLength(1);
    expect((await get('/api/v1/analytics')).validation).toEqual({ target: 100, completed: 0 });
    expect((await get('/api/v1/health')).providers).toBeTruthy();
    expect((await get('/api/v1/settings')).configVersion).toMatch(/^cfg_/);
    const pos = (await get('/api/v1/positions?status=open')).rows as Array<{ id: string }>;
    expect((await get(`/api/v1/positions/${pos[0]!.id}`)).fills).toHaveLength(1);
    const gen = await call('/api/v1/reports/generate', {
      method: 'POST',
      cookie,
      csrf,
      body: JSON.stringify({ kind: 'REJECTION_FUNNEL' }),
    });
    expect(gen.status).toBe(200);
    expect(((await get('/api/v1/reports')).rows as unknown[]).length).toBe(1);
    // manual close goes through Risk → Executor
    expect(
      (await call(`/api/v1/positions/${pos[0]!.id}/close`, { method: 'POST', cookie, csrf })).status,
    ).toBe(200);
  });
  it('marks the desk DEGRADED only when a feed that decisions depend on is failing', async () => {
    const { call, h } = await setup();
    const { cookie } = await signIn(call);
    const now = h.world.clock.now();
    await recordJob(h.db, 'monitor', { now, ok: true, error: null, instanceId: 'test' });
    const health = (p: string, calls: number, errors: number) =>
      h.db.run(
        `INSERT INTO provider_health (provider_id, window_start, calls, errors, rate_limited) VALUES (?, ?, ?, ?, ?)`,
        [p, now - 60_000, calls, errors, errors],
      );
    const status = async () =>
      ((await (await call('/api/v1/overview', { cookie })).json()) as { data: { systemStatus: string } }).data
        .systemStatus;
    await health('dexscreener', 90, 10);
    await health('geckoterminal', 40, 28); // supplementary discovery feed, shared-IP rate limits
    expect(await status()).toBe('HEALTHY');
    await health('helius', 20, 9);
    expect(await status()).toBe('DEGRADED');
  });
  it('validates breaker resets with the documented phrase', async () => {
    const { call } = await setup();
    const { cookie, csrf } = await signIn(call);
    await call('/api/v1/control/emergency-pause', {
      method: 'POST',
      cookie,
      csrf,
      body: JSON.stringify({ reason: 'drill' }),
    });
    expect(
      (
        await call('/api/v1/control/mode', {
          method: 'POST',
          cookie,
          csrf,
          body: JSON.stringify({ mode: 'PAPER_AUTONOMOUS', reason: 'resume' }),
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await call('/api/v1/control/breakers/EMERGENCY_PAUSE/reset', {
          method: 'POST',
          cookie,
          csrf,
          body: JSON.stringify({ phrase: 'yes', reason: 'drill complete, all clear' }),
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await call('/api/v1/control/breakers/EMERGENCY_PAUSE/reset', {
          method: 'POST',
          cookie,
          csrf,
          body: JSON.stringify({ phrase: 'RESET EMERGENCY_PAUSE', reason: 'drill complete, all clear' }),
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await call('/api/v1/control/mode', {
          method: 'POST',
          cookie,
          csrf,
          body: JSON.stringify({ mode: 'PAPER_AUTONOMOUS', reason: 'resume' }),
        })
      ).status,
    ).toBe(200);
  });
});

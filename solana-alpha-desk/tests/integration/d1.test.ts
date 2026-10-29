import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getPlatformProxy } from 'wrangler';
import { D1Db, isConstraintError, type D1Like } from '@alpha-desk/db';
import { DEFAULT_STRATEGY } from '@alpha-desk/config';
import {
  bootstrap,
  guardStmt,
  GUARD_CLEANUP,
  monitorPositions,
  MonitorMemory,
  runReconciliation,
} from '@alpha-desk/orchestrator';
import { makeHarness } from '../fixtures/world.ts';
import { openPositionFlow } from '../fixtures/flows.ts';

/**
 * Runs against a real D1 binding (workerd via Wrangler's platform proxy, local mode) to prove the
 * SQL and the atomic-batch guard behave on Cloudflare's engine exactly as on node:sqlite.
 */
let proxy: Awaited<ReturnType<typeof getPlatformProxy>>;
let db: D1Db;

beforeAll(async () => {
  proxy = await getPlatformProxy({
    configPath: new URL('../../apps/api/wrangler.jsonc', import.meta.url).pathname,
    persist: false,
  });
  const d1 = (proxy.env as { DB: D1Like & { exec(sql: string): Promise<unknown> } }).DB;
  const { readdirSync, readFileSync } = await import('node:fs');
  const dir = new URL('../../infrastructure/migrations/', import.meta.url).pathname;
  // D1's exec() runs one statement per line, so each statement is folded onto a single line.
  for (const f of readdirSync(dir).sort())
    await d1.exec(
      readFileSync(dir + f, 'utf8')
        .replace(/--.*$/gm, '')
        .replace(/\n(?!CREATE|INSERT|PRAGMA)/g, ' '),
    );
  db = new D1Db(d1);
}, 60_000);

afterAll(async () => {
  await proxy?.dispose();
});

describe('Cloudflare D1 (local workerd)', () => {
  it('bootstraps the schema and initial portfolio', async () => {
    const r = await bootstrap(db, {
      config: DEFAULT_STRATEGY,
      env: {},
      ownerEmail: 'owner@example.com',
      now: Date.now(),
      actor: 'TEST',
    });
    expect(r.portfolioId).toMatch(/^pf_/);
    const cash = await db.first<{ s: number }>(
      `SELECT SUM(CAST(amount AS INTEGER)) AS s FROM ledger_entries WHERE account = 'CASH'`,
    );
    expect(Number(cash?.s)).toBe(10_000_000_000);
  });
  it('rolls back a whole batch when its guard condition is false', async () => {
    const before = await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM configuration_changes');
    await expect(
      db.batch([
        guardStmt('EXISTS (SELECT 1 FROM runtime_state WHERE mode = ?)', ['NO_SUCH_MODE']),
        {
          sql: `INSERT INTO configuration_changes (id, scope, new_value, reason, actor, created_at) VALUES ('cc_x', 'RUNTIME', 'x', 'x', 'x', 0)`,
          params: [],
        },
        GUARD_CLEANUP,
      ]),
    ).rejects.toSatisfy(isConstraintError);
    expect((await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM configuration_changes'))?.n).toBe(
      before?.n,
    );
    await db.batch([
      guardStmt('EXISTS (SELECT 1 FROM runtime_state)', []),
      {
        sql: `INSERT INTO configuration_changes (id, scope, new_value, reason, actor, created_at) VALUES ('cc_y', 'RUNTIME', 'y', 'y', 'y', 0)`,
        params: [],
      },
      GUARD_CLEANUP,
    ]);
    expect(
      Number((await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM configuration_changes'))?.n),
    ).toBe(Number(before?.n) + 1);
  });
  it('enforces append-only triggers and the portfolio version lock', async () => {
    await expect(db.run('DELETE FROM ledger_entries')).rejects.toSatisfy(isConstraintError);
    const pf = await db.first<{ id: string }>('SELECT id FROM portfolios');
    await expect(
      db.run(
        'INSERT INTO portfolio_versions (portfolio_id, version, committed_at, reason) VALUES (?, 0, 0, ?)',
        [pf!.id, 'dup'],
      ),
    ).rejects.toSatisfy(isConstraintError);
  });
  it('runs the full paper lifecycle on D1: fill, trailing stop, exit, reconciliation', async () => {
    await db.run('DELETE FROM runtime_state');
    const h = await makeHarness({ db });
    await db.run(`UPDATE runtime_state SET mode = 'PAPER_AUTONOMOUS'`);
    const tok = await openPositionFlow(h);
    expect(
      (await db.first<{ status: string }>(`SELECT status FROM positions WHERE mint = ?`, [tok.mint]))?.status,
    ).toBe('OPEN');
    const mem = new MonitorMemory();
    h.world.setPrice(tok, h.world.price(tok) * 1.2);
    h.world.clock.advance(2000);
    await monitorPositions(h.ctx, mem);
    h.world.setPrice(tok, h.world.price(tok) * 0.85);
    h.world.clock.advance(2000);
    await monitorPositions(h.ctx, mem);
    expect(
      (await db.first<{ status: string }>(`SELECT status FROM positions WHERE mint = ?`, [tok.mint]))?.status,
    ).toBe('CLOSED');
    expect((await runReconciliation(h.ctx)).ok).toBe(true);
  }, 60_000);
});

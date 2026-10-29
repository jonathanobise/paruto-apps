import { ConstraintError, type RunResult, type SqlDb, type SqlValue, type Statement } from './driver.ts';

/** Minimal structural type of a Cloudflare D1 binding, so this package needs no Workers types. */
export interface D1Like {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      all<T>(): Promise<{ results: T[] }>;
      first<T>(): Promise<T | null>;
      run(): Promise<{ meta: { changes?: number } }>;
    };
  };
  batch(statements: unknown[]): Promise<Array<{ meta: { changes?: number } }>>;
}

function wrap(err: unknown): unknown {
  const msg = err instanceof Error ? err.message : String(err);
  return /constraint|append-only|immutable|never deleted|final|may not be lowered|already consumed|must be positive/i.test(
    msg,
  )
    ? new ConstraintError(msg, err)
    : err;
}

/** Cloudflare D1 binding driver. `batch()` is documented by Cloudflare as a single SQL transaction. */
export class D1Db implements SqlDb {
  readonly driver = 'd1' as const;
  constructor(private readonly d1: D1Like) {}

  async all<T>(sql: string, params: SqlValue[] = []): Promise<T[]> {
    try {
      return (
        await this.d1
          .prepare(sql)
          .bind(...params)
          .all<T>()
      ).results;
    } catch (e) {
      throw wrap(e);
    }
  }
  async first<T>(sql: string, params: SqlValue[] = []): Promise<T | null> {
    try {
      return await this.d1
        .prepare(sql)
        .bind(...params)
        .first<T>();
    } catch (e) {
      throw wrap(e);
    }
  }
  async run(sql: string, params: SqlValue[] = []): Promise<RunResult> {
    try {
      const r = await this.d1
        .prepare(sql)
        .bind(...params)
        .run();
      return { changes: r.meta.changes ?? 0 };
    } catch (e) {
      throw wrap(e);
    }
  }
  async batch(statements: Statement[]): Promise<RunResult[]> {
    try {
      const res = await this.d1.batch(
        statements.map((s) => this.d1.prepare(s.sql).bind(...(s.params ?? []))),
      );
      return res.map((r) => ({ changes: r.meta.changes ?? 0 }));
    } catch (e) {
      throw wrap(e);
    }
  }
}

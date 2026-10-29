import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { ConstraintError, type RunResult, type SqlDb, type SqlValue, type Statement } from './driver.ts';

function wrap(err: unknown): unknown {
  const msg = err instanceof Error ? err.message : String(err);
  if (/constraint|append-only|immutable|never deleted|final|may not be lowered|already consumed|must be positive/i.test(msg)) {
    return new ConstraintError(msg, err);
  }
  return err;
}

/** node:sqlite driver for local development, tests, replay and single-host operation. */
export class NodeSqliteDb implements SqlDb {
  readonly driver = 'node-sqlite' as const;
  private readonly db: DatabaseSync;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    if (path !== ':memory:') this.db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;');
  }

  /** Serialise all access so a batch's BEGIN…COMMIT is never interleaved with another call. */
  private exclusive<T>(fn: () => T): Promise<T> {
    const next = this.queue.then(fn, fn);
    this.queue = next.catch(() => undefined);
    return next;
  }

  async all<T>(sql: string, params: SqlValue[] = []): Promise<T[]> {
    return this.exclusive(() => {
      try {
        return this.db.prepare(sql).all(...(params as SQLInputValue[])) as T[];
      } catch (e) {
        throw wrap(e);
      }
    });
  }

  async first<T>(sql: string, params: SqlValue[] = []): Promise<T | null> {
    return this.exclusive(() => {
      try {
        return (this.db.prepare(sql).get(...(params as SQLInputValue[])) as T | undefined) ?? null;
      } catch (e) {
        throw wrap(e);
      }
    });
  }

  async run(sql: string, params: SqlValue[] = []): Promise<RunResult> {
    return this.exclusive(() => {
      try {
        const r = this.db.prepare(sql).run(...(params as SQLInputValue[]));
        return { changes: Number(r.changes) };
      } catch (e) {
        throw wrap(e);
      }
    });
  }

  async batch(statements: Statement[]): Promise<RunResult[]> {
    return this.exclusive(() => {
      this.db.exec('BEGIN IMMEDIATE');
      try {
        const out = statements.map((s) => ({
          changes: Number(this.db.prepare(s.sql).run(...((s.params ?? []) as SQLInputValue[])).changes),
        }));
        this.db.exec('COMMIT');
        return out;
      } catch (e) {
        this.db.exec('ROLLBACK');
        throw wrap(e);
      }
    });
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  close(): void {
    this.db.close();
  }
}

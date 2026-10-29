export type SqlValue = string | number | null;

export interface Statement {
  sql: string;
  params?: SqlValue[];
}

export interface RunResult {
  changes: number;
}

/**
 * The narrow SQL surface every driver implements (D1 binding, node:sqlite, signed bridge).
 * `batch` is atomic: all statements commit or none do.
 */
export interface SqlDb {
  readonly driver: 'd1' | 'node-sqlite' | 'bridge';
  all<T = Record<string, unknown>>(sql: string, params?: SqlValue[]): Promise<T[]>;
  first<T = Record<string, unknown>>(sql: string, params?: SqlValue[]): Promise<T | null>;
  run(sql: string, params?: SqlValue[]): Promise<RunResult>;
  batch(statements: Statement[]): Promise<RunResult[]>;
}

export class ConstraintError extends Error {
  constructor(message: string, override readonly cause?: unknown) {
    super(message);
    this.name = 'ConstraintError';
  }
}

/** True for unique / primary-key / check / trigger-abort failures, which callers may treat as a lost race. */
export function isConstraintError(err: unknown): boolean {
  if (err instanceof ConstraintError) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /UNIQUE constraint|PRIMARY KEY|constraint failed|SQLITE_CONSTRAINT/i.test(msg);
}

export function stmt(sql: string, ...params: SqlValue[]): Statement {
  return { sql, params };
}

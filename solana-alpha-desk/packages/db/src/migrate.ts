import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NodeSqliteDb } from './node-sqlite.ts';

/**
 * Applies migrations to a node:sqlite database, tracking them in `d1_migrations` exactly as
 * `wrangler d1 migrations apply` does, so a database can move between the two tools.
 */
export async function migrateNodeDb(db: NodeSqliteDb, dir: string): Promise<string[]> {
  db.exec(`CREATE TABLE IF NOT EXISTS d1_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL)`);
  const applied = new Set((await db.all<{ name: string }>('SELECT name FROM d1_migrations')).map((r) => r.name));
  const files = readdirSync(dir).filter((f) => /^\d{4}_.+\.sql$/.test(f)).sort();
  const ran: string[] = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(dir, file), 'utf8');
    db.exec('BEGIN');
    try {
      db.exec(sql);
      db.exec(`INSERT INTO d1_migrations (name) VALUES ('${file.replace(/'/g, "''")}')`);
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw new Error(`migration ${file} failed: ${(e as Error).message}`);
    }
    ran.push(file);
  }
  return ran;
}

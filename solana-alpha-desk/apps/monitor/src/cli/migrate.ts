import { migrateNodeDb, NodeSqliteDb } from '@alpha-desk/db/node';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { MIGRATIONS_DIR } from '../context.ts';
import { loadEnv } from '../env.ts';

const env = loadEnv();
mkdirSync(dirname(resolve(env.DATABASE_PATH)), { recursive: true });
const db = new NodeSqliteDb(env.DATABASE_PATH);
const ran = await migrateNodeDb(db, MIGRATIONS_DIR);
console.log(ran.length ? `applied: ${ran.join(', ')}` : 'database is up to date');

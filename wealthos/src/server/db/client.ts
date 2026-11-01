import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import pg from "pg";
import * as schema from "./schema";
import { env } from "@/server/platform/env";

export type Database = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type Executor = Database | Tx;

const globalForDb = globalThis as unknown as { __wosPool?: pg.Pool; __wosDb?: Database };

export function db(): Database {
  if (!globalForDb.__wosDb) {
    globalForDb.__wosPool = new pg.Pool({ connectionString: env().DATABASE_URL, max: 10, idleTimeoutMillis: 30_000 });
    globalForDb.__wosDb = drizzle(globalForDb.__wosPool, { schema });
  }
  return globalForDb.__wosDb;
}

export async function closeDb(): Promise<void> {
  await globalForDb.__wosPool?.end();
  globalForDb.__wosPool = undefined;
  globalForDb.__wosDb = undefined;
}

export interface TenantContext {
  userId: string;
  orgId: string;
}

/**
 * Run `fn` in a transaction whose row-level-security context is the given user and organisation.
 * Postgres policies only return rows of `orgId`, and only if `userId` is a member of it, so an
 * application bug that passes the wrong ids cannot read another tenant's data.
 */
export async function withTenant<T>(ctx: TenantContext, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${ctx.userId}, true), set_config('app.org_id', ${ctx.orgId}, true)`);
    return fn(tx);
  });
}

/** Transaction with only the user in context (memberships and organisations they belong to). */
export async function withUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true), set_config('app.org_id', '', true)`);
    return fn(tx);
  });
}

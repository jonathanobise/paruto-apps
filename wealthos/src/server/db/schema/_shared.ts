import { customType, numeric, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/** Case-insensitive text (Postgres citext extension). */
export const citext = customType<{ data: string }>({ dataType: () => "citext" });

/** Money amounts: exact decimal, read and written as strings (never JS numbers). */
export const amount = (name: string) => numeric(name, { precision: 38, scale: 10 });
/** Quantities and prices. */
export const quantity = (name: string) => numeric(name, { precision: 38, scale: 12 });
/** FX rates and ratios. */
export const rate = (name: string) => numeric(name, { precision: 38, scale: 16 });

export const id = () => uuid("id").primaryKey().default(sql`gen_random_uuid()`);
export const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
export const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

import { jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { updatedAt } from "./_shared";
import { users } from "./identity";

/** Platform configuration edited by administrators (audited). Values are validated in code. */
export const platformSettings = pgTable("platform_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull(),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: updatedAt(),
});

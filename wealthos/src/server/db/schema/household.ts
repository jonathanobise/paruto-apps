import { foreignKey, index, numeric, pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, id } from "./_shared";
import { organizations } from "./tenancy";
import { users } from "./identity";
import { financialAccounts } from "./portfolio";

/**
 * Who in a household owns an account. Splits the space's share of the account (its ownership
 * percent) between members; shares per account total at most 100 (the rest is "shared /
 * unassigned"). Only members of the organisation can own (enforced in Postgres).
 */
export const accountOwners = pgTable("account_owners", {
  id: id(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  percent: numeric("percent", { precision: 7, scale: 4 }).notNull(),
  createdAt: createdAt(),
}, (t) => [
  foreignKey({ columns: [t.orgId, t.accountId], foreignColumns: [financialAccounts.orgId, financialAccounts.id], name: "account_owners_account_fk" }).onDelete("cascade"),
  uniqueIndex("account_owners_account_user_idx").on(t.accountId, t.userId),
  index("account_owners_org_idx").on(t.orgId),
]);

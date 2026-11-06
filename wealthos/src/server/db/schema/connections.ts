import { foreignKey, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./_shared";
import { organizations } from "./tenancy";
import { users } from "./identity";
import { financialAccounts } from "./portfolio";

export const connectionStatus = pgEnum("connection_status", ["active", "error", "expired", "revoked"]);

/**
 * A consented, read-only link between a WealthOS account and an account at a financial
 * institution, through an authorised data provider. Provider credentials are encrypted at rest
 * (APP_ENCRYPTION_KEY) and deleted on revocation. Synced transactions arrive as import previews
 * the user reviews before anything reaches the ledger.
 */
export const institutionConnections = pgTable("institution_connections", {
  id: id(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").notNull(),
  provider: text("provider").notNull(),
  /** The provider's identifier for the linked account (never a bank login). */
  providerAccountRef: text("provider_account_ref").notNull(),
  institutionName: text("institution_name").notNull(),
  status: connectionStatus("status").notNull().default("active"),
  /** What the user allowed: balances, transactions. */
  scopes: text("scopes").array().notNull(),
  consentGrantedBy: uuid("consent_granted_by").notNull().references(() => users.id),
  consentGrantedAt: timestamp("consent_granted_at", { withTimezone: true }).notNull().defaultNow(),
  consentExpiresAt: timestamp("consent_expires_at", { withTimezone: true }).notNull(),
  credentialsEnc: text("credentials_enc"),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  lastSyncResult: text("last_sync_result"),
  lastError: text("last_error"),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  revokedBy: uuid("revoked_by").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [
  foreignKey({ columns: [t.orgId, t.accountId], foreignColumns: [financialAccounts.orgId, financialAccounts.id], name: "institution_connections_account_fk" }).onDelete("cascade"),
  index("institution_connections_org_idx").on(t.orgId, t.status),
]);

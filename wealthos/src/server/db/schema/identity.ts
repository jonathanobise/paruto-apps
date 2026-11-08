import { bigint, boolean, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uuid, uniqueIndex, inet } from "drizzle-orm/pg-core";
import { citext, createdAt, id, updatedAt } from "./_shared";

export const platformRole = pgEnum("platform_role", ["user", "support", "compliance", "admin"]);

export const users = pgTable("users", {
  id: id(),
  email: citext("email").notNull(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  passwordHash: text("password_hash"),
  displayName: text("display_name").notNull(),
  /** Paruto ID (id.paruto.com) subject this account is linked to, set at the first Paruto ID sign-in. */
  parutoIdSub: text("paruto_id_sub"),
  platformRole: platformRole("platform_role").notNull().default("user"),
  /** AES-256-GCM encrypted TOTP secret (base64 iv|tag|ciphertext). */
  mfaTotpSecretEnc: text("mfa_totp_secret_enc"),
  mfaEnabledAt: timestamp("mfa_enabled_at", { withTimezone: true }),
  /** Last TOTP time step accepted: a code can't be used twice (replay protection). */
  mfaLastUsedStep: bigint("mfa_last_used_step", { mode: "number" }),
  /** SHA-256 hashes of unused recovery codes. */
  mfaRecoveryCodeHashes: jsonb("mfa_recovery_code_hashes").$type<string[]>(),
  failedLoginCount: integer("failed_login_count").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (t) => [uniqueIndex("users_email_key").on(t.email), uniqueIndex("users_paruto_id_sub_key").on(t.parutoIdSub)]);

export const sessions = pgTable("sessions", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  /** SHA-256 of the session token; the raw token only ever lives in the user's cookie. */
  tokenHash: text("token_hash").notNull(),
  mfaSatisfied: boolean("mfa_satisfied").notNull().default(false),
  activeOrgId: uuid("active_org_id"),
  ip: inet("ip"),
  userAgent: text("user_agent"),
  createdAt: createdAt(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, (t) => [uniqueIndex("sessions_token_hash_key").on(t.tokenHash), index("sessions_user_idx").on(t.userId)]);

export const tokenPurpose = pgEnum("token_purpose", ["email_verification", "password_reset", "account_deletion"]);

export const verificationTokens = pgTable("verification_tokens", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  purpose: tokenPurpose("purpose").notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: createdAt(),
}, (t) => [uniqueIndex("verification_tokens_hash_key").on(t.tokenHash), index("verification_tokens_user_idx").on(t.userId, t.purpose)]);

/** Append-only log of security-relevant events (sign-ins, MFA changes, password resets…). */
export const securityEvents = pgTable("security_events", {
  id: id(),
  userId: uuid("user_id"),
  type: text("type").notNull(),
  ip: inet("ip"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
}, (t) => [index("security_events_user_idx").on(t.userId, t.createdAt)]);

export const userPreferences = pgTable("user_preferences", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  baseCurrency: text("base_currency").notNull().default("NGN"),
  locale: text("locale").notNull().default("en-NG"),
  timezone: text("timezone").notNull().default("Africa/Lagos"),
  theme: text("theme").notNull().default("system"),
  notifications: jsonb("notifications").$type<{ inApp: boolean; email: boolean; productUpdates: boolean }>().notNull().default({ inApp: true, email: false, productUpdates: false }),
  updatedAt: updatedAt(),
});

/** Append-only record of consents given or withdrawn (NDPA lawful-basis evidence). */
export const consentRecords = pgTable("consent_records", {
  id: id(),
  userId: uuid("user_id").notNull(),
  consentKey: text("consent_key").notNull(),
  version: text("version").notNull(),
  granted: boolean("granted").notNull(),
  ip: inet("ip"),
  userAgent: text("user_agent"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("consent_records_user_idx").on(t.userId, t.consentKey, t.recordedAt)]);

/** Development/test email transport. A production provider adapter replaces delivery, not this API. */
export const emailOutbox = pgTable("email_outbox", {
  id: id(),
  toAddress: text("to_address").notNull(),
  subject: text("subject").notNull(),
  textBody: text("text_body").notNull(),
  purpose: text("purpose").notNull(),
  transport: text("transport").notNull(),
  createdAt: createdAt(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
}, (t) => [index("email_outbox_to_idx").on(t.toAddress, t.createdAt)]);

export const rateLimitBuckets = pgTable("rate_limit_buckets", {
  key: text("key").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull().default(0),
}, (t) => [primaryKey({ columns: [t.key, t.windowStart] })]);

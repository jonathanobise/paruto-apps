import { index, integer, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "./_shared";
import { organizations } from "./tenancy";
import { users } from "./identity";

/**
 * AI research assistant logs. Private to the user (RLS), deletable by them. Message text is stored
 * after redaction; tool RESULTS are never stored (only tool names and arguments), so financial
 * details returned to the model are not duplicated into logs.
 */
export const aiConversations = pgTable("ai_conversations", {
  id: id(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  /** none | needs_review (an advice-boundary or output-policy flag fired) | reviewed */
  reviewStatus: text("review_status").notNull().default("none"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (t) => [index("ai_conversations_user_idx").on(t.userId, t.updatedAt)]);

export const aiMessages = pgTable("ai_messages", {
  id: id(),
  conversationId: uuid("conversation_id").notNull().references(() => aiConversations.id, { onDelete: "cascade" }),
  orgId: uuid("org_id").notNull(),
  userId: uuid("user_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  toolCalls: jsonb("tool_calls").$type<Array<{ name: string; input: unknown; ok: boolean }>>().notNull().default([]),
  model: text("model"),
  stopReason: text("stop_reason"),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  policyFlags: text("policy_flags").array().notNull().default([]),
  createdAt: createdAt(),
}, (t) => [index("ai_messages_conversation_idx").on(t.conversationId, t.createdAt), index("ai_messages_usage_idx").on(t.orgId, t.createdAt)]);

/** Sources the answer relied on (from tool provenance), shown under each answer. */
export const aiSourceReferences = pgTable("ai_source_references", {
  id: id(),
  messageId: uuid("message_id").notNull().references(() => aiMessages.id, { onDelete: "cascade" }),
  orgId: uuid("org_id").notNull(),
  userId: uuid("user_id").notNull(),
  kind: text("kind").notNull(),
  label: text("label").notNull(),
  asOf: text("as_of"),
  url: text("url"),
  createdAt: createdAt(),
}, (t) => [index("ai_source_references_message_idx").on(t.messageId)]);


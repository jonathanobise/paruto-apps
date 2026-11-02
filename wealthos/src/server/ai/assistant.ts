import "server-only";
import { enforceLimit } from "@/server/billing/entitlements";
import type Anthropic from "@anthropic-ai/sdk";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { aiConversations, aiMessages, aiSourceReferences, consentRecords, organizations } from "@/server/db/schema";
import { db, withTenant, type TenantContext } from "@/server/db/client";
import { AppError } from "@/server/platform/errors";
import { rateLimit } from "@/server/platform/rate-limit";
import { recordAudit, type RequestMeta } from "@/server/audit/audit";
import { currentConsents } from "@/server/identity/preferences";
import { ADVICE_BOUNDARY_NOTE, SAFE_ANSWER, checkOutput, classifyRequest, redact } from "./policy";
import { SYSTEM_PROMPT, contextNote } from "./prompt";
import { TOOLS, toolsFor, type ToolSource } from "./tools";
import type { AIProvider, ChatMessage } from "./provider";

/** Consent to let the assistant read the user's own records and send them to the AI vendor. */
export const AI_CONSENT_KEY = "ai_data_processing";
export const AI_CONSENT_VERSION = "2026-11-02";

export const AI_LIMITS = {
  messagesPerDay: 30,
  orgTokensPerMonth: Number(process.env.AI_ORG_MONTHLY_TOKEN_BUDGET) || 2_000_000,
  maxToolRounds: 6,
  maxOutputTokens: 4000,
  maxMessageChars: 2000,
  historyMessages: 12,
  toolResultChars: 20_000,
};

export async function hasAiConsent(userId: string): Promise<boolean> {
  return (await currentConsents(userId))[AI_CONSENT_KEY]?.granted === true;
}

export async function setAiConsent(userId: string, granted: boolean, meta: RequestMeta): Promise<void> {
  await db().insert(consentRecords).values({ userId, consentKey: AI_CONSENT_KEY, version: AI_CONSENT_VERSION, granted, ip: meta.ip ?? null, userAgent: meta.userAgent?.slice(0, 500) ?? null });
}

export async function listConversations(ctx: TenantContext) {
  return withTenant(ctx, (tx) => tx.select().from(aiConversations).where(eq(aiConversations.userId, ctx.userId)).orderBy(desc(aiConversations.updatedAt)).limit(50));
}

export async function getConversation(ctx: TenantContext, id: string) {
  return withTenant(ctx, async (tx) => {
    const [conversation] = await tx.select().from(aiConversations).where(eq(aiConversations.id, id));
    if (!conversation) throw new AppError("NOT_FOUND", "Conversation not found.");
    const messages = await tx.select().from(aiMessages).where(eq(aiMessages.conversationId, id)).orderBy(asc(aiMessages.createdAt));
    const refs = messages.length ? await tx.select().from(aiSourceReferences).where(inArray(aiSourceReferences.messageId, messages.map((m) => m.id))) : [];
    return { conversation, messages: messages.map((m) => ({ ...m, sources: refs.filter((r) => r.messageId === m.id) })) };
  });
}

export async function deleteConversation(ctx: TenantContext, id: string): Promise<void> {
  await withTenant(ctx, (tx) => tx.delete(aiConversations).where(and(eq(aiConversations.id, id), eq(aiConversations.userId, ctx.userId))));
}

export interface AskResult {
  conversationId: string;
  answer: string;
  flags: string[];
  sources: ToolSource[];
  toolCalls: Array<{ name: string; input: unknown; ok: boolean }>;
}

const answerText = (content: Anthropic.Beta.BetaContentBlock[]) =>
  content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("\n\n").trim();

/**
 * One user turn: policy checks → model with read-only tools (manual loop) → output check →
 * redacted log. The caller has already checked the AI_RESEARCH_ASSISTANT feature gate.
 */
export async function askAssistant(ctx: TenantContext, input: { conversationId?: string | null; message: string; baseCurrency: string; today?: string }, provider: AIProvider): Promise<AskResult> {
  const message = input.message.trim();
  if (!message) throw new AppError("VALIDATION", "Type a question first.");
  if (message.length > AI_LIMITS.maxMessageChars) throw new AppError("VALIDATION", `Keep questions under ${AI_LIMITS.maxMessageChars} characters.`);
  await rateLimit(`ai:user:${ctx.userId}`, AI_LIMITS.messagesPerDay, 86_400);

  const personalDataAllowed = await hasAiConsent(ctx.userId);
  const { history, conversationId: existingId, isDemo } = await withTenant(ctx, async (tx) => {
    const usage = await tx.execute<{ n: string }>(sql`select app_ai_tokens_this_month(${ctx.orgId}) as n`);
    if (Number(usage.rows[0]?.n ?? 0) >= AI_LIMITS.orgTokensPerMonth) throw new AppError("RATE_LIMITED", "This workspace has used its assistant allowance for the month. It resets on the 1st.");
    await enforceLimit(tx, ctx, "aiQuestionsPerMonth");
    const [org] = await tx.select({ isDemo: organizations.isDemo }).from(organizations).where(eq(organizations.id, ctx.orgId));
    const convId = input.conversationId ?? null;
    let past: Array<{ role: string; content: string }> = [];
    if (convId) {
      const [c] = await tx.select({ id: aiConversations.id }).from(aiConversations).where(and(eq(aiConversations.id, convId), eq(aiConversations.userId, ctx.userId)));
      if (!c) throw new AppError("NOT_FOUND", "Conversation not found.");
      past = (await tx.select({ role: aiMessages.role, content: aiMessages.content }).from(aiMessages).where(eq(aiMessages.conversationId, convId)).orderBy(desc(aiMessages.createdAt)).limit(AI_LIMITS.historyMessages)).reverse();
    }
    return { history: past, conversationId: convId, isDemo: org?.isDemo ?? false };
  });

  const request = classifyRequest(message);
  const flags: string[] = request.personalAdvice ? ["personal_advice_request"] : [];
  const safeMessage = redact(message);
  const tools = toolsFor(personalDataAllowed);
  const allowed = new Set(tools.map((t) => t.definition.name));

  // History holds only final user/assistant texts (already redacted); tool results are not replayed.
  const messages: ChatMessage[] = [];
  for (const m of history) {
    const role = m.role === "assistant" ? "assistant" : "user";
    const last = messages[messages.length - 1];
    if (last && last.role === role) continue; // keep strict alternation if a previous turn failed half-way
    messages.push({ role, content: m.content });
  }
  if (messages[0]?.role === "assistant") messages.shift();
  if (messages[messages.length - 1]?.role === "user") messages.pop();
  messages.push({ role: "user", content: safeMessage });
  const note = contextNote({ today: input.today ?? new Date().toISOString().slice(0, 10), personalDataAllowed, baseCurrency: input.baseCurrency, isDemo });
  messages.push({ role: "system", content: request.personalAdvice ? `${note}\n\n${ADVICE_BOUNDARY_NOTE}` : note });

  const toolCalls: AskResult["toolCalls"] = [];
  const sources: ToolSource[] = [];
  let inputTokens = 0;
  let outputTokens = 0;
  let model: string | null = null;
  let stopReason: string | null = null;
  let answer = "";

  for (let round = 0; ; round++) {
    const res = await provider.complete({ system: SYSTEM_PROMPT, messages, tools: tools.map((t) => t.definition), maxTokens: AI_LIMITS.maxOutputTokens });
    inputTokens += res.usage.inputTokens;
    outputTokens += res.usage.outputTokens;
    model = res.model;
    stopReason = res.stopReason;
    if (res.stopReason === "refusal") {
      flags.push("model_refusal");
      answer = "I can't help with that request. I can explain financial concepts, compare products in the catalogue, or summarise your recorded finances.";
      break;
    }
    const uses = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (res.stopReason !== "tool_use" || uses.length === 0) {
      answer = answerText(res.content);
      if (res.stopReason === "max_tokens") answer += "\n\n(This answer was cut short.)";
      break;
    }
    if (round >= AI_LIMITS.maxToolRounds) {
      flags.push("tool_round_limit");
      answer = answerText(res.content) || "I couldn't finish looking that up. Please try a narrower question.";
      break;
    }
    messages.push({ role: "assistant", content: res.content });
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const use of uses) {
      const args = (use.input ?? {}) as Record<string, unknown>;
      const tool = TOOLS[use.name];
      if (!tool || !allowed.has(use.name)) {
        toolCalls.push({ name: use.name, input: args, ok: false });
        results.push({ type: "tool_result", tool_use_id: use.id, is_error: true, content: tool?.personal ? "Not available: the user has not allowed the assistant to read their records." : "Unknown tool." });
        continue;
      }
      try {
        const out = await tool.run(ctx, args, { baseCurrency: input.baseCurrency });
        sources.push(...out.sources);
        toolCalls.push({ name: use.name, input: args, ok: true });
        const json = JSON.stringify(out);
        results.push({ type: "tool_result", tool_use_id: use.id, content: json.length > AI_LIMITS.toolResultChars ? `${json.slice(0, AI_LIMITS.toolResultChars)}…[truncated]` : json });
      } catch (err) {
        toolCalls.push({ name: use.name, input: args, ok: false });
        const msg = err instanceof AppError || err instanceof Error ? err.message : "Tool failed";
        results.push({ type: "tool_result", tool_use_id: use.id, is_error: true, content: msg.slice(0, 300) });
      }
    }
    messages.push({ role: "user", content: results });
  }

  const violations = checkOutput(answer);
  if (violations.length) {
    flags.push(...violations.map((v) => `output:${v}`));
    answer = SAFE_ANSWER;
  }
  if (!answer) answer = "I don't have an answer to that.";
  const needsReview = violations.length > 0 || flags.includes("model_refusal");
  const uniqueSources = dedupeSources(sources);

  // The conversation is created only once there is an answer to save, so failures leave nothing behind.
  const savedId = await withTenant(ctx, async (tx) => {
    let conversationId = existingId;
    if (!conversationId) {
      const [c] = await tx.insert(aiConversations).values({ orgId: ctx.orgId, userId: ctx.userId, title: safeMessage.slice(0, 80) }).returning({ id: aiConversations.id });
      conversationId = c!.id;
    }
    await tx.insert(aiMessages).values({ conversationId, orgId: ctx.orgId, userId: ctx.userId, role: "user", content: safeMessage, policyFlags: request.personalAdvice ? ["personal_advice_request"] : [] });
    const [saved] = await tx.insert(aiMessages).values({ conversationId, orgId: ctx.orgId, userId: ctx.userId, role: "assistant", content: redact(answer), toolCalls, model, stopReason, inputTokens, outputTokens, policyFlags: flags }).returning({ id: aiMessages.id });
    if (uniqueSources.length) await tx.insert(aiSourceReferences).values(uniqueSources.map((s) => ({ messageId: saved!.id, orgId: ctx.orgId, userId: ctx.userId, kind: s.kind, label: s.label.slice(0, 200), asOf: s.asOf ?? null, url: s.url ?? null })));
    await tx.update(aiConversations).set({ updatedAt: new Date(), ...(needsReview ? { reviewStatus: "needs_review" } : {}) }).where(eq(aiConversations.id, conversationId));
    await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: "ai.ask", targetType: "ai_conversation", targetId: conversationId, metadata: { tools: toolCalls.map((t) => t.name), flags, personalData: personalDataAllowed, model, inputTokens, outputTokens } });
    return conversationId;
  });

  return { conversationId: savedId, answer, flags, sources: uniqueSources, toolCalls };
}

function dedupeSources(sources: ToolSource[]): ToolSource[] {
  const seen = new Set<string>();
  return sources.filter((s) => {
    const k = `${s.kind}|${s.label}|${s.asOf ?? ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 20);
}

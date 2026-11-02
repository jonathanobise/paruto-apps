import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { invoices, paymentEvents } from "@/server/db/schema";
import { withBillingSystem } from "@/server/db/client";
import { env } from "@/server/platform/env";
import { AppError } from "@/server/platform/errors";
import { sha256 } from "@/server/identity/crypto";
import { applyPayment } from "./service";

/**
 * Payment-provider notifications. A provider adapter verifies the request's signature and maps
 * the payload to a VerifiedEvent; everything after that (idempotency, reconciliation, applying
 * the payment) is shared.
 *
 * NO REAL PROVIDER IS REGISTERED. The directive requires confirming a provider's terms and
 * capabilities first (docs/BILLING.md). The only adapter is "test", a signed-JSON scheme used by
 * the tests; it exists only when BILLING_TEST_WEBHOOK_SECRET is set and APP_ENV is not production.
 */
export interface VerifiedEvent {
  eventId: string;
  type: string;
  invoiceNumber?: string;
  amount?: string;
  currency?: string;
  reference?: string;
  paidAt?: Date;
}

export type VerifyResult = { ok: true; event: VerifiedEvent } | { ok: false; reason: string };

export interface PaymentProviderAdapter {
  key: string;
  verify(rawBody: string, headers: Headers, now: Date): VerifyResult;
}

export const SIGNATURE_TOLERANCE_SECONDS = 300;

/** `t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">` — timestamped to stop replays. */
export function signTestPayload(secret: string, body: string, t = Math.floor(Date.now() / 1000)): string {
  return `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}`;
}

export function verifyTimestampedHmac(secret: string, header: string | null, body: string, now: Date): VerifyResult {
  if (!header) return { ok: false, reason: "missing signature" };
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.trim().split("=", 2) as [string, string]));
  const t = Number(parts.t);
  if (!Number.isInteger(t) || !parts.v1 || !/^[0-9a-f]{64}$/.test(parts.v1)) return { ok: false, reason: "malformed signature" };
  if (Math.abs(now.getTime() / 1000 - t) > SIGNATURE_TOLERANCE_SECONDS) return { ok: false, reason: "timestamp outside tolerance" };
  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${body}`).digest("hex"), "hex");
  const given = Buffer.from(parts.v1, "hex");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: "signature mismatch" };
  return { ok: true, event: { eventId: "", type: "" } };
}

function testAdapter(secret: string): PaymentProviderAdapter {
  return {
    key: "test",
    verify(rawBody, headers, now) {
      const sig = verifyTimestampedHmac(secret, headers.get("x-wealthos-signature"), rawBody, now);
      if (!sig.ok) return sig;
      let p: Record<string, unknown>;
      try {
        p = JSON.parse(rawBody) as Record<string, unknown>;
      } catch {
        return { ok: false, reason: "invalid JSON" };
      }
      const data = (p.data ?? {}) as Record<string, unknown>;
      if (typeof p.id !== "string" || typeof p.type !== "string") return { ok: false, reason: "missing id or type" };
      return {
        ok: true,
        event: {
          eventId: p.id.slice(0, 120),
          type: p.type.slice(0, 60),
          invoiceNumber: typeof data.invoice === "string" ? data.invoice : undefined,
          amount: typeof data.amount === "string" ? data.amount : undefined,
          currency: typeof data.currency === "string" ? data.currency : undefined,
          reference: typeof data.reference === "string" ? data.reference : undefined,
          paidAt: typeof data.paid_at === "string" && !Number.isNaN(Date.parse(data.paid_at)) ? new Date(data.paid_at) : undefined,
        },
      };
    },
  };
}

export function getPaymentProvider(key: string): PaymentProviderAdapter | null {
  if (key === "test") {
    const secret = process.env.BILLING_TEST_WEBHOOK_SECRET;
    if (!secret || env().APP_ENV === "production") return null;
    return testAdapter(secret);
  }
  return null;
}

export const MAX_WEBHOOK_BYTES = 64 * 1024;

/** Returns the HTTP status and body for a provider notification. */
export async function handlePaymentWebhook(providerKey: string, rawBody: string, headers: Headers, now = new Date()): Promise<{ status: number; body: Record<string, unknown> }> {
  const provider = getPaymentProvider(providerKey);
  if (!provider) return { status: 404, body: { error: "unknown provider" } };
  if (Buffer.byteLength(rawBody) > MAX_WEBHOOK_BYTES) return { status: 413, body: { error: "payload too large" } };
  const v = provider.verify(rawBody, headers, now);
  if (!v.ok) {
    // Kept for investigation, keyed by body hash so a flood of identical bad requests is one row.
    await withBillingSystem((tx) => tx.insert(paymentEvents).values({ provider: provider.key, eventId: `invalid:${sha256(rawBody).slice(0, 40)}`, type: "invalid", signatureValid: false, payload: { length: rawBody.length }, outcome: "rejected", detail: v.reason }).onConflictDoNothing());
    return { status: 401, body: { error: "invalid signature" } };
  }
  const e = v.event;
  const inserted = await withBillingSystem((tx) => tx.insert(paymentEvents).values({ provider: provider.key, eventId: e.eventId, type: e.type, signatureValid: true, payload: JSON.parse(rawBody) as Record<string, unknown> }).onConflictDoNothing().returning({ id: paymentEvents.id }));
  if (!inserted.length) return { status: 200, body: { received: true, duplicate: true } };
  const eventRow = inserted[0]!.id;

  const finish = (outcome: string, detail: string | null, invoiceId: string | null = null) =>
    withBillingSystem((tx) => tx.update(paymentEvents).set({ outcome, detail, invoiceId, processedAt: new Date() }).where(eq(paymentEvents.id, eventRow)));

  if (e.type !== "payment.succeeded") {
    await finish("ignored", `event type ${e.type} is not handled`);
    return { status: 200, body: { received: true } };
  }
  if (!e.invoiceNumber || !e.amount || !e.currency || !e.reference) {
    await finish("failed", "missing invoice, amount, currency or reference");
    return { status: 200, body: { received: true } };
  }
  const [inv] = await withBillingSystem((tx) => tx.select({ id: invoices.id }).from(invoices).where(and(eq(invoices.number, e.invoiceNumber!))));
  if (!inv) {
    await finish("failed", `no invoice ${e.invoiceNumber}`);
    return { status: 200, body: { received: true } };
  }
  try {
    await withBillingSystem((tx) => applyPayment(tx, inv.id, { method: provider.key, reference: e.reference!, amount: e.amount!, currency: e.currency!, paidAt: e.paidAt ?? now }, null));
    await finish("processed", null, inv.id);
  } catch (err) {
    // Not retried by the provider (we answer 200); left for an administrator to reconcile.
    await finish("failed", err instanceof AppError ? err.message : "processing error", inv.id);
    if (!(err instanceof AppError)) console.error("[wealthos] payment webhook processing error", err);
  }
  return { status: 200, body: { received: true } };
}

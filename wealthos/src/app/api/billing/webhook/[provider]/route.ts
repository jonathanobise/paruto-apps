import { NextResponse } from "next/server";
import { MAX_WEBHOOK_BYTES, handlePaymentWebhook } from "@/server/billing/providers";

/** Payment-provider notifications. Authenticated by signature, not by session. */
export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_WEBHOOK_BYTES) return NextResponse.json({ error: "payload too large" }, { status: 413 });
  const body = await req.text();
  const r = await handlePaymentWebhook(provider.slice(0, 40), body, req.headers);
  return NextResponse.json(r.body, { status: r.status });
}

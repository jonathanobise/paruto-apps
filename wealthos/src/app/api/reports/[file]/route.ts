import { requireAppForAction } from "@/server/auth/context";
import { generateReport } from "@/server/reports/service";
import { AppError } from "@/server/platform/errors";
import { isDisplayCurrency } from "@/engine";

export async function GET(req: Request, { params }: { params: Promise<{ file: string }> }) {
  try {
    const app = await requireAppForAction();
    const { file } = await params;
    const url = new URL(req.url);
    const ccy = url.searchParams.get("currency");
    const r = await generateReport(app.ctx, app.org.jurisdiction, file, { period: url.searchParams.get("period") ?? "1Y", baseCurrency: ccy && isDisplayCurrency(ccy) ? ccy : app.baseCurrency });
    return new Response(new Uint8Array(typeof r.body === "string" ? Buffer.from(r.body, "utf8") : r.body), { headers: { "content-type": r.contentType, "content-disposition": `attachment; filename="${r.filename}"`, "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof AppError) {
      const status = { UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, RATE_LIMITED: 429, PLAN_LIMIT: 402, FEATURE_UNAVAILABLE: 403 }[err.code as string] ?? 400;
      return new Response(err.message, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
    }
    console.error("[wealthos] report error", err);
    return new Response("The report couldn't be generated. Please try again.", { status: 500 });
  }
}

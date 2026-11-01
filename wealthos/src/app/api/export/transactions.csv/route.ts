import { requireAppForAction } from "@/server/auth/context";
import { listTransactions } from "@/server/analytics/portfolio";
import { AppError } from "@/server/platform/errors";

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  // Neutralise spreadsheet formula injection and quote every cell.
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET() {
  try {
    const app = await requireAppForAction();
    const rows = await listTransactions(app.ctx);
    const header = ["id", "date", "type", "description", "account", "instrument", "quantity", "price", "amount", "currency", "source", "reversed_by", "reverses", "recorded_at"];
    const lines = [header.join(","), ...rows.map((r) => [r.id, r.date, r.type, r.description, r.account, r.instrument, r.quantity, r.price, r.amount, r.currency, r.source, r.reversedBy, r.reversesEventId, r.createdAt].map(csvCell).join(","))];
    return new Response(lines.join("\r\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="wealthos-transactions-${new Date().toISOString().slice(0, 10)}.csv"`, "cache-control": "no-store" } });
  } catch (err) {
    const status = err instanceof AppError && err.code === "UNAUTHENTICATED" ? 401 : 403;
    return new Response("Not allowed", { status });
  }
}

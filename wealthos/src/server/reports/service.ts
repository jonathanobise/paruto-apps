import "server-only";
import { withTenant, type TenantContext } from "@/server/db/client";
import { requireFeature } from "@/server/compliance/gate";
import { rateLimit } from "@/server/platform/rate-limit";
import { AppError } from "@/server/platform/errors";
import { recordAudit } from "@/server/audit/audit";
import { enforceFeature } from "@/server/billing/entitlements";
import { buildWealthStatement, REPORT_PERIODS, type PeriodKey } from "./statement";
import { renderStatementPdf } from "./pdf";
import { holdingsCsv, statementCsv } from "./csv";

export const REPORT_FILES = {
  "statement.pdf": { label: "Wealth statement (PDF)", type: "application/pdf", pdf: true },
  "statement.csv": { label: "Wealth statement data (CSV)", type: "text/csv; charset=utf-8", pdf: false },
  "holdings.csv": { label: "Holdings (CSV)", type: "text/csv; charset=utf-8", pdf: false },
} as const;
export type ReportFile = keyof typeof REPORT_FILES;

export async function generateReport(ctx: TenantContext, jurisdiction: string, file: string, opts: { period: string; baseCurrency: string }): Promise<{ body: Buffer | string; contentType: string; filename: string }> {
  if (!(file in REPORT_FILES)) throw new AppError("NOT_FOUND", "Unknown report.");
  const f = file as ReportFile;
  const period = (REPORT_PERIODS.find((p) => p.key === opts.period)?.key ?? "1Y") as PeriodKey;
  await requireFeature("REPORTS", jurisdiction);
  await rateLimit(`reports:${ctx.userId}`, 30, 3600);
  await withTenant(ctx, async (tx) => {
    if (REPORT_FILES[f].pdf) await enforceFeature(tx, ctx, "pdfReports");
    await recordAudit(tx, { orgId: ctx.orgId, actorUserId: ctx.userId, action: "report.generated", targetType: "report", targetId: f, metadata: { period, currency: opts.baseCurrency } });
  });
  const s = await buildWealthStatement(ctx, { baseCurrency: opts.baseCurrency, period });
  const stamp = s.dash.asOf;
  const body = f === "statement.pdf" ? await renderStatementPdf(s) : f === "statement.csv" ? statementCsv(s) : holdingsCsv(s);
  return { body, contentType: REPORT_FILES[f].type, filename: `wealthos-${f.replace(".", `-${period.toLowerCase()}-${stamp}.`)}` };
}

import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import type { WealthStatement } from "./statement";
import { BRAND } from "@/lib/brand";

/**
 * Renders a wealth statement to PDF (A4). Text is set in embedded Inter (SIL OFL, see
 * fonts/OFL.txt) so ₦ and Nigerian-language names render correctly.
 */
const FONT_DIR = path.join(process.cwd(), "src/server/reports/fonts");
let fonts: { regular: Buffer; semibold: Buffer } | null = null;
function loadFonts() {
  fonts ??= { regular: readFileSync(path.join(FONT_DIR, "Inter-Regular.ttf")), semibold: readFileSync(path.join(FONT_DIR, "Inter-SemiBold.ttf")) };
  return fonts;
}

const C = { text: "#1b1f1c", muted: "#5a625c", faint: "#8a918b", line: "#dcd6c8", brand: "#12392b", accent: "#0f7b57", band: "#f1eee6", warn: "#8a5300" };
const M = 48;

type Align = "left" | "right";
interface Column { label: string; width: number; align?: Align }

export async function renderStatementPdf(s: WealthStatement): Promise<Buffer> {
  const f = loadFonts();
  const doc = new PDFDocument({ size: "A4", margin: M, bufferPages: true, info: { Title: `Wealth statement — ${s.orgName}`, Author: BRAND, Subject: `${s.periodLabel} to ${s.dash.asOf}`, Creator: BRAND } });
  doc.registerFont("r", f.regular);
  doc.registerFont("b", f.semibold);
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((res) => doc.on("end", () => res(Buffer.concat(chunks))));

  const W = doc.page.width - 2 * M;
  const bottom = () => doc.page.height - M - 24;
  const ccy = s.dash.baseCurrency;
  const money = (v: string | null | undefined, c = ccy) => formatMoney(v ?? null, c);
  const pct = (v: string | number | null | undefined) => (v === null || v === undefined ? "—" : formatPercent(String(v), { signed: true, decimals: 2 }));
  const units = (q: string) => new Intl.NumberFormat("en-NG", { maximumFractionDigits: 4 }).format(Number(q));
  const ensure = (h: number) => {
    if (doc.y + h > bottom()) doc.addPage();
  };
  const heading = (t: string) => {
    ensure(90);
    doc.moveDown(0.8).font("b").fontSize(13).fillColor(C.brand).text(t, M, doc.y);
    doc.moveTo(M, doc.y + 3).lineTo(M + W, doc.y + 3).lineWidth(0.6).strokeColor(C.line).stroke();
    doc.moveDown(0.6);
  };
  const note = (t: string, color = C.muted) => {
    ensure(24);
    doc.font("r").fontSize(8.5).fillColor(color).text(t, M, doc.y, { width: W });
    doc.moveDown(0.3);
  };
  const table = (cols: Column[], rows: string[][], opts: { size?: number } = {}) => {
    const size = opts.size ?? 8.5;
    const scale = W / cols.reduce((a, c) => a + c.width, 0);
    const widths = cols.map((c) => c.width * scale);
    const hasHeader = cols.some((c) => c.label);
    const drawHeader = () => {
      if (!hasHeader) return;
      let x = M;
      doc.font("b").fontSize(size).fillColor(C.muted);
      const y = doc.y;
      cols.forEach((c, i) => {
        doc.text(c.label, x + 2, y, { width: widths[i]! - 4, align: c.align ?? "left", lineBreak: false });
        x += widths[i]!;
      });
      doc.y = y + size + 6;
      doc.moveTo(M, doc.y - 2).lineTo(M + W, doc.y - 2).lineWidth(0.5).strokeColor(C.line).stroke();
    };
    ensure(Math.min(rows.length, 3) * (size + 8) + size + 12);
    drawHeader();
    rows.forEach((r, ri) => {
      doc.font("r").fontSize(size);
      const h = Math.max(...r.map((cell, i) => doc.heightOfString(cell || " ", { width: widths[i]! - 4 }))) + 5;
      if (doc.y + h > bottom()) {
        doc.addPage();
        drawHeader();
      }
      const y = doc.y;
      if (ri % 2 === 1) doc.rect(M, y - 1.5, W, h).fill(C.band);
      let x = M;
      r.forEach((cell, i) => {
        doc.font(i === 0 ? "b" : "r").fontSize(size).fillColor(C.text).text(cell || "—", x + 2, y + 1, { width: widths[i]! - 4, align: cols[i]!.align ?? "left" });
        x += widths[i]!;
      });
      doc.y = y + h;
    });
    doc.x = M;
    doc.moveDown(0.4);
  };
  const kv = (rows: Array<[string, string]>) => table([{ label: "", width: 3 }, { label: "", width: 2, align: "right" }], rows, { size: 9.5 });

  // Cover header
  doc.rect(0, 0, doc.page.width, 110).fill(C.brand);
  doc.font("b").fontSize(11).fillColor("#cfe8da").text(BRAND, M, 34);
  doc.font("b").fontSize(22).fillColor("#f6f3ec").text("Wealth statement", M, 52);
  doc.font("r").fontSize(10).fillColor("#cfe8da").text(`${s.orgName} · ${s.periodLabel} to ${formatDate(s.dash.asOf)} · ${ccy}`, M, 82);
  doc.y = 130;
  if (s.dash.isDemo) note("DEMO: this statement uses synthetic SAMPLE prices and exchange rates. It is not market data.", C.warn);

  heading("Summary");
  const t = s.dash.totals;
  kv([["Net worth", money(t.netWorth)], ["Assets", money(t.assets)], ["Liabilities", money(t.liabilities)], ["Investments", money(t.invested)], ["Cash", money(t.cash)], ["Other assets (your valuations)", money(t.manualAssets)]]);
  if (!t.complete) note("Some items couldn't be valued and are left out of these totals; see Data quality.", C.warn);

  const p = s.dash.performance;
  heading(`Investment performance · ${s.periodLabel}`);
  if (p) {
    kv([
      [`Value on ${formatDate(p.start)}`, money(p.startValue)],
      ["Net contributions (money in − money out)", money(p.netContributions)],
      ["Investment gain", money(p.investmentGain)],
      [`Value on ${formatDate(p.end)}`, money(p.endValue)],
      ["Income received (gross)", money(p.incomeGross)],
      ["Withholding tax", money(p.withholdingTax)],
      ["Fees", money(p.fees)],
      ["Realised gains", money(p.realizedGain)],
      ["Of the gain, from currency moves", p.fxEffect === null ? "—" : money(p.fxEffect)],
      ["Time-weighted return", `${pct(p.twr)}${p.twrAnnualized ? ` (${pct(p.twrAnnualized)} a year)` : ""}`],
      ["Money-weighted return (XIRR, a year)", p.xirr === null ? "—" : pct(p.xirr)],
    ]);
    if (!p.complete) note("Returns are unavailable because some values in the period couldn't be priced or converted.", C.warn);
  } else note("No investment activity yet.");

  const hist = s.dash.history.filter((h) => h.netWorth !== null);
  if (hist.length > 1) {
    heading("Net-worth history");
    ensure(140);
    const x0 = M + 50, y0 = doc.y + 8, cw = W - 60, chh = 100;
    const vals = hist.map((h) => h.netWorth!);
    const min = Math.min(...vals, 0), max = Math.max(...vals);
    const yOf = (v: number) => y0 + chh - ((v - min) / (max - min || 1)) * chh;
    doc.font("r").fontSize(7).fillColor(C.faint);
    [max, (max + min) / 2, min].forEach((v) => doc.text(formatMoney(String(v), ccy, { compact: true }), M, yOf(v) - 4, { width: 46, align: "right" }));
    doc.moveTo(x0, y0 + chh).lineTo(x0 + cw, y0 + chh).lineWidth(0.5).strokeColor(C.line).stroke();
    hist.forEach((h, i) => {
      const x = x0 + (i / (hist.length - 1)) * cw;
      if (i === 0) doc.moveTo(x, yOf(h.netWorth!));
      else doc.lineTo(x, yOf(h.netWorth!));
    });
    doc.lineWidth(1.4).strokeColor(C.accent).stroke();
    doc.font("r").fontSize(7).fillColor(C.faint).text(formatDate(hist[0]!.date), x0, y0 + chh + 4).text(formatDate(hist.at(-1)!.date), x0 + cw - 80, y0 + chh + 4, { width: 80, align: "right" });
    doc.y = y0 + chh + 20;
    doc.x = M;
  }

  heading("Allocation and currency exposure");
  const alloc = (title: string, slices: typeof s.dash.allocation.assetClass) => slices.length ? table([{ label: title, width: 3 }, { label: "Value", width: 2, align: "right" }, { label: "Share", width: 1, align: "right" }], slices.map((x) => [x.label, money(x.value), formatPercent(x.weight, { decimals: 1 })])) : null;
  alloc("Asset class", s.dash.allocation.assetClass);
  alloc("Currency", s.dash.allocation.currency);
  alloc("Geography", s.dash.allocation.geography);
  if (s.dash.concentration?.largestName) note(`Largest holding: ${s.dash.concentration.largestName} at ${formatPercent(s.dash.concentration.largestWeight, { decimals: 1 })} of investments; top five ${formatPercent(s.dash.concentration.top5Weight, { decimals: 1 })}.`);

  if (s.dash.holdings.length) {
    heading("Holdings");
    table(
      [{ label: "Holding", width: 3.2 }, { label: "Account", width: 2 }, { label: "Units", width: 1.4, align: "right" }, { label: "Price (date)", width: 2, align: "right" }, { label: `Value ${ccy}`, width: 1.8, align: "right" }, { label: "Cost", width: 1.8, align: "right" }, { label: "Gain", width: 1.6, align: "right" }, { label: "Weight", width: 1, align: "right" }],
      s.dash.holdings.map((h) => [`${h.name}${h.synthetic ? " (SAMPLE)" : ""}${h.method !== "market" ? ` · ${h.method}` : ""}`, h.accountName, units(h.quantity), h.price ? `${formatMoney(h.price, h.currency)}${h.priceDate ? ` (${h.priceDate})` : ""}` : "—", money(h.marketValueBase), money(h.costBase), money(h.unrealizedBase), h.weight ? formatPercent(h.weight, { decimals: 1 }) : "—"]),
      { size: 7.5 },
    );
  }

  if (s.dash.cash.length || s.dash.manual.length) {
    heading("Cash, other assets and liabilities");
    table(
      [{ label: "Item", width: 3 }, { label: "Kind", width: 1.6 }, { label: "Amount", width: 2, align: "right" }, { label: `In ${ccy}`, width: 2, align: "right" }, { label: "As of", width: 1.4, align: "right" }],
      [
        ...s.dash.cash.map((c) => [c.accountName, "Cash", money(c.amount, c.currency), money(c.amountBase), s.dash.asOf]),
        ...s.dash.manual.map((m) => [m.name, m.kind === "liability" ? "Liability" : "Asset (your valuation)", money(m.amount, m.currency), money(m.amountBase), m.valuedOn]),
      ],
    );
  }

  heading(`Income and costs · ${s.periodLabel}`);
  if (s.income.length || s.costs.length) {
    table([{ label: "Date", width: 1.3 }, { label: "Type", width: 1.4 }, { label: "Instrument / account", width: 4 }, { label: "Amount", width: 2, align: "right" }], [...s.income, ...s.costs].sort((a, b) => a.date.localeCompare(b.date)).map((x) => [x.date, x.label, x.instrument ?? x.account, x.amount ? money(x.amount, x.currency ?? ccy) : "—"]));
  } else note("No income, fees or taxes recorded in this period.");
  note("This table lists recorded income, fee and tax transactions. Income in the performance summary also includes interest earned on discount instruments (treasury bills), recognised at maturity or sale, converted at each date's exchange rate.");

  heading(`Transactions · ${s.periodLabel}`);
  if (s.transactions.length) {
    table([{ label: "Date", width: 1.3 }, { label: "Type", width: 1.6 }, { label: "Account", width: 2.4 }, { label: "Instrument", width: 2.6 }, { label: "Amount", width: 2, align: "right" }], s.transactions.map((x) => [x.date, `${x.label}${x.reversedBy ? " (reversed)" : x.reversesEventId ? " (reversal)" : ""}`, x.account, x.instrument ?? "", x.amount ? money(x.amount, x.currency ?? ccy) : "—"]), { size: 7.5 });
    if (s.transactionsTruncated) note(`${s.transactionsTruncated} more transactions are in the CSV export.`);
  } else note("No transactions in this period.");

  if (s.goals.length) {
    heading("Goals (hypothetical projections)");
    table(
      [{ label: "Goal", width: 2.6 }, { label: "Target", width: 2.2, align: "right" }, { label: "By", width: 1.4 }, { label: "Now", width: 2, align: "right" }, { label: "Progress", width: 1.2, align: "right" }, { label: "Projected outcomes", width: 4 }],
      s.goals.map((g) => [g.name, `${money(g.target, g.currency)}${g.targetIsReal ? " (today's money)" : ""}`, g.targetDate, money(g.current, g.currency), g.progress ? formatPercent(g.progress, { decimals: 0 }) : "—", g.scenarios.map((x) => `${formatPercent(x.annualReturn, { decimals: 1 })} a year → ${formatMoney(x.finalNominal, g.currency, { compact: true })}${x.meetsTarget ? " (meets target)" : ""}`).join("\n")]),
    );
  }

  heading("Data quality and freshness");
  const fr = s.dash.freshness;
  note(`Latest price used: ${fr.latestPriceDate ? formatDate(fr.latestPriceDate) : "none"}; oldest price used: ${fr.oldestPriceDate ? formatDate(fr.oldestPriceDate) : "none"}.${fr.syntheticData ? " Includes synthetic SAMPLE data." : ""}`);
  const issues = [...new Set(s.dash.issues.map((i) => `${i.label}: ${i.message}`))];
  if (issues.length) for (const i of issues.slice(0, 40)) note(`• ${i}`, C.warn);
  else note("No data-quality issues.");
  if (s.dash.maturities.length) note(`Upcoming maturities: ${s.dash.maturities.map((m) => `${m.name} on ${formatDate(m.maturityDate)}`).join("; ")}.`);

  heading("Methodology");
  for (const m of s.methodology) note(m);
  heading("Important information");
  for (const m of s.disclosures) note(m);

  // Footer on every page
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0; // writing in the bottom margin must not start a new page
    doc.font("r").fontSize(7).fillColor(C.faint).text(`${BRAND} · ${s.orgName} · generated ${s.generatedAt.slice(0, 16).replace("T", " ")} UTC · not investment advice`, M, doc.page.height - M + 6, { width: W - 60, lineBreak: false });
    doc.text(`Page ${i - range.start + 1} of ${range.count}`, M + W - 60, doc.page.height - M + 6, { width: 60, align: "right", lineBreak: false });
  }
  doc.end();
  return done;
}

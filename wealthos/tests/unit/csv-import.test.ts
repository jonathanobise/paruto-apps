import { describe, expect, it } from "vitest";
import { CsvRejectedError, LIMITS, decodeCsv, markDuplicates, parseAmount, parseCsv, parseDate, prepareRows, resolveType, suggestMapping, fingerprintOf, summarise, type RowContext } from "@/server/imports/csv";

const enc = (s: string) => new TextEncoder().encode(s);
const ACC = "11111111-1111-4111-8111-111111111111";
const GTCO = { id: "22222222-2222-4222-8222-222222222222", currency: "NGN", name: "GTCO" };
const VT = { id: "33333333-3333-4333-8333-333333333333", currency: "USD", name: "VT" };
const ctx: RowContext = {
  accountId: ACC,
  accountCurrency: "NGN",
  today: "2026-11-02",
  resolveInstrument: ({ symbol }) => (symbol?.toUpperCase() === "GTCO" ? GTCO : symbol?.toUpperCase() === "VT" ? VT : null),
};
const prep = (csv: string, dateFormat: "DD/MM/YYYY" | "MM/DD/YYYY" = "DD/MM/YYYY") => {
  const parsed = parseCsv(decodeCsv(enc(csv)));
  return prepareRows(parsed, suggestMapping(parsed.headers, dateFormat), ctx);
};

describe("decoding hostile files", () => {
  it("rejects empty, oversized, binary and non-UTF-8 files", () => {
    expect(() => decodeCsv(new Uint8Array())).toThrow(CsvRejectedError);
    expect(() => decodeCsv(new Uint8Array(LIMITS.maxBytes + 1).fill(65))).toThrow(/2 MB/);
    expect(() => decodeCsv(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]))).toThrow(/binary/); // a ZIP/XLSX header
    expect(() => decodeCsv(new Uint8Array([0x64, 0x61, 0x74, 0x65, 0x0a, 0xff, 0xfe, 0x41]))).toThrow(/UTF-8/);
  });

  it("strips a UTF-8 byte-order mark", () => {
    expect(decodeCsv(new Uint8Array([0xef, 0xbb, 0xbf, ...enc("date,amount")]))).toBe("date,amount");
  });

  it("enforces row, column and cell limits and sane headers", () => {
    const many = ["date,amount", ...Array.from({ length: LIMITS.maxRows + 1 }, () => "2026-01-01,1")].join("\n");
    expect(() => parseCsv(many)).toThrow(/Too many rows/);
    expect(() => parseCsv(Array.from({ length: 51 }, (_, i) => `c${i}`).join(",") + "\n" + "1,".repeat(50) + "1")).toThrow(/Too many columns/);
    expect(() => parseCsv(`date,description\n2026-01-01,${"x".repeat(501)}`)).toThrow(/longer than/);
    expect(() => parseCsv("date,Date\n1,2")).toThrow(/unique/);
    expect(() => parseCsv("date,\n1,2")).toThrow(/header name/);
    expect(() => parseCsv("date,amount\n")).toThrow(/no rows/);
  });

  it("parses quoted cells with commas and newlines, and other delimiters", () => {
    const p = parseCsv('date,description,amount\n2026-01-01,"Salary, January\nbonus","1,000.00"');
    expect(p.records[0]).toEqual(["2026-01-01", "Salary, January\nbonus", "1,000.00"]);
    expect(parseCsv("date;amount\n2026-01-01;5").delimiter).toBe(";");
  });
});

describe("numbers", () => {
  it.each([
    ["1,234.56", "1234.56"],
    ["₦1,234.56", "1234.56"],
    ["NGN 2,500,000", "2500000"],
    ["(1,234.00)", "-1234"],
    ["-15", "-15"],
    ["15-", "-15"],
    ["1 234.5", "1234.5"],
    ["$0.10", "0.1"],
  ])("parses %s", (raw, expected) => {
    expect(parseAmount(raw)).toEqual({ value: expected });
  });

  it.each(["1.234,56", "1,23", "12,34,567", "1e6", "Infinity", "NaN", "abc", "=1+1", "", "1..2", "9".repeat(25)])("rejects %s", (raw) => {
    expect("error" in parseAmount(raw)).toBe(true);
  });
});

describe("dates", () => {
  it("accepts unambiguous forms regardless of the chosen format", () => {
    for (const raw of ["2026-01-31", "2026-01-31T00:00:00Z", "31-Jan-2026", "31 Jan 2026", "31 January 2026", "Jan 31, 2026", "31-Sept-2026".replace("31", "30")]) {
      const r = parseDate(raw, "auto");
      expect("value" in r).toBe(true);
    }
    expect(parseDate("30-Sept-2026", "auto")).toEqual({ value: "2026-09-30" });
  });

  it("uses the explicit day/month order and never guesses", () => {
    expect(parseDate("03/04/2026", "DD/MM/YYYY")).toEqual({ value: "2026-04-03" });
    expect(parseDate("03/04/2026", "MM/DD/YYYY")).toEqual({ value: "2026-03-04" });
    expect("error" in parseDate("03/04/2026", "auto")).toBe(true);
    expect("error" in parseDate("31/02/2026", "DD/MM/YYYY")).toBe(true);
    expect("error" in parseDate("03/04/26", "DD/MM/YYYY")).toBe(true);
    expect("error" in parseDate("2026-02-30", "auto")).toBe(true);
  });
});

describe("mapping", () => {
  it("suggests columns from common header names", () => {
    const m = suggestMapping(["Trade Date", "Action", "Ticker", "Qty", "Unit Price", "Commission", "Narration", "Reference"]);
    expect(m.columns).toMatchObject({ date: "Trade Date", type: "Action", symbol: "Ticker", quantity: "Qty", price: "Unit Price", fees: "Commission", description: "Narration", externalRef: "Reference" });
  });

  it("resolves built-in and institution-specific type words", () => {
    const m = { columns: {}, dateFormat: "auto" as const, typeAliases: { "PURCH-EQ": "buy" as const } };
    expect(resolveType("Purchase", m)).toBe("buy");
    expect(resolveType("Cash Dividend", m)).toBe("dividend");
    expect(resolveType("purch-eq", m)).toBe("buy");
    expect(resolveType("Bonus Issue", m)).toBe("stock_dividend");
    expect(resolveType("mystery", m)).toBeNull();
  });
});

describe("row preparation", () => {
  it("turns a broker export into validated ledger inputs", () => {
    const rows = prep(["Date,Type,Symbol,Quantity,Price,Fees,Amount,Withholding Tax,Description,Reference", "05/01/2026,Buy,GTCO,1000,45.50,341.25,,,Contract note 1,CN-1", "20/04/2026,Dividend,GTCO,,,,3000,300,Final dividend,DV-1", "21/04/2026,Sell,gtco,-200,52,78,,,,CN-2"].join("\n"));
    expect(rows.map((r) => r.status)).toEqual(["ready", "ready", "ready"]);
    expect(rows[0]!.input).toMatchObject({ type: "buy", accountId: ACC, instrumentId: GTCO.id, quantity: "1000", price: "45.5", fees: "341.25", currency: "NGN", occurredOn: "2026-01-05" });
    expect(rows[1]!.input).toMatchObject({ type: "dividend", grossAmount: "3000", withholdingTax: "300" });
    expect(rows[2]!.input).toMatchObject({ type: "sell", quantity: "200" }); // sign normalised
    expect(rows[0]!.externalRef).toBe("CN-1");
    expect(rows[0]!.rowNumber).toBe(2);
  });

  it("infers deposits and withdrawals from a bank statement's debit/credit columns", () => {
    const rows = prep(["Value Date,Narration,Debit,Credit,Balance", "02/01/2026,SALARY JAN,,\"750,000.00\",750000", "03/01/2026,POS PURCHASE,\"12,500.00\",,737500", "04/01/2026,BOTH,1,1,0"].join("\n"));
    expect(rows[0]!.input).toMatchObject({ type: "deposit", amount: "750000", description: "SALARY JAN" });
    expect(rows[1]!.input).toMatchObject({ type: "withdrawal", amount: "12500" });
    expect(rows[2]!.status).toBe("error");
  });

  it("infers type from a signed amount when there is no type column", () => {
    const rows = prep("date,amount,description\n2026-01-02,-5000,Transfer out\n2026-01-03,(250.00),Charges\n2026-01-04,8000,In");
    expect(rows.map((r) => r.input?.type)).toEqual(["withdrawal", "withdrawal", "deposit"]);
  });

  it("reports precise, per-row errors instead of guessing", () => {
    const rows = prep(["date,type,symbol,quantity,price,currency", "2026-01-05,buy,NOPE,10,5,NGN", "2026-01-05,teleport,GTCO,10,5,NGN", "2027-01-05,buy,GTCO,10,5,NGN", "2026-01-05,buy,VT,10,5,NGN", "2026-01-05,buy,GTCO,ten,5,NGN", "2026-01-05,buy,,10,5,NGN"].join("\n"));
    expect(rows.every((r) => r.status === "error")).toBe(true);
    expect(rows[0]!.errors.join()).toMatch(/isn't in your catalogue/);
    expect(rows[1]!.errors.join()).toMatch(/isn't recognised/);
    expect(rows[2]!.errors.join()).toMatch(/future/);
    expect(rows[3]!.errors.join()).toMatch(/trades in USD/);
    expect(rows[4]!.errors.join()).toMatch(/not a number/);
    expect(rows[5]!.errors.join()).toMatch(/symbol is missing/);
  });

  it("derives price from amount with a visible warning", () => {
    const [row] = prep("date,type,symbol,quantity,amount\n2026-01-05,buy,GTCO,400,18200");
    expect(row!.input).toMatchObject({ price: "45.5" });
    expect(row!.warnings.join()).toMatch(/derived/);
  });

  it("keeps formula-like text as inert data and warns about it", () => {
    const [row] = prep('date,amount,description\n2026-01-02,100,"=HYPERLINK(""http://evil"",""x"")"');
    expect(row!.status).toBe("ready");
    expect(row!.input).toMatchObject({ description: '=HYPERLINK("http://evil","x")' });
    expect(row!.warnings.join()).toMatch(/formula/);
  });

  it("refuses a mapping that points at missing columns or lacks a date", () => {
    const parsed = parseCsv("when,amount\n2026-01-01,5");
    expect(() => prepareRows(parsed, { columns: { amount: "amount" }, dateFormat: "auto", typeAliases: {} }, ctx)).toThrow(/Date column/);
    expect(() => prepareRows(parsed, { columns: { date: "Date" }, dateFormat: "auto", typeAliases: {} }, ctx)).toThrow(/aren't in the file/);
  });
});

describe("duplicate detection", () => {
  const csv = ["date,type,symbol,quantity,price,reference", "2026-01-05,buy,GTCO,10,5,", "2026-01-05,buy,GTCO,10,5,", "2026-01-06,buy,GTCO,10,5,REF-9", "2026-01-07,buy,GTCO,1,5,REF-1"].join("\n");

  it("matches existing ledger events as a multiset and by reference", () => {
    const rows = prep(csv);
    const fp = rows[0]!.fingerprint!;
    markDuplicates(rows, [
      { id: "ev-1", fingerprint: fp, externalRef: null },
      { id: "ev-2", fingerprint: "other", externalRef: "REF-1" },
    ]);
    expect(rows.map((r) => r.status)).toEqual(["duplicate", "ready", "ready", "duplicate"]);
    expect(rows[0]!.duplicateOf).toBe("ev-1");
    expect(rows[3]!.duplicateOf).toBe("ev-2");
    expect(summarise(rows)).toMatchObject({ total: 4, ready: 2, duplicates: 2, errors: 0 });
  });

  it("warns about repeated rows within the file without dropping them", () => {
    const rows = prep(csv);
    markDuplicates(rows, []);
    expect(rows.slice(0, 2).map((r) => r.status)).toEqual(["ready", "ready"]);
    expect(rows[1]!.warnings.join()).toMatch(/earlier row/);
  });

  it("fingerprints are insensitive to number formatting", () => {
    expect(fingerprintOf("deposit", "2026-01-01", { accountId: "a", amount: "1000.00", currency: "NGN" })).toBe(fingerprintOf("deposit", "2026-01-01", { accountId: "a", amount: "1000", currency: "NGN" }));
  });
});

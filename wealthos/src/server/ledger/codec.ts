/**
 * Ledger event input validation and conversion between stored rows and engine events.
 * All numbers travel as decimal strings; they are converted to Decimal only inside the engine.
 */
import { z } from "zod";
import { d, isISODate, type LedgerEvent, type LedgerEventType } from "@/engine";

const decimalString = z
  .string()
  .trim()
  .transform((v) => v.replace(/,/g, ""))
  .pipe(z.string().regex(/^\d{1,24}(\.\d{1,12})?$/, "Enter a positive number (up to 12 decimal places)"));
const positive = decimalString.refine((v) => d(v).gt(0), "Must be greater than zero");
const nonNegative = decimalString.default("0");
const uuid = z.string().uuid("Choose a valid item");
const currency = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a 3-letter currency code");
const isoDate = z.string().refine(isISODate, "Use a valid date (YYYY-MM-DD)");

const common = {
  occurredOn: isoDate,
  description: z.string().trim().max(300).optional().transform((v) => v || undefined),
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
};

export const eventInputSchema = z.discriminatedUnion("type", [
  z.object({ type: z.enum(["deposit", "withdrawal"]), accountId: uuid, currency, amount: positive, ...common }),
  z.object({ type: z.enum(["buy", "sell"]), accountId: uuid, instrumentId: uuid, quantity: positive, price: decimalString, fees: nonNegative, currency, ...common }),
  z.object({ type: z.enum(["dividend", "interest", "coupon"]), accountId: uuid, instrumentId: uuid.optional(), currency, grossAmount: positive, withholdingTax: nonNegative, ...common }),
  z.object({ type: z.enum(["fee", "tax"]), accountId: uuid, instrumentId: uuid.optional(), currency, amount: positive, ...common }),
  z.object({ type: z.literal("fx_conversion"), accountId: uuid, fromCurrency: currency, fromAmount: positive, toCurrency: currency, toAmount: positive, fees: nonNegative, ...common }),
  z.object({ type: z.literal("transfer"), fromAccountId: uuid, toAccountId: uuid, currency, amount: positive, ...common }),
  z.object({ type: z.literal("security_transfer"), fromAccountId: uuid, toAccountId: uuid, instrumentId: uuid, quantity: positive, ...common }),
  z.object({ type: z.literal("reinvestment"), accountId: uuid, instrumentId: uuid, currency, amount: positive, quantity: positive, ...common }),
  z.object({ type: z.literal("split"), instrumentId: uuid, numerator: positive, denominator: positive, ...common }),
  z.object({ type: z.literal("stock_dividend"), accountId: uuid, instrumentId: uuid, quantity: positive, ...common }),
  z.object({ type: z.enum(["maturity", "redemption"]), accountId: uuid, instrumentId: uuid, quantity: positive, proceeds: decimalString, currency, ...common }),
  z.object({ type: z.literal("opening_position"), accountId: uuid, instrumentId: uuid, quantity: positive, costBasis: decimalString, currency, acquiredOn: isoDate, ...common }),
]);
export type EventInput = z.infer<typeof eventInputSchema>;

const DECIMAL_FIELDS = ["amount", "quantity", "price", "fees", "grossAmount", "withholdingTax", "fromAmount", "toAmount", "numerator", "denominator", "proceeds", "costBasis"] as const;

/** Payload stored in ledger_events.payload: the input minus envelope fields. */
export function payloadFromInput(input: EventInput): Record<string, unknown> {
  const { occurredOn: _o, description: _d, idempotencyKey: _i, type: _t, ...rest } = input;
  return rest;
}

export interface StoredEvent {
  id: string;
  type: string;
  occurredOn: string;
  payload: Record<string, unknown>;
  reversesEventId: string | null;
}

export function toEngineEvent(row: StoredEvent): LedgerEvent {
  if (row.type === "reversal") return { id: row.id, date: row.occurredOn, type: "reversal", reversesEventId: row.reversesEventId! };
  const p: Record<string, unknown> = { ...row.payload };
  for (const f of DECIMAL_FIELDS) if (typeof p[f] === "string") p[f] = d(p[f] as string);
  return { ...(p as object), id: row.id, date: row.occurredOn, type: row.type as LedgerEventType } as LedgerEvent;
}

export const EVENT_LABELS: Record<LedgerEventType, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  buy: "Purchase",
  sell: "Sale",
  dividend: "Dividend",
  interest: "Interest",
  coupon: "Coupon",
  fee: "Fee",
  tax: "Tax",
  fx_conversion: "FX conversion",
  transfer: "Transfer",
  security_transfer: "Security transfer",
  reinvestment: "Reinvestment",
  split: "Stock split",
  stock_dividend: "Bonus / stock dividend",
  maturity: "Maturity",
  redemption: "Redemption",
  opening_position: "Opening position",
  reversal: "Reversal",
};

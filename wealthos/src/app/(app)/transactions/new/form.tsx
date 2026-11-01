"use client";
import { useActionState, useMemo, useState } from "react";
import { postEventAction } from "../actions";
import { Field, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage, fieldError } from "@/components/ui/form-message";

type Account = { id: string; name: string; currency: string };
type Instrument = { id: string; name: string; symbol: string | null; currency: string; private: boolean };

const TYPES: Array<{ value: string; label: string; group: string }> = [
  { value: "deposit", label: "Deposit (money in)", group: "Cash" },
  { value: "withdrawal", label: "Withdrawal (money out)", group: "Cash" },
  { value: "transfer", label: "Transfer between my accounts", group: "Cash" },
  { value: "fx_conversion", label: "Currency conversion", group: "Cash" },
  { value: "fee", label: "Fee", group: "Cash" },
  { value: "tax", label: "Tax", group: "Cash" },
  { value: "buy", label: "Purchase", group: "Investments" },
  { value: "sell", label: "Sale", group: "Investments" },
  { value: "opening_position", label: "Existing holding (opening position)", group: "Investments" },
  { value: "maturity", label: "Maturity (T-bill / bond / deposit)", group: "Investments" },
  { value: "redemption", label: "Redemption (fund units)", group: "Investments" },
  { value: "security_transfer", label: "Move holding between my accounts", group: "Investments" },
  { value: "dividend", label: "Dividend", group: "Income" },
  { value: "interest", label: "Interest", group: "Income" },
  { value: "coupon", label: "Bond coupon", group: "Income" },
  { value: "reinvestment", label: "Reinvested income", group: "Income" },
  { value: "split", label: "Stock split", group: "Corporate actions" },
  { value: "stock_dividend", label: "Bonus issue / stock dividend", group: "Corporate actions" },
];

const NEEDS: Record<string, string[]> = {
  deposit: ["account", "currency", "amount"],
  withdrawal: ["account", "currency", "amount"],
  fee: ["account", "currency", "amount"],
  tax: ["account", "currency", "amount"],
  transfer: ["from", "to", "currency", "amount"],
  fx_conversion: ["account", "fx"],
  buy: ["account", "instrument", "quantity", "price", "fees"],
  sell: ["account", "instrument", "quantity", "price", "fees"],
  opening_position: ["account", "instrument", "quantity", "costBasis", "acquiredOn"],
  maturity: ["account", "instrument", "quantity", "proceeds"],
  redemption: ["account", "instrument", "quantity", "proceeds"],
  security_transfer: ["from", "to", "instrument", "quantity"],
  dividend: ["account", "instrumentOptional", "currency", "grossAmount", "withholdingTax"],
  interest: ["account", "instrumentOptional", "currency", "grossAmount", "withholdingTax"],
  coupon: ["account", "instrumentOptional", "currency", "grossAmount", "withholdingTax"],
  reinvestment: ["account", "instrument", "amount", "quantity"],
  split: ["instrument", "ratio"],
  stock_dividend: ["account", "instrument", "quantity"],
};

const CURRENCIES = ["NGN", "USD", "GBP", "EUR"];

export function TransactionForm({ accounts, instruments, today, defaultAccount }: { accounts: Account[]; instruments: Instrument[]; today: string; defaultAccount?: string }) {
  const [state, action] = useActionState(postEventAction, null);
  const [type, setType] = useState("deposit");
  const [instrumentId, setInstrumentId] = useState("");
  const [accountId, setAccountId] = useState(defaultAccount ?? accounts[0]?.id ?? "");
  const [idem] = useState(() => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now())));
  const needs = NEEDS[type] ?? [];
  const has = (k: string) => needs.includes(k);
  const instrument = instruments.find((i) => i.id === instrumentId);
  const accountCurrency = accounts.find((a) => a.id === accountId)?.currency ?? "NGN";
  const instrumentCcy = instrument?.currency;
  const err = (n: string) => fieldError(state, n);
  const groups = useMemo(() => [...new Set(TYPES.map((t) => t.group))], []);

  const instrumentSelect = (optional: boolean) => (
    <Field label={optional ? "Instrument (optional)" : "Instrument"} htmlFor="instrumentId" error={err("instrumentId")}>
      <Select id="instrumentId" name="instrumentId" value={instrumentId} onChange={(e) => setInstrumentId(e.target.value)} required={!optional}>
        <option value="">{optional ? "None (e.g. bank interest)" : "Choose…"}</option>
        {instruments.map((i) => (
          <option key={i.id} value={i.id}>
            {i.symbol ? `${i.symbol} · ` : ""}
            {i.name} ({i.currency}){i.private ? " · yours" : ""}
          </option>
        ))}
      </Select>
    </Field>
  );
  const accountSelect = (name: string, label: string) => (
    <Field label={label} htmlFor={name} error={err(name)}>
      <Select id={name} name={name} defaultValue={name === "accountId" ? undefined : ""} value={name === "accountId" ? accountId : undefined} onChange={name === "accountId" ? (e) => setAccountId(e.target.value) : undefined} required>
        {name !== "accountId" ? <option value="">Choose…</option> : null}
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} ({a.currency})
          </option>
        ))}
      </Select>
    </Field>
  );
  const money = (name: string, label: string, hint?: string) => (
    <Field label={label} htmlFor={name} hint={hint} error={err(name)}>
      <Input id={name} name={name} inputMode="decimal" className="num" autoComplete="off" required={!["fees", "withholdingTax"].includes(name)} />
    </Field>
  );

  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormMessage state={state} />
      </div>
      <input type="hidden" name="idempotencyKey" value={`${idem}-${type}`} />
      <Field label="Type" htmlFor="type">
        <Select id="type" name="type" value={type} onChange={(e) => setType(e.target.value)}>
          {groups.map((g) => (
            <optgroup key={g} label={g}>
              {TYPES.filter((t) => t.group === g).map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Field>
      <Field label="Date" htmlFor="occurredOn" hint="Trade or payment date." error={err("occurredOn")}>
        <Input id="occurredOn" name="occurredOn" type="date" defaultValue={today} max={today} required />
      </Field>
      {has("account") ? accountSelect("accountId", "Account") : null}
      {has("from") ? accountSelect("fromAccountId", "From account") : null}
      {has("to") ? accountSelect("toAccountId", "To account") : null}
      {has("instrument") ? instrumentSelect(false) : null}
      {has("instrumentOptional") ? instrumentSelect(true) : null}
      {has("currency") ? (
        <Field label="Currency" htmlFor="currency" error={err("currency")}>
          <Select id="currency" name="currency" key={`${type}-${instrumentCcy ?? accountCurrency}`} defaultValue={instrumentCcy ?? accountCurrency}>
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
      ) : instrumentCcy && ["buy", "sell", "opening_position", "maturity", "redemption", "reinvestment"].includes(type) ? (
        <input type="hidden" name="currency" value={instrumentCcy} />
      ) : null}
      {has("amount") ? money("amount", type === "reinvestment" ? "Income reinvested" : "Amount") : null}
      {has("quantity") ? money("quantity", type === "maturity" || type === "redemption" ? "Units / face value redeemed" : "Quantity (units)", instrument && /T-bill|Treasury/i.test(instrument.name) ? "For T-bills, enter the face value." : undefined) : null}
      {has("price") ? money("price", `Price per unit${instrumentCcy ? ` (${instrumentCcy})` : ""}`) : null}
      {has("fees") ? money("fees", "Fees and charges", "Brokerage, SEC/NGX fees, stamp duty. Leave blank if none.") : null}
      {has("costBasis") ? money("costBasis", "Total cost paid", "What you originally paid, including fees.") : null}
      {has("acquiredOn") ? (
        <Field label="Originally acquired on" htmlFor="acquiredOn" error={err("acquiredOn")}>
          <Input id="acquiredOn" name="acquiredOn" type="date" max={today} required />
        </Field>
      ) : null}
      {has("proceeds") ? money("proceeds", "Cash received") : null}
      {has("grossAmount") ? money("grossAmount", "Gross amount (before tax)") : null}
      {has("withholdingTax") ? money("withholdingTax", "Withholding tax deducted", "Leave blank if none.") : null}
      {has("fx") ? (
        <>
          <Field label="Converted from" htmlFor="fromCurrency">
            <Select id="fromCurrency" name="fromCurrency" defaultValue="NGN">{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select>
          </Field>
          {money("fromAmount", "Amount converted")}
          <Field label="Converted to" htmlFor="toCurrency">
            <Select id="toCurrency" name="toCurrency" defaultValue="USD">{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</Select>
          </Field>
          {money("toAmount", "Amount received")}
          {money("fees", "Conversion fees (source currency)", "Leave blank if none.")}
        </>
      ) : null}
      {has("ratio") ? (
        <>
          {money("numerator", "New shares", "e.g. 2 for a 2-for-1 split")}
          {money("denominator", "For every (old shares)", "e.g. 1")}
        </>
      ) : null}
      <Field label="Description" htmlFor="description" className="sm:col-span-2" error={err("description")}>
        <Input id="description" name="description" maxLength={300} placeholder="Optional" />
      </Field>
      <div className="sm:col-span-2">
        <SubmitButton pendingText="Validating and saving…">Save transaction</SubmitButton>
        <p className="mt-2 text-xs text-text-3">Entries are permanent. To correct one, reverse it — the original stays in your history.</p>
      </div>
    </form>
  );
}

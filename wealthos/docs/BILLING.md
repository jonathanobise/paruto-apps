# Plans and billing

Status (2 Nov 2026): **built, provider-neutral, not connected to a payment provider.** `SUBSCRIPTION_BILLING` is `pending_review` (classification `commercial`): available in development and staging, blocked in production until terms of sale, VAT treatment and invoice retention are reviewed. While it is blocked, every space is on Free and limits still apply.

## Plans (business hypotheses, editable in Admin → Billing)
| Plan | Price | Trial | Accounts | Goals | Alerts | Watchlists | Members | CSV imports / month | Assistant questions / month | PDF reports |
|---|---|---|---|---|---|---|---|---|---|---|
| Free | ₦0 | — | 5 | 2 | 3 | 1 | 1 | 2 | 10 | — |
| Wealth Plus | ₦4,500 / month | 14 days | 30 | 10 | 25 | 10 | 2 | 20 | 150 | ✓ |
| Wealth Pro | ₦12,500 / month | 14 days | unlimited | unlimited | 100 | unlimited | 5 | unlimited | 600 | ✓ |
| Adviser | custom (inactive, not public) | — | | | | | 10 | | | |

The prices are the directive's initial test pricing. Limits are my proposal for the hypothesis and are the owner's call. Demo spaces get Pro limits and are never billed.

**Entitlements** (`src/server/billing/entitlements.ts`) are enforced in the services, inside the same transaction as the insert: accounts (open), goals (active), alerts (per user), watchlists, members (including pending invitations), CSV imports this month, assistant questions this month (organisation-wide count via `app_ai_usage_this_month`), PDF reports. A refused action returns `PLAN_LIMIT` with a message that names the limit. **Downgrades never delete data**: items above a limit stay; only new ones are refused.

## Lifecycle
```
Free ──start trial──▶ trialing ──trial ends unpaid──▶ expired (Free)
  │                      │
  │ request plan         │ pay "start" invoice (paid period begins when the trial ends)
  ▼                      ▼
invoice (start:plan) ──paid──▶ active ──renewal invoice paid──▶ active (period +1)
                                 │  ├─ upgrade: prorated invoice; plan changes when paid
                                 │  ├─ downgrade / move to Free: scheduled for period end
                                 │  └─ cancel at period end ──▶ canceled (Free)
                                 └─ period ends unpaid ──▶ past_due (plan kept for grace days) ──▶ expired (Free)
```
- One trial per organisation; trial length and price come from the catalogue (enforced by a trigger, not just the app).
- Paid subscriptions are created only when the first invoice is paid. Customers never write invoice amounts: invoices are issued by the billing system after the app checks the caller is an owner/admin.
- Proration: (new price − old price) × remaining days ÷ period days, rounded to kobo. Downgrades aren't refunded; they take effect at renewal.
- The hourly `billing.lifecycle` job (worker) issues renewal invoices `renewalNoticeDays` before the period end, moves unpaid subscriptions to past-due with `graceDays`, expires them afterwards, ends scheduled cancellations and voids unpaid plan requests. It is idempotent.
- Owners get in-app notifications and emails (outbox until an email provider is connected) for invoices, payments, trial end, overdue and expiry.

## Invoices and receipts
Numbered `PREFIX-YYYY-000001` from a Postgres sequence. Tax is configurable (label, rate, prices inclusive or exclusive; default none). Once issued, amounts, lines, number and currency can't change; `open → paid | void` only; paid needs a date, method and reference; void needs a reason. Invoices are kept when an organisation is erased (`org_id` cleared, billing name/email kept) because they are accounting records; the retention period is a question for counsel/accountant. Customers see them under Settings → Plan & billing and can print or save them as PDF (the paid version is the receipt).

## Payment
- **Today: bank transfer, reconciled by an administrator** (Admin → Organisations or Billing → *Record payment*). The amount must equal the invoice total exactly; part payments are refused. Bank details are set in Admin → Billing settings; until then invoices show "payment details haven't been set up".
- **Payment providers:** not connected. The directive requires confirming a provider's terms and capabilities first. The framework is in place (`src/server/billing/providers.ts`): `POST /api/billing/webhook/{provider}` with a per-provider adapter that verifies the signature and maps the payload; shared handling stores every notification in `payment_events` (idempotent on provider + event id), rejects bad or stale signatures (401, kept for investigation), refuses payloads over 64 KiB, and applies a payment only if the invoice number, amount and currency match exactly — otherwise it is recorded as *failed* for an administrator. Only a test adapter exists (timestamped HMAC-SHA256, 5-minute window), enabled when `BILLING_TEST_WEBHOOK_SECRET` is set and refused in production.
- **To connect a provider** (e.g. Paystack or Flutterwave, after terms review): add an adapter that verifies its signature scheme and maps its success event to `{eventId, type: "payment.succeeded", invoiceNumber, amount, currency, reference, paidAt}`; add a checkout step that passes the invoice number as the provider reference; add its secret to the environment; test with the provider's test mode; add failure events and refunds.

## Revenue analytics
Admin → Billing: MRR (active and past-due paid plans, yearly prices ÷ 12, excluding trials and complimentary), subscriptions by plan and status, collections by month, unpaid invoices, failed or rejected payment notifications. From WealthOS's own records only.

## Administrative adjustments
Complimentary plans (1–24 months, with a reason), ending a subscription, voiding an invoice, editing plans (existing subscriptions keep their price until renewal) and billing settings. All audited.

## Owner decisions before charging anyone
1. Prices and limits (the table above is a hypothesis).
2. Terms of sale, cancellation and refunds (FCCPA 2018); VAT registration and whether prices include VAT; seller details on invoices (RC number, TIN).
3. Payment provider choice and contract; settlement account for bank transfers.
4. Invoice retention period after account deletion.
5. Recording the `SUBSCRIPTION_BILLING` compliance decision (`scripts/record-compliance-decision.ts`).

# CSV imports

Code: `src/server/imports/csv.ts` (pure parsing, mapping, validation, duplicates), `src/server/imports/service.ts` (preview, re-map, commit, discard, rollback, saved mappings), UI under `/transactions/import`.

## Flow
1. **Upload** a CSV into one ledger account (bank, brokerage, fund, T-bill). Choose auto-detect or a saved institution layout, and what `03/04/2026` means.
2. **Preview** (`import_batches.status = previewed`, 24 h): every row is parsed, mapped and validated; the ready rows are dry-run against the whole ledger; duplicates are flagged. Nothing is written to the ledger.
3. **Adjust** the column mapping and the institution's type words (e.g. `PURCH-EQ → Purchase`), optionally saving the layout by institution name. The preview is recomputed from the stored file text.
4. **Commit**: all selected rows are posted in one transaction under the ledger lock, re-validated against the ledger as it is *now*. If anything changed (new duplicates, or a row the ledger now rejects) nothing is imported and the message names the row. The raw file text is then deleted.
5. **Roll back** (any time): one reversal per imported event, appended together after a replay check. Refused if later entries depend on the imported ones (e.g. a manual sale of imported units). The originals and the batch record remain.

## Formats
- **WealthOS template** (`/api/import/template.csv`): `date,type,symbol,quantity,price,fees,amount,gross_amount,withholding_tax,currency,description,reference`.
- **Bank statements**: Debit/Credit columns (credit → deposit, debit → withdrawal) or one signed Amount column. Rows with both or neither are errors.
- **Broker / fund statements**: a type column plus whichever figures the type needs. Common header names are recognised automatically (e.g. *Trade Date, Action, Ticker, Qty, Unit Price, Commission, Narration, Reference*); anything else is mapped once in the preview and saved.

Importable types: deposit, withdrawal, buy, sell, dividend, interest, coupon, fee, tax, reinvestment, maturity, redemption, opening position, bonus/stock dividend. Transfers between accounts and FX conversions involve two accounts or currencies and are still entered by hand.

Instruments are matched by ISIN, then ticker (the organisation's private instrument wins over a catalogue one with the same ticker). Unknown instruments are row errors — add them as private instruments first. A buy/sell without a price derives it from Amount ÷ Quantity, with a visible warning (Amount is read as the value before fees).

## Values (never guessed)
- Numbers: `1,234.56`, `₦1,234.56`, `NGN 2,500,000`, `(1,234.00)` and trailing minus as negatives. Rejected: `1.234,56`, malformed grouping, exponents, more than 24 integer or 12 decimal digits.
- Dates: ISO (`2026-01-31`) and month names (`31-Jan-2026`, `31 January 2026`, `Jan 31, 2026`) always; numeric `dd/mm` vs `mm/dd` only per the chosen format; two-digit years rejected; impossible dates (31/02) rejected; future dates rejected.
- Signs on quantities/amounts are normalised when the type is known (brokers often show purchases as negatives).

## Duplicates and idempotency
- **Against the ledger**: by the institution's reference when both sides have one (`ledger_events.external_ref`), else by a content fingerprint (type, date, account, instrument, key figures, currency), matched as a multiset. Duplicates are skipped unless the user explicitly includes them.
- **Within the file**: identical rows are kept (two equal purchases on one day are possible) but warned about.
- **Same file twice**: SHA-256 of the bytes; committing a file that is already committed (and not rolled back) is refused.
- **Same batch twice**: status check under the ledger lock plus per-row idempotency keys `import:<batch>:<row>`.

## Hostile-file defences
≤ 2 MiB (also enforced as the server-action body limit), ≤ 5,000 rows, ≤ 50 columns, cells ≤ 500 characters; strict UTF-8 (BOM allowed); NUL bytes rejected (catches XLSX/ZIP and other binaries); unique non-empty headers; rate-limited previews (30/hour/user); file names sanitised. Cell text is only ever data: formula-like descriptions are stored verbatim, flagged in the preview, and neutralised with a leading apostrophe in CSV exports (`src/server/imports/export.ts`).

## Data model
`import_batches` (RLS; status lifecycle enforced by a trigger: previewed → committed | discarded, committed → rolled_back; file identity immutable; committed rows frozen; no DELETE grant) and `import_mappings` (RLS). `ledger_events.import_batch_id` and `external_ref` link events to their import.

"use client";
import { useActionState } from "react";
import { uploadAction } from "./actions";
import { Field, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage, fieldError } from "@/components/ui/form-message";

export function UploadForm({ accounts, mappings, defaultAccount }: { accounts: Array<{ id: string; name: string; currency: string }>; mappings: Array<{ id: string; name: string }>; defaultAccount?: string }) {
  const [state, action] = useActionState(uploadAction, null);
  return (
    <form action={action} className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
      <Field label="Import into account" htmlFor="accountId" hint="Every row is recorded against this account." error={fieldError(state, "accountId")}>
        <Select id="accountId" name="accountId" defaultValue={defaultAccount ?? accounts[0]?.id} required>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
        </Select>
      </Field>
      <Field label="File layout" htmlFor="mappingId" hint="Auto-detect works for the WealthOS template and most statements; you can adjust columns in the preview.">
        <Select id="mappingId" name="mappingId" defaultValue="">
          <option value="">Auto-detect columns</option>
          {mappings.map((m) => <option key={m.id} value={m.id}>Saved: {m.name}</option>)}
        </Select>
      </Field>
      <Field label="Dates like 03/04/2026 mean" htmlFor="dateFormat" hint="ISO dates (2026-04-03) and month names (3 Apr 2026) are always read correctly.">
        <Select id="dateFormat" name="dateFormat" defaultValue="DD/MM/YYYY">
          <option value="DD/MM/YYYY">3 April (day first — usual in Nigeria)</option>
          <option value="MM/DD/YYYY">4 March (month first — US style)</option>
        </Select>
      </Field>
      <Field label="CSV file" htmlFor="file" hint="UTF-8 CSV, up to 2 MB and 5,000 rows. Export Excel sheets as “CSV UTF-8”." error={fieldError(state, "file")}>
        <Input id="file" name="file" type="file" accept=".csv,text/csv" required className="h-auto py-2 file:mr-3 file:rounded-md file:border-0 file:bg-surface-2 file:px-3 file:py-1 file:text-sm" />
      </Field>
      <div className="sm:col-span-2">
        <SubmitButton pendingText="Checking the file…">Upload and preview</SubmitButton>
        <p className="mt-2 text-xs text-text-3">Nothing is added to your transactions until you review the preview and confirm.</p>
      </div>
    </form>
  );
}

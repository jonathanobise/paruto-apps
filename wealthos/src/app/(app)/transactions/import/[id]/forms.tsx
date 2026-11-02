"use client";
import { useActionState } from "react";
import { commitAction, remapAction, rollbackAction } from "../actions";
import { Field, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage, fieldError } from "@/components/ui/form-message";

type FieldDef = { key: string; label: string };

export function MappingForm({ batchId, headers, fields, columns, dateFormat, unknownTypes, typeAliases, types }: { batchId: string; headers: string[]; fields: FieldDef[]; columns: Record<string, string>; dateFormat: string; unknownTypes: string[]; typeAliases: Record<string, string>; types: Array<{ value: string; label: string }> }) {
  const [state, action] = useActionState(remapAction, null);
  return (
    <form action={action} className="flex flex-col gap-5">
      <FormMessage state={state} />
      <input type="hidden" name="batchId" value={batchId} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((f) => (
          <Field key={f.key} label={f.label} htmlFor={`col_${f.key}`}>
            <Select id={`col_${f.key}`} name={`col_${f.key}`} defaultValue={columns[f.key] ?? ""}>
              <option value="">— not in this file —</option>
              {headers.map((h) => <option key={h} value={h}>{h}</option>)}
            </Select>
          </Field>
        ))}
        <Field label="Dates like 03/04/2026 mean" htmlFor="dateFormat">
          <Select id="dateFormat" name="dateFormat" defaultValue={dateFormat}>
            <option value="DD/MM/YYYY">Day first (3 April)</option>
            <option value="MM/DD/YYYY">Month first (4 March)</option>
            <option value="auto">Only accept unambiguous dates</option>
          </Select>
        </Field>
      </div>
      {unknownTypes.length || Object.keys(typeAliases).length ? (
        <fieldset className="rounded-xl border border-border p-4">
          <legend className="px-1 text-[13px] font-medium text-text-2">What do this institution&apos;s type words mean?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {[...new Set([...Object.keys(typeAliases), ...unknownTypes])].map((t) => (
              <Field key={t} label={`“${t}”`} htmlFor={`alias_${t}`}>
                <Select id={`alias_${t}`} name={`alias_${t}`} defaultValue={typeAliases[t] ?? ""}>
                  <option value="">Not recognised</option>
                  {types.map((ty) => <option key={ty.value} value={ty.value}>{ty.label}</option>)}
                </Select>
              </Field>
            ))}
          </div>
        </fieldset>
      ) : null}
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Save this layout as (optional)" htmlFor="saveAs" hint="e.g. the institution's name, to reuse next time." className="min-w-64 flex-1" error={fieldError(state, "name")}>
          <Input id="saveAs" name="saveAs" maxLength={60} />
        </Field>
        <SubmitButton variant="secondary" pendingText="Re-checking…">Update preview</SubmitButton>
      </div>
    </form>
  );
}

export function CommitForm({ batchId, ready, duplicates }: { batchId: string; ready: number; duplicates: number }) {
  const [state, action] = useActionState(commitAction, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <FormMessage state={state} />
      <input type="hidden" name="batchId" value={batchId} />
      {duplicates > 0 ? (
        <label className="flex items-start gap-2 text-sm text-text-2">
          <input type="checkbox" name="includeDuplicates" className="mt-1 accent-[var(--accent)]" />
          <span>Also import the {duplicates} row{duplicates > 1 ? "s" : ""} that look like transactions you already have (only if they really are separate transactions).</span>
        </label>
      ) : null}
      <SubmitButton disabled={ready === 0 && duplicates === 0} pendingText="Importing…">
        Import {ready} transaction{ready === 1 ? "" : "s"}
      </SubmitButton>
      <p className="text-xs text-text-3">All rows are recorded together, or none are. Rows with errors are left out.</p>
    </form>
  );
}

export function RollbackForm({ batchId, count }: { batchId: string; count: number }) {
  const [state, action] = useActionState(rollbackAction, null);
  return (
    <details>
      <summary className="cursor-pointer text-sm font-medium text-negative">Roll back this import…</summary>
      <form action={action} className="mt-3 flex flex-col gap-3">
        <FormMessage state={state} />
        <input type="hidden" name="batchId" value={batchId} />
        <p className="text-sm text-text-2">Reverses all {count} imported transactions at once. The originals stay in your history, marked as reversed. Not possible if later transactions depend on them.</p>
        <Field label="Reason" htmlFor="reason" error={fieldError(state, "reason")}>
          <Input id="reason" name="reason" placeholder="e.g. imported into the wrong account" required minLength={3} />
        </Field>
        <SubmitButton variant="danger" pendingText="Rolling back…">Roll back import</SubmitButton>
      </form>
    </details>
  );
}

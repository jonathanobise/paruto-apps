"use client";
import { useActionState } from "react";
import { commitMarketDataAction, uploadMarketDataAction } from "../actions";
import { Field, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";

export function MarketUploadForm({ sources, kinds }: { sources: Array<{ id: string; name: string }>; kinds: Array<{ key: string; label: string; headers: string }> }) {
  const [state, action] = useActionState(uploadMarketDataAction, null);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
      <Field label="Data" htmlFor="kind" hint={kinds.map((k) => `${k.label}: ${k.headers}`).join(" · ")} className="sm:col-span-2">
        <Select id="kind" name="kind">{kinds.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}</Select>
      </Field>
      <Field label="Source" htmlFor="sourceId"><Select id="sourceId" name="sourceId" required>{sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
      <Field label="Numeric dates mean" htmlFor="dateFormat"><Select id="dateFormat" name="dateFormat" defaultValue="auto"><option value="auto">Unambiguous dates only</option><option value="DD/MM/YYYY">Day first</option><option value="MM/DD/YYYY">Month first</option></Select></Field>
      <Field label="CSV file" htmlFor="file" className="sm:col-span-2"><Input id="file" name="file" type="file" accept=".csv,text/csv" required className="h-auto py-2" /></Field>
      <div className="sm:col-span-2"><SubmitButton pendingText="Checking…">Upload and preview</SubmitButton></div>
    </form>
  );
}

export function CommitMarketForm({ id, ready }: { id: string; ready: number }) {
  const [state, action] = useActionState(commitMarketDataAction, null);
  return (
    <form action={action} className="flex flex-col gap-2">
      <FormMessage state={state} />
      <input type="hidden" name="id" value={id} />
      {state?.ok ? null : <SubmitButton disabled={!ready} pendingText="Importing…">Import {ready} verified rows</SubmitButton>}
    </form>
  );
}

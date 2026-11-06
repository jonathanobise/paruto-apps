"use client";
import { ActionForm } from "@/components/ui/action-form";
import { useActionState, useState } from "react";
import { saveModelAction } from "../goals/actions";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage, fieldError } from "@/components/ui/form-message";

export function NewModelForm({ buckets }: { buckets: Array<{ key: string; label: string }> }) {
  const [state, action, actionPending] = useActionState(saveModelAction, null);
  const [weights, setWeights] = useState<Record<string, string>>({});
  const total = Object.values(weights).reduce((s, v) => s + (Number(v) || 0), 0);
  return (
    <ActionForm action={action} pending={actionPending} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="m-name" error={fieldError(state, "name")}><Input id="m-name" name="name" required /></Field>
        <Field label="Description (optional)" htmlFor="m-desc"><Input id="m-desc" name="description" maxLength={300} /></Field>
      </div>
      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="mb-1 text-[13px] font-medium text-text-2">Target weights (%)</legend>
        {buckets.map((b) => (
          <label key={b.key} className="flex items-center justify-between gap-3 text-sm">
            <span>{b.label}</span>
            <Input name={`w_${b.key}`} inputMode="decimal" className="num w-24 text-right" value={weights[b.key] ?? ""} onChange={(e) => setWeights({ ...weights, [b.key]: e.target.value })} aria-label={`${b.label} weight`} />
          </label>
        ))}
      </fieldset>
      <p className={`num text-sm ${Math.abs(total - 100) < 0.001 ? "text-positive" : "text-text-2"}`} aria-live="polite">Total {total.toFixed(2)}% {Math.abs(total - 100) < 0.001 ? "✓" : "(must be 100%)"}</p>
      {fieldError(state, "weights") ? <p className="text-xs font-medium text-negative">{fieldError(state, "weights")![0]}</p> : null}
      <div><SubmitButton pendingText="Saving…">Save target mix</SubmitButton></div>
    </ActionForm>
  );
}

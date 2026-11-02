"use client";
import { useActionState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { planAction } from "./actions";

export function PlanButton({ plan, intent, label, variant = "primary" }: { plan: string; intent: "trial" | "change"; label: string; variant?: "primary" | "secondary" }) {
  const [state, action, pending] = useActionState(planAction, null);
  return (
    <ActionForm action={action} pending={pending} className="flex flex-col gap-2">
      <input type="hidden" name="plan" value={plan} />
      <input type="hidden" name="intent" value={intent} />
      <SubmitButton variant={variant} size="sm" pendingText="Working…" className="w-full">{label}</SubmitButton>
      <FormMessage state={state} />
    </ActionForm>
  );
}

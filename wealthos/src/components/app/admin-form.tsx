"use client";
import { useActionState, type ReactNode } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import type { ActionResult } from "@/server/platform/errors";

type State = ActionResult<string | undefined> | null;

/** A server-action form that keeps input and shows the result (used across the admin console). */
export function AdminForm({ action, submit, children, variant = "primary", className }: { action: (s: State, f: FormData) => Promise<State>; submit: string; children?: ReactNode; variant?: "primary" | "secondary" | "danger"; className?: string }) {
  const [state, dispatch, pending] = useActionState(action, null);
  return (
    <ActionForm action={dispatch} pending={pending} className={className ?? "flex flex-col gap-3"}>
      <FormMessage state={state} />
      {children}
      <div><SubmitButton size="sm" variant={variant} pendingText="Working…">{submit}</SubmitButton></div>
    </ActionForm>
  );
}

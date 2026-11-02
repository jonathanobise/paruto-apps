"use client";
import { ActionForm } from "@/components/ui/action-form";
import { useActionState } from "react";
import { beginMfaAction, confirmMfaAction, disableMfaAction } from "../actions";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { Alert } from "@/components/ui/alert";

export function EnableMfa() {
  const [begin, beginAction, beginActionPending] = useActionState(beginMfaAction, null);
  const [confirm, confirmAction, confirmActionPending] = useActionState(confirmMfaAction, null);
  if (confirm?.ok && "recoveryCodes" in confirm.data) {
    return (
      <div className="flex flex-col gap-3">
        <Alert tone="success" title="Two-step verification is on">Save these recovery codes somewhere safe. Each works once if you lose your phone. They won&apos;t be shown again.</Alert>
        <ul className="num grid grid-cols-2 gap-2 rounded-[var(--radius-inner)] bg-surface-2 p-4 font-mono text-sm">
          {confirm.data.recoveryCodes.map((c) => <li key={c}>{c}</li>)}
        </ul>
      </div>
    );
  }
  if (begin?.ok && "secret" in begin.data) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-2">Add WealthOS to an authenticator app (Google Authenticator, 1Password, Authy…). Scan with your phone or enter the key manually:</p>
        <div className="size-44 rounded-[var(--radius-inner)] border border-border bg-white p-2 [&_svg]:size-full" role="img" aria-label="QR code for your authenticator app" dangerouslySetInnerHTML={{ __html: begin.data.qrSvg }} />
        <code className="num block break-all rounded-[var(--radius-inner)] bg-surface-2 px-3 py-2 text-sm tracking-wider" data-testid="totp-secret">{begin.data.secret}</code>
        <ActionForm action={confirmAction} pending={confirmActionPending} className="flex flex-col gap-3">
          <FormMessage state={confirm} />
          <Field label="6-digit code from the app" htmlFor="code"><Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" className="num max-w-40 tracking-widest" required /></Field>
          <SubmitButton pendingText="Checking…">Turn on</SubmitButton>
        </ActionForm>
      </div>
    );
  }
  return (
    <ActionForm action={beginAction} pending={beginActionPending} className="flex flex-col gap-3">
      <FormMessage state={begin} />
      <p className="text-sm text-text-2">Protect your account with a code from your phone in addition to your password.</p>
      <SubmitButton variant="accent" pendingText="Preparing…">Set up two-step verification</SubmitButton>
    </ActionForm>
  );
}

export function DisableMfa() {
  const [state, action, actionPending] = useActionState(disableMfaAction, null);
  return (
    <ActionForm action={action} pending={actionPending} className="flex flex-col gap-3">
      <FormMessage state={state} />
      <p className="text-sm text-text-2">Two-step verification is <strong className="text-positive">on</strong>.</p>
      <details>
        <summary className="cursor-pointer text-sm text-text-3 hover:text-negative">Turn off…</summary>
        <div className="mt-3 flex flex-col gap-3">
          <Field label="Confirm with your password" htmlFor="mfa-pw"><Input id="mfa-pw" name="password" type="password" autoComplete="current-password" required /></Field>
          <SubmitButton variant="danger" pendingText="Turning off…">Turn off two-step verification</SubmitButton>
        </div>
      </details>
    </ActionForm>
  );
}

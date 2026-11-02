"use client";
import { useActionState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { askAction } from "./actions";

export function AskForm({ conversationId, disabled, suggestions = [] }: { conversationId?: string; disabled?: boolean; suggestions?: string[] }) {
  const [state, action, pending] = useActionState(askAction, null);
  return (
    <ActionForm action={action} pending={pending} className="flex flex-col gap-3">
      <FormMessage state={state} />
      <input type="hidden" name="conversationId" value={conversationId ?? ""} />
      <label htmlFor="message" className="sr-only">Your question</label>
      <Textarea
        id="message"
        name="message"
        rows={3}
        maxLength={2000}
        required
        disabled={disabled}
        placeholder="Ask about a product, a concept, or your recorded finances…"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
        }}
      />
      {suggestions.length ? (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              disabled={disabled}
              className="rounded-full border border-border px-3 py-1 text-[12px] text-text-2 hover:bg-surface-2 disabled:opacity-50"
              onClick={(e) => {
                const ta = e.currentTarget.form?.elements.namedItem("message") as HTMLTextAreaElement | null;
                if (ta) {
                  ta.value = s;
                  ta.focus();
                }
              }}
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] text-text-3">Ctrl/⌘ + Enter to send. Answers take a few seconds.</p>
        <SubmitButton pendingText="Thinking…" disabled={disabled}>Ask</SubmitButton>
      </div>
    </ActionForm>
  );
}

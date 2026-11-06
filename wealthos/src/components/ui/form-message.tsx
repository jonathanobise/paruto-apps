import { Alert } from "./alert";
import type { ActionResult } from "@/server/platform/errors";

export function FormMessage({ state }: { state: ActionResult<string | undefined> | ActionResult<unknown> | null }) {
  if (!state) return null;
  if (state.ok) return typeof state.data === "string" ? <Alert tone="success">{state.data}</Alert> : null;
  return <Alert tone={state.code === "VALIDATION" ? "warning" : "danger"}>{state.message}</Alert>;
}

export function fieldError(state: ActionResult<unknown> | null, name: string): string[] | undefined {
  return state && !state.ok ? state.fieldErrors?.[name] : undefined;
}

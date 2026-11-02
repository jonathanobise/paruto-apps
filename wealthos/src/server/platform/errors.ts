/** Typed application errors. Messages are safe to show to the user; details stay in logs. */
export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "FEATURE_UNAVAILABLE"
  | "LEDGER_REJECTED"
  | "PLAN_LIMIT";

export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; code: AppErrorCode; message: string; fieldErrors?: Record<string, string[]> };

export function toActionError(err: unknown): { ok: false; code: AppErrorCode; message: string; fieldErrors?: Record<string, string[]> } {
  if (err instanceof AppError) {
    const fieldErrors = err.details?.fieldErrors as Record<string, string[]> | undefined;
    return { ok: false, code: err.code, message: err.message, ...(fieldErrors ? { fieldErrors } : {}) };
  }
  console.error("[wealthos] unexpected error", err);
  return { ok: false, code: "VALIDATION", message: "Something went wrong. Nothing was saved. Please try again." };
}

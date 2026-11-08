import { ArrowRight } from "lucide-react";
import { Alert } from "@/components/ui/alert";

const OUTCOMES: Record<string, { tone: "warning" | "danger" | "info"; text: string }> = {
  signed_out: { tone: "info", text: "You're signed out of VioWealth and Paruto ID." },
  cancelled: { tone: "info", text: "Sign-in was cancelled. You can try again whenever you're ready." },
  expired: { tone: "warning", text: "That sign-in took too long or was opened in another browser. Please start again." },
  failed: { tone: "danger", text: "Paruto ID couldn't confirm your sign-in. Please try again." },
  unavailable: { tone: "warning", text: "Sign-in through Paruto ID isn't set up on this copy yet." },
  not_allowed: { tone: "danger", text: "This account doesn't have access here." },
  linked_elsewhere: { tone: "danger", text: "This email is already linked to a different Paruto ID. Contact support to change it." },
};

/** Why the last Paruto ID sign-in didn't complete (from ?signin=…), in plain words. */
export function ParutoOutcome({ outcome }: { outcome?: string | undefined }) {
  const o = outcome ? OUTCOMES[outcome] : undefined;
  return o ? <Alert tone={o.tone}>{o.text}</Alert> : null;
}

/**
 * "Continue with Paruto ID" (paruto-standards/PARUTO-ID.md): a plain link to the start route, which
 * sends the browser to id.paruto.com. A passkey or a 6-digit email code there; no password here.
 */
export function ParutoIdButton({ next }: { next: string }) {
  return (
    <a
      href={`/api/auth/paruto/start?next=${encodeURIComponent(next)}`}
      className="spring inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[image:var(--vio-cta)] px-6 text-[15px] font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_12px_32px_-12px_rgb(124_77_255/0.65)] hover:brightness-110"
    >
      Continue with Paruto ID <ArrowRight className="size-4" aria-hidden />
    </a>
  );
}

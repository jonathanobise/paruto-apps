import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/context";
import { safeNext } from "@/lib/safe-next";
import { Alert } from "@/components/ui/alert";
import { SignInForm } from "./form";
import { BRAND } from "@/lib/brand";
import { DemoGate } from "@/components/app/demo-entry";
import { isDemoMode } from "@/server/demo/mode";
import { isPrivateMode, isPrivateOwner } from "@/lib/private-mode";
import { parutoReady } from "@/server/identity/paruto-id";
import { ParutoIdButton, ParutoOutcome } from "@/components/app/paruto-id";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ reset?: string; verified?: string; next?: string; signin?: string }> }) {
  const session = await getSession();
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const allowed = session ? isPrivateOwner(session.user.email) : false;
  if (allowed && (session?.mfaSatisfied || (session && !session.user.mfaEnabled))) redirect(next);
  // Private deployments: Paruto ID is the only way in, and only the owner gets past it.
  if (isPrivateMode())
    return (
      <div>
        <h1 className="font-display text-[36px] leading-[1.05]">Welcome <em>back</em></h1>
        <p className="mt-2 text-sm text-text-2">This {BRAND} is private. Sign in with your Paruto ID: a passkey or a code sent to your email.</p>
        <div className="mt-8 flex flex-col gap-4">
          <ParutoOutcome outcome={sp.signin} />
          {parutoReady() ? <ParutoIdButton next={sp.next ? next : "/research"} /> : <ParutoOutcome outcome="unavailable" />}
        </div>
      </div>
    );
  if (isDemoMode())
    return (
      <div>
        <h1 className="font-display text-[36px] leading-[1.05]">Explore the <em>demo</em></h1>
        <div className="mt-6">
          <DemoGate />
        </div>
      </div>
    );
  return (
    <div>
      <h1 className="font-display text-[36px] leading-[1.05]">Welcome <em>back</em></h1>
      <p className="mt-2 text-sm text-text-2">
        New to {BRAND}?{" "}
        <Link href={next.startsWith("/invite") ? `/sign-up?next=${encodeURIComponent(next)}` : "/sign-up"} className="font-medium text-accent hover:underline">
          Create an account
        </Link>
      </p>
      <div className="mt-8 flex flex-col gap-4">
        {sp.reset ? <Alert tone="success">Password updated. Sign in with your new password.</Alert> : null}
        {sp.verified ? <Alert tone="success">Email confirmed. Sign in to continue.</Alert> : null}
        <ParutoOutcome outcome={sp.signin} />
        {parutoReady() ? (
          <>
            <ParutoIdButton next={next} />
            <p className="flex items-center gap-3 text-[12px] text-text-3"><span className="h-px flex-1 bg-border" />or with your password<span className="h-px flex-1 bg-border" /></p>
          </>
        ) : null}
        <SignInForm next={next} />
      </div>
    </div>
  );
}

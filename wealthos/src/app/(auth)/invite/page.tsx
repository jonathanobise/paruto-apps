import Link from "next/link";
import { getSession } from "@/server/auth/context";
import { previewInvitation, ROLE_HELP, ROLE_LABELS } from "@/server/identity/members";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AcceptInviteForm } from "./form";

export const metadata = { title: "Invitation · WealthOS" };

export default async function InvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  const [invite, session] = await Promise.all([previewInvitation(token), getSession()]);
  const here = `/invite?token=${encodeURIComponent(token)}`;
  if (!invite) return (<div><h1 className="font-display text-[36px] leading-[1.05]">Invitation</h1><Alert tone="warning" className="mt-6">This invitation link isn&apos;t valid. Ask the person who invited you to send a new one.</Alert></div>);
  const signedIn = session && (!session.user.mfaEnabled || session.mfaSatisfied);
  return (
    <div>
      <h1 className="font-display text-[36px] leading-[1.05]">Join “{invite.org_name}”</h1>
      <p className="mt-2 text-sm text-text-2">You&apos;ve been invited as {ROLE_LABELS[invite.role].toLowerCase()}. {ROLE_HELP[invite.role]}</p>
      <div className="mt-8 flex flex-col gap-4">
        {invite.state !== "open" ? <Alert tone="warning">This invitation has {invite.state === "accepted" ? "already been used" : invite.state === "expired" ? "expired" : "been withdrawn"}. Ask for a new one if you still need access.</Alert> : !signedIn ? (
          <>
            <p className="text-sm">Sign in with <span className="font-medium">{invite.email}</span> to accept.</p>
            <Button asChild><Link href={`/sign-in?next=${encodeURIComponent(here)}`}>Sign in to accept</Link></Button>
            <p className="text-[13px] text-text-3">No account yet? <Link href="/sign-up" className="text-accent hover:underline">Create one</Link> with this email address, confirm it, then open this link again.</p>
          </>
        ) : session.user.email.toLowerCase() !== invite.email.toLowerCase() ? (
          <Alert tone="warning">This invitation was sent to {invite.email}, but you&apos;re signed in as {session.user.email}. Sign out and sign in with the invited address.</Alert>
        ) : (
          <AcceptInviteForm token={token} />
        )}
      </div>
    </div>
  );
}

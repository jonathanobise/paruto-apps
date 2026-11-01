import Link from "next/link";
import { redirect } from "next/navigation";
import { MailCheck } from "lucide-react";
import { getSession } from "@/server/auth/context";
import { ResendForm } from "./resend";
import { signOutAction } from "../actions";

export const metadata = { title: "Confirm your email · WealthOS" };

export default async function VerifyEmailPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.user.emailVerified) redirect("/dashboard");
  return (
    <div>
      <div className="mb-6 flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <MailCheck aria-hidden />
      </div>
      <h1 className="font-display text-3xl font-semibold">Confirm your email</h1>
      <p className="mt-3 text-sm leading-relaxed text-text-2">
        We sent a link to <strong className="text-text">{session.user.email}</strong>. Open it to finish setting up your account. The link expires in 24 hours.
      </p>
      {process.env.EMAIL_TRANSPORT === "outbox" && process.env.NODE_ENV !== "production" ? (
        <p className="mt-3 text-sm text-text-2">
          Development mode: emails are not delivered. Open the{" "}
          <Link href="/dev/outbox" className="font-medium text-accent hover:underline">
            development outbox
          </Link>
          .
        </p>
      ) : null}
      <div className="mt-8">
        <ResendForm />
      </div>
      <form action={signOutAction} className="mt-6">
        <button className="text-sm text-text-3 hover:text-text">Sign out</button>
      </form>
    </div>
  );
}

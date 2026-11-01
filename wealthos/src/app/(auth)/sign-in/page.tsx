import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/context";
import { Alert } from "@/components/ui/alert";
import { SignInForm } from "./form";

export const metadata = { title: "Sign in · WealthOS" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ reset?: string; verified?: string }> }) {
  const session = await getSession();
  if (session?.mfaSatisfied || (session && !session.user.mfaEnabled)) redirect("/dashboard");
  const sp = await searchParams;
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Welcome back</h1>
      <p className="mt-2 text-sm text-text-2">
        New to WealthOS?{" "}
        <Link href="/sign-up" className="font-medium text-accent hover:underline">
          Create an account
        </Link>
      </p>
      <div className="mt-8 flex flex-col gap-4">
        {sp.reset ? <Alert tone="success">Password updated. Sign in with your new password.</Alert> : null}
        {sp.verified ? <Alert tone="success">Email confirmed. Sign in to continue.</Alert> : null}
        <SignInForm />
      </div>
    </div>
  );
}

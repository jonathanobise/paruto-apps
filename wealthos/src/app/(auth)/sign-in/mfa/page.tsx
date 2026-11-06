import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/context";
import { safeNext } from "@/lib/safe-next";
import { MfaForm } from "./form";
import { signOutAction } from "../../actions";

export const metadata = { title: "Two-step verification" };

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  const next = safeNext((await searchParams).next);
  if (session.mfaSatisfied) redirect(next);
  return (
    <div>
      <h1 className="font-display text-[36px] leading-[1.05]">Two-step <em>verification</em></h1>
      <p className="mt-2 text-sm text-text-2">Enter the code from your authenticator app to finish signing in.</p>
      <div className="mt-8">
        <MfaForm next={next} />
      </div>
      <form action={signOutAction} className="mt-6">
        <button className="text-sm text-text-3 hover:text-text">Use a different account</button>
      </form>
    </div>
  );
}

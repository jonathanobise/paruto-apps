import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/context";
import { MfaForm } from "./form";
import { signOutAction } from "../../actions";

export const metadata = { title: "Two-step verification · WealthOS" };

export default async function MfaPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  if (session.mfaSatisfied) redirect("/dashboard");
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Two-step verification</h1>
      <p className="mt-2 text-sm text-text-2">Enter the code from your authenticator app to finish signing in.</p>
      <div className="mt-8">
        <MfaForm />
      </div>
      <form action={signOutAction} className="mt-6">
        <button className="text-sm text-text-3 hover:text-text">Use a different account</button>
      </form>
    </div>
  );
}

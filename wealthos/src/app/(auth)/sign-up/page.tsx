import Link from "next/link";
import { SignUpForm } from "./form";

export const metadata = { title: "Create account · WealthOS" };

export default function SignUpPage() {
  return (
    <div>
      <h1 className="font-display text-[36px] leading-[1.05]">Create your <em>account</em></h1>
      <p className="mt-2 text-sm text-text-2">
        Already have one?{" "}
        <Link href="/sign-in" className="font-medium text-accent hover:underline">
          Sign in
        </Link>
      </p>
      <div className="mt-8">
        <SignUpForm />
      </div>
      <p className="mt-6 text-xs leading-relaxed text-text-3">WealthOS is a record-keeping and research tool. It never holds your money, cannot place trades and does not give personal investment advice.</p>
    </div>
  );
}

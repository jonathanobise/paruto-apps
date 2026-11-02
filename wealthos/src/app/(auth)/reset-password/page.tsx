import Link from "next/link";
import { RequestResetForm } from "./form";

export const metadata = { title: "Reset password · WealthOS" };

export default function ResetPage() {
  return (
    <div>
      <h1 className="font-display text-[36px] leading-[1.05]">Reset your <em>password</em></h1>
      <p className="mt-2 text-sm text-text-2">We&apos;ll email you a link to choose a new one.</p>
      <div className="mt-8">
        <RequestResetForm />
      </div>
      <Link href="/sign-in" className="mt-6 inline-block text-sm text-text-3 hover:text-text">
        Back to sign in
      </Link>
    </div>
  );
}

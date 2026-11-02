import { NewPasswordForm } from "../form";

export const metadata = { title: "Choose a new password · WealthOS" };

export default async function ConfirmResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <div>
      <h1 className="font-display text-[36px] leading-[1.05]">Choose a new password</h1>
      <p className="mt-2 text-sm text-text-2">You&apos;ll be signed out on every device.</p>
      <div className="mt-8">
        <NewPasswordForm token={token} />
      </div>
    </div>
  );
}

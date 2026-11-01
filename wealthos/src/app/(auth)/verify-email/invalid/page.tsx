import Link from "next/link";

export default function InvalidLink() {
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">This link has expired</h1>
      <p className="mt-3 text-sm text-text-2">Confirmation links work once and expire after 24 hours. Sign in and request a new one.</p>
      <Link href="/sign-in" className="mt-6 inline-block font-medium text-accent hover:underline">
        Go to sign in
      </Link>
    </div>
  );
}

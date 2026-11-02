import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-[60dvh] max-w-md flex-col justify-center px-5">
      <h1 className="font-display text-[36px] leading-[1.05]">Not <em>found</em></h1>
      <p className="mt-2 text-sm text-text-2">This page doesn&apos;t exist, or you don&apos;t have access to it.</p>
      <Link href="/dashboard" className="mt-6 font-medium text-accent hover:underline">Go to dashboard</Link>
    </main>
  );
}

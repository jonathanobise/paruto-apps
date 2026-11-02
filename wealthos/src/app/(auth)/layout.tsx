import Link from "next/link";
import { Logo } from "@/components/app/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)]">
      <aside className="relative m-3 hidden overflow-hidden rounded-[32px] border border-border bg-surface p-12 shadow-[var(--shadow)] lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 h-[520px] w-[620px] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--accent)_24%,transparent),transparent)] blur-2xl" />
        <Link href="/" className="spring relative w-fit">
          <Logo />
        </Link>
        <div className="relative max-w-md">
          <p className="font-display text-[52px] leading-[1.02]">Know exactly where your wealth <em>stands.</em></p>
          <p className="mt-5 text-[15px] leading-relaxed text-text-2">Every account, holding and liability in one calm, precise view — with returns calculated properly and every figure traced to its source.</p>
        </div>
        <ul className="relative space-y-2 text-sm text-text-2">
          <li>Non-custodial: we never hold your money or place trades.</li>
          <li>Your data stays yours: export or delete it at any time.</li>
        </ul>
      </aside>
      <main id="main" className="flex flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="mb-10 inline-block lg:hidden">
            <Logo />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}

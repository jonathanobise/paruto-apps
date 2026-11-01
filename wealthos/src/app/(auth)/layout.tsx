import Link from "next/link";
import { Logo } from "@/components/app/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,560px)]">
      <aside className="relative hidden overflow-hidden bg-[#12392b] p-12 text-[#f6f3ec] lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="[&_rect]:fill-[#f6f3ec] [&_path]:stroke-[#12392b]">
          <Logo />
        </Link>
        <div className="max-w-md">
          <p className="font-display text-4xl leading-tight">Know exactly where your wealth stands.</p>
          <p className="mt-4 text-[15px] leading-relaxed text-[#cfe0d6]">Every account, holding and liability in one calm, precise view — with returns calculated properly and every figure traced to its source.</p>
        </div>
        <ul className="space-y-2 text-sm text-[#cfe0d6]">
          <li>Non-custodial: we never hold your money or place trades.</li>
          <li>Your data stays yours: export or delete it at any time.</li>
        </ul>
        <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full border border-white/10" />
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full border border-white/10" />
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

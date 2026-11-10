import Link from "next/link";
import { cookies } from "next/headers";
import { Logo } from "@/components/app/logo";
import { AppearanceControl } from "@/components/app/appearance";
import { VersionCapsule } from "@/components/updates/version-capsule";
import { DEPTH_COOKIE, THEME_COOKIE, isDepth, isTheme } from "@/lib/appearance";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const t = jar.get(THEME_COOKIE)?.value;
  const d = jar.get(DEPTH_COOKIE)?.value;
  const appearance = { theme: isTheme(t) ? t : "dark", depth: isDepth(d) ? d : "night" } as const;
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
      <main id="main" className="flex flex-col px-5 py-6 sm:px-10">
        {/* Visitors get the same Light / Dark / System choice (paruto-standards: Sidebar). */}
        <div className="flex justify-end">
          <AppearanceControl initial={appearance} showDepth={false} className="w-[132px]" />
        </div>
        <div className="mx-auto my-auto w-full max-w-sm py-10">
          <Link href="/" className="mb-10 inline-block lg:hidden">
            <Logo />
          </Link>
          {children}
        </div>
        <div className="flex justify-center">
          <VersionCapsule />
        </div>
      </main>
    </div>
  );
}

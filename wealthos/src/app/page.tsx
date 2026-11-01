import Link from "next/link";
import { ArrowRight, BarChart3, FileSearch, Landmark, LineChart, ShieldCheck, Target } from "lucide-react";
import { Logo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";

const pillars = [
  { icon: Landmark, title: "Everything in one place", body: "Bank accounts, funds, T-bills, shares, global ETFs, property, business interests and loans — in naira, dollars, pounds or euros." },
  { icon: LineChart, title: "Returns, measured properly", body: "Time-weighted and money-weighted returns that never count a deposit as profit, with the currency effect shown separately." },
  { icon: FileSearch, title: "Every figure has a source", body: "Prices, yields and FX rates carry their source and as-of date. Stale or missing data is flagged, never papered over." },
  { icon: Target, title: "Plan with honest scenarios", body: "Project goals under several assumptions at once, with inflation and fees, and never a single promised number." },
];

export default function Landing() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up">Get started</Link>
          </Button>
        </nav>
      </header>
      <main id="main">
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-14 sm:px-8 sm:pt-24">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">Private-wealth clarity, for everyone</p>
          <h1 className="font-display mt-4 max-w-3xl text-[40px] leading-[1.05] font-semibold sm:text-6xl">Understand, protect and grow what you own.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-text-2">
            WealthOS brings your whole financial position into one calm, precise view — net worth, performance, currency exposure and goals — built on an auditable ledger and deterministic calculations.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/sign-up">
                Create your free account <ArrowRight aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>
        </section>
        <section className="border-y border-border bg-surface">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
            {pillars.map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <div className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <Icon className="size-5" aria-hidden />
                </div>
                <h2 className="mt-4 text-base font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-text-2">{body}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-semibold">Clear about what we are — and aren&apos;t</h2>
            <p className="mt-4 leading-relaxed text-text-2">WealthOS is a non-custodial record-keeping, analytics and research platform. We never hold your money, never place trades, and do not tell you which security to buy. You stay in control; we give you the clarity.</p>
          </div>
          <ul className="space-y-4 text-[15px]">
            {[
              [ShieldCheck, "Bank-grade security: encrypted connections, two-step verification, strict tenant isolation in the database."],
              [BarChart3, "Decimal arithmetic for every naira and kobo. No floating-point rounding in your balances."],
              [FileSearch, "Your data is portable: export everything, or delete your account, whenever you like."],
            ].map(([Icon, text], i) => {
              const I = Icon as typeof ShieldCheck;
              return (
                <li key={i} className="flex gap-3">
                  <I className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
                  <span className="text-text-2">{text as string}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-text-3 sm:px-8">
          <span>© 2026 WealthOS. Information and tools, not investment advice.</span>
          <span className="flex gap-4">
            <Link href="/legal/terms" className="hover:text-text">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-text">Privacy</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}

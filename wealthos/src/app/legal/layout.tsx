import Link from "next/link";
import { Logo } from "@/components/app/logo";
import { Alert } from "@/components/ui/alert";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <Link href="/">
        <Logo />
      </Link>
      <Alert tone="warning" title="Draft — pending review by Nigerian counsel" className="mt-8">
        This document is a placeholder written by the engineering team. It is not final legal text and must be replaced before public launch (see docs/COMPLIANCE_MATRIX.md).
      </Alert>
      <article id="main" className="mt-8 space-y-4 text-[15px] leading-relaxed text-text-2 [&_h1]:font-display [&_h1]:text-3xl [&_h1]:text-text [&_h2]:mt-6 [&_h2]:font-semibold [&_h2]:text-text">
        {children}
      </article>
    </div>
  );
}

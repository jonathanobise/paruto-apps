import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/app/logo";
import { DisplayTitle } from "@/components/app/page-header";
import { ReleaseTimeline } from "@/components/updates/release-timeline";
import { ShippedAt } from "@/components/updates/shipped-at";
import { VersionCapsule } from "@/components/updates/version-capsule";
import { BRAND } from "@/lib/brand";
import { NOTES } from "@/lib/updates/notes";
import { knownReleases, releaseCounts, releaseTimeline } from "@/lib/updates/releases";

export const metadata = { title: "What's new" };

/**
 * Every release of VioWealth, newest first. Open to visitors (release notes carry no personal data).
 * A release history keeps a comfortable line length (paruto-standards: the full-width exception).
 */
export default function WhatsNewPage() {
  const items = releaseTimeline(NOTES, knownReleases());
  const counts = releaseCounts(items);
  return (
    <div className="min-h-dvh">
      <header className="glass sticky top-3 z-30 mx-3 mt-3 flex h-14 items-center gap-3 rounded-full px-3 sm:px-4">
        <Link href="/dashboard" className="spring inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[13px] font-medium text-text-2 hover:bg-text/10 hover:text-text">
          <ArrowLeft className="size-4" aria-hidden /> Back
        </Link>
        <Link href="/" className="spring mx-auto" aria-label={`${BRAND} home`}>
          <Logo />
        </Link>
        <span className="w-[68px]" aria-hidden />
      </header>
      <main id="main" className="mx-auto max-w-[720px] px-5 pb-20 pt-12 sm:pt-16">
        <p className="kicker">Release history</p>
        <h1 className="font-display mt-2 text-[38px] leading-[1.05] sm:text-[48px]">
          <DisplayTitle text="What's new in VioWealth" />
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-text-2">
          {counts.releases === 0 ? (
            `Every version of ${BRAND} will be listed here as it ships.`
          ) : (
            <>
              {counts.releases === 1 ? "One release" : `${counts.releases} releases`}
              {counts.since ? (
                <>
                  {" "}
                  since <ShippedAt at={counts.since} />
                </>
              ) : null}
              {counts.fixes ? `, ${counts.features} you can feel and ${counts.fixes} of fixes and polish.` : "."}
            </>
          )}
        </p>
        <div className="mt-12">{items.length ? <ReleaseTimeline items={items} /> : null}</div>
        <div className="mt-4 flex justify-center">
          <VersionCapsule />
        </div>
      </main>
    </div>
  );
}

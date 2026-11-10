import { BUILD, CURRENT_RELEASE, CURRENT_RELEASE_AT } from "@/lib/updates/version";

/**
 * What's live (served at /__version, next.config.ts): a few bytes, never cached, no sign-in. The
 * update pill compares `build` with its page's; the connection light uses it as its probe.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ release: CURRENT_RELEASE, at: CURRENT_RELEASE_AT, build: BUILD }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

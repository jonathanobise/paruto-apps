import { NextResponse, type NextRequest } from "next/server";
import { getSession, setSessionCookie } from "@/server/auth/context";
import { startOwnerSession } from "@/server/private/session";
import { isPrivateMode } from "@/lib/private-mode";
import { safeNext } from "@/lib/safe-next";
import { env } from "@/server/platform/env";

/** Private deployments: sign the Access-verified owner in (src/lib/private-mode.ts). */
export async function GET(request: NextRequest) {
  if (!isPrivateMode()) return new NextResponse("Not found", { status: 404 });
  const next = safeNext(request.nextUrl.searchParams.get("next") ?? "/research");
  const existing = await getSession();
  if (!existing) {
    const s = await startOwnerSession(request.headers);
    await setSessionCookie(s.token, s.expiresAt);
  }
  return NextResponse.redirect(new URL(next, env().APP_ORIGIN), 303);
}

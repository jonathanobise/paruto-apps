import { NextResponse, type NextRequest } from "next/server";
import { PARUTO_COOKIE, PARUTO_PATH, completeParutoSignIn } from "@/server/identity/paruto-id";
import { requestMeta, setSessionCookie } from "@/server/auth/context";
import { env } from "@/server/platform/env";

/** Paruto ID sends people back here with a one-time code; it is exchanged server-side for a verified email. */
export async function GET(request: NextRequest) {
  const origin = env().APP_ORIGIN;
  const q = request.nextUrl.searchParams;
  const result = await completeParutoSignIn(origin, { code: q.get("code"), state: q.get("state"), error: q.get("error") }, request.cookies.get(PARUTO_COOKIE)?.value, await requestMeta());
  let res: NextResponse;
  if (result.ok) {
    await setSessionCookie(result.session.token, result.session.expiresAt);
    res = NextResponse.redirect(new URL(result.mfaRequired ? "/sign-in/mfa" : result.next, origin), 303);
  } else {
    res = NextResponse.redirect(new URL(`/sign-in?signin=${result.outcome}`, origin), 303);
  }
  res.cookies.set(PARUTO_COOKIE, "", { path: PARUTO_PATH, maxAge: 0 }); // single use
  res.headers.set("cache-control", "no-store");
  return res;
}

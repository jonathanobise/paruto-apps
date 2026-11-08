import { NextResponse, type NextRequest } from "next/server";
import { PARUTO_COOKIE, PARUTO_PATH, startParutoSignIn } from "@/server/identity/paruto-id";
import { env } from "@/server/platform/env";

/** "Continue with Paruto ID": sends the browser to id.paruto.com with a PKCE challenge (paruto-standards/PARUTO-ID.md). */
export async function GET(request: NextRequest) {
  const origin = env().APP_ORIGIN; // the configured public origin, never a request header
  const started = startParutoSignIn(origin, request.nextUrl.searchParams.get("next"));
  if (!started) return NextResponse.redirect(new URL("/sign-in?signin=unavailable", origin), 303);
  const res = NextResponse.redirect(started.location, 303);
  res.cookies.set(PARUTO_COOKIE, started.cookie.value, { httpOnly: true, secure: origin.startsWith("https://"), sameSite: "lax", path: PARUTO_PATH, maxAge: started.cookie.maxAge });
  res.headers.set("cache-control", "no-store");
  return res;
}

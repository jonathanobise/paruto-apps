import { NextResponse, type NextRequest } from "next/server";
import { verifyEmail } from "@/server/identity/service";
import { getSession, requestMeta } from "@/server/auth/context";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const ok = token.length > 20 && (await verifyEmail(token, await requestMeta()));
  const session = await getSession();
  const target = ok ? (session ? "/dashboard?welcome=1" : "/sign-in?verified=1") : "/verify-email/invalid";
  return NextResponse.redirect(new URL(target, req.nextUrl.origin), 303);
}

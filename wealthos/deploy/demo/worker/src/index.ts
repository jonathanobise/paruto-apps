/**
 * VioWealth on vio.paruto.com: one container with the app and its own Postgres, rebuilt at each
 * deploy. It sleeps after 20 idle minutes; the next visit starts a fresh copy from the image. The
 * container gets no internet access.
 *
 * Two profiles (deploy.sh):
 * - private (OWNER_EMAIL set): only the owner. Cloudflare Access sits in front of the hostname;
 *   this Worker re-verifies Access's signed token (signature against the team's keys, audience,
 *   issuer, expiry and the owner's email) and only then forwards the request, adding the verified
 *   email and a shared secret the app checks on every request (src/lib/private-mode.ts).
 * - demo (no OWNER_EMAIL): the public SAMPLE demo, open to everyone.
 */
import { Container } from "@cloudflare/containers";
import { verifyAccessToken } from "./access";

const PRIMARY_HOST = "vio.paruto.com";
const OWNER_EMAIL_HEADER = "x-vio-owner-email";
const OWNER_PROOF_HEADER = "x-vio-owner-proof";

interface Env {
  DEMO: { getByName(name: string): { fetch(request: Request): Promise<Response> } };
  /** Private profile: the only person allowed in. */
  OWNER_EMAIL?: string;
  /** Private profile: e.g. https://<team>.cloudflareaccess.com */
  ACCESS_TEAM_DOMAIN?: string;
  /** Private profile: the Access application's audience tag. */
  ACCESS_AUD?: string;
  /** Private profile (secret): proves to the app that a request came through this Worker. */
  OWNER_PROXY_SECRET?: string;
}

export class DemoApp extends Container<Env> {
  defaultPort = 8080;
  sleepAfter = "20m";
  enableInternet = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    if (env.OWNER_EMAIL && env.OWNER_PROXY_SECRET) {
      this.envVars = { PRIVATE_OWNER_EMAIL: env.OWNER_EMAIL, OWNER_PROXY_SECRET: env.OWNER_PROXY_SECRET };
    }
  }
}

const denied = (why: string) => new Response(`This is a private site. ${why}`, { status: 403, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    // Old address: send links to the current host, keeping the path.
    if (url.hostname !== PRIMARY_HOST) {
      url.hostname = PRIMARY_HOST;
      return Response.redirect(url.toString(), 301);
    }
    const headers = new Headers(request.headers);
    // Never let a visitor supply the owner headers themselves.
    headers.delete(OWNER_EMAIL_HEADER);
    headers.delete(OWNER_PROOF_HEADER);

    if (env.OWNER_EMAIL) {
      // Private profile: fail closed if any part of the configuration is missing.
      if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD || !env.OWNER_PROXY_SECRET || env.OWNER_PROXY_SECRET.length < 32) return denied("It isn't configured yet.");
      const token = request.headers.get("cf-access-jwt-assertion");
      if (!token) return denied("Sign in through Cloudflare Access.");
      const email = await verifyAccessToken(token, { ACCESS_TEAM_DOMAIN: env.ACCESS_TEAM_DOMAIN, ACCESS_AUD: env.ACCESS_AUD });
      if (!email || email !== env.OWNER_EMAIL.trim().toLowerCase()) return denied("This account doesn't have access.");
      headers.set(OWNER_EMAIL_HEADER, email);
      headers.set(OWNER_PROOF_HEADER, env.OWNER_PROXY_SECRET);
    }
    // The app checks that form posts come from its own origin; tell it the public host.
    headers.set("x-forwarded-host", url.host);
    headers.set("x-forwarded-proto", "https");
    return env.DEMO.getByName("shared-demo").fetch(new Request(request, { headers }));
  },
};

/**
 * VioWealth on vio.paruto.com: one container with the app and its own Postgres, rebuilt at each
 * deploy. It sleeps after 20 idle minutes; the next visit starts a fresh copy from the image.
 *
 * Two profiles (deploy.sh):
 * - private (OWNER_EMAIL set): the owner only. People sign in through Paruto ID (id.paruto.com) and
 *   the app admits only the owner's verified email (docs/PRIVATE.md). The container gets outbound
 *   internet access for one reason: the app exchanges Paruto ID's one-time code server-side.
 * - demo (no OWNER_EMAIL): the public SAMPLE demo, open to everyone, with no internet access.
 */
import { Container } from "@cloudflare/containers";

const PRIMARY_HOST = "vio.paruto.com";

interface Env {
  DEMO: { getByName(name: string): { fetch(request: Request): Promise<Response> } };
  /** Private profile: the only person allowed in. */
  OWNER_EMAIL?: string;
  /** Private profile: Paruto ID's address and this copy's client name in its allow-list. */
  PARUTO_ID_URL?: string;
  PARUTO_ID_CLIENT?: string;
  /** Private profile (secret): this copy's Paruto ID client secret. */
  PARUTO_ID_SECRET?: string;
}

export class DemoApp extends Container<Env> {
  defaultPort = 8080;
  sleepAfter = "20m";
  enableInternet = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    if (env.OWNER_EMAIL) {
      this.enableInternet = true;
      this.envVars = {
        PRIVATE_OWNER_EMAIL: env.OWNER_EMAIL,
        PARUTO_ID_URL: env.PARUTO_ID_URL ?? "",
        PARUTO_ID_CLIENT: env.PARUTO_ID_CLIENT ?? "",
        PARUTO_ID_SECRET: env.PARUTO_ID_SECRET ?? "",
      };
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    // Old address: send links to the current host, keeping the path.
    if (url.hostname !== PRIMARY_HOST) {
      url.hostname = PRIMARY_HOST;
      return Response.redirect(url.toString(), 301);
    }
    // The app checks that form posts come from its own origin; tell it the public host.
    const headers = new Headers(request.headers);
    headers.set("x-forwarded-host", url.host);
    headers.set("x-forwarded-proto", "https");
    return env.DEMO.getByName("shared-demo").fetch(new Request(request, { headers }));
  },
};

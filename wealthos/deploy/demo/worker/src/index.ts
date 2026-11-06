/**
 * VioWealth public demo (vio.paruto.com): one shared container (app + its own Postgres with the SAMPLE
 * portfolio baked in). It sleeps after 20 idle minutes; the next visit starts a fresh copy, which
 * is how the demo resets. The container gets no internet access: the demo calls no providers.
 */
import { Container } from "@cloudflare/containers";

export class DemoApp extends Container {
  defaultPort = 8080;
  sleepAfter = "20m";
  enableInternet = false;
}

const PRIMARY_HOST = "vio.paruto.com";

interface Env {
  DEMO: { getByName(name: string): { fetch(request: Request): Promise<Response> } };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    // The demo moved to vio.paruto.com (ADR-030): send old links there, keeping the path.
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

import type { Instrumentation } from "next";

/** Server errors in pages, route handlers, server actions and the proxy → one structured log line. */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const { log } = await import("@/server/platform/log");
  const header = (k: string) => {
    const v = request.headers[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const e = error instanceof Error ? error : new Error(String(error));
  log("error", "request.error", {
    requestId: header("x-request-id") ?? null,
    method: request.method,
    path: request.path.split("?")[0],
    routeType: context.routeType,
    routePath: context.routePath,
    digest: (error as { digest?: string }).digest ?? null,
    error: e,
  });
};

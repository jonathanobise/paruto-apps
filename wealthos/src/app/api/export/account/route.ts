import { requireAppForAction, requestMeta } from "@/server/auth/context";
import { exportUserData } from "@/server/privacy/service";
import { AppError } from "@/server/platform/errors";

/** Full personal-data export (JSON). */
export async function GET() {
  try {
    const app = await requireAppForAction();
    const data = await exportUserData(app.session.userId, await requestMeta());
    return new Response(JSON.stringify(data, null, 2), { headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="wealthos-export-${new Date().toISOString().slice(0, 10)}.json"`, "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof AppError && err.code === "RATE_LIMITED") return new Response(err.message, { status: 429 });
    return new Response("Not allowed", { status: 401 });
  }
}

// apps.paruto.com's only code: Dialscape's AI scene endpoint. Everything else is static files, served by Cloudflare
// before this Worker runs (wrangler.jsonc: assets.run_worker_first is only "/api/*").
//
// POST /api/generate  { prompt, style }  →  image/jpeg (or png)
// Guarded by: an origin check, a per-visitor rate limit (PER_IP binding), a site-wide daily cap (Quota Durable
// Object, DAILY_LIMIT), prompt length and a small word filter. The model is picked with the MODEL variable.

const MODELS = {
  // cheap and quick; square 1024 pictures (the app extends the sky above them)
  "flux-schnell": { id: "@cf/black-forest-labs/flux-1-schnell", input: (prompt, seed) => ({ prompt, steps: 6, seed }) },
  // sharper, full portrait pictures; costs several cents each
  phoenix: { id: "@cf/leonardo/phoenix-1.0", input: (prompt, seed) => ({ prompt, width: 832, height: 1792, num_steps: 25, guidance: 2, seed, negative_prompt: "text, letters, watermark, logo, frame" }) },
  "lucid-origin": { id: "@cf/leonardo/lucid-origin", input: (prompt, seed) => ({ prompt, width: 832, height: 1792, num_steps: 30, guidance: 4.5, seed }) },
  "sdxl-lightning": { id: "@cf/bytedance/stable-diffusion-xl-lightning", input: (prompt, seed) => ({ prompt, width: 768, height: 1664, num_steps: 8, seed, negative_prompt: "text, letters, watermark" }) },
};

const STYLES = {
  photo: "cinematic photograph, golden hour light, shallow depth of field, ultra detailed, 35mm film look",
  render: "stylised 3D render, soft studio lighting, subsurface scattering, octane render, adorable, highly detailed",
  anime: "anime key visual, painterly background, dramatic sky, vibrant colours, crisp linework",
  illustration: "editorial illustration, bold shapes, rich gradients, poster art, grain texture",
  fantasy: "epic fantasy concept art, volumetric light, atmospheric, highly detailed matte painting",
  noir: "moody monochrome photograph, high contrast, film grain, dramatic shadows",
};
// The time goes in the upper half and the subject stands in front of it, so ask for that composition
const COMPOSITION = "vertical phone wallpaper composition, the main subject standing in the lower half, open sky or simple uncluttered background in the upper half, no text, no letters, no numbers, no watermark";

// Kept short on purpose: obvious sexual content, and the best-known characters people may not use freely
const BLOCKED = /\b(nude|naked|nsfw|porn|sexual|sex|erotic|topless|lingerie|gore|beheaded|child abuse|spider-?man|batman|superman|mickey|minnie|stitch|pikachu|pokemon|naruto|goku|elsa|shrek|marvel|disney|pixar)\b/i;
const ALLOWED_ORIGINS = ["https://apps.paruto.com", "https://paruto-apps.paruto.workers.dev"];

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...extra } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/generate") return generate(request, env);
    if (url.pathname === "/api/status") return json({ ai: !!env.AI, model: env.MODEL || "flux-schnell" });
    if (url.pathname.startsWith("/api/")) return json({ error: "Not found" }, 404);
    return env.ASSETS.fetch(request);
  },
};

async function generate(request, env) {
  if (request.method !== "POST") return json({ error: "Use POST" }, 405, { allow: "POST" });
  const origin = request.headers.get("origin") || "";
  const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  if (!ALLOWED_ORIGINS.includes(origin) && !local) return json({ error: "Not allowed from here" }, 403);
  if (!env.AI) return json({ error: "AI isn't set up on this site" }, 503);

  let body;
  try {
    const text = await request.text();
    if (text.length > 4000) return json({ error: "Too long" }, 413);
    body = JSON.parse(text);
  } catch { return json({ error: "Send JSON" }, 400); }
  const prompt = String(body.prompt || "").replace(/\s+/g, " ").trim().slice(0, 300);
  if (prompt.length < 3) return json({ error: "Describe the picture in a few words" }, 400);
  if (BLOCKED.test(prompt)) return json({ error: "Try describing it another way: some words (and well-known characters) can't be used" }, 422);
  const style = STYLES[body.style] ? body.style : "photo";

  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  if (env.PER_IP) {
    const { success } = await env.PER_IP.limit({ key: ip });
    if (!success) return json({ error: "That's a lot of pictures in a minute. Try again shortly." }, 429, { "retry-after": "60" });
  }
  if (env.QUOTA) {
    const stub = env.QUOTA.get(env.QUOTA.idFromName("daily"));
    const res = await stub.fetch(`https://quota/take?limit=${Number(env.DAILY_LIMIT) || 300}`);
    if (res.status === 429) return json({ error: "Today's AI pictures are used up. Try again tomorrow." }, 429, { "retry-after": "3600" });
  }

  const model = MODELS[env.MODEL] || MODELS["flux-schnell"];
  const full = `${prompt}. ${STYLES[style]}. ${COMPOSITION}`;
  const seed = Number.isInteger(body.seed) ? Math.abs(body.seed) % 2147483647 : Math.floor(Math.random() * 2147483647);
  let out;
  try {
    out = await env.AI.run(model.id, model.input(full, seed));
  } catch (e) {
    const msg = String(e?.message || e);
    if (/nsfw|safety|flagged/i.test(msg)) return json({ error: "That picture was blocked by the safety filter. Try describing it another way." }, 422);
    return json({ error: "The picture couldn't be made just now. Try again." }, 502);
  }
  const bytes = await toBytes(out);
  if (!bytes || bytes.length < 1000) return json({ error: "The picture came back empty. Try again." }, 502);
  const type = bytes[0] === 0x89 && bytes[1] === 0x50 ? "image/png" : "image/jpeg";
  return new Response(bytes, { headers: { "content-type": type, "cache-control": "no-store", "x-model": model.id, "x-seed": String(seed) } });
}

// Workers AI answers with base64 in { image }, or with raw bytes/stream, depending on the model
async function toBytes(out) {
  if (!out) return null;
  if (out instanceof Uint8Array) return out;
  if (out instanceof ArrayBuffer) return new Uint8Array(out);
  if (typeof ReadableStream !== "undefined" && out instanceof ReadableStream) return new Uint8Array(await new Response(out).arrayBuffer());
  const b64 = typeof out === "string" ? out : out.image;
  if (typeof b64 === "string") {
    const bin = atob(b64.replace(/^data:image\/\w+;base64,/, ""));
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  }
  return null;
}

// A site-wide count of pictures made today, so a busy day can't run up the bill
export class Quota {
  constructor(ctx) { this.ctx = ctx; }
  async fetch(request) {
    const limit = Number(new URL(request.url).searchParams.get("limit")) || 300;
    const day = new Date().toISOString().slice(0, 10);
    let rec = (await this.ctx.storage.get("count")) || { day, n: 0 };
    if (rec.day !== day) rec = { day, n: 0 };
    if (rec.n >= limit) return new Response(JSON.stringify(rec), { status: 429 });
    rec.n++;
    await this.ctx.storage.put("count", rec);
    return new Response(JSON.stringify(rec));
  }
}

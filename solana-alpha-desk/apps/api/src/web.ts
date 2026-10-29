import { WEB } from './web-bundle.generated.ts';

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'self'",
].join('; ');

const decoded = new Map<string, Uint8Array>();
function body(path: string): Uint8Array {
  let b = decoded.get(path);
  if (!b) {
    b = Uint8Array.from(atob(WEB[path]!.b64), (c) => c.charCodeAt(0));
    decoded.set(path, b);
  }
  return b;
}

/** Serves the embedded dashboard: exact files, `dir/` → `dir/index.html`, unknown routes → the app shell. */
export function serveWeb(req: Request): Response {
  const url = new URL(req.url);
  let path = decodeURIComponent(url.pathname);
  if (path.endsWith('/')) path += 'index.html';
  if (!WEB[path] && WEB[`${path}/index.html`])
    return Response.redirect(new URL(`${url.pathname}/${url.search}`, url).toString(), 308);
  if (!WEB[path]) path = WEB['/404.html'] && path.startsWith('/_next/') ? '/404.html' : '/index.html';
  const file = WEB[path];
  if (!file) return new Response('Not found', { status: 404 });
  const immutable = path.startsWith('/_next/static/');
  return new Response(req.method === 'HEAD' ? null : body(path), {
    status: path === '/404.html' ? 404 : 200,
    headers: {
      'content-type': file.type,
      'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
      'content-security-policy': CSP,
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      'x-frame-options': 'DENY',
      'strict-transport-security': 'max-age=31536000; includeSubDomains',
      'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    },
  });
}

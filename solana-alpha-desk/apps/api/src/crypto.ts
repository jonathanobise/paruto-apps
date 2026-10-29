import { sha256Hex, timingSafeEqualHex } from '@alpha-desk/shared';

const enc = new TextEncoder();
const b64url = (b: Uint8Array) =>
  btoa(String.fromCharCode(...b))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const fromB64url = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) =>
    c.charCodeAt(0),
  );
const hex = (b: ArrayBuffer | Uint8Array) =>
  [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');

export function randomToken(bytes = 32): string {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return b64url(b);
}

/** Cloudflare Workers cap PBKDF2 at 100,000 iterations; that is the value used everywhere. */
export const PBKDF2_ITERATIONS = 100_000;

export async function hashPassword(password: string, iterations = PBKDF2_ITERATIONS): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    256,
  );
  return `pbkdf2-sha256$${iterations}$${b64url(salt)}$${hex(bits)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, iter, salt, expected] = stored.split('$');
  if (alg !== 'pbkdf2-sha256' || !iter || !salt || !expected) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromB64url(salt), iterations: Number(iter) },
    key,
    256,
  );
  return timingSafeEqualHex(hex(bits), expected);
}

export const sessionHash = (token: string) => sha256Hex(`session:${token}`);

// ── TOTP (RFC 6238, SHA-1, 30 s, 6 digits) ────────────────────────────────
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32Encode(b: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of b) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}
export function base32Decode(s: string): Uint8Array {
  const clean = s.replace(/=+$/, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const c of clean) {
    const i = B32.indexOf(c);
    if (i < 0) throw new Error('invalid base32');
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out) as Uint8Array<ArrayBuffer>;
}

export function newTotpSecret(): string {
  const b = new Uint8Array(20);
  crypto.getRandomValues(b);
  return base32Encode(b);
}

export async function totp(secret: string, atMs: number, step = 30): Promise<string> {
  const counter = Math.floor(atMs / 1000 / step);
  const msg = new Uint8Array(8);
  new DataView(msg.buffer).setBigUint64(0, BigInt(counter));
  const key = await crypto.subtle.importKey(
    'raw',
    base32Decode(secret) as Uint8Array<ArrayBuffer>,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const h = new Uint8Array(await crypto.subtle.sign('HMAC', key, msg));
  const o = h[h.length - 1]! & 15;
  const code = (((h[o]! & 127) << 24) | (h[o + 1]! << 16) | (h[o + 2]! << 8) | h[o + 3]!) % 1_000_000;
  return String(code).padStart(6, '0');
}

/** Accepts the current step and one step either side for clock drift. */
export async function verifyTotp(secret: string, code: string, atMs: number): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;
  for (const d of [-30_000, 0, 30_000]) if ((await totp(secret, atMs + d)) === code) return true;
  return false;
}

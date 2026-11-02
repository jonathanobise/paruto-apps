import "server-only";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { env } from "@/server/platform/env";

function scrypt(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => scryptCb(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key))));
}

const KEY_LEN = 64;

/** scrypt password hash, self-describing so cost can be raised later: scrypt$logN$r$p$salt$hash. */
export async function hashPassword(password: string, logN = env().SCRYPT_LOG_N): Promise<string> {
  const salt = randomBytes(16);
  const N = 2 ** logN;
  const key = await scrypt(password.normalize("NFKC"), salt, KEY_LEN, { N, r: 8, p: 1, maxmem: 256 * N * 8 + 1024 * 1024 });
  return `scrypt$${logN}$8$1$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, encoded: string | null): Promise<boolean> {
  if (!encoded) {
    // Equalise timing for accounts without a password.
    await hashPassword(password);
    return false;
  }
  const parts = encoded.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, logNStr, rStr, pStr, saltStr, hashStr] = parts as [string, string, string, string, string, string];
  const N = 2 ** Number(logNStr);
  const expected = Buffer.from(hashStr, "base64url");
  const key = await scrypt(password.normalize("NFKC"), Buffer.from(saltStr, "base64url"), expected.length, { N, r: Number(rStr), p: Number(pStr), maxmem: 256 * N * Number(rStr) + 1024 * 1024 });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

export function needsRehash(encoded: string): boolean {
  return Number(encoded.split("$")[1]) < env().SCRYPT_LOG_N;
}

/** 256-bit random token, URL safe. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function key(): Buffer {
  return Buffer.from(env().APP_ENCRYPTION_KEY, "base64");
}

/** AES-256-GCM encryption for small secrets at rest (e.g. TOTP seeds). */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

export function decryptSecret(encoded: string): string {
  const buf = Buffer.from(encoded, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}

// --- TOTP (RFC 6238, HMAC-SHA1, 30 s, 6 digits) ------------------------------------------
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
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

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) throw new RangeError("invalid base32");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function hotp(secret: Buffer, counter: number, digits = 6): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const mac = createHmac("sha1", secret).update(msg).digest();
  const offset = mac[mac.length - 1]! & 0x0f;
  const code = ((mac[offset]! & 0x7f) << 24) | (mac[offset + 1]! << 16) | (mac[offset + 2]! << 8) | mac[offset + 3]!;
  return String(code % 10 ** digits).padStart(digits, "0");
}

export function totp(secretBase32: string, atMs = Date.now(), step = 30, digits = 6): string {
  return hotp(base32Decode(secretBase32), Math.floor(atMs / 1000 / step), digits);
}

/** The 30-second time step a code belongs to (current or one either side for clock drift), or null. */
export function totpStep(secretBase32: string, code: string, atMs = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(atMs / 1000 / 30);
  for (const delta of [-1, 0, 1]) if (safeEqual(hotp(secret, counter + delta), code)) return counter + delta;
  return null;
}

export function verifyTotp(secretBase32: string, code: string, atMs = Date.now()): boolean {
  return totpStep(secretBase32, code, atMs) !== null;
}

export function otpauthUri(secret: string, account: string, issuer = "WealthOS"): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

export function generateRecoveryCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const raw = randomBytes(5).toString("hex").toUpperCase();
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

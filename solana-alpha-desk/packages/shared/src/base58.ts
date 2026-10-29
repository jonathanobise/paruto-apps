const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const INDEX = new Map([...ALPHABET].map((c, i) => [c, i]));

export function base58Decode(input: string): Uint8Array | null {
  if (input.length === 0) return null;
  let n = 0n;
  for (const c of input) {
    const v = INDEX.get(c);
    if (v === undefined) return null;
    n = n * 58n + BigInt(v);
  }
  const bytes: number[] = [];
  while (n > 0n) {
    bytes.unshift(Number(n % 256n));
    n /= 256n;
  }
  for (const c of input) {
    if (c === '1') bytes.unshift(0);
    else break;
  }
  return new Uint8Array(bytes);
}

export function base58Encode(bytes: Uint8Array): string {
  let n = 0n;
  for (const b of bytes) n = n * 256n + BigInt(b);
  let out = '';
  while (n > 0n) {
    out = ALPHABET[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const b of bytes) {
    if (b === 0) out = '1' + out;
    else break;
  }
  return out;
}

/** A Solana address is base58 for exactly 32 bytes. Does not check that the account exists. */
export function isSolanaAddress(value: string): boolean {
  if (value.length < 32 || value.length > 44) return false;
  const decoded = base58Decode(value);
  return decoded !== null && decoded.length === 32;
}

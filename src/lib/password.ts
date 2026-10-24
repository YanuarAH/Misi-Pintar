import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

const KEY_LENGTH = 64;

function scryptAsync(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}
const PARAMS = { N: 16384, r: 8, p: 1 } as const;

/** Format: scrypt$N$r$p$salt(base64)$hash(base64) */
export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(secret.normalize("NFKC"), salt, KEY_LENGTH, PARAMS);
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

export async function verifySecret(secret: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltB64, hashB64] = parts;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(hashB64, "base64");
  if (!salt.length || !expected.length) return false;

  try {
    const derived = await scryptAsync(secret.normalize("NFKC"), salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

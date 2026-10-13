import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 32).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [algo, salt, hash] = stored.split(":");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const actual = scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

/** Pakai hash lama kalau password tidak diubah di form; kalau kosong/baru, hash ulang. */
export function resolvePasswordHash(
  id: string,
  password: string,
  previous: Map<string, string>,
) {
  if (!password) {
    return previous.get(id) ?? hashPassword(randomBytes(16).toString("hex"));
  }
  if (password.startsWith("scrypt:")) return password;
  return hashPassword(password);
}

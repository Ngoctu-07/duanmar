import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/auth/password-policy";

/**
 * Password hashing for the email/password credential store.
 *
 * `scrypt` ships with Node, so the auth rail needs no native dependency.
 * Current format: `scrypt$<salt hex>$<hash hex>`.
 *
 * Verification also accepts legacy rows so accounts created before the current
 * format can still sign in (the cause of "correct password, invalid
 * credentials" on older databases):
 *
 * - `scrypt$salt$hash` with any sane key length (older builds used 32 bytes);
 * - `scrypt:salt:hash` (colon variant);
 * - `salt$hash` / `salt:hash` (untagged scrypt);
 * - a bare 64-char hex SHA-256 digest (prototype format).
 *
 * Successful legacy logins are transparently re-hashed by `authenticate()`
 * (see `needsPasswordRehash`), so the weak formats disappear over time.
 */

const KEY_LENGTH = 64;
const SALT_BYTES = 16;
const PREFIX = "scrypt";
const MIN_KEY_BYTES = 16;
const MAX_KEY_BYTES = 128;
const HEX = /^[0-9a-f]+$/i;
const SHA256_HEX = /^[0-9a-f]{64}$/i;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${PREFIX}$${salt}$${hash}`;
}

type ParsedHash =
  | { scheme: "scrypt"; salt: string; hash: Buffer }
  | { scheme: "sha256"; hash: Buffer };

function parseHex(value: string): Buffer | null {
  if (!HEX.test(value) || value.length % 2 !== 0) return null;
  const bytes = value.length / 2;
  if (bytes < MIN_KEY_BYTES || bytes > MAX_KEY_BYTES) return null;
  return Buffer.from(value, "hex");
}

function parseStored(stored: string): ParsedHash | null {
  const trimmed = stored.trim();
  if (!trimmed) return null;

  const parts = trimmed.includes("$") ? trimmed.split("$") : trimmed.split(":");

  if (parts.length === 1) {
    return SHA256_HEX.test(trimmed)
      ? { scheme: "sha256", hash: Buffer.from(trimmed, "hex") }
      : null;
  }

  if (parts.length === 2) {
    const [salt, hashHex] = parts;
    const hash = parseHex(hashHex);
    if (!salt || salt.length < 8 || !HEX.test(salt) || !hash) return null;
    return { scheme: "scrypt", salt, hash };
  }

  if (parts.length === 3) {
    const [prefix, salt, hashHex] = parts;
    if (prefix.toLowerCase() !== PREFIX) return null;
    const hash = parseHex(hashHex);
    if (!salt || salt.length < 8 || !HEX.test(salt) || !hash) return null;
    return { scheme: "scrypt", salt, hash };
  }

  return null;
}

/** Constant-time comparison; malformed rows fail closed. */
export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (typeof stored !== "string") return false;
  const parsed = parseStored(stored);
  if (!parsed) return false;
  try {
    if (parsed.scheme === "sha256") {
      const actual = createHash("sha256").update(password).digest();
      return actual.length === parsed.hash.length && timingSafeEqual(actual, parsed.hash);
    }
    const actual = scryptSync(password, parsed.salt, parsed.hash.length);
    return timingSafeEqual(actual, parsed.hash);
  } catch {
    return false;
  }
}

/**
 * `true` when the row is not in the current `scrypt$32-hex-salt$128-hex`
 * format — `authenticate()` upgrades it after a successful login.
 */
export function needsPasswordRehash(stored: string | null | undefined): boolean {
  if (typeof stored !== "string") return true;
  const parts = stored.trim().split("$");
  if (parts.length !== 3) return true;
  const [prefix, salt, hash] = parts;
  return (
    prefix !== PREFIX ||
    salt.length !== SALT_BYTES * 2 ||
    hash.length !== KEY_LENGTH * 2 ||
    !HEX.test(salt) ||
    !HEX.test(hash)
  );
}

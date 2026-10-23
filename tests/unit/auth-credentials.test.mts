import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash, randomBytes, scryptSync } from "node:crypto";

/**
 * Credentials contract: normalization, legacy hash migration and the
 * register/login symmetry that broke "correct password, invalid credentials"
 * for accounts created before the current scrypt format.
 */
const dir = mkdtempSync(join(tmpdir(), "duanmar-credentials-"));
process.env.VN_INTERACTIONS_DB_PATH = join(dir, "test.db");

const {
  authenticate,
  createUser,
  findUserByEmail,
  updateUserPassword,
} = await import("../../src/lib/auth/user-store.ts");
const { getDb } = await import("../../src/lib/db/sqlite-store.ts");
const { hashPassword, verifyPassword, needsPasswordRehash } = await import(
  "../../src/lib/auth/password.ts"
);

let passed = 0;
let failed = 0;
const check = (name: string, fn: () => void) => {
  try {
    fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name} :: ${(error as Error).message}`);
  }
};

const db = getDb();
assert.ok(db, "test database unavailable");

const insertUser = (id: string, email: string, hash: string) => {
  db!
    .prepare(
      "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(id, email, "Legacy User", hash, new Date().toISOString());
};

const scryptHash = (password: string, keyLength: number, salt?: string) => {
  const actualSalt = salt ?? randomBytes(16).toString("hex");
  return `scrypt$${actualSalt}$${scryptSync(password, actualSalt, keyLength).toString("hex")}`;
};

/* --- registration → login --- */

check("a freshly registered user can sign in", () => {
  const created = createUser({
    email: "  Fresh.User@Example.COM ",
    name: "Fresh User",
    password: "correct horse battery",
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  assert.equal(created.user.email, "fresh.user@example.com");

  const user = authenticate("FRESH.USER@example.com", "correct horse battery");
  assert.ok(user);
  assert.equal(user?.email, "fresh.user@example.com");
});

check("wrong passwords are rejected", () => {
  assert.equal(authenticate("fresh.user@example.com", "wrong password"), null);
  assert.equal(authenticate("fresh.user@example.com", ""), null);
  assert.equal(authenticate("nobody@example.com", "whatever"), null);
});

check("duplicate registration is case-insensitive", () => {
  const duplicate = createUser({
    email: "FRESH.USER@example.com",
    name: "Impostor",
    password: "another password",
  });
  assert.deepEqual(duplicate, { ok: false, code: "duplicate" });
});

/* --- legacy hash formats --- */

check("legacy 32-byte scrypt rows authenticate (old key length)", () => {
  insertUser("legacy-32", "legacy32@example.com", scryptHash("passphrase-32", 32));
  const user = authenticate("legacy32@example.com", "passphrase-32");
  assert.ok(user, "legacy 32-byte scrypt should verify");

  const row = db!
    .prepare("SELECT password_hash FROM users WHERE id = ?")
    .get("legacy-32") as { password_hash: string };
  assert.equal(needsPasswordRehash(row.password_hash), false, "row should be upgraded");
  assert.match(row.password_hash, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  assert.equal(authenticate("legacy32@example.com", "passphrase-32")?.id, "legacy-32");
});

check("legacy untagged salt$hash rows authenticate", () => {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync("untagged-pass", salt, 64).toString("hex");
  insertUser("legacy-untagged", "untagged@example.com", `${salt}$${hash}`);
  assert.ok(authenticate("untagged@example.com", "untagged-pass"));
});

check("legacy SHA-256 prototype rows authenticate and upgrade", () => {
  const digest = createHash("sha256").update("prototype-pass").digest("hex");
  insertUser("legacy-sha", "sha@example.com", digest);
  assert.ok(authenticate("sha@example.com", "prototype-pass"), "sha256 should verify");
  const row = db!
    .prepare("SELECT password_hash FROM users WHERE id = ?")
    .get("legacy-sha") as { password_hash: string };
  assert.ok(row.password_hash.startsWith("scrypt$"), "upgraded to scrypt");
});

check("short legacy passwords still log in (no 8-char gate on sign-in)", () => {
  insertUser("legacy-short", "short@example.com", scryptHash("abc", 64));
  assert.ok(authenticate("short@example.com", "abc"));
});

check("malformed hashes fail closed", () => {
  for (const hash of ["", "scrypt$", "scrypt$zzzz$zzzz", "md5$abcd$ef01", "plaintext"]) {
    assert.equal(verifyPassword("whatever", hash), false, hash);
  }
});

check("mixed-case legacy emails are found and normalized after login", () => {
  insertUser("legacy-case", "Mixed.Case@Example.COM", scryptHash("case-pass", 64));
  const before = findUserByEmail("mixed.case@example.com");
  assert.equal(before?.id, "legacy-case");

  const user = authenticate("  MIXED.CASE@example.com  ", "case-pass");
  assert.equal(user?.email, "mixed.case@example.com");

  const row = db!
    .prepare("SELECT email FROM users WHERE id = ?")
    .get("legacy-case") as { email: string };
  assert.equal(row.email, "mixed.case@example.com");
});

/* --- password updates (recovery) --- */

check("updateUserPassword rotates the credential", () => {
  const created = createUser({
    email: "rotate@example.com",
    name: "Rotate User",
    password: "old-password-1",
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;

  assert.ok(updateUserPassword(created.user.id, "new-password-2"));
  assert.equal(authenticate("rotate@example.com", "old-password-1"), null);
  assert.ok(authenticate("rotate@example.com", "new-password-2"));

  const stored = db!
    .prepare("SELECT password_hash FROM users WHERE id = ?")
    .get(created.user.id) as { password_hash: string };
  assert.equal(needsPasswordRehash(stored.password_hash), false);
});

check("hashPassword is salted per call", () => {
  assert.notEqual(hashPassword("same-password"), hashPassword("same-password"));
});

try {
  rmSync(dir, { recursive: true, force: true });
} catch {
  // Windows keeps the SQLite handle open; the OS cleans the temp dir.
}

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);

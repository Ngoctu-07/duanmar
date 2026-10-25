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
delete process.env.TURSO_DATABASE_URL;

const {
  authenticate,
  createUser,
  findUserByEmail,
  updateUserPassword,
} = await import("../../src/lib/auth/user-store.ts");
const { getDb, queryRow, runStatement } = await import("../../src/lib/db/sqlite-store.ts");
const { hashPassword, verifyPassword, needsPasswordRehash } = await import(
  "../../src/lib/auth/password.ts"
);

let passed = 0;
let failed = 0;
const check = async (name: string, fn: () => Promise<void> | void) => {
  try {
    await fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name} :: ${(error as Error).message}`);
  }
};

const db = await getDb();
assert.ok(db, "test database unavailable");

const insertUser = async (id: string, email: string, hash: string) => {
  await runStatement(
    db!,
    "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
    [id, email, "Legacy User", hash, new Date().toISOString()]
  );
};

const hashOf = async (id: string) => {
  const row = await queryRow<{ password_hash: string }>(
    db!,
    "SELECT password_hash FROM users WHERE id = ?",
    [id]
  );
  return row?.password_hash ?? "";
};

const scryptHash = (password: string, keyLength: number, salt?: string) => {
  const actualSalt = salt ?? randomBytes(16).toString("hex");
  return `scrypt$${actualSalt}$${scryptSync(password, actualSalt, keyLength).toString("hex")}`;
};

/* --- registration → login --- */

await check("a freshly registered user can sign in", async () => {
  const created = await createUser({
    email: "  Fresh.User@Example.COM ",
    name: "Fresh User",
    password: "correct horse battery",
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  assert.equal(created.user.email, "fresh.user@example.com");

  const user = await authenticate("FRESH.USER@example.com", "correct horse battery");
  assert.ok(user);
  assert.equal(user?.email, "fresh.user@example.com");
});

await check("wrong passwords are rejected", async () => {
  assert.equal(await authenticate("fresh.user@example.com", "wrong password"), null);
  assert.equal(await authenticate("fresh.user@example.com", ""), null);
  assert.equal(await authenticate("nobody@example.com", "whatever"), null);
});

await check("duplicate registration is case-insensitive", async () => {
  const duplicate = await createUser({
    email: "FRESH.USER@example.com",
    name: "Impostor",
    password: "another password",
  });
  assert.deepEqual(duplicate, { ok: false, code: "duplicate" });
});

/* --- legacy hash formats --- */

await check("legacy 32-byte scrypt rows authenticate (old key length)", async () => {
  await insertUser("legacy-32", "legacy32@example.com", scryptHash("passphrase-32", 32));
  const user = await authenticate("legacy32@example.com", "passphrase-32");
  assert.ok(user, "legacy 32-byte scrypt should verify");

  const stored = await hashOf("legacy-32");
  assert.equal(needsPasswordRehash(stored), false, "row should be upgraded");
  assert.match(stored, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
  assert.equal((await authenticate("legacy32@example.com", "passphrase-32"))?.id, "legacy-32");
});

await check("legacy untagged salt$hash rows authenticate", async () => {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync("untagged-pass", salt, 64).toString("hex");
  await insertUser("legacy-untagged", "untagged@example.com", `${salt}$${hash}`);
  assert.ok(await authenticate("untagged@example.com", "untagged-pass"));
});

await check("legacy SHA-256 prototype rows authenticate and upgrade", async () => {
  const digest = createHash("sha256").update("prototype-pass").digest("hex");
  await insertUser("legacy-sha", "sha@example.com", digest);
  assert.ok(
    await authenticate("sha@example.com", "prototype-pass"),
    "sha256 should verify"
  );
  assert.ok((await hashOf("legacy-sha")).startsWith("scrypt$"), "upgraded to scrypt");
});

await check("short legacy passwords still log in (no 8-char gate on sign-in)", async () => {
  await insertUser("legacy-short", "short@example.com", scryptHash("abc", 64));
  assert.ok(await authenticate("short@example.com", "abc"));
});

await check("malformed hashes fail closed", () => {
  for (const hash of ["", "scrypt$", "scrypt$zzzz$zzzz", "md5$abcd$ef01", "plaintext"]) {
    assert.equal(verifyPassword("whatever", hash), false, hash);
  }
});

await check("mixed-case legacy emails are found and normalized after login", async () => {
  await insertUser("legacy-case", "Mixed.Case@Example.COM", scryptHash("case-pass", 64));
  const before = await findUserByEmail("mixed.case@example.com");
  assert.equal(before?.id, "legacy-case");

  const user = await authenticate("  MIXED.CASE@example.com  ", "case-pass");
  assert.equal(user?.email, "mixed.case@example.com");

  const row = await queryRow<{ email: string }>(
    db!,
    "SELECT email FROM users WHERE id = ?",
    ["legacy-case"]
  );
  assert.equal(row?.email, "mixed.case@example.com");
});

/* --- password updates (recovery) --- */

await check("updateUserPassword rotates the credential", async () => {
  const created = await createUser({
    email: "rotate@example.com",
    name: "Rotate User",
    password: "old-password-1",
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;

  assert.ok(await updateUserPassword(created.user.id, "new-password-2"));
  assert.equal(await authenticate("rotate@example.com", "old-password-1"), null);
  assert.ok(await authenticate("rotate@example.com", "new-password-2"));

  assert.equal(needsPasswordRehash(await hashOf(created.user.id)), false);
});

await check("hashPassword is salted per call", () => {
  assert.notEqual(hashPassword("same-password"), hashPassword("same-password"));
});

try {
  rmSync(dir, { recursive: true, force: true });
} catch {
  // Windows keeps the SQLite handle open; the OS cleans the temp dir.
}

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);

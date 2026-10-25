import { randomUUID } from "node:crypto";
import {
  getDb,
  queryRow,
  runStatement,
  withTransaction,
} from "@/lib/db/sqlite-store";
import {
  hashPassword,
  needsPasswordRehash,
  verifyPassword,
} from "@/lib/auth/password";

/**
 * SQLite-backed user store for the credentials provider (server only).
 *
 * Email is the unique key, normalized to lower case. `password_hash` is never
 * serialized — `StoredUser` rows stay inside this module and `PublicUser` is
 * the only shape handed to Auth.js / API responses.
 */

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  /** CMS `avatarPreset` document id, or null for the default placeholder. */
  avatarPresetId: string | null;
  /** Resolved CMS asset URL captured when the preset was saved. */
  avatarUrl: string | null;
}

interface StoredUser extends PublicUser {
  passwordHash: string;
  createdAt: string;
}

export type CreateUserResult =
  | { ok: true; user: PublicUser }
  | { ok: false; code: "duplicate" | "db_unavailable" };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email) && email.length <= 254;
}

function mapRow(row: Record<string, unknown>): StoredUser {
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    avatarPresetId: row.avatar_preset_id ? String(row.avatar_preset_id) : null,
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
    passwordHash: String(row.password_hash),
    createdAt: String(row.created_at),
  };
}

const SELECT_COLUMNS =
  "id, email, name, avatar_preset_id, avatar_url, password_hash, created_at";

/** Valid hash of an unguessable value — burned on unknown emails for timing parity. */
const DUMMY_HASH = hashPassword(randomUUID());

/**
 * Case-insensitive lookup: legacy rows (seeded demos, hand-edited DBs) may
 * still hold mixed-case emails, and those accounts must keep working.
 */
export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const db = await getDb();
  if (!db) return null;
  const row = await queryRow<Record<string, unknown>>(
    db,
    `SELECT ${SELECT_COLUMNS} FROM users WHERE lower(email) = ?`,
    [normalizeEmail(email)]
  );
  return row ? mapRow(row) : null;
}

export async function findUserById(id: string): Promise<PublicUser | null> {
  const db = await getDb();
  if (!db) return null;
  const row = await queryRow<Record<string, unknown>>(
    db,
    "SELECT id, email, name, avatar_preset_id, avatar_url FROM users WHERE id = ?",
    [id]
  );
  if (!row) return null;
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    avatarPresetId: row.avatar_preset_id ? String(row.avatar_preset_id) : null,
    avatarUrl: row.avatar_url ? String(row.avatar_url) : null,
  };
}

/**
 * Persists the selected CMS preset. Returns the refreshed public user, or
 * `null` when the row/storage is unavailable.
 */
export async function updateUserAvatar(
  id: string,
  avatar: { presetId: string | null; url: string | null }
): Promise<PublicUser | null> {
  const db = await getDb();
  if (!db) return null;
  const changes = await runStatement(
    db,
    "UPDATE users SET avatar_preset_id = ?, avatar_url = ? WHERE id = ?",
    [avatar.presetId, avatar.url, id]
  );
  if (changes === 0) return null;
  return findUserById(id);
}

/**
 * Creates a user with a scrypt hash. Duplicate emails resolve to a typed code
 * (never a thrown constraint error) so the route can answer 409.
 */
export async function createUser(input: {
  email: string;
  name: string;
  password: string;
}): Promise<CreateUserResult> {
  const email = normalizeEmail(input.email);

  // Explicit case-insensitive check: SQLite's UNIQUE index is byte-wise, so a
  // legacy `User@Example.com` row would otherwise let a duplicate slip in.
  if (await findUserByEmail(email)) return { ok: false, code: "duplicate" };

  const passwordHash = hashPassword(input.password);
  const user: PublicUser = {
    id: randomUUID(),
    email,
    name: input.name.trim(),
    avatarPresetId: null,
    avatarUrl: null,
  };

  try {
    await withTransaction(async (db) => {
      await runStatement(
        db,
        "INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
        [user.id, user.email, user.name, passwordHash, new Date().toISOString()]
      );
    });
    return { ok: true, user };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/UNIQUE constraint failed/i.test(message)) {
      return { ok: false, code: "duplicate" };
    }
    return { ok: false, code: "db_unavailable" };
  }
}

/**
 * Overwrites the credentials hash (password recovery). Returns `false` when the
 * row or the database is unavailable.
 */
export async function updateUserPassword(id: string, password: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const changes = await runStatement(db, "UPDATE users SET password_hash = ? WHERE id = ?", [
    hashPassword(password),
    id,
  ]);
  return changes > 0;
}

/** Credentials check used by Auth.js `authorize`; `null` = reject. */
export async function authenticate(
  email: string,
  password: string
): Promise<PublicUser | null> {
  if (!email || !password) return null;
  const normalized = normalizeEmail(email);
  const user = await findUserByEmail(normalized);
  if (!user) {
    // Still burn a hash so unknown emails do not answer measurably faster.
    verifyPassword(password, DUMMY_HASH);
    return null;
  }
  if (!verifyPassword(password, user.passwordHash)) return null;

  // Successful legacy login → transparently migrate to the current format.
  // Without this, old rows (shorter scrypt keys / SHA-256 prototypes) keep
  // failing on every sign-in.
  if (needsPasswordRehash(user.passwordHash)) {
    await updateUserPassword(user.id, password);
  }

  // Repair mixed-case rows once the owner proves they own the account. A legacy
  // case-only duplicate would violate the UNIQUE index, so never let the repair
  // break a valid login.
  if (user.email !== normalized) {
    try {
      const db = await getDb();
      const clash = db
        ? await queryRow(
            db,
            "SELECT 1 FROM users WHERE lower(email) = ? AND id <> ? LIMIT 1",
            [normalized, user.id]
          )
        : null;
      if (!clash && db) {
        await runStatement(db, "UPDATE users SET email = ? WHERE id = ?", [normalized, user.id]);
      }
    } catch {
      // Best effort.
    }
  }

  return {
    id: user.id,
    email: normalized,
    name: user.name,
    avatarPresetId: user.avatarPresetId,
    avatarUrl: user.avatarUrl,
  };
}

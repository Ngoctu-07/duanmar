import { existsSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

/**
 * Browser-test DB helper.
 *
 * `next dev` loads `.env.local`, so a test that cleans up through a hard-coded
 * `data/article-likes.db` silently misses a Turso-backed dev server. This
 * helper mirrors the app's own precedence: `.env.local` (then process env)
 * selects Turso when configured, otherwise the local SQLite file.
 */

const LOCAL_DB = "data/article-likes.db";

function loadEnvLocal() {
  const path = new URL("../../.env.local", import.meta.url);
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

function remoteConfig() {
  const env = loadEnvLocal();
  const url = (env.TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL || "").trim();
  const authToken = (env.TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || "").trim();
  return { url, authToken: authToken || undefined };
}

async function withDatabase(run) {
  const { url, authToken } = remoteConfig();
  if (url) {
    const { createClient } = await import("@libsql/client");
    const client = createClient({ url, authToken });
    try {
      return await run(client);
    } finally {
      client.close();
    }
  }
  const db = new DatabaseSync(LOCAL_DB);
  db.exec("PRAGMA busy_timeout = 5000");
  try {
    return await run(db);
  } finally {
    db.close();
  }
}

/** SQLite (node:sqlite) + libsql expose different APIs; keep the two paths tiny. */
async function findUserId(handle, email) {
  if (handle.prepare) {
    return handle.prepare("SELECT id FROM users WHERE email = ?").get(email)?.id ?? null;
  }
  const result = await handle.execute({
    sql: "SELECT id FROM users WHERE email = ?",
    args: [email],
  });
  return result.rows[0]?.id ?? null;
}

async function runSql(handle, sql, args) {
  if (handle.prepare) {
    handle.prepare(sql).run(...args);
    return;
  }
  await handle.execute({ sql, args });
}

async function queryOne(handle, sql, args) {
  if (handle.prepare) {
    return handle.prepare(sql).get(...args) ?? null;
  }
  const result = await handle.execute({ sql, args });
  return result.rows[0] ?? null;
}

/**
 * Insert a raw wallet row for a throwaway test user. Used to simulate a claim
 * whose master promotion was later deleted (orphan) next to a still-live one.
 */
export async function insertVoucherForEmail(email, voucher) {
  await withDatabase(async (handle) => {
    const userId = await findUserId(handle, email);
    if (!userId) throw new Error(`test user not found: ${email}`);
    await runSql(
      handle,
      "INSERT INTO vouchers (id, user_id, promotion_id, code, title, description, " +
        "price, original_price, badge, valid_until, tour_slug, claimed_at) " +
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        voucher.id,
        userId,
        voucher.promotionId,
        voucher.code,
        voucher.title,
        voucher.description ?? "",
        voucher.price ?? null,
        voucher.originalPrice ?? null,
        voucher.badge ?? null,
        voucher.validUntil ?? null,
        voucher.tourSlug ?? null,
        voucher.claimedAt,
      ]
    );
  });
}

/** Count a user's wallet rows for one promotion (orphan purge assertions). */
export async function countVoucherRowsForEmail(email, promotionId) {
  return withDatabase(async (handle) => {
    const userId = await findUserId(handle, email);
    if (!userId) return 0;
    const row = await queryOne(
      handle,
      "SELECT COUNT(*) AS n FROM vouchers WHERE user_id = ? AND promotion_id = ?",
      [userId, promotionId]
    );
    return Number(row?.n ?? 0);
  });
}

/** Empty a throwaway test user's wallet (keeps the signed-in session valid). */
export async function deleteVouchersForEmail(email) {
  await withDatabase(async (handle) => {
    const userId = await findUserId(handle, email);
    if (!userId) return;
    await runSql(handle, "DELETE FROM vouchers WHERE user_id = ?", [userId]);
  });
}

/** Remove the throwaway user and its wallet rows. Best effort. */
export async function deleteUserByEmail(email) {
  await withDatabase(async (handle) => {
    const userId = await findUserId(handle, email);
    if (!userId) return;
    await runSql(handle, "DELETE FROM vouchers WHERE user_id = ?", [userId]);
    await runSql(handle, "DELETE FROM users WHERE id = ?", [userId]);
  });
}

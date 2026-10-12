# Phase 01 — Foundation: shared SQLite store, visitor identity, IP helper

## Context Links
- `src/lib/article-likes-db.ts` (current owner of path/cached connection/DDL/degrade)
- `src/lib/assistant/rate-limit.ts` (`checkRateLimit`/`resetRateLimit`), `src/app/api/assistant/route.ts:26-35` (`resolveClientKey`)
- `src/middleware.ts` (next-intl only, matcher `["/", "/(en|vi)/:path*"]` — does not cover `/api`)
- Existing DB: `data/article-likes.db` with table `likes(slug TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0)`
- Tests pattern: `tests/unit/article-likes.test.mts` (temp dir env override + `?query` fresh-module import for degrade path)

## Overview
- **Priority**: P0 (blocks phases 02-05)
- **Status**: Not started
- **Description**: Extract a single shared `node:sqlite` connection module with idempotent migrations (existing `likes` table preserved), add anonymous visitor cookie helpers, extract the IP resolution helper for reuse.

## Key Insights
- `node:sqlite` `DatabaseSync` gives real transactions (`BEGIN IMMEDIATE` / `COMMIT` / `ROLLBACK` via `exec`) — required for atomic toggle in phase 02.
- Existing env var `ARTICLE_LIKES_DB_PATH` is already used by tests/docs → new path var must **fall back** to it (back-compat).
- Cookie issuance: RSC `cookies()` is read-only in App Router → issuance must happen in route handlers (`NextResponse.json` exposes `.cookies`); plain `Response.json` does not.
- Read-only FS must degrade exactly like today: connection creation fails → `getDb()` returns `null` → reads return empty maps, writes throw `db unavailable` (routes → 503).
- Module-level `cached` connection is re-created per fresh import instance (test isolation trick) — keep that behavior.

## Requirements
### Functional
- [ ] `src/lib/db/sqlite-store.ts`: path resolution, cached connection, idempotent DDL for all tables (`likes`, `like_votes`, `reviews`), `busy_timeout`, `getDb(): DatabaseSync | null`, `withTransaction(fn)`.
- [ ] `src/lib/visitor.ts`: `VISITOR_COOKIE`, UUID v4 generation (`crypto.randomUUID()`), strict validation regex (v4 shape), cookie options, read-from-`NextRequest`, read-from-`cookies()` store, issue-onto-`NextResponse`.
- [ ] `src/lib/request-ip.ts`: move `resolveClientKey` out of the assistant route with identical semantics; assistant route imports it (behavior unchanged).
- [ ] Repoint `src/lib/article-likes-db.ts` at the shared store without changing its public API (phase 02 extends it).

### Non-functional
- Files <200 LOC, kebab-case; no new copies of existing files; no fake data.
- DDL idempotent against an on-disk DB created by plan 260929-2254.

## Architecture
```
route handlers ──► visitor.ts (read/issue vn_visitor)
      │
      ▼
reviews-db.ts / article-likes-db.ts ──► db/sqlite-store.ts ──► data/article-likes.db
RSC pages ──► cookies() ──► visitor.ts (validate only)
```

## Related Code Files
**Create**
- `src/lib/db/sqlite-store.ts` (~95 LOC)
- `src/lib/visitor.ts` (~70 LOC)
- `src/lib/request-ip.ts` (~30 LOC)
- `tests/unit/sqlite-store.test.mts`, `tests/unit/visitor.test.mts`

**Modify**
- `src/lib/assistant/route.ts` (import `resolveClientKey`, delete inline copy)
- `src/lib/article-likes-db.ts` (use `getDb()` from store; keep exports)

**Delete**: none

## Implementation Steps
1. Create `src/lib/db/sqlite-store.ts`:
   - `dbPath()` = `process.env.VN_INTERACTIONS_DB_PATH ?? process.env.ARTICLE_LIKES_DB_PATH ?? join(process.cwd(), "data", "article-likes.db")`
   - `getDb()`: `mkdirSync(dirname)` → `new DatabaseSync(path)` → `exec("PRAGMA busy_timeout = 5000")` → run DDL (below) → cache; on any error set `failed = true`, log once, return `null`.
   - `withTransaction(db, fn)`: `BEGIN IMMEDIATE` → `fn()` → `COMMIT`; throw → `ROLLBACK` → rethrow.
2. DDL (all `IF NOT EXISTS`, executed on every open):
   ```sql
   CREATE TABLE IF NOT EXISTS likes (slug TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0);
   CREATE TABLE IF NOT EXISTS like_votes (
     slug TEXT NOT NULL, visitor TEXT NOT NULL, created_at TEXT NOT NULL,
     PRIMARY KEY (slug, visitor)
   ) WITHOUT ROWID;
   CREATE INDEX IF NOT EXISTS idx_like_votes_visitor ON like_votes(visitor);
   CREATE TABLE IF NOT EXISTS reviews (
     reference TEXT PRIMARY KEY,
     tour_slug TEXT NOT NULL,
     booking_reference TEXT NOT NULL,
     visitor TEXT NOT NULL,
     author_name TEXT NOT NULL,
     author_email TEXT NOT NULL,
     rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
     comment TEXT NOT NULL,
     images TEXT NOT NULL DEFAULT '[]',
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   );
   CREATE INDEX IF NOT EXISTS idx_reviews_tour_created ON reviews(tour_slug, created_at DESC);
   ```
   Future column adds must be guarded with `PRAGMA table_info(...)` checks (document in file header comment).
3. Create `src/lib/visitor.ts`: `isValidVisitor(v)` (regex `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`), `newVisitorId()`, `visitorCookieOptions()` (`httpOnly:true, sameSite:"lax", secure: process.env.NODE_ENV === "production", path:"/", maxAge: 31_536_000`), `readVisitor(request | cookieStore)`, `issueVisitor(response)` → returns id and sets cookie only when absent/invalid.
4. Create `src/lib/request-ip.ts` with `resolveClientKey(req: NextRequest): string` (x-real-ip → rightmost x-forwarded-for → `"local"`); update assistant route import; confirm `docs/ai-assistant.md` wording still accurate (it documents the trust assumption, not the file).
5. Repoint `article-likes-db.ts` internals to `getDb()` from the store (public functions unchanged so existing unit tests keep passing).
6. Write unit tests (temp DB path + fresh-import degrade path, mirroring `article-likes.test.mts`).

## Todo List
- [ ] `src/lib/db/sqlite-store.ts` + DDL + `withTransaction`
- [ ] `src/lib/visitor.ts`
- [ ] `src/lib/request-ip.ts` + assistant route import swap
- [ ] `src/lib/article-likes-db.ts` repoint (no API change)
- [ ] `tests/unit/sqlite-store.test.mts` (legacy `likes` file opens cleanly → all tables exist; idempotent second open; ENOTDIR degrade)
- [ ] `tests/unit/visitor.test.mts` (v4 format, dev/prod `secure`, invalid values rejected, cookie options)
- [ ] `npm test` green (existing 30+ files still pass)

## Success Criteria
- Existing `data/article-likes.db` opens without error and gains new tables; no data loss.
- `getArticleLikeCounts` / `incrementArticleLike` behavior identical (existing `article-likes.test.mts` passes untouched).
- Read-only path → `getDb()` null → all readers degrade, writers throw `db unavailable`.
- `npm test` passes; `npx tsc --noEmit` clean.

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Two connections to one file (dev server + tests) | Medium | single cached connection per module instance + `busy_timeout=5000` |
| Migration fails on legacy DB shape | High | only additive `IF NOT EXISTS` DDL; open legacy file in a test first |
| Cookie never issued (API never called) | Low | reads validate-or-null; default `isLiked=false`/`owned=false` is correct for a first visit |

## Security Considerations
- Visitor id is opaque, HttpOnly, 1-year, Lax — never logged, never returned in JSON bodies.
- Strict v4 validation before any DB use (prevents junk keys / log noise).
- No secrets in code; DB path stays gitignored (`data/`).

## Next Steps
→ `phase-02-global-persistent-likes.md`

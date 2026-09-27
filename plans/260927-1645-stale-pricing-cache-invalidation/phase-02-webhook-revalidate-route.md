# Phase 02 — `POST /api/revalidate` webhook route

Context: `plan.md` root cause 3; depends on phase 01 (tags must exist).
Priority: P0 · Status: **done** (approved 2026-09-27)

## Overview

Server route that Sanity calls on publish; verifies HMAC signature, then invalidates caches.

## Key insights

- `next-sanity@11` ships `next-sanity/webhook` → `parseBody(req, secret, waitForConsistency?)`
  returns `{ isValidSignature, body }` and waits for Content Lake eventual consistency
  (verified `node_modules/next-sanity/dist/webhook/index.d.ts`).
- `revalidateTag` + `revalidatePath` exist in `next/cache` (next@16.3.6).

## Requirements

- FR1: `POST` only (GET → 405).
- FR2: no `SANITY_REVALIDATE_SECRET` → **503** with generic JSON (never a stack/echo).
- FR3: bad/missing signature → **401** (do not echo body, do not distinguish missing vs wrong).
- FR4: valid → `revalidateTag("sanity")` + `revalidatePath("/", "layout")` → **200**
  `{ revalidated: true, time: <iso> }`.
- FR5: zero secrets in logs; no body logging.
- FR6: fail-safe: cache ops wrapped so a revalidate error still returns 200? — **No**:
  return 500 so Sanity webhook UI shows failures (retries visible).

## Related code files

- **Create** `src/app/api/revalidate/route.ts` (~40 lines, kebab-case, <200 lines ✓)

## Implementation steps

1. Read `node_modules/next-sanity/dist/webhook/index.js` to confirm `parseBody` behavior
   (signature compare, default eventual-consistency wait) — needed verbatim for phase 04 tests.
2. Route handler per FR1–FR6; `export const runtime = "nodejs"`.
3. `tsc` + `lint`.

## Todo list

- [ ] route.ts created (401/503/200/500 paths)
- [ ] 405 on GET
- [ ] tsc/lint green

## Success criteria

- curl matrix (phase 04): no header → 401, forged HMAC → 401, valid HMAC → 200
  `{ revalidated: true }`, secret unset (separate process) → 503.

## Security considerations

- HMAC-SHA256 compare delegated to `parseBody` (constant-time in next-sanity).
- Secret only from env; generic error bodies; no CORS (server-to-server, POST).
- Route is un-authenticated-by-role — signature is the only gate ⇒ secret must be ≥32 random chars.

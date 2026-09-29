# Phase 01 — Lib + Time Foundation (edit-window, isMyReview, /api/server-time)

## Context Links
- Plan: `plan.md` P1 · Research: `research/research-summary.md` §1 (createdAt overwrite, events), §2 (ownership predicate), §3 (server clock, fail-closed), §7 (decisions 1–3)
- Files: NEW `src/lib/edit-window.ts`, `src/app/api/server-time/route.ts`, `tests/unit/edit-window.test.ts`; MODIFY `src/lib/reviews.ts` (167 ln), `tests/unit/reviews.test.ts`

## Overview
- Priority: high · Status: pending · Progress: 0% · Est: 0.5 day · Depends on: —
- Pure time helpers + tiny server-time endpoint + device-local ownership helper + `createdAt` preservation inside `saveReview`, each shipped WITH its unit tests. Every later phase (menu gate, form gate, tests) builds on exactly these three primitives.

## Key Insights
- **Gate is vacuous without preservation**: `write-review-form.tsx:96` stamps `createdAt: new Date().toISOString()` on every submit and `saveReview` writes the incoming object as-is (`reviews.ts:70-85`) → each edit would restart the 3h clock. Fix at the single choke point (`saveReview`), not in the form (research §1).
- `listBookings` is already imported (`reviews.ts:1`); `hasBookingForSlug` (`:125-127`) is slug-level → add sibling `isMyReview` matching `bookingReference`, mirroring the SSR guard at `:55` (`typeof window === "undefined" → false`). Note `listBookings()` itself is try/catch-safe (`booking-history.ts:58-70`) but keep the explicit guard for clarity + unit tests that delete `window`.
- **No server-time mechanism exists** (research §3): `revalidate` needs HMAC, `contact` only logs time. Precedent for a trivial route: `api/contact/route.ts:8` (`runtime = "nodejs"`), `:52` (GET handler shape).
- **Static-prerender hazard**: a GET route handler can be emitted as a static (`○`) route by `next build` → frozen build timestamp → every review instantly "expired". Mitigation: `export const dynamic = "force-dynamic"` (1 line) + verify route table shows `ƒ`.
- **Boundary**: `now - created >= windowMs` → 3h00 exactly = expired, 2h59 = fresh (test spec); injectable `windowMs` avoids fake timers; local `check()` harness pattern from `reviews.test.ts:16-27` (`node:assert/strict`, final `N passed, M failed` + `process.exit(1)`).
- **Fail-closed** (research §3, precedent `booking-validation.ts:76`): `fetchServerNow()` returns `null` on non-2xx / bad JSON / non-ISO `time` / thrown fetch → callers treat `null` as expired.
- LOC budget: `reviews.ts` 167 → est. ~177 (<200); new files est. 35 / 12 / 75 ln.

## Requirements
**Functional**
1. NEW `src/lib/edit-window.ts` (~35 ln, no React/DOM imports): `export const EDIT_WINDOW_MS = 3 * 60 * 60 * 1000;` · `export function isEditWindowExpired(createdAtIso: string, serverNowIso: string, windowMs: number = EDIT_WINDOW_MS): boolean` — `Date.parse` both sides; either `NaN` → `true`; else `(now - created) >= windowMs` · `export async function fetchServerNow(): Promise<string | null>` — `fetch("/api/server-time")`, `!response.ok → null`, `await response.json()` in try/catch, accept only `typeof time === "string" && !Number.isNaN(Date.parse(time))` else `null`, catch → `null`. Short JSDoc on each export.
2. `src/lib/reviews.ts` — `saveReview` (`:70-85`): read once (`const all = listReviews()`), `const existing = all.find(e => e.reference === review.reference)`, write `const record = existing ? { ...review, createdAt: existing.createdAt } : review`, filter `current` from `all`, `JSON.stringify([record, ...current])`. Insert path keeps incoming `createdAt`.
3. `src/lib/reviews.ts` — add AFTER `hasBookingForSlug` (`:125-127`): `export function isMyReview(review: TourReview): boolean` with doc comment "Device-local ownership: true when this device holds the booking the review was left for (UX affordance, not a security boundary)." — `if (typeof window === "undefined") return false; return listBookings().some((b) => b.reference === review.bookingReference);`
4. NEW `src/app/api/server-time/route.ts` (~12 ln): `export const runtime = "nodejs";` · `export const dynamic = "force-dynamic";` · `export async function GET() { return Response.json({ time: new Date().toISOString() }); }` — nothing else (Next auto-405s other methods), no params, no DB, no headers.
5. NEW `tests/unit/edit-window.test.ts` (~75 ln, import style `../../src/lib/edit-window.ts`, local `check()` copy of `reviews.test.ts:16-27`): (a) `EDIT_WINDOW_MS === 10_800_000`; (b) created `00:00:00.000Z` + now `02:59:00.000Z` → `false`; (c) now `03:00:00.000Z` → `true`; (d) now `03:01:00.000Z` → `true`; (e) `created = "not-a-date"` → `true`; (f) `now = "nope"` → `true`; (g) injectable `windowMs = 1000` with 999ms diff → `false`, 1000ms → `true`; (h) `fetchServerNow` with stubbed `globalThis.fetch` (restore in `finally`): 200 + `{time: ISO}` → that ISO; 500 → `null`; 200 + `{time: 123}` → `null`; 200 + `{}` → `null`; throwing `fetch` → `null`.
6. Extend `tests/unit/reviews.test.ts` (+2 checks, reuses `stubWindow` `:48-68` + `review()` factory `:29-40` + bookings fixture shape `:126-142`): (i) **upsert preserves createdAt**: save with `createdAt "2026-09-01T00:00:00.000Z"` rating 4 → save same `reference` with `createdAt "2026-09-28T12:00:00.000Z"` rating 5 → stored record keeps `2026-09-01…` AND rating 5; a different `reference` insert keeps its own fresh `createdAt`; (j) **isMyReview**: booking `VN-1` in `BOOKINGS_STORAGE_KEY` → `isMyReview(review({bookingReference:"VN-1"})) === true`, `bookingReference:"VN-9"` → `false`, `delete window` → `false`.

**Non-functional**: every file <200 LOC · lib is DOM-free/pure (runs under plain `npx tsx`) · no new deps, no zod · no product UI touched this phase · theme rules N/A (no UI).

## Related Code Files
**Tạo**: `src/lib/edit-window.ts`, `src/app/api/server-time/route.ts`, `tests/unit/edit-window.test.ts`
**Sửa**: `src/lib/reviews.ts` (`saveReview` `:70-85`, + `isMyReview` after `:127`, 167 → ~177 ln), `tests/unit/reviews.test.ts` (+2 checks → 14 total)
**Không sửa**: `write-review-form.tsx` (its `:96` stamp stays — preservation happens in the lib), `booking-history.ts` (import from only), any component, `src/messages/*`, `tests/browser/*`, `package.json`

## Implementation Steps
1. Create `src/lib/edit-window.ts` (const + two functions per Functional 1).
2. Patch `saveReview` per Functional 2 (keep `notifyChanged()` + `return true/false` contract untouched — `reviews.test.ts:188-226` must stay green).
3. Add `isMyReview` per Functional 3.
4. Create `src/app/api/server-time/route.ts` per Functional 4.
5. Extend `reviews.test.ts` (+2) and create `edit-window.test.ts` (cases a–h).
6. Verify (commands below), then P2 may consume the helpers.

## Todo List
- [ ] `src/lib/edit-window.ts` (`EDIT_WINDOW_MS`, `isEditWindowExpired`, `fetchServerNow`)
- [ ] `saveReview` preserves existing `createdAt` on upsert
- [ ] `isMyReview(review)` in `src/lib/reviews.ts` (file stays <200 LOC)
- [ ] `GET /api/server-time` (`runtime="nodejs"` + `dynamic="force-dynamic"`)
- [ ] `tests/unit/edit-window.test.ts` (boundaries + fail-closed fetch)
- [ ] `tests/unit/reviews.test.ts` +2 checks (createdAt, isMyReview)
- [ ] Verify: `npm run lint` · `npm test` · `npm run build` · curl `/api/server-time`

## Success Criteria
- `npm run lint` → 0 errors · `npm test` → **`14/14 files passed`** (was 13/13; +`edit-window.test.ts`; `i18n-parity` still green) · `npm run build` → exit 0.
- `npx tsx tests/unit/edit-window.test.ts` → `N passed, 0 failed` (N ≥ 8 — one `check()` per lettered case a–h) · `npx tsx tests/unit/reviews.test.ts` → `14 passed, 0 failed`.
- `grep -n "export function isMyReview" src/lib/reviews.ts` → 1 hit after line 127 · `grep -n "createdAt: existing.createdAt" src/lib/reviews.ts` → 1 hit inside `saveReview`.
- `wc -l src/lib/reviews.ts src/lib/edit-window.ts src/app/api/server-time/route.ts` → all <200 (reviews ≈177, edit-window ≈35, route ≈12).
- Build route table contains `/api/server-time` marked **`ƒ` (Dynamic)**, not `○`: `npm run build 2>&1 | grep -E "server-time|api/server"` → row with `ƒ`.
- Dev server (:3000): `curl -s localhost:3000/api/server-time` → `{"time":"2026-09-28T…Z"}` (ISO parses, within ±5 min of `date -u`); running it twice 1s apart yields **different** (increasing) times → proves not frozen; `curl -s -o /dev/null -w "%{http_code}" -X POST localhost:3000/api/server-time` → **405**.
- No UI change: `git status --porcelain` shows only the 6 allow-listed files for this phase; `grep -E "#[0-9a-fA-F]{3}|red-" src/lib/edit-window.ts src/app/api/server-time/route.ts` → 0.

## Risk Assessment
- **R1 static GET route** freezes time at build → `dynamic = "force-dynamic"` + route-table `ƒ` check + dual-curl check (all in Success Criteria).
- **R2 boundary off-by-one** (`>` vs `>=`) → spec `>=` (3h00 expired) with an exact-boundary test case.
- **R3 preservation resurrects wrong data** → only matched by identical `reference`; delete→recreate takes the insert path (fresh `createdAt`); covered by test (i).
- **R4 `isMyReview` throws on SSR/unit** → explicit `typeof window` guard; `listBookings` already try/catch-safe.
- **R5 `saveReview` contract drift** breaks 3 existing tests (`reviews.test.ts:188-226`) → run `npm test` immediately after the edit.
- **R6 LOC creep on `reviews.ts`** → `wc -l` asserted in Success Criteria.

## Security Considerations
- `/api/server-time` exposes only the server's UTC instant (no auth, no PII, no DB, no inputs) → no injection/parse surface; read-only GET; nothing cached (`force-dynamic`).
- `isMyReview` is a **device-local UX affordance, not authorization** — localStorage is user-forgeable and there is no server data to protect (research §2); stated in the JSDoc + changelog so nobody mistakes it for security.
- No secrets/env reads, no new dependencies, no network calls beyond same-origin `/api/server-time`.

## Next Steps
- P2 uses `fetchServerNow` + `isEditWindowExpired` (menu open) and `isMyReview` (ownership) — endpoint must answer on :3000 before P2 DOM probes.
- P3 reuses both helpers via `use-edit-window-gate.ts`; P4 unit-tests anything missed.

## Decisions already made
Fail-closed on fetch/parse failure · `>=` boundary (3h00 = expired) · preservation inside `saveReview` (not the form layer) · `force-dynamic` + no extra cache headers · `isMyReview` keys off `bookingReference` (never string-split `reference`) · unit tests ship WITH their lib in P1 (P4 only re-runs the suite + adds gaps).

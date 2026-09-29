# Phase 4: Tests + Verification

## Context Links
- Plan: `plan.md` P4 · Research: `research/research-summary.md` §5-6
- Files: `tests/unit/reviews.test.ts`, `tests/browser/g-reviews.mjs` (new); harnesses: `tests/run-unit.mjs`, `tests/run-browser.mjs`, `tests/browser/h4-p4-e2e.mjs:164-231`, `tests/browser/c-booking.mjs:1-45`
- Depends on: Phases 1-3 (code complete)

## Overview
- Priority: high · Status: pending · Progress: 0% · Est: 0.5 day
- Lock behavior with unit tests (pure lib + storage via fake `window`) and one browser E2E (gating, submit, persistence, badge), then run the full pipeline + manual checklist.

## Key Insights
- Unit tests import `src/lib/reviews.ts` **directly** (pattern `booking-logic.test.ts:1-22`: `node:assert/strict` + local `check()`, run by `npx tsx`); lib must guard `typeof window === "undefined"` so Node import works and **no `needsCssStub` entry** is required (no component/CSS import).
- `window.localStorage` stubbed per test (plain object with `getItem/setItem/removeItem`) — lets us assert upsert dedupe, quota failure → `false`, and SSR `[]`.
- Browser harness ready-made: eligibility probe = `h4-p4-e2e.mjs:164-197` (seeds `vn-my-trips:v1`, reloads) and cleanup = `:220-231`; test file pattern = `c-booking.mjs` (`getBrowser/getPage`, `check()`, screenshots → `tests/.output`, non-zero exit on FAIL).
- `npm run test:browser` runs **every** `tests/browser/*.mjs` → g-reviews must clean up its probe + review so other files stay green.

## Architecture
```
npm test ─▶ run-unit.mjs ─▶ reviews.test.ts (pure + stubbed window)   [lib contract]
                          └▶ i18n-parity.test.ts                      [14 keys en↔vi]
npm run test:browser ─▶ run-browser.mjs (requires :3000) ─▶ g-reviews.mjs
   R1 clean state (0 reviews) → R2 disabled form → R3 seed booking → R4 enabled
   → R5 submit → R6 badge + card → R7 reload persists → R8 upsert (1 review)
   → R9 image data:image/jpeg → R10 cleanup
```

## Requirements
**Functional — `tests/unit/reviews.test.ts` (~150 lines)**
1. `isReview`: accepts full valid record; rejects missing field, `rating: 0 | 6 | 2.5`, non-array `images`, non-string `createdAt`.
2. `formatRating`: `3.5→"3.5"`, `4→"4.0"`, `4.25→"4.3"`, `2.96→"3.0"`.
3. `getAggregate`: `[]`→`null` (binding: badge hidden); filters by `tourSlug` (other-slug reviews excluded); avg arithmetic across 2-3 reviews; `count` correct.
4. `reviewsForSlug`: filters + sorts `createdAt` desc.
5. `hasBookingForSlug`: true/false, empty list false.
6. `listReviews()` without `window` → `[]`; corrupt JSON → `[]`; non-array → `[]`; invalid entries filtered via `isReview`.
7. `saveReview` (stub window): insert 2 different `${reference}:${tourSlug}` → 2 records; **same key twice → 1 record (upsert), latest rating wins**; `setItem` throwing (quota) → returns `false` and list unchanged.
8. `deleteReview`: removes only target, no-op otherwise.

**Functional — `tests/browser/g-reviews.mjs` (~180 lines, dev server :3000, URL `/vi/explore/destinations/hcm`)**
1. Clean slate: `localStorage.removeItem("vn-reviews:v1")` → reload → no `[data-testid="tour-rating-badge"]`; "Customer Reviews" + empty state visible; section sits below price block.
2. Gating (no booking): form wrapper `[aria-disabled="true"]` exists; `pointer-events` is `none`; clicking submit/star/textarea changes nothing; `writeReviewHint` shown only after hydration (no pre-load flash: assert hint absent immediately on `domcontentloaded`, present after `networkidle2`).
3. Seed probe booking `VN-G-REVIEWS` slug `hcm` (`h4-p4-e2e.mjs:164-197` payload shape) → reload → `aria-disabled` gone, hint hidden, controls enabled.
4. Submit: click 4th star (`aria-pressed` true), fill comment, `setInputFiles` a generated tiny PNG (`tests/.output/review-fixture.png`, written by the test from a 1×1 base64 buffer) → wait `review-card`; assert author = probe `fullName`, 4 filled stars, comment text, 1 thumb.
5. Badge: `[data-testid="tour-rating-badge"]` now exists, text `4.0 ★`, classList contains `text-primary`.
6. Persistence: `page.reload()` → card + badge still present (localStorage).
7. Upsert: submit again with 5th star + new comment → still **1** `review-card`, rating now 5.0.
8. Image constraint: record in `vn-reviews:v1` has `images.length ≤ 3` and `images[0].startsWith("data:image/jpeg")`.
9. Cleanup: remove review by reference + probe by reference (`:220-231` pattern) → reload → back to empty state + disabled form; screenshots `tests/.output/g-reviews-*.png`.
10. Exit non-zero if any `check()` failed.

**Verification pipeline**: `npm run lint` → `npm test` → `npm run build` → `npm run dev` + `npm run test:browser` → manual `http://localhost:3000/vi` (badges on cards: homepage featured, destinations list, map, my-trips) and `/vi/explore/destinations/hcm`.

## Related Code Files
**Tạo**: `tests/unit/reviews.test.ts`, `tests/browser/g-reviews.mjs`
**Không sửa**: `tests/run-unit.mjs` (no `needsCssStub` — tests import lib only), `run-browser.mjs`, existing tests, source files (fixes belong to earlier phases)

## Implementation Steps
1. `reviews.test.ts`: local `check()` harness + `stubWindow()` helper (install fake `localStorage`, restore in `finally`); write 8 groups above; assertions via `node:assert/strict`.
2. `g-reviews.mjs`: copy `c-booking.mjs` skeleton (OUT dir, browser lib import, `check()`, `page.on("pageerror")`), implement R1-R10, fixture PNG write, probe seed/cleanup helpers (shared `seedBooking`/`cleanup` funcs to avoid duplication).
3. Run pipeline in order; fix failures in the owning phase file (not by weakening tests — no mocks/cheats).
4. Manual checklist (both locales `/vi` + `/en` for i18n spot check; 375px width for layout risks).
5. Update docs (`docs/project-changelog.md`, `docs/development-roadmap.md`) + report to `plans/reports/`.

## Todo List
- [ ] `tests/unit/reviews.test.ts` (8 groups) green via `npm test`
- [ ] `tests/browser/g-reviews.mjs` (10 checks) green via `npm run test:browser`
- [ ] `npm run lint` · `npm run build` 0 errors
- [ ] Manual: badge hidden @0 reviews · disabled w/o probe · enabled w/ probe · persists after reload · 375px no overflow · `/en` + `/vi` strings
- [ ] Docs/changelog + completion report

## Success Criteria
- `npm test` = all files pass (incl. i18n parity for the 14 new keys) · `npm run lint` 0 · `npm run build` 0 · `npm run test:browser` all files pass (g-reviews ≥10 checks) · manual checklist all ✓ · browser storage left clean after run.

## Risk Assessment
- **R1 test pollution**: g-reviews must delete its review + probe (shared browser storage) → explicit cleanup block + final assertion of clean state.
- **R2 flaky waits**: use `waitUntil: "networkidle2"` + explicit `waitForSelector` on `review-card` / badge (never bare sleeps beyond existing `sleep(200)` pattern).
- **R3 dev-server down**: runner already exits with "start `npm run dev` first" — document order in commands.
- **R4 fixture images**: canvas downscale needs real browser → covered in browser test, not unit (documented, not skipped).
- **R5 ISR cache serving stale page during run**: navigate with `?cb=` cache-bust only if needed; localStorage effects are client-side so ISR is harmless.

## Security Considerations
- Probe uses obviously fake PII (`probe@example.com`) and is deleted · no secrets in test files · no network writes · screenshots contain only synthetic data.

## Next Steps
- Ship: `/ck:code-review` → `/ck:ship`; journal decisions via `/ck:journal`.

## Decisions already made
Derived ratings (badge from reviews) · localStorage `vn-reviews:v1` · slug-only gating probe · badge surfaces incl. null-render no-slug wiring · one-review-per-booking upsert · image cap 3/downscale/quota error.

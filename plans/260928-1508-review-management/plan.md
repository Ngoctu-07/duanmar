# Review Management (Kebab Menu, Time-gated Editing, Rating Recalculation) — Plan

**Date**: 2026-09-28 · **Type**: Feature (UI + Lib + API + Tests) · **Status**: Complete

## Executive Summary
Owner-only kebab (vertical-ellipsis) menu on the review card (`/vi/explore/destinations/hcm`): **Edit** (scrolls/focuses the existing prefill form) + **Delete** (`window.confirm` → `deleteReview` → derived badge/count/list recalc automatically). Edit is hard-disabled — native `disabled` attr + reduced opacity — once `createdAt` is ≥3h old vs **server time** (new `GET /api/server-time`), on BOTH the menu item (AC literal) AND the prefilled form path (else AC3 is bypassable). `saveReview` preserves `createdAt` on upsert so the gate cannot self-extend. No auth exists → ownership = device-local booking-reference match.

## Context Links
- **Research**: `research/research-summary.md` — primary source, all file:line citations verified 2026-09-28
- **Related Plans**: `plans/260928-1428-about-us-section-contact-page/` (house format) · `plans/260928-0010-star-rating-and-customer-reviews/` (reviews feature + test conventions)
- **Docs**: `docs/code-standards.md`, `docs/design-guidelines.md` · changelog append-only under `## 2026-09-28` (`docs/project-changelog.md:261`, `### Added` block ends `:309`)
- **Key files**: `src/lib/reviews.ts` (167 ln) · `src/components/reviews/{review-card,customer-reviews,write-review-form}.tsx` (86/79/191 ln) · `tests/browser/g-reviews.mjs` (30 checks) · `src/app/api/contact/route.ts:8,52` (API precedent) · `src/components/my-trips/my-trips-client.tsx:44-48` (confirm precedent) · `tests/browser/f-ui.mjs:212` (dialog-accept precedent)

## Binding Decisions (do not re-ask)
1. **Ownership** (no auth exists): `isMyReview(review)` = `listBookings().some(b => b.reference === review.bookingReference)` + `typeof window === "undefined" → false`; kebab hidden for non-owners incl. reviews orphaned by My-Trips "Delete all trips" (accepted + documented).
2. **Bespoke dropdown** — Base UI `Menu.Item` cannot emit native `disabled` (renders `<div>`; `useButton` strips it, research §4): trigger `<button aria-haspopup="menu" aria-expanded data-testid>`, panel `role="menu"` with plain `<button role="menuitem">`; Edit = native `disabled` + `disabled:opacity-50`; no portal (stays in card); **no `aria-disabled`, no `aria-pressed`** (g-reviews WRAP / c-booking B6 traps); icon lucide `EllipsisVertical` (stroke-only → `svg.fill-current===4` safe); menu renders NO `<img>`.
3. **Server time**: new `GET /api/server-time` → `{ time: ISO }` (`runtime="nodejs"` + `dynamic="force-dynamic"`), fetched **on menu open**; fetch/parse failure → fail-closed (Edit disabled). New pure module `src/lib/edit-window.ts`: `EDIT_WINDOW_MS = 10800000`, `isEditWindowExpired(created, now, windowMs = EDIT_WINDOW_MS)` (`>=` boundary; invalid ISO → `true`), `fetchServerNow(): Promise<string | null>`.
4. **`createdAt` preservation**: `saveReview` keeps the EXISTING record's `createdAt` on upsert (single choke point; else the 3h gate self-extends — research §1). Unit-tested.
5. **Gate BOTH paths**: menu Edit item (AC literal) AND prefilled `WriteReviewForm` editing path (reuse disabled-wrapper `write-review-form.tsx:115-120` + hint `editWindowClosed`); create-path (no existing review) stays enabled.
6. **Delete flow**: `window.confirm(t("reviews.deleteConfirm"))` → `deleteReview(review.reference)` → existing `vn-reviews:changed` event updates badge/count/list (recalc = derived, zero event code).
7. **Bug fix in scope**: `write-review-form.tsx:56-60` gains `else` clearing `rating/comment/images` (stale prefill would silently recreate a deleted review — research §1).
8. **Edit action**: scroll + focus the existing write-review form (mechanism stays prefill+resubmit; no second form, no new route).
9. **i18n**: ONLY `destinations.reviews.{menuLabel,menuEdit,menuDelete,deleteConfirm,editWindowClosed}` in BOTH `src/messages/{en,vi}.json` (search page scans `news.*`/`about.*` only → no phantom results, research §5).
10. **Ownership plumbing**: `customer-reviews.tsx refresh()` computes owned refs → `owned: boolean` prop on `ReviewCard`; card stays presentational; helper `isMyReview` lives in `src/lib/reviews.ts` (budget ~25 ln → keep file <200).
11. **No new mutations/events** needed (`saveReview`/`deleteReview` already notify via private `notifyChanged`, `reviews.ts:24-30`) · no new deps, no zod, no `*-enhanced` files, real implementation only.

## Implementation Phases

| # | Phase | Status | Progress | Plan file | Depends on | Verification |
|---|-------|--------|----------|-----------|-----------|--------------|
| 1 | `edit-window` lib + `isMyReview` + createdAt preservation + `/api/server-time` + unit tests | Complete | 100% | [phase-01](phase-01-lib-api-and-time.md) | — | lint, `npm test`, build, curl `/api/server-time` |
| 2 | Bespoke kebab menu + ownership plumbing + i18n keys ×2 locales | Complete | 100% | [phase-02](phase-02-kebab-menu-and-ownership.md) | P1 (`fetchServerNow`/`isEditWindowExpired`) | lint, `npm test`, build, DOM probe |
| 3 | Form 3h gate + else-clear + Edit scroll target + delete→recalc sanity | Complete | 100% | [phase-03](phase-03-form-gate-and-delete-integration.md) | P1 (helpers), P2 (menu + `editWindowClosed` key) | lint, `npm test`, build, DOM checks |
| 4 | `k-review-actions.mjs` + full pipeline + changelog + plan status | Complete | 100% | [phase-04](phase-04-tests-pipeline-changelog.md) | P1–P3 | `npm test`, `npm run build`, `npm run test:browser` |

## New Files (exact allow-list)
- **Create (6)**: `src/lib/edit-window.ts` · `src/app/api/server-time/route.ts` · `src/components/reviews/review-actions-menu.tsx` · `src/components/reviews/use-edit-window-gate.ts` · `tests/unit/edit-window.test.ts` · `tests/browser/k-review-actions.mjs`
- **Modify (8 + plan)**: `src/lib/reviews.ts` · `src/components/reviews/review-card.tsx` · `src/components/reviews/customer-reviews.tsx` · `src/components/reviews/write-review-form.tsx` · `src/messages/en.json` · `src/messages/vi.json` · `tests/unit/reviews.test.ts` · `docs/project-changelog.md` (+ `plan.md` status lines)
- **Delete: 0**. No `*-enhanced` files; every file <200 LOC (`write-review-form.tsx` starts at 191 → gate logic extracted into `use-edit-window-gate.ts`).

## Global Verification (every phase)
`npm run lint` → `npm test` (**14/14** from P1; i18n parity en↔vi) → `npm run build` → (P4) `npm run dev` on :3000 + `npm run test:browser` (expect **9/10 files passed** — only pre-existing `revalidate-webhook.mjs` fails: needs `SANITY_REVALIDATE_SECRET`; tolerated, do NOT "fix") and `g-reviews.mjs` must still print `all 30 checks passed`. Manual surface: `http://localhost:3000/vi/explore/destinations/hcm`.

## Key Risks
- **g-reviews regression (30 checks)** — traps: `${CARD} svg.fill-current === 4` (`:218`, stroke-only icon ✓) · `${CARD} img === 1` (`:220`, menu has no img) · `WRAP = #customer-reviews [aria-disabled="true"]` (`:22`, used `:179/:199/:286` — never put `aria-disabled` on menu controls; form wrapper gains it ONLY when an >3h existing review exists, none at those steps) · `button[aria-pressed]` outside section = 0 (`c-booking.mjs:48-51`) · i18n parity · `isReview` needs all 9 fields (no new field on `TourReview`).
- **`next build` may prerender the GET route to a frozen timestamp** → every review would look expired → mandatory `export const dynamic = "force-dynamic"`, verify build route table shows `ƒ`, two spaced curls must differ.
- **`write-review-form.tsx` at 191/200 LOC** → gate hook extracted to `use-edit-window-gate.ts`; hard fail if >200 after edits (fallback: extract the `:47-79` effect into `use-write-review-state.ts`, log as deviation).
- **Form gate re-evaluates only on refresh events** (menu re-fetches on every open → AC-literal path always fresh); accepted: brief stale-enabled window on form path only.
- **Orphaned reviews become UI-undeletable** (menu hidden without owner booking) → accepted per binding 1, noted in changelog.
- **Client-only storage**: server-time defeats device clock skew but no server-side enforcement is possible (documented limit, research §3).

## Unresolved Questions
1. EN/VI copy for the 5 new keys (proposed verbatim in phase-02, Functional 4) — confirm or supply replacements before P2; default = proposed. Everything else resolved by binding decisions 1–11.

## Deviations & Design Notes (reference-plan Completion Notes style)
- **Bespoke dropdown vs Base UI Menu**: Base UI `Menu.Item` renders `<div>` and `useButton` strips native `disabled` (research §4) → cannot satisfy AC "disabled attribute = true"; a ~130 ln custom `role="menu"` is the researched, deliberate deviation.
- **Form gate beyond literal AC**: AC3 names the menu item only; we ALSO gate the prefilled form because edit = form resubmit (otherwise AC3 bypassable in one click). Create-path untouched.
- **`createdAt` semantics**: the 3h window counts from FIRST post time — upsert keeps the original `createdAt`; only a brand-new review (insert path) stamps `new Date()` (`write-review-form.tsx:96`).
- **LOC fallback used in P3**: gate + else-hint pushed `write-review-form.tsx` to 208/200 → extracted the mount/storage/event effect into `src/components/reviews/use-write-review-state.ts` (63 ln, returns `{ booking, existing, loaded }`, form passes stable `applyPrefill` callback) → form back to 164 ln; the predicted fallback at phase-03 step 3 was taken as specified.

## Completion Notes (2026-09-28)
- **Pipeline**: lint 0 · `npm test` **14/14** · `next build` 0 (`ƒ /api/server-time`, curl 200 ISO increasing, POST 405) · `npm run test:browser` **9/10** (only tolerated pre-existing `revalidate-webhook` env failure) · `g-reviews` **30/30 unchanged** · `k-review-actions` **25/25** · probes: P2 13/13, P3 20/20 · evidence `tests/.output/k-review-actions-01..04.png`.
- **Deviations (3)**: ① bespoke dropdown (Base UI strips native `disabled`) ② form gate beyond literal AC (same predicate, closes bypass) ③ `use-write-review-state.ts` extraction (200-LOC rule fallback, logged above). One extra fix during P2: `evaluate()` moved out of the state updater (React StrictMode double-invoke caused 2× `/api/server-time` GETs).
- **Follow-ups (accepted)**: orphaned reviews viewable but not deletable from UI (no owner booking) · 3h gate is client-side only (server time defeats clock skew, no server enforcement — data is device-local) · optional future: server-authoritative reviews with real auth.
- **Unit test note**: `tests/unit/edit-window.test.ts` wraps checks in `main()` because tsx CJS build rejects top-level `await` (8 checks a–h semantics preserved).

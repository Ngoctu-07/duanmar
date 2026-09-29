# Booking "Challenge Level" tied to `isSpecialTour` + hard-remove `difficultyLevel` — Plan

**Date**: 2026-09-28 · **Type**: Bug fix / refactor (CMS schema + booking form + tests) · **Status**: Complete · **Progress**: 100%

## Executive Summary
Section 4 of the booking form ("Cấp độ thử thách" / Challenge Level) renders, validates and persists for EVERY tour, while the tour's `isSpecialTour` is already fetched on checkout and never plumbed through — one prop away. Standard tours get an extra section, a hard `difficultyRequired` error and a `difficulty` key in the stored record that My Trips must then tolerate. Fix: wire `isSpecialTour` checkout → `BookingForm` → conditional render/validation/payload. Lockstep AC1 **hard-removes** the CMS-declared `difficultyLevel` field (schema + 4 GROQ projections + badge chip + `Destination` interface + 2 pass-throughs + 4 i18n keys ×2 locales), which conflates CMS-declared difficulty with the booking-time selection. **Payload = localStorage `vn-my-trips:v1` `TripBooking` (no booking API route exists).**

## Context Links
- Repo has **NO `README.md`** (context). Rules: `.claude/rules/development-rules.md` · `.claude/rules/documentation-management.md` (phase structure) · `CLAUDE.md`. Changelog style tail: `docs/project-changelog.md:343-360`.
- Form: `src/components/booking/booking-form.tsx` props `:33-40`, `EMPTY_VALUES.difficulty` `:30`, validate call `:110`, unconditional Section 4 `:151` · `booking-difficulty-section.tsx` (73 LOC, `#booking-difficulty` `:39`, options `easy|medium|hard` `:64-66`) · `booking-validation.ts` signature `:51-54`, capacity precedent `:77-82`, difficulty rule `:84` · `booking-summary.tsx` save `:54-71`, `difficulty:` `:64` · `ticket-rows.ts:49` (notes conditional-spread precedent `:50-52`) · `booking-history.ts` field `:19`, guard `:45`, key `:27` · `my-trips-detail.tsx:55`.
- Flag: `checkout/page.tsx:31` (`DESTINATION_BY_SLUG_QUERY`) → `<BookingForm>` `:58-64` (no flag) · `queries/destinations.ts:26` `isSpecialTour`, `:10/:25/:43` `difficultyLevel` · `queries/homepage.ts:19` · `schemaTypes/destination.ts:34-47` / `:48-54` · badge `tour-attribute-badges.tsx:5,8,18-26,32-36` · `destination-card.tsx:16,49-52` · `[slug]/page.tsx:88-91`.
- Tests: `c-booking.mjs` `:29,:56-61,:115-116,:133-134,:136-151,:167-169,:193-194` · `f-ui.mjs:113` · `c-payment.mjs:74-80` · `d8-a11y.mjs:45-47` · `booking-logic.test.ts:69-77,:83-101,:128-133` · `tour-category-queries.test.mts:49-51,:57-59,:70-75,:77-81,:100` · `p-tours-category.mjs:12,:37,:88-96,:196-204,:272-278` · flag-fetch pattern `tests/helpers/cms-expectations.mjs:12-42` + self-contained copy precedent `p-tours-category.mjs:20-44` · `reviews.test.ts:60-66` (window stub).

## Root Cause (research-verified)
1. `booking-form.tsx:151` renders `<BookingDifficultySection>` UNCONDITIONALLY; the 73-LOC section always shows the select.
2. `booking-validation.ts:84` unconditionally requires `difficulty` (`errors.difficulty = "difficultyRequired"`).
3. `booking-summary.tsx:64` unconditionally puts `difficulty: values.difficulty` into the persisted record (`saveBooking` → localStorage `vn-my-trips:v1`; **no booking API route** — key name `difficulty`, NOT `difficultyLevel`).
4. The tour's `isSpecialTour` is ALREADY fetched (`checkout/page.tsx:31`; projection `destinations.ts:26`) but NEVER passed into `BookingForm` (`:58-64` passes slug/tourName/tiers/locale/capacity only; `BookingFormProps` `booking-form.tsx:33-40` lacks the flag) — the flag is one prop away.
5. (AC1) `destination.difficultyLevel` (`destination.ts:34-47`, added earlier today, plan `260928-2105`) conflates CMS-declared difficulty with the booking-time selection → to be **hard-removed** in lockstep (schema + projections + badge UI + interface + pass-throughs + i18n + tests).

## Binding Decisions (do not re-ask)
1. **Hard-remove `difficultyLevel`** everywhere; KEEP `isSpecialTour` boolean (`initialValue:false`) and update its `description` to mention it gates the booking Challenge Level step. `structure.ts`/`schemaTypes/index.ts`: NO edits (auto). Historical plan/docs mentions: keep. `destinations.special` i18n key: keep.
2. **Wiring**: `checkout/page.tsx` passes `isSpecialTour={destination.isSpecialTour === true}` (normalize to boolean) → `BookingForm` prop → render Section 4 ONLY when true (`{isSpecialTour && <BookingDifficultySection …/>}`). Standard tour UI = Sections 1-3 (Name/Email/Phone/Notes, Travel Date, Guests) + submit; heading keys unchanged ("4. …" only ever shown when present).
3. **`validateBooking(values, capacity?, isSpecialTour?)`** — 3rd arg follows the `capacity` optional-arg precedent (`:51-82`); rule `:84` runs ONLY when `isSpecialTour === true`. Standard → no `difficultyRequired` ever.
4. **Default = `false` in the signature, but every caller passes it explicitly** (`booking-form.tsx:110` + both unit branches). Rationale: a silent `true` default would make 2-arg legacy callers fail-closed on a field they may not render (capacity precedent is fail-open); `false` matches "section absent ⇒ no requirement", and explicitness is enforced by the two unit checks.
5. **Payload**: `booking-summary.tsx:64` → `...(isSpecialTour === true && { difficulty: values.difficulty })` (shape verified type-clean under strict `tsc`). Keep `BookingValues.difficulty` + `EMPTY_VALUES.difficulty:""`.
6. **Storage/ticket consistency**: `TripBooking.difficulty?: string` (`:19`); guard `:45` passes when key ABSENT, still requires string when present (legacy `""`/`"easy"` pass, non-string dropped → no silent My-Trips data-loss); `ticket-rows.ts:49` renders the row ONLY when value non-empty (mirrors notes precedent `:50-52`); `my-trips-detail.tsx:55` → `booking.difficulty ?? ""`.
7. **No booking-namespace i18n changes** (keys still needed for special tours). No new deps. Parity **789 → 785**.
8. **Data-driven test strategy**: `c-booking.mjs` fetches hcm's live `isSpecialTour` at start → `SPECIAL = flag === true`; assertions `SPECIAL ? A : B`. Today's dataset (hcm/hcmc/nyc, flag added today ⇒ legacy docs) takes the standard branch; flipping hcm in Studio activates the strong branch automatically. **No CMS write token ⇒ special-branch e2e impossible → covered by explicit-flag unit checks.**
9. **Test-edit precedent**: edits to existing tests are recorded as "assertion đổi theo spec, có ghi nhận (precedent F7/B6/j-about-contact)". Runners, `revalidate-webhook.mjs`, `h4-p4-e2e.mjs`, header/footer/brand files: NEVER edited.

## Implementation Phases
| # | Phase | Status | Progress | Plan file | Depends |
|---|-------|--------|----------|-----------|---------|
| 1 | AC1 schema/GROQ/badge/interface + AC2 prop wiring/conditional render + AC3 payload & storage/ticket consistency | Complete | 100% | [phase-01](phase-01-schema-booking-core-fix.md) | — |
| 2 | Test edits (7 files) + AC1 i18n deletion (lockstep, AFTER the p-tours edit) | Complete | 100% | [phase-02](phase-02-tests.md) | P1 |
| 3 | Pipeline, changelog EOF, status flips, plan-summary, code review | Complete | 100% | [phase-03](phase-03-pipeline-changelog-review.md) | P2 |

## File Allow-List (exact)
- **Modify (23)**: `src/sanity/schemaTypes/destination.ts` · `src/sanity/queries/destinations.ts` · `src/sanity/queries/homepage.ts` · `src/components/explore/tour-attribute-badges.tsx` · `src/components/explore/destination-card.tsx` · `src/app/[locale]/explore/destinations/[slug]/page.tsx` · `src/app/[locale]/booking/checkout/page.tsx` · `src/components/booking/booking-form.tsx` · `src/components/booking/booking-validation.ts` · `src/components/booking/booking-summary.tsx` (verified: **`.tsx`**, brief said `.ts`) · `src/components/booking/ticket-rows.ts` · `src/lib/booking-history.ts` · `src/components/my-trips/my-trips-detail.tsx` · `src/messages/en.json` (−4) · `src/messages/vi.json` (−4) · `tests/browser/c-booking.mjs` · `tests/browser/f-ui.mjs` · `tests/browser/c-payment.mjs` · `tests/browser/d8-a11y.mjs` · `tests/unit/booking-logic.test.ts` · `tests/unit/tour-category-queries.test.mts` · `tests/browser/p-tours-category.mjs` · `docs/project-changelog.md`
- **Create**: plan dir (this + 3 phases + `reports/plan-summary.md`). **Delete: 0 files.**
- **NEVER edit**: `tests/run-unit.mjs` · `tests/run-browser.mjs` · `tests/browser/revalidate-webhook.mjs` · `tests/browser/h4-p4-e2e.mjs` · `header.tsx`/`footer.tsx`/`brand-logo.tsx` · `structure.ts` · `schemaTypes/index.ts` · `tests/helpers/*` · `.env*`.

## Global Verification (per phase — see expected reds)
`node_modules/.bin/sanity schemas validate` (0 errors — after schema edit) → `npm run lint` (0) → `npm test` → stop dev `:3000` → `npm run build` (0; checkout/tours routes stay `ƒ`) → restart dev `(npm run dev > /c/Users/Lenovo/AppData/Local/Temp/next-dev.log 2>&1 &)` → `npm run test:browser` → eyeball `c-booking` / `o-footer` / `p-tours` green. **Full green (`npm test` 15/15, browser 14/15 with only `revalidate-webhook` failing) is asserted at the END of Phase 02 / in Phase 03** — right after Phase 01 alone, exactly 2 unit files are expected RED (`tour-category-queries.test.mts`, `booking-logic.test.ts`) and `c-booking.mjs` RED until Phase 02's spec edits land (same-source semantics, tests updated in the same change-set).

## Key Risks
- **Data-loss guard (highest priority)**: if `booking-history.ts:45` keeps requiring `difficulty`, new standard-tour records are silently filtered from My Trips. Guard fix is unit-covered for absent / `""` / non-string.
- **Lockstep order**: `p-tours-category.mjs` must stop referencing `destinations.difficulty.*` BEFORE those i18n keys are deleted (else `msg.vi.destinations.difficulty[l]` → TypeError → fatal). Linear order: P1 src → P2-1 p-tours → P2-2 i18n tail → P2-3..6 remaining tests → P3 pipeline.
- **Live flag unknown**: hcm/hcmc/nyc almost certainly lack `isSpecialTour` → today's run takes the standard branch; assertions are data-driven, not hardcoded.
- **Special-branch e2e impossible** without a CMS write token → covered by unit tests (explicit flag both ways) + `#booking-difficulty`-absent assertion.
- **Un-edited booking tests**: `c-payment`/`d8-a11y`/`f-ui` click `#booking-difficulty` as fill-boilerplate → `page.$` guard; `h4-p4-e2e` never touches it; `g-reviews`/`k-review-actions`/`travel-date` seed records WITH `difficulty` (must keep passing the guard).
- **Runner counts unchanged** (15 unit / 15 browser files) → no runner edits; expected 15/15 + 14/15.

## Unresolved Questions
Defaults chosen (say if either should differ): (a) `isSpecialTour?` defaults `false` in signature but is passed explicitly by prod caller + both unit branches; (b) changelog section = `### Changed` (refactor/spec-alignment; `### Fixed` reserved for defect patches with severity lines); (c) c-booking flag fetch = self-contained inline helper (copy of `cms-expectations.mjs:12-20` + `p-tours-category.mjs:20-44`) rather than editing `tests/helpers/*` (outside allow-list); (d) AC1 i18n deletion scheduled in Phase 02 for lockstep ordering.

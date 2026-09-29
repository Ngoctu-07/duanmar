# Plan Summary — Booking "Challenge Level" tied to `isSpecialTour` + hard-remove `difficultyLevel`

**Date**: 2026-09-28 · **Plan**: `plans/260928-2255-booking-challenge-level-tied-to-isSpecialTour/` · **Status**: Complete (100%)

## Scope
Tie the booking form's Section 4 "Cấp độ thử thách" (Challenge Level) to the tour's `isSpecialTour` toggle end-to-end — render, validation and persisted payload — so standard tours show exactly Sections 1-3, never require `difficulty`, and store a record **without** a `difficulty` key. In lockstep, **hard-remove** the CMS-declared `difficultyLevel` field from `destination` (schema + 4 GROQ projections + badge chip + `Destination` interface + 2 pass-throughs + 4 i18n keys ×2 locales) which conflates CMS-declared difficulty with the booking-time selection. Payload = localStorage `vn-my-trips:v1` `TripBooking` (**no booking API route exists**). 4 existing test files edited per spec (+1 boilerplate-guard group), 2 new unit-check groups inside existing files, changelog. No new deps, no booking-namespace i18n changes, no runner/webhook/`h4-p4` edits.

## Phases
| # | Phase | Deliverable | Status |
|---|-------|-------------|--------|
| 1 | `phase-01-schema-booking-core-fix.md` | AC1: drop `difficultyLevel` (`destination.ts:34-47`, 4 projections, badge chip, interface, 2 pass-throughs) + `isSpecialTour` description update. AC2: `checkout → BookingForm(isSpecialTour) → {flag && Section 4}` + `validateBooking(values, capacity?, isSpecialTour?)` guarded rule. AC3: conditional `difficulty` spread in `saveBooking`, `TripBooking.difficulty?` + relaxed-but-typed guard, conditional difficulty ticket row, `my-trips-detail ?? ""`. | **Complete 100%** |
| 2 | `phase-02-tests.md` | p-tours drops `LEVELS`/difficulty branches (P14/P18 names kept) → **then** i18n tail −4 keys ×2 (parity 789→785) · `c-booking` data-driven `SPECIAL` (8 conditional edits + 2 new presence/absence checks) · `page.$` guards in `f-ui`/`c-payment`/`d8-a11y` · `booking-logic` split difficulty checks + 2 new checks · `tour-category-queries` 16→14. | **Complete 100%** |
| 3 | `phase-03-pipeline-changelog-review.md` | sanity validate → lint → unit 15/15 → build → browser 14/15 → eyeball · changelog EOF `### Changed` (VN, precedent note, `Verified:`, `Docs impact: minor`) · status flips · summary actuals · code-reviewer. | **Complete 100%** |

## Binding decisions (do not re-ask)
- **Hard removal** of `difficultyLevel` (schema + everything downstream); `isSpecialTour` kept (`initialValue:false`, description updated to mention it gates the Challenge Level step). `structure.ts`/`schemaTypes/index.ts` untouched; historical plan/docs mentions kept.
- **Payload = localStorage** (`vn-my-trips:v1`, key `difficulty`, NOT `difficultyLevel`) — no API route involved.
- **`validateBooking` 3rd arg** follows the `capacity` optional-arg precedent; rule runs only when `isSpecialTour === true`. **Default `false` in the signature, every caller passes it explicitly** (rationale: fail-open like `capacity`; explicitness enforced by 2 unit checks covering both branches).
- **`BookingValues.difficulty` + `EMPTY_VALUES.difficulty:""` kept** (needed for the special branch; dropping ripples into my-trips + fixtures).
- **Storage guard**: key optional; present-but-non-string still rejected; absent/`""`/string accepted → no My-Trips data loss for new standard records, legacy records unaffected.
- **Data-driven e2e**: `c-booking` fetches live hcm `isSpecialTour` → `SPECIAL` and asserts `SPECIAL ? A : B`; no CMS write token ⇒ special branch covered by unit tests instead of fabricated data.
- **Test edits are spec-changed, recorded** in the changelog: "assertion đổi theo spec, có ghi nhận (precedent F7/B6/j-about-contact)".
- **Lockstep order**: p-tours test edit → i18n key deletion (else `msg.vi.destinations.difficulty[l]` TypeError → fatal).
- **Changelog section = `### Changed`** (refactor/spec alignment; `### Fixed` reserved for defect patches with severity lines).

## Deviations from brief (flagged)
1. **`booking-summary.tsx` is `.tsx`, not `.ts`** (the brief itself asked to verify) — allow-list corrected in `plan.md`.
2. **Modify count "~14" → 23 files actually listed** by the brief's own enumeration (13 src + 2 i18n + 1 docs + 7 tests).
3. **`c-booking` flag fetch = self-contained inline helper** (copy of `cms-expectations.mjs:12-20` + `p-tours-category.mjs:20-44`) instead of extending `tests/helpers/cms-expectations.mjs` — that helper is outside the allow-list.
4. **`isTripBooking` is module-private** → new unit checks exercise it via `listBookings()` with a stubbed `window.localStorage` (precedent `reviews.test.ts:60-66`); no export added to source.
5. **AC1 i18n deletion scheduled in Phase 02** (not 01) purely for the lockstep order; it is still an AC1 deliverable and is called out in both phases.
6. Spread form kept exactly as the brief wrote it (`...(isSpecialTour === true && {…})`) — verified type-clean under `tsc --strict`.

## Risks
- **Data-loss guard** (`booking-history.ts:45`): missing the relaxation silently filters new standard-tour records from My Trips — highest-priority line, unit-covered (absent / `""` / non-string / junk).
- **Lockstep i18n/test order** — binding sequence documented; `npm test` runs before browser tests anyway.
- **Live flag unknown** (hcm/hcmc/nyc legacy docs) → **resolved at runtime: `hcm.isSpecialTour=true`, `hcmc=null`, `nyc=null`** — hcm run takes the special branch; standard branch e2e'd via NEW `B13` on `hcmc`; assertions stay data-driven either way.
- **Special-branch e2e impossible without CMS write token** → covered by explicit-flag unit checks + the `#booking-difficulty`-absent DOM assertion.
- **Un-edited booking tests** (`c-payment`/`d8-a11y`/`f-ui` boilerplate clicks; `h4-p4` untouched; `g-reviews`/`k-review-actions`/`travel-date` seed `difficulty` records) → `page.$` guards + keep-string-in-guard preserve them.
- **Runner counts unchanged** (15/15 files) → expected unit **15/15**, browser **14/15** (sole tolerated fail `revalidate-webhook`).

## Verification gates
`node_modules/.bin/sanity schemas validate` (0) → `npm run lint` (0) → `npm test` (**15/15**) → stop dev → `npm run build` (0; checkout/tours routes stay `ƒ`) → restart dev → `npm run test:browser` (**14/15**) → eyeball `c-booking`/`o-footer`/`p-tours` · parity **785/785**.

## Docs impact
minor — `docs/project-changelog.md` EOF `### Changed` (VN bullets, test-edit precedent note, `Verified:`, `Docs impact: minor`) + plan/phase status flips + this summary.

## Open Questions
1. `validateBooking` 3rd arg: default `false` (chosen) vs required arg — confirm the explicit-pass convention is acceptable.
2. Changelog section `### Changed` (chosen) vs `### Fixed` — say if you prefer the bug framing.
3. Orphaned `difficulty` values already inside existing localStorage records will still render as a ticket row (legacy path) — leave as-is (chosen) vs add a cleanup migration.
4. `isSpecialTour` schema `description` wording (draft: "…also gates the booking form's Challenge Level (Section 4) step.") — confirm before Studio publish.

## Actual results (post-implementation)
- **P1**: schema `sanity schemas validate` 0 errors/0 warnings · `grep difficultyLevel src/` = **0** · schema −14 LOC (field) + description change · `tour-attribute-badges.tsx` 44→29 lines (special chip only) · all 7 AC1/AC2/AC3 source edits landed (schema, 4 projections, badge, interface+2 pass-throughs, checkout prop, form conditional render, validation gate, conditional payload spread, `TripBooking.difficulty?`, relaxed-but-typed guard, ticket row conditional, `my-trips-detail ?? ""`) · `npx tsc --noEmit` exit 0 after Phase 1.
- **P2**: `p-tours` edited FIRST (LEVELS/branches gone, GROQ projection drops field) → then i18n tail −4 keys ×2 · parity **785/785** (789−4 per file) · `c-booking` data-driven `SPECIAL=true` observed live (4 sections / 5 errors / select works / summary keeps difficulty) + NEW `B13` standard-branch on `hcmc` green (3 sections, 0 field, 4 errors, 0 "độ khó") · `f-ui`/`c-payment`/`d8-a11y` 1-line `page.$` guards green · `booking-logic` **16/16** (was 13; +3 new: special empty-form, `buildTicketRows` omit row, `listBookings` absent/`""`/non-string) · `tour-category-queries` **14/14** (was 16).
- **P3 gates (actual)**: `sanity schemas validate` **0/0** → lint **exit 0** → `npm test` **15/15 files** → build **exit 0** (`ƒ /[locale]/booking/checkout`, `● /[locale]/explore/destinations/[slug]` pre-existing SSG) → browser **14/15** (sole fail `revalidate-webhook` = missing `SANITY_REVALIDATE_SECRET`, pre-existing) → eyeball: `c-booking` 27/27 standalone, `p-tours` 22/22 (P14/P18 special-only badge), `o-footer` 19/19 untouched · SSR grep: hcm page has `booking-difficulty`, hcmc/nyc none · screenshots reused `booking-b6-button.png`, `booking-b9-summary.png`, `booking-b12-form.png`.
- **Changelog**: EOF `### Changed` block, `docs/project-changelog.md` (VN bullets, test-edit precedent note, `Verified:` numbers incl. review line, `Docs impact: minor`).
- **Code review**: `plans/reports/code-review-260928-booking-difficulty.md` → verdict **DONE_WITH_CONCERNS** (0 P1, 1×P2, 7×P3, no allow-list deviations). **P2 resolved**: `c-booking` B13 extended to full valid-submit + mock-payment → asserts the persisted `vn-my-trips:v1` record for `hcmc` has **no `difficulty` key** (and special-branch counterpart would assert the string) + summary `dl dt` lacks `Độ khó` + flag fetched live (`hcmc` not hardcoded) + self-healing localStorage cleanup → `c-booking` **31/31** standalone, full suite re-run **14/15** (sole fail = pre-existing revalidate), lint 0. P3s accepted as observational (envValue ×3 copies — helper file outside allow-list; GROQ slug interpolation — literals only; junk-string difficulty passes guard — legacy display behavior, `t()` key-fallback; check-count wording corrected 27→31).

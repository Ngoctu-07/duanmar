# Code Review — Booking "Challenge Level" tied to `isSpecialTour` + hard-remove `difficultyLevel`

- **Date**: 2026-09-28 · **Plan**: `plans/260928-2255-booking-challenge-level-tied-to-isSpecialTour/`
- **Scope**: READ-ONLY review of the 23 allow-list files (+ plan dir). Working tree contains MANY other uncommitted plans — cross-plan attributions noted (§3).
- **Verdict**: **DONE_WITH_CONCERNS** — no P1; 1×P2 (AC3 standard-record shape untested), 7×P3. Code itself correct on inspection.

---

## 1. Findings

| # | Sev | file:line | Issue | Suggested fix |
|---|-----|-----------|-------|---------------|
| 1 | **P2** | `booking-summary.tsx:67` · `c-booking.mjs:247-257` · `c-booking.mjs:222-229` | **AC3 headline claim ("standard record has NO `difficulty` key") asserted by no test.** Unit tests cover `buildTicketRows` omit + `listBookings` absent-key, but the conditional spread itself (`...(isSpecialTour === true && {difficulty})`) is untested for `false`. e2e: "summary omits difficulty" runs only when `SPECIAL===false` (today `hcm.isSpecialTour=true` → branch dead); B13 (standard `hcmc`) stops before submit, never inspects payload. Regression (e.g. drop the spread) → all suites stay green. | Extend B13: fill valid form on `hcmc`, submit, click pay, read `vn-my-trips:v1` (precedent `f-ui.mjs:165`) and assert record lacks `"difficulty"` key. |
| 2 | P3 | `c-booking.mjs:71-273` / `plan-summary.md:57` | Claimed `c-booking 27/27`; static count = **29 `check(` sites, 1 in each if/else branch** → SPECIAL run = **28**, standard run = 27. Reporting nit only (failures still `exit 1` via `:284`). | Correct the number, or re-run and paste real output. |
| 3 | P3 | `c-booking.mjs:240-257` | B13 hardcodes `hcmc` = standard; no flag fetch (unlike `SPECIAL` for hcm). Flipping hcmc in Studio → false RED (loud, not silent) + wrong section-count assumption. | `const SPECIAL_HCMC = await fetchSpecialTour("hcmc")`; assert `SPECIAL_HCMC ? 4 : 3` / skip, mirroring B7/B9. |
| 4 | P3 | `c-booking.mjs:30` | GROQ built by interpolating `slug` into query string — safe today (literals only) but injection-prone helper if reused with untrusted input. | Use Sanity param form `…slug.current == $slug` + `&$slug=${encodeURIComponent(slug)}`. |
| 5 | P3 | `c-booking.mjs:13-21` | `envValue` is now the **3rd copy** (also `tests/helpers/cms-expectations.mjs`, `p-tours-category.mjs:21-29`) — DRY debt, caused by `tests/helpers/*` being outside allow-list. | Consolidate into `tests/helpers/env.mjs` in a follow-up plan touching helpers. |
| 6 | P3 | `booking-history.ts:47` · `ticket-rows.ts:50-52` | Guard: `difficulty` absent ✓, `""`/string ✓, but **`null`/number/object → whole record dropped** (all fields lost from My Trips, not just difficulty); conversely **any string junk** (`"extreme"`, `"xyz"`) passes guard → `t(values.difficulty)` → next-intl missing-key fallback renders `booking.xyz` text in ticket row (no crash; `src/i18n/request.ts` has no custom `onError`). | Treat non-string as `undefined` (strip key instead of rejecting record) + render row only if `["easy","medium","hard"].includes(v)` (or `t.has`). |
| 7 | P3 | `c-booking.mjs:222-228` | Standard summary assertion checks `dl dd` **values** only; an empty difficulty row (label present, value `""`) would pass. Unit `B3` covers row omission → low. | Also assert label list lacks `msg.vi.booking.difficulty`. |
| 8 | P3 | (interactions) | Coexisting edits in allow-listed files from OTHER plans: `text-destructive→text-primary` in `booking-difficulty-section.tsx:32`, `booking-summary.tsx:83,102`, `my-trips-detail.tsx:77,100` + `f-ui.mjs:151` (theme plans 260928-1100/2030); `dismissPromo` imports in c-booking/f-ui/c-payment/d8-a11y (promo plan allow-list `260928-1200/phase-03:50`); `package.json` +`react-hook-form` (other plan). None conflict semantically with this feature. | No action; noted so allow-list check isn't misattributed. |

No P1.

## 2. Spec / AC verification (re-checked by reviewer)

| AC | Evidence | Result |
|----|----------|--------|
| AC1 hard-remove `difficultyLevel` | `grep -rn difficultyLevel src/ tests/` = **0** (only negative asserts in `tour-category-queries.test.mts:63,70,83,93`); schema field gone, `isSpecialTour` description mentions Challenge Level (`destination.ts:34-37`); 4 projections = `DESTINATIONS_QUERY` + `DESTINATION_BY_SLUG_QUERY` + `DESTINATIONS_BY_CATEGORY_QUERY` + `FEATURED_DESTINATIONS_QUERY`; `tour-attribute-badges.tsx` special-chip only; `Destination` interface (`destination-card.tsx:16`) has `isSpecialTour?`, no `difficultyLevel`; pass-throughs `[slug]/page.tsx:88`, `destination-card.tsx:49`; `structure.ts`/`schemaTypes/index.ts` untouched. | OK |
| AC1 i18n | `destinations.difficulty` = absent in en+vi **and** zero dynamic refs (`grep destinations.difficulty src/ tests/` = 0); `destinations.special` kept; **parity 785/785** (recounted programmatically); booking ns `easy/medium/hard/difficulty/difficultyTitle/difficultyRequired` kept. | OK |
| AC2 wiring | `checkout/page.tsx:65` `=== true` → `booking-form.tsx:38,116,133,159` all `=== true`; summary reached only via `setConfirmed(true)` after `validateBooking` with same flag (`:111-135`) → empty-`difficulty` spread unreachable; Section 4 heading "4." only rendered when present → numbering stays 1-3 for standard. Single `BookingForm` call site (grep). | OK |
| AC2 validation | `booking-validation.ts:87-88` gated; 3rd optional arg default-false = fail-open (matches `capacity` precedent). **All callers audited**: `booking-form.tsx:113` passes flag; `h2-capacity-validation`, `travel-date`, `booking-logic` ≤2 args → standard (none assert a difficulty error). | OK |
| AC3 payload/storage | `booking-summary.tsx:67` conditional spread (type-clean, `JSON.stringify` drops absent key); `TripBooking.difficulty?` + guard `booking-history.ts:47`; `ticket-rows.ts:49-53` conditional row; `my-trips-detail.tsx:55` `?? ""` and passes **`bookingT`** (`useTranslations("booking")`) to `buildTicketRows:59` → labels/values resolve in correct ns (myTrips ns has no `difficulty`/`easy`). | OK |
| Hydration | Conditional render lives inside client `BookingForm`; prop is plain boolean from RSC fetch → identical server/client. `TourAttributeBadges` client, `!== true` → null. No mismatch surface. | OK |
| Tests | `tests/unit` = **15 files**, `tests/browser` = **15 files** (runner counts unchanged, no runner/webhook edits). | OK |
| Style/secrets | All touched src files <200 LOC (form 172, validation 115, booking-history 99, summary 127, ticket-rows 67, badges 26); tests 287/241/286 ≈ ~300 precedent. New comments descriptive (precedent JSDoc on props). No secrets/token: test uses unauthenticated public dataset query; `.env*` untouched; `envValue` never logs values. No `client.fetch`/`createClient` added in `src/` (only `fetch-published.ts` wrapper); tests use documented direct HTTP query API (existing pattern). | OK |

## 3. Allow-list check

- **All 23 modify targets show changes** (en/vi `destinations.difficulty` removal nets to 0 vs HEAD because the keys were added in plan 260928-2105 within the same uncommitted tree — net effect verified: absent now). Create = plan dir only; Delete = 0.
- **Deviations attributable to THIS plan: NONE.** Content-grep of full working-tree diff for `difficulty|isSpecialTour|Challenge Level|Cấp độ` → only allow-listed files + changelog.
- **NEVER-edit list** (`run-unit/run-browser`, `revalidate-webhook`, `h4-p4-e2e`, header/footer/brand, `structure.ts`, `schemaTypes/index.ts`, `tests/helpers/*`, `.env*`): none touched *by this plan*. `h4-p4-e2e.mjs` + `g-header.mjs` ARE dirty in tree but diff = `dismissPromo` + calendar-month nav = promo plan allow-list (`260928-1200/phase-03:50` lists exactly `{c-booking,c-payment,d8-a11y,f-ui,g-header,h4-p4-e2e}`); `tests/helpers/cms-expectations.mjs` unmodified (only new untracked `helpers/promo.mjs` from promo plan); runners/webhook clean.
- `booking-difficulty-section.tsx` is NOT in this plan's allow-list but is dirty — diff = 1 line color class only (theme plan), not this plan.

## 4. Numbers re-verified (spot-checks only; full suites per log)

| Claim | Check | Result |
|-------|-------|--------|
| `booking-logic` 16/16 | re-ran `npx tsx tests/unit/booking-logic.test.ts` | **16 passed, 0 failed** ✓ |
| `tour-category-queries` 14/14 | re-ran `npx tsx …mts` | **14/14** ✓ (14 `check(` in file) |
| unit 15 / browser 15 files | `ls` counts | 15 / 15 ✓ |
| browser 14/15, sole `revalidate-webhook` | not re-run (instruction) | accepted |
| `c-booking 27/27` | static count | **28** special-path / 27 standard → nit (finding #2) |
| `sanity schemas validate 0/0` | re-ran | **0 errors, 0 warnings** ✓ |
| `tsc --noEmit` exit 0 | re-ran | exit 0 ✓ |
| lint | `npx eslint` scoped to touched src files | exit 0 ✓ |
| i18n parity 785/785 | recount | ✓ |
| `grep difficultyLevel src tests` | 0 + negative asserts only | ✓ |

## 5. Strengths

- **`=== true` normalization end-to-end** (checkout prop, render gate, validation gate, payload spread) — immune to `"false"`-string/`null` CMS values; legacy docs (`hcmc`/`nyc` = `null`) behave as standard.
- **Data-driven e2e both branches live**: `hcm` special (4 sections/5 errors/select/summary-keeps) + NEW `B13` standard on `hcmc` (3 sections/0 field/4 errors/0 "độ khó"); `SPECIAL` fetch failure → thrown → `exit 1` (loud), and section-count check cross-validates the flag, so a wrong flag can't silently pass.
- **Data-loss guard fixed + unit-covered 4 ways** (absent / `""` / `123` / legacy string) — highest-risk line (`booking-history.ts:47`) correct.
- Lockstep ordering respected (p-tours drops `destinations.difficulty` before i18n deletion); no booking-ns i18n churn; no new deps by this plan; skip-guards in `f-ui`/`c-payment`/`d8-a11y` keep sibling tests green on either branch; seeded legacy records (`f-ui:228`, `g-reviews:56`, `k-review-actions:41`, `travel-date`) still pass the relaxed guard.

## 6. Unresolved questions

1. Finding #1 (P2): extend B13 to assert stored payload, or accept doc-only assurance for AC3 standard-record shape?
2. Finding #6: strip vs drop record when `difficulty` non-string — drop (current) loses all fields of a corrupted record; prefer strip?
3. Plan-summary "27/27" → correct to 28 (special) / 27 (standard)?
4. Should `fetchSpecialTour` gain the `$slug` param form + move to `tests/helpers/` in a follow-up (allow-list blocked both now)?

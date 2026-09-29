# Phase 01 — AC1 schema/GROQ/badge removal + AC2 wiring + AC3 payload & storage consistency

**Status**: Complete · **Priority**: High · **Depends on**: — (self-contained; P2 consumes the i18n tail)

## Context Links
- Schema: `src/sanity/schemaTypes/destination.ts` — `difficultyLevel` `:34-47`, `isSpecialTour` `:48-54`, `category` `:55-68` (untouched). Registration auto: `schemaTypes/index.ts` · `structure.ts:4-7` = `S.documentTypeListItems()` → **no edits**.
- GROQ: `src/sanity/queries/destinations.ts` `difficultyLevel` `:10/:25/:43`, `isSpecialTour` `:11/:26/:44` · `src/sanity/queries/homepage.ts:19` (`FEATURED_DESTINATIONS_QUERY`), `:20` keep. Call sites pass `{region}`/`{slug}` only — projection-only removal, **no param changes**.
- Badge: `src/components/explore/tour-attribute-badges.tsx` (44 LOC): `DIFFICULTY_LEVELS` `:5`, prop `:8`, level logic `:22-26`, difficulty chip `:32-36`, special chip `:37-41`, null-gate `:28`. Consumers: `destination-card.tsx:49-52`, `[slug]/page.tsx:88-91`.
- Booking: `booking-form.tsx` props `:33-40`, destructure `:42-48`, validate `:110`, summary render `:117-127`, section `:151` · `booking-validation.ts` `:45-50` doc, `:51-54` signature, `:77-82` capacity precedent, `:84` rule · `booking-summary.tsx` props `:11-20`, `handlePaid` `:53-71` · `checkout/page.tsx:58-64`.
- Consistency: `booking-history.ts:19` field, `:29-55` guard (`:45`), `:58-70` `listBookings` · `ticket-rows.ts:49` + notes precedent `:50-52` · `my-trips-detail.tsx:48-56` (`:55`).
- i18n (deletion deferred to P2, lockstep): `src/messages/{en,vi}.json:133-138` `destinations.difficulty.*`, `:139` `destinations.special` (keep). Booking ns `:23` label, `:25-27` options, `:56` `difficultyRequired` — **keep all**.

## Overview
- **Priority**: High · **Status**: Complete · **Effort**: ~45 min
- AC1: hard-remove `difficultyLevel` from the `destination` surface (schema, 4 projections, badge chip, `Destination` interface, 2 pass-throughs, i18n keys).
- AC2: plumb `isSpecialTour` from checkout → `BookingForm`; render Section 4 only when true; difficulty validation only when true.
- AC3: omit the `difficulty` key from the persisted record for standard tours, and make storage guard + ticket rows tolerate absent difficulty without losing legacy records.

## Key Insights
- The flag already exists at `checkout/page.tsx:31` — **one prop away**; no query change is needed for AC2 (`DESTINATION_BY_SLUG_QUERY` already projects `isSpecialTour`).
- `ticket-rows.ts:50-52` (notes) already uses conditional spread → difficulty row uses the identical pattern (DRY, no new helper).
- Removing the `difficultyLevel` prop breaks compile at exactly 2 call sites (`destination-card.tsx:50`, `[slug]/page.tsx:89`) + the badge interface — those must be edited in the SAME step or `npm run lint` fails (type error).
- `isTripBooking` is module-private → P2 exercises it through `listBookings()` with a stubbed `window.localStorage` (precedent `reviews.test.ts:60-66`), no export added.
- Spread `...(isSpecialTour === true && { difficulty })` verified type-clean under `tsc --strict` (no TS2698) → use it as written, no ternary needed.

## Requirements
- **Functional**
  - FR1: `difficultyLevel` gone from schema; `isSpecialTour` kept, `initialValue:false`, `description` updated to mention it gates the booking Challenge Level step.
  - FR2: zero `difficultyLevel` occurrences in `src/` after P1 (projections, interface, props).
  - FR3: standard tour (`isSpecialTour !== true`) renders exactly Sections 1-3 + submit; `#booking-difficulty` absent from DOM.
  - FR4: `validateBooking(..., isSpecialTour)` never emits `difficultyRequired` for standard tours; still does when `true`.
  - FR5: standard-tour saved record has NO `difficulty` key; special-tour record has it.
  - FR6: records without `difficulty` survive `listBookings`; legacy `difficulty:""`/`"easy"` survive; non-string `difficulty` is dropped; ticket row absent when value empty/absent.
- **Non-functional**: KISS/YAGNI/DRY · every touched file stays <200 LOC · no new deps · no booking i18n key changes · localStorage-only (no new attack surface).

## Architecture
```
checkout/page.tsx ──isSpecialTour(boolean)──▶ BookingForm ─┬─▶ {flag && <BookingDifficultySection/>}   (AC2 UI)
                                                          ├─▶ validateBooking(values, capacity, flag) (AC2 validation)
                                                          └─▶ <BookingSummary isSpecialTour={flag}/>
                                                                  └─▶ saveBooking({... , ...(flag && {difficulty})})  (AC3)
                                                                          └─▶ localStorage vn-my-trips:v1
                                                                                  ├─ isTripBooking: difficulty OPTIONAL + typed-if-present
                                                                                  └─ buildTicketRows: difficulty row only if non-empty
                                                                                          ├─ booking-summary (checkout)
                                                                                          └─ my-trips-detail (`?? ""`)
destination.ts(−difficultyLevel) ▶ 4 GROQ projections ▶ DestinationCard / [slug] page ▶ TourAttributeBadges(special chip only)  (AC1)
```

## Related Code Files
- **Modify**: `src/sanity/schemaTypes/destination.ts` · `src/sanity/queries/destinations.ts` · `src/sanity/queries/homepage.ts` · `src/components/explore/tour-attribute-badges.tsx` · `src/components/explore/destination-card.tsx` · `src/app/[locale]/explore/destinations/[slug]/page.tsx` · `src/app/[locale]/booking/checkout/page.tsx` · `src/components/booking/booking-form.tsx` · `src/components/booking/booking-validation.ts` · `src/components/booking/booking-summary.tsx` · `src/components/booking/ticket-rows.ts` · `src/lib/booking-history.ts` · `src/components/my-trips/my-trips-detail.tsx`
- **Create**: none · **Delete**: none
- **Read-only**: `booking-difficulty-section.tsx` (unchanged) · `EMPTY_VALUES` `booking-form.tsx:23-31` · `schemaTypes/index.ts` · `structure.ts` · `src/messages/{en,vi}.json` (deletion = P2)

## Implementation Steps
1. **`destination.ts`**: delete the whole `defineField` block `:34-47` (`difficultyLevel`). Edit `isSpecialTour.description` (`:52`) → e.g. `"Turn on to flag this tour as a special tour — also gates the booking form's Challenge Level (Section 4) step."`. Keep `initialValue:false`.
2. **`destinations.ts`**: delete lines `:10`, `:25`, `:43` (`    difficultyLevel,`) — keep every `isSpecialTour,` line. **`homepage.ts`**: delete `:19`.
3. **`tour-attribute-badges.tsx`**: remove `DIFFICULTY_LEVELS` (`:5`), prop `difficultyLevel` (`:8`), level logic (`:22-26`), difficulty chip block (`:32-36`); props become `{ isSpecialTour?: boolean }`; gate becomes `if (isSpecialTour !== true) return null;` (special chip `:37-41` stays); update JSDoc `:12-16` → "Optional special-tour chip… renders nothing when the CMS doc carries no flag."
4. **Same step (compile lockstep)**: `destination-card.tsx` delete interface field `:16` + prop line `:50` (keep `isSpecialTour` `:17/:51`); `[slug]/page.tsx` delete prop `:89` (keep `:90`).
5. **`checkout/page.tsx`**: add `isSpecialTour={destination.isSpecialTour === true}` inside `<BookingForm …/>` (`:58-64`, after `capacity={capacity}`).
6. **`booking-form.tsx`**: add `/** Gates Section 4 (Challenge Level), its validation and its persistence. */ isSpecialTour?: boolean;` to `BookingFormProps` (`:33-40`) + destructure (`:42-48`); replace `:151` with `{isSpecialTour && (<BookingDifficultySection values={values} errors={errors} onChange={change} />)}`; `:110` → `validateBooking(values, activeCapacity, isSpecialTour)`; `<BookingSummary …/>` (`:117-127`) gains `isSpecialTour={isSpecialTour}`.
7. **`booking-validation.ts`**: signature → `values: BookingValues, capacity?: TourCapacity | null, isSpecialTour?: boolean`; `:84` → `if (isSpecialTour === true && !values.difficulty) errors.difficulty = "difficultyRequired";`; extend doc comment `:45-50` with "`isSpecialTour` gates the difficulty rule — omitted/false tours never require it."
8. **`booking-summary.tsx`**: add `isSpecialTour?: boolean` to `BookingSummaryProps` (`:11-20`) + destructure; `:64` → `...(isSpecialTour === true && { difficulty: values.difficulty }),`.
9. **`booking-history.ts`**: `:19` → `difficulty?: string;` (comment: "optional — absent on standard-tour bookings"); `:45` → `(record.difficulty === undefined || isString("difficulty")) &&`. Keep `isString` helper for the other fields.
10. **`ticket-rows.ts`**: `:49` → `...(values.difficulty ? [{ label: t("difficulty"), value: t(values.difficulty) }] : []),` (same position, mirrors notes `:50-52`).
11. **`my-trips-detail.tsx`**: `:55` → `difficulty: booking.difficulty ?? "",`.
12. **Gate (Phase 01)**: `node_modules/.bin/sanity schemas validate` → 0 errors (fallback: `bash -c 'set -a; source .env.local; set +a; node_modules/.bin/sanity schemas validate'`) · `npm run lint` → 0 · `grep -rn difficultyLevel src/` → **0 hits**. `npm test` is an INFORMATIONAL run here: exactly 2 files are expected RED until Phase 02 edits land — `tour-category-queries.test.mts` (still asserts `difficultyLevel` projections) and `booking-logic.test.ts` (still expects unconditional `difficultyRequired`) — plus `c-booking.mjs` in the browser suite. Full 15/15 + 14/15 is asserted at the end of P2 / in P3 (never "fix" those by reverting src).
13. **i18n deletion is NOT in this phase** — it is AC1's tail, executed in Phase 02 step 2 (lockstep: p-tours test must drop its key references first).

## Todo List
- [ ] Delete `difficultyLevel` field + update `isSpecialTour` description (`destination.ts`)
- [ ] Drop `difficultyLevel` from 4 GROQ projections (3× `destinations.ts`, 1× `homepage.ts`)
- [ ] Strip difficulty chip from `tour-attribute-badges.tsx` (special chip + null-gate stay)
- [ ] Remove `difficultyLevel` from `Destination` interface + 2 pass-through props
- [ ] Pass `isSpecialTour` from `checkout/page.tsx` → `BookingForm`
- [ ] Conditional Section 4 render + validate call + summary prop in `booking-form.tsx`
- [ ] `validateBooking` 3rd arg + guarded rule `:84`
- [ ] Conditional `difficulty` spread in `booking-summary.tsx`
- [ ] Optional `difficulty` + relaxed guard in `booking-history.ts`
- [ ] Conditional difficulty row in `ticket-rows.ts` + `?? ""` in `my-trips-detail.tsx`
- [ ] `sanity schemas validate` 0 · `npm run lint` 0 · `grep difficultyLevel src/` = 0 (`npm test` informational — 2 files red until P2)

## Success Criteria
- `sanity schemas validate` → 0 errors; `npm run lint` → 0 (unit/browser full green asserted at end of P2 — see step 12).
- `grep -rn "difficultyLevel" src/` returns **0** hits; `isSpecialTour` still present in schema + 4 projections.
- Standard-tour checkout DOM: exactly 3 `<section h2>` (1/2/3) and `document.querySelector('#booking-difficulty') === null`.
- Special-tour path (unit-forced): `validateBooking(v, cap, true)` with `difficulty:""` → `difficultyRequired`; saved record shape includes `difficulty` only under the flag.
- `listBookings()` returns records lacking `difficulty`, legacy `difficulty:""`/`"easy"`; drops `{difficulty: 123}` and non-booking junk.
- Booking i18n keys unchanged in this phase (deletion happens in P2).

## Risk Assessment
- **Compile break from prop removal** — badge + both call sites edited in one step (steps 3-4); `npm run lint` is the gate.
- **Silent My-Trips data loss** if the guard change is missed — step 9 flagged highest-priority, unit-covered in P2.
- **`isSpecialTour` type from GROQ** may be `boolean | null` — `=== true` normalization at checkout (step 5) removes all ambiguity.
- **`BookingSummary` prop drift** — if forgotten, standard tours persist no difficulty but special tours also would → caught by P2 unit/browser checks (summary-with-difficulty only under `SPECIAL`).
- **`buildTicketRows` label collision** — `key={row.label}` in both lists; omitting the row never collides (no duplicate labels introduced).

## Security Considerations
- Storage remains localStorage-only (`vn-my-trips:v1`); no new endpoint, token, env var, or query param. Guard still rejects malformed records (type-checked when present) → no widening of what is trusted from device-local JSON; no PII added or removed (difficulty is non-PII).

## Next Steps
- Phase 02 (`phase-02-tests.md`): 7 test-file edits **then** the AC1 i18n deletion (−4 keys ×2 locales, parity 789→785).

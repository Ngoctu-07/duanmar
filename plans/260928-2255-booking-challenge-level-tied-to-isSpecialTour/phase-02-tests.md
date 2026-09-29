# Phase 02 — Test edits (spec-changed) + AC1 i18n tail (lockstep)

**Status**: Complete · **Priority**: High · **Depends on**: Phase 01 (src edits must land first)

## Context Links
- Spec-changed tests (record in changelog, precedent F7/B6/j-about-contact): `tests/browser/c-booking.mjs`, `tests/browser/p-tours-category.mjs`, `tests/unit/booking-logic.test.ts`, `tests/unit/tour-category-queries.test.mts`.
- Boilerplate guards (no assertion change): `tests/browser/f-ui.mjs:113-117`, `tests/browser/c-payment.mjs:74-80`, `tests/browser/d8-a11y.mjs:45-47`.
- Flag-fetch pattern: `tests/helpers/cms-expectations.mjs:12-20` (envValue) + `:27-42` (unauthenticated GROQ) · self-contained copy precedent `tests/browser/p-tours-category.mjs:20-44` · window-stub precedent `tests/unit/reviews.test.ts:60-66`.
- i18n targets: `src/messages/en.json` + `vi.json` `destinations.difficulty.{easy,medium,hard,extreme}` block at `:133-138` (4 leaf keys each), `destinations.special` `:139` (KEEP). Booking ns keys `:23/:25-27/:56` KEEP.
- Runners (never edit): `tests/run-unit.mjs` (globs `tests/unit/*.test.{ts,mts}` → 15 files), `tests/run-browser.mjs` (globs `tests/browser/*.mjs` → 15 files, sorted).

## Overview
- **Priority**: High · **Status**: Complete · **Effort**: ~60 min
- Make existing assertions data-driven for the conditional Section 4 (c-booking), remove `difficultyLevel` expectations (tour-category unit + p-tours browser), split/tighten booking-logic checks, add new guard/ticket-row unit checks, and guard boilerplate difficulty clicks.
- Then delete the 4 AC1 i18n keys ×2 locales (**only after** `p-tours-category.mjs` stops referencing them).

## Key Insights
- Live dataset (hcm/hcmc/nyc) almost certainly has NO `isSpecialTour` (field added today) → today's run exercises the **standard branch**; the special branch is exercised by unit tests with an explicit flag, and by c-booking automatically if the doc is later flipped in Studio.
- **No CMS write token** → cannot force a special tour for e2e; data-driven `SPECIAL` is the only honest strategy (no fabricated CMS data).
- `c-booking` hardcodes VI strings (`"4. Mức độ"`, `"Trung bình"`) → unaffected by `destinations.difficulty` deletion; `p-tours` is the ONLY consumer of those keys in `tests/` → edit it FIRST.
- Empty-submit count today = **5** (name/email/phone/date/difficulty; guests already "2" from B8) → standard = **4**. Invalid-fields today = **4** (email/phone/date/difficulty) → standard = **3**.
- `page.click("#booking-difficulty")` throws "No node found" when the section is absent → all 3 boilerplate sites need a `page.$` guard (they make no difficulty count assertions).
- `isTripBooking` is private → assert through `listBookings()` with a stubbed `window.localStorage`.

## Requirements
- **Functional**: both Section-4 branches covered (data-driven + unit); 0 assertions lost that still describe spec; `difficultyLevel` gone from every test; i18n parity 789 → 785 with 0 missing keys.
- **Non-functional**: no edits to runners, `revalidate-webhook.mjs`, `h4-p4-e2e.mjs`, `tests/helpers/*`; no fabricated CMS data; new unit checks stay inside the existing `booking-logic.test.ts` file (file count stays 15).

## Architecture
```
P2-1 p-tours edit ──(frees the keys)──▶ P2-2 i18n deletion (AC1 tail) ──▶ P2-3..6 remaining test edits ──▶ npm test 15/15
c-booking: fetch live isSpecialTour("hcm") ─▶ SPECIAL ─▶ {B7 count, §4 heading, #booking-difficulty presence,
            B9 counts, difficulty click block, summary difficulty row, EN heading count} = SPECIAL ? A : B
booking-logic: validateBooking(v, cap, flag) explicit both ways + buildTicketRows row presence + listBookings guard
```

## Related Code Files
- **Modify (9 = 7 test files + 2 i18n files)**: `tests/browser/p-tours-category.mjs` · `src/messages/en.json` · `src/messages/vi.json` · `tests/browser/c-booking.mjs` · `tests/browser/f-ui.mjs` · `tests/browser/c-payment.mjs` · `tests/browser/d8-a11y.mjs` · `tests/unit/booking-logic.test.ts` · `tests/unit/tour-category-queries.test.mts`
- **Create**: none · **Delete**: none (i18n key deletion = JSON block removal, not file deletion)

## Implementation Steps
**Order is binding: step 1 → step 2 → steps 3-6.**

1. **`tests/browser/p-tours-category.mjs`** (frees the i18n keys):
   - `:12` delete `const LEVELS = ["easy", "medium", "hard", "extreme"];`.
   - `:37` projection → `'*[_type == "destination"]{ "slug": slug.current, name, category, isSpecialTour }';` (drop `difficultyLevel`).
   - `labelsOfTarget` `:88-96`: delete the difficulty branch `:90-92`; keep the `isSpecialTour === true` push `:93` and the throw `:94`.
   - `:196-199` → `const badgeLabels = [msg.vi.destinations.special];`.
   - `flagged` `:200-204` → `const flagged = cats.filter((d) => d.isSpecialTour === true);`.
   - `hcmFlagged` `:273-276` → `const hcmFlagged = hcmDoc && hcmDoc.isSpecialTour === true;`.
   - **KEEP** check names `P14 flagged doc card shows its badge labels`, `P14 no flagged docs → no badge labels on any card`, `P18 detail chip row badges match live CMS data` + the data-driven pattern (22 checks → still 22).
2. **AC1 i18n tail (lockstep)**: in BOTH `src/messages/en.json` and `vi.json` delete the whole `"difficulty": { "easy", "medium", "hard", "extreme" },` block inside `destinations` (`:133-138`); KEEP `"special"` (`:139`) and every `booking.*` key. Parity **789 → 785** (structural parity test asserts both files → delete from both in the same edit).
3. **`tests/browser/c-booking.mjs`** (data-driven SPEC coverage):
   - Add near the top (module scope, after the `check` helper): local `envValue(key)` copied from `cms-expectations.mjs:12-20` + `async function fetchSpecialTour(slug)` doing the unauthenticated GROQ `*[_type=="destination" && slug.current==$slug][0]{ "flag": isSpecialTour }` (URL shape from `p-tours-category.mjs:36-43`). **Do NOT edit `tests/helpers/*`** (outside allow-list).
   - After `:30` (`const bd = …`): `const SPECIAL = (await fetchSpecialTour("hcm")) === true;`
   - `:57` → `check("B7 sections = SPECIAL ? 4 : 3", headings.length === (SPECIAL ? 4 : 3), JSON.stringify(headings));`
   - `:61` → `if (SPECIAL) check("B7 section 4 difficulty", headings[3]?.startsWith("4. Mức độ"), headings[3]);`
   - New right after: `check("B7 #booking-difficulty present iff SPECIAL", SPECIAL ? Boolean(await page.$("#booking-difficulty")) : (await page.$("#booking-difficulty")) === null);` (AC2 proof).
   - `:116` → `check("B9 empty submit shows SPECIAL ? 5 : 4 inline errors", errorTexts.length === (SPECIAL ? 5 : 4), JSON.stringify(errorTexts));`
   - `:134` → `check(SPECIAL ? "B9 invalid email + phone + difficulty + date flagged" : "B9 invalid email + phone + date flagged", invalid.length === (SPECIAL ? 4 : 3), JSON.stringify(invalid));`
   - `:136-151` wrap the whole difficulty block (click `:137`, options `:145`, select `:150`) in `if (SPECIAL) { … }`.
   - `:169` → `if (SPECIAL) check("B9 summary keeps difficulty", values.includes("Trung bình"), JSON.stringify(values));` plus new `if (!SPECIAL) check("B9 summary omits difficulty row", !values.includes("Trung bình"), JSON.stringify(values));` (AC3 proof).
   - `:194` → `… && enHeadings.length === (SPECIAL ? 4 : 3) …`.
   - All other checks (B6/B8/B9-submit/B10/B11-first-heading/B12) identical.
4. **Boilerplate guards** (no assertion edits):
   - `f-ui.mjs:113-117` → `if (await page.$("#booking-difficulty")) { await page.click("#booking-difficulty"); await sleep(300); const opt = …; if (opt.asElement()) await opt.asElement().click(); await sleep(200); }`
   - `c-payment.mjs:74-80` → same guard around the click + `option` select block.
   - `d8-a11y.mjs:45-47` → same guard around the one-line click + `opt` select.
5. **`tests/unit/booking-logic.test.ts`**:
   - `:83-101` empty-form: call `validateBooking({ … }, undefined, false)`; expected object drops `difficulty: "difficultyRequired"` (`:99`).
   - `:128-133` replace with TWO checks:
     - `"B2: difficulty required when isSpecialTour=true"` → `assert.equal(validateBooking({ ...base, difficulty: "" }, undefined, true).difficulty, "difficultyRequired")`.
     - `"B2: difficulty NOT required when isSpecialTour=false or omitted"` → both `validateBooking({ ...base, difficulty: "" }, undefined, false)` and `validateBooking({ ...base, difficulty: "" })` return `undefined`.
   - KEEP `base.difficulty:"medium"` fixture `:69-77` and every other check (valid form `:79-81` still `{}` for both flag values).
   - NEW checks (same file → unit file count stays 15):
     - `ticket rows: difficulty row only when value set` — import `buildTicketRows`; fake translator `const t = ((key: string) => key) as unknown as ReturnType<typeof useTranslations>` (type-only import); `difficulty:""` → no row with `label === "difficulty"`; `difficulty:"medium"` → row present with `value === "medium"`.
     - `listBookings keeps records without difficulty + legacy strings, drops corrupt` — stub `globalThis.window.localStorage` (precedent `reviews.test.ts:60-66`, restore in `finally`); seed via `BOOKINGS_STORAGE_KEY`: 1 record with NO difficulty key, 1 with `""`, 1 with `"easy"` → all 3 returned; 1 with `difficulty: 123`, `{junk:true}`, `"nope"` → all dropped.
6. **`tests/unit/tour-category-queries.test.mts`** (16 → 14 checks):
   - Delete check `:49-51` (`category query projects difficultyLevel`).
   - Delete check `:57-59` (`DESTINATIONS_QUERY projection gained difficultyLevel`).
   - `:70-75`: drop `:71` (difficultyLevel assert); rename check → `"DESTINATION_BY_SLUG_QUERY: isSpecialTour + $slug, no $category"`.
   - `:77-81`: drop `:78` (difficultyLevel assert); rename → `"FEATURED_DESTINATIONS_QUERY: isSpecialTour, no new params"`.
   - KEEP `:100` `assert.ok(!q.includes("difficultyLevel"))` negative (slug queries) — still a valid regression guard.
7. **Gate**: `npm test` → **15/15 files** (new checks inside existing files) · `npm run lint` → 0.

## Todo List
- [ ] P2-1 `p-tours-category.mjs`: drop `LEVELS` + difficulty branches (3 fixed points + GROQ projection), keep P14/P18 names
- [ ] P2-2 delete `destinations.difficulty.*` (4 keys) from `en.json` + `vi.json`; keep `destinations.special` + all booking keys → parity 785/785
- [ ] P2-3 `c-booking.mjs`: inline flag fetch + `SPECIAL` + 8 conditional edits + 2 new presence/absence checks
- [ ] P2-4 `page.$` guards in `f-ui` / `c-payment` / `d8-a11y`
- [ ] P2-5 `booking-logic.test.ts`: split difficulty checks, explicit flag both ways, +2 new checks (ticket rows, guard)
- [ ] P2-6 `tour-category-queries.test.mts`: −2 checks, trim 2 → 14
- [ ] `npm test` 15/15 · `npm run lint` 0

## Success Criteria
- `grep -rn "difficultyLevel" tests/ src/messages/` → **exactly 1 hit**: the intentional negative guard `!q.includes("difficultyLevel")` (`tour-category-queries.test.mts:100`). `grep -rn "difficultyLevel" src/` → 0.
- `grep -rn "destinations.difficulty" tests/ src/` → 0 hits; `destinations.special` still referenced by `tour-attribute-badges.tsx` + `p-tours`.
- Unit suite 15/15 files; `tour-category-queries` prints `14/14 assertions`; `booking-logic` includes both flag branches + 2 new checks.
- Browser: `c-booking` runs both branches logically (`SPECIAL ? A : B`), no exception, 0 pageerror.

## Risk Assessment
- **i18n deletion before p-tours edit** → fatal TypeError. Mitigation: binding order step 1 → step 2; `npm test` runs before any browser test anyway.
- **`SPECIAL` fetch failure** (network/env) → make `fetchSpecialTour` return `undefined` on non-ok → `SPECIAL = false` (standard branch = today's reality); never throw out of the helper (a thrown exception fails the whole file).
- **Splitting checks could mask a regression** → both branches asserted in the SAME check name pattern; `base.difficulty:"medium"` fixture kept so the special branch is a real assertion, not a vacuous one.
- **Fake `t` in unit test** → row label/value are the raw keys; assert key presence, not localized copy (localization is covered by browser tests).

## Security Considerations
- New GROQ read is unauthenticated published-content only (same as `cms-expectations.mjs`), read-only, no token, no write; localStorage stub in tests never touches real storage beyond the fake map.

## Next Steps
- Phase 03 (`phase-03-pipeline-changelog-review.md`): full pipeline, changelog EOF entry (incl. test-edit precedent note), status flips, `reports/plan-summary.md`, code-reviewer delegation.

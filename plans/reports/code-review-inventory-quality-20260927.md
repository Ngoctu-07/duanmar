# Code Review — Daily Inventory & Dynamic Date Validation (Stage 2, code quality)

- **Date**: 2026-09-27
- **Scope**: read-only review of the 9 files + `booking` i18n namespace listed in the task. No edits, no builds, no test runs.
- **Baseline**: `D:\tour` has **no VCS** (only `.gitignore`, `Is git repo: no`) → no diff available. "Unjustified extras" judged against `plans/260927-1420-daily-inventory-and-capacity-validation/{plan.md,phase-01,phase-02,phase-03}.md`.
- **Tests**: not run (read-only mandate). Claimed results cross-checked against artifacts (see §4).

---

## 1. Findings

| # | Severity | file:line | Issue | Suggested fix |
|---|----------|-----------|-------|---------------|
| 1 | **Major** | repo-wide (`package.json:5-10`, `:39-48`) | Zero automated tests in the repository: `scripts` = `dev/build/start/lint` only, no test runner in `devDependencies`, `find` returns no `*.test.ts(x)`/`*.spec.ts` under `src/`. Claimed suites (unit 14+13+11, e2e 12, regression 5) live only in `%TEMP%\opencode\*.test.mts|.mjs`. Nothing in the repo can re-run or regress-guard this feature. | Land the temp-dir harnesses into e.g. `tests/` + a `test` script (node `--test` or `tsx`), or record in `docs/code-standards.md` that tests are permanently ephemeral and why. |
| 2 | Minor | `src/components/booking/booking-validation.ts:98` | `travelDateErrorAfterGuestsChange` defines "valid guests" as `Number.isInteger(guests) && guests >= 1` — **no `MAX_GUESTS` check**, while `validateBooking` (`:63-64`) rejects `count > 99`. Typing `100` in the guests field (`max={99}` on a `type="number"` input does not block typing) → `dateFull` appears under the date even though submit would report `guestsInvalid` and drop `dateFull`. Violates spec bullet "dateFull only when guests field is valid"; also a DRY violation (two validity definitions in one file). | Export one `isValidGuests(count)` used by both `validateBooking` and the helper: `Number.isInteger(c) && c >= 1 && c <= MAX_GUESTS`. |
| 3 | Minor | `src/lib/tour-capacity.ts:27` | `Number.isInteger(max) && max >= 1` accepts unsafe/huge integers. Verified: `Number.isInteger(1e21) === true` while `Number.isSafeInteger(1e21) === false`. An admin entering `1e21` in Sanity (rule is only `min(1).integer()`, `tour-pricing.ts:149`) yields badge text `1.000.000.000.000.000.000.000 chỗ trống` (~3 lines) inside a fixed 54px button with **no `overflow:hidden`** (verified `src/style.css` `.rdp-day_button` block) → text spills over neighbouring cells. | `if (!Number.isSafeInteger(max) || max < 1 || max > 999) return null;` (or clamp badge rendering to e.g. `>999` → `999+`). |
| 4 | Minor | `src/components/booking/travel-date-field.tsx:95` | `today = new Date()` is evaluated **per render on both server and client**. SSR at 23:59:59 vs hydration at 00:00:01 shifts `travelDateWindow` → badge set + disabled set differ → React hydration mismatch. Window-only mismatch pre-exists this feature; the badge is a new, *textual* mismatch surface. | Pass `today` from the RSC (checkout page) or freeze it in `useState(() => new Date())`. |
| 5 | Minor | `src/components/booking/booking-form.tsx:71-83` | Inside the `setErrors` updater, `values.travelDate` and `activeCapacity` are read from the render scope (`values.travelDate` at `:77`). Updaters are meant to be pure functions of their argument; React may re-invoke them (StrictMode/concurrent). Today each keystroke is its own batch so the value is correct — but a batched `change("travelDate") + change("guests")` would revalidate against a stale date. | Compute the guests branch before calling `setErrors` (from the current `values`), or thread `travelDate` through a ref / use a single `validateBooking`-style reducer. |
| 6 | Minor | `docs/project-changelog.md` | Plan phase-03 step 6 (changelog "Daily Inventory" entry + roadmap) not done: `grep -iE "inventory\|occupancy\|chỗ trống"` on `docs/` → no hit for this feature (only an unrelated `capacity` mention at `:149`). | Add the changelog entry; mark plan todo P6/`phase-03` status. |
| 7 | Nit | `src/components/booking/travel-date-field.tsx:117-119` vs `:147` | Locale decision duplicated: `locale.startsWith("vi") ? vi : enUS` written twice (label function + `locale` prop). One edit site can drift from the other. | `const rdpLocale = locale.startsWith("vi") ? vi : enUS;` then use `rdpLocale.labels?.labelDayButton` and `locale={rdpLocale}`. |
| 8 | Nit | `src/components/booking/travel-date-field.tsx:104-110,125` | `badgeFor` is a fresh closure each render → `CapacityContext.Provider` value identity churns → all `CapacityDayButton`s re-render on any form keystroke. No extra cost in practice (DayPicker re-renders wholesale anyway). | `useMemo(() => (iso) => {...}, [capacity, min, max, t])` if the calendar ever gets expensive. |
| 9 | Nit | `src/lib/tour-capacity.ts:48-69` + `src/sanity/schemaTypes/occupancy-field.ts:13-14` | Double-count risk (by design, spec says `booked = CMS occupancy + device bookings`): a booking made on this device that the admin *also* enters in `occupancy[]` is subtracted twice → shows fewer spots than reality. Mitigated by the field description "…through other channels". | Keep; the Studio description already scopes it. Consider a line in `docs/` for editors. |
| 10 | Nit | `src/components/booking/booking-validation.ts:96-103` | Helper never re-checks the window: if `previous` is `undefined`/`dateFull` and the picked date has since rolled out of the 7-day window, it returns `dateFull` instead of `dateOutOfRange` (spec priority `dateOutOfRange > dateFull` only holds for *previous* errors). Practically unreachable (calendar can't select out-of-window days; needs an open tab for 7 days). | Call `isTravelDateAllowed(travelDate)` first in the helper, or accept & document. |
| 11 | Nit | `src/lib/tour-capacity.ts:57-66` | `mergeDeviceBookings` sums every row for `slug`+`travelDate` without de-duping `reference`. `listBookings()` also doesn't dedupe (only `saveBooking` upserts by reference, `booking-history.ts:64-66`) → hand-edited/legacy duplicate entries double-count. | Dedupe by `reference` in `listBookings()` (single choke point). |
| 12 | Nit | `src/sanity/queries/tour-pricing.ts:14` | All occupancy rows are fetched forever (past dates never pruned); payload and `mapTourCapacity` work grow with editor hygiene. | Document "delete past dates" for editors, or filter to the booking window server-side if the array ever gets large. |

No Critical findings.

---

## 2. Detail on the findings that matter

### #1 — Tests are not in the repository (verifiability)

```jsonc
// package.json:5-10
"scripts": { "dev": "next dev", "build": "next build", "start": "next start", "lint": "eslint ." }
// devDependencies:39-48 → @types/*, eslint, eslint-config-next, typescript — no vitest/jest/playwright/tsx
```
`find . -name "*.test.ts*" -not -path "./node_modules*"` → **0 project tests**. The artifacts do exist and are real (`%TEMP%\opencode\tour-capacity.test.mts` = 13 `check()`, `h2-capacity-validation.test.mts` = 14, `travel-date.test.mts` = 11 → matches the claimed "14+13+11"; `h6-render-capacity.test.mts` actually renders `TravelDateField` via `renderToStaticMarkup` + `NextIntlClientProvider`), so the claim is plausible — just unreproducible from the repo. `plans/.../phase-03.md` explicitly mandates "script test để temp dir", i.e. the gap is a plan decision, not an accident. Flagging it anyway: a cloned repo has no regression protection for this feature (or any other).

### #2 — Two definitions of "valid guests"

```ts
// booking-validation.ts:62-64 (validateBooking)
else if (!Number.isInteger(count) || count < 1 || count > MAX_GUESTS) errors.guests = "guestsInvalid";
// booking-validation.ts:98 (helper)
const requestedValid = Number.isInteger(guests) && guests >= 1;
```
Reachable path: guests input `type="number" max={99}` (`booking-pricing-section.tsx:49-52`) does not block typing `100`. `change()` (`booking-form.tsx:74-80`) clears the guests error and calls the helper → `requestedValid === true` → `isDateBookable(capacity, date, 100)` false → `dateFull` rendered under the date, with **no** guests error shown (it is only computed on submit). On submit the roles swap (`!errors.guests` guard at `:70` suppresses `dateFull`, `guestsInvalid` shows). Test gap confirmed: `h2-...:159` only feeds `0` and `Number("x")` as "invalid guests" — never `> 99`.

### #3 — `maxCapacity` overflow

```ts
// tour-capacity.ts:27
if (typeof max !== "number" || !Number.isInteger(max) || max < 1) return null;
```
Node evidence: `Number.isInteger(1e21) → true`, `Number.isSafeInteger(1e21) → false`, `Intl.NumberFormat('vi').format(1e21) → "1.000.000.000.000.000.000.000"`. Badge CSS (`travel-date-field.tsx:58`) is `block max-w-full text-center text-[9px]` — wraps, does not clip (`.rdp-day_button` has no `overflow`, verified in `node_modules/react-day-picker/src/style.css:89-104`), so >2 lines spill out of the fixed `--rdp-day_button-height: 54px`.

### #4/#5 — React correctness (the two asked-about risks that are OK, and the ones that aren't)

- **Hydration / `activeCapacity`** — OK. `useState(() => capacity ?? null)` (`booking-form.tsx:54-56`) seeds the *server* prop, so SSR markup and the hydration render are identical; device bookings are merged only in `useEffect` (`:58-63`), which cannot affect hydration. Residual risk is only the `new Date()` default (#4).
- **Merge loop** — OK. Effect deps are `[capacity, slug]`; the state it sets (`activeCapacity`) is not a dep, and `capacity` identity comes from an RSC prop (no client parent re-renders it) → runs once per mount. Also `mergeDeviceBookings(null, …)` returns `null` (`tour-capacity.ts:53`) so P4 stays P4.
- **Stale closure** — real but low-impact: see #5. The `previous.travelDate` read *inside* the updater is correct (that's the argument), only the `values`/`activeCapacity` captures are external.

### #7 — locale duplication evidence
```ts
const localeLabel = locale.startsWith("vi") ? vi.labels?.labelDayButton : enUS.labels?.labelDayButton; // :117-119
locale={locale.startsWith("vi") ? vi : enUS}                                                          // :147
```

---

## 3. Spec compliance matrix

| Spec bullet | Verdict | Evidence |
|---|---|---|
| `tourPricing` optional `maxCapacity` (int ≥1) + `occupancy[]{date,booked}` | ✅ | `tour-pricing.ts:143-151` (`rule.min(1).integer()`, no `.required()`), `occupancy-field.ts:37-64` (`.required().min(0).integer()`, duplicate-date custom validation `:29-31`) |
| `TOUR_PRICING_BY_SLUG_QUERY` exposes both; `ALL_TOUR_PRICING_QUERY` unchanged | ✅ | `queries/tour-pricing.ts:13-14` vs `:19-27` (still only `tourSlug` + 2 tier prices) |
| `mapTourCapacity` → `null` on missing/invalid (P4) | ✅ | `tour-capacity.ts:26-27`; covers `null`, `{}`, `0`, `1.5`, `-2`, `"10"` (unit `h1:41-56`) |
| `mergeDeviceBookings` by slug+date from `vn-my-trips:v1` | ✅ | `tour-capacity.ts:57-66`; key at `booking-history.ts:27`, filter/sort at `:44-56` |
| `remainingSlots` clamp ≥0 | ✅ | `tour-capacity.ts:77` `Math.max(0, max - booked)`; overbooked covered by unit `h1:120` |
| `isDateBookable`: invalid guests → 1; `null` → always true | ✅ | `tour-capacity.ts:90-94`; unit `h1:144-156` |
| Badge under in-window days, "N chỗ trống"/"Hết chỗ", 0 → disabled | ✅ | `travel-date-field.tsx:104-110` (window gate `iso < min \|\| iso > max`), `:56-65` render, disabled via matcher `:141-142`; render test `h6:80-120` asserts badge + `disabled` + aria |
| Out-of-window days / no-capacity visuals unchanged | ✅ | `badgeFor` returns `null` outside window; `CAPACITY_CELL` applied only `when capacity` (`:132`), default rdp 44px otherwise (`h6:87`) |
| guests > remaining → day disabled reactively | ✅ | matcher closes over `requestedGuests` (`:114-115`, `:141-142`); re-render driven by `guestCount` prop |
| chosen date loses capacity on guests change → `dateFull` | ✅ (edge gap #2) | `booking-form.tsx:74-80` → `booking-validation.ts:90-104` |
| Pure helper extracted to `booking-validation.ts` | ✅ | `travelDateErrorAfterGuestsChange` `:90-104` |
| Priority `dateRequired > dateOutOfRange > dateFull` | ✅ | else-if chain `booking-validation.ts:67-74`; helper preserves `dateRequired`/`dateOutOfRange` (`:96`); unit `h2:65-79,148` |
| `dateFull` only when guests field valid | ⚠️ edge | `:70` guard in `validateBooking` ✅; helper's `requestedValid` misses `MAX_GUESTS` → finding #2 |
| i18n keys in both EN/VI, key parity | ✅ | `en.json:15,16,51` / `vi.json:15,16,51`; programmatic parity check → `total en 700 vi 700`, `missing in vi: []`, `missing in en: []`, `booking en 51 vi 51`; EN uses ICU plural, VI plain `{count}` (plan phase-02 step 1 matches exactly) |
| Files <200 lines | ✅ | 95 / 156 / 66 / 27 / 178 / 136 / 104 / 55 / 64 (`wc -l`) — no extraction of `capacity-day-button.tsx` needed |
| No unjustified extras | ✅ | Only additions vs plan: `data-testid` hooks (used by `h6`), `today` test-injection prop, `leading-[1.1]` instead of plan's `leading-none`, width 46px (plan explicitly allows "nếu chật giảm 46px"). `tierPreviewLabel` is pre-existing (changelog 260926). |
| Docs updated (plan phase-03) | ❌ | finding #6 |

### React-day-picker v10 API usage — verified against `node_modules/react-day-picker@10.0.1`

| Usage | Verdict | Evidence |
|---|---|---|
| `components={{ DayButton: CapacityDayButton }}` | ✅ | `CustomComponents.DayButton: typeof components.DayButton` (`types/shared.d.ts:29`), exported from `components/custom-components.d.ts:4`; prop type `Partial<CustomComponents>` (`types/props.d.ts:254`). Signature match: `DayButtonProps = Parameters<typeof DayButton>[0]`. |
| Spreading `{...props}` incl. `day`/`modifiers` onto `DayButton` | ✅ | `components/DayButton.js` destructures `const { day, modifiers, ...buttonProps } = props` → no invalid DOM attrs. |
| `labels.labelDayButton` function-type guard | ✅ | `getLabels()` (`helpers/getLabels.js:22-38`) prefers `customLabel` and normalises string locale labels; `DayPickerLocaleLabels = { [K in keyof Labels]?: string \| Labels[K] }` (`classes/DateLib.d.ts:10-12`) → the "may be a plain string" comment is accurate. Runtime: `typeof vi.labels.labelDayButton === 'function'`. Call arity matches `labelDayButton(date, modifiers, options, dateLib)` (`DayPicker.js:336`). |
| aria-label actually includes badge | ✅ | `DayPicker.js:336` sets `"aria-label": labelDayButton(...)` on the button; wrapper appends `, ${badge.text}` (`travel-date-field.tsx:150-154`). aria-label overrides inner text → no double announcement. |
| `disabled` matcher array = OR semantics | ✅ | `utils/dateMatchModifiers.js` → `matchersArr.some(...)`; function matchers supported (`typeof matcher === "function"` branch) → `[{before},{after},fn]` = disabled if any matches, exactly as intended. |
| `import "react-day-picker/style.css"` resolves | ✅ | `package.json` exports `./style.css` → `./src/style.css`; CSS vars `--rdp-day-width/-height/-day_button-*` exist (`src/style.css:6-12`). |

### Security / performance / style

- **XSS/injection**: `grep -rn dangerouslySetInnerHTML src/components/booking src/lib/tour-capacity.ts "src/app/[locale]/booking"` → 0 hits. CMS strings reach the UI only as React text (`destination.name`, `checkout/page.tsx:50`); badge text = i18n + numeric `count`; day aria-label = date formatting + i18n. `slug` from `?tour=` is only interpolated into a relative `href` (`/explore/destinations/${…}`, always prefixed) and gated by `if (!destination) notFound()`. No secrets in any reviewed file. ✅
- **Performance**: per-day work is `toIsoDate` + one `Record` lookup ×2 (badge + label); `useTranslations` memoised by next-intl; `mapTourCapacity` runs once in the RSC. No heavy work in render; only the un-memoised context value (#8). ✅
- **Style**: kebab-case filenames, self-documenting names (`badgeFor`, `mergeDeviceBookings`, `travelDateErrorAfterGuestsChange`), comments are intent/why only (e.g. `:53` hydration note, `:116` string-label note). One `eslint-disable react-hooks/set-state-in-effect` with an inline justification (`booking-form.tsx:59`) — matches the documented `my-trips` pattern. ✅

---

## 4. Test-claim cross-check (read-only)

| Claim | Artifact | Count |
|---|---|---|
| unit 14 | `%TEMP%\opencode\h2-capacity-validation.test.mts` | 14 `check()` |
| unit 13 | `%TEMP%\opencode\tour-capacity.test.mts` | 13 `check()` |
| unit 11 | `%TEMP%\opencode\travel-date.test.mts` | 11 `check()` |
| (extra) component render | `h6-render-capacity.test.mts` | 11 `check()` incl. badge/disabled/aria/locale |
| e2e 12 / regression 5 | `c-booking.mjs`, `c-payment.mjs`, `f-ui.mjs`, `d8-a11y.mjs`, `g-header.mjs` | 5 scripts present |
| tsc/eslint/build exit 0 | not re-run (read-only mandate) | — |

Coverage gaps worth closing: guests `> MAX_GUESTS` in the helper (finding #2), `maxCapacity` unsafe integer (#3), midnight-rollover hydration (#4).

---

## 5. Unresolved questions

1. Should tests stay ephemeral (temp dir) permanently? If yes, `docs/code-standards.md` should say so; if no, finding #1 needs a follow-up task.
2. No VCS in `D:\tour` — is a baseline diff available elsewhere (zip/backup)? Without it I could not prove `RDP_THEME`, the `today` prop, and the red-calendar classNames are pre-existing (plan phase-02 text strongly implies they are).
3. Changelog/roadmap (#6): intentionally deferred to a later phase, or missed?
4. Do you want an editor-facing rule for pruning past `occupancy` dates (#12), or is unbounded growth acceptable?
5. Should `occupancy` be capped (e.g. `maxCapacity ≤ 999`) at the Sanity schema level (#3), or only defended in `mapTourCapacity`?

---

**Status:** DONE_WITH_CONCERNS
**Summary:** Feature matches the approved spec (schema/query/lib/calendar/validation/i18n/parity all verified, rdp v10 API usage correct, no XSS, all files <200 lines); 1 Major process gap (no tests in the repo) and 4 Minor code issues (guests-validity divergence, unsafe `maxCapacity`, midnight hydration surface, stale read inside a `setErrors` updater) should be addressed.
**Concerns/Blockers:** Test suites exist only in `%TEMP%` — "all tests green" cannot be reproduced from the repository; `docs/project-changelog.md` not yet updated per plan phase-03.

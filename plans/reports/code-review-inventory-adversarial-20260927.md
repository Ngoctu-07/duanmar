# Adversarial (Red-Team) Review — Daily Inventory & Capacity Validation

- **Date**: 2026-09-27 · **Mode**: read-only reasoning (no edits, no builds, no test runs)
- **Scope**: `src/lib/tour-capacity.ts`, `src/components/booking/{booking-validation.ts,booking-form.tsx,travel-date-field.tsx,booking-date-section.tsx,booking-summary.tsx,booking-payment-section.tsx,booking-pricing-section.tsx,booking-field.tsx}`, `src/app/[locale]/booking/checkout/page.tsx`, `src/sanity/schemaTypes/{tour-pricing.ts,occupancy-field.ts}`, `src/sanity/queries/tour-pricing.ts`, `src/lib/{booking-history.ts,date-window.ts,pricing.ts}`, `src/sanity/lib/{client.ts,fetch-published.ts}`, `src/messages/{en,vi}.json`
- **Method**: attack each vector by reading code + library internals (`node_modules/react-day-picker@10.0.1` inspected directly, no builds). Cross-checked against prior reviews `code-review-inventory-quality-20260927.md` and `code-review-booking-payment-mytrips-20260927.md` — findings below are new or strengthened, overlaps are marked.
- **No Critical found.** 1 Major + 7 Minor "Accept/Defer" + 6 Nit; 14 attack claims rejected with proof.

---

## 1. Findings table

| # | Severity | file:line | Vector | Finding | Verdict |
|---|----------|-----------|--------|---------|---------|
| A1 | **Major** | `travel-date-field.tsx:95,100,105,139-140` | 4 | SSR/client clock+TZ divergence shifts the 7-day window → `disabled` attrs **and badge text** differ at hydration → React hydration error on every checkout load when host TZ ≠ user TZ (7 h/day for UTC host vs VN users) | **Accept** |
| A2 | Minor | `booking-validation.ts:98` + `travel-date-field.tsx:114-115` | 5,6 | Guest validity defined twice without `MAX_GUESTS`: typing `100` (max attr doesn't block typing) disables **every** date on the calendar and shows `dateFull` live, while submit says `guestsInvalid` and suppresses `dateFull` — wrong error key, two different truths | **Accept** |
| A3 | Minor | `booking-form.tsx:58-63` | 1,7 | Merged capacity read **once per mount** from localStorage; no `storage` listener, no refresh on focus → second tab / bfcache-restored tab keeps serving stale "N spots left" and allows over-capacity submit | **Defer** |
| A4 | Minor | `tour-capacity.ts:35-37` | 3,8 | One malformed occupancy row (missing/invalid `booked`, non-`YYYY-MM-DD` date key) is silently dropped while the rest of the capacity stays "confident": that date shows full availability with a `N spots left` badge — silent per-date under-block, no log | **Defer** |
| A5 | Minor | `tour-capacity.ts:27` | 3,8 | `maxCapacity = 0` (reachable via API write; Studio `rule.min(1)` only guards Studio) maps to `null` → "no capacity configured" → tour shows **unlimited** availability instead of "closed" | **Defer** |
| A6 | Minor | `travel-date-field.tsx:149-155` + rdp internals | 7 | Capacity/sold-out days are unreachable by roving keyboard focus (rdp skips disabled days in `getNextFocus`, native `disabled` not tabbable) → the capacity `aria-label` is never read for the days where it matters; if *every* window day is disabled, the grid has **no** `tabIndex=0` target at all | **Defer** |
| A7 | Minor | `checkout/page.tsx:28,35` + `booking-payment-section.tsx:72` | 8 | Missing/empty pricing doc is not a 404 path: form submits OK, summary claims "Booking request received", but `total === null` → payment section renders `null` → nothing is persisted and no error is shown (P4 itself holds — capacity is `null`, nothing blocks) | **Defer** |
| A8 | Minor | `sanity/lib/client.ts:9` + `fetch-published.ts` | 3 | `useCdn: true` → occupancy edits lag by CDN TTL (inventory is only advisory); and `.catch(() => null)` turns any transient Sanity failure into "capacity unconfigured" → **all** dates free until the next successful fetch (P4-compliant, but a fail-open window) | **Defer** |
| N1 | Nit | `tour-capacity.ts:64-65`, `booking-history.ts:36` | 2,3 | `bookedByDate` is a plain object keyed by unvalidated strings (`travelDate` only checked as `typeof === "string"`): a corrupt `travelDate: "__proto__"` triggers `[object Object]3` concat then an ignored `__proto__` setter; `constructor` shadows read for that key. No pollution achieved, but `Object.create(null)`/`Map` would remove the class of bug | **Defer** |
| N2 | Nit | `booking-summary.tsx:38-40` + `booking-history.ts:64-66` | 1 | Reference = `Date.now().toString(36)` (ms resolution); `saveBooking` **dedupes by reference**, so two references colliding in the same ms would silently drop one booking → under-count → over-block | **Defer** |
| N3 | Nit | `booking-history.ts:44-56` + `tour-capacity.ts:57-66` | 2 | Merge sums every row for slug+date with no de-dupe by `reference`; `listBookings()` accepts any array of shape-valid rows → hand-edited/legacy duplicates double-count (over-block) | **Defer** |
| N4 | Nit | `booking-form.tsx:75-80` | 1 | `values.travelDate` / `activeCapacity` read from render scope *inside* the `setErrors` updater (impure updater). No repro today (one field per event, discrete events flush before the next) — latent | **Defer** |
| N5 | Nit | `tour-capacity.ts:27` + `travel-date-field.tsx:32-37,58` | 3 | `Number.isInteger(1e21) === true` → badge `1.000.000.000.000.000.000.000 chỗ trống` wraps past the fixed `--rdp-day_button-height: 54px` (no `overflow`), spilling into neighbours (same root cause as quality-review #3) | **Defer** |

---

## 2. Detail — the findings that matter

### A1 (Major, Accept) — window/badge hydration mismatch: not just midnight, *timezone*

```ts
// travel-date-field.tsx:95
today = new Date(),
// :100
const { min, max } = travelDateWindow(today);
// :105
if (iso < min || iso > max) return null;
// :139-141
{ before: minDate },
{ after: maxDate },
(date) => !isDateBookable(capacity ?? null, toIsoDate(date), requestedGuests),
```

`toIsoDate` (`date-window.ts:5-10`) uses **local** `getFullYear/getMonth/getDate`. The component is SSR'd (`BookingForm` is `"use client"` but client components still render on the server) and the checkout page is dynamic (`await searchParams`, `checkout/page.tsx:14,27`).

- Server renders with the **host** date; the client hydrates with the **browser** date.
- No TZ is pinned anywhere: `next.config.ts` has no `TZ`, no Dockerfile/env pin, nothing in `docs/`. Node on most hosts (Vercel/containers) runs **UTC**; the target audience is UTC+7 → for **00:00–07:00 local every day** server date = client date − 1.
- Divergence → `min`/`max` shift one day → the boundary day's `disabled` attribute differs **and** `badgeFor`'s `iso < min || iso > max` flips → **badge text differs** ("…, 3 spots left" present in SSR, absent on client, or vice versa). Text mismatch = guaranteed React hydration error (`onRecoverableError` → full client re-render of the calendar, red console error).
- This repo already treats hydration errors as P1 (`docs/project-changelog.md:12-15` fixed 3 prior hydration issues).
- The window-only half pre-dates this feature; the **badge text** is a new, textual mismatch surface introduced by this feature. Prior quality review rated it Minor considering only the 23:59→00:00 case; the TZ case makes it routine.
- **Fix (cheap)**: pass `today` from the RSC (`checkout/page.tsx` → `BookingForm` → `TravelDateField`) so server and client first-render compute identical `min`/`max`, or freeze it in a lazily-initialized state seeded from a server-rendered value. Note `useState(() => new Date())` alone fixes rollover but **not** TZ.

### A2 (Minor, Accept) — two definitions of "valid guests", wrong error key shown

```ts
// booking-validation.ts:63-64 (submit)
else if (!Number.isInteger(count) || count < 1 || count > MAX_GUESTS)
  errors.guests = "guestsInvalid";
// booking-validation.ts:98-102 (live, guests change)
const requestedValid = Number.isInteger(guests) && guests >= 1;
const dateFull = Boolean(
  requestedValid && travelDate && capacity && !isDateBookable(capacity, travelDate, guests)
);
if (dateFull) return "dateFull";
// travel-date-field.tsx:114-115 (calendar)
const requestedGuests =
  Number.isFinite(guestCount) && guestCount >= 1 ? Math.floor(guestCount) : 1;
```

Attack path: `booking-pricing-section.tsx:49-52` uses `type="number" min={1} max={99}` — the `max` attribute does **not** block typing `100`.

1. guests = `100` → `change("guests")` → `requestedValid === true` (no MAX check) → `isDateBookable(cap, date, 100)` false → **`dateFull` ("This date has no spots left for your group")** rendered under the date. `change()` also cleared any prior `guests` error (`next[field] = undefined`), and `errors.guests` is only produced at submit → *the only visible error is the wrong one*.
2. Calendar `requestedGuests = 100` → `disabled` matcher disables **every** date (unless `maxCapacity ≥ 100`) → the user cannot re-pick a date; the date they already picked shows `dateFull` while the real problem is in the guests field.
3. On submit the truth flips: `guestsInvalid` shows and `dateFull` is suppressed by `!errors.guests &&` (`booking-validation.ts:69-74`) — live UI and submit UI contradict each other for the same state.

Violates phase-02's "dateFull … chỉ khi guests hợp lệ". **Fix**: export one `isValidGuests(count)` (`Number.isInteger && >=1 && <=MAX_GUESTS`) used by `validateBooking`, `travelDateErrorAfterGuestsChange`, and `requestedGuests`. (Independent finding; overlaps quality-review #2 but adds the "all dates disabled + cleared guests error" chain.)

### A3 (Minor, Defer) — merge is mount-once; other tabs and bfcache stay stale

```ts
// booking-form.tsx:58-63
useEffect(() => {
  // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe localStorage read must run after mount
  setActiveCapacity(
    mergeDeviceBookings(capacity ?? null, slug, listBookings())
  );
}, [capacity, slug]);
```

- `grep -rn "addEventListener(\"storage\"" src/` → **0 hits**; no focus/visibility re-read either.
- **Same-tab answer to attack 7**: catch-up works — leaving checkout unmounts the component, returning remounts → effect re-runs → fresh `listBookings()`. Also after paying, the form is replaced by the summary, so a stale merge cannot be re-submitted in that session.
- **Cross-tab answer**: tab A merged at mount; tab B books the last 3 spots; tab A still shows "3 chỗ trống" and `validateBooking(values, activeCapacity)` passes → over-capacity booking written to localStorage. Same for bfcache back/forward restore (page JS resumes, effects do not re-run).
- Why **Defer, not Accept**: with no backend the inventory is advisory by architecture — a second *device* can always over-book, so a `storage` listener only closes the same-device gap (worthwhile, but not a correctness fix). Requires product decision.

### A4 (Minor, Defer) — bad occupancy rows die silently, per-date under-block

```ts
// tour-capacity.ts:35-38
if (typeof date !== "string" || !date) continue;
if (typeof booked !== "number" || !Number.isFinite(booked) || booked < 0)
  continue;
bookedByDate[date] = (bookedByDate[date] ?? 0) + Math.floor(booked);
```

- Row with `date` present but `booked` missing (GROQ `"occupancy": occupancy[]{ date, booked }` simply omits the key if unset) → row dropped → that date behaves as **0 booked** while neighbouring dates still block → badges confidently report a wrong number. Studio guards the happy path (`occupancy-field.ts:47,53` `.required()`), so reachable only via API writes / schema drift.
- `typeof date !== "string"` accepts **any** non-empty string, so a malformed key becomes a dead entry that never matches an ISO lookup (Sanity `date` type does emit `YYYY-MM-DD`, so this is API-write-only).
- Trade-off is defensible (killing the whole capacity over one bad row would violate P4 more loudly), but the current behaviour is silent — no log, no per-date "unknown".
- **Verdict Defer**: keep capacity alive, but consider dropping rows only when the date is valid and flagging `booked` anomalies (or clamping instead of skipping).

### A5 (Minor, Defer) — `maxCapacity: 0` means "closed", code reads it as "unconfigured"

```ts
// tour-capacity.ts:26-27
const max = doc?.maxCapacity;
if (typeof max !== "number" || !Number.isInteger(max) || max < 1) return null;
```

P4 says *no data → don't block*, but `0` **is** data ("zero spots"). Schema `rule.min(1).integer()` (`tour-pricing.ts:149`) blocks Studio only; a CMS/API write of `0` yields `null` → `remainingSlots` `null` → no badges, `isDateBookable` → `true` (`:91`) → full availability for a closed tour. Same for `max < 1` negatives. **Decide semantics** (reject `0` in schema *and* treat `0` as "everything sold out" in code, or document `0` as forbidden).

### A6 (Minor, Defer) — capacity is invisible to keyboard users on exactly the days it matters

Verified against `react-day-picker@10.0.1` sources (no build, direct read):

- `DayPicker.js:368-372`: `disabled: (!modifiers.focused && modifiers.disabled) || undefined` → a non-focused sold-out day renders a **native `disabled` button** → not tabbable; `tabIndex: isFocusTarget(day) ? 0 : -1`.
- `helpers/calculateFocusTarget.js` `isFocusableDay`: `(!modifiers.disabled && !modifiers.hidden && !modifiers.outside)` → disabled days are never the roving tab stop.
- `helpers/getNextFocus.js`: `if (!isDisabled && !isHidden) return focusDay;` then recursion → arrow keys **skip** sold-out / capacity-disabled days entirely.
- Consequence 1: the aria-label built at `travel-date-field.tsx:150-154` (`${label}, ${badge.text}`) — which phase-02 required — is unreachable via keyboard focus on precisely the sold-out days; screen-reader *browse* mode can still read a disabled button, so this is not a total loss (hence Defer, not Accept).
- Consequence 2: if every day in the window is disabled (all dates full, or guests = 100), `calculateFocusTarget` returns `undefined` → **no day has `tabIndex=0`** → the grid has no tab stop. Nothing is selectable either, so impact is a11y-only.
- Click/keyboard *selection* of a disabled day is NOT possible — see Reject R9.

### A7 (Minor, Defer) —404 path stops at destination; missing pricing is a silent dead end

```ts
// checkout/page.tsx:28,35
if (!tour) notFound();
...
if (!destination) notFound();
// :37-38 — no guard for a missing pricing doc
const tiers = mapPricingTiers(pricingDoc, locale);
const capacity = mapTourCapacity(pricingDoc);
```

`mapTourCapacity(null)` → `null` (P4 ✅ nothing blocks, no badges), `mapPricingTiers(null)` → `[]` (`pricing.ts:61`, no throw). But the flow then allows: fill form → submit (valid) → `BookingSummary` renders "Booking request received" → `BookingPaymentSection` returns `null` when `total === null` (`booking-payment-section.tsx:72`) → **no QR, no payment, no `saveBooking`, no error**. The user is told a booking exists; nothing is stored and device capacity never shrinks. Capacity feature does not cause it, but it is the P4 "partial doc" neighbour case the vector asked about. **Defer** (pre-existing checkout gap): either `notFound()`/inline notice when `tiers.length === 0`, or hide submit.

### A8 (Minor, Defer) — CDN staleness + fail-open on fetch error

```ts
// sanity/lib/client.ts:9
useCdn: true, // Set to false if statically generating pages, using ISR or tag-based revalidation
// sanity/lib/fetch-published.ts
.catch(() => null);
```

- Admin marks a date full in Studio → users may keep seeing (and booking) spots until the Sanity CDN revalidates. Inventory is advisory anyway (no backend) → Defer, but editors should know "publish ≠ instant".
- Any transient fetch failure → `null` → capacity `null` → every date bookable with no indicator that capacity data exists but couldn't be loaded. This *is* P4 ("no data → don't block"), just worth stating explicitly: **the fail-open window equals the failure window**.

### N1–N5 (Nit) — proof sketches

- **N1**: `bookedByDate[booking.travelDate] = (bookedByDate[booking.travelDate] ?? 0) + guests` (`tour-capacity.ts:64-65`) with `travelDate` validated only as `typeof === "string"` (`booking-history.ts:36`). Key `"__proto__"`: read yields `Object.prototype` (not null → `?? 0` unused) → `"[object Object]" + guests` string → assignment hits the `__proto__` accessor setter with a string → silently ignored. Key `"constructor"` is stored as an own property (shadowing the read only for that key). ISO lookups (`remainingSlots(capacity, iso)`) can never hit these keys, so no exploit — but use `Object.create(null)` or `Map`.
- **N2**: `const [reference] = useState(() => \`VN-${Date.now().toString(36).toUpperCase()}\`)` (`booking-summary.tsx:38-40`) + `listBookings().filter((entry) => entry.reference !== booking.reference)` (`booking-history.ts:64-66`) → a collision deletes the other booking. Practically unreachable (needs two confirmed checkouts in the same millisecond) → Nit.
- **N3**: `mergeDeviceBookings` sums all rows for slug+date; dedupe exists only in `saveBooking`, not `listBookings()` → duplicate rows (manual edit / future writer) double-count → over-block. (Overlaps quality-review #11.)
- **N4**: `next.travelDate = travelDateErrorAfterGuestsChange(previous.travelDate, values.travelDate, ...)` (`booking-form.tsx:75-80`) mixes the fresh `previous` arg with a render-scope capture. Today safe: exactly one field changes per event and discrete events flush before the next, so `values.travelDate` equals the committed value when the updater runs. Fix by computing the guests branch before `setErrors`.
- **N5**: see table.

---

## 3. Rejected claims (false positives)

| # | Claim | Verdict | Proof |
|---|-------|---------|-------|
| R1 | Double-submit spam creates duplicate localStorage bookings | **Reject** | Nothing writes at submit: `submit` only does `setErrors(found)` / `setConfirmed(true)` (`booking-form.tsx:86-91`); double-click re-runs idempotently. The only writer is `handlePaid` → `saveBooking` (`booking-summary.tsx:53-71`), and `saveBooking` upserts by reference (`booking-history.ts:64-70`: filter-out then unshift). Payment re-fires (method switch after success → new timer at `booking-payment-section.tsx:63-70`) hit the *same* `reference` (stable `useState`) → still one row. |
| R2 | Merge effect re-runs every render (bookings array identity churn) | **Reject** | Effect deps are `[capacity, slug]` (`booking-form.tsx:63`); `listBookings()` is called *inside*, not passed in. `capacity` comes from an RSC prop (no client parent re-renders it) → runs once per mount. The flip side (staleness) is A3, not a loop. |
| R3 | Bookings from other tours inflate this tour's booked count | **Reject** | `if (booking.slug !== slug) continue;` (`tour-capacity.ts:58`). Storage slug and pricing slug are the same value: `BookTicketButton` links `?tour=${slug}` (destination slug), checkout uses `tour` for **both** `DESTINATION_BY_SLUG_QUERY` and `TOUR_PRICING_BY_SLUG_QUERY` and passes it as `slug` (`checkout/page.tsx:31-32,55`). |
| R4 | `travelDate` format mismatch (locale vs ISO) in merge | **Reject** | `values.travelDate` is only ever written by `onSelect={(day) => onChange(day ? toIsoDate(day) : "")}` (`travel-date-field.tsx:137`); `saveBooking` persists it unchanged; `my-trips` only *reads* (`formatTravelDate`) and never re-saves (`grep saveBooking` → `booking-summary.tsx` only). A hypothetical non-ISO string would create a dead key (no crash, no block) — Nit N1, not a format bug. |
| R5 | CMS `booked > max`, negative, duplicate, non-array, missing fields break the calc | **Reject** | Clamp: `return Math.max(0, capacity.maxCapacity - (capacity.bookedByDate[iso] ?? 0));` (`:77`). Negative/non-finite skipped (`:36-37`); duplicates summed (`:38`) — Studio forbids them anyway (`occupancy-field.ts:29-31`); `Array.isArray(doc?.occupancy) ? doc.occupancy : []` (`:30`); row shape guarded (`:33`). Bad-row nuance is A4. |
| R6 | Occupancy rows outside the 7-day window or in the past cause wrong badges/disables | **Reject** | `badgeFor` gates `if (iso < min \|\| iso > max) return null;` (`travel-date-field.tsx:105`); window days past the boundary are already disabled by `{ before: minDate }` / `{ after: maxDate }` (`:139-140`). Out-of-window counts sit in `bookedByDate` where nothing ever looks them up. |
| R7 | Vietnamese plural mismatch — "chỗ trống" for 0/1 | **Reject** | `vi.json:15` `"{count} chỗ trống"` — Vietnamese has a single CLDR plural category ("other"), numeral + noun is grammatical for 1. `count = 0` never reaches it: `if (remaining === 0) return { text: t("soldOut"), soldOut: true };` runs first (`travel-date-field.tsx:108`), and `remainingSlots` is clamped ≥ 0. EN uses proper ICU plural (`en.json:15`). |
| R8 | Missing i18n key crash / aria-label double comma | **Reject** | All 12 `BookingErrorKey` values exist in both files (`en.json:42-55`, `vi.json:42-55`), plus `spotsLeft`/`soldOut`/`travelDateLabel`/`submit` (`:14-16,27`). `t(\`error.${error}\`)` (`booking-field.tsx:23`) can only receive those keys. Badge text is never empty (`soldOut`/`spotsLeft` literals), so `return badge ? \`${label}, ${badge.text}\` : label;` (`travel-date-field.tsx:153`) cannot double-comma; verified `typeof vi.labels.labelDayButton === 'function'` → the fallback to `defaultLabelDayButton` (English) is dead code for both locales. |
| R9 | Disabled day selectable via keyboard / Enter / URL | **Reject** | rdp `DayPicker.js:196` `handleDayClick`: `if (m.disabled) { return; }` — even for a focused+`aria-disabled` day (Enter → click → guarded). Arrow navigation skips disabled (`getNextFocus.js` recursion). No date enters via URL (only `?tour=`), and there is no text input for the date — `onSelect` is the sole writer. Unreachability-by-focus (a11y) is A6, not a bypass. |
| R10 | `guests = 0` / `NaN` / negative / hex bypasses the capacity check | **Reject** | `validateBooking` rejects all (`:62-64`) and the `!errors.guests &&` guard (`:69-74`) merely *skips* `dateFull` when guests are invalid — the guests error alone keeps `Object.keys(found).length > 0` so submit cannot pass (`booking-form.tsx:90`). `Number("0x10")` etc. cannot arrive: `type="number"` sanitises invalid float literals to `""`. Calendar falls back to 1 guest (`isDateBookable:93`, `requestedGuests:115`) so an invalid input never *unlocks* sold-out days; when guests are corrected the reactive `dateFull` path fires. |
| R11 | P4 leaks: partial doc / one bad row nulls all capacity (over-strict) or shows capacity when unconfigured | **Reject (design holds)** | `maxCapacity` absent/invalid → `null` (`:27`); `occupancy` absent → `[]` while capacity stays alive (correct: 0 booked); `mergeDeviceBookings(null, …) → null` (`:53`); `remainingSlots(null) → null` → no badge; `isDateBookable(null) → true` (`:91`). Fetch failure → `null` (A8 is the *information* loss, not a P4 violation). One bad row keeps capacity alive — see A4 for the residual under-block. |
| R12 | Server null vs client merged capacity → hydration mismatch | **Reject** | Hydration render uses the state initializer `useState<TourCapacity \| null>(() => capacity ?? null)` (`booking-form.tsx:54-56`) = the server prop; merge happens only in `useEffect` (`:58-63`), which cannot affect the hydration pass. Residual flash (badge counts dropping after mount for users with device bookings) is post-hydration and acknowledged in the code comment (`:53`) → acceptable. The clock/TZ issue is A1, a different root cause. |
| R13 | Same booking counted in CMS occupancy **and** device bookings (double count) | **Reject (code)** | The code cannot distinguish provenance and is specified to sum both (`plan.md:4`, field description `occupancy-field.ts:13-14` "…through other channels"). Double counting is an **editor process** risk only; documented mitigation exists. Not a code defect. |
| R14 | "Booked 3 elsewhere in My Trips → merged state doesn't catch up" (same tab) | **Reject** | My Trips has no booking writer (`saveBooking` grep → `booking-summary.tsx` only); any real booking requires leaving checkout (unmount) → remount re-runs the merge effect with fresh `listBookings()`. Cross-tab/bfcache remains stale → A3. |

---

## 4. Attack-vector verdict matrix

| Vector | Outcome |
|--------|---------|
| **1. State/race** | Double-submit duplicates → R1 reject. Merge-effect identity loop → R2 reject. Merge vs guests-change race → reject (merge is mount-once, before any input). Stale `values.travelDate` in updater → N4 Defer (no repro; impure updater). |
| **2. Double counting** | Other tours → R3 reject. Format mismatch → R4 reject. CMS+device same booking → R13 reject (process, documented). Duplicate storage rows → N3 Nit. |
| **3. CMS data** | Over/negative/duplicate/huge/non-array/missing → R5 reject (clamped/skipped/summed). Out-of-window/past rows → R6 reject. Bad row / `maxCapacity 0` / unsafe-integer / dead date keys → A4, A5, N5, A4. |
| **4. Hydration** | Merged-capacity mismatch → R12 reject; locale aria-label → R8 reject (deterministic per `locale` prop). Clock/TZ window+badge mismatch → **A1 Major Accept**; post-mount badge count drop → accepted flash. |
| **5. Bypass** | Disabled day via keyboard/URL/Enter → R9 reject; guests 0/NaN/neg → R10 reject; `guests=100` wrong-error + all-days-disabled → **A2 Accept**; submit re-validates with `activeCapacity` (`:88`) so calendar and submit agree; cross-tab stale submit → A3. |
| **6. i18n** | vi plural 0/1 → R7 reject; missing key crash → R8 reject; double comma → R8 reject; parity confirmed (both files carry all keys). |
| **7. UX integrity** | Same-tab catch-up → R14 reject; cross-tab/bfcache → A3; sold-out day keyboard reach → A6; no capacity re-read between submit and payment → inherent (no backend), noted under A3. |
| **8. P4 leaks** | Partial doc / one bad row / fetch failure → R11 reject as *blocking* leaks; residuals are A4 (per-date under-block with confident badge), A5 (`0` read as unconfigured), A7 (dead end, not a block), A8 (fail-open window). |

---

## 5. Unresolved questions

1. What TZ does the deployment host run? If it is (or can be) pinned to `Asia/Ho_Chi_Minh`, A1 drops to a midnight-only edge; if UTC/default, A1 fires for ~7 h/day. Should the fix be "pass `today` from the RSC" or "pin TZ"?
2. Is same-device cross-tab sync (`storage` event / `BroadcastChannel`) in scope for this feature (A3), given that cross-device over-booking is unfixable without a backend?
3. Semantics of `maxCapacity: 0`: forbid at schema level only, treat as "everything sold out", or keep as "unconfigured" (A5)?
4. Should a malformed occupancy row invalidate only that row (current, A4) or the whole `occupancy` array (still keeping `maxCapacity`)? Is a console/dev log acceptable?
5. Missing pricing doc at checkout (A7): 404, inline notice, or disable submit — and is it tracked anywhere (it predates this feature)?
6. Editor guidance needed for CDN publish lag (A8) and for keeping device bookings out of `occupancy[]` (R13 process risk)?

---

**Status:** DONE_WITH_CONCERNS
**Summary:** Design survives most red-team attempts — double-submit, cross-tour merges, disabled-day bypass, CMS edge data, and P4 fail-open all hold under code+library scrutiny; but two must-fix issues stand: SSR/client clock-TZ window+badge hydration mismatch (A1, Major) and divergent guest-validity rules that show `dateFull` while disabling every date for `guests=100` (A2).
**Concerns/Blockers:** 6 open questions above (deployment TZ and cross-tab sync scope are the two that decide whether A1/A3 are one-line fixes or product decisions); review is reasoning-only — no builds/tests were run per mandate.

# Code Review — Booking / Checkout / Payment / My Trips (quality + adversarial, read-only)

- **Date:** 2026-09-27
- **Scope:** booking checkout flow (plan 260927-0034), payment QR (260927-0121), travel date + my-trips (260927-0141); supporting: capacity merge (260927-1420), header/trip-planner removal (260927-0205)
- **Mode:** READ-ONLY — no files edited, no builds run. Only static reading + read-only `node -e` JSON/Intl probes.
- **Files reviewed:**
  - `src/components/booking/{booking-summary,booking-payment-section,booking-form,booking-validation,booking-field,booking-contact-section,booking-date-section,booking-pricing-section,booking-difficulty-section,travel-date-field,book-ticket-button,ticket-rows}.ts(x)`
  - `src/lib/{booking-history,date-window,pricing,payment,tour-capacity}.ts`
  - `src/app/[locale]/booking/checkout/page.tsx`, `src/app/[locale]/my-trips/{page,[reference]/page}.tsx`
  - `src/components/my-trips/{my-trips-client,my-trips-detail}.tsx`, `src/components/layout/header.tsx`
  - Context: `src/sanity/schemaTypes/tour-pricing.ts`, `src/components/pricing/price-block.tsx`, `src/messages/{en,vi}.json`, plans above

**Path deviations from task brief:** `src/lib/ticket-rows.ts` → actual location `src/components/booking/ticket-rows.ts`; `src/lib/payment-logic.ts` does not exist → the payment logic is `src/lib/payment.ts` (temp test file was named `payment-logic.test.ts`). Both reviewed at actual locations.

---

## 1. Findings table

| ID | Severity | Location | Issue | Verdict | Suggested fix |
|----|----------|----------|-------|---------|---------------|
| M1 | **Major** | `src/lib/booking-history.ts:29-41` → `src/components/my-trips/detail` render path | `isTripBooking` validates only 7 of 15 fields (`currency`, `total`, `fullName`, `email`, `phone`, `notes`, `difficulty`, `pricePerGuest` unchecked). Record with numeric `total` but missing/bad `currency` passes the guard and `formatPrice` **throws** `TypeError: Currency code is required with currency style` (verified with Node) → `/my-trips/[reference]` crashes. Guard exists precisely to defend corrupted storage, yet doesn't cover rendered fields. | **Accept** | Extend guard: `currency === "VND" \|\| currency === "USD"`; `(record.total === null \|\| (typeof record.total === "number" && Number.isFinite(record.total)))`; string checks for `fullName/email/phone/notes`; `difficulty ∈ {easy,medium,hard}`; `Number.isFinite(guests) && guests >= 1`. Drop record on failure (P4: no data → don't show). |
| M2 | **Major** | `src/components/booking/booking-payment-section.tsx:72` + `booking-summary.tsx:22-26` | Price-less tour (`tiers = []` → `total = null`) → payment section renders `null`, so `onPaid` can **never** fire → `saveBooking` never runs → confirmed booking is silently not persisted anywhere (no backend either). User sees a "confirmation" with no explanation and no path to My Trips. | **Accept** | When `total === null`, render an i18n note in the summary ("price unavailable → ticket is not stored in My Trips; we will contact you") or block confirm with an explanation. Must not fabricate a price (P4). |
| m1 | Minor | `src/components/booking/travel-date-field.tsx:95,100` + `src/lib/date-window.ts:44-49` | `today = new Date()` evaluated **during render** → SSR uses server clock/timezone, hydration re-computes with client clock/timezone → mismatched `disabled` / `startMonth` / `endMonth` on day cells whenever server TZ ≠ client TZ (≈7 h/day for UTC server vs Asia/Ho_Chi_Minh). React 19 logs recoverable hydration error + full client re-render. | **Accept** | Compute window in post-mount state (same pattern as `my-trips-client.tsx:26` `loaded` gate / `booking-form.tsx:58-63`) or render DayPicker client-only after mount. |
| m2 | Minor | `src/components/booking/travel-date-field.tsx:100` | Window never refreshes after midnight: page left open past 00:00 keeps yesterday's disabled set (yesterday-today still selectable, newly-allowed max day not selectable). Correctness saved by re-validation at submit (`booking-validation.ts:68`), so impact = surprising `dateOutOfRange` after pick. | **Defer** | Re-render window on a `visibilitychange`/interval, or accept (check-at-use is authoritative). |
| m3 | Minor | `src/lib/booking-history.ts:71-73` | `saveBooking` swallows quota/private-mode failure while UI already showed **Success** + "View my trips" → user opens My Trips, sees empty list, no warning. | **Accept** | Return `boolean`; on `false` show a non-blocking note in `BookingPaymentSection` after success. |
| m4 | Minor | `src/components/booking/booking-form.tsx:65-67` | Float precision leaks into persisted data + QR: `guestCount * tier.pricePerGuest` → e.g. `49.99*3 = 149.97000000000003` stored in localStorage and embedded raw as `amount=${amount}` (`payment.ts:17,20`); UI rounds via Intl so mismatch is invisible. | **Accept** | Round once: `const total = tier ? Math.round(guestCount * tier.pricePerGuest * 100) / 100 : null;` |
| m5 | Minor | `src/components/booking/booking-form.tsx:65-67` + `pricing.ts:84-94` | P4 inconsistency: guests input `"1e2"` → `Number` = 100 → clamp fabricates a total for 100 guests *before* submit, though validation caps at 99 (`booking-validation.ts:63-64`). `""`/`"0"` correctly hide price. | **Accept** | Gate price display on the same predicate as validation (`Number.isInteger(count) && count >= 1 && count <= 99`). |
| m6 | Minor | `src/lib/pricing.ts:87-94` | Gap clamp ≠ doc: comment says "clamped to the **nearest** tier", but a count inside an authored *gap* (schema allows gaps — `tour-pricing.ts:71` only forbids overlap) returns the **last** tier: tiers `1–2, 5–8`, guests=3 → priced at `5–8`. | **Accept** | Pick the tier with nearest range (e.g., last tier whose `maxGuests < guests`, else first tier above), or reword the doc comment to state "falls to last tier". |
| m7 | Minor | `src/lib/pricing.ts:57-59` vs `src/sanity/schemaTypes/tour-pricing.ts:118,126` | Runtime requires `groupTotal > 0` but schema allows `min(0)` → an authored `0` group total hides the **whole tier** (valid `pricePerGuest` lost) → checkout/price block show nothing. | **Accept** | Align: schema `rule.min(1)` (preferred — 0 group total is meaningless) or stop gating tier usability on `groupTotal`. |
| m8 | Minor | `booking-form.tsx:67` vs `price-block.tsx:77` | Checkout total is `guests × pricePerGuest` and never uses authored `groupTotal`; under clamping (guests above tier max, or `minGuests > 1`) the total shown at checkout is not an authored number and can contradict the "Group total" column on the tour page. Deliberate (plan 0121 P1) but user-visible price inconsistency. | **Defer** | Product call: show clamp context ("price for N+ tier") or make PriceBlock derive group total the same way. |
| m9 | Minor | `src/components/booking/booking-field.tsx:21-24`, `booking-form.tsx:86-91` | Validation errors render as plain `<p>`: no `role="alert"`/`aria-live`, focus stays on the Submit button → screen-reader users get no announcement after failed submit (inputs do have `aria-invalid` + `aria-describedby` ✓). | **Accept** | Add `role="alert"` to the error `<p>` and/or move focus to first invalid control on submit. |
| m10 | Minor | `src/components/layout/header.tsx:64-66`, `:75` | (a) `<Button variant="outline" size="sm">{t("planTrip")}</Button>` has **no `render`/`href`** → dead control that does nothing when clicked. (b) `<span className="sr-only">Menu</span>` hardcoded English in the VI UI. | **Accept** | Remove the dead button (nav item already links `/plan-your-trip`) or give it `render={<Link href="/plan-your-trip" />}`; localize `Menu`. |
| m11 | Minor | `booking-payment-section.tsx:56` | `QRCode.toDataURL(...).catch(() => undefined)` → on failure the placeholder pulses forever with no message, while the payment still reports success with **no QR ever shown**. (Correctly does *not* fake a QR — P4 ✓.) | **Accept** | On catch, show a short error/hint key (`qrHint` or new `qrError`) instead of an infinite skeleton. |
| m12 | Minor | `booking-history.ts:62-74`; consumers `my-trips-client.tsx:20-24`, `booking-form.tsx:58-63` | Two-tab concurrency: `saveBooking` is a non-atomic read-modify-write → last writer can drop the other tab's booking; no `storage` event listener anywhere → list and merged capacity are stale across tabs (possible client-side overbooking; no backend anyway). | **Defer** | Listen to `window.addEventListener("storage")` to refresh list/capacity; accept residual race (single-origin demo). |
| m13 | Minor | `booking-summary.tsx:53-71`, `booking-history.ts:9-25` | PII (name/email/phone/notes) persists in localStorage indefinitely with **no delete path** in UI or lib (only `saveBooking`/`listBookings`/`getBooking`), no auth → shared-device exposure with no user control. | **Accept** | Add `clearBookings()`/`removeBooking(ref)` + a "Delete all trips" control on `/my-trips`. |
| m14 | Minor | `plans/260927-0034-booking-checkout-flow/plan.md` ("Validate: blur + on submit") | No `onBlur` handler exists in any booking field (grep: 0 hits) — validation only runs on submit. Spec/impl drift. | **Defer** | Add blur validation or amend plan decision. |
| m15 | Minor | `docs/project-changelog.md` (193 lines, zero booking/payment/my-trips entries); all 3 plan.md still `status: pending` | Documentation-management rule not executed: features shipped + tested, but changelog has no entries and plan statuses unchanged (plans explicitly require "code-reviewer + changelog + plan status"). | **Accept** | docs-manager pass: 4 changelog entries (booking, payment, travel-date/my-trips, capacity) + set plan statuses. |
| m16 | Minor | `package.json` (no test script), repo has **0** app test files; `plans/260927-1420/.../phase-03:4` points at `C:\Users\...\Temp\opencode\*.mjs\|*.test.ts` | "Green suites" live only in a temp dir (explicit plan choice: *"script test để temp dir"*) → results not reproducible after temp cleanup; `npm test` doesn't exist. | **Defer** | Commit tests under `tests/` + add runner script. Deliberate today, but it is standing debt. |
| n1 | Nit | `booking-payment-section.tsx:36,70,80` | `verifyToken` state is redundant — `payload` already changes whenever `method` changes (`momo://…` vs `BANK\|…` always differ), so the timer effect restarts without it. YAGNI. | **Accept** | Remove `verifyToken`; keep `setStatus("pending")` in `selectMethod`. |
| n2 | Nit | `booking-summary.tsx:65,68`; `booking-history.ts:20,23` | `pricePerGuest` and `locale` are written to every record but never read anywhere (grep). | **Defer** | Keep only if a receipt/localization feature is planned; else drop from the interface. |
| n3 | Nit | `booking-summary.tsx:92`, `my-trips-detail.tsx:90` | React key = `row.label` (translated string). Unique today in EN *and* VI (verified), but keys derived from copy are fragile — duplicate translation = silent render bug. | **Defer** | Emit stable `id` per row in `buildTicketRows`. |
| n4 | Nit | `booking-summary.tsx:89-105` vs `my-trips-detail.tsx:87-103` | The `<dl>` rendering block (~15 lines) is duplicated; only row *building* is shared. | **Defer** | Extract a `<TicketRows rows={…} />` component (DRY). |
| n5 | Nit | `booking-summary.tsx:38-40` | `VN-${Date.now().toString(36)}` is ms-precision only → two bookings created in the same millisecond (two tabs) collide and upsert overwrites one. Probability negligible. | **Defer** | Append `Math.random().toString(36).slice(2, 6)`. |
| n6 | Nit | `my-trips-client.tsx:47` | `href={`/my-trips/${booking.reference}`}` — value from localStorage interpolated unencoded. Cannot leave origin (path is `/`-prefixed, React escapes), but tampered refs produce odd paths. | **Defer** | `encodeURIComponent(booking.reference)`. |
| n7 | Nit | `booking-payment-section.tsx:148-157` | `aria-live="polite"` region is mounted at the same time as its initial "Pending" text → initial state likely unannounced (only the Pending→Success change is). | **Defer** | Keep the live region always mounted (render it outside the `{method && …}` block). |
| n8 | Nit | all form fields | No required markers (`aria-required`, asterisk) on required fields — required-ness only discoverable by submitting. | **Defer** | Add `aria-required` + visual marker. |

### Rejected (false positives checked, no action)

| Claim | Result |
|-------|--------|
| Double-submit / method-switch creates duplicate bookings | **Reject** — `saveBooking` upserts by `reference` (`booking-history.ts:64-69`), one timer per payload (`booking-payment-section.tsx:63-70`), reference fixed by `useState` initializer (`booking-summary.tsx:38`). Re-firing on method switch overwrites the same record (only `paidAt` shifts — n-level nit). |
| Payment success timer fires after unmount/navigation | **Reject** — `return () => clearTimeout(timer);` (`booking-payment-section.tsx:69`) runs on unmount; QR promise guarded by `cancelled` (`:58-60`); StrictMode double-mount leaves exactly one live timer. `onPaidRef` (`:40-43`) prevents stale-closure saves. |
| XSS via localStorage values | **Reject** — all renders are React text children (auto-escaped); no `dangerouslySetInnerHTML`/`innerHTML`/`eval` in reviewed files; QR is a client-generated data URL. |
| QR payload injection / PII leak | **Reject** — payload carries only `amount` + reference sanitized `reference.replace(/[^A-Za-z0-9-]/g, "")` (`payment.ts:14`) + fixed constants; no PII, no secrets (mock bank acc is a placeholder, not a credential). |
| Travel date shifted by UTC (`toISOString`) | **Reject** — dates use local `toIsoDate` (`date-window.ts:5-10`); only `paidAt` uses ISO (a timestamp, correct). `parseIsoDate` rejects impossible dates (`:21-27`); zero-padded ISO makes lexicographic compare (`:58`) safe. |
| i18n EN/VI key drift | **Reject** — full key sets identical: 700 EN = 700 VI, 0 one-sided keys; every used key exists (`booking.*` incl. `error.*`, `myTrips.*`, `common.*`); `priceUnavailable` correctly deleted; `spotsLeft`/`perGuest` ICU placeholders match. |
| Trip-planner leftovers after removal | **Reject** — no `trip-planner` references in `src` (only surviving `/plan-your-trip` guide routes, which are a different feature); all 6 nav keys + search/my-trips labels exist in both locales. |
| Conditional hooks / hook-order bug in payment section | **Reject** — all `useState`/`useRef`/`useEffect` (lines 34–70) precede the early return at line 72. |
| Tier clamping itself is a bug | **Reject as bug** — deliberate decision P1 in plan 0121 ("clamp về tier gần nhất … luôn có tổng giá"). Deviation from P4 noted in m6/m8 only. |
| Files ≥200 lines | **Reject** — largest in scope: `pricing.ts` 197, `travel-date-field.tsx` 178, `booking-payment-section.tsx` 174. All kebab-case. |

---

## 2. Notable detail (M1, M2)

**M1 — incomplete storage guard → render crash**

```ts
// booking-history.ts:29-41 — only these fields are checked:
return (
  typeof record.reference === "string" &&
  typeof record.slug === "string" &&
  typeof record.tourName === "string" &&
  typeof record.travelDate === "string" &&
  typeof record.guests === "number" &&
  typeof record.locale === "string" &&
  typeof record.paidAt === "string"
);
// …but my-trips-detail.tsx:63-65 renders:
total: booking.total, currency: booking.currency,
// → ticket-rows.ts:57 → pricing.ts:105 Intl.NumberFormat(..., {style:"currency", currency: undefined})
```
Probe result: `TypeError: Currency code is required with currency style.` No cross-user vector (own browser only), but it is a guaranteed crash from a single malformed record and the guard's own contract ("Silently returns `[]` for corrupted storage", `:43`) is violated. Same class: `t(values.difficulty)` with a missing/unknown value renders an odd fallback instead of failing closed (next-intl returns the key path).

**M2 — price-less tour: confirmation that persists nothing**

```tsx
// booking-payment-section.tsx:72
if (total === null) return null;   // no selector → no payload → no timer → onPaid never called
// booking-summary.tsx:22-26 (JSDoc):
// "The ticket is persisted to My Trips only after the mock payment reports success"
```
With `tiers = []` the user still submits, still sees the confirmation ("we will contact you" ✓ honest), but there is no payment block, no `viewMyTrips` link, no stored ticket, and no on-screen explanation — a silent dead end that contradicts the My Trips promise of plan 0141.

---

## 3. Red-team results (requested scenarios)

| Scenario | Outcome |
|----------|---------|
| Double-submit duplicate bookings | **Safe** — see rejected table. Reference upsert is correct and documented (`booking-history.ts:3-7`). |
| TOCTOU on date window | **Safe-by-design, minor UX gap** — calendar disabled set is computed at render (stale across midnight, m2), but the authoritative gate is `validateBooking` → `isTravelDateAllowed()` at submit time with the *current* clock → fails closed (`dateOutOfRange`). Reverse direction (submit at 23:59, save 3 s later) does not re-validate, but values are frozen after confirm — no exploitable window. |
| localStorage concurrency (2 tabs) | **Weak** — non-atomic read-modify-write + no `storage` listener (m12). Loss window is sub-millisecond per save; stale capacity in a second tab can overbook client-side (no backend to protect). |
| Payment timer after unmount/navigation | **Safe** — effect cleanup; no `setState` after unmount; QR promise cancellation guarded. |
| P4 "no data → don't guess" | **Mostly consistent** — `tier === null` hides price, `capacity === null` disables nothing, QR failure shows no fake QR, corrupted storage returns `[]`. Violations: m5 (display-side guess for out-of-range guests), clamp behavior m6/m8 (deliberate). |
| Secrets/PII to logs or URL | **Clean** — zero `console.*` in reviewed files; URLs carry only `?tour=<slug>` (encoded, `book-ticket-button.tsx:15`) and `/my-trips/<reference>` (booking code, not PII); payload/QR contain no PII. |

---

## 4. Verified-clean checklist

- i18n parity EN/VI: **700 = 700 keys, 0 missing both directions**; all referenced keys exist (`booking.error.*`, `myTrips.*`, `common.*`).
- Currency: `getCurrency(locale)` VI→VND / EN→USD, both values authored (no conversion), `locale` restricted to `en|vi` by `src/i18n/routing.ts` → `formatPrice` locale mapping (`vi-VN`/`en-US`) safe.
- Ticket row math: `guests × tier.pricePerGuest` matches plan D3; row set identical checkout vs detail (shared `buildTicketRows`); labels unique in both locales (React keys safe today).
- Date window: min = tomorrow, max = today+7 (7 selectable days) — matches copy "within the next 7 days"; local-date helpers, no DST assumption issues for VN.
- A11y (beyond m9/m10): sections use `aria-labelledby`, calendar group labelled + per-day ARIA label includes capacity badge (`travel-date-field.tsx:150-154`), payment radios are native inputs in a labelled `radiogroup`, status has `aria-live`, empty/not-found states have CTA links.
- Hydration: my-trips pages gate localStorage reads behind post-mount `loaded` ✓; `booking-form.tsx:53-63` seeds capacity from the server value then merges after mount ✓ (only the calendar window is exempt — m1).
- Security: no injection sinks, no auth/secrets/PII in logs or query strings, Sanity queries use parameter binding (`$slug`).
- Structure: all reviewed files < 200 lines, kebab-case, single-responsibility; `buildTicketRows` / `formatPrice` / `date-window` are good DRY extractions.

---

**Status:** DONE_WITH_CONCERNS
**Summary:** No Critical issues; 2 Major (incomplete localStorage guard that can crash the My Trips detail page; silently non-persistent confirmation for price-less tours), ~16 Minor/Nit, all cheap to fix. Red-team scenarios (double-submit, timer-after-unmount, XSS, UTC date shift, i18n drift) all checked out clean — clamping and temp-dir tests are deliberate plan decisions.
**Concerns/Blockers:** M1/M2 should be fixed before this flow is called done; changelog/plan-status updates (m15) still outstanding.

## Unresolved questions

1. Review brief listed `src/lib/ticket-rows.ts` and `src/lib/payment-logic.ts` — actual files are `src/components/booking/ticket-rows.ts` and `src/lib/payment.ts`. Was the brief stale, or was a move planned?
2. Price-less tours (M2): product intent — explain-and-skip, block confirmation, or persist an "unpaid" record? Needs a decision, not just code.
3. Deployment timezone unknown — determines how often m1 (SSR/client clock skew) fires. Is prod TZ fixed (e.g., `TZ=Asia/Ho_Chi_Minh`)?
4. Blur validation (plan 0034) dropped deliberately or forgotten? (m14)
5. Tests intentionally kept in temp dir (plan 1420) — confirm whether committing them (`m16`) is wanted later.
6. `CLAUDE.md` references `docs/code-standards.md`, `docs/system-architecture.md`, etc. — only `docs/project-changelog.md` and `docs/vietnam-tourism-website-framework.md` exist. Out of scope here, but documentation-management rules currently point at missing files.

# Phase 02 — Payment Success Toast

## Context Links
- Trigger point: `src/components/booking/booking-payment-section.tsx` — `PaymentStatus` (:21), `VERIFY_DELAY_MS=3000` (:24), `setStatus("success")` (:66), inline `p[aria-live="polite"]` (:157-166) — KEEP untouched
- Tests: `tests/browser/c-payment.mjs:113/:121` and `d8-a11y.mjs:67/:72` first-match `p[aria-live="polite"]`; `c-payment.mjs:128` clicks bank radio ~0.5s after toast appears; `pageerror` listeners fail runs
- i18n: `useTranslations("booking")` pattern; `tests/unit/i18n-parity.test.ts`
- Binding: custom component, no new deps, effect on `status === "success"` INSIDE payment section, text verbatim, auto-dismiss 5000ms

## Overview
- Priority: P1 · Status: Complete
- Bespoke toast (fixed bottom-right, dark card + red accent, slide-in) driven by an effect in `booking-payment-section.tsx`; `booking.toastSuccess` key EN/VI.

## Key Insights
- First-match `p[aria-live="polite"]` is the ONLY a11y selector tests use; grep proves tests never query `[aria-live]` generically nor `role="status"` → toast uses `role="status"` (screen-reader announcement, a11y win) but MUST NOT set an `aria-live` attribute, and must never be a `<p>`.
- Toast appears ~3s after method select while c-payment still runs asserts/clicks at `:126-133` → must not intercept pointer events at ANY coordinate: container fully `pointer-events-none` (no interactive children → dismissal purely time-based; AC2 requires no toast close button).
- Contrast on dark card: `bg-foreground` (oklch .141) + `text-background` (white) ≈ 17:1; red accent via `border-l-4 border-primary` (token, no hex).
- `booking-payment-section.tsx` is 183 LOC → +~10 lines stays <200.

## Requirements
- R1 `src/components/booking/payment-success-toast.tsx` (~45 LOC): props `{ show: boolean }`; renders `null` when `!show`; root `fixed bottom-4 right-4 z-[80] flex pointer-events-none` + card `role="status"` `rounded-xl border-l-4 border-primary bg-foreground px-4 py-3 text-sm font-medium text-background shadow-soft animate-in slide-in-from-bottom-2 fade-in-0 duration-300`; text from `useTranslations("booking").t("toastSuccess")`; NO `aria-live` attribute anywhere; single `<p>`-free structure (use `<div>`/`<span>` so tests' `p[aria-live]` never matches).
- R2 Effect in `booking-payment-section.tsx`:
  `const [showToast, setShowToast] = useState(false);`
  `useEffect(() => { if (status !== "success") { setShowToast(false); return; } setShowToast(true); const id = setTimeout(() => setShowToast(false), 5000); return () => clearTimeout(id); }, [status]);`
  Render `<PaymentSuccessToast show={showToast} />` as last child inside the `<section>` (DOM order after `:157` p — irrelevant since no aria-live, but keeps first-match safe).
- R3 Exact EN copy: `Thank you for your booking. We will contact you within 5 minutes.`
- R4 Method switch resets (`:86-90` → `status="pending"`) → effect hides toast immediately (cleanup + pending branch). Existing inline green `statusSuccess` p, `View my trips →` link, `onPaidRef` call UNCHANGED.
- R5 `booking.toastSuccess` added to BOTH `en.json` and `vi.json` (same key set).

## Related Code Files
- Create: `src/components/booking/payment-success-toast.tsx`
- Modify: `src/components/booking/booking-payment-section.tsx` (import + state + effect + 1 render line), `src/messages/en.json`, `src/messages/vi.json`
- Delete: none

## Implementation Steps
1. Create `payment-success-toast.tsx` per R1 (`"use client"`, `useTranslations("booking")`).
2. Wire effect + render per R2/R4 in `booking-payment-section.tsx`; verify LOC `< 200`.
3. i18n — EN `booking.toastSuccess`: `Thank you for your booking. We will contact you within 5 minutes.` · VI: `Cảm ơn quý khách đã đặt tour. Chúng tôi sẽ liên hệ trong vòng 5 phút.` — insert at SAME position within `booking` object in both files (house convention; parity only enforces key sets).
4. `npm test` (11/11, parity) + `npm run lint`.
5. Self-verify no `aria-live` added: `grep -n "aria-live" src/components/booking/payment-success-toast.tsx` → 0 hits; payment-section `aria-live` count stays 1.

## Todo List
- [ ] Toast component created (dark/red, bottom-right, pointer-events-none, role=status, no aria-live, no `<p>`)
- [ ] Effect + render wired in payment section; status reset hides toast; file <200 LOC
- [ ] `booking.toastSuccess` EN+VI added
- [ ] `npm test` 11/11 · `npm run lint` clean

## Success Criteria
- On checkout, ~3s after selecting a method the toast slides in bottom-right with verbatim message, auto-dismisses at 5000ms; existing green `Payment successful` p + tests unaffected; no `pageerror`; radio clicks still land while toast visible.

## Risk Assessment
- Overlay blocking `c-payment.mjs:128` bank-radio click → eliminated by full `pointer-events-none` (verified in phase-04 browser run).
- First-match selector breakage → no `aria-live`, no `<p>` tag in toast; grep gate in phase-04.
- Effect on `status` re-fires on method switch reset → handled: pending branch sets `showToast=false`.

## Security Considerations
- No new deps, no storage, no network; purely presentational. Copy is user-specified (no invented claims beyond provided text).

## Next Steps
- Phase 03 must keep toast-independent: dismiss helper handles promo only; Phase 04 captures toast evidence within the 5s window.

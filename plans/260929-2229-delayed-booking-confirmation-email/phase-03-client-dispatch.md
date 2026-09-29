# Phase 03 — Client Dispatch Integration (paymentMethod passthrough)

**Status:** complete · **Priority:** P1 · **Plan:** [plan.md](./plan.md)

## Scope

### Files to modify
1. **`src/components/booking/booking-payment-section.tsx`**
   - Success callback now carries method: `onPaidRef.current?.(method)` (type `(method: PaymentMethod) => void`), invoked at `:71` with current `method` state.
   - Confirm method-switch reset (`:98-104`) still correct (callback reads fresh method at fire time).

2. **`src/components/booking/booking-summary.tsx`**
   - `onPaid` prop type → `(method: PaymentMethod) => void`.
   - `handlePaid(method)`:
     - `saveBooking({...existing, paymentMethod: method})` (persist optional field),
     - fire-and-forget `void fetch("/api/booking-confirmation", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload)}).catch(console.warn)` — non-blocking, must not affect toast/flow on failure.
   - Payload built from same state as `saveBooking` + `paymentMethod`, `tourName`, `slug`, `locale`.

3. **`src/lib/booking-history.ts`**
   - `TripBooking` gains optional `paymentMethod?: PaymentMethod` (import type from `src/lib/payment.ts`).
   - `isTripBooking()` guard: optional field not required (old records stay valid); if present validate enum.

### Invariants
- Payment UX unchanged (3s mock webhook, toast, reset-on-switch).
- My Trips pages unaffected (field optional; detail view NOT in scope — YAGNI unless trivial).
- Zero new i18n keys.

### Success Criteria
- `npm run lint` 0.
- Existing `c-booking.mjs` B13 + `c-payment.mjs` 14/14 still pass (they only read existing keys).
- New browser test sees exactly 1 POST `/api/booking-confirmation` with correct payload after mock payment.

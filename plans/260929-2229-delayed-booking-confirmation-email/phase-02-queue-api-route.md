# Phase 02 — Delay Queue + `POST /api/booking-confirmation`

**Status:** complete · **Priority:** P1 · **Plan:** [plan.md](./plan.md)

## Scope

### Files to create
1. **`src/lib/email/confirmation-email-queue.ts`**
   - Module-level `Map<string, EmailJob>` registry (jobId = `crypto.randomUUID()`).
   - `enqueueConfirmationEmail(payload): {jobId, sendAt}`:
     - `delayMs = Number(process.env.BOOKING_EMAIL_DELAY_MS ?? 120000)` (guard NaN/negative → default 120000).
     - `sendAt = Date.now() + delayMs`; insert job `status:"queued"`.
     - schedule via `after(async () => { … })` from `next/server` (imported inside route file if needed — see integration note): at fire time render template → `getProvider().send()` → update job `sent`/`dry-run`/`failed` (+ `error` string, attempts=1, no retry loop — KISS; failures logged + recorded).
   - `getConfirmationEmailJob(id)` accessor (introspection/testing).
   - Note: registry is per-process; dev hot-reload clears pending jobs (documented limitation).

2. **`src/app/api/booking-confirmation/route.ts`**
   - `runtime = "nodejs"`, `POST` only (`GET → 405` like contact).
   - Guard chain (mirror `src/app/api/contact/route.ts`):
     1. 415 non-JSON content-type
     2. 413 body > `MAX_BODY_BYTES = 20_000`
     3. 400 malformed JSON
     4. 400 `{errors}` from `validateBookingConfirmation`
   - Then `enqueueConfirmationEmail(payload)` → **202** `{queued: true, jobId, sendAt: ISO}`.
   - Logging: masked PII (reuse/mirror contact's `maskEmail` approach — name masked, email masked, no phone/notes), plus `reference` + `paymentMethod`.
   - catch → 500 `{error}` (console.error).

### Integration note
`after()` runs per request in the Node route runtime; queue module stays plain TS (scheduling call passed in by route: `enqueue(payload, after)` or route calls `after(() => runJob(job))` directly). Keep queue module framework-agnostic for unit tests — inject scheduler function.

### Success Criteria
- Route compiles (`npm run lint` 0); 202 contract stable; delay honors env override.
- Unit-testable without Next runtime (scheduler injected).

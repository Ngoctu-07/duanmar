# Booking Confirmation Email (Delayed, Bilingual EN/VI)

Plan: `plans/260929-2229-delayed-booking-confirmation-email/`

## What it does

When a booking payment succeeds (mock webhook), the client fires a
**POST `/api/booking-confirmation`** with the booking payload. The server
validates it, enqueues a **delayed job (default 2 minutes / 120,000 ms)**,
and acks `202 {queued, jobId, sendAt}`. At `sendAt` the job renders a
**bilingual (EN + VI stacked) HTML email** and delivers it through the
configured provider.

## Flow

```
booking-payment-section (3s mock webhook → onPaid(method))
  → booking-summary.handlePaid
      ├─ saveBooking (localStorage + paymentMethod)
      └─ fetch POST /api/booking-confirmation   (fire-and-forget)
            → guard chain 415/413/400 (validateBookingConfirmation)
            → enqueueConfirmationEmail(+after() scheduler)
            → 202 {queued, jobId, sendAt = now + BOOKING_EMAIL_DELAY_MS}
                    … 2 minutes later …
            → renderConfirmationEmail(payload) → provider.send()
            → job status: sent | dry-run | failed (logged, no retries)
```

## Env vars (`.env.example`)

| Var | Purpose | Default when unset |
|---|---|---|
| `RESEND_API_KEY` | Resend live delivery (zero-dep `fetch` to `api.resend.com`) | **dry-run** (logs subject + recipient domain only, never delivers) |
| `EMAIL_FROM` | Verified sender (`Name <onboarding@resend.dev>` style) | required for live mode — live send throws config error if missing |
| `BOOKING_EMAIL_DELAY_MS` | Delay before dispatch | `120000` (2 min); garbage/negative → default |

No new npm dependencies (Resend is plain HTTP).

## Email content contract

- **Subject (exact):** `[DuanMar] Tour Booking Confirmation / Thông Tin Đặt Tour - [Booking_ID]`
- **Fields:** Full Name, Email, Phone, Travel Date (DD/MM/YYYY), Guests,
  Total Amount (Intl currency format), Payment Method (bilingual label for
  `momo`/`bank`), Notes (or `None / Không có`).
- **Footer (exact, both languages):**
  - Disclaimer: "Please double-check all details… within 24 hours. / Quý khách vui lòng kiểm tra lại thông tin… vòng 24 giờ."
  - Closing: "Wishing you a wonderful trip and memorable experience! / Chúc quý khách có một chuyến đi thật vui vẻ và trải nghiệm tuyệt vời!"
  - Sign-off: `DuanMar Travel Team`
- All user input is HTML-escaped (`escapeHtml`).
- Template lives in `src/lib/email/confirmation-email-template.ts` —
  hardcoded dual-language strings (not next-intl messages; one email
  carries both languages by design).

## Known limitations

1. **In-process queue** — jobs are held in a module-level `Map` + Next
   `after()` timer: a server restart (or dev hot-reload) inside the
   2-minute window drops the job. Accepted KISS trade-off (no Redis/cron
   in this app); durable outbox = future extension.
2. **No retries** — a failed send records `status: failed` + error on the
   job (logged); no retry loop.
3. **No rate limiting** on the public endpoint (same documented gap as
   `/api/contact`); PII in logs is masked via `maskEmail`/`maskPhone`.
4. **Dry-run is the default** — nothing is delivered until
   `RESEND_API_KEY` + `EMAIL_FROM` are set.

## Tests

- `tests/unit/booking-confirmation-email.test.mts` — subject/footer/date/XSS/validation/delay/queue.
- `tests/browser/b-booking-confirmation-email.mjs` — API contract
  (405/415/400/202, `sendAt ≈ +120000`) + booking-flow POST spy
  (exactly 1 dispatch, payload contract, difficulty fallback for special tours).

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Jobs never send in dev | Expected: no `RESEND_API_KEY` → dry-run logs (`[email:dry-run]`) in the server console |
| `Email config missing` | Live mode needs both `RESEND_API_KEY` and `EMAIL_FROM` |
| Job lost after 2 min | Server restarted inside the window (in-process queue limitation) |
| `sendAt` far from now | `BOOKING_EMAIL_DELAY_MS` set in env — check `.env.local` |

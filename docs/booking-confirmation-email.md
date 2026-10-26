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
| `EMAIL_FROM` | Verified sender (`DuanMar Travel <noreply@your-domain>`); the domain must be verified in Resend | required for live mode — live send throws a typed `missing_sender` error |
| `SENDER_EMAIL` | Alias for `EMAIL_FROM` (bare address or `Name <address>`) | ignored when `EMAIL_FROM` is set |
| `BOOKING_EMAIL_DELAY_MS` | Delay before dispatch | `120000` (2 min); garbage/negative → default |

No new npm dependencies (Resend is plain HTTP). Both password-reset OTP mail
and booking confirmations use the same provider; failures surface a typed
`reason` (`sender_domain_unverified`, `invalid_api_key`, `invalid_sender`,
`recipient_not_allowed`, `rate_limited`, `network_error`, `provider_error`).

## Email content contract

- **Subject (exact):** `[DuanMar] Tour Booking Confirmation / Thông Tin Đặt Tour - [Booking_ID]`
- **Fields:** Full Name, Email, Phone, Travel Date (DD/MM/YYYY), Guests,
  Difficulty (bilingual `Easy / Dễ`, `Medium / Trung bình`, `Hard / Khó`),
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
  (405/415/400/202, `sendAt ≈ configured BOOKING_EMAIL_DELAY_MS`) + booking-flow
  POST spy (exactly 1 dispatch, payload contract, priced universal booking form).

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Jobs never send in dev | Expected: no `RESEND_API_KEY` → dry-run logs (`[email:dry-run]`) in the server console |
| `Email config missing` | Live mode needs both `RESEND_API_KEY` and `EMAIL_FROM` (or `SENDER_EMAIL`) |
| `sender_domain_unverified` (403) | **Current local finding:** Resend answers `The duanmar.website domain is not verified`. Open <https://resend.com/domains>, add the sending domain, copy its DKIM TXT (`resend._domainkey.<domain>`), SPF/MX records into the DNS host, wait for **Verified**, then set `EMAIL_FROM` to an address on that domain and restart the server. |
| `recipient_not_allowed` (403) | The sandbox sender (`onboarding@resend.dev`) can only mail the Resend account owner. Use a verified domain sender for real recipients. |
| `invalid_api_key` (401) | `RESEND_API_KEY` is revoked/restricted. Create a sending key in Resend and update the env; restart the server. |
| `invalid_sender` (422) | `EMAIL_FROM` is malformed or not allowed. Use `Name <address@verified-domain>` or a bare verified address. |
| `rate_limited` (429) | Provider/route throttle. Wait for the retry window; the OTP cooldown is released on failure. |
| Job lost after 2 min | Server restarted inside the window (in-process queue limitation) |
| `sendAt` far from now | `BOOKING_EMAIL_DELAY_MS` set in env — check `.env.local` |

### Confirmed on 2026-10-23

- `RESEND_API_KEY` is loaded and valid: a direct send with
  `from: "DuanMar Travel <onboarding@resend.dev>"` to `delivered@resend.dev`
  returned **200**.
- The configured sender `noreply@duanmar.website` returns **403
  `sender_domain_unverified`**; `resend._domainkey.duanmar.website` does not
  exist in DNS.
- **Quick owner-only test:** set
  `EMAIL_FROM="DuanMar Travel <onboarding@resend.dev>"` and restart. Resend
  will only deliver to the email that owns the Resend account. This is not a
  production fix for arbitrary recipients.

## Diagnosing the current sender

```bash
# 1. Confirm the env is loaded (never print the key itself)
node -e "require('@next/env').loadEnvConfig(process.cwd());console.log({key:Boolean(process.env.RESEND_API_KEY),from:process.env.EMAIL_FROM||process.env.SENDER_EMAIL})"

# 2. Ask Resend to send one message; status 403 means the sender domain is not verified.
#    Use a real recipient on the verified domain before relying on this in production.
curl -s -o - -w '\n%{http_code}\n' https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"DuanMar Travel <noreply@duanmar.website>","to":["you@example.com"],"subject":"DuanMar delivery test","html":"<p>test</p>"}'

# 3. Resend DKIM must exist once the domain is added.
nslookup -type=TXT resend._domainkey.duanmar.website
```

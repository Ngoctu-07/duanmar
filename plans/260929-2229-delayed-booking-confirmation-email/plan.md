# Plan: Delayed Transactional Booking Confirmation Email (Bilingual EN/VI, 2-min delay)

**Plan ID:** 260929-2229 · **Status:** complete · **Priority:** P1
**Context:** user request — dispatch confirmation email 2 min after booking payment success.

## Current State (research, file:line refs)

- Booking completes client-side only: mock webhook 3s → `booking-payment-section.tsx:67-82` → `onPaid` → `booking-summary.tsx:56-75 saveBooking()` → localStorage `vn-my-trips:v1` (no backend, no booking schema).
- Payload at completion: reference `VN-<base36>`, slug, tourName, travelDate, fullName, email, phone, notes, guests, pricePerGuest, total, currency, locale, paidAt. **Gap: payment method (`momo|bank`, `payment.ts:1`) dropped before `onPaid`.**
- Email/queue infra: ABSENT (no nodemailer/resend/bullmq/inngest/cron; no email env keys; 4 API routes only: revalidate, contact, server-time, draft-mode).
- Conventions: contact route guard chain (415→413→400→200, masked PII logs); revalidate route = secret-authed POST; `cn`/KISS; i18n parity test on messages files.

## Design (KISS/YAGNI — no Redis, no new npm deps)

1. **Queue** — in-process delayed job via `after()` (next/server, route handler) + module-level job registry (Map). Delay `BOOKING_EMAIL_DELAY_MS` env (default **120000**). Known limitation: lost on server restart within window + dev hot-reload invalidates module Map (documented; durable Sanity-outbox = future extension, YAGNI now).
2. **Provider** — pluggable `send({to,subject,html})` adapter in `src/lib/email/email-provider.ts`:
   - `RESEND_API_KEY` set → Resend HTTP API via `fetch` (zero deps);
   - else **dry-run** mode: log subject + recipient + payload hash, return `dry-run` id (dev/tests).
3. **Trigger** — client fire-and-forget `POST /api/booking-confirmation` at `handlePaid` (contact-form pattern, `.catch` non-blocking). Server validates → renders → enqueues → **202 `{queued, sendAt, jobId}`**.
4. **Route guards** — same chain as `/api/contact`: 415 → 413 (20 KB) → 400 JSON → 400 field errors (shared `booking-email-validation.ts`: name, email, phone, travelDate, guests≥1, total≥0, currency, reference `VN-*`, locale `en|vi`, paymentMethod `momo|bank`, notes≤500). Masked logs.
5. **Template** — pure fn `renderConfirmationEmail(payload) → {subject, html}`:
   - Subject EXACT: `[DuanMar] Tour Booking Confirmation / Thông Tin Đặt Tour - {reference}`
   - Stacked bilingual rows (EN label / VI label per field), inline-style responsive HTML (email-client safe), all 8 payload fields, HTML-escaped user input.
   - Footer disclaimer + closing + `DuanMar Travel Team` sign-off — exact user-provided strings, EN/VI stacked.
   - Hardcoded dual-language content → **0 new i18n message keys** (parity untouched).
6. **Payment method** — pass `paymentMethod` through `onPaid(method)` → include in email payload + persist optional `paymentMethod` on `TripBooking` (backward-compatible optional field).

## Phases

| # | File | Scope |
|---|------|-------|
| 1 | `phase-01-template-provider-validation.md` | bilingual template + provider adapter + payload types/validation (pure modules) |
| 2 | `phase-02-queue-api-route.md` | `after()` job scheduler + `POST /api/booking-confirmation` |
| 3 | `phase-03-client-dispatch.md` | paymentMethod passthrough + fire-and-forget dispatch + TripBooking field |
| 4 | `phase-04-tests-docs.md` | unit + API + browser tests, `.env.example`, `docs/booking-confirmation-email.md`, changelog |

## Sequencing

Pending approval → implement phases 1-4 → then **one combined gate cycle covering ALL open features** (2114 narrative, 2135 purge, 2151 prune/article/newspaper, 2207 UX, 2229 email): lint → unit → build → schema → full `test:browser` (expect 21/22, revalidate-webhook = expected env fail) → restart dev → all owed docs/status-flips/reports in one pass.

## Gates (per AGENTS.md)

lint 0 · `npm test` (19 → 21/21 expected) · `npm run build` 0 · sanity schema 0 · `test:browser` 21/22 (only revalidate-webhook fails: missing secret) · new tests: `b-booking-confirmation-email.mjs` green.

## Risks / Open Items

- No provider creds in env → real delivery stays dry-run until user adds `RESEND_API_KEY`/`EMAIL_FROM`.
- In-process queue durability (restart window) — accepted limitation, documented.
- Public unauthenticated endpoint accepts PII — masked logs; rate-limit gap documented (same as contact).
- Dev hot-reload clears pending jobs — dev-only concern.

**Docs impact:** minor (changelog + new `docs/booking-confirmation-email.md` + .env.example).

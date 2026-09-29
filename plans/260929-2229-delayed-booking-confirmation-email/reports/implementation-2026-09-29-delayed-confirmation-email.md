# Implementation Report — Delayed Bilingual Booking-Confirmation Email (2-min Queue)

**Date**: 2026-09-29 · **Plan**: `plans/260929-2229-delayed-booking-confirmation-email/` · **Status**: Complete (100%)

## Approved decisions
- **Resend HTTP API via plain fetch** (0 npm deps) + **in-process `after()` queue**, delay `BOOKING_EMAIL_DELAY_MS` default **120000**; dry-run provider fallback when `RESEND_API_KEY` absent.
- In-process limitation accepted: jobs lost on restart inside the 2-minute window (documented).
- Single email contains **both languages** (EN block + VI block), subject exact per spec — 0 i18n keys added.

## Changes
- NEW `src/lib/email/email-types.ts`, `confirmation-email-template.ts` (subject `[DuanMar] Tour Booking Confirmation / Thông Tin Đặt Tour - [Booking_ID]`, 8 fields, DD/MM/YYYY, `Intl` totals, bilingual payment method momo/bank, notes `None / Không có`, `escapeHtml` all input, inline-style tables), `email-provider.ts` (Resend send / `[email:dry-run]` fallback), `confirmation-email-queue.ts` (Map + injected scheduler, lifecycle queued→sent|dry-run|failed).
- NEW `src/lib/booking-email-validation.ts` (14 checks).
- NEW `src/app/api/booking-confirmation/route.ts`: guard chain 415 → 413 (20KB) → 400 JSON → 400 validation → **202 `{queued, jobId, sendAt}`**; schedules via `after()`; masked logging; GET 405.
- Client: `booking-payment-section.tsx` `onPaid(method)` (paymentMethod was dropped — fixed), `booking-summary.tsx` `handlePaid` = `saveBooking(+paymentMethod)` + fire-and-forget POST (non-blocking), `TripBooking.paymentMethod?`.
- `.env.example` +`RESEND_API_KEY`/`EMAIL_FROM`/`BOOKING_EMAIL_DELAY_MS`; docs NEW `docs/booking-confirmation-email.md` (architecture/runbook/troubleshooting/limitations).

## Verification
- NEW unit `booking-confirmation-email.test.mts`: subject/footer/date/XSS/validation×9/delay/queue → runner **21/21**.
- NEW `tests/browser/b-booking-confirmation-email.mjs` **12/12**: 405/415/400/202 (`sendAt` delta **120007ms**), flow spy exactly 1 POST with payload contract, difficulty-select fallback for special tour `hcm`, 0 pageerror.
- Gates (combined cycle): lint 0 · unit 21/21 · build 0 · schema 0 errors · suite 25/26 (sole fail = pre-existing `revalidate-webhook` env).

## Concerns
- `RESEND_API_KEY`/`EMAIL_FROM` unset → dry-run until configured (expected).

## Docs impact
minor — changelog + `docs/booking-confirmation-email.md` + `.env.example` + plan statuses + this report.

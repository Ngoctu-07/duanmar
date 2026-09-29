# Phase 01 — Bilingual Template, Provider Adapter, Validation

**Status:** complete · **Priority:** P1 · **Plan:** [plan.md](./plan.md)

## Scope (pure modules — no route/UI yet)

### Files to create
1. **`src/lib/email/confirmation-email-template.ts`**
   - `renderConfirmationEmail(payload: BookingConfirmationPayload): { subject: string; html: string }`
   - Subject EXACT: `` `[DuanMar] Tour Booking Confirmation / Thông Tin Đặt Tour - ${reference}` ``
   - Responsive HTML table/layout, **inline styles only** (email-client safe), max-width ~600px.
   - Structure: DuanMar header → greeting → **stacked bilingual data rows** → payment summary → mandatory footer block → sign-off.
   - Data rows (each: EN label, VI label, value):
     - Full Name / Họ và tên
     - Email / Email (value = customer email)
     - Phone / Số điện thoại
     - Travel Date / Ngày khởi hành → **DD/MM/YYYY** via explicit formatter (input ISO `YYYY-MM-DD`)
     - Guests / Số lượng khách → count + bilingual unit ("guests / khách")
     - Total Amount / Tổng thanh toán → `formatted(amount, currency)` (Intl.NumberFormat, VND no decimals; USD 2 decimals)
     - Payment Method / Phương thức thanh toán → bilingual map: `momo` = "MoMo E-wallet / Ví MoMo", `bank` = "Bank Transfer / Chuyển khoản ngân hàng"
     - Notes / Yêu cầu đặc biệt → escaped, or "None / Không có" when empty
   - Footer block (EXACT strings, stacked EN then VI):
     - Disclaimer: `Please double-check all details. If you notice any discrepancies, please inform our support team within 24 hours.` / `Quý khách vui lòng kiểm tra lại thông tin, nếu có sai sót xin báo ngay cho chúng tôi trong vòng 24 giờ.`
     - Closing: `Wishing you a wonderful trip and memorable experience!` / `Chúc quý khách có một chuyến đi thật vui vẻ và trải nghiệm tuyệt vời!`
     - Sign-off: `DuanMar Travel Team`
   - HTML-escape every user-supplied value (`escapeHtml` local helper: & < > " ').

2. **`src/lib/email/email-types.ts`**
   - `BookingConfirmationPayload` (server-validated): `reference, fullName, email, phone, travelDate (ISO), guests, total, currency, paymentMethod ("momo"|"bank"), notes?, tourName, locale ("en"|"vi"), slug?`
   - `EmailJob` + `EmailJobStatus = "queued" | "sent" | "failed" | "dry-run"`.

3. **`src/lib/email/email-provider.ts`**
   - `interface EmailProvider { send(opts: {to, subject, html}): Promise<{id: string; mode: "live"|"dry-run"}> }`
   - `getProvider()`: `RESEND_API_KEY` set → Resend adapter (`fetch` POST `https://api.resend.com/emails`, headers `Authorization: Bearer …`, from `EMAIL_FROM` required, else throw config error); else dry-run adapter (console.info masked subject/to-domain, `{id: "dry-run-<timestamp>"}`).
   - Live send failure → throw (route marks job `failed`).

4. **`src/lib/booking-email-validation.ts`**
   - `validateBookingConfirmation(body: unknown): {ok:true, payload} | {ok:false, errors: Record<string,string>}`
   - Rules: required non-empty name/phone/tourName/reference; `email` RFC-lite regex; `travelDate` parseable `YYYY-MM-DD`; `guests` integer ≥1 ≤99; `total` finite ≥0; `currency` ∈ {VND,USD}; `paymentMethod` ∈ {momo,bank}; `locale` ∈ {en,vi}; `reference` /^VN-[0-9A-Z]+$/; `notes` ≤500 chars.
   - Errors object keyed like contact route validator (unit-testable).

### Success Criteria
- `npm run lint` 0; pure functions, no "use client", no route imports.
- Template escapes malicious input; subject/footer strings byte-exact per spec.

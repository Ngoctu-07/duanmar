---
title: "[Feature] Thanh toán — Tiered pricing + QR payment UI"
description: "Xoá placeholder 'Liên hệ để nhận báo giá' → clamp tier gần nhất để luôn có tổng giá (CMS tiers). Thêm Payment Method (MoMo / Bank transfer) trong Order Summary, hiển thị QR (dep qrcode, payload mock) + số tiền cần trả + trạng thái Pending → Success sau 3s (mock webhook)."
status: completed
priority: P1
effort: "4-6h"
tags: [feature, booking, pricing, payment, qr, i18n]
created: 2026-09-27
---

# Thanh toán — Tiered pricing + QR payment UI

## Executive Summary
**(1) Pricing**: checkout + order summary hiện fallback "Liên hệ để nhận báo giá" khi số khách không khớp tier → thay bằng **clamp về tier gần nhất** (tier đã lấy từ CMS `tourPricing`, `total = guests × tier.pricePerGuest`) → luôn hiển thị tổng. **(2) Payment**: trong `BookingSummary` thêm **Payment Method** (MoMo · Bank Transfer) → chọn method → hiện **QR** (sinh local bằng dep `qrcode`, payload mock) + **số tiền cần thanh toán** + **trạng thái** Pending (muted) → tự chuyển **Success** (bold, xanh) sau 3s (giả lập webhook). Không backend, không gateway thật.

## Decisions (đã chốt qua question tool)
| # | Quyết định |
|---|---|
| P1 | Không khớp tier → **clamp về tier gần nhất** (dưới → tier đầu, trên → tier cuối); **bỏ** text placeholder |
| P2 | QR = **payload mock** sinh local (ghi rõ "QR demo") |
| P3 | Pending → Success **tự động sau ~3s** (mock webhook) |
| P4 | UI thanh toán nằm **trong BookingSummary hiện tại** (không thêm route) |
| P5 | Thêm dep **`qrcode`** (+ `@types/qrcode`) để sinh QR |

## Current state
- Checkout `src/app/[locale]/booking/checkout/page.tsx:38-53` đã fetch `TOUR_PRICING_BY_SLUG_QUERY` (CMS) → `mapPricingTiers` → `BookingForm { slug, tourName, tiers, locale }`.
- Tính giá hiện có: `src/lib/pricing.ts:78` `findTierForGuests` (**exact match only** → null khi lệch range) → `booking-form.tsx:47` → `booking-pricing-section.tsx:79-84` render `t("priceUnavailable")`; `booking-summary.tsx:88-93` Total row cũng fallback `priceUnavailable`.
- Data CMS hiện tại: tier `100000–200000 @150.000₫` và `300000–400000 @350.000₫` (giá trị test) → guest 1–99 **không khớp** → đang thấy placeholder. Với P1: 2 khách → clamp tier 1 → **300.000 ₫** (đúng ví dụ của user).
- `BookingSummary` (`booking-summary.tsx:101 dòng`): ref `VN-…`, rows dl, link quay lại tour. **Chưa có** payment/QR. Repo **không** có lib QR/payment/toast nào (`package.json:11-44`).
- i18n ns `booking` EN/VI = 35 key, parity OK. `priceUnavailable` = key cần xoá.

## Design
### 1. Pricing (lib)
- `src/lib/pricing.ts`: **đổi tên/mở rộng** `findTierForGuests` → `resolveTierForGuests(tiers, guests)`:
  1. `guests` không phải int ≥1 hoặc `tiers` rỗng → `null`.
  2. Sắp copy theo `minGuests` asc → khớp exact → trả tier đó.
  3. `guests < tier đầu` → tier đầu · `guests > range cuối` → tier cuối (**clamp**).
  - `total = guests × tier.pricePerGuest` (giữ nguyên ở `booking-form.tsx`).
- Hiển thị: `booking-pricing-section.tsx` bỏ nhánh `priceUnavailable` → chỉ render box giá khi có `tier && total`. `booking-summary.tsx`: chỉ render row **Tổng cộng** khi có `tier && total` (không fallback text).
- Nếu tour **không có doc pricing** (tiers rỗng) → không hiện giá (không bịa số), form vẫn submit được.
- **Không đổi**: `PriceBlock` (trang detail vẫn exact-match — tier range không khớp thì block giữ hành vi cũ), query, schema.

### 2. Payment (mới)
- `src/lib/payment.ts` (pure, test được): `type PaymentMethod = "momo" \| "bank"`, `buildPaymentPayload(method, amount, reference)` → string mock:
  - momo: `momo://pay?amount={amount}&order={ref}&txn=VNTOUR`
  - bank: `BANK|acc=000123456789|bank=VPB|amount={amount}|ref={ref}`
- `src/components/booking/booking-payment-section.tsx` (client, <150 dòng):
  - **Method selector**: 2 `<input type="radio" name="payment-method">` + `Label` trong card chọn (`has-[input:checked]:border-primary`), `role="radiogroup"` wrapper.
  - Chọn method → `status="pending"` + `useEffect` timer 3000ms → `status="success"`; đổi method → reset về pending (clear timer).
  - **QR**: `QRCode.toDataURL(payload, { width: 240, margin: 1 })` trong `useEffect` → `<img alt={t("qrAlt")}>`; kèm caption `qrHint` + `demoQr` ("QR demo — chưa kết nối cổng thanh toán thật").
  - **Số tiền cần thanh toán**: `formatPrice(total, locale, currency)` (đậm, `tabular-nums`).
  - **Status** dưới số tiền: Pending → `text-muted-foreground` (muted/gray) · Success → `font-bold text-green-600`; `aria-live="polite"` để AT đọc khi đổi.
  - Render `null` khi `total === null` (không có giá → không có khối thanh toán).
- Nối vào `booking-summary.tsx`: sau `<dl>`, trước link "Quay lại tour" → `<BookingPaymentSection total locale currency reference />`.

### 3. i18n (ns `booking`, thêm 8 key, xoá 1)
Thêm EN/VI: `paymentTitle`, `methodMomo`, `methodBank`, `payable`, `qrHint`, `qrAlt`, `demoQr`, `statusPending`, `statusSuccess` (9 key). **Xoá**: `priceUnavailable`. Parity 2 file.

## Files
**Tạo**: `src/lib/payment.ts` · `src/components/booking/booking-payment-section.tsx`
**Sửa**: `src/lib/pricing.ts` (resolve clamp) · `booking-form.tsx` (import) · `booking-pricing-section.tsx` (bỏ placeholder) · `booking-summary.tsx` (bỏ fallback + mount payment) · `src/messages/{en,vi}.json`
**Dep mới**: `qrcode`, `@types/qrcode`
**Xoá**: không (chỉ key message)

## Implementation steps
1. `npm i qrcode && npm i -D @types/qrcode`.
2. `pricing.ts`: `resolveTierForGuests` (thay `findTierForGuests`) + cập nhật call site/test.
3. `payment.ts`: `buildPaymentPayload` + type.
4. `booking-pricing-section.tsx` / `booking-summary.tsx`: bỏ placeholder.
5. `booking-payment-section.tsx` (radio + QR + amount + status + timer).
6. Mount vào summary + messages (EN/VI, xoá `priceUnavailable`).
7. Tests (bảng dưới) → `code-reviewer` → changelog + plan status.

## Tests
| # | Test | Cách | Pass |
|---|---|---|---|
| D1 | `resolveTierForGuests` + `buildPaymentPayload` | tsx unit: exact · clamp dưới/giữ trên · rỗng/invalid → null · payload chứa amount+ref, 2 method khác nhau | 100% |
| D2 | Lint | `npm run lint` | 0 |
| D3 | Typecheck | `npx tsc --noEmit` | 0 |
| D4 | Build | dừng dev → build → `rm -rf .next` → start dev | exit 0 |
| D5 | Không còn placeholder | curl checkout + summary → **không** chứa "Liên hệ để nhận báo giá"/"Contact us for a quote"; key bị xoá khỏi 2 file | đúng |
| D6 | Tổng giá realtime (clamp) | puppeteer: guests 1 → `150.000 ₫`, 2 → `300.000 ₫`, 99 → `14.850.000 ₫` (tier 1 do clamp) | đúng |
| D7 | Payment flow | chọn MoMo → có `<img>` QR + số tiền + status muted; sau ≥3s → `font-bold text-green-600`; đổi Bank → QR/payload khác + reset pending→success | đúng |
| D8 | A11y | radio có label/`checked` state, status `aria-live=polite`, contrast AA (muted 4.74:1; green-600 trên trắng ≈ 4.5:1) | đúng |
| D9 | i18n parity | so key `booking` EN/VI; không còn `priceUnavailable` | đúng |
| D10 | Visual | screenshot payment block (pending + success) + summary | khớp design |

## Risks / Notes
- `qrcode` là dep đầu tiên ngoài list hiện có → bundle client tăng ~30-50KB (chỉ load ở summary); nếu install fail → báo lại để chọn phương án khác.
- Success **chỉ là giả lập** (3s timer, không verify thật) → copy phải ghi "QR demo / chưa kết nối cổng thanh toán".
- Data tier CMS đang là số test (100000+) → clamp cho ra giá "hợp lý" nhưng range trên trang detail vẫn sai → **user cần sửa trong Studio** (ngoài scope code).
- `resolveTierForGuests` thay `findTierForGuests` → unit test cũ (mong `null` khi dưới range) phải cập nhật sang hành vi clamp.
- Tóm tắt đơn hàng + QR nằm trong state client → F5 mất trạng thái (đã là hành vi hiện tại của summary).

## Unresolved Questions
Không còn (P1–P5 đã chốt).

## Test results (2026-09-27)
- Unit: payment-logic **8/8**
- Browser: `c-payment` exit 0
- Status: `completed`

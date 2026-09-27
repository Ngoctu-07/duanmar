---
title: "[Feature] Đặt vé — Booking flow & checkout form"
description: "Đổi nút 'Thêm vào chuyến đi' → 'Đặt vé' (navigate sang /booking/checkout). Checkout 3 section: Contact · Số khách + tổng giá realtime (tier) · Chọn Độ khó. Submit → xác nhận client-only (không backend)."
status: completed
priority: P1
effort: "4-6h"
tags: [feature, booking, checkout, form, pricing, i18n]
created: 2026-09-27
---

# Đặt vé — Booking flow & checkout form

## Executive Summary
Detail page `…/explore/destinations/[slug]` hiện chỉ có nút toggle trip-planner. Thay bằng **nút Đặt vé** → trang checkout `/[locale]/booking/checkout?tour=<slug>` (server fetch dest + pricing theo slug → render form client). Form 3 section, tổng giá **realtime = số khách × giá/khách của tier khớp**, submit → **xác nhận trên client** (không lưu, không API). Không dependency mới, không schema mới.

## Decisions (đã chốt qua question tool)
| # | Quyết định |
|---|---|
| D1 | Nút **thay hẳn** AddToTrip → navigate sang checkout |
| D2 | Submit → **xác nhận client-only** (không backend, không Sanity write) |
| D3 | Total = **số khách × pricePerGuest** của tier khớp |
| D4 | UI: **shadcn primitives** (label/input/textarea/select) + **validate tay** |
| D5 | Section 3 = **select Độ khó** (Dễ/Trung bình/Kó), **hiện mọi trường hợp** (unconditional) |
| D6 | Tiền tệ: VI→VND, EN→USD (giữ convention `getCurrency`) |

## Current state (research)
- Nút: `src/app/[locale]/explore/destinations/[slug]/page.tsx:92` → `AddToTripButton` (`src/components/trip-planner/add-to-trip-button.tsx:8`, toggle localStorage `vn-trip-plan:v1`, **chỉ dùng đúng 1 chỗ**).
- Không có booking/checkout/order/payment code nào trong repo; chỉ có API `src/app/api/draft-mode/enable/route.ts`.
- Không concept game/difficulty trong schema/i18n → Section 3 là field mới thuần UI (không phụ thuộc data).
- Pricing: page fetch `TOUR_PRICING_BY_SLUG_QUERY` (`page.tsx:51-57`) → `mapPricingTiers` (`:63`) → `PriceBlock` (`:101`). `src/lib/pricing.ts` **pure, client-safe** (`formatPrice`, `getCurrency`, `mapPricingTiers`).
- UI primitives chỉ có `ui/{button,card,sheet,navigation-menu}.tsx`; **thiếu** input/textarea/label/select → `components.json` style `base-nova`, shadcn CLI sẵn có.
- Không zod/react-hook-form/toast → validate tay.
- Route mới **không cần** sửa routing config (`src/i18n/routing.ts` chỉ có locales; middleware matcher tự phủ).
- i18n: client = `useTranslations("ns")`, server = `getTranslations("ns")`; 27 namespace hiện có (parity EN/VI = 324 key).

## Design
### 1. Nút Đặt vé
`BookTicketButton` — server component (không `"use client"`): `Button size="sm"` `render={<Link href={{ pathname: "/booking/checkout", query: { tour: slug } }} />}` (next-intl `Link` tự prefix locale). Icon `Ticket` (lucide). Label từ ns `booking.bookNow` ("Đặt vé" / "Book Ticket").

### 2. Route `/[locale]/booking/checkout`
Server page: `searchParams: Promise<{ tour?: string }>` → fetch song song (`fetchPublished` cho pricing + `client.fetch` cho destination, `.catch(null)`). Không có tour → `notFound()`. Render `BookingForm` với props serializable: `{ slug, tourName, tiers: PriceTier[], locale, currency }`.

### 3. Form (client, controlled, `useState` + 1 object state)
- **Section 1 Contact**: `fullName` (text, required ≥2), `email` (email, required, regex), `phone` (tel, required, regex `^\+?[0-9\s-]{8,15}$`), `notes` (textarea, optional, max 500).
- **Section 2 Guest & pricing**: `guests` (number, required, int 1–99). **Live**: `tier = findTierForGuests(tiers, guests)` → `total = guests × tier.pricePerGuest`. Hiện breakdown `formatPrice(pricePerGuest) × N` + `Tổng cộng`. Không khớp tier / tiers rỗng → ô muted "Liên hệ để nhận báo giá" (không bịa số), vẫn submit được.
- **Section 3 Difficulty**: `select` 1 mức `easy|medium|hard` (required, placeholder), hiện **luôn**.
- **Submit hợp lệ** → thay form bằng `BookingSummary`: tên tour, SĐT/email/người đặt, khách, độ khó, tổng, mã `VN-<base36>` + nút "Quay lại tour". Copy trung thực (sẽ liên hệ xác nhận — **không** hứa thanh toán/thanh toán online).
- **Validate**: blur + on submit; lỗi inline `text-destructive text-xs` gắn qua `aria-describedby` + `aria-invalid`.

### 4. Pricing helper
Thêm `findTierForGuests(tiers: PriceTier[], guests: number): PriceTier | null` vào `src/lib/pricing.ts` (pure): trả tier có `guests >= minGuests && (maxGuests === null || guests <= maxGuests)`, sorted asc → linear scan; `guests < 1` → null.

## Files
**Tạo**
- `src/app/[locale]/booking/checkout/page.tsx` (server, metadata qua `getTranslations`)
- `src/components/booking/book-ticket-button.tsx`
- `src/components/booking/booking-form.tsx` (state + orchestration + submit)
- `src/components/booking/booking-contact-section.tsx`
- `src/components/booking/booking-pricing-section.tsx`
- `src/components/booking/booking-difficulty-section.tsx`
- `src/components/booking/booking-summary.tsx`
- `src/components/booking/booking-validation.ts` (pure validators)
- `src/components/ui/{label,input,textarea,select}.tsx` (shadcn add → fallback hand-roll base-nova)
**Sửa**
- `src/app/[locale]/explore/destinations/[slug]/page.tsx:92` (đổi nút)
- `src/lib/pricing.ts` (+`findTierForGuests`)
- `src/messages/{en,vi}.json` (+namespace `booking`, parity)
**Xoá**
- `src/components/trip-planner/add-to-trip-button.tsx` (1 usage duy nhất)
**Không sửa**: schema, routing, middleware, trip-planner page/context (vẫn hoạt động với data đã có).

## Implementation steps
1. Primitives: thử `npx shadcn@latest add label input textarea select` → nếu fail (mạng/style) → viết tay theo `ui/button.tsx` pattern.
2. `lib/pricing.ts` + `findTierForGuests`.
3. `booking-validation.ts` (5 validators thuần).
4. `book-ticket-button.tsx` + swap ở `page.tsx:92` + xoá `add-to-trip-button.tsx`.
5. `booking/checkout/page.tsx` (fetch + props).
6. 4 section component + `booking-form.tsx` + `booking-summary.tsx`.
7. Messages `booking` (EN/VI) — parity.
8. Tests (bảng dưới) → `code-reviewer` → changelog + plan status.

## Tests
| # | Test | Cách | Pass |
|---|---|---|---|
| B1 | `findTierForGuests` | tsx unit: khớp giữa/đầu/cuối, khách > max → null, tiers rỗng, guests 0 | mục tiêu 100% |
| B2 | validators | tsx unit: name/email/phone/guests hợp lệ & bất hợp lệ | mục tiêu 100% |
| B3 | Lint | `npm run lint` | 0 |
| B4 | Typecheck | `npx tsc --noEmit` | 0 |
| B5 | Build | dừng dev → build → `rm -rf .next` → start dev | exit 0 |
| B6 | Nút | curl `/vi/explore/destinations/hcm` → text "Đặt vé", href `/vi/booking/checkout?tour=hcm`, **không còn** "Thêm vào chuyến đi" | đúng |
| B7 | Checkout render | curl `/vi/...checkout?tour=hcm` → 3 section + tên tour + `₫`; `/en` → `$`; `?tour=xxx` → 404 | đúng |
| B8 | Total realtime | puppeteer: guests 1→`150.000 ₫`, 2→`300.000 ₫`, 4→`1.400.000 ₫` (tier đổi) | đúng |
| B9 | Validate + submit | puppeteer: submit rỗng → lỗi inline; email/sđt sai → lỗi; hợp lệ → summary hiện tổng + mã | đúng |
| B10 | Không pricing | tour không doc → hiện "Liên hệ để nhận báo giá", submit vẫn ra summary | đúng |
| B11 | i18n + a11y | parity key `booking` EN/VI; `label for`, `aria-invalid`, contrast AA | đúng |
| B12 | Visual | screenshot nút + checkout + summary | khớp design |

## Risks / Notes
- shadcn CLI cần mạng → fallback hand-roll (cùng style, không blocker).
- **Hệ quả D1**: `/trip-planner` không còn chỗ "thêm tour" (header badge + trang vẫn chạy với data cũ) — chấp nhận theo quyết định.
- Xác nhận client-only → copy **không được** ngụ ý thanh toán/đã giữ chỗ.
- Tổng giá phụ thuộc data tier (hiện data test: 150.000/350.000) → test dùng giá thật hiện có, không hardcode kỳ vọng khi data đổi (B8 so đúng giá tier trả về).
- File `booking-form.tsx` có nguy cơ >200 dòng → tách section như cấu trúc trên (mỗi file <150).

## Unresolved Questions
Không còn (D1–D6 đã chốt).

## Test results (2026-09-27)
- Unit: booking-logic **13/13**, pricing-range **15/15**, travel-date **11/11**
- Browser: `c-booking` exit 0 · `d8-a11y` exit 0
- `tsc` / `eslint` / `build`: exit 0
- Code review: `plans/reports/code-review-booking-payment-mytrips-20260927.md`
- Status: `completed`

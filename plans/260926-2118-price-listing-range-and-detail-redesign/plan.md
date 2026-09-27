---
title: "[Feature/Fix] Price — khoảng giá rút gọn trên listing + redesign block giá chi tiết"
description: "Listing (/vi + hub) không có giá vì pipeline giá chỉ chạy ở 2 trang detail → thêm price range 1 dòng. Block giá chi tiết clunky (table 3 cột + IN HOA đỏ toàn bộ + disclaimer caps đỏ) → redesign compact/elegant/intuitive, giữ nguyên vị trí ngay dưới description."
status: in-review
priority: P1
effort: "3-5h"
tags: [feature, pricing, ui-redesign, i18n, sanity]
created: 2026-09-26
updated: 2026-09-26
---

## Unresolved Questions — đã chốt (approve qua question tool)
1. **Scope listing**: Homepage + 2 hub (destinations + itineraries). ✅
2. **Metric + tiền tệ**: `pricePerGuest` min→max · VI→VND, EN→USD (không FX). ✅
3. **Style block chi tiết**: **A** — đỏ làm accent, bỏ IN HOA toàn bộ (label GIÁ vẫn caps). ✅
4. Duyệt plan → bắt đầu. ✅
---

# [Feature/Fix] Price listing range + detail redesign

## Executive Summary
**(1) Listing**: thẻ tour không có giá → thêm **khoảng giá tham khảo** 1 dòng, chỉ render khi có data. **(2) Detail**: block giá dưới description quá nặng → redesign compact/elegant, giữ vị trí. Không sửa schema, không thêm dependency, không bịa giá.

## Root Cause
- **RC1 — Listing không có giá**: phase-01 chỉ mount `PriceBlock` ở 2 trang detail; không có query/helper nào đưa `tourPricing` ra listing.
  - `src/app/[locale]/page.tsx:14-16` chỉ fetch `HOMEPAGE_QUERY` + `FEATURED_DESTINATIONS_QUERY`.
  - `FeaturedDestinations` / `DestinationCard` / `TrendingItineraries` không nhận prop giá; hub `explore/destinations/page.tsx:43-49` cũng không.
  - → giá "mất" hoàn toàn ở tầng liệt kê.
- **RC2 — Detail clunky**: `src/components/pricing/price-block.tsx` dùng `border bg-card p-6 uppercase text-destructive` cho **toàn bộ** block; bảng 3 cột header IN HOA; disclaimer **IN HOA màu đỏ** dài wrap 2 dòng → không phân cấp thị giác (mọi thứ cùng độ mạnh), padding nặng, chữ hoa đỏ gây "la hét".
  - Vị trí thì **đúng** (ngay sau description, `explore/destinations/[slug]/page.tsx`) → giữ nguyên, chỉ siết khoảng cách.

## Current evidence
- DOM `/vi/explore/destinations/hcm`: `... Miền Bắc | Thêm vào chuyến đi | HCM | HCM đẹp lắm | Giá | Quy mô nhóm | Mỗi khách | Tổng nhóm | 100000–200000 khách ...` → block đã ngay dưới description.
- Data tier hiện tại là số test (`100000–200000 khách`, `Tổng nhóm 2 ₫`, thêm row `300000–400000`) → góp phần làm block "clunky"; **user cần sửa trong Studio** (ngoài scope code).
- Chỉ **1 doc** `tourPricing` (`hcm`) → card khác phải **ẩn** giá; card itinerary chưa có data.

## Proposed design

### A. Khoảng giá trên listing (1 dòng)
```
Giá tham khảo   1.290.000 ₫ – 1.850.000 ₫
                └ text-xs text-muted-foreground    └ font-semibold text-destructive tabular-nums
```
- Metric: min→max của `pricePerGuest*` qua các tier; `min === max` → in 1 giá (không "X – X").
- Tiền tệ: theo quyết định đã chốt **VI → VND, EN → USD** (không tự quy đổi).
- Không có data → **không render** (null), không label rỗng.
- 2 dòng mới trong `lib/pricing.ts`: `buildPriceRanges(docs)` + `formatPriceRange(range, locale)` (pure, test được).

### B. Block giá chi tiết (redesign)
Giữ: ngay dưới description, `<section aria-labelledby>`, `<table>` semantics + `scope`, `tabular-nums`, filter không bịa giá.
Đổi theo style được chọn (xem Unresolved #3):
- siết padding `p-6 → p-5`, bỏ cột/thanh thừa, phân cấp: **tier label** (đậm, neutral) · **giá/khách** (đỏ, đậm) · **tổng nhóm** (nhỏ, muted) · disclaimer `text-xs` **sentence-case + muted** (bỏ IN HOA đỏ).

## Files
**Tạo**: `src/components/pricing/price-range.tsx` (presentational, không hook → dùng được trong client + server tree)
**Sửa**: `lib/pricing.ts` · `sanity/queries/tour-pricing.ts` (+query all docs) · `components/explore/destination-card.tsx` · `components/homepage/featured-destinations.tsx` · `components/homepage/trending-itineraries.tsx` · `components/pricing/price-block.tsx` · `app/[locale]/page.tsx` · `app/[locale]/explore/destinations/page.tsx` · `app/[locale]/explore/itineraries/page.tsx` · `messages/{en,vi}.json` (+keys `priceRange.*`)
**Xoá**: không

## Implementation steps
1. Query `ALL_TOUR_PRICING_QUERY` (`tourSlug + tiers pricePerGuest*`), fetch `.catch(() => null)`.
2. `lib/pricing.ts`: `buildPriceRanges` (skip tier malformed, sort, min/max per currency) + `formatPriceRange` (min===max → 1 giá).
3. `price-range.tsx` (≤60 dòng): `render null` khi không có range.
4. Wire: homepage → `FeaturedDestinations` + `TrendingItineraries`; hub destinations → `DestinationCard`; hub itineraries → card row.
5. Redesign `price-block.tsx` theo style đã chốt (≤120 dòng).
6. Messages EN/VI + key mới (parity).
7. Tests (bảng dưới) → `code-reviewer` → changelog + cập nhật plan.

## Tests
| # | Test | Cách | Pass |
|---|---|---|---|
| C1 | `buildPriceRanges`/`formatPriceRange` | tsx script `/tmp/opencode/pricing-range.test.ts` | ✅ 13/13 |
| C2 | Lint | `npm run lint` | ✅ 0 error |
| C3 | Typecheck | `npx tsc --noEmit` | ✅ 0 error |
| C4 | Build | dừng dev → `npm run build` → `rm -rf .next` → start dev | ✅ exit 0, dev 200 sau restart |
| C5 | Listing có giá | curl `/vi`, `/vi/explore/destinations` → card `hcm` = `Giá tham khảo … 150.000 ₫ – 350.000 ₫`; `/en` = `$50 – $100` | ✅ |
| C6 | Listing không data | `/vi`, `destinations` = **1** price row; `itineraries` = **0** row (cards khác không có label trong HTML render) | ✅ |
| C7 | Detail | `/vi\|en/explore/destinations/hcm` → block ngay dưới description, 2 tier, aria×2, col×3, row×2 | ✅ |
| C8 | i18n parity | so key `priceRange` EN vs VI + `pricing` 8 key | ✅ đồng bộ |
| C9 | A11y/contrast | `aria-labelledby` ×2 · `th scope` col/row · destructive `#e40014` on `#fff` = **4.87:1**, muted `#737373` = **4.74:1** | ✅ AA |
| C10 | Visual | puppeteer screenshot `c10-detail-price-block-{vi,en}.png`, `c10-card-price-range-vi.png` | ✅ khớp Style A |

## Risks / Notes
- Data tier của user đang sai số → range sẽ vô nghĩa (`100000 ₫ – 350000 ₫`); code không sửa data. Khuyến nghị user sửa trong Studio.
- Homepage thêm 1 Sanity fetch (song song, có catch) → không tăng độ trễ đồng bộ.
- Card itinerary chưa có doc `tourPricing` → không hiện giá (đúng rule không bịa).
- Yêu cầu gốc "IN HOA đỏ toàn bộ" mâu thuẫn với "clean/elegant" → cần chốt (Unresolved #3).

## Unresolved Questions — đã chốt trước khi code (xem đầu file)
1. **Scope listing**: chỉ `/vi` (featured destinations + trending itineraries), hay thêm hub `/vi/explore/destinations` + `/vi/explore/itineraries`?
2. **Metric + tiền tệ khoảng giá**: `pricePerGuest` min–max & VI→VND/EN→USD (khuyến nghị) · hay `$` cho cả 2 locale (theo ví dụ `$3 - $6`) · hay dùng `groupTotal`?
3. **Style block chi tiết**:
   - **A (khuyến nghị)** — card nhẹ `p-5`, GIÁ label đỏ nhỏ IN HOA, tier label neutral, **giá đỏ đậm**, tổng nhóm muted nhỏ, disclaimer sentence-case muted.
   - **B** — giữ nguyên **IN HOA đỏ toàn bộ** (yêu cầu gốc), chỉ compact: padding nhỏ, bỏ header cột phụ, disclaimer 1 dòng.
   - **C** — bỏ card border, danh sách ruled tối giản (chỉ kẻ mảnh), đỏ chỉ dành cho số giá.
4. Duyệt plan để bắt đầu?

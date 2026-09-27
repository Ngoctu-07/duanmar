---
phase: 1
title: "Implement Price tier block (Sanity → PriceBlock → 2 trang detail)"
status: pending
priority: P2
---

# Phase 1 — Implement Price tier block

## Context Links
- Overview: `plans/260926-1915-price-tier-block/plan.md`
- Điểm chèn: `itineraries/[slug]/page.tsx:65-67`, `destinations/[slug]/page.tsx:83-88`
- Token màu: `src/app/globals.css:65` (`--destructive`) → `text-destructive`
- Registry schema: `src/sanity/schemaTypes/index.ts:6-8`
- Query: `src/sanity/queries/destinations.ts:17-28`

## Overview
- **Priority**: P2 · **Status**: pending (chờ duyệt) · **Effort**: 4-6h
- **Mô tả**: bảng giá tier tĩnh, IN HOA + đỏ, dưới mô tả tour, dữ liệu từ Sanity.

## Key Insights
- 1 component tái dùng cho 2 trang; nhận `tiers` đã chuẩn hóa + `currency`.
- Render có điều kiện: `tiers.length === 0` → `return null`.
- Không tính giá phía client (bảng static, server render → SEO/ink tốt).

## Requirements
### Functional
1. Bảng tier hiển thị: nhãn tier, **giá / khách**, **tổng nhóm**.
2. Toàn bộ chữ trong block: `uppercase` + `text-destructive`.
3. VI → `VND` (`Intl.NumberFormat("vi-VN", { currency: "VND" })`), EN → `USD` (`en-US`/`USD`).
4. Không có dữ liệu giá → không render block.
5. Disclaimer (i18n) hiển thị dưới bảng.

### Non-functional
- Component ≤200 dòng, kebab-case, server component (không `"use client"`).
- Không hardcode chuỗi UI → namespace `pricing` trong `en.json` + `vi.json` (song song).
- Không tạo token màu mới, không `text-red-*` hardcode.
- 0 dependency mới.

## Architecture
```
Sanity (tourPricing docs, tiers[])
        │ GROQ
        ▼
page.tsx (server) ── normalize → PriceTier[] ──► <PriceBlock tiers currency />
                                                      │
                                                      ├─ <table> 3 cột
                                                      ├─ text-destructive + uppercase
                                                      └─ disclaimer (t("disclaimer"))
```

**Normalized type** (đặt tại `src/components/pricing/price-block.tsx`):
```ts
export interface PriceTier {
  minGuests: number;
  maxGuests: number | null;      // null = "8+"
  pricePerGuest: number;         // theo đơn vị currency hiển thị
  groupTotal: number;
}
```
> Lưu ý: nếu chọn **phương án A** (`tourPricing` doc), schema giữ cả `pricePerGuestVnd/Usd` + `groupTotalVnd/Usd`; page chọn field theo `locale` trước khi truyền vào component.

## Related Code Files
### Create
- `src/sanity/schemaTypes/tour-pricing.ts` — document type `tourPricing` (chỉ phương án A)
- `src/components/pricing/price-block.tsx` — component chính
### Modify
- `src/sanity/schemaTypes/index.ts:7` — registry `types: [..., tourPricing]`
- `src/sanity/queries/destinations.ts` — thêm `PRICING_BY_SLUG_QUERY` (hoặc thêm `pricing` vào projection `:19-27` nếu phương án B)
- `src/app/[locale]/explore/itineraries/[slug]/page.tsx` — interface `ItineraryData:12-18` + mount tại `:66`
- `src/app/[locale]/explore/destinations/[slug]/page.tsx` — mount tại `:87`
- `src/messages/en.json` + `src/messages/vi.json` — namespace `pricing`
### Delete
- Không có

## Implementation Steps
1. **Chốt 4 câu ở Unresolved Questions** (phương án A/B, nguồn giá, nhãn tier, scope listing).
2. **Sanity schema**
   - Phương án A: `tourPricing` doc — fields `tourSlug` (string, required, unique per tour), `tiers` (array of object: `minGuests` number required, `maxGuests` number optional, `pricePerGuestVnd`/`pricePerGuestUsd`/`groupTotalVnd`/`groupTotalUsd` number required, validation `min(0)`), `preview: { title: "tourSlug" }`.
   - Phương án B: thêm field `pricing` (array cùng shape) vào `destination.ts` sau `featured` (`:60-65`).
   - Đăng ký schema tại `index.ts:7` (chỉ A).
3. **Query**: thêm `PRICING_BY_SLUG_QUERY` trả `{ "tiers": tiers[]{...} }` theo `$slug`; **đừng quên** thêm field vào `DESTINATION_BY_SLUG_QUERY:19-27` nếu phương án B (projection là explicit → thiếu là `undefined`).
4. **Namespace `pricing`** (EN song song VI): `label` ("PRICE"/"GIÁ"), `perGuest` ("PER GUEST"/"MỖI KHÁCH"), `groupTotal` ("GROUP TOTAL"/"TỔNG NHÓM"), `guestsRange` ("{min}–{max} GUESTS"/"{min}–{max} KHÁCH"), `guestsAtLeast` ("{min}+ GUESTS"/"{min}+ KHÁCH"), `disclaimer`.
5. **Component `price-block.tsx`**
   - Props: `tiers: PriceTier[]`, `currency: "VND" | "USD"`, dùng `getTranslations("pricing")`.
   - Root: `<section className="mt-6 rounded-xl border bg-card p-6 text-destructive" aria-labelledby="tour-price-heading">`
   - Heading: `<h2 id=... className="text-xs font-semibold uppercase tracking-widest">` + `t("label")`
   - Bảng 3 cột (`<table>` semantics, `<thead>` IN HOA): TIER · PER GUEST · GROUP TOTAL — dùng `Intl.NumberFormat` đã chuẩn hoá (helper nhỏ `formatPrice(value, locale, currency)`).
   - Disclaimer: `<p className="mt-4 text-xs uppercase tracking-widest">` (giữ IN HOA theo yêu cầu; ghi chú readability ở changelog).
   - `if (tiers.length === 0) return null;`
6. **Mount**
   - Itinerary: sau `:65` (cuối summary), trước `<ol>` `:67`; lấy `tiers` từ data + `locale` từ `params`.
   - Destination: trong `:83-87` sau `<p description>`, trước `</div>` `:88`; fetch pricing song song với `destination` (`Promise.all` đã có `:46-49`).
7. **Dữ liệu**: user nhập `tourPricing`/`pricing` trong Studio (cần fix CORS `localhost:3000` trước — xem `plans/reports/debugger-260926-infinite-refresh-loop.md` context) **hoặc** seed mẫu có disclaimer.

## Todo List
- [x] Chốt Unresolved Questions 1-4 → **A: doc `tourPricing`** (user), **giá do user nhập Studio** (user), nhãn tier `2 / 3–4 / 5–7 / 8+`, scope = 2 trang detail (không đụng listing)
- [x] Tạo/hiệu chỉnh Sanity schema + registry
- [x] Thêm query (`queries/tour-pricing.ts`, `| order(_updatedAt desc)[0]`)
- [x] Thêm namespace `pricing` EN/VI (song song, JSON hợp lệ, 8 key)
- [x] Viết `price-block.tsx` (88 dòng, server component)
- [x] Mount vào 2 trang detail
- [x] Chạy test (bảng dưới)
- [x] Review + changelog

## Success Criteria / Test
| # | Test | Lệnh/Purpose | Pass |
|---|---|---|---|
| T1 | Lint | `npm run lint` | ✅ 0 error |
| T2 | Typecheck | `npx tsc --noEmit` | ✅ 0 error |
| T3 | Build | `npm run build` | ✅ exit 0 (dev đã dừng trước, tránh trộn cache) |
| T4 | UI VI | block dưới description, IN HOA, đỏ, số dạng `1.850.000 ₫` | ✅ qua `/vi/price-preview` (slug thật chưa có data) |
| T5 | UI EN | đỏ, IN HOA, số dạng `$75` (whole dollar) | ✅ qua `/en/price-preview` |
| T6 | Destination | block sau mô tả, đúng đơn vị tiền | ✅ mount + render OK qua preview; `/vi|en/explore/destinations/hcm` 200 |
| T7 | Không data | slug chưa có giá → không render | ✅ 4/4 trang itinerary+destination có data-less vẫn 200, 0 block; 404 giữ nguyên |
| T8 | Parity | key `pricing` EN vs VI | ✅ 8 key giống hệt nhau (`node` script) |
| T9 | A11y | `aria-labelledby`, `<th scope>` , `jsx-a11y` | ✅ 1×`aria-labelledby`, 3×`scope=col`, 4×`scope=row`; eslint config có `jsx-a11y` 6.10.2 qua `next/core-web-vitals` → 0 lỗi |
| T10 | Logic (tự viết) | `mapPricingTiers` + `formatPrice` | ✅ 16/16 pass — sort asc, VI→VND/EN→USD, drop null/NaN/inverted, GIỮ giá 0 do editor nhập, format `$75`/`$74.50`/`1.850.000 ₫` |
| T11 | ICU plural EN | `guestsSingle` | ✅ `1 guest` (singular) vs `2 guests`/`8+ guests`; VI `1 khách` không đổi |

> Project **không có test framework** → T4-T7 là verify thực tế (browser/curl), không mock. T10 chạy bằng `node --experimental-strip-types` script ngoài repo (`/tmp/opencode/pricing.test.ts`), **không** commit vào repo.

## Risk Assessment
| Risk | Mitigation |
|---|---|
| Không có dữ liệu giá thật (rule cấm bịa) | Block tự ẩn khi thiếu data; để user nhập Studio hoặc chấp nhận mẫu + disclaimer |
| Studio CORS chặn `localhost:3000` | Fix trước khi nhập data (`npx sanity cors add ...`) — việc riêng, tách bước |
| SSG không `revalidate` (destination) | Ghi chú: giá cập nhật sau `npm run build`; nếu cần live → thêm `revalidate` (scope riêng) |
| JSON 2 file lệch key | T8 parity check bằng script 1 dòng |
| Component >200 dòng | Tách `formatPrice` ra `src/components/pricing/format-price.ts` |

## Security Considerations
- Không commit `.env.local` / credentials (rule pre-commit).
- Giá là data CMS → không log/hiển thị nhạy cảm; không fetch giá từ nguồn bên thứ ba không tin cậy.

## Next Steps
- Chờ **approval** → chạy Step 1-7 → test T1-T9 → `code-reviewer` → changelog.

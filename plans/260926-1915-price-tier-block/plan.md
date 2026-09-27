---
title: "[Feature] Price tier block — giá theo số khách (in hoa, đỏ) dưới mô tả tour"
description: "Block bảng giá tier tĩnh (2 / 3-4 / 5-7 / 8+ khách) đặt ngay dưới description của itinerary detail + destination detail. Toàn bộ chữ IN HOA + màu đỏ (text-destructive). Nguồn dữ liệu: Sanity CMS. VI → VND, EN → USD."
status: completed
priority: P2
effort: "4-6h"
tags: [feature, pricing, sanity, i18n, ui]
created: 2026-09-26
---

# [Feature] Price tier block

## Executive Summary
Thêm **bảng giá theo tier số khách** (static, không interactive) ngay **dưới phần mô tả** trên 2 trang tour: itinerary detail và destination detail. Toàn bộ chữ trong block **IN HOA + đỏ**. Giá lấy từ **Sanity CMS** (không hardcode, không bịa — editor tự nhập), hiển thị **VND khi locale=vi, USD khi locale=en**. Nếu chưa có dữ liệu giá → block **không render** (tránh hiển thị số bịa).

## Context Links
- **Research (3 luồng song song)**: xác nhận điểm chèn, token màu, pattern section, a11y
- Điểm chèn itinerary: `src/app/[locale]/explore/itineraries/[slug]/page.tsx:65` (sau `<p summary>` , trước `<ol>` `:67`)
- Điểm chèn destination: `src/app/[locale]/explore/destinations/[slug]/page.tsx:87` (sau `<p description>`, đóng `</div>` `:88`)
- Màu đỏ: `--destructive` `src/app/globals.css:65` (light `#e7000b`) / `:100` (dark `#ff6467`) → class `text-destructive`
- Pattern section: `mt-6 rounded-xl border p-6` (itinerary `:69`, deals `:29`, accessibility `:46`)
- Disclaimer i18n pattern: `deals.disclaimer` `src/messages/en.json:751` + render `src/app/[locale]/deals/page.tsx:40`
- **Rules**: `.claude/rules/development-rules.md` (KISS/YAGNI/DRY, file <200 dòng, không bịa data)

## Decisions (đã chốt với user)
| # | Quyết định |
|---|---|
| 1 | Hiển thị ở **CẢ 2 trang**: itinerary detail + destination detail |
| 2 | Cơ chế: **bảng tier tĩnh** (không chọn số khách) |
| 3 | Nguồn dữ liệu: **Sanity CMS field** |
| 4 | Tiền tệ: **VI → VND, EN → USD** (editor nhập cả 2, KHÔNG tự quy đổi qua tỉ giá) |

## Key Insights
- **Repo KHÔNG có khái niệm "tour"**: itinerary = lộ trình (messages JSON), destination = điểm đến (Sanity), deals = list không có route detail. → Gọi chung "tour detail" = 2 trang trên.
- **Conflict dữ liệu**: itinerary **không tồn tại trong Sanity** (chỉ `messages/en.json`/`vi.json`). Hai phương án (xem Unresolved #1):
  - **A (khuyến nghị)**: tạo document type **`tourPricing`** mới trong Sanity, field `tourSlug` khớp slug của itinerary/destination → **1 nguồn, 2 trang cùng fetch**, không phải migrate nội dung itinerary.
  - **B**: destination gắn field `pricing` (sửa schema hiện có), itinerary để trong messages JSON → 2 nguồn, lệch quyết định "Sanity CMS".
- **Không tự tính giá**: mỗi tier editor nhập **cả giá/khách lẫn tổng nhóm** → UI không nhân×phép bịa ra số mới.
- **Không có FX rate**: VND/USD nhập tay song song trong Sanity → tránh hiển thị tỉ giá tự chế.
- Contrast: `#e7000b` trên nền trắng = **4.77:1** → pass WCAG AA kể cả `text-xs`; **không đặt trên `bg-muted`** (4.45:1, fail).
- Chưa có precedent `uppercase + tracking` trong project (`locale-switcher.tsx:28` chỉ có `uppercase`) → pattern mới, ghi changelog.
- `<html>` ở `src/app/layout.tsx:21` **thiếu `lang`** → sai WCAG 3.1.1, ảnh hưởng casing chữ Việt khi `text-transform: uppercase` (ngoài scope, ghi chú).

## Phases
| Phase | Nội dung | Status |
|---|---|---|
| 1 | Sanity: schema `tourPricing` + registry + GROQ query | ✅ |
| 2 | Component `PriceBlock` (server, 88 dòng) + namespace `pricing` EN/VI | ✅ |
| 3 | Mount ở 2 trang detail (điểm chèn đã xác định) | ✅ |
| 4 | Test: `npm run lint` + `npx tsc --noEmit` + `npm run build` + verify UI (caps/đỏ/2 locale/ẩn khi thiếu data) — 11/11 pass (xem phase-01) | ✅ |
| 5 | Review (`plans/reports/code-reviewer-260926-price-tier-block.md`, 4 Major đã fix) + `docs/project-changelog.md` | ✅ |

## Risks
- Chưa có dữ liệu giá thật → user tự nhập `tourPricing` trong Studio (CORS `localhost:3000` đang bị chặn, xem report trước) → trước khi có data block tự ẩn. Route demo `/[locale]/price-preview` đã xoá (quyết định của user) → chỉ xem UI được sau khi có data thật.
- 2 trang detail hiện **dynamic** (không `setRequestLocale`) → pricing query chạy mỗi request. Nếu sau này thêm `setRequestLocale` để SSG thì fetch chuyển vào `next build` → Sanity outage sẽ fail build (chưa xảy ra, ghi chú cho tương lai).
- Bảng tier IN HOA đỏ toàn bộ → disclaimer IN HOA giảm khả năng đọc (user yêu cầu "all caps", giữ nguyên nhưng ghi chú).

## Unresolved Questions (đã chốt)
1. **Phương án A hay B** → ✅ **A**: document type `tourPricing` mới, field `tourSlug` khớp slug cả 2 loại.
2. **Dữ liệu giá** → ✅ **User tự nhập trong Studio** (không seed, không bịa).
3. **Nhãn tier** → ✅ dùng 4 tier `2 / 3–4 / 5–7 / 8+`, **linh hoạt theo data** (schema cho phép sửa; EN có ICU plural `1 guest`).
4. **Scope listing** → ✅ **chỉ 2 trang chi tiết**, không đụng card listing.

## Deviations từ plan (cải tiến, do code review sinh ra)
- Props `currency` bỏ khỏi `<PriceBlock>` → component tự `getCurrency(locale)` (bớt chỗ desync).
- `mapPricingTiers` filter tier thiếu giá sai lệch (null/NaN/đảo min-max) + sort tăng dần → không bao giờ in `0`/`NaN`, không in `5–3`.
- Pricing fetch thêm `.catch(() => null)` → Sanity outage **không** làm 500 trang itinerary (trước đây trang này 0 phụ thuộc Sanity).
- Query `| order(_updatedAt desc)[0]` → deterministic khi trùng `tourSlug`.
- `formatPrice`: số nguyên → không thập phân (`$75`), có thập phân → 2 chữ số (`$74.50`).
- Schema thêm cross-field validation (max ≥ min, không trùng, không chồng lấn) + mô tả `groupTotal` = tổng nhóm **nhỏ nhất** trong tier.

---
title: "[Bugfix] Sanity Studio crash khi nhập giá — BreadcrumbButton title?.toLowerCase is not a function"
description: "Array member preview của tier trả title là number (minGuests) → Sanity breadcrumb gọi title?.toLowerCase() → TypeError, Studio crash khi người dùng mở/điền tier. Fix: prepare() trả title là string."
status: completed
priority: P1
effort: "1-2h"
tags: [bugfix, sanity, studio, preview, schema]
created: 2026-09-26
---

# [Bugfix] Studio crash khi nhập giá (breadcrumb title number)

## Executive Summary
Studio `TypeError: title?.toLowerCase is not a function` khi nhập giá tier. Nguyên nhân gốc: preview của array member `tier` dùng `select.title = "minGuests"` → **number** → breadcrumb của Sanity giả định `title` là string. Fix = bắt buộc preview trả **string**. Không đụng logic giá trên trang web.

## Evidence (root cause chain)
1. Crash site: `.next/dev/static/chunks/node_modules_sanity_lib_index_1euv3yu.js:72953`
   ```js
   t5 = title?.toLowerCase().replace(/ /g, "-")   // optional chaining chỉ chặn null/undefined
   ```
   → `title` là **number** → `Number.prototype.toLowerCase` không tồn tại → TypeError. Chỉ có **1** chỗ duy nhất gọi `title?.toLowerCase` trong chunk (đã grep).
2. `title` đến từ `useBreadcrumbPreview(...)` → `useValuePreviewWithFallback` (chunk `:31956`):
   ```js
   title = preview?.value?.title || t("preview.default.title-fallback")
   ```
   `||` **không** bắt được number truthy (`2`) → fallback string không kích hoạt → title giữ nguyên là `2`.
3. Preview config của tier tại `src/sanity/schemaTypes/tour-pricing.ts:113-115`:
   ```ts
   preview: { select: { title: "minGuests", subtitle: "groupTotalVnd" } }
   ```
   `minGuests` là field `number` **required** (luôn ≥ 1 → luôn truthy) → crash **bất cứ khi nào** breadcrumb render segment của 1 tier item (người dùng mở/điền tier ⇒ đúng triệu chứng "lỗi nhập giá").
4. Không phải lỗi từ schema khác: `destination.ts` title=`name` (string), `homepage.ts` title=`title` (string), `post.ts` không khai preview → chỉ type mới `tourPricing` bị.
5. Không phải lỗi Sanity version-upgrade cần downgrade: `sanity@5.31.2`, không có patch khả dụng (không thêm dependency, không upgrade).

## Root Cause (1 câu)
**Array member `tier` của `tourPricing` bị khai `preview.select.title` trỏ vào field number (`minGuests`), trong khi Sanity breadcrumb bắt buộc `title` phải là string.**

## Fix Plan (KISS, 1 file)
`src/sanity/schemaTypes/tour-pricing.ts` — thay preview của member `tier`:

```ts
preview: {
  select: { min: "minGuests", max: "maxGuests", totalVnd: "groupTotalVnd" },
  prepare: ({ min, max, totalVnd }) => ({
    title: tierPreviewLabel(min, max),                    // LUÔN string
    subtitle: totalVnd == null ? undefined : `${totalVnd}₫`,
  }),
},
```

- `tierPreviewLabel(min, max)` export named function cùng file (để test được):
  `min == null` → `"Tier"` · `max == null` → `` `${min}+ guests` `` · `min === max` → `` `${min} guests` `` · ngược lại → `` `${min}–${max} guests` ``.
- Bonus: label hàng tier trong list rõ hơn hiện tại (đang hiện số trần `2`).
- **Không** sửa `preview` cấp document (`title: "tourSlug"` là string, an toàn) — YAGNI.
- Không sửa trang web, không sửa query, không sửa messages.

## Tests (sau khi sửa — bắt buộc)
| # | Test | Cách | Kết quả |
|---|---|---|---|
| B1 | `tierPreviewLabel` luôn trả string | node script (strip-types) | ✅ **13/13** (6 label cases + 7 invariant `typeof === "string"`) |
| B2 | Lint | `npm run lint` | ✅ 0 error |
| B3 | Typecheck | `npx tsc --noEmit` | ✅ 0 error |
| B4 | Build | dừng dev → `npm run build` → `rm -rf .next` → start dev | ✅ exit 0, cache sạch, 0 lỗi HMR |
| B5 | Không regression trang web | curl 4 route + 404 | ✅ 200/200/200/200 + 404 giữ nguyên |
| B6a | Cơ chế crash (mô phỏng đúng code Sanity) | `breadcrumbRender(title)` với title cũ = number vs title mới = string | ✅ old → `TypeError: title?.toLowerCase is not a function` (giống hệt stack thật) · new → `breadcrumb-item-100000–200000-guests` |
| B6b | Wiring vào bundle | grep chunk Studio | ✅ `tierPreviewLabel` ×4 có trong bundle; `title: "minGuests"` cũ = **0** |
| B6c | Studio live click-through | Puppeteer `/studio` | ⚠️ **chặn ở màn login** (browser sạch không có session) → **cần bạn bấm tay xác nhận** (xem Next Steps) |

### Bổ sung: trang web render với data thật (doc `tourPricing` `hcm` đã tồn tại)
- ✅ `/vi/explore/destinations/hcm` + `/en/...` → block **HIỂN THỊ**, VI `150.000 ₫` / EN `$50`, IN HOA đỏ (T4/T6 xác minh trên data thật).
- ⚠️ **Data tier đang sai** (do test nhập nhầm): `minGuests 100000 / maxGuests 200000 / groupTotalVnd 2` → hiện `100000–200000 KHÁCH`, `TỔNG NHÓM 2 ₫`. Không phải bug code — cần bạn sửa lại trong Studio.

## Risks / Notes
- Studio cần read dataset: nếu dataset private + chưa `npx sanity login` → B6 chỉ verify được tới list view; fallback = user bấm tay xác nhận sau fix.
- CORS `localhost:3000` **chưa** được mở (user chưa chạy `sanity login` + `cors add`) → chặn **write** (lưu giá), **không liên quan** crash này (crash là client render). Hai việc tách bạch.
- Nếu sau này thêm preview cho type khác: rule — **`preview.select.title` phải trỏ field string hoặc qua `prepare` trả string**.

## Scope
**Trong scope:** `src/sanity/schemaTypes/tour-pricing.ts` (+ test script chạy tay, không commit).
**Ngoài scope:** upgrade/downgrade `sanity`, sửa breadcrumb của Sanity, CORS/login Studio, dữ liệu giá, web UI.

## Next Steps
1. ~~User xác nhận plan~~ ✅
2. ~~Sửa schema → B1-B5 + B6a/B6b → code-reviewer~~ ✅ review **APPROVE** (0 Critical/Major, 2 Minor pre-existing) — `plans/reports/code-reviewer-260926-fix-breadcrumb-numeric-preview.md`
3. ~~Changelog~~ ✅
4. **Còn lại (cần bạn)**: B6c — mở Studio bằng browser đã login → `Tour Pricing` → doc `hcm` → bấm vào row tier → xác nhận không còn crash. Đồng thời sửa data tier đang sai (xem mục bổ sung trên).

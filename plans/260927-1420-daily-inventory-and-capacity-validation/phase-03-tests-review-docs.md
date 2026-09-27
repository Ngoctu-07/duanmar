# Phase 3: Tests, Review & Docs

## Context Links
- Plan: `plan.md` · Phase 1–2 · Scripts có sẵn: `C:\Users\Lenovo\AppData\Local\Temp\opencode\{f-ui,c-booking,c-payment,d8-a11y,g-header}.mjs`, `travel-date.test.mts`, `payment-logic.test.ts`

## Overview
- Priority: high · Status: completed · Chạy đủ H1–H8, review, cập nhật docs

## Key Insights
- Dev đang chạy PID 23652 → **không build khi dev mở**: test unit/component trước → kill dev → build → `rm -rf .next` → restart dev → E2E
- Không có data `maxCapacity` thật trong CMS (Studio chưa login) → E2E chỉ verify **P4 path** (không hiện text, window giữ nguyên); badge/disabled verify bằng component fixture render (test fixture, không phải fake data trong app)
- Nếu `renderToStaticMarkup` không nuốt `import "react-day-picker/style.css"` → fallback: test bằng `page.evaluate` inject props? Không — fallback thật: dùng `tsx` alias loader hoặc chuyển test sang E2E với **tour có capacity do user nhập** (blocked → ghi nhận trong report)

## Requirements
**Test matrix**
- H1 unit `tour-capacity.test.mts`: map null/invalid/valid, merge đúng slug, clamp 0, boundary guests
- H2 unit validation: `dateFull` khi insufficient, bỏ qua khi `capacity=null`, không chặn khi window sai (ưu tiên `dateOutOfRange`)
- H3 lint (`npm run lint`) = 0 · tsc = 0 · build = 0
- H4 E2E P4: tour không có `maxCapacity` → 0 badge, window disabled vẫn xám/unclickable, submit hoạt động, `dateRequired`/`dateOutOfRange` giữ nguyên
- H5 regression: `c-booking.mjs`, `c-payment.mjs`, `f-ui.mjs`, `d8-a11y.mjs`, `g-header.mjs` toàn pass
- H6 a11y: aria-label ngày chứa capacity text (nếu component test được), disabled-day contrast ≥ 3:1 (đã có trong d8)
- H7 parity: key EN/VI equal (script python có sẵn pattern)
- H8 screenshots: mobile 375px + desktop 1280px, calendar không tràn/đè

**Non-functional**: không test giả/mocks · mọi test phải pass thật · script test để temp dir

## Related Code Files
**Sửa**: không — chỉ chạy test + `docs/project-changelog.md` (thêm mục Daily Inventory), `plans/260927-0205` (đánh dấu G1–G8 pass), `plans/260927-0034`/`0141` (điền test results nếu chưa)
**Tạo**: `C:\Users\Lenovo\AppData\Local\Temp\opencode\h-*.mjs|mts`

## Implementation Steps
1. Unit H1–H2 (tsx) → fix đỏ
2. lint/tsc → kill dev → build → rm .next → restart dev
3. E2E H4 + regression H5 (curl 200 + puppeteer) → fix đỏ
4. Component render test badge/disabled (nếu khả thi) · H6–H7 · H8 screenshots
5. `code-reviewer` trên diff toàn bộ feature (đặt vé + thanh toán + my-trips + inventory) → address Major/Minor
6. Docs: changelog mục mới, plan status → done, ghi test results vào các plan cũ

## Todo List
- [x] H1–H2 unit · [x] H3 lint/tsc/build · [x] H4–H5 E2E+regression · [x] H6–H8 · [x] code-reviewer · [x] docs (deferred items còn lại xem dưới)

## Success Criteria
- Tất cả H pass, build 0 error · review APPROVE · changelog/roadmap cập nhật

## Risk Assessment
- R1: không test được badge nếu không có CMS data → mitigate component fixture test; nếu rơi 2 trường hợp → báo cáo thủ thuật cuối (đề nghị user nhập `maxCapacity` trong Studio để E2E thật)
- R2: build kill dev → phải restart dev trước khi kết thúc session

## Security Considerations
- Không commit token/env · test không chứa PII thật

## Next Steps
- Chốt nợ cũ: `code-reviewer` booking/payment/my-trips + changelog 4 mục (kèm bước này làm 1 lần)

## Test results (2026-09-27)
- H1 unit `tour-capacity` **14/14** · H2 `h2-capacity-validation` **15/15** · H6 `h6-render` **11/11** (aria-label + disabled-day)
- H4 E2E P4-path **12/12** · H8 screenshots mobile 375px + desktop 1280px (không tràn cell)
- H3 `tsc` / `eslint` / `build` exit 0
- H5 regression: `c-booking` · `c-payment` · `f-ui` · `d8-a11y` · `g-header` exit 0
- H7 EN/VI parity **701/701**
- Code review: `plans/reports/code-review-inventory-quality-20260927.md`, `plans/reports/code-review-inventory-adversarial-20260927.md`
- Docs: changelog `2026-09-27` (6 mục) · plan status → `completed`
- Status: `completed`

## Deferred (chờ quyết định — không block done)

### Đã chốt + làm xong sau review (user-approved 2026-09-27)
- Tour thiếu giá: ghi chú trung thực `booking.priceMissingNote` (unit `tests/unit/payment-note.test.ts`)
- Xóa PII: `clearBookings()` + nút `myTrips.deleteAll` trên `/my-trips` (browser F12)
- Sync cross-tab: `storage` listener cho My Trips list + booking capacity (browser F13)
- Test vào repo: `tests/` + `npm test` (10/10) / `npm run test:browser` (6/6) — thay quyết định temp-dir

### Còn lại
- Blur validation cho booking fields (m14 — spec/impl drift)
- Inventory phụ trợ: hàng `occupancy` hỏng bị drop im lặng (A4) · `maxCapacity = 0` hiểu là "chưa cấu hình" thay vì "đóng" (A5) · aria-label ngày hết chỗ khó reach bằng roving keyboard (A6) · CDN staleness + fail-open khi Sanity lỗi (A8) · Nit N1–N5
- Khác (booking/payment/my-trips review): window lịch không refresh qua nửa đêm (m2), giá clamp khác `groupTotal` trên trang detail (m8), `verifyToken` thừa (n1), key rows theo label dịch (n3), `<dl>` duplicate (n4), reference ms-precision (n5/n2), `encodeURIComponent` reference (n6), aria-live mount trễ (n7), `aria-required` (n8)

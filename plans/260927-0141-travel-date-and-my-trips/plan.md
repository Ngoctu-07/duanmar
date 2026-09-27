# Plan: Travel Date Picker & "My Trips" Dashboard

## Context Links
- Approved choices (P1–P4): react-day-picker calendar · trang mới `/my-trips` · detail page riêng · lưu **sau payment success**
- Phụ thuộc: `plans/260927-0121-payment-qr-checkout` (payment section — sẽ nhận callback `onPaid`), `plans/260927-0034-booking-checkout-flow` (form/summary/validation)
- Patterns tái dùng: `trip-plan-context.tsx` (localStorage SSR-safe hydration), `booking-field.tsx` `Field`+`describedBy`, section card `rounded-xl border bg-card p-5`

## Overview
- Priority: high · Status: completed · 2 features gộp 1 plan
- F1: chọn Ngày đi (rolling 7-day window, calendar disabled-day) → bind vào form state → hiện nổi bật trên ticket summary
- F2: sau payment success → ghi ticket payload vào localStorage · trang `/my-trips` (master list) → `/my-trips/[reference]` (detail = đúng ticket checkout)

## Key Insights
- Deps hiện có **không có** calendar (Base UI không có, không có react-day-picker/date-fns) → P1 chốt cài `react-day-picker` (+ `date-fns` peer cho locale `vi`/`enUS`)
- **Không có auth/backend booking API** → persistence duy nhất hợp lý = localStorage (`vn-my-trips:v1`), upsert theo `reference` để idempotent (switch MoMo→Bank làm success 2 lần vẫn 1 record)
- Window tính theo **local date** (VN không DST nhưng vẫn dùng helper local để tránh UTC lệch ngày): `min = today+1`, `max = today+7`
- Section đã đánh số 1–3 → chèn "2. Ngày khởi hành" → pricing → 3, difficulty → 4 (sửa 2 key EN + 2 key VI, test cũ dùng `#id` nên không vỡ)
- react-day-picker `disabled={{before,after}}` render ngày ngoài window **vẫn hiện** (xám, không click) → khớp requirement mà không phải viết grid tay
- Detail phải tái sử dụng **đúng rows** của checkout → extract `buildTicketRows()` (DRY) thay vì render lại thủ công

## Requirements
**Functional**
- Travel Date: input bắt buộc, chỉ chọn được ngày mai → +7 ngày; ngày ngoài window hiện trong calendar nhưng `disabled` + xám; hiện trên ticket summary (dòng nổi bật, `font-semibold text-destructive`)
- My Trips: record = { reference, slug, tourName, travelDate, fullName, email, phone, notes, guests, difficulty, pricePerGuest, total, currency, locale, paidAt }; list card = Tour Name + Travel Date; detail = full ticket (dùng `buildTicketRows`)
- Discoverability: icon header (desktop + mobile menu), link sau payment success

**Non-functional**: i18n EN/VI parity · a11y (label, `aria-invalid`, disabled-day contrast ≥ visible) · file < 200 dòng · không dep ngoài react-day-picker/date-fns/qrcode

## Related Code Files
**Sửa**
- `src/components/booking/booking-validation.ts` — field `travelDate`, error keys `dateRequired`/`dateOutOfRange`
- `src/components/booking/booking-form.tsx` — `EMPTY_VALUES.travelDate=""`, mount date section
- `src/components/booking/booking-summary.tsx` — extract rows → `ticket-rows.ts`, thêm ngày đi row, build record + save on paid
- `src/components/booking/booking-payment-section.tsx` — prop `onPaid?: () => void`, gọi khi chuyển success, render link `/my-trips`
- `src/messages/{en,vi}.json` — renumber pricingTitle/difficultyTitle, thêm booking key, namespace `myTrips`
- `src/components/layout/header.tsx` — icon + menu `/my-trips`
- `src/app/[locale]/trip-planner/page.tsx` — link "Chuyến đi của tôi"

**Tạo**
- `src/lib/date-window.ts` — `toIsoDate`/`parseIsoDate`/`addDays`/`travelDateWindow(today)`/`isTravelDateAllowed`
- `src/lib/booking-history.ts` — `TripBooking`, `listBookings`/`getBooking`/`saveBooking` (upsert), key `vn-my-trips:v1`
- `src/components/booking/travel-date-field.tsx` — DayPicker single, `disabled={before min/after max}`, `startMonth/endMonth`, `showOutsideDays`, classNames theo design
- `src/components/booking/booking-date-section.tsx` — section card "2. Ngày khởi hành" + Field + error
- `src/components/booking/ticket-rows.ts` — `buildTicketRows(...)` trả rows cho `<dl>`
- `src/components/my-trips/my-trips-client.tsx` — master list (cards tour+date, empty state)
- `src/components/my-trips/my-trips-detail.tsx` — detail ticket + paid badge + back
- `src/app/[locale]/my-trips/page.tsx`, `src/app/[locale]/my-trips/[reference]/page.tsx`

## Implementation Steps
1. `npm i react-day-picker date-fns`
2. `date-window.ts` + `booking-validation.ts` (field + error keys + `isTravelDateAllowed`)
3. `travel-date-field.tsx` (DayPicker, disabled gray, month bounds = window) → `booking-date-section.tsx` → mount vào form; renumber 2 title key EN/VI
4. `ticket-rows.ts` refactor summary + thêm row Ngày đi (prominent) + record builder
5. `booking-history.ts` + `onPaid` callback trong payment section → `BookingSummary` save upsert + link "Xem chuyến đi của tôi"
6. `my-trips` routes + client components + header/trip-planner links
7. Messages EN/VI (parity) → chạy F1–F11 → `code-reviewer` → changelog + plan status

## Todo List
- [x] Step 1 deps · [x] Step 2 date-window+validation · [x] Step 3 calendar+section · [x] Step 4 summary rows · [x] Step 5 save+onPaid · [x] Step 6 my-trips routes · [x] Step 7 messages+tests+review

## Tests
| # | Test | Cách | Pass |
|---|---|---|---|
| F1 | unit `date-window` + validation + upsert | tsx: window (tại ranh tháng, ví dụ Oct 1 → Oct 2..Oct 8) · parse ISO · `dateRequired`/`dateOutOfRange` · saveBooking cùng ref → 1 record | chờ |
| F2 | Lint | `npm run lint` | chờ |
| F3 | Typecheck | `npx tsc --noEmit` | chờ |
| F4 | Build | stop dev → build → `rm -rf .next` → start dev | chờ |
| F5 | Calendar window UI | puppeteer: cell hôm qua/+8 ngày → `disabled` + xám (opacity<1) + vẫn hiển thị; mai và +7 → enabled; click ngày +3 set giá trị | chờ |
| F6 | Submit chặn thiếu ngày | để trống → lỗi `dateRequired`; chọn ngày → submit qua | chờ |
| F7 | Ticket hiện ngày | summary có row Ngày đi nổi bật | chờ |
| F8 | Save sau success | payment success → `vn-my-trips:v1` có record đủ field; switch method → vẫn 1 record | chờ |
| F9 | My Trips master→detail | list hiện tour+date; click → detail rows khớp checkout | chờ |
| F10 | i18n parity | so key `booking`/`myTrips` EN=VI | chờ |
| F11 | Visual | screenshot: calendar disabled days · summary · list · detail | chờ |

## Success Criteria
F1–F11 pass · lint/tsc/build = 0 · parity · không placeholder/prices bịa · file <200 dòng

## Risk Assessment
- `react-day-picker` v9 cần `date-fns` peer → nếu install báo thiếu → cài thêm `date-fns`
- Disabled-day contrast quá mờ → dùng `text-muted-foreground` (4.58:1 measured) không dùng opacity thấp
- localStorage private mode → try/catch, list rỗng + empty state
- Test cũ check text "2. Số khách…" → nếu có assertion theo text thì cập nhật theo title mới

## Security Considerations
- Không gửi dữ liệu ra server · localStorage chứa PII (tên/email/đt) của chính user → ghi chú trong copy · không log payload · XSS qua JSON.parse → validate shape trước khi render

## Next Steps
Sau approve: chạy Step 1→7 · dispatch `tester` scripts F1–F11 · `code-reviewer` · `docs-manager` cập nhật changelog

## Test results (2026-09-27)
- Browser: `f-ui` exit 0 (F9/F10)
- Unit: travel-date **11/11**
- Status: `completed`

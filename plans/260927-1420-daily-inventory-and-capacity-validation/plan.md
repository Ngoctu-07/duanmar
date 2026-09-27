# Plan: Daily Inventory & Dynamic Date Validation

## Context Links
- Approved choices (P1–P4): `maxCapacity` trên **`tourPricing` doc** · booked = **CMS occupancy + device bookings** · hiển thị **"4 chỗ trống"** (0 → "Hết chỗ") · thiếu data → **bỏ qua, không hiện, không disable thêm**
- Phụ thuộc: `plans/260927-0141-travel-date-and-my-trips` (DayPicker 7-day window, `vn-my-trips:v1`), `plans/260927-0034-booking-checkout-flow` (form/validation)
- Patterns tái dùng: `fetchPublished` (null → no data), `listBookings()` + effect-mount localStorage (eslint-disable `set-state-in-effect`), `Field`/`describedBy`, section card

## Overview
- Priority: high · Status: completed · 1 feature
- Admin đặt `maxCapacity` (số khách/ngày) + `occupancy[]` (đã đặt theo ngày) trong Studio → calendar hiện số chỗ trống dưới mỗi ngày trong window → ngày có `remaining < requested_guests` bị disable (không click được) → submit chặn với lỗi `dateFull`

## Key Insights
- **Không có booking backend** → booked/ngày = CMS `occupancy` (admin nhập) + device bookings (`listBookings()` filter theo slug+travelDate, guest sum)
- rdp v10 `disabled` nhận **matcher array gồm function** → window matchers + capacity matcher gộp 1 chỗ; `guestCount` đổi → re-render → disable set đổi (reactive, không cần effect)
- Hiện text dưới số ngày cần **custom `components.DayButton`** (default chỉ nhận `children` = số ngày) + tăng `--rdp-day-height` (44→56) vì cell 42px không đủ 2 dòng; width giữ ~48px để 7 cell vừa mobile 375px
- Thiếu `maxCapacity` → `remaining = null` → không text, không disable thêm (P4) → regression test cũ không vỡ
- `checkout/page.tsx` đã fetch `TOUR_PRICING_BY_SLUG_QUERY` → chỉ cần mở rộng query, không thêm request
- Checkout chỉ map được **destination slug** (`DESTINATION_BY_SLUG_QUERY` null → 404); itinerary chưa có booking flow → capacity chỉ tác động destination (scope hiện tại, không mở rộng — YAGNI)
- Đăng nhập Studio đang bị chặn (user cần `npx sanity login`) → data `maxCapacity` do **user nhập tay**; test UI dùng **fixture props** (test fixture ≠ fake data trong app)

## Requirements
**Functional**
- Studio: field `maxCapacity` (integer ≥1, optional) + array `occupancy [{date, booked}]` trên `tourPricing`, validation duplicate date
- Calendar: dưới mỗi ngày trong 7-day window hiện `{count} chỗ trống` / `Hết chỗ`; ngày ngoài window giữ nguyên (xám, không text)
- Reactive: `guests > remaining` → ngày đó disabled + unclickable; selected date mất capacity → error `dateFull` ngay khi đổi guests
- Submit: chặn nếu `travelDate` còn lại chỗ < guests (kể cả khi đã chọn trước khi tăng guests)

**Non-functional**: i18n EN/VI parity · a11y (aria-label ngày có capacity text, disabled-day contrast) · file < 200 dòng · không dep mới · không sửa listing query · không sửa `my-trips`

## Related Code Files
**Sửa**
- `src/sanity/schemaTypes/tour-pricing.ts` — thêm `maxCapacity` + `occupancy`
- `src/sanity/queries/tour-pricing.ts` — `TOUR_PRICING_BY_SLUG_QUERY` thêm 2 field (`ALL_TOUR_PRICING_QUERY` giữ nguyên)
- `src/app/[locale]/booking/checkout/page.tsx` — map capacity → `BookingForm`
- `src/components/booking/booking-form.tsx` — device booked map (mount effect), truyền capacity + guestCount, guests-change error
- `src/components/booking/booking-date-section.tsx` — pass-through props
- `src/components/booking/travel-date-field.tsx` — capacity matcher, custom DayButton, aria-label, CSS vars cell cao hơn
- `src/components/booking/booking-validation.ts` — error key `dateFull` + param `capacity`
- `src/messages/{en,vi}.json` — `spotsLeft`, `soldOut`, `error.dateFull`

**Tạo**
- `src/lib/tour-capacity.ts` — pure logic: `mapTourCapacity`, `mergeDeviceBookings`, `remainingSlots`, `isDateBookable`

**Không sửa**: `ALL_TOUR_PRICING_QUERY`, listing pages, `my-trips`, `booking-summary`, `booking-payment-section`

## Implementation Steps
1. **Phase 1**: schema fields (validation duplicate date) + query mở rộng + `tour-capacity.ts` (unit-testable, clamp remaining ≥ 0)
2. **Phase 2**: checkout → form → date section → field; custom DayButton + Context; validation `dateFull` + guests-change reactive error; messages EN/VI
3. **Phase 3**: tests H1–H8 (unit, component render fixture, E2E P4-path, lint/tsc/build, a11y, parity, screenshots) → `code-reviewer` → changelog + plan status

## Todo List
- [x] P1 schema + query · [x] P2 tour-capacity lib · [x] P3 field/custom day/aria · [x] P4 validation + reactive · [x] P5 messages · [x] P6 tests + review + docs (deferred items xem phase-03)

## Success Criteria
- Unit: `remainingSlots`/`isDateBookable` phủ edge (booked > max, capacity null, guests tăng); validation chặn `dateFull`
- Component render (fixture capacity): có text chỗ trống, `disabled` attr trên ngày hết chỗ, aria-label chứa capacity
- E2E: tour không có `maxCapacity` → không hiện text, 7-day window giữ nguyên (P4 + regression) · lint/tsc/build = 0 · parity EN/VI · a11y pass
- Studio: user nhập được `maxCapacity` (CORS + login) → E2E thật (pending user data)

## Risk Assessment
- R1: Studio chưa login → không test được data thật → mitigate: component fixture test + P4 E2E; data nhập tay là user step
- R2: cell cao hơn → layout mobile vỡ → mitigate: screenshot 375px + 1280px, `--rdp-day-width` giữ ≤48px
- R3: device bookings effect → hydration mismatch → mitigate: state `[]` ban đầu (ssr/client match), fill sau mount

## Security Considerations
- Không gửi dữ liệu lên server · `occupancy` read-only published · không lộ email/phone khách khác (chỉ sum guests)

## Next Steps
- Approval → Phase 1 → Phase 2 → Phase 3 · debt còn lại: `code-reviewer` cho booking/payment/my-trips + changelog 4 mục

## Test results (2026-09-27)
- Unit: tour-capacity **14/14** · h2-capacity-validation **15/15** · h6-render **11/11**
- E2E: h4 P4-path **12/12**
- Regression browser: `c-booking` / `c-payment` / `f-ui` / `d8-a11y` / `g-header` exit 0
- i18n: EN/VI parity **701/701** · `tsc` / `eslint` / `build`: exit 0
- Code review: `plans/reports/code-review-inventory-quality-20260927.md`, `plans/reports/code-review-inventory-adversarial-20260927.md`
- Deferred items: xem `phase-03-tests-review-docs.md` → Deferred
- Status: `completed`

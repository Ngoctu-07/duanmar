# Phase 2: Calendar Availability UI & Validation

## Context Links
- Plan: `plan.md` · Phase 1: `src/lib/tour-capacity.ts` · Existing: `travel-date-field.tsx` (DayPicker window), `booking-validation.ts`, `booking-form.tsx`, `booking-history.ts`

## Overview
- Priority: high · Status: completed · Nối capacity vào calendar + form: hiện số chỗ, disable reactive, chặn submit

## Key Insights
- `BookingForm` đã có `guestCount` → chỉ cần truyền xuống `BookingDateSection` → `TravelDateField` (đã có `guestCount` ở pricing section, không cần state mới)
- Device bookings load sau mount (SSR `window` undefined) → state `capacity` init `null` (P4: không hiện gì) → effect merge → setState (cần eslint-disable `set-state-in-effect`, pattern `my-trips-client.tsx`)
- rdp `components.DayButton` custom: nhận props `day/modifiers/buttonProps`, render `children` (số ngày) + badge text bên dưới; capacity lấy từ **Context** (module-level component, tránh inline → remount mỗi render mất focus)
- Cell cao hơn: override `--rdp-day-height: 56px`, `--rdp-day-width: 48px`, `--rdp-day_button-height/width` trên wrapper `style` (cùng `RDP_THEME`) → 7×48=336px vừa mobile 375px (px-4 + p-2 ≈ 48px còn 327… → **check screenshot**; nếu chật giảm 46px)
- Badge chỉ hiện cho ngày trong window (`isTravelDateAllowed`) → ngày ngoài window giữ nguyên
- Guests đổi → selected date mất chỗ → set error ngay trong `change()` (event handler, không effect) + disable ngày trên calendar → cả visual lẫn submit đều chặn
- A11y: `labels.labelDayButton` wrap theo `vi.labels.labelDayButton`/`enUS` để aria-label có "…, 4 spots left"

## Requirements
**Functional**
- Calendar: badge `{count} chỗ trống` (count>0) / `Hết chỗ` (0) dưới số ngày, chỉ trong window; `text-[9px] leading-none`, count=0 dùng `text-destructive`, còn lại `text-muted-foreground`
- Disabled: array matcher = `[{before},{after}, (date)=>!isDateBookable]`; `guests` tăng → ngày hết chỗ disabled ngay
- Guests-change: nếu `values.travelDate` chọn mà `!isDateBookable` với guest mới → `errors.travelDate = "dateFull"`; chọn lại date hợp lệ → clear error
- Submit: `validateBooking(values, capacity?)` — thêm check `dateFull` khi travelDate valid window nhưng còn chỗ < guests
- Checkout page: `mapTourCapacity(pricingDoc)` → `BookingForm.capacity`

**Non-functional**: file < 200 dòng (extract `capacity-day-button.tsx` nếu travel-date-field vượt) · i18n parity · a11y aria-label · không sửa summary/payment/my-trips

## Related Code Files
**Sửa**
- `src/app/[locale]/booking/checkout/page.tsx` — map + prop `capacity`
- `src/components/booking/booking-form.tsx` — prop `capacity`, device-merge state/effect, truyền `capacity`+`guestCount`, `change()` guests-check
- `src/components/booking/booking-date-section.tsx` — pass-through
- `src/components/booking/travel-date-field.tsx` — Context, custom DayButton, matcher, labels, CSS vars
- `src/components/booking/booking-validation.ts` — `BookingErrorKey` thêm `dateFull`, `validateBooking(values, capacity?)`
- `src/messages/{en,vi}.json` — `spotsLeft`, `soldOut`, `error.dateFull`

**Tạo** (nếu travel-date-field > 200 dòng)
- `src/components/booking/capacity-day-button.tsx`

**Không sửa**: `booking-summary.tsx`, `booking-payment-section.tsx`, listing, `my-trips`

## Implementation Steps
1. Messages EN/VI: `spotsLeft` = "{count, plural, one {# spot left} other {# spots left}}" / "{count} chỗ trống"; `soldOut` = "Sold out" / "Hết chỗ"; `error.dateFull` = "Not enough spots left on this date for your group" / "Ngày này không còn đủ chỗ cho số khách của bạn"
2. `booking-validation.ts`: thêm key + optional param `capacity?: TourCapacity | null` (check sau window check, chỉ khi guests hợp lệ)
3. `travel-date-field.tsx`: prop `capacity`, `useMemo` device-free `guestsSafe` (≥1), disabled array + function matcher, Context provider + `labels.labelDayButton` wrap, CSS vars trên style, badge render qua custom `DayButton`
4. `booking-date-section.tsx` + `booking-form.tsx` + `checkout/page.tsx` nối props; form: `useState<TourCapacity|null>(capacity ?? null)` + effect merge device bookings (eslint-disable) + guests-change error
5. Component render test (`renderToStaticMarkup` + `NextIntlClientProvider`) — nếu tsx không nuốt CSS import → dùng E2E puppeteer với fixture thay thế (ghi chú trong Phase 3)

## Todo List
- [x] Step 1 messages · [x] Step 2 validation · [x] Step 3 field/UI · [x] Step 4 wiring · [x] Step 5 render test

## Success Criteria
- `lint`/`tsc` = 0 · EN/VI parity (key count equal) · calendar có badge, disabled ngày khi guests > remaining, aria-label chứa capacity · `dateFull` chặn submit · không có capacity → không hiện gì (P4)

## Risk Assessment
- R1: hydration mismatch (device bookings) → state khởi tạo `null`, fill sau mount · R2: rdp DayButton custom mất prop → spread `...props` đúng thứ tự, chỉ override `children` · R3: cell width mobile → screenshot check

## Security Considerations
- aria-label không lộ email/phone · chỉ số booked là số tổng

## Next Steps
- Phase 3 tests + review + docs

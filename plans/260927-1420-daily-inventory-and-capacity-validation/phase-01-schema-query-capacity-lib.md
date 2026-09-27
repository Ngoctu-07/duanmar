# Phase 1: Schema, Query & Capacity Logic

## Context Links
- Plan: `plan.md` (P1–P4) · File: `src/sanity/schemaTypes/tour-pricing.ts`, `src/sanity/queries/tour-pricing.ts`, `src/lib/tour-capacity.ts`
- Existing: tiers validation pattern (duplicate/overlap custom rule), `fetchPublished` → `null` degrade

## Overview
- Priority: high · Status: completed · Priority block cho toàn feature
- Mở rộng `tourPricing` doc với `maxCapacity` + `occupancy[]`, mở query, viết pure-logic lib (unit-tested trước khi nối UI)

## Key Insights
- `Sanity date` type trả `"YYYY-MM-DD"` → khớp `toIsoDate()` output, so sánh string trực tiếp
- Lib tách khỏi component → test bằng `.mts` không cần render (pattern D1/F1)
- `occupancy` cần validation duplicate date trong Studio (giống tiers duplicate rule)
- `mapTourCapacity` trả `null` khi vắng/invalid `maxCapacity` → P4 "bỏ qua" gói gọn ở 1 nhánh

## Requirements
**Functional**
- Studio field: `maxCapacity` (number, integer, min 1, optional, description rõ "per departure date"); `occupancy` (array of `{date: date, booked: number min 0 integer}`, optional, validation: duplicate date = lỗi)
- Query `TOUR_PRICING_BY_SLUG_QUERY`: thêm `maxCapacity`, `"occupancy": occupancy[]{date, booked}`
- `tour-capacity.ts` exports: `TourCapacity` type, `mapTourCapacity(doc)`, `mergeDeviceBookings(capacity, slug, bookings)`, `remainingSlots(capacity, iso)`, `isDateBookable(capacity, iso, guests)`

**Non-functional**: pure function (no window/Date.now), file < 100 dòng, không dep mới, `ALL_TOUR_PRICING_QUERY` không đổi

## Related Code Files
**Sửa**
- `src/sanity/schemaTypes/tour-pricing.ts` — 2 defineField mới sau `tiers`
- `src/sanity/queries/tour-pricing.ts` — dòng query `TOUR_PRICING_BY_SLUG_QUERY`

**Tạo**
- `src/lib/tour-capacity.ts`

**Không sửa**: `ALL_TOUR_PRICING_QUERY`, listing components, Studio config

## Implementation Steps
1. `tour-pricing.ts`: thêm `maxCapacity` (validation `rule.min(1).integer()`) + `occupancy` array với `of: [defineArrayMember({name:"occupancyDay", type:"object", fields:[date(.required), booked(required.min(0).integer())]})]` và custom validation duplicate `date`
2. `tour-pricing.ts` query: thêm 2 field vào `TOUR_PRICING_BY_SLUG_QUERY`
3. `tour-capacity.ts`:
   - `interface TourCapacity { maxCapacity: number; bookedByDate: Record<string, number> }` (ISO → booked, đã merge)
   - `mapTourCapacity(doc): TourCapacity | null` — `maxCapacity` phải integer ≥1, nếu không → `null`; sum `occupancy` per date (duplicate date → sum thay vì ghi đè, defensive)
   - `mergeDeviceBookings(base, slug, bookings): TourCapacity` — sum `guests` của booking `b.slug === slug` vào `bookedByDate[b.travelDate]`
   - `remainingSlots(capacity, iso): number` = `max(0, maxCapacity - bookedByDate[iso] ?? 0)`
   - `isDateBookable(capacity, iso, guests): boolean` = `remainingSlots >= guests`
4. Unit test `tour-capacity.test.mts` (C:\\Users\\Lenovo\\AppData\\Local\\Temp\\opencode\\): map null/invalid/valid, merge đúng slug (khác slug bỏ), clamp 0 khi booked > max, guests = remaining边界, guests > remaining false

## Todo List
- [x] Step 1 schema fields + duplicate validation · [x] Step 2 query · [x] Step 3 lib · [x] Step 4 unit test pass

## Success Criteria
- `npm run lint` / `npx tsc --noEmit` = 0 · unit test pass (≥8 case) · query trả 2 field mới (verify bằng curl Sanity GROQ nếu cần)

## Risk Assessment
- R1: Studio chưa login → schema chỉ verify bằng code review + lint · R2: occupancy data sai format → `mapTourCapacity` defensive skip entry invalid

## Security Considerations
- Chỉ read published data · không expose PII (chỉ số booked)

## Next Steps
- Phase 2 nối UI với `TourCapacity`

---
title: "[Feature] Trip Planner (Itinerary Builder v1)"
description: "Add-to-trip từ destination detail, header badge, trang /trip-planner reorder/remove/clear/print, localStorage persist — framework Phase 2 itinerary builder (KISS: buttons thay DnD, không backend)"
status: completed
priority: P1
effort: "5-7h"
tags: [feature, i18n, planner, client-state]
created: 2026-09-26
---

# [Feature] Trip Planner (Itinerary Builder v1)

## Executive Summary
Framework Phase 2 mở đầu bằng **itinerary builder** (§4 Visitor-Facing #2, KPI "itinerary builder completions", §8 engagement). Triển khai v1 pure-frontend: chọn destinations vào plan, sắp xếp thứ tự, in/luu PDF — không backend, không dependency mới (localStorage + client context).

## Context Links
- **Framework**: `vietnam-tourism-website-framework.md` §4 "Trip planner/itinerary builder — drag-and-drop, save/share/export as PDF, email itinerary"; §9 Phase 2; §8 KPI
- **Patterns**: client context (chưa có — tạo mới), header button icon (search icon pattern), detail page server → client button, `@/i18n/navigation` Link
- **Data**: `DESTINATION_BY_SLUG_QUERY` đã có; cần query mới by-slugs (list)
- **Plans**: `260926-0200-site-search` (header entry point pattern), `260926-0153-map` (client component SSR-safe pattern)

## Key Insights
- **Reorder bằng nút ↑/↓ thay drag-and-drop**: accessible, không thêm dep DnD (YAGNI — framework gợi ý DnD nhưng buttons đủ dùng cho v1; note cho phase sau)
- **localStorage key `vn-trip-plan:v1`** = string[] slugs; load trong `useEffect` (initial `[]` → không hydration mismatch); try/catch JSON.parse; dedupe khi add
- **Planner page**: server shell + `TripPlannerClient` — client đọc slugs từ context → `client.fetch(DESTINATIONS_BY_SLUGS_QUERY)` (next-sanity isomorphic) → render theo thứ tự localStorage (preserve order client-side)
- **Print**: `window.print()` + Tailwind `print:hidden` trên controls + `print:hidden` header/footer → giữ lại danh sách in/PDF (không cần lib PDF)
- **Detail page server component** → button là client component riêng `<AddToTripButton slug>` (pattern map client component)
- **Badge count** ở header: initial 0 + effect load → SSR/client match ✅
- 0 deps mới; provider wrap trong `[locale]/layout.tsx` (bên trong NextIntlClientProvider)

## Requirements
### Functional
1. `trip-plan-context.tsx`: `TripPlanProvider` + `useTripPlan()` → `{slugs, add, remove, move, clear, has}`; persist localStorage (SSR-safe)
2. Layout: wrap provider quanh Header/main/Footer
3. Destination detail: `<AddToTripButton>` — "Add to trip" ↔ "In your trip" (disabled/added state)
4. Header: icon button → `/trip-planner` + count badge (>0), desktop + mobile sheet row
5. `/[locale]/trip-planner`: client list theo thứ tự (name, region label, link detail) + controls: ↑ ↓ Remove, Clear all, Print; empty state + CTA → `/explore/destinations`; loading state khi fetch
6. Messages EN/VI `tripPlanner`: {title, navLabel, subtitle, empty, emptyCta, addToTrip, inTrip, remove, moveUp, moveDown, clearAll, print, loading}
7. `generateMetadata`

### Non-functional
- `npm run build` pass; 0 console/pageerror; không thêm dependency; không hydration mismatch; KISS — KHÔNG share-by-URL/email backend (phase sau)

## Related Code Files
### Create
- `src/components/trip-planner/trip-plan-context.tsx`
- `src/components/trip-planner/add-to-trip-button.tsx`
- `src/components/trip-planner/trip-planner-client.tsx`
- `src/app/[locale]/trip-planner/page.tsx`
### Modify
- `src/app/[locale]/layout.tsx` (provider wrap)
- `src/components/layout/header.tsx` (badge button + sheet row)
- `src/app/[locale]/explore/destinations/[slug]/page.tsx` (AddToTripButton)
- `src/sanity/queries/destinations.ts` (+DESTINATIONS_BY_SLUGS_QUERY)
- `src/components/layout/header.tsx` + `footer.tsx` (`print:hidden`)
- `src/messages/en.json`, `src/messages/vi.json` (+`tripPlanner`)
- `docs/project-changelog.md`, `plan.md` (sau test)
### Delete
- (none)

## Implementation Steps
1. Messages EN/VI
2. Query `DESTINATIONS_BY_SLUGS_QUERY` (`slug.current in $slugs`, fields name/slug/region/description)
3. Context: state + localStorage sync (load effect, save on change, move(index, delta), dedupe add)
4. `AddToTripButton` (useTripPlan + useTranslations("tripPlanner"))
5. Header badge + sheet row; print:hidden header/footer
6. `TripPlannerClient` (fetch by slugs, preserve order, controls, empty/loading/print)
7. Server page `/trip-planner` + metadata; layout provider wrap; detail page button
8. Kill dev → build → restart → Playwright (E2E flow cùng1 context để test persist)
9. Plan → `completed`; changelog

## Todo List
- [x] Messages EN/VI `tripPlanner`
- [x] Query by-slugs
- [x] Context + localStorage (SSR-safe, dedupe, move)
- [x] `AddToTripButton` trên detail page
- [x] Header badge + sheet row + print:hidden header/footer
- [x] `/trip-planner` client (fetch, reorder, remove, clear, print, empty/loading)
- [x] Build pass + Playwright E2E (add → badge → reorder → reload persist → clear) + regression
- [x] Plan status + changelog

## Success Criteria
- Detail "Add to trip" → state "In your trip", header badge = 1; click badge → `/en/trip-planner`
- Planner: item hiện đúng thứ tự; ↑↓ đổi thứ tự; Remove/Clear hoạt động; **reload còn nguyên** (localStorage)
- Empty state + CTA; Print button render (không click trong test); `/vi/trip-planner` tiếng Việt
- Home + destinations regression 0 console errors; `npm run build` pass; không hydration warning

## Risk Assessment
- Hydration mismatch → initial `[]` cả server/client, load trong effect (đã lên kế hoạch)
- localStorage cross-tab/JSON hỏng → try/catch + versioned key
- Fetch trong client khi 0 slugs → skip fetch; unmount race → ignore stale (set state chỉ khi mounted / abort cũ)
- Print test headless → chỉ assert button tồn tại, không click (tránh dialog)
- Build/dev conflict → kill dev trước build (lesson đã ghi)

## Security Considerations
- Chỉ localStorage client-side, không gửi đi đâu; render qua React (escape); slug từ context → query param đã sanitize (GROQ param binding)

## Next Steps (out of scope — phase sau)
- Drag-and-drop reorder (framework §4), share-by-URL (encode slugs), email itinerary
- "Add to trip" trên listing cards + home featured (cần refactor card anatomy vì button trong `<a>` là invalid)
- News CMS engine, Support/FAQ, map filters, thêm languages (§9 Phase 2 còn lại)

## Completion Notes (2026-09-26)
- Status: **completed** — `npm run build` pass (`/[locale]/trip-planner` 40.1kB), Playwright **21/21 pass, 0 console/page errors**.
- E2E flow (cùng1 context, localStorage persist): detail "Add to trip" → toggle "In your trip" + aria-pressed → header badge 1→2 → click badge → planner list đúng thứ tự → "Move down" đổi thứ tự → **reload giữ nguyên order** → Remove → Clear all → empty state → clear persist sau reload → VI labels + VI badge → regressions (home, destinations listing, header link) — tất cả ✅.
- Print: button visible, `print:hidden` xác nhận trên header/footer + controls/AddToTripButton; không click trong test (headless dialog — đã ghi trong plan).
- 0 dependency mới; SSR-safe: initial `[]`/`loaded=false` → load trong useEffect (không hydration warning); persist guard `loaded` tránh wipe storage lúc mount.
- 2 điểm sai lệch nhỏ so với plan (không phải bug): detail button là **toggle** (added → click để bỏ) thay vì disabled state — UX tốt hơn; destination thứ 2 trong dataset có name "asdasdsa" (slug `dsadsad`) — data user nhập, không phải lỗi render.
- Header badge desktop: icon `Route` + count; mobile: sheet row `Chuyến đi` + count.

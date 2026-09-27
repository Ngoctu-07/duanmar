# Plan: Xoá trang `/trip-planner` (My Trip Plan)

## Context Links
- Báo cáo: `http://localhost:3000/vi/trip-planner` — user không cần trang này nữa
- Loại: **rút feature** (không phải defect code) → remediation chính là dọn sạch pointerrủ, nếu xoá mỗi route sẽ còn link chết → 404
- Tương tác với plan `260927-0141` (My Trips): trang trip-planner vừa có link sang `/my-trips`; header đã có icon My Trips riêng (Luggage)

## Overview
- Priority: high · Status: completed · Feature removal + dead-link cleanup
- Xoá route `/[locale]/trip-planner`, component folder `src/components/trip-planner/`, provider trong layout, icon/link `/trip-planner` trong header, entry trong sitemap, namespace `tripPlanner` (EN/VI)

## Root Cause / Impact Map (tham chiếu đã duyệt research)
| Vị trí | Dòng | Xử lý |
|---|---|---|
| `src/app/[locale]/trip-planner/page.tsx` | route | **Xoá** cả thư mục |
| `src/components/trip-planner/trip-planner-client.tsx` (141) | view chính | **Xoá** |
| `src/components/trip-planner/trip-plan-context.tsx` (90) | context localStorage | **Xoá** (chỉ còn header dùng `useTripPlan` badge) |
| `src/app/[locale]/layout.tsx:5,16-20` | `<TripPlanProvider>` wrapper | **Bỏ** import + wrapper |
| `src/components/layout/header.tsx:8,24,57-71,105-116` | icon Route `/trip-planner` + badge `tripCount` + mobile link + `useTripPlan` | **Xoá** (giữ Search, Luggage `/my-trips`, LocaleSwitcher, planTrip button → `/plan-your-trip`) |
| `src/app/[locale]/sitemap/page.tsx:103` | link `/trip-planner` trong "Tools" | **Xoá** entry (+ bỏ `getTranslations("tripPlanner")` nếu không còn dùng) |
| `src/messages/{en,vi}.json` → `tripPlanner` (13 key) | title/navLabel/… | **Xoá** namespace ở 2 file |
| localStorage `vn-trip-plan:v1` | data cũ trên máy user | Để yên (harmless) hoặc purge theo P2 |

**Không đụng**: `/plan-your-trip` (khác trang), button `common.planTrip`, icon `/my-trips`.

## Decisions cần chốt
- **P1 · Scope**: full cleanup (khuyến nghị) vs chỉ xoá route (sẽ còn link chết 404 + dead code)
- **P2 · Data**: bỏ qua localStorage cũ (khuyến nghị) vs xoá key `vn-trip-plan:v1` lúc app load

## Related Code Files
**Xoá**: `src/app/[locale]/trip-planner/` · `src/components/trip-planner/`
**Sửa**: `src/app/[locale]/layout.tsx` · `src/components/layout/header.tsx` · `src/app/[locale]/sitemap/page.tsx` · `src/messages/en.json` · `src/messages/vi.json`

## Implementation Steps
1. Xoá 2 thư mục (route + components)
2. `layout.tsx`: bỏ `TripPlanProvider`
3. `header.tsx`: bỏ import `useTripPlan`, `tp`, `tripCount`, icon desktop + link mobile `/trip-planner`
4. `sitemap/page.tsx`: bỏ entry + import `tripPlanner`
5. Messages EN/VI: xoá namespace `tripPlanner`
6. Chạy G1–G8 → `code-reviewer` → changelog

## Tests
| # | Test | Cách | Pass |
|---|---|---|---|
| G1 | Lint | `npm run lint` | chờ |
| G2 | Typecheck | `npx tsc --noEmit` | chờ |
| G3 | Build | stop dev → build → `rm -rf .next` → start dev | chờ |
| G4 | Route gone | curl `/vi/trip-planner` → 404; `/vi`, `/vi/my-trips`, `/vi/sitemap`, `/vi/plan-your-trip` → 200 | chờ |
| G5 | Không còn ref rủ | grep `src/`: không còn `trip-planner`/`useTripPlan`/`TripPlanProvider`/`tripPlanner`; node so namespace EN/VI còn `tripPlanner`? | chờ |
| G6 | Header OK | puppeteer: home render, icon Search + My Trips còn, **không** link `/trip-planner` (desktop + sheet) | chờ |
| G7 | Regression suites | `c-booking` · `c-payment` · `d8-a11y` · `f-ui` exit 0 | chờ |
| G8 | Sitemap | trang sitemap render (200), không còn mục trip-planner trong "Công cụ" | chờ |

## Success Criteria
G1–G8 pass · 0 reference tới trip-planner trong `src/` · My Trips/checkout không đổi hành vi

## Risk Assessment
- Header dùng `useTripPlan()` → nếu sót import sẽ build fail (G2 bắt)
- Icon Route biến mất → layout header thay đổi nhẹ (đã chốt theo P1)
- Namespace `tripPlanner` bị sót key dùng chỗ khác → G2+G5+G6 bắt
- Test cũ không tham chiếu trip-planner (đã grep) → không vỡ theo chiều ngược lại

## Security Considerations
Không thay đổi auth/data · chỉ xoá code + route

## Next Steps
Chờ approve P1/P2 → Step 1–6 · dispatch `code-reviewer` · `docs-manager` cập nhật changelog

## Test results (2026-09-27)
- Browser: `g-header` exit 0 (G1–G8)
- Approval: dismissed question, proceeded on explicit user instruction to continue
- Status: `completed`

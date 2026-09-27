---
title: "[Feature] Explore Expansion — Things to Do + Itineraries + Festivals"
description: "Hoàn tất Explore section theo framework sitemap: things-to-do hub + 6 category pages, itineraries listing + day-by-day detail, festivals calendar; fix dead links footer + homepage"
status: completed
priority: P1
effort: "4-6h"
tags: [feature, i18n, explore, content]
created: 2026-09-26
---

# [Feature] Explore Expansion — Things to Do + Itineraries + Festivals

## Executive Summary
Explore section chỉ có Destinations — 3 link footer + 6 link homepage experience-categories đang localized-404. Thêm 3 routes family (static i18n, KISS — nhất quán với plan-trip; CMS chỉ dành cho blog/news theo framework §6) để hoàn tất core Explore theo sitemap §2.

## Context Links
- **Plans**: `250926-0900-explore-destinations-feature` (listing/detail/notFound pattern), `250926-1000-plan-trip-about-language-switcher` (`t.raw` + `[guide]` dynamic pattern)
- **Framework**: `vietnam-tourism-website-framework.md` §2 sitemap — Things to Do (6 categories), Experiences & Itineraries (3/7/14-day, themed trails), Festivals & Events Calendar
- **Dead links fix**: footer (`thingsToDo`, `itineraries`, `festivals`), homepage `experience-categories.tsx` (6 × `/explore/things-to-do/*`)
- **Routing**: catch-all `[...rest]` + `[locale]/not-found.tsx` đã có → unknown slug trả localized 404

## Key Insights
- Homepage experience-categories link 6 **sub-route** → things-to-do cần hub + `[category]` dynamic (giống plan-trip `[guide]`), không phải 1 trang tĩnh
- Nội dung tĩnh i18n trong messages EN/VI (KISS: chưa cần schema/query Sanity; YAGNI — bỏ qua CMS)
- Sitemap `src/app/sitemap.ts` chưa có destinations/things-to-do/itineraries/festivals → bổ sung trong phase này

## Requirements
### Functional
1. `/[locale]/explore/things-to-do` — hub 6 category cards (nature, culture, food, beaches, wellness, nightlife)
2. `/[locale]/explore/things-to-do/[category]` — 6 trang chi tiết (mô tả + activities list); unknown → `notFound()`; `generateMetadata`
3. `/[locale]/explore/itineraries` — listing itinerary cards (duration chip 3/7/14-day)
4. `/[locale]/explore/itineraries/[slug]` — detail day-by-day; 3 items: `classic-north` (3-day), `highlights` (7-day), `full-vietnam` (14-day); unknown → `notFound()`
5. `/[locale]/explore/festivals` — calendar list (name, when, location, description; ~8 festivals)
6. i18n đầy đủ EN + VI cho toàn bộ nội dung mới
7. Sitemap thêm routes mới

### Non-functional
- `npm run build` pass; 0 console/pageerror Playwright; tái sử dụng pattern hiện có, không thêm dependency

## Related Code Files
### Create
- `src/app/[locale]/explore/things-to-do/page.tsx` (hub)
- `src/app/[locale]/explore/things-to-do/[category]/page.tsx`
- `src/app/[locale]/explore/itineraries/page.tsx`
- `src/app/[locale]/explore/itineraries/[slug]/page.tsx`
- `src/app/[locale]/explore/festivals/page.tsx`
### Modify
- `src/messages/en.json`, `src/messages/vi.json` (+`thingsToDo`, `itineraries`, `festivals`)
- `src/app/sitemap.ts` (routes)
- `docs/project-changelog.md`, `plan.md` (sau khi test pass)
### Delete
- (none)

## Implementation Steps
1. Messages EN/VI: `thingsToDo` (title, subtitle, categories.{6}.{title,summary,activities[]}), `itineraries` (title, subtitle, viewDetails, backToList, items.{3}.{title,duration,regions,summary,days[]}), `festivals` (title, subtitle, items[] each {name, when, location, description})
2. Things-to-do hub: `t.raw("categories")` → Object.entries → cards Link `/explore/things-to-do/${key}`
3. `[category]` page: tra `t.raw("categories")[category]`, miss → `notFound()`; render summary + activities; `generateMetadata`
4. Itineraries listing: `t.raw("items")` → cards + duration chip; detail `[slug]`: days array (day/title/content), miss → `notFound()`
5. Festivals page: `t.raw("items")` → list cards (when + location chips)
6. `sitemap.ts`: thêm `/explore/destinations`, `/explore/things-to-do`, `/explore/itineraries`, `/explore/festivals`
7. Kill dev (`pkill -f "next [d]ev"`) → `npm run build` → restart dev → Playwright test
8. Plan → `completed`; append changelog

## Todo List
- [x] Messages EN/VI: `thingsToDo`, `itineraries`, `festivals`
- [x] `/explore/things-to-do` hub (6 cards)
- [x] `/explore/things-to-do/[category]` (6 categories, notFound, metadata)
- [x] `/explore/itineraries` listing + `[slug]` detail day-by-day
- [x] `/explore/festivals` calendar
- [x] `sitemap.ts` routes
- [x] Build pass + Playwright suite + regression
- [x] Plan status + changelog

## Success Criteria
- `/en/explore/things-to-do` 6 cards → click nature render content; unknown → 404 localized
- `/vi/explore/things-to-do/food` nội dung tiếng Việt
- `/en/explore/itineraries` 3 cards; `/classic-north` day-by-day; slug lạ → 404
- `/en/explore/festivals` + `/vi` render
- Footer 3 links (things-to-do, itineraries, festivals) → 200; homepage experience-category click → trang detail
- Home + destinations regression 0 console errors; `npm run build` pass

## Risk Assessment
- Nội dung JSON dài → giữ concise (category: 4-6 activities; itinerary: 3-7 days; festivals: 8 items); JSON exempt rule 200-line
- Build/dev conflict (lesson đã ghi) → kill dev trước build
- Route conflict `/explore/things-to-do/page.tsx` vs `[category]` → Next ưu tiên static segment, an toàn

## Security Considerations
- Content tĩnh, không user input → không injection surface; `notFound()` cho slug lạ (không leak nội dung)

## Next Steps (out of scope — phase sau)
- `/culture`, `/deals`, `/news`, `/explore/map`, `/about/contact|careers|press` (vẫn localized 404 — deliberate)
- Homepage hero doc `homepage` trong Sanity (user tạo trong Studio)
- CMS hóa guides/itineraries khi cần blog/news engine (framework Phase 2)

## Completion Notes (2026-09-26)
- Status: **completed** — `npm run build` pass (5 routes mới trong output), Playwright **14/14 pass, 0 console errors** (hub, category detail, 404 localized, VI, itinerary listing/detail/404, festivals EN/VI, footer click-through, homepage experience click-through, home + destinations regression), sitemap chứa 4 URL explore mới.
- Không phát hiện bug ngoài plan.
- Lesson test: next-intl `Link` render href có prefix locale → selector Playwright dùng `a[href*="..."]` không exact match.

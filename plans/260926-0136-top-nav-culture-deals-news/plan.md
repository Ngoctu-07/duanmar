---
title: "[Feature] Top Navigation Completion — Culture + Deals + News"
description: "3 landing pages static i18n (Culture & Heritage, Deals & Packages, News & Stories + detail) fix 4 dead links: header /culture /deals /news + quick-access /deals"
status: completed
priority: P1
effort: "4-6h"
tags: [feature, i18n, content, navigation]
created: 2026-09-26
---

# [Feature] Top Navigation Completion — Culture + Deals + News

## Executive Summary
Header nav còn 3/6 link 404 (`/culture`, `/deals`, `/news`) + quick-access `/deals` — ảnh hưởng UX trực tiếp. Thêm 3 landing family theo framework sitemap §2, static i18n EN/VI (nhất quán plan-trip/things-to-do; CMS cho blog engine = Phase 2 theo framework §9).

## Context Links
- **Plans**: `250926-1000-plan-trip-about-language-switcher` (static i18n + dynamic route pattern), `260926-0125-explore-things-itineraries-festivals` (hub/detail/notFound + click-through test)
- **Framework**: `vietnam-tourism-website-framework.md` §2 — Culture (6 subsections), Deals (promotions/packages/bundles/seasonal), News (press releases + blog + gallery)
- **Labels sẵn**: `common.{culture,deals,news}` EN/VI đã có (header dùng `useTranslations("common")`)
- **Sitemap**: `src/app/sitemap.ts` ĐÃ có `/culture`, `/deals`, `/news` → chỉ verify

## Key Insights
- `/news` cần listing + `[slug]` detail (card không link = half-feature); pattern `t.raw` + `notFound()` đã có sẵn
- Deals là landing tĩnh 4 promo cards — không countdown/timers giả (YAGNI); real promotions/partner API = Phase 3 (framework booking integration)
- Culture 1 trang 6 sections (KHÔNG tạo 6 sub-route — sections là content, không phải nav item)

## Requirements
### Functional
1. `/[locale]/culture` — landing: 6 sections (History, UNESCO, Ethnic Minorities, Cuisine, Arts & Performing Arts, Festivals Deep-Dive) — heading + body + 3-5 points mỗi section; 2 cross-link: Cuisine → `/explore/things-to-do/food`, Festivals → `/explore/festivals`
2. `/[locale]/deals` — 4 promo cards (Current Promotions, Partner Tour Packages, Flight + Hotel Bundles, Seasonal Offers): title, tag/badge, description, terms note
3. `/[locale]/news` — listing 4 articles (title, date, category badge, excerpt) → `/[slug]` detail (full content 2-3 đoạn); unknown slug → `notFound()`; `generateMetadata`
4. i18n EN + VI toàn bộ; ngày tháng localize sẵn trong messages (string)
5. Sitemap: verify 3 URL đã có

### Non-functional
- `npm run build` pass; 0 console/pageerror; không thêm dependency

## Related Code Files
### Create
- `src/app/[locale]/culture/page.tsx`
- `src/app/[locale]/deals/page.tsx`
- `src/app/[locale]/news/page.tsx`
- `src/app/[locale]/news/[slug]/page.tsx`
### Modify
- `src/messages/en.json`, `src/messages/vi.json` (+`culture`, `deals`, `news`)
- `docs/project-changelog.md`, `plan.md` (sau test)
### Delete
- (none)

## Implementation Steps
1. Messages EN/VI: `culture` (title, subtitle, sections.{6}.{heading, body, points[]}, crossLinks…), `deals` (title, subtitle, disclaimer, items[4]{title, tag, description, terms}), `news` (title, subtitle, viewArticle, backToList, items.{4}.{title, date, category, excerpt, content})
2. Culture page: `t.raw("sections")` → 6 sections + 2 `<Link>` cross-links
3. Deals page: `t.raw("items")` → 4 cards + disclaimer note
4. News listing + `[slug]` detail (copy itinerary detail pattern: back link, category badge, content paragraphs)
5. Kill dev → `npm run build` → restart dev → Playwright suite
6. Plan → `completed`; append changelog

## Todo List
- [x] Messages EN/VI: `culture`, `deals`, `news`
- [x] `/culture` landing (6 sections + 2 cross-links)
- [x] `/deals` landing (4 cards + disclaimer)
- [x] `/news` listing + `[slug]` detail (notFound, metadata)
- [x] Build pass + Playwright suite + regression + sitemap verify
- [x] Plan status + changelog

## Success Criteria
- Header click `Culture & Heritage` → `/en/culture` render 6 sections; `/vi/culture` tiếng Việt
- `/en/deals` 4 cards; quick-access Deals click → 200
- `/en/news` 4 items → click item → detail render; slug lạ → 404 localized; `/vi/news` VI
- Home + destinations + things-to-do regression 0 console errors; `npm run build` pass; sitemap chứa 3 URL

## Risk Assessment
- Content JSON dài → giữ concise (points 3-5 mục, content 2-3 đoạn); JSON exempt rule 200-line
- Build/dev conflict (lesson đã ghi) → kill dev trước build
- Sale/pricing claims giả → dùng mô tả chung + disclaimer "sample/illustrative" (deals chưa có backend thật)

## Security Considerations
- Content tĩnh, không user input, không external link mới → không surface mới; `notFound()` slug lạ

## Next Steps (out of scope — phase sau)
- `/about/contact|careers|press` (3 footer links), `/explore/map` (cần map library)
- News engine CMS (Sanity schema `post` — framework Phase 2 blog engine)
- Business & MICE, Travel Trade, Sustainability, Support/FAQ nav (labels sẵn trong `common` nhưng chưa có trong header)

## Completion Notes (2026-09-26)
- Status: **completed** — `npm run build` pass (4 routes mới), Playwright **14/14 pass, 0 console errors**: culture EN/VI (6 sections + cross-links), deals EN/VI (4 cards + disclaimer), news listing/detail EN/VI, 404 localized, 3 click-through (header nav →culture, quick-access →deals, news →detail), regression home/destinations/things-to-do, sitemap 6 URL.
- Không phát hiện bug ngoài plan. Header nav giờ 6/6 link hoạt động.
- Ghi chú: thêm key messages mới cần check CJK leak khi paste text (đã bắt 1 lỗi + 1 typo tiếng Việt trong lúc viết — đã fix trước khi test).

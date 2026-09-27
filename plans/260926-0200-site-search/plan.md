---
title: "[Feature] Site-wide Search"
description: "Trang /search với live results (client index, diacritic-insensitive), nối hero search bar (input hiện chết) + thêm header search icon theo framework §3/§4"
status: completed
priority: P1
effort: "4-5h"
tags: [feature, i18n, search, ux]
created: 2026-09-26
---

# [Feature] Site-wide Search

## Executive Summary
Hero có search input nhưng **không submit** (input trần), header thiếu search icon theo framework §3 wireframe, §4 liệt kê "Smart search & filtering" là Visitor-Facing key feature. Triển khai search trang toàn site: index build phía server từ messages + Sanity destinations, live filter phía client, không phụ thuộc Algolia (§8 gợi ý Algolia/Elasticsearch khi content scale — để phase sau, YAGNI).

## Context Links
- **Framework**: §3 Homepage wireframe (header search icon + hero search bar "Where do you want to go?"), §4 Smart search, §2 Utility "Search Results", §8 Search stack (Algolia — phase sau)
- **Code**: `src/components/homepage/hero-section.tsx:45` (input không có form/name), `src/components/layout/header.tsx` (chưa có icon search), `home.searchPlaceholder` đã có sẵn
- **Content index**: 15 messages namespaces (~24KB/locale) + Sanity `destination` (đã có query)
- **Plans pattern**: dynamic route + client component đã có (map feature, switcher)

## Key Insights
- Server page đọc `searchParams.q` (Next15 Promise) → truyền `initialQuery` prop → **không cần `useSearchParams`/Suspense**
- Hero submit: `<form action="/{locale}/search" method="GET">` + `input name="q"` + `useLocale()` (next-intl) — GET form cổ điển, không JS state
- Matching diacritic-insensitive: `normalize("NFD")` + strip combining marks + special-case `đ→d` + lowercase; query split tokens, ALL tokens phải match; sort title-match trước desc-match
- Index entries: {title, desc, href, type, keywords} — ~45 items, filter per keystroke không cần debounce
- Header icon: Button `nativeButton={false} render={<Link href="/search"/>}` (pattern Base UI đã dùng); mobile Sheet thêm row
- KISS: KHÔNG facet/filter tags (budget/duration) — framework §4 nhưng premature khi index chỉ45 items; KHÔNG URL-sync khi gõ (initial query từ URL là đủ)

## Requirements
### Functional
1. `/[locale]/search` — server page: build index từ `getMessages()` (planTrip guides, thingsToDo categories + activities, itineraries, festivals, culture sections, deals, news items, about subpages) + `client.fetch(DESTINATIONS_QUERY)`; render `<SearchClient entries labels initialQuery>`
2. `src/components/search/search-client.tsx` ("use client"): input autoFocus, live filter (normalize + all-tokens), kết quả list (title, desc snippet, type badge, Link → detail), empty-query hint, noResults state
3. Hero: form GET → `/{locale}/search?q=` (sửa input chết)
4. Header: search icon (desktop) + row trong mobile Sheet → `/search`
5. Messages EN/VI: +`common.search`, namespace `search` {title, placeholder, hint, noResults, destination, guide, activity, itinerary, festival, article, page}
6. `generateMetadata`

### Non-functional
- `npm run build` pass; 0 console/pageerror; không thêm dependency; search page dynamic (server fetch)

## Related Code Files
### Create
- `src/app/[locale]/search/page.tsx`
- `src/components/search/search-client.tsx`
### Modify
- `src/components/homepage/hero-section.tsx` (form GET)
- `src/components/layout/header.tsx` (icon + sheet row)
- `src/messages/en.json`, `src/messages/vi.json` (+`common.search`, +`search`)
- `docs/project-changelog.md`, `plan.md` (sau test)
### Delete
- (none)

## Implementation Steps
1. Messages EN/VI
2. `search-client.tsx`: normalize() helper, entries props, useState(initialQuery), useMemo filter + sort, render results/hint/noResults
3. Server `search/page.tsx`: getMessages + destinations fetch → build entries (type discriminator) → SearchClient; metadata
4. Hero form (useLocale, name="q", keep styling, Search icon giữ nguyên)
5. Header icon + sheet row (aria-label từ `common.search`)
6. Kill dev → build → restart → Playwright (hero submit, header icon, live search, diacritic, destination result, noResults, VI, regression)
7. Plan → `completed`; changelog

## Todo List
- [x] Messages EN/VI (`common.search` + `search`)
- [x] `search-client.tsx` (normalize + live filter + states)
- [x] Server page `/search` (index từ messages + Sanity)
- [x] Hero form GET (fix input chết)
- [x] Header search icon + mobile sheet row
- [x] Build pass + Playwright suite + regression
- [x] Plan status + changelog

## Success Criteria
- Hero: gõ "pho" + Enter → `/en/search?q=pho` có kết quả (food category/news article)
- Header icon click → `/en/search`; gõ "Hội An" (có dấu) → match "Hoi An" (itinerary highlights regions) — diacritic-insensitive
- Gõ tên destination "HCM" → kết quả destination → click → detail page
- "zzzz" → noResults; `/vi/search` nhãn tiếng Việt
- Home + hero regression (0 console errors, input còn hoạt động); `npm run build` pass

## Risk Assessment
- Hero form action locale → `useLocale()` (client) — kiểm tra submit đúng `/vi/search` khi ở locale VI
- Index build lấy messages dạng nested → helper traverse tránh crash khi key thiếu (optional chaining)
- Build/dev conflict → kill dev trước build (lesson đã ghi)

## Security Considerations
- Không reflection HTML (React escape); query chỉ dùng cho match, không log/persist; no user data storage

## Next Steps (out of scope — phase sau)
- Algolia/Elasticsearch khi content scale (framework §8); facet tags (budget/duration/interest theo §4)
- URL sync khi gõ; recent searches (localStorage)
- News CMS engine, Support/FAQ, Privacy Policy

## Completion Notes (2026-09-26)
- Status: **completed** — `npm run build` pass (`/[locale]/search` route 3.68kB), Playwright pass toàn bộ: hero submit `pho` → `/en/search?q=pho` có results, header icon click, live search "hội an" (diacritic → match "Hoi An", itinerary result), destination "HCM" click → detail, noResults "zzzzqqq", VI labels + header aria "Tìm kiếm", regressions — **0 console errors**.
- **2 test bug (app đúng)**: (1) `body.textContent` bắt messages JSON serialized của NextIntl provider → assert phải scope vào `main`; (2) selector `ul li a` bắt nhầm footer links → scope `main ul li a`. Lesson: test search results luôn scope vào content container.
- Index build: ~41 entries (guides/categories/itineraries/festivals/culture/deals/news/about/destinations), matching normalize NFD + `đ→d`, all-tokens, title-match sort.
- Fix thật trong feature: hero search input **trước đây không submit** → giờ là GET form → `/search?q=`.
- KISS đã tuân thủ: không Algolia (§8), không facet tags (§4), không URL-sync khi gõ.

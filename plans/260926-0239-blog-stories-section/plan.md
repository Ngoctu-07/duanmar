---
title: "[Feature] Blog (Stories & Inspiration) + Homepage Stories Section"
description: "/blog listing filter categoryKey=story (từ NewsItem CMS+static), extract shared news card (DRY), homepage Stories & Inspiration section 3 bài trước NewsletterCTA — framework §2 Blog node + §3 wireframe #8"
status: completed
priority: P1
effort: "4-5h"
tags: [feature, i18n, blog, homepage, cms]
created: 2026-09-26
---

# [Feature] Blog (Stories & Inspiration) + Homepage Stories Section

## Executive Summary
Framework §2 `News & Stories → Blog (travel stories, local voices)` + §3 wireframe #8 `Stories & Inspiration Blog — Latest 3–4 articles` (homepage). Tận dụng CMS engine vừa build: blog = view filter `category=post category story` của cùng dataset NewsItem (CMS + static fallback), homepage thêm section 3 bài mới nhất trỏ `/blog`.

## Context Links
- **Framework**: §2 line 94 Blog node; §3 #8 homepage Stories section; §9 Phase 2 "blog/news engine" (phần blog chưa có)
- **Provider đã có**: `src/lib/news-content-provider.ts` (NewsItem, CMS-first merge, slug-dedupe) — chỉ cần thêm `categoryKey` + `getStories()`
- **News list card**: inline JSX trong `news/page.tsx` — extract shared component (DRY, news + blog cùng dùng)
- **Homepage**: `page.tsx` server, 5 sections (Hero → QuickAccess → Featured → Categories → NewsletterCTA); Stories chèn trước NewsletterCTA (§3 thứ tự #8 < #11)
- **CMS post seed**: `abc/123` category `story` → blog sẽ có 3 items (1 CMS + 2 static Story)
- **Plans**: `260926-0220-news-cms-engine`, `260926-0228-support-faq-privacy` (pattern CTA cross-namespace)

## Key Insights
- **`categoryKey` trên NewsItem**: CMS = `post.category` key (`story`/`pressRelease`); static = reverse-lookup từ `messages.news.categories` label map (`"Story"`→`story`) — filter ổn định bất kể locale display string
- **`getStories(locale, limit?)`** = filter `categoryKey==="story"` + slice — thứ tự = thứ tự list provider (CMS date desc trước, static messages order sau); ghi nhận limit: static dates là display string → không sort chéo nguồn (KISS, đã đúng với data hiện tại: CMS abc/123 25/09 mới nhất)
- **Blog link về `/news/[slug]`** (article detail 1 nơi) — không tạo route detail trùng; `showCategory=false` trên blog (vì toàn badge "Story" redundant)
- **Extract `news-item-card.tsx`**: props `{item, href, showCategory, ctaLabel}` — news page giữ nguyên render, blog dùng lại (DRY thay duplicate markup)
- **Blog namespace tự chứa** (title/subtitle/viewAll/viewArticle) — homepage StoriesSection cũng dùng `blog` ns (không duplicate vào `home`) ✅ cross-namespace reuse pattern đã có
- Homepage thêm `params` để lấy locale → `getStories(locale, 3)`
- Rời scope: header nav item (footer + homepage đủ discovery), homepage `NewsletterCTA` hardcoded EN (pre-existing i18n gap — note), news filter theo category (framework để news = trang tổng hợp)

## Requirements
### Functional
1. **Provider**: NewsItem + `categoryKey: string | null`; static reverse-map; `getStories(locale, limit?)`
2. **`src/components/news/news-item-card.tsx`** (shared card) — news page refactor sang dùng
3. **`/[locale]/blog`**: `blog` ns (title "Stories & Inspiration"/"Câu chuyện & cảm hứng", subtitle, viewArticle, viewAll), list `getStories(locale)`, card `showCategory=false`, empty state nếu 0
4. **`src/components/homepage/stories-section.tsx`** (server): title/subtitle từ `blog` ns, grid 3 card (title, date, excerpt, link `/news/...`) + "view all" → `/blog`; chèn vào homepage trước `NewsletterCTA`
5. **Messages EN/VI**: +`blog` (4 keys); +`footer.blog` ("Stories & Blog" / "Câu chuyện & Blog")
6. **Footer**: explore column +Blog link
7. **Sitemap**: +`/blog`
8. `metadata` blog page

### Non-functional
- `npm run build` pass; 0 console/pageerror; 0 dependency mới; card extraction không đổi markup news page (regression test)

## Related Code Files
### Create
- `src/components/news/news-item-card.tsx`
- `src/app/[locale]/blog/page.tsx`
- `src/components/homepage/stories-section.tsx`
### Modify
- `src/lib/news-content-provider.ts` (+categoryKey, +getStories)
- `src/app/[locale]/news/page.tsx` (dùng shared card)
- `src/app/[locale]/page.tsx` (+params locale, +StoriesSection)
- `src/messages/en.json`, `src/messages/vi.json` (+`blog`, +`footer.blog`)
- `src/components/layout/footer.tsx` (+link)
- `src/app/sitemap.ts` (+/blog)
- `docs/project-changelog.md`, `plan.md`
### Delete
- (none)

## Implementation Steps
1. Messages EN/VI
2. Provider: categoryKey + getStories
3. Shared card + refactor news page
4. Blog page
5. StoriesSection + homepage insert
6. Footer + sitemap
7. Kill dev → build → restart → Playwright (filter excludes press, CMS story included, homepage section order, VI, footer/sitemap, news regression, 0 errors)
8. Plan → `completed`; changelog

## Todo List
- [x] Messages EN/VI `blog` + footer key
- [x] Provider `categoryKey` + `getStories`
- [x] Extract shared `news-item-card` + refactor news page
- [x] `/blog` page (filter stories, metadata, empty state)
- [x] `stories-section` + homepage insert (params locale)
- [x] Footer Blog link + sitemap
- [x] Build pass + Playwright (filter logic, homepage order, VI, regressions, 0 errors)
- [x] Plan status + changelog

## Success Criteria
- `/en/blog`: cards = story items ONLY (3: CMS Joy + 2 static; **press releases excluded**), không badge category, card link → `/en/news/...`
- Homepage: section "Stories & Inspiration" render 3 bài, nằm TRƯỚC NewsletterCTA, view-all → `/en/blog`; `/vi/blog` tiếng Việt
- `/en/news` render y hẩn (card extraction regression), footer Blog link + sitemap `/en/blog` 200
- Build pass; 0 console errors; 0 dependency mới

## Risk Assessment
- Card extraction đổi markup news → regression test count + link href
- Homepage thêm params → App Router OK (pattern news page đã làm); thêm 1 Sanity fetch trên home (dynamic sẵn)
- Filter sai (static category reverse-map miss) → test assert press release VÀNG KHÔNG có trong blog
- Empty blog state → conditional render (không crash khi 0)

## Security Considerations
- Không user input mới; render qua React; GROQ param binding như cũ

## Next Steps (out of scope — phase sau)
- News page category filter/tabs (press vs story), related articles trên detail
- Header nav cho Blog (nếu traffic), RSS feed, NewsArticle structured data (§7 còn `Event`, `TouristAttraction`)
- Events calendar (structured months cho festivals), additional languages, trade portal (§9 Phase 2 còn lại)
- Fix `NewsletterCTA` hardcoded EN (pre-existing i18n gap)

## Completion Notes (2026-09-26)
- Status: **completed** — `npm run build` pass (`/blog` route), Playwright **23/23 pass, 0 console errors**.
- **Blog filter đúng**: 3 cards = 1 CMS story (`abc/123` "Joy") + 2 static (hanoi, fansipan); **press releases loại hoàn toàn** (assert title + badge); cards link `/news/...` (không duplicate route); blog cards không badge category, news cards giữ badge (card extraction regression).
- **Homepage**: "Stories & Inspiration" 3 cards, index 409 < newsletter 884 (TRƯỚC NewsletterCTA ✅), view-all → `/en/blog` navigate.
- **Test bug đã fix** (app đúng): `main.innerHTML()` escape `&` → `&amp;` khiến `indexOf('Stories & Inspiration')` = -1 → đổi sang `textContent`. Lesson: so sánh text order dùng textContent.
- Provider +157 dòng (categoryKey: CMS = key, static = reverse label map; `getStories(locale, limit?)` provider-order — ghi nhận limit: không sort chéo nguồn vì static dates là display string).
- `StoriesSection` server component dùng `getLocale()` (next-intl) — không cần truyền params từ page.
- `NewsletterCTA` hardcoded EN (pre-existing) — giữ note ở Next Steps.

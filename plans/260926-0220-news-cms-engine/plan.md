---
title: "[Feature] News CMS Engine v1"
description: "Schema post bilingual (field _en/_vi + fieldsets), provider CMS-first + static fallback (slug dedupe), news list/detail swap data source, category i18n — framework Phase 2 blog/news engine"
status: completed
priority: P1
effort: "6-8h"
tags: [feature, cms, sanity, i18n, news]
created: 2026-09-26
---

# [Feature] News CMS Engine v1

## Executive Summary
Framework Phase 2 **blog/news engine** (§7 "CMS-driven blog/news", §9). News hiện 100% tĩnh trong messages (4 bài) → chuyển sang Sanity: schema `post` bilingual, page fetch CMS với **static fallback** (không mất nội dung, không bắt buộc user seed ngay), category i18n.

## Context Links
- **Framework**: §7 "Multilingual CMS"; §9 Phase 2 "blog/news engine"; §2 sitemap `/news`
- **Code hiện tại**: `news/page.tsx` (53 dòng) + `news/[slug]/page.tsx` (73 dòng) — cùng render shape `{title, date, category, excerpt, content[]}`, đều `ƒ dynamic` (fetch/request-time → CMS hiện ngay, không ISR stale)
- **Schema pattern**: `destination.ts` (defineType/defineField, `rule.required()`)
- **Draft mode đã có**: `api/draft-mode/enable` + `SANITY_API_READ_TOKEN` — sẵn, không cần thêm
- **Deps**: `sanity-plugin-internationalized-array@5.3.1` **đã cài nhưng KHÔNG register**

## Key Insights
- **Schema approach: explicit `title_en/title_vi/...` + fieldsets** (chọn thay vì plugin): plugin không hỗ trợ nested array (content paragraphs), cần register + làm GROQ phức tạp (`value[_key==...]`); explicit fields → GROQ projection tất cả, server JS pick theo locale — đơn giản, slug source `title_en` hoạt động ngay. Plugin giữ nguyên trong package.json cho multilanguage sâu hơn (note phase sau).
- **Provider `src/lib/news-content-provider.ts`**: `getNewsList(locale)` = fetch `POSTS_QUERY` + `getMessages()` → map CMS items → **merge với static fallback, slug dedupe (CMS thắng)** → progressive migration không mất nội dung: user port bài (cùng slug) → bài static bị shadow; port đủ 4 → list = CMS-only. `getNewsArticle(slug, locale)` = CMS trước → static → null.
- **Category**: CMS select key (`pressRelease` | `story` — khớp 2 category hiện có) → label từ `news.categories.{key}` (messages EN/VI); static items đã là display string → passthrough lookup case-sensitive (`"Story"` ≠ key `"story"`) an toàn.
- **Date**: CMS `publishedAt` (date → "YYYY-MM-DD") → `formatNewsDate(iso, locale)`: EN "28 Aug 2026" (`en-GB` short month), VI "28/08/2026" (đúng format vi.json hiện tại, `timeZone: UTC` tránh lệch ngày).
- **Page JSX gần như không đổi** — provider trả cùng NewsItem shape; list đổi `Object.entries` → array map + thêm `params` để lấy locale.
- Query syntax được test ngay qua list page (GROQ sai → server error → Playwright fail); field-name typo chỉ detect khi có content thật → bước verify sau khi user tạo post đầu tiên.
- Sitemap: `/news` đã list, detail slugs không cần (consistent với destinations detail).

## Requirements
### Functional
1. **Schema `post`** (`src/sanity/schemaTypes/post.ts`): fieldsets `en`/`vi`; fields `title_en/vi` (required EN), `excerpt_en/vi` (text rows 3), `content_en/vi` (array<text> paragraphs), `slug` (source `title_en`, required), `category` (select pressRelease/story, initialValue pressRelease), `publishedAt` (date, required, default hôm nay); ordering `publishedAt desc`; register vào `schemaTypes/index.ts`
2. **Query** `src/sanity/queries/posts.ts`: `POSTS_QUERY` (published, order desc, fields slug/publishedAt/category/title+excerpt+content cả 2 locale), `POST_BY_SLUG_QUERY`
3. **Provider** `src/lib/news-content-provider.ts` (<200 dòng): types `NewsItem`, `getNewsList(locale)`, `getNewsArticle(slug, locale)`, `formatNewsDate(iso, locale)`; CMS+static merge slug-dedupe; category label resolve; try/catch fetch → fail về static fallback (không 500 khi Sanity down)
4. **News list page**: data từ provider (thêm `params` locale), render mảng
5. **News detail page**: `getNewsArticle` thay `getArticle` local; không tìm thấy → `notFound()`; JSX giữ nguyên
6. **Messages EN/VI**: +`news.categories.pressRelease`, `news.categories.story`
7. `generateMetadata` detail giữ nguyên (dùng item đã fetch)

### Non-functional
- `npm run build` pass; 0 console/pageerror; không thêm dependency; KISS (không draft preview UI, không blog section riêng, không tag/filter — next steps)

## Related Code Files
### Create
- `src/sanity/schemaTypes/post.ts`
- `src/sanity/queries/posts.ts`
- `src/lib/news-content-provider.ts`
### Modify
- `src/sanity/schemaTypes/index.ts` (+post)
- `src/app/[locale]/news/page.tsx` (provider list + params)
- `src/app/[locale]/news/[slug]/page.tsx` (provider detail)
- `src/messages/en.json`, `src/messages/vi.json` (+`news.categories`)
- `docs/project-changelog.md`, `plan.md` (sau test)
### Delete
- (none)

## Implementation Steps
1. Messages EN/VI `news.categories`
2. Schema `post` + register
3. Queries `posts.ts`
4. Provider (types + merge + date + category)
5. Swap list page + detail page
6. Kill dev → build → restart → Playwright (4 static items, detail 3 paragraphs, unknown slug 404, VI, fallback intact, regressions, 0 errors)
7. Hướng dẫn user tạo 1 post test trong Studio → re-verify CMS path (nếu user xác nhận đã tạo)
8. Plan → `completed`; changelog

## Todo List
- [x] Messages EN/VI `news.categories`
- [x] Schema `post` + register index
- [x] Queries POSTS_QUERY / POST_BY_SLUG_QUERY
- [x] Provider (merge slug-dedupe, date, category, fallback-on-error)
- [x] Swap news list + detail pages
- [x] Build pass + Playwright (static fallback, 404, VI, regressions, 0 errors)
- [x] Verify CMS path với post thật (user seed trong Studio)
- [x] Plan status + changelog

## Success Criteria
- List `/en/news`: 4 bài tĩnh render y hệt trước (badge category, date, excerpt); detail render 3 paragraphs; unknown slug → localized 404; `/vi/news` category "Thông cáo báo chí"/"Câu chuyện", date dd/mm/yyyy
- Tạo post trong Studio → hiện trên list (CMS thắng static nếu trùng slug) — verify khi user seed
- Sanity down/fetch error → fallback tĩnh, không 500
- `npm run build` pass; 0 console errors; không thêm dependency

## Risk Assessment
- GROQ field typo không detect khi dataset trống → mitigation: schema field names = query projection names (review đối chiếu), + verify với post thật sau seed
- User thêm post đầu → list = CMS + static còn lại (không mất) — document slug-dedupe migration
- `getMessages()` lớn hơn cần → chỉ đọc `news` namespace, negligible
- Draft route cũ không đổi → không regression

## Security Considerations
- Chỉ published docs (không token trên trang public); input render qua React (escape); slug param → GROQ param binding (không nối chuỗi)

## Next Steps (out of scope — phase sau)
- Draft/preview UI nối sẵn `api/draft-mode/enable` + Visual Editing
- Blog section riêng (framework §2 sitemap có Blog song song News), tag/filter/search news, related articles, RSS/structured data `NewsArticle`/`FAQPage` (§7 SEO)
- Đổi sang `sanity-plugin-internationalized-array` nếu thêm language thứ 3+ (register plugin)
- Port 4 bài tĩnh vào Studio rồi bỏ fallback (khi user confirm toàn bộ content đã migrate)

## Completion Notes (2026-09-26)
- Status: **completed** (CMS-path verify phụ thuộc user seed post — xem mục cuối) — `npm run build` pass (cả2 route `ƒ dynamic`), Playwright **19/19 pass, 0 console errors**.
- **Đã verify**: EN list 4 bài tĩnh fallback (mới nhất đầu), detail 3 paragraphs + excerpt + date "28 Aug 2026", unknown slug → 404, Story detail, VI list (category "Thông cáo báo chí", date "28/08/2026" ✅ format khớp vi.json), VI detail, regressions (home, trip-planner), POSTS_QUERY chạy server-side không lỗi (page 200 = GROQ syntax valid).
- **2 test bug (app đúng)** đã fix: (1) `article p` bắt nhầm excerpt `<p>` → scope `p.leading-relaxed`; (2) console "Failed to load resource: 404" từ lần goto slug không tồn tại là expected → reset errors sau 404 test. Lesson: selector content phải exclude excerpt; expected-404 phải reset error buffer.
- **Chưa verify**: CMS path với post thật (user chọn Approve & Build, không seed) — cần user tạo 1 post trong Studio (title EN/VI + slug generate + publishedAt) → chạy lại `node test-newscms.mjs` sẽ thấy list 5 bài (CMS + 4 static) và detail CMS render. Khi user port đủ 4 bài cùng slug → static bị shadow, list = CMS-only.
- Provider: `src/lib/news-content-provider.ts` (128 dòng) — CMS-first, slug-dedupe merge, try/catch → static fallback khi Sanity down (không 500), `formatNewsDate` UTC-safe.
- Schema `post`: fieldsets English/Tiếng Việt, field `_en`/`_vi` (KISS — bỏ qua internationalized-array plugin vì không hỗ trợ nested array + GROQ phức tạp; plugin giữ trong package.json cho phase thêm language).

## Update (2026-09-26, cùng session)
- **CMS path verified** với post seed từ Studio: slug `abc/123`, title EN "Joy" / VI "Duy", category `story`, publishedAt 2026-09-25 — list 5 items (CMS đứng đầu theo date desc), detail EN/VI 200 với date/category i18n đúng.
- **Bugfix**: `news/[slug]` → `news/[...slug]` (catch-all + `slugParts.join("/")`) — slug chứa `/` từ Sanity slug field không match route 1 segment trước đây (detail 404). Build pass, Playwright 13/13.

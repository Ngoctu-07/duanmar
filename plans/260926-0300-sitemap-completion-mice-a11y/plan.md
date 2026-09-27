---
title: "[Feature] Framework Sitemap Completion — Business & MICE + Accessibility + HTML Sitemap"
description: "/business-mice brochure (§2 Business tree, honest — toolkit 'on request'), /accessibility statement (không claim certification), /sitemap HTML (reuse labels) — đóng nốt §2 Business + Utility trees"
status: completed
priority: P1
effort: "5-6h"
tags: [feature, i18n, utility, mice]
created: 2026-09-26
---

# [Feature] Framework Sitemap Completion — MICE + Accessibility + HTML Sitemap

## Executive Summary
Đóng 2 cây còn lại của framework §2: **Business & MICE Travel** (4 nodes → brochure page, audience #3) và **Utility Pages** (thiếu Accessibility Statement + HTML Sitemap — search/language/404/privacy đã ✅). 3 trang static i18n,0 dependency, pattern đã chứng minh (trade brochure, support/privacy).

## Context Links
- **Framework**: §2 `Business & MICE Travel` (Conference Venues, Incentive Travel, Investment Info, MICE Toolkit) + `Utility Pages` (Accessibility Statement, Sitemap HTML; search/language/404/privacy ✅); §1 audience #3 (MICE); §3 #12 footer "legal links"
- **Pattern**: `/trade` brochure (offers array + CTAs), `/support|/privacy` (server page + t.raw + metadata), footer legal row (2 links hiện tại)
- **Reuse**: `common` labels đủ cho sitemap groups (explore/planTrip/culture/deals/news/about); footer labels cho guides/destinations; **không content mới ngoài 2 ns**
- **Plans**: `260926-0251-trade-landing-...` (B2B brochure pattern + honest wording), `260926-0228-support-faq-privacy` (utility pattern)

## Key Insights
- **MICE brochure honest** (đúng bài học từ /trade): Venues = general "major cities offer convention centres" (không tên venue/capacity bịa), Incentive = mô tả kiểu chương trình chung, Investment → link visa guide thật, **Toolkit "available on request — contact us"** (KHÔNG file giả, KHÔNG số liệu)
- **Accessibility statement trung thực**: commitment theo WCAG 2.1 AA *as goal* + measures THẬT của codebase (semantic HTML, aria-label trên icon buttons, keyboard focus, responsive text) + known limitations thật (map widget tương tác, nội dung bên thứ 3) + feedback → `/about/contact`; **test assert KHÔNG có "certified"/"compliant" claim** (không chứng nhận gì mà không có)
- **HTML sitemap** `/sitemap` (khác `/sitemap.xml`): grouped links từ static array trong page + **label reuse** `common`/`footer` ns — 2 keys mới duy nhất {title, subtitle}; note giữ sync thủ công (KISS thay vì extract route registry — YAGNI)
- **Footer legal row** += Accessibility + Sitemap (2→4 links, flex đã sẵn); sitemap.xml (XML) += 3 routes
- Route naming: `/business-mice` (self-documenting), `/accessibility`, `/sitemap` (page, không conflict với sitemap.xml)
- Plan Your Trip thiếu 5 guides (Getting to Vietnam, Money, Etiquette, Accessibility Info, Sustainable) → **feature riêng sau** (note), Sustainability tree = framework Phase 3

## Requirements
### Functional
1. **Messages EN/VI**: +`mice` {title, subtitle, intro, servicesTitle, services×4 {heading,text}, visaCta, contactTitle, contactText, contactCta}; +`accessibility` {title, subtitle, commitment, measuresTitle, measures[], limitationsTitle, limitations[], feedbackTitle, feedbackText}; +`sitemapPage` {title, subtitle}; +`footer.accessibility`, +`footer.sitemapHtml`
2. **`/[locale]/business-mice`**: brochure mirror /trade —4 services, visaCta → `/plan-your-trip/visa`, contact CTA; metadata
3. **`/[locale]/accessibility`**: commitment + measures (list) + known limitations (list) + feedback → contact; metadata
4. **`/[locale]/sitemap`**: groups (Explore, Plan Your Trip, Discover [culture/deals/news/blog], Partners [trade/business-mice], About & Support [about×4, support, privacy, accessibility], Tools [search, trip-planner, events? events đã trong explore]) — links tĩnh, label reuse; metadata
5. **Footer**: legal row +Accessibility +Sitemap HTML (tf keys mới)
6. **sitemap.xml**: +`/business-mice`, `/accessibility`, `/sitemap`

### Non-functional
- `npm run build` pass; 0 console/pageerror; 0 dependency; không "use client" mới; honest content (regex assert không số liệu bịa, không certification claim)

## Related Code Files
### Create
- `src/app/[locale]/business-mice/page.tsx`
- `src/app/[locale]/accessibility/page.tsx`
- `src/app/[locale]/sitemap/page.tsx`
### Modify
- `src/messages/en.json`, `src/messages/vi.json` (3 ns mới + 2 footer keys)
- `src/components/layout/footer.tsx` (legal row 2→4)
- `src/app/sitemap.ts` (+3 routes)
- `docs/project-changelog.md`, `plan.md`
### Delete
- (none)

## Implementation Steps
1. Messages EN/VI (3 ns + footer keys)
2. `/business-mice` page (trade-mirror pattern)
3. `/accessibility` page (honest statement)
4. `/sitemap` HTML page (groups + label reuse)
5. Footer legal row + sitemap.xml routes
6. Kill dev → build → restart → Playwright (3 pages EN/VI, honest asserts, footer 4 links, sitemap links 200, regressions, 0 errors)
7. Plan → `completed`; changelog

## Todo List
- [x] Messages EN/VI `mice` + `accessibility` + `sitemapPage` + footer keys
- [x] `/business-mice` brochure page
- [x] `/accessibility` statement page
- [x] `/sitemap` HTML page (groups, label reuse)
- [x] Footer legal row 4 links + sitemap.xml +3
- [x] Build pass + Playwright (honest asserts, VI, links, regressions, 0 errors)
- [x] Plan status + changelog

## Success Criteria
- `/en/business-mice`: 4 services, visa CTA → `/en/plan-your-trip/visa`, contact → `/en/about/contact`, toolkit wording "on request", regex KHÔNG có số liệu bịa
- `/en/accessibility`: commitment + ≥3 measures + ≥2 limitations + feedback link; **assert không "certified"**; `/vi` tiếng Việt
- `/en/sitemap`: ≥40 internal links, chứa `/en/business-mice`, `/en/trade`, `/en/accessibility`, `/en/trip-planner`; spot-check links 200
- Footer legal row 4 links (Support, Privacy, Accessibility, Sitemap) cả2 locale; sitemap.xml chứa 3 routes mới
- Build pass; 0 console errors; 0 dependency

## Risk Assessment
- Statement vô tình claim sai → wording "aiming to align", measures liệt kê feature codebase thực có (aria-label, semantic), limitations map widget — test assert từ cấm "certified"
- Sitemap page link list lệch route thật → test crawl 1 sample per group (200)
- Sitemap route `/sitemap` nhầm `/sitemap.xml` → test phân biệt (HTML page có h1)
- Footer row dài → flex-wrap đã có

## Security Considerations
- Không input mới; links internal i18n Link; render React escape

## Next Steps (out of scope — phase sau)
- **Plan Your Trip 5 guides còn lại** (Getting to Vietnam, Money & Costs, Etiquette, Accessibility Info, Sustainable Guidelines — pattern guides có sẵn)
- Photo & Video Gallery (§2 News tree), Sustainability tree (framework Phase 3)
- Additional languages (cần chọn ngôn ngữ + dịch 18 ns), draft/preview Sanity, newsletter i18n fix

## Completion Notes (2026-09-26)
- **Delivered**: `/[locale]/business-mice` (brochure 4 services, toolkit "on request", visa → `/plan-your-trip/visa`, contact → `/about/contact`, **regex assert 0 số liệu bịa**); `/[locale]/accessibility` (commitment WCAG 2.1 AA *as goal*, 5 measures thật = semantic landmarks/keyboard focus/alt+ARIA/responsive/contrast, 3 known limitations thật = map widget/external images/no AT certification, feedback → contact, **assert 0 "certified"**); `/[locale]/sitemap` HTML (6 groups + Home, **42 links dynamic từ messages dicts** — categories/itineraries/news items sync tự động, labels reuse `common`/`footer`/`mice`/`planTrip`; keys `sitemapPage` = title/subtitle/discover/partners/tools/home/overview/map)
- **Wiring**: footer legal row 2→4 (Support, Privacy, Accessibility, Sitemap, `flex-wrap`); sitemap.xml +3 routes
- **Verified**: build pass (type fix `tRaw` helper — `raw` property type); Playwright **40/40, 0 console/page errors** (honest asserts, EN/VI, footer 4 links ×2 locale, sitemap.xml vs page distinction, 5 sample links 200, regressions); dev restarted
- **Deviations**: sitemap link count 40 ✅ đạt được nhờ enrich dynamic (không hardcode thêm); 3 test bugs ban đầu = test sai regex `(WCAG) 2.1` + VI case + count ban đầu 25 → trang dynamic
- **Changelog**: `### Added` entry appended
- **§2 status**: Business & MICE ✅ + Utility ✅ (đóng 2 cây); còn lại: PT guides 5 nodes, Gallery, Sustainability (Phase 3)

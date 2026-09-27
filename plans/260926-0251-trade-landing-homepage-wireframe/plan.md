---
title: "[Feature] Trade Landing + Homepage Wireframe Completion (#6 Trending, #10 Trade/Press CTA)"
description: "/trade brochure landing (§2 Travel Trade root, honest — không bịa directory/stats), homepage Trending Itineraries section + Trade/Press CTA band — hoàn thành wireframe §3 #6 + #10"
status: completed
priority: P1
effort: "5-6h"
tags: [feature, i18n, homepage, trade]
created: 2026-09-26
---

# [Feature] Trade Landing + Homepage Wireframe Completion

## Executive Summary
Framework §3 wireframe còn thiếu **#6 Trending Itineraries** và **#10 Trade/Press CTA Band**; §2 `Travel Trade / Industry Partners` tree chưa có trang root. Feature: homepage 2 sections mới (trending = 3 itineraries thật, CTA band → /trade + /about/press) + `/trade` landing brochure trung thực (4 offer sections, KHÔNG bịa directory partners / statistics numbers — teaser "on request" + contact CTA).

## Context Links
- **Framework**: §3 #6 "Trending Itineraries — curated with duration" + #10 "Trade/Press CTA Band"; §2 lines 85-90 Travel Trade tree (Directory, Marketing & Co-op, Statistics, Media/Press Kit, Partner Login); §1 audience #4 (tour operators/DMCs) + #5 (media)
- **Code**: itineraries ns (3 items: title/duration/regions/summary/days — KHÔNG price → hiển thị duration+regions, KHÔNG bịa giá); hub card markup (`itineraries/page.tsx`); about/press đã có (Media CTA target ✅); homepage server sections pattern (StoriesSection/EventsTicker)
- **Plans**: `260926-0239-...-blog-stories-section` (homepage section pattern), `260926-0147-...-about-subpages` (brochure page pattern + press)

## Key Insights
- **Trending section reuse `itineraries` ns** (title "Suggested Itineraries" — nhất quán hub, DRY) + 1 key mới `home.trendingViewAll`; cards slice 3 items; KHÔNG price (không có data → không bịa)
- **CTA band**: accent section 2 links — `home.trade` {title, tradeCta, mediaCta}; Media → `/about/press` (đã có thật), Trade → `/trade` (mới)
- **`/trade` brochure honest** (§2 5 nodes → quyết định scope): Marketing & co-op ✅, Statistics "on request" (không publish số bịa), Directory "in development — enquire" (không bịa partners), Media → link press page; **Partner Login defer** (cần auth — ghi note trong plan, không render login giả)
- **Homepage order cuối** (§3 số thứ tự): Hero(1) → Quick(3) → Featured(4) → Categories(5) → **Trending(6)** → Ticker(7) → Stories(8) → **TradeCTA(10)** → Newsletter(11); #2 video carousel (hero đã cover) + #9 sustainability (framework Phase 3) defer
- Trending/CTA = server components, 0 client, 0 dependency
- Footer about col +Trade link; sitemap +`/trade`

## Requirements
### Functional
1. **Messages EN/VI**: +`home.trendingViewAll`, +`home.trade` {title, tradeCta, mediaCta}, +`trade` ns {title, subtitle, intro, offersTitle, offers×4 {heading,text}, pressCta, contactTitle, contactText, contactCta}, +`footer.trade`
2. **`src/components/homepage/trending-itineraries.tsx`** (server): heading `itineraries.title`, 3 cards (duration badge, title, summary, regions → `/explore/itineraries/[slug]`), view-all → `/explore/itineraries`; chèn sau ExperienceCategories, trước EventsTicker
3. **`src/components/homepage/trade-cta-band.tsx`** (server): band `home.trade` —2 links `/trade` + `/about/press`; chèn sau StoriesSection, trước NewsletterCTA
4. **`/[locale]/trade/page.tsx`**: header, intro, offersTitle + 4 offer cards, pressCta → `/about/press`, CTA contact → `/about/contact`; metadata
5. **Footer**: about column +Trade; **Sitemap** +`/trade`

### Non-functional
- `npm run build` pass; 0 console/pageerror; 0 dependency; 0 "use client" mới; không bịa số liệu/partner/price

## Related Code Files
### Create
- `src/components/homepage/trending-itineraries.tsx`
- `src/components/homepage/trade-cta-band.tsx`
- `src/app/[locale]/trade/page.tsx`
### Modify
- `src/messages/en.json`, `src/messages/vi.json` (+home keys, +`trade`, +`footer.trade`)
- `src/app/[locale]/page.tsx` (+2 sections)
- `src/components/layout/footer.tsx` (+trade link)
- `src/app/sitemap.ts` (+/trade)
- `docs/project-changelog.md`, `plan.md`
### Delete
- (none)

## Implementation Steps
1. Messages EN/VI
2. TrendingItineraries + insert
3. TradeCtaBand + insert
4. `/trade` page
5. Footer + sitemap
6. Kill dev → build → restart → Playwright (order #6<#7<#8<#10<#11, cards link đúng, /trade sections + honest content, VI, footer/sitemap, regressions, 0 errors)
7. Plan → `completed`; changelog

## Todo List
- [x] Messages EN/VI (`home.trendingViewAll`, `home.trade`, `trade`, `footer.trade`)
- [x] `trending-itineraries` + homepage insert (sau Categories, trước Ticker)
- [x] `trade-cta-band` + homepage insert (sau Stories, trước Newsletter)
- [x] `/trade` page (4 offers + press + contact CTAs, metadata)
- [x] Footer trade link + sitemap
- [x] Build pass + Playwright (section order, links, honest content, VI, regressions, 0 errors)
- [x] Plan status + changelog

## Success Criteria
- Homepage order text-index: Suggested Itineraries < Events & Festivals < Stories & Inspiration < Trade band title < Stay Updated
- Trending 3 cards → `/en/explore/itineraries/...`; CTA band 2 links → `/en/trade` + `/en/about/press`
- `/en/trade`: 4 offer sections, press + contact CTA hoạt động, **không có số liệu đối tác bịa**; `/vi/trade` tiếng Việt
- Footer Trade link + sitemap `/en/trade` 200; regressions blog/ticker/news pass; build; 0 console errors; 0 dependency

## Risk Assessment
- Text-order test đụng trùng labels → dùng chuỗi distinctive per section (đã có: "Suggested Itineraries"/"Events & Festivals"/"Stories & Inspiration"/"Stay Updated")
- Brochure content vô tình claim sai → wording "on request"/"in development", không số + không tên đối tác
- itineraries.title VI khác EN → test dùng text theo locale (không hardcode EN trên /vi)

## Security Considerations
- Không input mới; links internal i18n Link; render React escape

## Next Steps (out of scope — phase sau)
- Partner directory + stats (cần CMS collection thật), Partner Login Portal (auth), ICS/region cho events
- **Business & MICE tree** (§2 — page riêng, audience #3), Homepage #9 sustainability (framework Phase 3), hero video carousel #2
- Utility completion (a11y statement + HTML sitemap), additional languages, newsletter i18n fix

## Completion Notes (2026-09-26)
- Status: **completed** — `npm run build` pass (`/trade` 1.52kB), Playwright **31/31 pass, 0 console errors**, 0 dependency, 0 client component mới.
- **Wireframe order verified**: Suggested Itineraries(409) < Events(…) < Stories(1252) < Trade band(1727) < Newsletter(1780) — #6<#7<#8<#10<#11 ✅.
- **Trending**: 3 cards → `/en/explore/itineraries/{classic-north,highlights,full-vietnam}`, duration badge "3 days" (KHÔNG price — không data → không bịa), view-all → hub.
- **`/trade` honest brochure**: 4 offers, "on request" (stats), "in development" (directory), regex assert **không có số đối tác bịa**; press CTA → `/about/press` navigate, contact → `/about/contact`; Partner Login KHÔNG render (defer auth).
- **VI**: title "Đối tác lữ hành", band "Đối tác & Truyền thông" — **tự phát hiện & fix typo "luch hành"→"lữ hành"** khi seed messages (test assert không còn "luch").
- Footer about col +Trade link; sitemap +`/trade`; regressions blog/events intact.
- Rời scope đúng plan: Business & MICE tree, directory/stats/login (data/auth), homepage #9 sustainability (Phase 3), #2 video carousel (hero đã cover).

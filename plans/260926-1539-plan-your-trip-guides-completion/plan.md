---
title: "[Feature] Plan Your Trip Guides Completion — 5 nodes còn lại (§2)"
description: "Getting to Vietnam, Money & Costs, Etiquette, Accessible Travel, Sustainable Travel — thêm 5 guides vào planTrip.guides (hub dynamic auto-update), enrich sitemap page + sitemap.xml — đóng §2 Plan Your Trip tree (10/10)"
status: completed
priority: P1
effort: "4-5h"
tags: [feature, i18n, content]
created: 2026-09-26
---

# [Feature] Plan Your Trip Guides Completion (5 guides)

## Executive Summary
Đóng §2 **Plan Your Trip** (5/10 nodes hiện có → 10/10): thêm 5 guides theo pattern `[guide]/page.tsx` sẵn có. Hub page dynamic → auto-list. Enrich HTML sitemap (plan group) + XML sitemap (10 guide routes — hiện chưa có route guide nào).

## Context Links
- **Framework §2** Plan Your Trip còn thiếu: Getting to Vietnam, Money & Costs, Travel Etiquette & Local Customs, Accessibility Information (for travelers with disabilities), Sustainable & Responsible Travel Guidelines
- **Pattern**: `src/app/[locale]/plan-your-trip/[guide]/page.tsx` — đọc `guides[slug]` từ messages, notFound nếu thiếu; hub `Object.entries(guides)` ✅ dynamic
- **Guides hiện có**: visa, weather, getting-around, accommodation, health-safety
- **Sitemap**: page plan group hardcode 5 links (cần +5); sitemap.xml **chưa có route guide nào** (cần +10)
- Plans: `260926-0228-support-faq-privacy` (content page pattern), `260926-0300-sitemap-completion...` (honest content)

## Key Insights
- **0 page code mới** — chỉ messages + wiring (hub tự cập nhật qua `Object.entries`)
- **Key slug** `accessible-travel` (KHÔNG dùng `accessibility` — tránh nhầm với website statement page `/accessibility`; node framework = traveler accessibility, nội dung khác hẳn)
- **Honest content** (bài học /trade): KHÔNG số ngân sách/tipping rates; airports = factual (Noi Bai, Tan Son Nhat, Da Nang, Phu Quoc); accessible-travel trung thực "infrastructure varies" — không claim "fully accessible"; money: "costs vary by season/city"
- **Footer plan col giữ nguyên** (4 links → 9 = bloat; discover qua hub + sitemap + XML) — decision cần approve
- sitemap.xml +10 routes (5 guides cũ chưa có + 5 mới) — improvement thật

## Requirements
### Functional
1. **Messages EN/VI** `planTrip.guides` += 5 keys, mỗi key {title, summary, sections[3-4] {heading, body}}:
   - `getting-to-vietnam` — By air / Entry requirements / By land / Once you land
   - `money-costs` — Currency / Payments & ATMs / Budgeting / Tipping & bargaining
   - `etiquette` — Greetings & respect / Dress at religious sites / Photography / Everyday manners
   - `accessible-travel` — Planning ahead / Getting around / Beaches & nature / Getting help (→ contact)
   - `sustainable-travel` — Reduce plastic / Respect nature & heritage / Choose responsibly / Support communities
2. **HTML sitemap** plan group += 5 guides (labels từ guides[slug].title — dynamic, sync)
3. **sitemap.xml** += 10 guide routes (5 cũ + 5 mới)
4. Footer: **không đổi** (approve option)
5. Hub auto-show 10 cards (verify — không edit hub)

### Non-functional
- Build pass; 0 console; 0 dependency; EN/VI parity (cùng slug, cùng sections count); không claim sai

## Related Code Files
### Create
- (không page mới)
### Modify
- `src/messages/en.json`, `src/messages/vi.json` (5 guides)
- `src/app/[locale]/sitemap/page.tsx` (plan group dynamic hơn)
- `src/app/sitemap.ts` (+10 routes)
- `docs/project-changelog.md`, `plan.md`
### Delete
- (none)

## Implementation Steps
1. Messages EN: 5 guides content
2. Messages VI: 5 guides content (parity)
3. HTML sitemap plan group — map 10 guides từ `tp.raw("guides")` (thay hardcode)
4. sitemap.xml +10 guide routes
5. Kill dev → build → restart → Playwright (5×2 guides, hub 10 cards, 404 unknown, sitemap page/XML, parity, regressions, 0 errors)
6. Plan → `completed`; changelog

## Todo List
- [x] Messages EN 5 guides
- [x] Messages VI 5 guides (parity)
- [x] HTML sitemap plan group dynamic 10 guides
- [x] sitemap.xml +10 guide routes
- [x] Build pass + Playwright (5×2, hub 10, 404, sitemap, parity, regressions, 0 errors)
- [x] Plan status + changelog

## Success Criteria
- `/en/plan-your-trip/{getting-to-vietnam,money-costs,etiquette,accessible-travel,sustainable-travel}` = 200, h1 đúng title, ≥3 sections; `/vi` cùng slug, tiếng Việt, cùng số sections
- Hub lists 10 cards (auto); unknown guide vẫn 404
- `/en/accessibility` KHÔNG đổi (không conflict slug)
- HTML sitemap plan group ≥11 links (hub + 10 guides); sitemap.xml chứa 10 guide routes ×2 locale
- Build pass; 0 console errors; 0 dependency

## Risk Assessment
- Content bịa → chỉ factual general (airports/currency names), không số budget/tipping rates; accessible-travel wording "varies", "ask when booking"
- Slug clash `accessibility` → dùng `accessible-travel` (test assert)
- sitemap page hardcode lệch → refactor map từ messages (sync)

## Security Considerations
- Content-only; không input/dependency mới

## Next Steps (out of scope — phase sau)
- Gallery (§2 News), Sustainability tree (Phase 3 — ngoài sustainable guide này là node PT)
- Additional languages (cần chọn ngôn ngữ), draft/preview Sanity, newsletter i18n, homepage #9

## Completion Notes (2026-09-26)
- **Delivered**: 5 guides EN/VI trong `planTrip.guides` (10 total) — `getting-to-vietnam`, `money-costs`, `etiquette`, `accessible-travel`, `sustainable-travel`, mỗi guide 4 sections; **0 page code mới** (hub dynamic auto-list 10 cards ✅); honest content: airports/currency factual, không số budget/tipping rates, accessible-travel "varies"/"ask when booking", slug `accessible-travel` ≠ `/accessibility` (coexist tested)
- **Wiring**: HTML sitemap plan group refactor → dynamic `Object.entries(guides)` (hub + 10 = 11 links, sync tự động, bỏ hardcode footer-labels); sitemap.xml derive guide routes từ `Object.keys(enMessages.planTrip.guides)` (+10 routes — 5 guides cũ trước đây chưa có trong XML)
- **Footer**: giữ nguyên 4 links (per plan, user approved)
- **Verified**: build pass; Playwright **54/54 PASS** (5×2 locales: 200/h1/≥3 sections/body, parity sections EN=VI, hub 10 cards, unknown 404, slug coexist, sitemap page 10+1 links, XML 10×2 routes, regressions, 0 console errors — sau reset buffer error của 404 page)
- **Test bugs ban đầu**: selector `a[href^=".../"]` loại hub link (test count 10→split assert), console error 404 chưa reset buffer (lesson tích lũy)
- **Env note**: `/tmp/opencode/browsertest` bị wipe giữa session → playwright package reinstall (browser cache `~/.cache/ms-playwright` còn, chromium intact)
- **Changelog**: `### Added` entry appended
- **§2 status**: Plan Your Trip ✅ 10/10 — đóng cây

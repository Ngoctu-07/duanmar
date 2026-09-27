---
title: "[Feature] Plan Your Trip + About Us + Language Switcher"
description: "Hoàn thành core pages Phase 1: hub + 5 guide pages (static i18n content), About landing, switcher EN/VI"
status: completed
priority: P1
effort: "3-4h"
tags: [feature, i18n, content]
created: 2025-09-26
---

# [Feature] Plan Your Trip + About Us + Language Switcher

## Executive Summary
Framework Phase 1 còn thiếu Plan Your Trip + About. Nội dung guide tĩnh (i18n EN/VI trong messages — KISS, chưa cần CMS; blog/news mới dùng CMS theo framework). Kèm Language Switcher hoàn thiện i18n UX (key `nav.language` đang unused).

## Context Links
- **Plans**: `250926-0900-explore-destinations-feature` (completed — pattern listing/detail/notFound)
- **Dead links**: header (`/plan-your-trip`, `/about`), quick-access (`visa`, `weather`), footer (4 plan links + 4 about links)
- **Routing**: next-intl Link/redirect, `[locale]/[...rest]` catch-all → localized 404 (đã có)
- **Framework**: sitemap §2 — Plan Your Trip (visa, transport, accommodation, health...), About Us (mission, offices, careers, contact)

## Requirements
### Functional
- [x] `/[locale]/plan-your-trip` — hub: intro + guide cards (5: visa, weather, getting-around, accommodation, health-safety)
- [x] `/[locale]/plan-your-trip/[guide]` — 1 dynamic route render 5 guides; content từ messages (`t.raw`); unknown guide → `notFound()`
- [x] `/[locale]/about` — About landing: mission, org overview, links tới contact/careers/press (subpages → localized 404, chấp nhận được, fuera Phase 1)
- [x] Language Switcher trong Header (EN/VI, giữ path hiện tại — dùng `usePathname`/`useRouter` từ `@/i18n/navigation`)
- [x] Nội dung i18n đầy đủ EN + VI cho toàn bộ trang mới

### Non-functional
- [x] SEO: `generateMetadata` per page (title theo guide)
- [x] Footer labels → i18n (hiện hardcoded English trong `footerLinks`)
- [x] YAGNI: KHÔNG làm 6 things-to-do routes, deals, culture, news (phase sau)

## Architecture
```
[locale]/plan-your-trip/page.tsx           → hub (server, getTranslations)
[locale]/plan-your-trip/[guide]/page.tsx   → guide renderer + generateMetadata + notFound
[locale]/about/page.tsx                    → landing
src/components/layout/locale-switcher.tsx  → client comp, segmented control EN|VI
src/components/layout/header.tsx           → add LocaleSwitcher
src/components/layout/footer.tsx           → labels via t()
messages/en.json, vi.json                  → planTrip.*, about.*, nav.language
```
- Data: static i18n (messages JSON, structured: `guides.{slug} = {title, intro, sections:[{heading, body}]}`) — render bằng `t.raw("planTrip.guides." + guide)`
- GUIDES whitelist = keys của object → unknown key → notFound (không cần schema)

## Implementation Steps
1. Messages EN/VI: `planTrip` (hub + 5 guides content), `about`, footer labels
2. Hub page + guide cards
3. `[guide]` dynamic page + generateMetadata + notFound
4. About landing
5. LocaleSwitcher + Header integration + footer i18n labels
6. Tests (below) → build → restart dev
7. Code review + changelog

## Verification (Playwright)
- [x] `/en/plan-your-trip` hub thấy 5 cards; `/en/plan-your-trip/visa` render content; guide lạ → 404 localized
- [x] `/vi/plan-your-trip/weather` → nội dung tiếng Việt
- [x] `/en/about` render; switcher: click VI tại `/en/plan-your-trip/visa` → `/vi/plan-your-trip/visa`, content VI
- [x] Home + destinations regression (0 console errors)
- [x] `npm run build` pass

## Risks
| Risk | Mitigation |
|------|-----------|
| Messages JSON phình to | Content ngắn gọn, sections có cấu trúc |
| Switcher làm hỏng SSR | Client comp, router.push pathname giữ query |

## Completion Notes (2025-09-26)
- Status: **completed** — build pass, Playwright: hub/guide/404/VI/about/switcher/footer VI/destinations regression all pass, 0 console errors.
- **Bug ngoài plan phát hiện & fix**: Header/Footer chỉ render trong homepage `page.tsx` → mọi trang nội dung không có nav/footer (switcher không xuất hiện). Chuyển `<Header/>` + `<main>` + `<Footer/>` vào `src/app/[locale]/layout.tsx`, bỏ khỏi `[locale]/page.tsx`.
- **Bug namespace**: footer dùng `useTranslations("common")` nhưng key ở `footer.*` → thêm `tf = useTranslations("footer")`; bổ sung keys `footer.destinations`, `footer.aboutUs` (EN/VI).
- **Lesson**: `npm run build` FAIL mơ hồ (`<Html> should not be imported` /404) khi `next dev` đang chạy — luôn kill dev trước, build, rồi restart dev (bracket trick `next [d]ev`).

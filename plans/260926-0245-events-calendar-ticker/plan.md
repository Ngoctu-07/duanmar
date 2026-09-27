---
title: "[Feature] Events & Festivals Calendar + Homepage Ticker"
description: "/explore/events filter theo tháng (server searchParams, 0 client JS), months[] data cho 8 festivals, homepage Events Ticker trước Stories — framework §2 Explore→Festivals & Events Calendar + §3 #7 + §9 Phase 2 events calendar"
status: completed
priority: P1
effort: "5-6h"
tags: [feature, i18n, calendar, homepage]
created: 2026-09-26
---

# [Feature] Events & Festivals Calendar + Homepage Ticker

## Executive Summary
Framework Phase 2 **events calendar** (§9) + §2 `Explore Vietnam → Festivals & Events Calendar` + §3 #7 `Events & Festivals Ticker`. V1: trang `/explore/events` filter festival theo tháng (12 month chips, server-side qua `searchParams` — 0 JS), months[] map cho 8 festivals (kèm disclaimer ngày âm), homepage ticker strip trước StoriesSection.

## Context Links
- **Framework**: §2 line 51 Explore→Festivals & Events Calendar; §3 #7 homepage ticker; §4 line 153 "Festival/events calendar with filter by date/region/type, calendar export (.ics)"; §9 Phase 2 "events calendar"
- **Code**: `festivals` ns (8 items: name/when/location/description EN+VI, không id/slug); festivals page pattern (grid cards + `getTranslations`); homepage server component order (§3 #7 < #8)
- **Route vị trí**: `/explore/events` cạnh `/explore/festivals` (cùng node Explore trong framework tree)
- **Plans**: `260926-0239-blog-stories-section` (homepage section + getLocale pattern), `250926-0125-...-festivals` (original festivals page)

## Key Insights
- **Server filter qua `searchParams`**: month chips là `<Link href="?month=N">` (i18n Link giữ locale) — **0 "use client"**, progressive enhancement, shareable URL, test dễ. Default: tháng hiện tại theo server time.
- **`months: number[]` thêm vào mỗi festivals item EN+VI** (mảng giống hệt nhau — months không phụ thuộc locale). Risk EN/VI drift → test assert cùng card set cho cùng month qua 2 locale.
- **Mapping months trung thực với `when` text** (không bịa): Gregorian rõ → đúng tháng (Tet [1,2], Ooc [7], Hue [6], Mid-Autumn [9,10], Loi Nguoc [10]); **lunar approximate** (Lim 12/1 lunar → [2,3], Hung Kings 10/3 lunar → [4,5]); Hoi An "full moon every month" → [1..12]. Card LUÔN hiển thị `when` gốc + subtitle disclaimer "ngày âm đổi mỗi năm" → không claim sai.
- **Empty state không reachable thực tế** (Hoi An mọi tháng) nhưng giữ guard KISS.
- **Ticker = static server strip** (`flex overflow-x-auto` chips name + when, link → `/explore/events`) — không animation lib (marquee CSS thuần nếu cần → defer), 0 JS.
- **Vị trí homepage**: giữa `ExperienceCategories` và `StoriesSection` (§3 #7 trước #8).
- **Rời scope có lý do** (§4): filter region/type (thiếu structured region per festival — location là free text), ICS export (cần ngày chính xác — months granularity không đủ, bịa ngày = violate rule); note next steps.
- Cross-link: festivals page ↔ calendar; footer explore +events; sitemap.

## Requirements
### Functional
1. **Messages EN/VI**: +`festivals.items[].months` (8×2 file, mảng giống hệt); +`events` ns {title "Events & Festivals Calendar"/"Lịch sự kiện & lễ hội", subtitle (kèm lunar disclaimer), monthNames×12, tickerTitle, empty, viewCalendar}
2. **`/[locale]/explore/events`**: server page, `searchParams.month` (parse 1-12, default server current month),12 month chips (active = styling `aria-current`), filter items `months.includes(month)`, card giữ nguyên shape (name/when/location/description), note lunar + link `/explore/festivals`, empty state, metadata
3. **Homepage `EventsTicker`**: server component strip 8 festivals (name + when) → `/explore/events`, heading `events.tickerTitle`; chèn trước `StoriesSection`
4. **Cross-link**: festivals page thêm link "View by month →" (events.viewCalendar)
5. **Footer**: explore column +events; **Sitemap** +`/explore/events`

### Non-functional
- `npm run build` pass; 0 console/pageerror; 0 dependency; **0 "use client" mới**; tháng EN/VI months array giống hệt (test parity)

## Related Code Files
### Create
- `src/app/[locale]/explore/events/page.tsx`
- `src/components/homepage/events-ticker.tsx`
### Modify
- `src/messages/en.json`, `src/messages/vi.json` (+months ×8, +`events` ns, +`footer.events`)
- `src/app/[locale]/explore/festivals/page.tsx` (cross-link)
- `src/app/[locale]/page.tsx` (+EventsTicker)
- `src/components/layout/footer.tsx` (+events link)
- `src/app/sitemap.ts` (+/explore/events)
- `docs/project-changelog.md`, `plan.md`
### Delete
- (none)

## Implementation Steps
1. Messages: months arrays + `events` ns + footer key (python)
2. Events page (searchParams filter + chips + cards)
3. EventsTicker + homepage insert
4. Festivals cross-link + footer + sitemap
5. Kill dev → build → restart → Playwright (month filter logic, parity EN/VI, ticker order, cross-links, regressions, 0 errors)
6. Plan → `completed`; changelog

## Todo List
- [x] Messages: months ×8 EN/VI + `events` ns + footer key
- [x] `/explore/events` server page (chips, filter, cards, disclaimer, empty)
- [x] `events-ticker` + homepage insert (trước Stories)
- [x] Festivals cross-link + footer + sitemap
- [x] Build pass + Playwright (filter, parity, ticker order, regressions, 0 errors)
- [x] Plan status + changelog

## Success Criteria
- `?month=1` → đúng 2 cards (Tet + Hoi An), `?month=7` → Ooc Pom Bok + Hoi An, Ooc KHÔNG có ở month=1; chip active `aria-current`
- `/vi/explore/events?month=10` → "Tết Trung Thu" + "Lễ hội đèn lồng Hội An" (parity card count với EN)
- Homepage: ticker 8 chips TRƯỚC "Stories & Inspiration", link → `/en/explore/events`
- Festivals page có link → calendar; footer + sitemap 200
- `when` gốc hiển thị trên mọi card + disclaimer lunar; build pass; 0 console errors; 0 dependency; 0 client component mới

## Risk Assessment
- EN/VI months drift → test parity cùng month qua2 locale
- Lunar approximation sai tháng → disclaimer + `when` gốc luôn hiển thị (card là source of truth)
- searchParams month garbage ("abc", "13") → parseInt + range check → default current
- Link `?month` mất query locale → dùng `@/i18n/navigation` Link (đã prefix locale, giữ query ✅ LocaleSwitcher precedent)

## Security Considerations
- Không user input persistence; month parse → int sanitize trước filter; render React escape

## Next Steps (out of scope — phase sau)
- Filter region/type per §4 (cần structured region enum cho festivals), **ICS export** (cần ngày chính xác — xem xét user-entered dates trong CMS)
- "Upcoming" real-time (festivals CMS có publishedAt date thay messages), header/quick-access entry
- Các Phase 2 còn lại: additional languages, trade portal; utility completion (a11y + HTML sitemap); Newsletter i18n fix

## Completion Notes (2026-09-26)
- Status: **completed** — `npm run build` pass (`/explore/events` 1.51kB), Playwright **28/28 pass, 0 console errors**, **0 client component mới, 0 dependency**.
- **Filter đúng**: month=1 → Tet + Hoi An (2, loại Ooc Pom Bok), month=7 → Ooc + Hoi An, month=10 → 3; 12 chips + `aria-current` active; invalid month (`abc`) → default current, 200.
- **Parity EN/VI**: cùng month → cùng card set (Tết Nguyên Đán ↔ Tet), months arrays giống hệt (assert parity khi seed), VI month names + disclaimer.
- **Ticker**: 8 chips TRƯỚC Stories (409 < 738) TRƯỚC Newsletter; festivals page cross-link navigate; footer + sitemap.
- **Lunar honesty**: months = xấp xỉ Gregorian (Lim [2,3], Hung Kings [4,5]) — card luôn hiển thị `when` gốc + `lunarNote` disclaimer; test assert `when` preserved.
- **Test bug đã fix** (app đúng): ticker chip count bắt nhầm view-all link (`a[href*=events]` = 9) → scope `a.w-56`. Lesson: đếm phần tử phải exclude link điều hướng cùng href.
- SearchParams pattern: parse int + range check → `?month` garbage an toàn; i18n Link giữ query/fragment.
- Rời scope đúng plan: region/type filter + ICS export (thiếu structured data / ngày chính xác — Phase 2 của feature này).

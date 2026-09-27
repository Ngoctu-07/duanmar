---
title: "[Feature] About Subpages — Contact + Careers + Press Kit"
description: "3 trang con About theo framework §2 (Regional Offices, Careers, Contact, Press) — fix nốt 3 footer dead links cuối cùng, static i18n extend namespace about"
status: completed
priority: P1
effort: "3-4h"
tags: [feature, i18n, content, about]
created: 2026-09-26
---

# [Feature] About Subpages — Contact + Careers + Press Kit

## Executive Summary
Footer còn đúng 3 link chết (`/about/contact`, `/about/careers`, `/about/press`) — dead links cuối cùng của toàn site (trừ `/explore/map` deliberate). Thêm 3 trang con About theo framework §2, extend namespace `about` có sẵn (DRY), static i18n EN/VI.

## Context Links
- **Plans**: `260926-0136-top-nav-culture-deals-news` (landing + detail pattern, click-through test), `250926-1000-plan-trip-about-language-switcher` (namespace `about` hiện có: title/subtitle/mission/vision/org/values)
- **Framework**: `vietnam-tourism-website-framework.md` §2 — About Us: Regional Tourism Offices/Representatives, Careers, Contact Us; §2 Travel Trade: Media/Press Kit
- **Links**: `src/components/layout/footer.tsx` — 3 hrefs About column (labels đã i18n sẵn: `footer.contact`, `footer.careers`, `footer.pressKit`)

## Key Insights
- Extend namespace `about` với objects con `contact`/`careers`/`press` — không tạo namespace mới, không sửa trang About hiện có
- **Không làm form backend** (KISS/YAGNI): contact/careers dùng `mailto:` channels — form không backend = UX dối trá
- **Không bịa số điện thoại/địa chỉ thật**: channels = email + giờ làm việc; offices = city + regional email; tránh số phone giả có thể trùng số thật
- Press page: boilerplate + fact sheet (con số minh họa có disclaimer) + media contact — không tạo file download giả (dead link)

## Requirements
### Functional
1. `/[locale]/about/contact` — Contact Us: 4 channels (general/media/trade/hotline? → dùng email channels), giờ làm việc, Regional Tourism Offices (Ha Noi, Ho Chi Minh City, Da Nang — city + regional email)
2. `/[locale]/about/careers` — Careers: intro (why join), 3 vị trí mẫu (title, type, location, summary), apply `mailto:hr@`
3. `/[locale]/about/press` — Press & Media: boilerplate (org summary), fact sheet (4-6 facts, disclaimer "illustrative"), media contact `mailto:press@`
4. `generateMetadata` per page; i18n EN + VI toàn bộ (extend `about.contact`, `about.careers`, `about.press`)
5. Email domain theo baseUrl sitemap: `@vietnam-tourism.com`

### Non-functional
- `npm run build` pass; 0 console/pageerror; không thêm dependency, không sửa trang About hiện có

## Related Code Files
### Create
- `src/app/[locale]/about/contact/page.tsx`
- `src/app/[locale]/about/careers/page.tsx`
- `src/app/[locale]/about/press/page.tsx`
### Modify
- `src/messages/en.json`, `src/messages/vi.json` (extend `about` +3 objects)
- `docs/project-changelog.md`, `plan.md` (sau test)
### Delete
- (none)

## Implementation Steps
1. Messages EN/VI: `about.contact` {title, subtitle, channelsTitle, channels[]{label, email, note}, hoursTitle, hours, officesTitle, offices[]{city, email}}, `about.careers` {title, subtitle, intro, openingsTitle, positions[]{title, type, location, summary}, applyLabel}, `about.press` {title, subtitle, boilerplateTitle, boilerplateBody, factsTitle, facts[]{label, value}, factsDisclaimer, mediaContactTitle, mediaNote}
2. 3 pages: server components + `getTranslations("about")` + `t.raw("contact"|"careers"|"press")`; mailto links `<a href={`mailto:${email}`}>`
3. Kill dev → `npm run build` → restart dev → Playwright suite (3 pages EN/VI + 3 footer click-through + regressions)
4. Plan → `completed`; append changelog

## Todo List
- [x] Messages EN/VI extend `about` (+contact, +careers, +press)
- [x] `/about/contact` (channels + hours + 3 offices)
- [x] `/about/careers` (intro + 3 positions + mailto apply)
- [x] `/about/press` (boilerplate + fact sheet + media contact)
- [x] Build pass + Playwright suite + footer click-through ×3 + regression
- [x] Plan status + changelog

## Success Criteria
- Footer click Contact → `/en/about/contact` render channels + offices; `/vi` tiếng Việt
- Footer click Careers → positions render; Footer click Press → boilerplate + facts
- `/en/about` (trang gốc) không đổi hành vi; home regression 0 console errors
- `npm run build` pass; toàn bộ footer links hoạt động (site không còn dead link nào khác ngoài `/explore/map` deliberate)

## Risk Assessment
- Mailto link không test được hành vi client → chỉ assert href mailto + text render
- Fact sheet số liệu bịa → kèm disclaimer "illustrative" (giống deals)
- Build/dev conflict → kill dev trước build (lesson đã ghi)

## Security Considerations
- Chỉ `mailto:` links, không form/input → không injection surface; content tĩnh

## Next Steps (out of scope — phase sau)
- `/explore/map` — cần thêm lat/lng vào destination schema + data entry + Leaflet (no API key)
- Support/FAQ, Privacy Policy, HTML sitemap (framework §2 Utility/Support)
- Business & MICE, Travel Trade, Sustainability sections (labels sẵn trong `common`)

## Completion Notes (2026-09-26)
- Status: **completed** — `npm run build` pass (3 routes mới), Playwright **12/12 blocks pass, 0 console errors**: contact/careers/press EN+VI, footer click-through ×3, mailto href assertion (6+ links), regression `/en/about` + home.
- Site-wide link check: 16/16 routes 200 (explore 307 = redirect có chủ đích); **chỉ còn `/explore/map` 404 deliberate**.
- Ghi chú: heredoc plan bị unquoted → backtick `tel` bị execute (1 dòng, đã fix); lần sau dùng quoted heredoc `'PLANEOF'` cho plan chứa backticks.

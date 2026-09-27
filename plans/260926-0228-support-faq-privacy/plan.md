---
title: "[Feature] Support/FAQ + Privacy Policy & Terms"
description: "/support (8 FAQ native details + FAQPage JSON-LD — structured data đầu tiên), /privacy (privacy + terms trung thực theo codebase thật), footer legal links, sitemap +2 — hoàn tất framework §2 Utility"
status: completed
priority: P1
effort: "5-6h"
tags: [feature, i18n, seo, utility]
created: 2026-09-26
---

# [Feature] Support/FAQ + Privacy Policy & Terms

## Executive Summary
Hoàn tất **Utility tree** của framework §2 (Support/FAQs + Privacy Policy & Terms of Use) và **footer legal links** (§3 wireframe #12). FAQ page mang structured data **FAQPage** đầu tiên của site (§7 SEO). 0 dependency, nội dung EN/VI, trung thực với codebase thật (không bịa số phone/URL/thông tin phí).

## Context Links
- **Framework**: §2 `Support → FAQs`, `Utility → Privacy Policy & Terms of Use`; §3 #12 footer "legal links, accessibility statement"; §7 "structured data schema.org FAQPage"; §8 #218 content-accuracy note (Terms phải hướng dẫn verify visa với nguồn chính thức)
- **Pattern**: about-subpages (`contact/page.tsx`) — server page + `t.raw` object/array + metadata tĩnh
- **Footer hiện tại**: 4 cột grid, không legal row — `footer` namespace EN/VI
- **Codebase facts** (dùng làm nội dung privacy truthfully): no accounts/payments/analytics; cookie locale (next-intl), localStorage `vn-trip-plan:v1`; Sanity CDN (content + images), OpenStreetMap tiles (map), Google Fonts Inter (next/font)
- **Plans**: `250926-1000-...` (about subpages), `260926-0147-...` (footer i18n keys pattern)

## Key Insights
- **FAQ accordion = native `<details>/<summary>`** — 0 dep, hoạt động không JS, print-friendly; chevron rotate qua `group-open:rotate-180` (Tailwind v4 có `open` variant); không thêm component vào `ui/` (KISS — shadcn accordion là Radix, project dùng Base UI → thêm mới sẽ lệch stack)
- **FAQPage JSON-LD** render server-side: `JSON.stringify` + `.replace(/</g, "\\u003c")` chống `</script>` break; `mainEntity` = Question/acceptedAnswer từ messages; test parse bằng `JSON.parse` trong Playwright
- **FAQ array** (không keyed object) — thứ tự ổn định cho cả render + JSON-LD
- **Privacy trung thực**: mô tả hành vi dữ liệu ĐÚNG theo code (trip plan slugs gửi Sanity khi mở planner, cookie locale, không analytics) — tránh legal boilerplate dối; Terms có disclaimer "verify visa/entry với nguồn chính thức" (framework §8 #218)
- **Đúng theo framework nhưng RỜI scope có lý do**: Live Chat/Emergency Hotlines bỏ (chatbot = Phase 3; số hotline = bịa số → vi phạm rule), Accessibility Statement + HTML Sitemap defer (note next steps)
- Footer: thêm **legal row** trong copyright bar (flex justify-between) thay vì cột thứ 5 → không phá grid

## Requirements
### Functional
1. **`/[locale]/support`**: title/subtitle, 8 FAQ (`details/summary` + chevron), CTA card "Still have questions?" → `/about/contact`, **FAQPage JSON-LD** (`@context: schema.org`)
2. **`/[locale]/privacy`**: `policy` 5 sections + `terms` 4 sections (`{heading, paragraphs[], bullets?}`), `lastUpdated` (26 September 2026 / 26 tháng 9, 2026), CTA contact
3. **Messages EN/VI**: +`support` (title/subtitle/faqs×8/contact*), +`privacy` (title/subtitle/lastUpdated/policy/terms), +`footer.support`, +`footer.privacy`
4. **Footer**: legal row `© year ... | Support & FAQs | Privacy & Terms` (Link i18n)
5. **Sitemap**: +`/support`, +`/privacy`
6. `generateMetadata`/`metadata` cho cả2 trang

### Non-functional
- `npm run build` pass; 0 console/pageerror; 0 dependency mới; server components (không "use client"); FAQ answer không bịa số liệu cụ thể (phí/e-visa) — hướng dẫn "kiểm tra nguồn chính thức"

## Related Code Files
### Create
- `src/app/[locale]/support/page.tsx`
- `src/app/[locale]/privacy/page.tsx`
### Modify
- `src/messages/en.json`, `src/messages/vi.json` (+`support`, `privacy`, +`footer.support/privacy`)
- `src/components/layout/footer.tsx` (legal row)
- `src/app/sitemap.ts` (+2 routes)
- `docs/project-changelog.md`, `plan.md` (sau test)
### Delete
- (none)

## Implementation Steps
1. Messages EN/VI (FAQ 8 items + privacy 9 sections + footer keys)
2. Support page (render + JSON-LD)
3. Privacy page
4. Footer legal row + sitemap
5. Kill dev → build → restart → Playwright (FAQ toggle, JSON-LD parse, VI, footer links 200, regressions, 0 errors)
6. Plan → `completed`; changelog

## Todo List
- [x] Messages EN/VI `support` + `privacy` + footer keys
- [x] `/support` page (8 FAQ details + JSON-LD FAQPage + CTA)
- [x] `/privacy` page (5 policy + 4 terms sections)
- [x] Footer legal row + sitemap +2
- [x] Build pass + Playwright (FAQ open, JSON-LD valid, VI, footer/sitemap links, regressions, 0 errors)
- [x] Plan status + changelog

## Success Criteria
- `/en/support`: 8 `<details>` (click → `open` attr), JSON-LD parse được `@type=FAQPage` với 8 Question khớp số FAQ, CTA → `/en/about/contact`
- `/vi/support`, `/vi/privacy`: nội dung tiếng Việt; footer 2 link mới → 200 cả 2 locale; sitemap chứa `/en/support`+`/vi/privacy`
- Nội dung privacy khớp codebase thật (no analytics, cookie locale, localStorage trip plan, Sanity/OSM/Google Fonts)
- Build pass; 0 console errors; không dependency mới

## Risk Assessment
- JSON-LD invalid break SEO → test `JSON.parse` trong Playwright
- `group-open:` variant không hoạt động → fallback CSS `details[open]` selector qua arbitrary variant; verify bằng click test (nội dung visible)
- Nội dung pháp lý → giữ generic + disclaimer không thay thế counsel (1 dòng), tránh claim sai
- Footer grid break → legal row tách dưới border-t, không đổi grid

## Security Considerations
- `dangerouslySetInnerHTML` JSON-LD đã escape `<` → chống script injection; nội dung từ messages (code-owned, không user input); links internal qua i18n Link

## Next Steps (out of scope — phase sau)
- Accessibility Statement + HTML Sitemap (§2 Utility còn lại)
- Emergency hotlines (khi có số chính thức được duyệt), chatbot (Phase 3 §9)
- Draft/preview Sanity, Blog section, planner share-by-URL

## Completion Notes (2026-09-26)
- Status: **completed** — `npm run build` pass (2 routes mới), Playwright **35/35 pass, 0 console errors**.
- **Support `/en|/vi/support`**: 8 FAQ native `<details>` (click → `open` attr + chevron rotate), FAQPage **JSON-LD parse hợp lệ** (8 Question/Answer, VI JSON-LD đúng ngôn ngữ), CTA → `/about/contact`, không bịa phí/số liệu.
- **Privacy `/en|/vi/privacy`**: 5 policy + 4 terms sections EN/VI, `lastUpdated`, nội dung trung thực theo codebase (no analytics, cookie locale, localStorage trip plan, Sanity/OSM/Google Fonts), Terms disclaimer "official government sources".
- **Footer legal row**: Support & Privacy links (EN/VI) + sitemap +`/support`, `/privacy`.
- **Test bugs đã fix** (app đúng): news regression count đổi 4→5 (vì CMS post mới — check `>= 4`).
- Bỏ ngoài scope đúng plan: Live Chat/Emergency Hotlines (Phase 3 / không bịa số), Accessibility Statement + HTML Sitemap (next steps).

## Related: CMS verify hoàn tất cho News CMS feature
- User đã seed post CMS `abc/123` ("Joy"/"Duy", category story, 25/09/2026) → **CMS path verified 13/13**: list 5 items (CMS newest-first), detail EN/VI render từ Sanity, date "25 Sept 2026" (en-GB, nhất quán "28 Aug 2026" của static), category i18n.
- **Bug phát hiện & fix**: slug 2-segment (`abc/123`) không match route `[slug]` → **đổi `news/[slug]` → `news/[...slug]`** (catch-all, `slugParts.join("/")`) — build pass, detail 200.
- Lesson: Sanity slug field chấp nhận `/` → route detail nên là catch-all từ đầu; en-GB `month:short` cho September = "Sept".

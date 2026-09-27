---
title: "[Feature] Embed Sanity Studio tại /studio (next-sanity/studio)"
description: "PREREQ: Upgrade Next 15.3.4 → 16.3.6 (vendored React 19.2 có useEffectEvent — chứng minh bằng unpkg grep + docs chính thức), rồi embed Studio tại route /studio (NextStudio); noindex, không sitemap"
status: pending
priority: P2
effort: "4-6h"
tags: [feature, sanity, admin, upgrade]
created: 2026-09-26
---

# [Feature] Embed Sanity Studio tại `/studio`

## Executive Summary
Nhúng Sanity Studio tại **`/studio`** bằng official pattern `NextStudio`. **Blocker đã chứng minh**: `sanity 5.31.2` (peer react ^19.2.2) dùng `useEffectEvent` nhưng Next 15.3.4 vendored React KHÔNG có API này (unpkg grep: 15.3.4=0, 15.5.26=0, **16.3.6=2 matches**; docs chính thức: *"App Router in Next.js 16 uses React Canary with useEffectEvent"*) → **Phase 0 bắt buộc: upgrade Next 15.3.4 → 16.3.6**. Các nhánh fix khác đã loại bỏ: sanity downgrade (peer ^19.2.2 từ 5.20+), iframe standalone (không có vite project), webpack alias 2 React copies (invalid hook call).

## Context Links
- **Upgrade guide**: nextjs.org/docs/app/building-your-application/upgrading/version-16 (fetched — breaking changes inventory)
- **Evidence**: unpkg.com/next@{15.3.4,15.5.26,16.3.6}/dist/compiled/react/cjs/react.production.js grep useEffectEvent = 0/0/2
- **next-intl 4.14.7**: peer `next ^12..^16` ✅; plugin injects `turbopack.resolveAlias` khi Next≥16/TURBOPACK, CHỈ inject `webpack` khi không phải turbopack → không trigger "webpack config found" fail
- **Read từ**: `node_modules/next-sanity/README.md` § "Studio route with App Router" (pattern chính thức); `sanity.config.ts` (basePath `/studio`, `projectId 9dq46n9n`); `src/middleware.ts` matcher `["/", "/(en|vi)/:path*"]` → `/studio` **không bị middleware đụng** ✅; `src/sanity/env.ts` (NEXT_PUBLIC_* fallback đã sẵn)
- **Hiện trạng**: `/studio` bị `[locale]` bắt thành locale lạ (render app sai) — **route mới resolve** (static segment thắng dynamic ✅); không có vite/standalone studio dir; deps đã đủ: `sanity 5.31.2`, `styled-components`, `@sanity/vision`, `sanity-plugin-internationalized-array`
- **Plans**: pattern content/utility từ `260926-*` features

## Key Insights
- **Upgrade inventory (đã verify read-only)**: async params/searchParams đã dùng Promise pattern ✅ (tsc sẽ confirm); KHÔNG dùng headers()/cookies()/revalidateTag/PPR/parallel routes/AMP/serverRuntimeConfig ✅; Node 24.14 ≥20.9 ✅; react/react-dom 19.3.0 peer ^19 ✅; TS ^5 ✅
- **middleware.ts GIỮ NGUYÊN** (Next16: deprecated→proxy nhưng vẫn chạy; proxy chỉ nodejs runtime, next-intl cần edge → giữ middleware là đúng)
- **`next lint` removed trong 16**: hiện KHÔNG có eslint config file → lint script đổi sang ESLint CLI + tạo `eslint.config.mjs` flat, bump `eslint-config-next` 15.3.4 → ^16.3.6 (eslint 9 đã cài)
- **Turbopack default** cho dev+build: next.config KHÔNG có webpack config của mình ✅; next-intl plugin tự adapt ✅
- **Concurrent output**: `.next/dev` vs `.next` — workflow pkill giữ nguyên; lockfile chặn 2 instance
- Studio bundle nặng → build warning expected (không còn size metric trong output Next 16 — theo docs)
- Official pattern: `src/app/studio/[[...tool]]/page.tsx` — `import { NextStudio } from 'next-sanity/studio'`, re-export `metadata, viewport` từ package, `export const dynamic = 'force-static'`, import config `../../../../sanity.config`
- **noindex**: `metadata.robots = { index: false, follow: false }` + `Disallow: /studio` trong `robots.ts` (admin tool, không quảng bá); **không** thêm vào sitemap.xml
- `.env.local` có 3 `NEXT_PUBLIC_SANITY_*` → Next inline khi build ✅ (env.ts assert pass); không cần đọc/đổi env
- Auth: UI Studio yêu cầu login Sanity account để edit (user đã có — trước đây seed post từ Studio) — viewer anonymous chỉ thấy login screen, an toàn
- Bundle: Studio chunk tách route riêng, không ảnh hưởng app chunks (theo dõi build size log)
- `/studio` hiện render nhầm → sau feature: render Studio; route khác giữ nguyên (test precedence)

## Requirements
### Phase 0 — Upgrade Next 15.3.4 → 16.3.6 (prerequisite)
1. `npm install next@16.3.6` (react/react-dom 19.3.0 đã ≥ peer; bump `eslint-config-next` ^16.3.6)
2. Lint script: `next lint` removed → `eslint .` + tạo `eslint.config.mjs` flat config (eslint 9 + eslint-config-next 16)
3. `npm run build` pass dưới **Turbopack default**; `npx tsc --noEmit` clean (async APIs)
4. Giữ `src/middleware.ts` (deprecated nhưng supported; next-intl edge runtime)
5. Không đổi code app (params đã async) — chỉ package/config khi cần

### Phase 1 — Embed Studio (đã code, build lại với Phase 0)
6. `src/app/studio/[[...tool]]/page.tsx` — NextStudio + metadata noindex + force-static (đã tạo, giữ)
7. `robots.ts` disallow `/studio` (đã tạo, giữ)

### Phase 2 — Verify
8. Build pass (sanity chunks không còn useEffectEvent error)
9. Playwright regression toàn diện (suite mới do /tmp wipe): /studio 200 + precedence, home EN/VI, 6 nav, PT guides sample, news/blog/events/sitemap/trade/mice/a11y/support/privacy, sitemap.xml, robots.txt, localized 404, 0 pageerror
10. Plan → completed + changelog

### Non-functional
- 0 dependency mới ngoài next@16.3.6 + eslint-config-next@16 (cùng family đã cài); không sửa schema/messages/app logic; honest verify — KHÔNG skip test

## Related Code Files
### Create
- `eslint.config.mjs` (flat config — Phase 0)
- `src/app/studio/[[...tool]]/page.tsx` (đã tạo)
### Modify
- `package.json` (next, eslint-config-next, scripts.lint)
- `src/app/robots.ts` (đã tạo disallow)
- `docs/project-changelog.md`, `plan.md`
- có thể: fix nhỏ sau khi build/tsc/codemod báo (scope tối thiểu)
### Delete
- (none)

## Implementation Steps
1. Kill dev → `npm install next@16.3.6 eslint-config-next@^16.3.6`
2. `npx tsc --noEmit` → fix async/type issues nếu có (kỳ vọng 0)
3. Tạo `eslint.config.mjs` + scripts.lint = `eslint .` → `npm run lint` pass
4. `npm run build` (turbopack) → fix tới khi pass (studio route build được, sanity no error)
5. Restart dev → Playwright regression suite mới (routes list ở Phase 2)
6. Plan → completed + changelog (gộp entry: upgrade + studio embed)

## Todo List
- [ ] Upgrade next@16.3.6 + eslint-config-next@16
- [ ] tsc --noEmit clean
- [ ] eslint flat config + lint script + lint pass
- [ ] Build pass (turbopack, studio route, sanity no useEffectEvent error)
- [ ] Restart dev + Playwright regression suite (studio/precedence/all features/0 pageerror)
- [ ] Plan status + changelog

## Success Criteria
- `next -v` = 16.3.6; build pass bằng turbopack (0 error useEffectEvent); `tsc --noEmit` = 0; `npm run lint` = 0
- `/studio` 200 + studio client bundle load, không pageerror; `/en/studio` 404; `/`, `/en`, `/vi` + sample routes 200 (precedence)
- robots.txt có Disallow /studio; sitemap.xml không chứa /studio
- Regression: ≥25 routes across all features 200; 0 console/pageerror mới; 0 dependency lạ

## Risk Assessment
- Turbopack build bất ngờ với loader nào (leaflet dynamic, sanity) → nếu fail chuyển `--webpack` flag (guide cho phép) và ghi nhận, không block
- eslint-config-next 16 flat config khác kỳ vọng → iterate tới lint pass; nếu phức tạp thì core-eslint minimal config (không chặn feature)
- Studio nặng → runtime slow nhưng functional; test chỉ assert bundle load (không chờ full render CDN)
- next-intl runtime edge với middleware Next16 → route locale vẫn OK (test EN/VI bắt)
- npm audit: pre-existing 15 vulns — next16 có thể giảm; KHÔNG audit fix --force

## Security Considerations
- noindex + robots Disallow cho /studio; edit cần login Sanity (server-side RBAC)
- Project id/dataset không nhạy cảm; không thêm token

## Next Steps (out of scope — phase sau)
- Visual Editing / draft mode (`stega: { studioUrl: '/studio' }`), directory/stats CMS collections

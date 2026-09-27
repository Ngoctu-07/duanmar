---
title: "[Bugfix] Web refresh liên tục — Turbopack HMR subscription panic loop"
description: "Dev server ném TurbopackInternalError 'conflicting effects for the same key (71 bytes)' từ t+3.6s sau boot, retry 1 Hz → mỗi lần resubscribe đẩy 1 Fast Refresh → browser refresh ~1 lần/giây. Không phải redirect loop (HTTP sạch)."
status: completed
priority: P1
effort: "1-3h"
tags: [bugfix, turbopack, hmr, next16, dev-server]
created: 2026-09-26
---

# [Bugfix] Web refresh liên tục (infinite refresh)

## Executive Summary
Triệu chứng "trang tự refresh liên tục" **không phải lỗi app/route**. HTTP layer sạch (không vòng 3xx), code không có `location.reload()`/`router.refresh()`. Nguyên nhân: `next dev` (Next 16.3.6 + Turbopack) ném panic `conflicting effects for the same key (key length: 71 bytes)` ngay ~3.6s sau boot → server HMR subscription lỗi và **resubscribe mỗi 1s** → mỗi lần resubscribe gửi update → client chạy `[Fast Refresh] done` → router navigate lại URL cùng giá trị → trang "refresh" ~1 lần/giây.

## Context Links
- **Report/evidence**: `plans/reports/debugger-260926-infinite-refresh-loop.md`
- **Detail phase**: `plans/260926-1820-fix-infinite-refresh-loop/phase-01-turbopack-hmr-loop.md`
- **Server log**: `.next/dev/logs/next-development.log` (1505 lần ở run trước; 1 Hz đều đặn)
- **Logical rules**: `.claude/rules/development-rules.md`, workflow `/ck:scout → /ck:debug → /ck:fix → /ck:test → /ck:code-review`
- **Liên quan**: plan `260926-1601-embed-sanity-studio` (Next 15.3.4 → 16.3.6 bắt buộc do `sanity 5.31.2` cần `useEffectEvent`) → **không được downgrade Next để "fix"**

## Key Insights (đã verify read-only)
- Browser: 22 main-frame navigations / 20s, nhưng **chỉ 1 HTTP document request** → không có full reload server-side; là client-side HMR refresh.
- HTTP matrix: `/`→307`/en`→200, `/vi`→200, `/en/about`→200, không có vòng redirect.
- Grep toàn `src/`: không có `reload(`, `router.refresh(`, `setInterval`, `http-equiv=refresh` (trừ `locale-switcher.tsx` đọc `window.location.search`).
- **Repro không cần client**: sau khi kill mọi Chrome + không request nào, log vẫn bắt đầu lỗi ở `00:00:03.6` và chạy 1 Hz (53 lỗi/57s) → lỗi phía server, tự duy trì.
- Trong 12s loop, **file duy nhất được ghi là `.next/dev/logs/next-development.log`** (12 ghi ↔ 12 lỗi) → không có thay đổi nguồn nào.
- Bất thường môi trường: `node_modules` cài bản **Linux** (`swc-linux-x64-gnu`) trước khi `npm install` trên Windows (đổi 81 gói); `.next` trộn artifact production (16:31) + dev; `.next/turbopack` là **file 0 byte** (không phải thư mục); lần chạy đầu lỗi thiếu `@parcel/watcher-win32-x64`/`swc-win32`; từng có 2 instance dev server (guard báo port 3000/3001).

## Hypotheses (xếp theo khả năng)
| # | Hypothesis | Cách xác nhận |
|---|---|---|
| H1 | `.next` cache hỏng/trộn (prod+dev, sinh khi SWC còn thiếu, 0-byte `.next/turbopack`) | `rm -rf .next` → boot idle 60s không lỗi |
| H2 | Conflict emit thật trong app: `src/app/sitemap.ts` + `src/app/[locale]/sitemap/page.tsx` (pattern giống bug Turbopack #78609), `robots.ts`, `studio/`, `api/draft-mode` | Sau H1 vẫn lỗi → tạm thời gỡ từng file (revert sau) |
| H3 | Bug Turbopack của `next@16.3.6` | Chạy bundler khác (`next dev --webpack`) để cô lập |
| H4 | Graph mismatch sau khi npm install đổi 81 gói giữa chừng | Reinstall sạch (kèm approve install-scripts) |

## Phases
1. **Phase 1 — Cô lập nguyên nhân ( reversible )**: xoá cache `.next` → đo lại lỗi + browser loop. Detail: `phase-01-turbopack-hmr-loop.md`.
2. **Phase 2 — Fix triệt để theo kết quả Phase 1** (nhánh H1/H2/H3/H4 — mỗi bước có rollback).
3. **Phase 3 — Test**: `npm run lint`, `npx tsc --noEmit`, `npm run build`, browser regression (script đo navigation/Fast Refresh), smoke matrix route bằng curl, hook tests `node --test .claude/hooks/__tests__`.
4. **Phase 4 — Review + docs**: `code-reviewer` review, cập nhật `docs/project-changelog.md`.

## Status
| Phase | Status |
|---|---|
| Root cause (scout+debug) | ✅ Done |
| Phase 1 fix (`rm -rf .next` → H1 confirmed) | ✅ Done |
| Phase 3 test T1–T7 | ✅ Done (T7 có 34 fail pre-existing, xem dưới) |
| Phase 4 docs | ✅ `docs/project-changelog.md` |
| Phase 2 (H2/H3/H4) | ⏹️ Không cần — H1 đúng |

### Kết quả test
| # | Test | Result |
|---|---|---|
| T1 | `npm run lint` | ✅ 0 error |
| T2 | `npx tsc --noEmit` | ✅ 0 error |
| T3 | `npm run build` | ✅ exit 0 |
| T4 | idle 65s, 0 client/request | ✅ 0 `conflicting effects`, 0 ERROR |
| T5 | browser 15s | ✅ nav=2, docReq=1, **fastRefresh=0**, 0 error |
| T6 | curl smoke 11 routes | ✅ đúng status, 0 vòng redirect |
| T7 | `node --test ".claude/hooks/__tests__/*.test.cjs"` | ⚠️ 293/347 pass — 34 fail **pre-existing** (project không có `.git` → `git rev-parse` fail; thuộc hook infra, không phải app) |

## Dependencies / Risks
- Xoá `.next` chỉ là cache (đã gitignore) — không mất code; build lại tốn ~1 phút.
- **Không downgrade Next** (sanity 5.31.2 → cần React 19.2/`useEffectEvent` chỉ có ở Next 16).
- `next dev --webpack` là fallback tạm (dev chậm hơn, Next 16 đã deprecated webpack) — chỉ dùng để cô lập, không phải giải pháp cuối.
- Project **chưa có test framework cho app** (không có `test` script, không playwright/vitest) → Phase 3 dùng lint+tsc+build+browser regression; nếu cần e2e thường trực phải cài thêm (cần quyết định riêng).

## Unresolved Questions
1. ~~Phê duyệt `rm -rf .next`~~ — đã phê duyệt, đã thực hiện → H1 đúng.
2. ~~H2/H3/H4~~ — không cần xử lý (H1 đúng).
3. **Còn mở**: 34 hook test fail pre-existing (`ck-config-utils`, `plan-format-kanban`, `session-init`, `skill-dedup`, `subagent-init`, `task-completed-handler`, `team-context-inject`, `teammate-idle-handler`) — môi trường, project không là git repo. Có sửa riêng không?
4. **Còn mở**: có bổ sung e2e test framework (Playwright) cho app không?
5. **Còn mở, không thuộc bug này**: `middleware.ts`→`proxy.ts` deprecation; middleware matcher không phủ path thiếu prefix (`/about`, `/foo` trả 200 với locale lạ); hydration mismatch warning trên `/vi`.

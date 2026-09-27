---
title: "[Bug Fix] Studio: Missing NEXT_PUBLIC_SANITY_DATASET"
description: "Sanity Studio standalone (Vite) không expose NEXT_PUBLIC_* vars — chuyển sang SANITY_STUDIO_* convention"
status: completed
priority: P1
effort: "30m"
tags: [bugfix, sanity, env]
created: 2025-09-25
---

# [Bug Fix] Studio: Missing NEXT_PUBLIC_SANITY_DATASET

**Type**: Bug Fix
**Priority**: High (Studio không mở được — chặn seed data)

## Executive Summary
Sanity Studio tại `localhost:3333` throw `Missing environment variable: NEXT_PUBLIC_SANITY_DATASET`. Nguyên nhân: env file đọc `NEXT_PUBLIC_*` (chỉ hoạt động khi bundle bởi Next.js), nhưng Studio standalone chạy qua Vite chỉ expose vars prefix `SANITY_STUDIO_*`.

## Issue Analysis

### Symptoms
- [x] Uncaught error `Missing environment variable: NEXT_PUBLIC_SANITY_DATASET` tại `src/sanity/env.ts:12`
- [x] Studio HTTP 200 nhưng render lỗi (không dùng được)

### Root Cause
1. `sanity init` (embedded mode) tạo `src/sanity/env.ts` đọc `process.env.NEXT_PUBLIC_SANITY_DATASET` — designed cho Next.js bundle (webpack inlines `NEXT_PUBLIC_*`)
2. We deleted embedded route `src/app/studio/` → Studio chạy standalone qua `npx sanity dev` (Vite bundler)
3. **Theo Sanity docs**: Vite bundle chỉ expose env vars prefix `SANITY_STUDIO_`. `.env.local` được CLI load nhưng `NEXT_PUBLIC_*` KHÔNG được expose → `undefined` → `assertValue` throw

### Evidence
- **Error**: `at assertValue (src/sanity/env.ts:12:11)`
- **Docs**: https://www.sanity.io/docs/studio/environment-variables — "Variables prefixed with `SANITY_STUDIO_` are automatically picked up"
- **Affected**: `src/sanity/env.ts` → imported by `sanity.config.ts`
- **NOT affected**: Frontend (`src/sanity/lib/client.ts` đọc `NEXT_PUBLIC_*` qua Next.js inlining — hoạt động OK, đã test "Connected OK")

## Solution Design

### Approach
Đổi `env.ts` đọc `SANITY_STUDIO_*` (Sanity official convention) với fallback `NEXT_PUBLIC_*` (giữ compat nếu embed lại Next.js). Thêm 2 vars vào `.env.local`/`.env.example`.

### Changes Required
1. **`src/sanity/env.ts`**: đọc `process.env.SANITY_STUDIO_PROJECT_ID || process.env.NEXT_PUBLIC_SANITY_PROJECT_ID` (tương tự DATASET). `apiVersion` giữ nguyên fallback default.
2. **`.env.local`**: thêm `SANITY_STUDIO_PROJECT_ID`, `SANITY_STUDIO_DATASET` (giá trị trùng `NEXT_PUBLIC_*` — 2 bundler conventions riêng, unavoidable duplication)
3. **`.env.example`**: thêm 2 vars mới (documentation)

### Không thay đổi
- `src/sanity/lib/client.ts` (frontend — `NEXT_PUBLIC_*` hoạt động đúng)
- `sanity.config.ts` (đã import từ `env.ts` — fix tại env.ts là đủ)

## Implementation Steps
1. [ ] Sửa `src/sanity/env.ts` — thêm SANITY_STUDIO_* primary + NEXT_PUBLIC_* fallback
2. [ ] Thêm 2 vars vào `.env.local` (copy giá trị từ NEXT_PUBLIC_*)
3. [ ] Cập nhật `.env.example`
4. [ ] Restart `npx sanity dev` (env load lúc startup)
5. [ ] Chạy tests (Verification Plan)

## Verification Plan
### Test Cases
- [ ] Studio `localhost:3333`: load KHÔNG còn uncaught error, render content list
- [ ] Frontend `localhost:3000/en`: vẫn 200 (không regression)
- [ ] `npm run build`: pass (env.ts thuộc studio, không ảnh hưởng Next build — verify)
- [ ] Sanity API query: still connected (client.ts untouched)

### Rollback Plan
Revert `env.ts` + xóa 2 vars added — không có side effect khác.

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| Duplicated values trong .env (2 conventions) | Low | Unavoidable — Next.js & Sanity dùng prefix khác nhau; giá trị là public info (không phải secret) |
| Frontend regression | Low | Không sửa client.ts; test curl 200 sau fix |

## TODO Checklist
- [ ] Implement fix
- [ ] Run tests (Studio + Frontend + Build)
- [ ] Code review

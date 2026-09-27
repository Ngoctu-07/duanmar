---
phase: 1
title: "Cô lập & fix Turbopack HMR panic loop (web refresh liên tục)"
status: completed
priority: P1
---

# Phase 1 — Cô lập nguyên nhân & fix vòng lặp HMR

## Context Links
- Evidence: `plans/reports/debugger-260926-infinite-refresh-loop.md`
- Overview: `plans/260926-1820-fix-infinite-refresh-loop/plan.md`
- Log: `.next/dev/logs/next-development.log`

## Overview
- **Priority**: P1 (dev không dùng được — trang refresh ~1 lần/giây)
- **Status**: Chờ xác nhận trước khi sửa
- **Mô tả**: Server ném `TurbopackInternalError: conflicting effects for the same key (key length: 71 bytes)` ngay sau boot, retry 1 Hz → client Fast Refresh liên tục.

## Key Insights
1. Lỗi **tự khởi phát ở t+3.6s sau boot** — không cần browser, không cần request, không cần đổi file.
2. Không phải redirect loop, không phải app code (`src/` không có reload/refresh/setInterval).
3. Mỗi lần resubscribe = 1 update gửi client = 1 lần trang "refresh".
4. Cache `.next` nhiều dấu hiệu hỏng: trộn prod/dev, file 0 byte `.next/turbopack`, sinh ra trong lúc SWC binary còn thiếu.

## Requirements
- Sau fix: 0 lỗi `conflicting effects` trong 60s idle.
- Browser 15s: `navigationCount ≤ 2` (chỉ lần đầu), `fastRefreshCount = 0`.
- Không đổi hành vi app; không downgrade Next.

## Related Code Files
### Có thể sửa (theo nhánh hypothesis)
- Không sửa `src/` nếu H1 đúng (chỉ xóa cache).
- H2 (nếu cần): `src/app/sitemap.ts`, `src/app/robots.ts` (đổi tên/route conflict) — revert nếu không phải lỗi.
### Không sửa
- `src/middleware.ts` (deprecated nhưng còn chạy; next-intl cần edge) — xử lý riêng, không thuộc bug này.

## Implementation Steps

### Step 1 — Dừng server (an toàn)
```bash
# dừng next dev đang chạy (PID ghi tại .next/dev/lock)
powershell "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object {$_.CommandLine -like '*next*'} | ForEach-Object {Stop-Process -Id $_.ProcessId -Force}"
```

### Step 2 — Xóa cache build (H1 test) — CHỈ cache, không đụng source
```bash
rm -rf .next
```

### Step 3 — Boot sạch, đo server-side (không client, không request)
```bash
node node_modules/next/dist/bin/next dev > dev-verify.log 2>&1 &
sleep 60
grep -c "conflicting effects" .next/dev/logs/next-development.log   # MUST = 0
```
- **Nếu 0** → H1 đúng → chuyển Step 6 (verify browser + test).
- **Nếu > 0** → chuyển Step 4.

### Step 4 — Cô lập bundler (H3)
```bash
taskkill server như Step 1
npx next dev --webpack     # nếu flag không hỗ trợ → thêm tạm turbopack:false/legacy config (rollback sau)
sleep 60 → đo lỗi tương tự
```
- **Webpack sạch, Turbopack lỗi** → bug Turbopack của `next@16.3.6` → Step 5a.
- **Cả hai lỗi** → môi trường/dependency (H4) → Step 5b.

### Step 5a — Nhánh Turbopack-specific (không downgrade Next)
1. Ưu tiên: tìm conflict emit trong app (H2) — tạm di chuyển `src/app/sitemap.ts`, `src/app/robots.ts` ra ngoài (revert từng cái, đo lại) → nếu cái nào gây lỗi: đổi tên route/metadata cho hết conflict.
2. Vẫn lỗi: thử version Next 16.x khác trong cùng major (upgrade patch) — verify `sanity 5.31.2` peer vẫn thỏa.
3. Chỉ giữ `--webpack` làm workaround tạm, ghi rõ trong changelog là việc cần làm tiếp.

### Step 5b — Nhánh môi trường (H4)
```bash
# reinstall sạch, cho phép install-scripts (swc/esbuild/parcel/unrs)
npm install-scripts approve @swc/core esbuild @parcel/watcher unrs-resolver
rm -rf node_modules package-lock.json && npm install
rm -rf .next && boot lại → đo 60s
```

### Step 6 — Test & verify (BẮT BUỘC sau khi sửa)
| # | Test | Lệnh | Pass |
|---|---|---|---|
| T1 | Lint | `npm run lint` | 0 error |
| T2 | Typecheck | `npx tsc --noEmit` | 0 error |
| T3 | Build | `npm run build` | thành công |
| T4 | Server idle | Step 3 | 0 `conflicting effects` / 60s |
| T5 | Browser loop | `node .claude/chrome-devtools/tmp/detect-refresh-loop.js` (DURATION_MS=15000) | nav ≤ 2, fastRefresh = 0 |
| T6 | Route smoke | curl matrix `/`, `/en`, `/vi`, `/vi/explore`, `/en/about`, `/vi/news`, `/vi/trip-planner` | đúng status, không 3xx loop |
| T7 | Hook tests | `node --test .claude/hooks/__tests__` | tất cả pass |

- **Không dùng mock/fake để qua mắt test.** Nếu T4/T5 vẫn fail → quay lại Step 4, không kết thúc phiên.

### Step 7 — Review & docs
- `code-reviewer` review diff (nếu có sửa source).
- Cập nhật `docs/project-changelog.md` (severity + impact).
- Plan → `status: completed`.

## Todo List
- [x] Dừng dev server
- [x] `rm -rf .next` (H1)
- [x] Boot idle 60s, đếm lỗi (T4) → **0 lỗi** → H1 đúng, không cần Step 4/5
- [ ] (bỏ qua) cô lập `--webpack` (H3) — H1 đúng
- [ ] (bỏ qua) reinstall deps (H4) / gỡ conflict route (H2) — H1 đúng
- [x] Chạy T1–T7 (xem bảng kết quả ở `plan.md`)
- [x] Review + changelog

## Actual Outcome
- Root cause = **`.next` cache hỏng/trộn** (H1). Không sửa 1 dòng source nào.
- Sau fix: T4 = 0 lỗi/65s idle, T5 = 0 Fast Refresh, T1/T2/T3/T6 pass.
- T7 còn 34 fail pre-existing ở hook infra (thiếu `.git`) — ngoài phạm vi bug này.

## Success Criteria
- 0 lỗi HMR/`conflicting effects` sau 60s idle và trong lúc browse 15s.
- Trang không còn tự refresh; `fastRefreshCount = 0`.
- T1–T7 pass.

## Risk Assessment
| Risk | Impact | Mitigation |
|---|---|---|
| Xóa `.next` làm mất cache | build lại chậm hơn | chấp nhận (cache đã gitignore) |
| Webpack fallback chậm / deprecated | dev UX | chỉ tạm thời, ghi trong changelog |
| Sai hypothesis → sửa nhầm source | regression | mọi bước di chuyển file đều revert được; T6 bắt buộc |
| Reinstall deps đổi lockfile | khó review | tách commit riêng nếu có thay đổi |

## Security Considerations
- Không đọc/đổi `.env.local`; không commit lockfile bí mật.
- Không hạ cấp dependency xuống bản có CVE đã audit trước đó.

## Next Steps
- Chờ xác nhận → chạy Step 1–7.
- Việc riêng cần quyết định: middleware→proxy deprecation, matcher thiếu prefix locale (`/about`, `/foo` render với locale lạ) — **không thuộc bug này**.

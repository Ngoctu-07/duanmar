# Debugger Report — Web refresh liên tục (2026-09-26)

**Work context**: `D:\tour` · **Reports**: `plans/reports/` · **Plans**: `plans/260926-1820-fix-infinite-refresh-loop/`
**Scope**: read-only investigation. Không sửa file source nào.

## Symptom
Trang web tự refresh liên tục trên `next dev` (Next 16.3.6 + Turbopack).

## Measurements

### 1. Browser (Puppeteer, 20s trên `http://localhost:3000/vi`)
```
navigationCount: 22      (chuỗi framenavigated ~1 lần/giây, cùng URL)
docRequestCount: 1       (chỉ request document đầu tiên)
fastRefreshCount: 17-25  (console "[Fast Refresh] done" ~800-1900ms/lần)
websocket: ws://localhost:3000/_next/hmr?id=... (1 kết nối, không reconnect)
```
→ **Không có full reload server-side**; là HMR/Fast Refresh loop phía client.

### 2. HTTP layer — sạch, không vòng redirect
| Path | Status |
|---|---|
| `/` | 307 → `/en` |
| `/en` | 200 |
| `/vi` | 200 |
| `/vi/explore` | 307 → `/vi/explore/destinations` |
| `/vi/explore/events`, `/vi/news`, `/vi/trip-planner`, `/vi/about`, `/vi/search` | 200 |
| `/en/en`, `/vi/vi` | 404 |

### 3. Source grep — không có cơ chế refresh
`reload(`, `router.refresh(`, `setInterval`, `location.href=`, `http-equiv=refresh` → 0 match ngoài `locale-switcher.tsx:13` (chỉ đọc `window.location.search`).

### 4. Server log — NGUYÊN NHÂN
`.next/dev/logs/next-development.log`:
```
{"level":"ERROR","message":"[Server HMR] Subscription error, resubscribing:
 TurbopackInternalError: conflicting effects for the same key (key length: 71 bytes)"}
```
- Run trước: **1505 lần**, đều 1 Hz (410 lần key=71B, 1095 lần key=76B).
- Run mới (sau khi kill mọi Chrome, **không request, không đổi file**): lỗi khởi phát ở `00:00:03.6`, 53 lỗi sau 57s.
- `FATAL: An unexpected Turbopack error occurred` + panic log `C:\Users\Lenovo\AppData\Local\Temp\next-panic-*.log`.

### 5. Correlation
Trong cửa sổ 12s (12 lỗi), file duy nhất được ghi trong `.next` là `dev/logs/next-development.log` (12 ghi). Không có thay đổi nào ở `src/`, `public/`, root config (watcher 20s = 0 thay đổi).

## Root cause (chuỗi xác nhận)
1. Turbopack panic `conflicting effects for the same key` ngay khi server boot (~3.6s), **tự khởi phát, không cần client/request/file change**.
2. Server HMR subscription lỗi → **resubscribe mỗi 1s** → mỗi lần đẩy 1 update cho client.
3. Client nhận update → `[Fast Refresh] done` → router navigate lại cùng URL → **trang "refresh" ~1 lần/giây** = triệu chứng user thấy.

HTTP/redirect/app code **không** phải nguyên nhân.

## Bất thường môi trường (ứng viên nguyên nhân gốc)
- `node_modules` ban đầu cài cho **Linux** (`@next/swc-linux-x64-gnu`, `@parcel/watcher-linux-x64-glibc`) → chạy trên Windows fail → `npm install` đổi 81 gói, `.next` cache giữ từ graph cũ.
- `.next` trộn artifact production (`prerender-manifest.json`, `BUILD_ID`, 16:31) + dev (`dev/`, 17:42+).
- `.next/turbopack` là **file 0 byte** (không phải thư mục).
- Run đầu tiên từng fail `No prebuild or local build of @parcel/watcher`; SWC binary được download trong lúc server đang chạy.
- Từng có 2 instance dev server cùng thư mục (Next phải báo `Another next dev server is already running`, port 3000/3001).

## Hypotheses cần xác nhận khi sửa
- **H1 (khả năng cao)**: `.next` cache hỏng/trộn → xóa cache là đủ.
- **H2**: conflict emit thật trong app — `src/app/sitemap.ts` + `src/app/[locale]/sitemap/page.tsx` đúng pattern bug Turbopack known (#78609); cùng `robots.ts`, `studio/`, `api/draft-mode`.
- **H3**: bug Turbopack của `next@16.3.6` → cô lập bằng bundler khác.
- **H4**: graph mismatch do npm install giữa chừng → reinstall sạch.

## Secondary findings (không thuộc bug này)
- `middleware.ts` deprecated → Next 16 muốn `proxy.ts`.
- Middleware matcher `["/", "/(en|vi)/:path*"]` không phủ path thiếu prefix → `/about`, `/foo` trả 200 với `locale="about"/"foo"` (route `[locale]/page.tsx` bắt nhầm).
- Chưa có test framework cho app (không `test` script, không playwright/vitest/jest) — `npm run lint` / `tsc --noEmit` / `build` là test hiện có.

## Files created (diagnostic, tạm)
- `.claude/chrome-devtools/tmp/detect-refresh-loop.js` — đo navigation/Fast Refresh loop
- `.claude/chrome-devtools/tmp/watch-fs-changes.js`, `watch-all-fs.js`, `watch-next-dir.js` — FS change correlation
- `.claude/chrome-devtools/tmp/key-length-analysis.js`, `key-bruteforce.js` — dò key 71/76 bytes (không kết luận được)

## Status
**Status:** DONE
**Summary:** Root cause là Turbopack HMR panic loop phía server (1 Hz), không phải lỗi route/app. Plan đã tạo, chờ xác nhận để sửa.
**Concerns/Blockers:** Chưa xác định được H1–H4 (cần thao tác gỡ cache/config → cần phê duyệt).

## Unresolved Questions
1. Phê duyệt `rm -rf .next` (và nếu cần reinstall `node_modules`)?
2. Nếu là H2/H3: vá source hay cấu hình bypass?
3. Có bổ sung e2e test framework cho project không?

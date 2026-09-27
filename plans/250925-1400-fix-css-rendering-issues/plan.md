---
title: "[Bug Fix] CSS/rendering: font sai, hydration error, hero trùng lặp"
description: "3 lỗi render trên homepage: Inter không áp dụng, nested button, button thừa"
status: completed
priority: P1
effort: "45m"
tags: [bugfix, css, react, i18n]
created: 2025-09-25
---

# [Bug Fix] CSS/rendering issues

## Root Causes (đã xác định qua Playwright + code review)

### 1. CSS 404/MIME error (ĐÃ FIXED)
- Nguyên nhân: `npm run build` chạy song song `next dev` → wipe `.next` → dev server trả HTML thay vì CSS/JS
- Fix: restart `next dev` — CSS load 200 ✅

### 2. Font sai (serif thay vì Inter)
- `globals.css:126-128`: `html { @apply font-sans }` → `font-family: var(--font-sans)`
- `layout.tsx:23`: `inter.variable` (`--font-sans`) gắn trên **`<body>`**, không phải `<html>`
- → html đọc var không tồn tại → invalid → fallback Times serif
- **Fix**: chuyển `inter.variable` lên `<html>` (Next.js recommended)

### 3. Hydration error — nested `<button>` ("3 Issues" badge)
- `header.tsx:46`: `<SheetTrigger>` (Base UI render `<button>`) bọc `<Button>` → button trong button
- **Fix**: dùng Base UI `render` prop pattern (đã có mẫu ở `sheet.tsx:65`):
  `<SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>`

### 4. Hero trùng lặp + `<a><button>` invalid
- `hero-section.tsx:56-58`: Button outline label = `searchPlaceholder` ("Where do you want to go?") — thừa, bấm không làm gì
- `hero-section.tsx:53-55`: `<Link><Button>` → `<a>` chứa `<button>` (invalid HTML)
- **Fix**: Xóa button thừa; đổi thành `<Button render={<Link href="/explore" />}>`

## Files
- `src/app/layout.tsx` — move `inter.variable` to `<html>`
- `src/components/layout/header.tsx` — SheetTrigger render prop
- `src/components/homepage/hero-section.tsx` — remove stray button, Link render

## Verification
- [ ] Playwright: 0 console/pageerror, biến mất "3 Issues" badge
- [ ] Screenshot: font sans-serif (Inter)
- [ ] `npm run build` pass

---
title: "[Bug Fix] next/image: cdn.sanity.io not configured"
description: "Thêm images.remotePatterns cho Sanity CDN vào next.config.ts"
status: completed
priority: P1
effort: "10m"
tags: [bugfix, nextjs, images, sanity]
created: 2025-09-25
---

# [Bug Fix] next/image: cdn.sanity.io not configured

## Root Cause
- `next.config.ts` → `images: { formats }` — thiếu `remotePatterns`
- `hero-section.tsx:25` + `featured-destinations.tsx:36` dùng `next/image` với `asset.url` = `https://cdn.sanity.io/images/...`
- Next.js chặn hostname chưa allowlist → throw `Invalid src prop`

## Fix
1 file: `next.config.ts`
```ts
images: {
  formats: ["image/avif", "image/webp"],
  remotePatterns: [
    { protocol: "https", hostname: "cdn.sanity.io" },
  ],
},
```
- Chỉ allow đúng `https://cdn.sanity.io` (không wildcard — security)

## Verification
- [ ] Playwright `/en`: 0 console/pageerror, không còn lỗi Invalid src
- [ ] Ảnh hero/destination request trả 200 (nếu có data)
- [ ] `npm run build` pass → restart `next dev` (tránh wipe `.next`)

---
title: "[Feature] Explore Destinations — listing + detail + localized 404"
description: "Trang /explore/destinations (filter region) + /explore/destinations/[slug] + 404 localized — framework Phase 1 core pages"
status: completed
priority: P1
effort: "2-3h"
tags: [feature, sanity, i18n, seo]
created: 2025-09-26
---

# [Feature] Explore Destinations

## Executive Summary
Destinations là core page Phase 1 theo framework. Featured cards + quick access + footer đã link `/explore/destinations/[slug]` nhưng route chưa tồn tại (404). Data model + query fragment sẵn có; dataset có 2 docs.

## Context Links
- **Plans**: `plans/250925-1000-vietnam-tourism-foundation` (Home), bugfix plans đã completed
- **Data**: `src/sanity/schemaTypes/destination.ts` (name, slug, region north/central/south, description, image, featured), `src/sanity/queries/homepage.ts` (imageFragment)
- **Routing**: next-intl (`src/i18n/navigation.ts` Link, middleware matcher `/(en|vi)/:path*`)
- **Reference**: `src/app/[locale]/page.tsx` (fetch pattern: client.fetch + perspective published + staga false), `src/components/homepage/featured-destinations.tsx` (card UI)

## Requirements
### Functional
- [ ] `/[locale]/explore/destinations`: listing tất cả destinations, filter theo region qua `?region=north|central|south` (filter chips là Link, không cần client state)
- [ ] `/[locale]/explore/destinations/[slug]`: detail — image, name, region, description; `notFound()` nếu slug không tồn tại
- [ ] `/[locale]/explore`: redirect → `/explore/destinations` (header link)
- [ ] Localized 404 (`[locale]/not-found.tsx`) cho dead links còn lại (`/deals`, `/plan-your-trip/*`...)
- [ ] i18n messages EN + VI cho toàn bộ UI mới

### Non-functional
- [ ] SEO: `generateMetadata` (title/description theo destination) + `generateStaticParams` (slugs từ Sanity)
- [ ] Images: dùng `next/image` + imageFragment (đã allowlist cdn.sanity.io)
- [ ] Empty state: 0 kết quả filter → message thân thiện

## Architecture
```
[locale]/explore/page.tsx                 → redirect('/explore/destinations')
[locale]/explore/destinations/page.tsx     → server comp, searchParams.region, DESTINATIONS_QUERY
[locale]/explore/destinations/[slug]/page.tsx → server comp, DESTINATION_BY_SLUG_QUERY, generateMetadata/StaticParams
[locale]/not-found.tsx                     → localized 404
messages/en.json, vi.json                  → keys: destinations.*, notFound.*
```
- Query mới: `DESTINATIONS_QUERY` (all + region filter param), `DESTINATION_BY_SLUG_QUERY` (slug.current == $slug) — thêm vào `src/sanity/queries/homepage.ts` hoặc file mới `destinations.ts` (tách file, kebab-case)
- UI tái dùng pattern card từ `featured-destinations.tsx` (extract nhẹ hoặc duplicate nhỏ — ưu tiên extract `destination-card.tsx` nếu reuse)

## Implementation Steps
1. Tạo queries `src/sanity/queries/destinations.ts`
2. Add messages EN/VI
3. Route listing + filter chips + empty state
4. Route detail + generateMetadata + generateStaticParams + notFound
5. `/explore` redirect + localized not-found
6. Tests (below)
7. Code review + docs update (changelog, roadmap nếu có)

## Verification (tests)
- [ ] Playwright `/en/explore/destinations`: thấy "HCM" + "asdasdsa"; click filter `?region=north` → empty state; `?region=central`... match data
- [ ] Detail: `/en/explore/destinations/hcm-...` (slug thật từ API) render name + image 200; slug sai → 404 localized
- [ ] `/vi/explore/destinations`: text tiếng Việt
- [ ] `/en/deals` → localized 404 (không default Next 404)
- [ ] `npm run build` pass → restart next dev

## Risks
| Risk | Mitigation |
|------|-----------|
| Slug có dấu/khó (name "HCM " trailing space) | normalize slug khi test; dùng slug.current thật |
| Route depth gây conflict middleware | matcher đã cover `/(en\|vi)/:path*` |

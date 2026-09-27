---
title: "[Feature] Interactive Destinations Map"
description: "Trang /explore/map với Leaflet + OpenStreetMap, schema destination thêm lat/lng, marker theo tọa độ + fallback list — fix dead link cuối cùng của site"
status: completed
priority: P1
effort: "3-4h"
tags: [feature, map, leaflet, sanity, explore]
created: 2026-09-26
---

# [Feature] Interactive Destinations Map

## Executive Summary
Link cuối cùng còn404: quick-access "Interactive Map" → `/explore/map`. Thêm trang map dùng Leaflet + OpenStreetMap (no API key), schema `destination` thêm `lat`/`lng`, marker cho destinations có tọa độ + fallback list khi chưa có — theo framework §2 (Interactive Map) và §4 (interactive destination map).

## Context Links
- **Plans**: `260926-0125-explore-things-itineraries-festivals` (explore routes pattern), foundation (Sanity schema/queries)
- **Framework**: `vietnam-tourism-website-framework.md` §2 Destinations → Interactive Map; §4 Visitor-Facing "Interactive destination map with filters"
- **Link duy nhất**: `src/components/homepage/quick-access-icons.tsx:12` → `/explore/map`
- **Data**: 2 destinations (`hcm-city`, `dsadsad`) CHƯA có tọa độ → bắt buộc có fallback (YAGNI: không map filter/cluster vòng này)
- **Verified**: OSM tile `tile.openstreetmap.org` 200; npm registry 200; leaflet chưa cài

## Key Insights
- Leaflet truy cập `window` → KHÔNG import top-level trong client component; dùng `useEffect` + `await import("leaflet")` để tránh SSR crash; CSS import `leaflet/dist/leaflet.css` bình thường
- Props qua server→client phải serializable: chỉ truyền array `{name, slug, lat, lng}` (không fetch trong client)
- Popup Leaflet là HTML string → link dùng `<a href="/{locale}/...">` thuần (không component Link)
- Deps: `leaflet` + `@types/leaflet` (KHÔNG react-leaflet — tránh ràng buộc React version, KISS)
- Schema change additive (field optional) → không breaking existing docs

## Requirements
### Functional
1. `destination.ts`: +`lat` (number, -90..90), +`lng` (number, -180..180) — optional, description hướng dẫn
2. `DESTINATIONS_QUERY` (+`:  "lat": lat, "lng": lng`)
3. `/[locale]/explore/map`: server page fetch destinations → `<DestinationsMap>` + section list toàn bộ destinations (fallback + SEO content)
4. `src/components/explore/destinations-map.tsx` ("use client"): init Leaflet (center VN ~[16.0, 106.0], zoom 6), OSM tiles + attribution, marker + popup (name → link detail) cho destinations có tọa độ; note khi 0 markers
5. Messages EN/VI namespace `map`: title, subtitle, markersNote (empty state), listTitle
6. `generateMetadata`

### Non-functional
- `npm run build` pass; 0 console/pageerror; SSR không crash (dynamic import leaflet); không thêm dependency ngoài leaflet

## Related Code Files
### Create
- `src/app/[locale]/explore/map/page.tsx`
- `src/components/explore/destinations-map.tsx`
### Modify
- `src/sanity/schemaTypes/destination.ts` (+lat, +lng)
- `src/sanity/queries/destinations.ts` (fields)
- `src/messages/en.json`, `src/messages/vi.json` (+`map`)
- `docs/project-changelog.md`, `plan.md` (sau test)
### Delete
- (none)

## Implementation Steps
1. `npm install leaflet` + `npm install -D @types/leaflet`
2. Schema + query: lat/lng optional
3. Messages EN/VI `map`
4. Client component `destinations-map.tsx` (dynamic import leaflet, markers, popup link, resize handler cleanup, `map.remove()` on unmount)
5. Server page: fetch + map component + fallback list + metadata
6. Kill dev → `npm run build` → restart dev → Playwright (map render, container, tiles, fallback list, quick-access click-through, regression, 0 console errors)
7. Plan → `completed`; changelog; ghi chú hướng dẫn user thêm tọa độ trong Studio (optional)

## Todo List
- [x] Cài leaflet + @types/leaflet
- [x] Schema `destination` +lat/+lng; query fields
- [x] Messages EN/VI `map`
- [x] Client `destinations-map.tsx` (SSR-safe dynamic import)
- [x] Page `/explore/map` (map + fallback list + metadata)
- [x] Build pass + Playwright suite + quick-access click-through
- [x] Plan status + changelog

## Success Criteria
- Quick-access "Interactive Map" click → `/en/explore/map` 200, bản đồ render (`.leaflet-container`, tile load)
- Fallback list hiển thị 2 destinations hiện có (kể cả khi chưa có tọa độ); note empty-state markers
- `/vi/explore/map` tiếng Việt; marker popup link → detail page (test nếu có tọa độ — nếu chưa, skip marker assertion)
- Home + destinations regression 0 console errors; `npm run build` pass; SSR không crash
- **Site: toàn bộ links resolve (0 dead link)**

## Risk Assessment
- Leaflet + SSR → dynamic import trong useEffect (đã lên kế hoạch); unmount `map.remove()` tránh leak
- Chưa có tọa độ → test chỉ assert container + fallback list; marker test tự skip (không fake coords trong CMS)
- OSM tile load chậm → test chờ `networkidle` + timeout; nếu flaky chỉ assert container/style
- Build/dev conflict → kill dev trước build (lesson đã ghi)

## Security Considerations
- Tile/third-party: OSM public tiles (attribution bắt buộc, tuân thủ usage policy — không heavy caching)
- Không user input; coords từ CMS (server đã validate range qua schema)

## Next Steps (out of scope — phase sau)
- Map filters (region/activity/season theo framework §4) + marker clustering khi destinations đông
- User thêm lat/lng cho destinations hiện có trong Studio (optional, không code)
- Support/FAQ, Privacy Policy, News CMS engine (framework Phase 2)

## Completion Notes (2026-09-26)
- Status: **completed** — `npm run build` pass (`/[locale]/explore/map` route), Playwright **pass toàn bộ** (map EN: container + `.leaflet-container` init + tiles loaded + zoom control + empty-state note + fallback list 2 items; map VI; quick-access click-through; regressions home/destinations) — **0 console errors**, StrictMode double-init không lỗi (disposed flag + `map.remove()`).
- Site-wide check: **15/15 routes resolve (0 dead link)** — `/explore/map`200.
- Fix 1 type error khi build: implicit any từ `(destinations ?? []).map` → annotate `DestinationRow`.
- **User action (optional, không code)**: vào Studio → Destination → thêm Latitude/Longitude (vd HCM: 10.8231 / 106.6297) → marker hiện trên bản đồ. Hiện tại0 destinations có tọa độ → empty-state note + fallback list hoạt động đúng thiết kế.
- Deps mới: `leaflet@1.9.4` + `@types/leaflet@1.9.22`. (15 npm vulns là pre-existing, không đụng `audit fix --force`.)

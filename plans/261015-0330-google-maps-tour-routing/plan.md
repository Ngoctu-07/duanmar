# Google Maps Tour Routing — Plan

## Status: in_progress

## Context
- Current: Leaflet + OSM in `src/components/explore/destinations-map.tsx` (61 lines), fed by `src/app/[locale]/explore/map/page.tsx` via `DESTINATIONS_QUERY`.
- Tour = Sanity `destination` doc (`name/slug/galleryImages[0]=thumbnail/lat+lng floats`). No `geopoint`, no `tours/[slug]` route — detail is `/{locale}/explore/destinations/{slug}`.
- No Google key in `.env.example` / `.env.local`. Repo dry-run pattern: keyless fallback, no crash.

## Phases
- [ ] Phase 01 — CMS GeoPoint + queries (`phase-01-cms-geopoint-queries.md`)
- [ ] Phase 02 — Google Maps component (`phase-02-google-maps-component.md`)
- [ ] Phase 03 — verify (`phase-03-verification.md`)

## Key decisions
- Lib: `@vis.gl/react-google-maps` (official Google-recommended React binding). Alt `@react-google-maps/api` rejected (older, larger imperative surface).
- Env: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (+ optional `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` for AdvancedMarker). Missing key → graceful fallback list, same as Gemini/Resend dry-run.
- Markers: `AdvancedMarker` with custom pin div (no mapId required for basic render). Click → `InfoWindow` with thumbnail + View Tour CTA → `/{locale}/explore/destinations/{slug}` (actual route; `/tours/[slug]` does not exist — documented deviation).
- Theme: `next-themes` `resolvedTheme` → Map `colorScheme="DARK"|"LIGHT"`, container `h-[420px] w-full rounded-xl border` preserved.
- Schema: add `location: geopoint`, keep `lat/lng` deprecated fallback. Queries project `location + galleryImages[0]` thumbnail. Frontend prefers `location` then `lat/lng`.
- Deps: remove `leaflet` + `@types/leaflet` after replacement.

## Success criteria
- `npm run lint`, `tsc --noEmit`, `node tests/run-unit.mjs` pass.
- `/en/explore/map` 200 with key and without key (fallback).
- Markers for HCM/Hanoi/DaNang render at exact coords; click opens InfoWindow with thumbnail + CTA navigating to detail page.

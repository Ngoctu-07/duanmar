# Phase 02 — Full-Card Clickable Area (shared DestinationCard)

**Status**: Complete · **Depends on**: Phase 1 · **Priority**: High

## `src/components/explore/destination-card.tsx`
1. Root `Card` `:45` → `className="group relative overflow-hidden cursor-pointer transition-shadow hover:shadow-lg"` (elevation upgrade from `hover:shadow-md`).
2. Add **overlay anchor** as first child inside Card:
   ```tsx
   <Link
     href={`/explore/destinations/${destination.slug.current}`}
     aria-label={destination.name}
     className="absolute inset-0 z-10 cursor-pointer"
   />
   ```
   - Stretched hit area covers image + padding + whitespace + text (whole rectangle).
   - `aria-label={name}` gives SR a meaningful link name (P14 keeps working: anchor is INSIDE `[data-slot="card"]`, exactly **1 destination anchor per card** — same count as today).
3. Demote existing CTA `Link` `:73-78` → `<span>` with identical styling (+ `pointer-events-none` is unnecessary — overlay `z-10` intercepts; keep hover classes harmless). Visual button preserved, no longer independently interactive.

## Consumers (all auto-covered — shared component)
- `homepage/featured-destinations.tsx` (grid), `tours/tour-category-section.tsx`, `explore/destinations/page.tsx`.

## Verify
- Click card image/body (NOT the button) on `/vi`, `/tours/domestic`, `/explore/destinations` → navigates to detail; `cursor-pointer` computed; `p-tours` P14/P19/P10/P11 + `t-country-locale` green.

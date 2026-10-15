# Prune Map + Header Nav Reorder + FAB Footer Inversion — Plan

## Status: in_progress

## Context
- Header `navItems` (header.tsx:15-21): home, domestic, international, deals, blog. No How-to-Book entry.
- How-to-Book = `/support#how-to-book` anchored 5-step section (support/page.tsx:70-73), no modal/route. Triggers: homepage QuickAccess card + footer link.
- Map = Google component (destinations-map.tsx) + route `explore/map`, 2 live links (quick-access card, HTML sitemap). XML sitemap omits it.
- FAB = AssistantWidget ghost SVG `text-primary` (#7f1d1d) fixed bottom-right 58px. Footer `bg-primary` no id/testid. Zero IO/blend/clip in src.

## Changes
1. **Prune map**: delete `destinations-map.tsx` + `explore/map/page.tsx`, remove quick-access map card + sitemap link, uninstall `@vis.gl/react-google-maps`, drop Google keys from `.env.example`. Keep CMS `location` field + queries (harmless, useful).
2. **Nav order** (desktop + mobile sheet via shared array): home `/`, domestic `/tours/domestic`, international `/tours/international`, blog `/blog`, howToBook `/support#how-to-book` (new `common.howToBook`: en "How to Book", vi "Hướng dẫn đặt tour"), deals `/deals`. `isActive` strips hash so guide stays active on `/support`. Route (not modal) satisfies "modal/route" — reuses existing 5-step section + HowTo JSON-LD, no new page.
3. **FAB inversion**: new `use-fab-footer-inversion.ts` hook (IO + rAF scroll/resize, overlap 0..1 from exact rect intersection). Footer gets `id="site-footer"` + testid. Widget renders dual-layer ghost: solid-red layer clipped `inset(0 0 overlap%)`, white-outline layer (`fill-none stroke-white`) clipped `inset((1-overlap)% 0 0 0)`. Testids `ghost-solid`/`ghost-outline`, `data-overlap` attr.
4. **Tests**: update `l-navbar.mjs` L1/L3/L4 to 6 links + new hrefs/labels (how-to-book h1 = support title).

## Success
- tsc clean, eslint 0 errors, unit 36/36 pass.
- `/en`, `/vi`, `/en/explore/map` → 404 (pruned), `/en/support#how-to-book` section present, header order verified, FAB testids present.

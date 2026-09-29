# Header Icon Tooltips · Full-Card Clickable · Upscale Primary CTAs

**Date**: 2026-09-29 · **Type**: Feature (3-part UX) · **Status**: Complete · **Progress**: 100%

## Requirements
1. **Header tooltips**: hover labels on the 2 desktop utility icons (next to LocaleSwitcher): Search → `common.search` ("Search"/"Tìm kiếm"), Suitcase → `myTrips.navLabel` ("My trips"/"Chuyến đi của tôi"). Accessible, no click needed.
2. **Full-card click**: whole tour-card rectangle (image + padding + text) navigates to detail on click; `cursor-pointer` + subtle hover elevation. Applies to ALL listing grids.
3. **CTA scale ~150%**: "Explore Now" + "Contact" buttons — padding `px-8 py-4`, font `text-lg`, balanced layout.

## Research (file:line)
- `src/components/layout/header.tsx:1` **"use client"**; icons at `:63-84`: ghost icon Buttons (`hidden md:inline-flex`) → `/search` (aria-label `t("search")` `:69`), `/my-trips` (aria-label `mt("navLabel")` `:79`), LocaleSwitcher `:84`. Mobile Sheet `:97-110` already shows text labels (no tooltip needed). `t`=common `:21`, `mt`=myTrips `:22` — **both label keys exist** (en85/939, vi85/939) → **zero new i18n keys**.
- **No tooltip lib / no radix in package.json**; no `ui/tooltip.tsx` → requirement allows "lightweight CSS hover tooltip" → group-hover/focus-within span, `aria-hidden` (icon keeps `aria-label` for SR), no new dependency (KISS/YAGNI).
- `src/components/explore/destination-card.tsx` = THE shared card (82 L): root `Card` `:45`, CTA `Link` `:73-78` (`px-4 py-2 text-sm` border style). Consumers = all listing grids: `featured-destinations.tsx:32` (Explore Now), `tour-category-section.tsx:53` (View Details), `explore/destinations/page.tsx:85` (View Details). **Badges are non-interactive** (no button/onClick/href in `tour-rating-badge.tsx`/`tour-attribute-badges.tsx`).
- **Test contract (critical)**: `p-tours-category.mjs` — slugs from `a[href*="destinations/"]` deduped via Set (`:64`), **P14 `link.closest('[data-slot="card"]')`** (`:328`) requires the anchor INSIDE the card → **outer Link wrapper REJECTED** (would break P14). Chosen: **full-card overlay anchor INSIDE card** + demote CTA to styled `<span>` → stays exactly **1 destination anchor per card** (matches today's count), `closest()` works, no nested/double anchors.
- CTAs: hero `hero-section.tsx:60-62` `<Button size="lg">{t("exploreNow")}</Button>`; about `about-us-section.tsx:41-47` `<Button className="mt-6">{t("aboutSection.cta")}</Button>`; card CTA `destination-card.tsx:73-78`. No other Explore Now/Contact CTA instances (grep).
- Tests touching targets: `f-ui:51-54` (My Trips entry — href-based ✓), `g-header` (icons ✓), `j-about-contact` J2 + `n-lightbox` (CTA href presence — classes only change ✓), `p-tours` (structure — overlay keeps contract ✓), `d8-a11y` (aria-labels preserved; tooltip spans aria-hidden), `l-navbar` (nav only).

## Decisions (via questions)
- **D1 sequencing**: finish in-flight `260929-2151` (P3 blog feed + tests) first, then this feature, then ONE combined gate cycle + docs for everything. *Alt*: this feature first.
- **D2 tooltip**: reusable `src/components/ui/hover-tooltip.tsx` (pure CSS, server-safe) wrapping each icon Button: `relative group` + absolute `top-full` pill (`bg-foreground text-background`, `opacity-0 group-hover/group-focus-within:opacity-100`, `aria-hidden`).
- **D3 card**: overlay `<Link className="absolute inset-0 z-10 cursor-pointer" aria-label={destination.name}>` (stretched hit area) + CTA becomes `<span>` (visual button kept) + root `cursor-pointer transition-shadow hover:shadow-lg` (replaces `hover:shadow-md`).
- **D4 card CTA scale** (question): ~1.5× current `px-4 py-2 text-sm` → `px-6 py-3 text-base`; standalone CTAs get the specified `px-8 py-4 text-lg`.

## Phases
1. [phase-01](phase-01-header-tooltips.md) — hover-tooltip component + wrap 2 desktop icons.
2. [phase-02](phase-02-full-card-clickable.md) — destination-card overlay link + CTA span + elevation.
3. [phase-03](phase-03-cta-scale.md) — hero + about + card action button sizing.
4. [phase-04](phase-04-tests-gates-docs.md) — new `a-ux-microinteractions.mjs`, regressions f/g/j/n/p/l/d8, full gates, docs.

## Gates
lint 0 · unit 18/18 (or 19/19 if 2151 unit lands first) · build 0 · schema validate 0 · suite 21/22 (or 22/23 combined; sole fail = revalidate env).

## Risks / Success
- Button className vs size class merge → verify `ui/button.tsx` uses tailwind-merge; override via explicit classes.
- Overlay covers badge hover states — badges non-interactive → none to lose.
- Success: hover shows localized tooltip (desktop), card-body click navigates, CTAs visibly ~1.5× with no layout breakage at 1280/375, all gates green.

# Phase 2 — Auto-Playing Hero Carousel + −20% Container Sizing

**Context**: plan [plan.md](plan.md) · Inputs: Phase 1 types/queries
**Priority**: High · **Status**: Complete (100%) · **Depends on**: Phase 1

## Overview
New hand-rolled client carousel replaces static hero in `explore/destinations/[slug]`; hero footprint → 80% (`aspect-[20/9]`) + shell padding trim so CTA/pricing clear the fold.

## Key Insights
- Detail page is RSC → carousel must be a `"use client"` island.
- Seamless infinite loop needs **clone-first-slide**: track = `[s0,s1,s2,s0′]`; tick advances index; when landing on clone, swap to index 0 with transition disabled (one silent frame), then re-enable.
- c-booking `:79-82`: dots **must not** use `aria-pressed` → `aria-current`.
- Wrapper classes to preserve: hero `mt-6` (≠ `mt-8`), content wrapper `mt-8` (p-tours `:297` selector).

## Requirements
- AC1: carousel autoplay interval **3000ms**, infinite loop, smooth horizontal slide (`transform: translateX` + `duration ~600-700ms`, `cubic-bezier(0.4,0,0.2,1)` ease), pause on hover/focus, no autoplay under `prefers-reduced-motion: reduce`.
- AC2: hero container = `aspect-[20/9]` (exactly 80% of `aspect-video` height) + detail shell `py-16` → `py-8`; first slide `priority` LCP image, `sizes` kept.
- AC3: data = `galleryImages` (alt fallback `name`); if gallery empty → legacy `image` single static (page never breaks); if exactly 1 → static Image, no interval.
- AC4: 1 new i18n key in **both** `src/messages/en.json` + `src/messages/vi.json` (dot/slide aria label, ICU `{current}/{total}`).

## Related Code Files
- Create: `src/components/explore/destination-hero-carousel.tsx` ("use client", `data-testid="destination-hero-carousel"`)
- Modify: `src/app/[locale]/explore/destinations/[slug]/page.tsx` (71-81 hero swap, 62 `py-8`, slide list resolution)
- Modify: `src/messages/en.json` + `src/messages/vi.json` (namespace `destinations`)

## Implementation Steps
1. Carousel component props: `slides: {src, alt}[]` (≥1). Renders wrapper `relative aspect-[20/9] rounded-xl overflow-hidden bg-muted`; track `flex h-full transition-transform ease-[cubic-bezier(0.4,0,0.2,1)] duration-700` with each slide `relative h-full w-full shrink-0` + `<Image fill sizes="(max-width: 1024px) 100vw, 960px" object-cover>`; slide 0 gets `priority`.
2. State: `index`, `paused` (hover/focus), `reduced` (matchMedia, listener). `useEffect` interval 3000ms active only if `slides.length > 1 && !paused && !reduced`.
3. Wrap logic: render `slides + [slides[0]]`; on tick `setIndex(i+1)`; `onTransitionEnd` when `index === slides.length` → disable transition (`duration-0` via state) → `setIndex(0)` → re-enable next frame (`requestAnimationFrame`).
4. Dots (only if `slides.length > 1`): buttons `aria-current={i===active}`, `aria-label` from new i18n key, click → setIndex(i) + reset timer; **no `aria-pressed`**.
5. Detail page: `const gallery = pickGalleryImages(destination)` (Phase 1 helper: gallery list, fallback `[image]`), replace lines 71-81 with `<DestinationHeroCarousel slides={gallery} />`; keep `mt-6`; shell `py-16`→`py-8`.
6. i18n key added identically to en/vi (parity test).

## Todo List
- [ ] carousel component (autoplay + clone wrap + dots + a11y)
- [ ] page integration + gallery/fallback resolution
- [ ] sizing: `aspect-[20/9]` + `py-8`
- [ ] i18n key (en + vi)

## Success Criteria
Lint 0 · unit 18/18 (no new unit needed; parity passes) · manual smoke: hero = 562px high @1248w (80%), CTA + h1 + PriceBlock top < 900 @1280×900, slides advance ~3s, wrap seamless (screenshot `tests/.output/s-hero-carousel.png`).

## Risk Assessment
- Clone-wrap flicker → transition-end based swap, verified visually in P3.
- LCP regression → `priority` on first slide only.
- `next/image` inside client island: fine (component API).

## Security Considerations
No new external URLs (cdn.sanity.io already allowlisted in `next.config.ts`).

## Next Steps
→ Phase 3 (browser test + pipeline + changelog).

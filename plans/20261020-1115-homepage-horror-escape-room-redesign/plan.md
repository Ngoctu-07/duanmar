# Homepage Horror/Escape-Room Redesign

## Context
- References: `Screenshot 2026-10-20 105309.png` (dark open tour cards), `105231/105245` (horror hero + promo video), `110531` (target DuanMar hero/search/featured layout), `105547` (current card design).
- Scope: homepage only (`src/app/[locale]/page.tsx` tree). No CMS schema/query changes.
- Production already supplies `heroImage` + `promoVideo` + poster via Sanity.

## Hard contracts to preserve (tests)
- `tests/browser/v-home-hero-header-search.mjs`
  - hero `h-screen`, top = 0, H1 is `[data-testid="hero-display"]` = `DECODE TRAVEL`
  - no `[data-testid="hero-slogan"]`; scroll affordance; promo video `[data-testid="hero-video"]` muted/loop/playsInline
  - wordmark stays full-width, Bebas Neue 400, `clamp(3rem,15vw,20rem)`, 0.10–0.14em tracking, one line, no overflow
  - search is `[data-testid="home-search"]`, border-only, transparent bg, no `<button>` in the form
- `tests/browser/a-ux-microinteractions.mjs`
  - homepage cards keep `[data-slot="card"]`, one `a.inset-0` overlay (z-10), `cursor-pointer`
  - CTA stays a non-anchor `span` with `inline-flex` + `rounded-md`
- `tests/browser/t-locale-tour-descriptions.mjs` — card description keeps `p.line-clamp-2`
- `tests/browser/u-icon-switcher-price.mjs` — price row keeps `p.text-xs` + `span.tabular-nums` (14–15px/600), h3 larger
- `tests/browser/m2-footer-minimal.mjs` — footer stays `#7f1d1d` (footer is outside the homepage canvas wrapper)

## Design decisions
- Tokens scoped to `.horror-canvas` (no global theme mutation): `#121212` canvas, blood-red primary, bright red link.
- Add Oswald (`font-condensed`) for Vietnamese-safe tall condensed headings; hero keeps Bebas Neue.
- Ambient background = layered CSS/SVG fog + film grain + vignette over the CMS hero image, with a drop-in looping video hook (`public/media/hero-ambient.webm|mp4`); no external asset required.
- Promo video moves from full-bleed background to a centered `w-[50vw] max-w-3xl aspect-video` foreground frame.
- Cards: `DestinationCard` gains `variant="spotlight"` (default consumers unchanged) — transparent card, 21/9 pill image, left-aligned condensed content.

## Phases
1. Fonts + scoped tokens + ambient keyframes (`layout.tsx`, `globals.css`).
2. Hero backdrop component + hero restructure.
3. Featured section restyle + spotlight card variant + search eyebrow.
4. Page wrapper / ordering / i18n copy.
5. Tests (unit source/DOM contract + browser layout) and full validation.
6. Changelog + docs.

## Success criteria
- Order: Hero → Search → Featured → Editorial → About → Stories.
- Hero 100vh, `bg-black/60` overlay, 50vw promo video, ambient motion (reduced-motion safe).
- Cards: pill image, no box, uppercase condensed title, red CTA.
- `npm test`, `npm run lint`, `npm run build` green; targeted browser suites green.

## Risks
- Wordmark overflow at odd widths → keep existing `px-2` + nowrap structure.
- Hero content clipping at extreme ratios → cap video with `max-w-3xl`, tight vertical padding.
- Shared card consumers regress → spotlight is opt-in; default path untouched.

## Phase 2 (2026-10-20) — CMS hero media, spacing, Gypsy Curse

Supersedes the phase-1 wordmark contract (V3/V12 + S1c/S5b/S8b rewritten).

1. Remove the static `DECODE TRAVEL` wordmark; keep an `sr-only` H1 fed by `homepage.heroTitle` (SEO/a11y only).
2. Studio `homepage`: add `heroBackgroundMedia` (mp4/webm/GIF, 100vh) and `heroPromoVideo` (mp4/webm, centered). Legacy `promoVideo`/`promoVideoUrl` remain the fallback chain.
3. GROQ: project both assets with `asset->{url, mimeType}`; `page.tsx` maps `backgroundMedia` into `HeroSection`.
4. Hero backdrop: background video gets `autoPlay muted loop playsInline`; GIF renders via `next/image unoptimized`; still → CSS fog fallback.
5. Promo film: borderless, centered, `w-[50vw] max-w-3xl aspect-video`; no caption.
6. Spacing: search `pb-8 md:pb-12`, featured `pt-10 md:pt-14` → gap 104px @1280 / 72px @375 (was 208/144).
7. Font: `src/app/fonts/gypsy-curse.woff2` + license, `next/font/local` (`--font-gypsy-curse`), `--font-gypsy` token, `font-gypsy` on featured/about/stories/editorial headings. `vi` falls back to Oswald (missing diacritics); colors untouched.
8. Tests: rewrite the wordmark contracts, add gap + font + media assertions; keep card/data contracts unchanged.

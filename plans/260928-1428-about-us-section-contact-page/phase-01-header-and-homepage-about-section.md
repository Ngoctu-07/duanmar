# Phase 01 — Header Nav Removal + Homepage About Us Section

## Context Links
- Plan: `plan.md` P1 · Research: `research/research-summary.md` §1 (header), §2 (homepage/search trap), §5 (video), §7 (icons), §8 (tests/rules)
- Files: `src/components/layout/header.tsx`, `src/app/[locale]/page.tsx`, NEW `src/components/homepage/about-us-section.tsx` + `promo-video.tsx`, `src/messages/{en,vi}.json`

## Overview
- Priority: high · Status: Complete · Progress: 100% · Est: 0.5 day · Depends on: —
- Remove "About Us" nav item from global header (desktop + mobile); add 50/50 About Us section on homepage directly below Featured Destinations: text + "Contact" CTA (→ `/contact`) left, promo video placeholder right.

## Key Insights
- `header.tsx:11-18` single `navItems` array feeds BOTH desktop nav (`:32-40`) and mobile Sheet (`:92-101`) → delete one line `:17`.
- `common.about` (`en.json:82`/`vi.json:82`) also used by `footer.tsx:79` + `sitemap/page.tsx:87` → keep the key, remove only the array entry.
- `FeaturedDestinations` is a client component (`featured-destinations.tsx:1`) but AboutUsSection needs no shared state → server component (`async` + `getTranslations("home")`, precedent `trade-cta-band.tsx:5-6`); video interactivity isolated in `"use client"` child `promo-video.tsx`.
- **Search trap**: `search/page.tsx:115-116` emits `/about/<slug>` for every `about.*` object with title+subtitle → all new copy under `home.aboutSection.*`, NEVER `about.*`.
- Zero `<video>` in repo; only asset `public/images/promo-modal.png`; `aspect-video` precedent `destination-card.tsx:32`. lucide has `CirclePlay` but NO brand icons (irrelevant this phase).
- `tests/browser/g-header.mjs:32-40` never asserts About link → header edit breaks no test.

## Requirements
**Functional**
1. Delete `header.tsx:17` (`{ key: "about", href: "/about" }`). Nothing else in header.
2. NEW `src/components/homepage/about-us-section.tsx`: server component `export async function AboutUsSection()`, `getTranslations("home")`; `<section data-testid="about-us-section" className="border-y bg-muted/40 py-16">` → `container mx-auto px-4` → `grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center`; LEFT: `<h2 className="text-3xl font-bold">` = `aboutSection.title`, `<p className="text-muted-foreground">` = `aboutSection.body`, CTA `<Button render={<Link href="/contact" />}>` = `aboutSection.cta` (Link from `@/i18n/navigation`, Button `render` precedent `header.tsx:47`); RIGHT: `<PromoVideo />`.
3. NEW `src/components/homepage/promo-video.tsx` (~90 ln): `"use client"`; consts `VIDEO_SRC = "/videos/about-promo.mp4"`, `POSTER_SRC = "/images/promo-modal.png"`; `<div data-testid="about-promo-video" className="relative aspect-video overflow-hidden rounded-xl border">` containing `<video src={VIDEO_SRC} poster={POSTER_SRC} preload="none" playsInline muted loop aria-label={t("videoAria")} className="h-full w-full object-cover" onError={...}/>` + play overlay `<button type="button" data-testid="about-promo-play" aria-label={t("videoAria")}>` with lucide `CirclePlay`; `onError`/play-rejection → state `unavailable`: keep poster rendered, replace overlay button with caption `t("videoFallback")` (`bg-background/80 rounded px-3 py-1 text-sm`). No crash, no throw.
4. `src/app/[locale]/page.tsx`: import + insert `<AboutUsSection />` between line 33 (`FeaturedDestinations`) and line 34 (`ExperienceCategories`).
5. i18n — add `home.aboutSection` to BOTH `en.json` and `vi.json` (inside `home`, same relative position in both): `title` ("About Us"/"Về chúng tôi"), `body` (2-sentence org blurb), `cta` ("Contact Us"/"Liên hệ"), `videoAria` ("About us promo video"/"Video giới thiệu về chúng tôi"), `videoFallback` ("Video preview coming soon"/"Video giới thiệu sắp có").

**Non-functional**: new files <200 LOC · theme tokens only (`border-y bg-muted/40 text-muted-foreground`, NEVER hex/`red-*`) · responsive (stack ≤767px, no 375px overflow) · `@/i18n/navigation` Link only · a11y: overlay button focusable with aria-label, video has aria-label.

## Related Code Files
**Tạo**: `src/components/homepage/about-us-section.tsx`, `src/components/homepage/promo-video.tsx`
**Sửa**: `src/components/layout/header.tsx` (delete :17), `src/app/[locale]/page.tsx` (insert 1 component + import), `src/messages/en.json`, `src/messages/vi.json` (`home.aboutSection.*` ×5 keys)
**Không sửa**: `common.about` key, `footer.tsx`, `sitemap/page.tsx`, `about/page.tsx`, `about/*` messages, `featured-destinations.tsx`, any test

## Implementation Steps
1. `header.tsx`: delete line 17 only; confirm `navItems` `:11-18` still valid array.
2. Create `promo-video.tsx` (state `available|unavailable`, play handler `.play().catch(() => setUnavailable())`, `onError` → unavailable, poster stays via `<video poster>`/`<img>` fallback).
3. Create `about-us-section.tsx` per spec (server, 50/50 grid, CTA via Button `render` + Link `/contact`).
4. `page.tsx`: add import line + `<AboutUsSection />` between `:33`/`:34` (verify order HeroSection→…→FeaturedDestinations→**AboutUsSection**→ExperienceCategories→…).
5. i18n: add identical `aboutSection` object to `en.json` + `vi.json` inside `home` (keep files line-aligned).
6. Verify (commands below).

## Todo List
- [x] Remove `header.tsx:17` about nav item
- [x] Create `promo-video.tsx` (poster + play overlay + graceful unavailable fallback)
- [x] Create `about-us-section.tsx` (50/50, Contact CTA → `/contact`)
- [x] Insert `<AboutUsSection />` into `page.tsx` at :33/:34 boundary
- [x] Add `home.aboutSection.*` (5 keys) to BOTH `en.json` + `vi.json`
- [x] Verify: `npm run lint` · `npm test` · `npm run build`

## Success Criteria
- `grep -n '"/about"' src/components/layout/header.tsx` → 0 hits; `grep -n 'about' src/components/layout/header.tsx` → 0 nav references (menu/search/my-trips untouched).
- `npm run lint` = 0 errors · `npm test` green (incl. i18n parity) · `npm run build` green.
- DOM (`npm run dev`, `/vi`): exactly 1 `[data-testid="about-us-section"]`; its `previousElementSibling` is the Featured Destinations `<section>` (text contains `home.featuredDestinations` value from `vi.json`); `[data-testid="about-us-section"] a[href="/vi/contact"]` present; `header a` contains NO `/about` href (desktop) and mobile Sheet nav also none; `[data-testid="about-promo-video"]` renders with poster, play click without mp4 → NO `pageerror`, caption fallback visible.
- New files: zero hex colors / `red-*` (`grep -E '#[0-9a-fA-F]{3}|red-' <new files>` → 0); every file <200 LOC (`wc -l`).

## Risk Assessment
- **R1 search trap**: copy under `about.*` → phantom `/about/aboutSection` results → mitigated: `home.*` only (grep verify `aboutSection` appears only under `home`).
- **R2 i18n parity**: key added to one locale only → `npm test` fails; add both in same step.
- **R3 missing mp4 console error**: `error` event must be handled (state), tests assert no `pageerror`; asset drop-in documented: `public/videos/about-promo.mp4`.
- **R4 header regression**: `common.about` deletion would break footer/sitemap → only array entry removed; `g-header.mjs` + manual header sweep.
- **R5 layout shift/overflow** at 375px → `grid-cols-1` mobile, `aspect-video` fixed ratio; screenshot mobile viewport.

## Security Considerations
- Static content only, no user input → XSS safety via React default escaping; no external/embedded video URLs (local path only, no third-party iframes); no new endpoints, no data flows.

## Next Steps
- Phase 2 reuses `home.aboutSection.cta` target `/contact` — route must exist before phase 3 rewires inbound links; contact CTA href is the P1→P2 contract.

## Decisions already made
Server section + client video child · poster `/images/promo-modal.png` interim · text+CTA left / video right · `home.aboutSection` namespace · Contact CTA = Button `render` + `Link` (not raw `<a>`).

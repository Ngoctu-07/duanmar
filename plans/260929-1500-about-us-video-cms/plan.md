# About Us Section Video — Dynamic via Studio CMS — Plan

**Date**: 2026-09-29 · **Type**: Feature (schema + query + frontend + tests) · **Status**: Complete · **Progress**: 100%

## Executive Summary
Add `aboutUsVideo` (file), `aboutUsVideoStreamUrl` (external URL), `aboutUsVideoPoster` (image) to the `homepage` Studio doc; project them in `HOMEPAGE_QUERY`; make `PromoVideo` a props-driven background player (`autoPlay muted loop playsInline`, no click-to-play) with static-poster fallback; rewrite the J2 browser contract + add a query unit test.

## Context Links
- Schema: `src/sanity/schemaTypes/homepage.ts` (title/hero fields; live doc exists: `title:"DuanMar", heroTitle:"Find Your Trip"`)
- Query: `src/sanity/queries/homepage.ts:4-11` (`HOMEPAGE_QUERY`, 0 params) · fetch `src/app/[locale]/page.tsx:22` (`tags:["sanity:homepage"]`)
- UI: `src/components/homepage/about-us-section.tsx:28` (`<PromoVideo />`, no props) · `src/components/homepage/promo-video.tsx` (hardcoded `VIDEO_SRC="/videos/about-promo.mp4"` — **file does not exist**, `POSTER_SRC="/images/promo-modal.png"`, click-to-play + caption)
- Tests: `tests/browser/j-about-contact.mjs:71-77` (**J2 locks play-button → `videoFallback` caption**) · `n-lightbox-contact.mjs:163` (CTA only) · unit runner 16 files · i18n keys `home.aboutSection.{videoAria,videoFallback}` EN/VI `:107-109` (reuse — 0 new keys)
- Infra: `next.config.ts:24-26` allows `cdn.sanity.io` → Sanity-hosted poster via `next/image` OK · file assets served at `cdn.sanity.io/files/…` (plain `<video src>`, no next/image)
- Patterns: data-driven browser tests read live CMS (`p-tours-category.mjs:31-43`), unit query contracts (`tests/unit/site-configuration-query.test.mts`)

## Binding Decisions (user answered 2026-09-29)
1. **Schema home** = `homepage` doc (already fetched on the page — zero extra queries).
2. **Fields** = upload file **+** external URL: `aboutUsVideo` (file, `accept: "video/mp4,video/webm"`) + `aboutUsVideoStreamUrl` (url); precedence **uploaded file → stream URL**.
3. **Fallback** = user will upload the video in Studio (primary path). Robustness default adopted: **always render a poster** (CMS poster → else existing `/images/promo-modal.png`) so the 50/50 grid never breaks; suppression path not needed (object to this at approval if you want strict suppress-and-col-span instead).
4. **Player** = true background autoplay (`autoPlay muted loop playsInline loop`), **click-to-play overlay removed**; `onError` on a configured video → poster + existing `videoFallback` caption.

## Key Insights
- No video in CMS today → after deploy the section renders the static poster (grid intact) until you upload in Studio; no layout churn.
- `HOMEPAGE_QUERY` has 0 params and one call site → extending the projection is call-site safe (pattern: decision "extend projections only, never add params").
- GROQ file access: `aboutUsVideo{asset->{url}}` (value is `{asset: reference}`); image: `aboutUsVideoPoster{asset->{url,metadata{dimensions{width,height}}}}`.
- J2 must be rewritten (behavior change is the feature), data-driven off the live `homepage` doc — no fabricated CMS data.
- `useRef`/play handler die with the overlay → component shrinks; `videoAria`/`videoFallback` keys stay (parity 789/789 untouched).

## Implementation Phases

| # | Phase | Status | Progress | Plan file |
|---|-------|--------|----------|-----------|
| 1 | Studio schema (3 fields) + `HOMEPAGE_QUERY` projection + unit contract test | Complete | 100% | [phase-01](phase-01-schema-query-unit.md) · lint 0 · unit **17/17** · `sanity schemas validate` 0 errors |
| 2 | Frontend binding: page props → AboutUsSection → PromoVideo autoplay/poster | Complete | 100% | [phase-02](phase-02-frontend-integration.md) · lint 0 · unit 17/17 · smoke `/vi`: poster 598×336, grid `600px 600px`, 0 overlay, 0 pageerror |
| 3 | J2 rewrite + pipeline + Studio manual check + changelog | Complete | 100% | [phase-03](phase-03-tests-verification-changelog.md) · j-about exit 0 (34 ok) · build 0 · browser **16/17** (sole fail = pre-existing `revalidate-webhook`) · changelog EOF |

## File Allow-List (exact)
- **Modify (6)**: `src/sanity/schemaTypes/homepage.ts` · `src/sanity/queries/homepage.ts` · `src/app/[locale]/page.tsx` · `src/components/homepage/about-us-section.tsx` · `src/components/homepage/promo-video.tsx` · `tests/browser/j-about-contact.mjs` · `docs/project-changelog.md` (append under existing `## 2026-09-29`)
- **Create (4)**: `tests/unit/homepage-about-video-query.test.mts` · plan dir (this + 3 phases + report) · screenshots (existing `j2-about-section.png` refreshed)
- **Delete: 0.** NO edit: `site-configuration.ts`/query, `promo-modal.tsx`, `ui/dialog.tsx`, other tests/runners, i18n files, `next.config.ts`, `public/videos` (do not fabricate assets).

## Global Verification (every phase)
`npm run lint` → `npm test` (**17/17 files**, +1 new) → stop dev → `npm run build` (exit 0) → start dev `:3000` → `node tests/browser/j-about-contact.mjs` (all green) → `npm run test:browser` (**16/17**; sole fail = pre-existing `revalidate-webhook` env) → `node_modules/.bin/sanity schemas validate` (0 errors).

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| J2 contract rewrite hides a real regression | Med | Data-driven assertions (video attrs ⇔ live CMS URL; poster ⇔ no URL), slot/CTA/order checks kept verbatim |
| Autoplay blocked by browser policy | Low | `muted`+`playsInline` = universally allowed; `poster` visible either way |
| Sanity file upload size/encoding | Low | Studio handles chunked upload; `accept` restricts to mp4/webm |
| Homepage doc absent (fresh env) | Low | `homepageData ?? {}` → `videoSrc=null` → poster fallback (existing `destinationsData \|\| []` precedent) |

## Unresolved Questions
None — decision 3 default ("always show poster") flagged above for approval.

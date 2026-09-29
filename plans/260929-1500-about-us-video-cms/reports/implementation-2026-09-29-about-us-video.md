# Implementation Report — About Us Section Video (Studio CMS-driven)

**Date**: 2026-09-29 · **Plan**: `plans/260929-1500-about-us-video-cms/` · **Status**: Complete (100%)

## Scope
AC1: 3 new fields on `homepage` Studio doc (video file upload, external stream URL, poster image). AC2: `HOMEPAGE_QUERY` projection → `page.tsx` → `AboutUsSection` props → `PromoVideo`. AC3: background autoplay (`autoPlay muted loop playsInline`) with static-poster fallback; click-to-play overlay removed.

## Deliverables
| AC | Implementation | Verified |
|----|----------------|----------|
| 1 Studio fields | `homepage.ts` +`aboutUsVideo` (file, accept mp4/webm), +`aboutUsVideoStreamUrl` (url), +`aboutUsVideoPoster` (image, hotspot) | `sanity schemas validate` 0 errors; unit schema-text assertions |
| 2 Dynamic binding | `HOMEPAGE_QUERY` +3 projections (**0 params**); `page.tsx` `videoSrc = file ?? streamUrl`, `posterSrc` → props | unit: projection + call-site-safety checks; live smoke renders from payload |
| 3 Player/fallback | `promo-video.tsx` rewritten: `<video autoPlay muted loop playsInline preload="metadata" poster>`; no video → `<Image fill>` poster (`aboutUsVideoPoster` → `/images/promo-modal.png`); configured-but-failed → poster + `videoFallback` caption; overlay/`useRef` removed | smoke: poster 598×336 in slot, grid `600px 600px`, no play button, 0 pageerrors; J2 asserts both branches data-driven |

## Files
- **Modified (6)**: `src/sanity/schemaTypes/homepage.ts` · `src/sanity/queries/homepage.ts` · `src/app/[locale]/page.tsx` · `src/components/homepage/about-us-section.tsx` · `src/components/homepage/promo-video.tsx` · `tests/browser/j-about-contact.mjs` (+ `docs/project-changelog.md`)
- **Created (2)**: `tests/unit/homepage-about-video-query.test.mts` (10 checks) · this plan dir (plan + 3 phases + report)
- **Deleted**: 0 · **Unchanged**: i18n (0 new keys, parity 789/789), runners, `next.config.ts`, `site-configuration`, other tests

## Verification (gates)
- `npm run lint` exit 0 · `npm test` **17/17 files** (runner 16→17) · `npm run build` exit 0 (dev stopped for build, restarted)
- `node tests/browser/j-about-contact.mjs` exit 0 (**34 ok / 0 FAIL**) — J2 rewritten, other checks untouched
- `npm run test:browser` **16/17** — sole fail `revalidate-webhook.mjs` (missing `SANITY_REVALIDATE_SECRET`, pre-existing env)
- `npx sanity schemas validate` **0 errors / 0 warnings**
- Evidence: `tests/.output/about-video-smoke.png`, refreshed `j2-about-section.png`

## Deviations from plan
- None. Note: unit test initially asserted literal `image {` (hero projection) → fixed to `heroImage {` during P1 (test bug, not product bug).

## Outstanding (user action)
1. Open `/studio` → **Homepage** doc → upload MP4/WebM to *About Us Video* (and optionally *About Us Video URL* + *Poster*) → publish. Homepage picks it up within ≤300s (or instantly via `revalidateTag` webhook); J2's video branch activates automatically on next run.
2. Prior task backlog: `SANITY_WRITE_TOKEN` for the tour-filtering backfill (`npm run migrate:tour-filter -- --set nyc=international --apply`).

## Docs impact
minor — changelog bullets under `## 2026-09-29` + plan statuses + this report.

**Status:** DONE
**Summary:** About Us video is fully CMS-driven with background autoplay and a grid-safe poster fallback; schema/query/frontend/test all landed with 17/17 unit and 16/17 browser (known env fail only). Video branch awaits your Studio upload to exercise live.

# About Us Section & Contact Page — Plan

**Date**: 2026-09-28 · **Type**: Feature (UI + Route + API) · **Status**: Complete

## Executive Summary
Drop "About Us" from the global header; inject a 50/50 About Us section (text + Contact CTA / promo video) directly below `FeaturedDestinations` on the homepage. New `/contact` page (oversized hero contact nodes + React Hook Form form) POSTs JSON to `/api/contact` (validate → `console.log` → 2xx, no DB). Rewire 7 `/about/contact` hrefs + sitemaps; old route becomes a 308 stub. One new dep: `react-hook-form` (manual validation, no zod).

## Context Links
- **Research**: `research/research-summary.md` — all file:line citations + 4 corrections
- **Related Plans**: `plans/260928-0010-star-rating-and-customer-reviews/` (format, test conventions) · `plans/260926-0147-about-subpages/` (current `/about/*`)
- **Docs**: `docs/code-standards.md`, `docs/design-guidelines.md`; changelog append-only under `## 2026-09-28` (`docs/project-changelog.md:261`)
- **Key files**: `src/components/layout/header.tsx:11-18` · `src/app/[locale]/page.tsx:33` · `src/app/[locale]/about/contact/page.tsx` (replace) · `src/components/booking/booking-validation.ts:32-33,51-87` (validation precedent) · `src/app/api/revalidate/route.ts` (API precedent) · `src/app/[locale]/explore/page.tsx:1,9` (redirect precedent)

## Binding Decisions (do not re-ask)
1. "Tour List" = `FeaturedDestinations` → new About Us section renders directly below `<FeaturedDestinations/>` in `src/app/[locale]/page.tsx:33`, before `<ExperienceCategories/>` :34.
2. `/contact` REPLACES `/about/contact`: new `src/app/[locale]/contact/page.tsx`; rewire 7 hardcoded `/about/contact` hrefs + ADD `/contact` to `src/app/sitemap.ts` routes + rewire `sitemap/page.tsx:90`; old route = redirect stub using `permanentRedirect` from `@/i18n/navigation` (precedent `src/app/[locale]/explore/page.tsx:1,9`; needs +1 export line in `src/i18n/navigation.ts`; fallback = `redirect` 307).
3. Form POSTs JSON to NEW route handler `/api/contact`: validates payload, returns 2xx JSON, `console.log` server-side (masked PII). No DB.
4. Contact node values = placeholders (tel `+84 28 3822 0000`, `mailto:info@vietnam-tourism.com`, FB/IG/TikTok profile URLs) — single source of truth in i18n `contact.nodes.*` (BOTH `en.json`/`vi.json`) so values swap without code change.
5. Promo video = local `<video>` with `poster` + graceful fallback; ships WITHOUT mp4 — wires `public/videos/about-promo.mp4`, interim poster `/images/promo-modal.png`, poster/play-overlay until asset is dropped in.
6. Add dependency `react-hook-form`; manual field validation via `src/lib/contact-validation.ts` (mirrors `booking-validation.ts`), NO zod (repo convention).

## Implementation Phases

| # | Phase | Status | Progress | Plan file | Depends on | Verification |
|---|-------|--------|----------|-----------|-----------|--------------|
| 1 | Header nav removal + homepage About Us section (video placeholder) | Complete | 100% | [phase-01](phase-01-header-and-homepage-about-section.md) | — | lint, `npm test`, build, DOM `/vi` |
| 2 | `/contact` page (hero nodes + form) + `react-hook-form` + `/api/contact` | Complete | 100% | [phase-02](phase-02-contact-page-form-and-api.md) | P1 (shared `messages/*.json`) | lint, `npm test`, build, POST 200/400/415 |
| 3 | Rewire `/about/contact` → `/contact` + 308 redirect stub | Complete | 100% | [phase-03](phase-03-rewire-about-contact-links.md) | P2 (target route live) | grep 0 hits, redirect probe, build |
| 4 | Browser e2e + unit tests + full pipeline + changelog | Complete | 100% | [phase-04](phase-04-tests-verification-changelog.md) | P1–P3 | `npm test`, `npm run build`, `npm run test:browser` |

## New Files (exact allow-list)
- P1: `src/components/homepage/about-us-section.tsx` · `src/components/homepage/promo-video.tsx`
- P2: `src/app/[locale]/contact/page.tsx` · `src/components/contact/contact-form.tsx` · `src/app/api/contact/route.ts` · `src/lib/contact-validation.ts`
- P4: `tests/unit/contact-validation.test.ts` · `tests/browser/j-about-contact.mjs`
- **Modify (16)**: `header.tsx`, `src/app/[locale]/page.tsx`, `src/messages/en.json`, `src/messages/vi.json` (P1+P2) · `package.json` + `package-lock.json` (P2) · `footer.tsx`, `sitemap/page.tsx`, `support`, `accessibility`, `business-mice`, `privacy`, `trade` pages, `src/app/sitemap.ts`, `src/i18n/navigation.ts`, `about/contact/page.tsx` (P3) · `docs/project-changelog.md` (P4)
- **Delete: 0** (old contact page content replaced in-place by redirect stub). No `*-enhanced` files; every new file <200 LOC.

## Global Verification (every phase)
`npm run lint` → `npm test` (i18n parity en↔vi) → `npm run build` → (P4) `npm run dev` on :3000 + `npm run test:browser`. Manual: `http://localhost:3000/vi` (About section directly under Featured Destinations; no "Về chúng tôi" header nav item; mobile Sheet too) + `/vi/contact` (5 node anchors, empty submit → 4 errors, valid submit → success) + `curl -sI localhost:3000/vi/about/contact` → 308 `/vi/contact`.

## Key Risks
lucide 1.48.0 has NO FB/IG/TikTok icons (verified) → social nodes are text chips · `permanentRedirect` not yet re-exported (1-line add; fallback 307 `redirect`) · missing mp4 fires `error` event → fallback must not crash (browser test guards `pageerror`) · search page still emits `/about/contact` (`search/page.tsx:115-116`) → redirect stub must stay (never delete the file) · no rate limiting/captcha on `/api/contact` (documented non-functional gap) · `react-hook-form` = only new dep; i18n parity failure if a key misses one locale.

## Unresolved Questions
1. Log content: binding says `console.log` server-side; plan logs **masked** email/phone + field lengths (no raw PII in logs). Confirm masking is acceptable vs logging full payload. → **Resolved (implemented as masked)**: masked logging shipped; superset-safe vs binding.
2. Post-submit UX (AC silent): plan = inline success message + `form.reset()` (no redirect/toast). Confirm. → **Resolved (implemented as planned)**: inline `role="status"` + reset, browser-verified.
3. Interim video poster reuses `/images/promo-modal.png`; a dedicated `public/images/about-promo-poster.png` may be supplied later (poster path constant, swap = 1 line).

## Completion Notes (2026-09-28)
- All 4 phases Complete/100%. Pipeline: `npm run lint` 0 · `npm test` **13/13** · `npm run build` 0 · `npm run test:browser` **8/9** (only pre-existing `revalidate-webhook` env failure — missing `SANITY_REVALIDATE_SECRET`, unrelated).
- Deviations: (a) `j-about-contact.mjs` uses Puppeteer selectors (`focus`+`keyboard.type`, `waitForResponse`) — harness is Puppeteer, not Playwright; (b) `validateContactPayload` treats wrong-typed values as `required` (strict JSON guard, no type coercion); (c) `grep '/about/contact' src/` residue = 2 comment lines inside the redirect stub (documentation, zero hrefs).
- Follow-ups: drop `public/videos/about-promo.mp4` (+ optional dedicated poster) · optional dedicated poster image · swap placeholder contact values in `contact.nodes.*` (both locales) · rate limiting/captcha on `/api/contact` = documented non-functional gap.

# Phase 03 — Rewire /about/contact → /contact + Redirect Stub

## Context Links
- Plan: `plan.md` P3 · Research: `research/research-summary.md` §3 (link list, sitemaps, redirect precedent) + correction #2/#4
- Files: 7 href edits + `src/app/sitemap.ts` + `src/i18n/navigation.ts` + `src/app/[locale]/about/contact/page.tsx`

## Overview
- Priority: medium · Status: Complete · Progress: 100% · Est: 0.25 day · Depends on: P2 (`/contact` live)
- Point every hardcoded `/about/contact` link and sitemap entry to `/contact`; turn the old route into a permanent (308) redirect stub so search results and external backlinks never 404.

## Key Insights
- Exactly **7** `/about/contact` href occurrences (grep-verified): `footer.tsx:22`, `sitemap/page.tsx:90`, `support/page.tsx:62`, `accessibility/page.tsx:50`, `business-mice/page.tsx:60`, `privacy/page.tsx:74`, `trade/page.tsx:60`.
- **Correction**: `src/app/sitemap.ts` routes `:8-31` contains `/about` (`:17`) but NO `/about/contact` → only action = ADD `"/contact"`. The "2 sitemap entries" = `sitemap.ts` (add) + `sitemap/page.tsx:90` (rewire; already counted among the 7).
- Redirect precedent: `src/app/[locale]/explore/page.tsx:1,9` — `redirect({ href, locale })` from `@/i18n/navigation` after awaiting `params`. next-intl also exports `permanentRedirect` (308; typed `createNavigation.d.ts:340`) but `src/i18n/navigation.ts:1-3` does NOT re-export it → add 1 word to the destructure. 308 preferred (URL permanently moved) with fallback = `redirect` (307) if runtime export missing.
- **Never delete** `about/contact/page.tsx`: `search/page.tsx:115-116` still emits `/about/contact` (from kept `about.contact.*` messages) → stub keeps that URL alive.
- `/about` page itself KEPT; `footer.tsx:21`, `sitemap/page.tsx:89`, `common.about` untouched → zero regressions on `/about`.
- Bare `/about/contact` (no locale) already 404s (middleware matcher `/(en|vi)/:path*`) → unchanged behavior, same as `/about`.

## Requirements
**Functional**
1. `src/i18n/navigation.ts`: add `permanentRedirect` to the `createNavigation(routing)` destructure (`:1-3`).
2. `src/app/[locale]/about/contact/page.tsx`: REPLACE all 90 ln with ~12 ln stub: default export `async` page receiving `params: Promise<{ locale: string }>`, `const { locale } = await params;` → `permanentRedirect({ href: "/contact", locale });` (shape from `explore/page.tsx:5-9`). No metadata needed (no HTML rendered). Remove now-unused imports (`getTranslations`, icons).
3. Replace href `"/about/contact"` → `"/contact"` in all 7 files listed above (Link components unchanged otherwise).
4. `src/app/sitemap.ts`: add `"/contact"` to `routes` array (after `"/about"` `:17`).
5. Do NOT touch: `about/page.tsx`, `about/careers`, `about/press`, `about.contact.*` messages, `common.about`, `footer.tsx:21`, `sitemap/page.tsx:89`.

**Non-functional**: stub <200 LOC · no behavior change on `/about` · sitemap output gains `/en/contact` + `/vi/contact` entries.

## Related Code Files
**Tạo**: (none — stub replaces content of existing file)
**Sửa**: `src/i18n/navigation.ts`, `src/app/[locale]/about/contact/page.tsx`, `src/app/sitemap.ts`, `src/components/layout/footer.tsx`, `src/app/[locale]/sitemap/page.tsx`, `src/app/[locale]/support/page.tsx`, `src/app/[locale]/accessibility/page.tsx`, `src/app/[locale]/business-mice/page.tsx`, `src/app/[locale]/privacy/page.tsx`, `src/app/[locale]/trade/page.tsx`
**Không sửa**: `about/page.tsx`, `about/{careers,press}` pages, `src/messages/*` (`about.contact.*` stays for search/redirect), `middleware.ts`, tests

## Implementation Steps
1. `src/i18n/navigation.ts`: destructure adds `permanentRedirect`.
2. Rewrite `about/contact/page.tsx` as redirect stub (await params → `permanentRedirect({ href: "/contact", locale })`); if TS/runtime shows export missing → fallback `redirect` (307) + note in changelog.
3. Global replace `href="/about/contact"` → `href="/contact"` across the 7 files (grep-driven, one commit).
4. `src/app/sitemap.ts`: insert `"/contact"` after `"/about"`.
5. Verify (commands below).

## Todo List
- [x] Export `permanentRedirect` from `src/i18n/navigation.ts`
- [x] Rewrite `about/contact/page.tsx` → 308 stub
- [x] Rewire 7 `/about/contact` hrefs → `/contact`
- [x] Add `"/contact"` to `src/app/sitemap.ts` routes
- [x] Verify: grep sweep · redirect probe · `npm run lint` · `npm test` · `npm run build`

## Success Criteria
- `grep -rn '"/about/contact"' src/` → **0 hits** · `grep -rn '/about/contact' src/` → only acceptable residue: none (messages contain no href strings) .
- `grep -c '"/contact"' src/app/sitemap.ts` → 1; `npm run build` output sitemap includes `https://vietnam-tourism.com/en/contact` + `/vi/contact`.
- Dev server: `curl -sI http://localhost:3000/vi/about/contact` → status **308** (or 307 fallback) with `location: /vi/contact`; following redirect → 200 page with `[data-testid="contact-node"]`.
- `curl -sI http://localhost:3000/vi/about` → 200 (About page untouched); footer "Contact" link, support/accessibility/trade/privacy/mice pages + HTML sitemap all show `/vi/contact`.
- `npm run lint` = 0 · `npm test` green · `npm run build` green.

## Risk Assessment
- **R1 `permanentRedirect` not exported at runtime** (type-only presence) → build fails fast at stub import; fallback: plain `redirect` (307) per explore precedent.
- **R2 redirect loop**: stub href `/contact` ≠ `/about/contact` → no loop; verify with `curl -sIL` (follow chain length ≤1).
- **R3 missed link** (8th occurrence added later) → grep gate in success criteria; P4 browser test re-checks.
- **R4 dev-server 308 caching** quirks → use `curl -sI` fresh request; prod behavior = Next permanent redirect.

## Security Considerations
- Redirect target is a hardcoded internal constant (`"/contact"`) — **no open-redirect risk** (no user-controlled input in href/params besides locale routing already handled by next-intl).
- No auth/session/cookies touched; sitemap gains static route only; no new endpoints.

## Next Steps
- Phase 4 browser test asserts the 308 + link sweep; changelog notes URL migration (breaking-ish change: old URL preserved via redirect).

## Decisions already made
`permanentRedirect` (308) over `redirect` (307) — URL is permanently moved · stub stays a `page.tsx` (file must exist; deleting → 404 from search results) · `/about` and its messages untouched · sitemap.ts gains `/contact` (it never had `/about/contact` — correction #2).

# CMS-Driven Social & Contact Links (Studio → Contact Section + Footer)

**Date**: 2026-09-30 · **Type**: Feature Implementation · **Status**: In Progress

## Executive Summary
Social handles today live only in `src/messages/{en,vi}.json` (`contact.nodes.*`, hardcoded
`facebook/instagram/tiktok`). Add a `socialLinks[]` array to the existing global Studio doc
`siteConfiguration` (each entry = `platform` + `displayText` + optional `targetUrl`), project
it through `SITE_CONFIGURATION_QUERY`, and render it as real `<a>` tags in the Contact
Section (`/[locale]/contact`) and the Global Footer — with `target="_blank"`
`rel="noopener noreferrer"` on external links, and plain (unlinked) text when `targetUrl`
is empty. i18n nodes stay as the fail-closed fallback so an empty CMS field never breaks the page.

## Context Links
- Schema/doc: `src/sanity/schemaTypes/site-configuration.ts` (global singleton) · registration `src/sanity/schemaTypes/index.ts` · Studio tree `src/sanity/structure.ts` (single "Site Configuration")
- Query/fetch: `src/sanity/queries/site-configuration.ts` · `src/sanity/lib/fetch-published.ts` (published-only, fail-open `null`, tag `sanity:siteconfig`, webhook purges global `sanity` tag → `src/app/api/revalidate/route.ts`)
- Consumers: `src/app/[locale]/layout.tsx:16-43` (already fetches siteConfig → `<Footer />`), `src/app/[locale]/contact/page.tsx` (5 node cards), `src/components/layout/footer.tsx` (Col B contact list)
- Contract tests (must keep passing when CMS field is empty): `tests/browser/m-footer-brand.mjs` F4/F5/F6 (5 links, hrefs byte-equal `contact.nodes`, socials `_blank`+`noopener noreferrer`, tel/mailto same-tab), `tests/browser/j-about-contact.mjs` J3 + `tests/browser/n-lightbox-contact.mjs` N12 (5 `a[data-testid="contact-node"]` incl `tel:`/`mailto:`)
- House patterns: array-of-object schema + preview `src/sanity/schemaTypes/promotion.ts` · RSC render tests `tests/unit/promotion-schema-queries.test.mts:195-235` (`createRequire` + `renderToStaticMarkup`)

## Locked Decisions (do not re-litigate)
1. **No new document type.** Field goes on the existing global `siteConfiguration` doc (task: "siteSettings / contactSettings"); Studio already exposes it as the single Site Configuration entry — zero structure/config changes.
2. Schema field `socialLinks`: `array` of object `{ platform (select: facebook|instagram|tiktok|youtube|linkedin|x|other, required), displayText (string, required, "handle/label shown on site"), targetUrl (type "url", OPTIONAL — `rule.uri({allowRelative:false, scheme:["https","http"]})`) }`. Optional URL is the spec's fallback requirement (empty → unlinked text).
3. **One shared renderer** `src/components/contact/social-anchor.tsx`: `classifyHref()` returns `{href, external}` — `https?://` → external (`_blank`+`noopener noreferrer`), `tel:`/`mailto:`/`/…` → same-tab anchor, empty/`javascript:`/`data:`/`//host`/garbage → `null` → render `<span>` (no dead `#`). Consumers pass `className` (default `hover:underline`); footer keeps its own `text-lg hover:text-white/80`.
4. **Fallback order per surface**: CMS `socialLinks` (normalized, non-empty) → i18n `contact.nodes` socials → nothing. Phone/Email always stay i18n (`tel:`/`mailto:` are not social platforms; CMS keeps zero contact-detail duplication). Keeps F4/F5/F6 + J3/N12 green on the untouched dataset.
5. Normalization in `src/lib/social-links.ts` (pure, unit-testable): array guard, trim, drop entries without `displayText`, `platform` default `"other"`, `platformTitle()` map (brand names are locale-independent → no new i18n keys → parity test untouched).
6. Footer receives `socialLinks` as a prop from `layout.tsx` (single fetch, RSC — no client JS, no second fetch). Contact page fetches the same query with tag `sanity:siteconfig`.
7. Assistant grounding (`src/lib/assistant/contact-nodes.ts`) stays i18n — out of scope, noted as follow-up (it is sync + not a rendered link).

## Phases
- [ ] P1 Schema field + GROQ projection → `phase-01-schema-and-query.md`
- [ ] P2 Shared lib + `SocialAnchor` renderer → `phase-02-social-links-lib-and-anchor.md`
- [ ] P3 Bind Footer + Contact Section → `phase-03-footer-and-contact-binding.md`
- [ ] P4 Tests + gates + changelog → `phase-04-tests-gates-and-changelog.md`

## Files
- modify: `src/sanity/schemaTypes/site-configuration.ts`, `src/sanity/queries/site-configuration.ts`,
  `src/app/[locale]/layout.tsx`, `src/components/layout/footer.tsx`, `src/app/[locale]/contact/page.tsx`,
  `docs/project-changelog.md`
- create: `src/lib/social-links.ts`, `src/components/contact/social-anchor.tsx`,
  `tests/unit/social-links.test.mts`, phase files in this folder
- delete: none. **Do NOT touch** other dirty working-tree files (other features uncommitted).

## Verification Gates (P4)
`npx tsc --noEmit` → `npm run lint` → `npm test` (28 → 29 files) →
`npx sanity schemas validate` (0 errors) → `npm run build` (**stop dev server :3000 first**,
PID 26964 at plan time — re-check `netstat`; restart after) → targeted browser sanity
`tests/browser/m-footer-brand.mjs` + `j-about-contact.mjs` if a runner is available.
No `SANITY_WRITE_TOKEN` → field ships empty → fallback path renders (expected).

## Risk / Security
- XSS/dead links: only absolute `http(s)` escapes into `href` with `_blank`+`noopener noreferrer`;
  `javascript:`/`data:`/protocol-relative rejected → rendered as text (fail-closed).
- Test contract drift: empty CMS ⇒ byte-identical footer/contact output to today (5 nodes, same hrefs).
- i18n: zero message-file edits → `i18n-parity` unchanged.
- Revalidation: same `sanity:siteconfig` tag → publish webhook already purges it.

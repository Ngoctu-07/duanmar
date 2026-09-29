# Plan Summary — Transparent Logo & Footer Refactor (260928-1835)

**What:** Header gets transparent circular badge logo (`public/images/logo-duanmar.png`) + solid wordmark + `aria-hidden` low-opacity (0.3–0.4) text overlay on emblem; footer's explore/plan/about groups replaced by brand block + Col A Tours / Col B Liên hệ / Col C Thông tin.

**Why:** Brand identity (emblem visible, transparent bg) + footer nav now mirrors actual product routes; contact URLs single-sourced from `contact.nodes` so footer and `/contact` can never drift.

**Files:** CREATE `src/components/layout/brand-logo.tsx`, `tests/browser/m-footer-brand.mjs`, `public/images/logo-duanmar.png` (lead) · MODIFY `header.tsx:25-27`, `footer.tsx:5-27,46-92` (bottom bar `:95-125` kept), `src/messages/{en,vi}.json` (+`footer.{tours,info,howToBook,articles}` ×2), `docs/project-changelog.md` · DELETE: none (orphaned `visaInfo/gettingAround/accommodation/healthSafety` kept).

**Phases:**
1. `phase-01-logo-asset-and-header.md` — asset verify, `brand-logo.tsx`, lockup + overlay + a11y.
2. `phase-02-footer-columns-and-i18n.md` — 4 blocks, 4 new i18n keys, `tc.raw("nodes.*")` wiring, plain `<a>` for tel/mailto/https, grid stays `grid-cols-2 md:grid-cols-4`, split to `footer-columns.tsx` if >180 LOC.
3. `phase-03-tests-pipeline-changelog.md` — `tests/browser/m-footer-brand.mjs` (next free letter after `l`), 4 gates, changelog.

**Gates:** `npm run lint` → `npm test` 14/14 → `npm run build` → `npm run test:browser` 11/12 (`revalidate-webhook` pre-existing env fail, untouchable).

**Deviations recorded:** Col A uses `common.domesticTours/internationalTours` (not "Tour nội địa"); Col C "Bài viết" = new `footer.articles` (not `footer.blog`).

**Unresolved:** (1) delete or keep 4 orphaned footer keys — default KEEP; (2) mobile `col-span-2` on brand block — default no; (3) logo in mobile Sheet — default out of scope.

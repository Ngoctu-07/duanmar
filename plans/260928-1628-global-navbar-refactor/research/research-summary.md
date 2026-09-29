# Research Summary — Global Navbar Refactor

Generated 2026-09-28 from 2 parallel read-only explore agents. All facts file:line verified.

## A. Header & i18n
- `src/components/layout/header.tsx:11-17` = single `navItems` source: explore→/explore, planTrip→/plan-your-trip, culture→/culture, deals→/deals, news→/news. Rendered desktop `:31`, mobile sheet `:91`. Labels via `useTranslations("common")` `:20`, `:37`, `:97`. Search/my-trips buttons + LocaleSwitcher live OUTSIDE the `<nav>` (`:42-63`) → not nav items.
- `common` namespace = `en.json`/`vi.json:72-86`. Relevant values: `explore` "Explore Vietnam"/"Khám phá Việt Nam" · `planTrip` · `culture` · **`deals` "Deals & Packages"/"Ưu đãi & Gói du lịch" ← exact AC label #3 (VI)** (L77 both) · `news` · `search`/`menu`. **No** `blog`/`domesticTours`/`internationalTours` key.
- `common` consumers (only 3): header (`:37,:48,:72,:81,:97`), footer (`footer.tsx:47` t("explore"), `:63` t("planTrip"), `:79` t("about")), sitemap page (`sitemap/page.tsx:37,57,69,70,71,87,101`). → Removing keys or changing values breaks footer/sitemap headings; keys must STAY.
- `footer.blog` exists separately (`en.json:520` "Stories & Blog") — different namespace, not reusable for `common`.
- "Tour trong nước"/"Tour nước ngoài": zero matches repo-wide → new keys required in BOTH files (parity: `tests/unit/i18n-parity.test.ts:46-59` deep key-set equality).

## B. Routes & data
- `/blog` exists (`blog/page.tsx`, server comp, static metadata, ns `blog`, lists stories) ✓. `/deals` exists (`deals/page.tsx`, static cards from `t.raw("items")`, placeholder/disclaimer copy) ✓.
- `src/app/[locale]/[...rest]/page.tsx:12` = unconditional `notFound()` 404 shim; static segments win (precedent `plans/260926-1601:21`). No conflict for `/tours/*`.
- **No domestic/international concept anywhere**: Sanity `destination.region` = `north|central|south` enum (`src/sanity/schemaTypes/destination.ts:21-33`); no country/scope field; grep domestic|international|trong nước|nước ngoài → 0 code hits (only prose in messages). All inventory is Vietnam.
- Listing-page template: `explore/destinations/page.tsx` (server comp, static metadata `:15-18`, `getTranslations`, `container mx-auto px-4 py-16` + centered h1 `:45-49`, `Link` from `@/i18n/navigation`). Simpler siblings: `deals/page.tsx` (45 ln), `blog/page.tsx` (45 ln).
- Sitemaps: `src/app/sitemap.ts:8-32` routes array (has /deals `:20`, /blog `:25`) → add new routes there. HTML `sitemap/page.tsx:66-78` discover group (has /deals `:70` + /blog `:76`).
- Header rendered once: `src/app/[locale]/layout.tsx:16`. No secondary nav components exist.

## C. Test impact
- `tests/browser/j-about-contact.mjs`: `:38` collects `header a`; `:39` no /about (keep); **`:40` "keeps /explore" + `:41` "keeps /culture" → WILL FAIL, must be updated**; `:54` sheet no /about (keep).
- `tests/browser/g-header.mjs`: no /trip-planner checks, keeps /my-trips + /search — **no assertions on the 5 legacy hrefs or nav count → unaffected**.
- `f-ui.mjs:53` my-trips entry → unaffected. `d8-a11y.mjs` → no nav-landmark checks. **No test anywhere asserts nav item count.**
- Precedent for editing existing assertions when spec changes: `f-ui.mjs` F7 theme edit, `c-booking.mjs` B6 scope edit (both changelog-documented).
- Harness: Puppeteer (no getByRole) — selectors + `$$eval`, `page.goto` + status, `dismissPromo` after every load.

## Open items resolved by binding decisions
Route names (`/tours/{domestic,international}`) · EN labels ("Domestic Tours"/"International Tours"/"Blog") · static pages not CMS (no data backing) · j J1 patch allowed (documented).

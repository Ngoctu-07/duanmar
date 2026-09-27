# Code Review — Price tier block (adversarial)

- Feature: "Price" — static price-by-group-size table, uppercase, `text-destructive`, under tour description on itinerary + destination detail pages; data from `tourPricing` Sanity doc; VI→VND / EN→USD.
- Reviewer: code-reviewer · Date: 2026-09-26 · Mode: report-only (no files modified)
- Inputs read: all 9 changed files, `destinations.ts`, both detail pages, `globals.css`, `i18n/routing.ts`, `i18n/request.ts`, `sanity/lib/client.ts`, `robots.ts`/`sitemap.ts`, phase-01 plan, `docs/` (only `project-changelog.md` + framework doc exist).
- Pre-verified (taken as given): lint 0, tsc 0, build exit 0, 200/404 unchanged, block hidden without doc, screenshots red+uppercase.

**VERDICT: REQUEST_CHANGES**

---

## Critical

- **None found.**

## Major

1. **Temporary harness is a real, crawlable production route** — `src/app/[locale]/price-preview/page.tsx:1-57`.
   - Ships as `/[locale]/price-preview` in every build; `robots.ts` only disallows `/studio` (`src/app/robots.ts:8-9`), sitemap omits it but URL guessing/crawling still works.
   - Contains hardcoded sample prices (`:5-38`) — if it survives release it displays fabricated prices on a public URL, violating the project's never-fabricate rule.
   - Hardcoded English UI strings (`:50` "Price block preview", `:51-53` "Temporary harness…") shown in the VI locale too — i18n rule violation inside the harness.
   - **Blocking:** delete before merge (plan itself says "intended to be DELETED after sign-off"). If it must survive a few days: add `robots` noindex + exclude from any nav, and track deletion explicitly.

2. **Unhandled Sanity rejection turns "missing pricing" into a 500** — `src/app/[locale]/explore/itineraries/[slug]/page.tsx:48-55` and `src/app/[locale]/explore/destinations/[slug]/page.tsx:49-57`.
   - Itinerary content is 100% local (messages, `getItinerary` `:28-34`); before this feature the page had **zero** Sanity dependency. Now a CDN/network/auth failure in `client.fetch` rejects inside `Promise.all` → unhandled → whole page 500s, even though the spec says missing pricing must simply render nothing.
   - Destination page: pricing failure 500s the page even when the destination doc loaded fine (previously only the destination fetch could fail).
   - **Fix:** `client.fetch(...).catch(() => null)` (or try/catch → `null`) for the pricing slot; the block already hides on `null`.

3. **Null/undefined tier numbers render fabricated or absurd prices** — `src/lib/pricing.ts:33-39` + `:42-52`.
   - Verified in node: `format(null)` → `$0.00` / `0 ₫` (a **fabricated zero price**), `format(undefined)` → `$NaN` / `NaN ₫`.
   - Studio validation (`tour-pricing.ts:50-68`) blocks this on the happy path, but API/CSV-seeded docs, future field renames, or partial projections bypass it. The project rule is absolute: never fabricate prices.
   - **Fix:** in `mapPricingTiers`, drop tiers where `minGuests`/`pricePerGuest*`/`groupTotal*` are not finite numbers; if the surviving list is empty → `[]` → block already renders nothing.

4. **Schema allows range-inverted and duplicate tiers** — `src/sanity/schemaTypes/tour-pricing.ts:33-45`.
   - No cross-field rule: editor can save `minGuests: 5, maxGuests: 3` → UI prints `5–3 guests` (`price-block.tsx:51-54`); duplicate `min/max` pairs → duplicate React `key` (`price-block.tsx:58`) → key-collision warning and ambiguous rows.
   - Plan step 2 required validation `maxGuests >= minGuests` semantics and `tourSlug` "unique per tour" (`plans/260926-1915-price-tier-block/phase-01-implement-price-block.md:79`); cross-field rule not implemented.
   - **Fix:** `rule.custom()` on `tiers` enforcing ascending, non-overlapping, unique `minGuests` and `maxGuests >= minGuests`.

## Minor

1. **PriceBlock has no bottom spacing → butts against the itinerary day list** — `price-block.tsx:23` (`mt-6` only) + `itineraries/[slug]/page.tsx:79-81`. `space-y-6` on `<ol>` does not margin its *first* child, so the price card's bottom border sits flush on the first day card's top border (summary's `mb-10` only widens the gap *above* the block). Add `mb-6`/wrapper margin; destination page unaffected (block is last, `destinations/[slug]/page.tsx:99`).
2. **Scrollable region not keyboard accessible** — `price-block.tsx:29`. `overflow-x-auto` wrapper scrolls horizontally on narrow viewports but has no `tabIndex={0}` (WCAG 2.1.1). Attribute works fine in a server component.
3. **Tier display order is authored order** — `queries/tour-pricing.ts:4-14` has no ordering and `mapPricingTiers` (`pricing.ts:28-40`) does not sort → an editor can publish `8+` above `2`. Sort by `minGuests` in `mapPricingTiers`.
4. **Duplicate `tourSlug` docs → nondeterministic price** — query takes `[0]` with no `order(...)` (`tour-pricing.ts:4`) and the schema can't detect duplicates (`tour-pricing.ts:12-19`). Two docs for one slug → arbitrary winner. Mitigate: `| order(_updatedAt desc)` before `[0]`, plus a Studio note/validation or query the count.
5. **404 slug still pays for a pricing round-trip** — `destinations/[slug]/page.tsx:49-59`: `Promise.all` fires the pricing fetch before `notFound()`. Perf-only; same fix as Major #2 (catch + optional lazy).
6. **No Studio feedback that `tourSlug` matches a real tour** — `tour-pricing.ts:13-19` free-text string; itinerary slugs are message keys (`itineraries/[slug]/page.tsx:28-34`), destination slugs are `slug.current`. A typo silently hides the block (acceptable per rule, but editors get no signal). Consider a `description` hint listing known slugs or a custom validation for destinations.
7. **English singular grammar hole** — `messages/en.json:8` `"guestsSingle": "{count} guests"` renders `1 GUESTS` for a 1–1 tier. Use ICU plural (`{count, plural, one {# guest} other {# guests}}`) — VI unaffected.
8. **`groupTotal` meaning undefined for range tiers** — `tour-pricing.ts:25,59-68` never says the total is for the *minimum* group size. The harness proves the confusion: 3–4 guests @ `$67` shows `$201` (= 67×3, not 67×4) — `price-preview/page.tsx:14-21`. Editors will author rows readers perceive as math errors. Document the convention in the field description (disclaimer alone won't fix it).
9. **USD shows cents; plan expects whole dollars** — `formatPrice` (`pricing.ts:48-51`) → `$75.00`, plan test T5 expects `$80` (`phase-01-implement-price-block.md:113`). Confirm intent (`maximumFractionDigits: 0` for USD if prices are whole-dollar).
10. **Changelog/docs entry missing** — `docs/project-changelog.md` has no entry for this feature yet, and plan line 89 requires an explicit uppercase-readability note there (documentation-management rule). Defer to sign-off, but don't skip.

## Nit

- `getLocale()` from `next-intl/server` could replace the `locale` prop (`price-block.tsx:15`, pages `:99`/`:79`) — one less way to desync.
- `getCurrency` called twice per page (page prop + inside `mapPricingTiers`, `pricing.ts:32,37-38`) — return `{tiers, currency}` from one helper so tiers and formatter can never disagree.
- No `<caption>` on the table (`price-block.tsx:30`); `aria-labelledby` covers naming, caption would help SR table announce.
- No `tabular-nums` on price cells → column digits jitter across rows.
- Static id `tour-price-heading` (`price-block.tsx:22,25`) collides if the block is ever rendered twice on a page (not the case today).
- Accepted plan deviations (both improvements, no action): `PriceTier` lives in `src/lib/pricing.ts` instead of colocated (`phase-01:52`); query in new `queries/tour-pricing.ts` instead of `queries/destinations.ts` (`:69`); messages stored sentence-case with block-level CSS `uppercase` instead of pre-uppercased strings (`:83`) — renders identically.

---

## Areas checked — NO FINDINGS

1. **Server/client boundary — clean.** No `"use client"` anywhere under `src/components/pricing`, `src/lib/pricing.ts`, or the harness (grep). `getTranslations` from `next-intl/server` is legal in an RSC; `PriceBlock` is imported only by server pages (grep: 3 call sites, all `page.tsx`); props (`tiers`, `locale`, `currency`) are plain serializable values; early `return null` before `await` is fine (no hook rules involved).
2. **Locale → currency → Intl formatting — clean (behaviorally verified).** `routing.locales = ["en","vi"]` (`src/i18n/routing.ts:4`) and `request.ts:7` rejects anything else, so the exact-match `locale === "vi"` test (`pricing.ts:24-26,47`) is safe. Ran node: VI→`1.850.000 ₫` (vi-VN/VND, 0 fraction digits), EN→`$75.00` (en-US/USD). No exchange-rate math anywhere. Uppercase transform leaves `₫` intact. (Cents display tracked as Minor #9.)
3. **i18n parity — clean.** Programmatic check: `en.pricing` and `vi.pricing` both exactly 8 keys (`label, tier, perGuest, groupTotal, guestsRange, guestsSingle, guestsAtLeast, disclaimer`) and every ICU placeholder set matches per key. Every key used by the component exists in both files; zero hardcoded English in `price-block.tsx`.
4. **Fetch options — clean.** `perspective: "published"` + `stega: false` are correct for public render (client has no stega enabled anyway — `sanity/lib/client.ts:5-9` — so this is explicit, not a change); matches the existing `getDestination` convention. `Promise.all` usage is correct (no ordering change: `notFound()` still runs after the await at `destinations:59` / `itineraries:57`, `generateMetadata`/`generateStaticParams` untouched). **Build risk: none new** — `prerender-manifest.json` shows no prerendered detail routes (only 4 global routes; `destinations/[slug]` listed under `dynamicRoutes`), i.e. these pages render dynamically because `setRequestLocale` is never called, so the pricing query runs per request, not at build. Build still touches Sanity only via the pre-existing `DESTINATION_SLUGS_QUERY`. (See unresolved Q4 for the forward-looking case.)
5. **Accessibility — heading/landmark semantics clean.** Both pages go `h1` → PriceBlock `h2` → (itinerary only) day `h2` (`itineraries:75` then `:88`); no skipped levels, no duplicate `h1`, and grep confirms layout/nav/footer components contain no `h1/h2` at all. `aria-labelledby` → unique id (single instance per page, grep), `<th scope="col">` / `<th scope="row">` correct, real `<table>` semantics (not divs), `overflow-x-auto` for narrow screens. Only the scroll-focus gap (Minor #2).
6. **Visual tokens — clean.** Only `uppercase text-destructive bg-card border` + `border-destructive/30` and `/10`; no `text-red-*`, no `bg-muted`. `border` resolves to `--border` (not `currentColor`) thanks to the base rule `globals.css:119-122`; tokens `globals.css:53,65,88,100`. Contrast computed: light `oklch(0.577 0.245 27.325)` (= red-600 ≈ `#dc2626`) on white ≈ **4.8:1** → passes AA for the 12–14px text; dark ≈ **6.8:1** → passes.
7. **Project rules — clean.** Largest changed file 103 lines (all <200); kebab-case filenames (`tour-pricing.ts`, `tour-pricing.ts` query, `price-block.tsx`, `pricing.ts`); registry updated in existing style (`schemaTypes/index.ts:5,8`); 0 new dependencies (imports are sanity/next-sanity, next-intl, next, react — all pre-existing).
8. **Regression — clean apart from Major #2.** Destination page `Promise.all` merely grew a third slot; `notFound` ordering, metadata, static params, image/region markup unchanged. Itinerary page `notFound` ordering unchanged. No pre-existing query/projection was edited (`destinations.ts` untouched — the plan's optional projection edit for method B was correctly skipped).

---

## Unresolved questions

1. Has the price-preview harness been signed off? Who deletes `src/app/[locale]/price-preview/page.tsx` before merge — needs an explicit owner/checklist item.
2. Should EN display whole dollars (`$75`) per plan T5, or is `$75.00` accepted?
3. Editorial convention for `groupTotal` on a range tier: total for `minGuests` (what the sample implies) or for `maxGuests`? Needs to be written into the schema field description.
4. Confirm intended rendering mode: pages are currently dynamic (no `setRequestLocale`). If anyone later adds `setRequestLocale` for SSG, the pricing fetch moves into `next build` and a Sanity outage then fails the build — worth a code comment or plan note.
5. Who enforces `tourSlug` uniqueness (Major #4 / Minor #4): Studio-side convention, a custom validation query, or `order(_updatedAt desc)` in GROQ?

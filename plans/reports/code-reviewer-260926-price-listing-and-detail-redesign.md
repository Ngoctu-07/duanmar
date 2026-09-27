# Code Review — price listing range + detail redesign (Style A)

Date: 2026-09-26 · Reviewer: code-reviewer (adversarial, read-only) · Plan: `plans/260926-2118-price-listing-range-and-detail-redesign/plan.md`

## Summary verdict

**Ships with 1 Major.** Feature correct against approved decisions in current data state (1 pricing doc). One data-integrity edge: duplicate `tourSlug` newest-doc-unusable → listing shows stale price while detail shows nothing (violates "no data → render nothing"). Plus DRY nits. All other red-team axes clean: no NaN/inverted/label-without-price path, client boundary safe, a11y/semantics preserved, i18n parity, no hardcoded price text, no schema/dependency changes.

## Findings

| Severity | File:line | Issue | Fix |
|---|---|---|---|
| **Major** | `src/lib/pricing.ts:131-141` (claim @133, skip @138) | Duplicate-slug handling: slug only "claimed" when usable price found. Newest doc for slug with no tiers/no valid price → `continue` without claiming → **older doc's range leaks**. Detail uses `TOUR_PRICING_BY_SLUG_QUERY ... order(_updatedAt desc)[0]` (newest) → detail hides block, listing shows stale price. Comment L120-125 ("first doc per slug wins, matching single-doc detail query") false on this path. Not manifestable today (1 doc) but triggers the moment user adds/empties a 2nd doc for same slug. | Claim slug before validating: `ranges[slug] = {}` when seen, fill only if usable (`{}` → `perCurrency[...]` undefined → `formatPriceRange` null → no label ✅). Or dedupe to `[0]` per slug inside query. |
| Minor | `src/lib/pricing.ts:111-112` | `isUsablePrice` accepts `0` → authored `0` renders `0 ₫` / `$0` on card (answer to focus Q "can any path render 0": **yes**). Detail `mapPricingTiers` L56 also `>= 0` (pre-existing, consistent). | `value > 0` in both (confirm authored 0 never legit/free tier). |
| Minor | `src/app/[locale]/page.tsx:24-26`, `explore/destinations/page.tsx:38-40`, `explore/itineraries/page.tsx:26-28` | Same 4-line `client.fetch(ALL_TOUR_PRICING_QUERY, …{perspective,stega}).catch(() => null)` block ×3 — DRY. | Extract `fetchAllTourPricing()` next to query/lib; pages keep `buildPriceRangeLabels(docs, locale, priceT("label"))`. |
| Minor | `src/components/homepage/featured-destinations.tsx:7-14` | Duplicate `Destination` interface; `destination-card.tsx:8` already exports identical one (likely pre-existing, no git to confirm). | `import type { Destination } from "@/components/explore/destination-card"`. |
| Nit | `src/sanity/queries/tour-pricing.ts:18` | `order(_updatedAt desc)` ties non-deterministic → with duplicate slugs, first-wins pick can flip between renders. | Secondary key: `order(_updatedAt desc, _id asc)`. |
| Nit | `src/app/[locale]/page.tsx:17-27` | Two sequential `Promise.all` rounds (locale/t before fetches); other 2 pages do 1 round → needless sync latency. | Merge into single `Promise.all`. |
| Nit | `src/components/pricing/price-block.tsx:33-38` | `role="region"` + `tabIndex={0}` always in tab order even when table doesn't overflow. | Acceptable common pattern — keep unless strict audit demands conditional. |
| Nit | `explore/destinations/page.tsx:15-18`, `explore/itineraries/page.tsx:9-12` | Hardcoded EN metadata (likely pre-existing, out of feature scope). | Localize in separate task. |

## Red-team answers (focus list)

- **Query**: `defined(tourSlug)` ✅ · projection lean (slug + 2 fields) ✅ · `.catch(() => null)` on all 3 new fetches ✅ (detail fetches pre-existing, also caught) · duplicate slug = Major above · tie determinism = Nit.
- **Data integrity**: `NaN`/`Infinity`/negative filtered ✅ · inverted impossible (Math.min/max) ✅ · label-without-price impossible (double guard: `buildPriceRangeLabels` L167 + `price-range.tsx:13`) ✅ · `min===max` single price ✅ · **`0` renderable** = Minor · whitespace/empty slug guarded (GROQ `defined` + `trim()` L132) ✅.
- **Client/server boundary**: `price-range.tsx` type-only import (`lib/pricing.ts` pure, no server deps) ✅ · props `{label,text}` plain serializable ✅ · no server-only import pulled into `featured-destinations` client bundle ✅.
- **Redesign regressions**: `aria-labelledby` on section+region ✅ · `th scope=col×3` / `scope=row` ✅ · `tabular-nums` listing (`price-range.tsx:20`) + detail (L73,76) ✅ · `overflow-x-auto` + `min-w-[20rem]` + focusable region = mobile scroll ✅ · Style A: `p-5`, caps red GIÁ, neutral bold tier, red per-guest, muted total, sentence-case muted disclaimer, red accent only ✅ · contrast AA (pre-verified, light theme only — see Unresolved).
- **i18n**: `priceRange.label` present EN+VI ✅ · `pricing` 8-key parity ✅ · label passed via `priceT("label")`, no hardcoded EN/VI price strings in components (grep clean) ✅ · single-currency doc → other locale renders nothing (correct per no-FX decision) ✅.
- **Rules**: kebab-case ✅ · all files <200 (max `pricing.ts` 171) ✅ · comments substantive not noise ✅ · KISS/YAGNI — `buildPriceRanges`/`formatPriceRange` exported but only consumed by `buildPriceRangeLabels` + tests (acceptable: plan-mandated testable pure fns) ✅ · no mock/temp/TODO ✅ · no new deps, no schema change, `mapPricingTiers`/`formatPrice` intact ✅.

## What's good

- Fail-safe defaults everywhere: fetch error → `null` → `{}` → component returns `null`; cards unchanged visually.
- Listing↔detail use same slug key + same `_updatedAt desc` ordering + same currency gate → consistent in normal case.
- `price-range.tsx` 25 lines, single responsibility, reusable in client + server trees.
- No `cn` util in codebase → className string concat matches existing convention.

## Unresolved questions

1. `docs/code-standards.md` absent (only `vietnam-tourism-website-framework.md`, `project-changelog.md`) — reviewed against `.claude/rules/development-rules.md` only.
2. Not a git repo → cannot prove pre-existing vs new for duplicate `Destination` interface + hardcoded metadata.
3. Contrast verified on light theme only — dark-mode `--destructive`/muted tokens unverified.
4. Is authored `0` ever a legitimate free tier? Decides Minor fix `>= 0` → `> 0`.

**Status:** DONE_WITH_CONCERNS
**Summary:** Feature compliant with all approved decisions and verified behavior; 1 Major (duplicate-slug stale-price leak in `buildPriceRanges`) should be fixed before a 2nd pricing doc exists, plus DRY/minor nits.
**Concerns/Blockers:** Major finding above; unresolved dark-mode contrast + 0-price semantics.

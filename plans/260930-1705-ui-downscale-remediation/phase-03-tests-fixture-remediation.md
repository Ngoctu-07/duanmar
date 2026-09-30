# Phase 3: u-test Threshold Rewrite + Dynamic Fixture + Stroke Assertions

**Plan**: [`plan.md`](plan.md) · **Est**: 1h · **Status**: completed · **Files**: 2 modify, 0 create · **Depends**: P1 + P2 implemented

## Context Links
- `tests/browser/u-icon-switcher-price.mjs` (276 lines) is the size/weight authority (U1–U9) · helper `tests/helpers/cms-expectations.mjs:27` (`fetchTourPricing`)
- **Known defect folded in (1544 code-review Major — verified live)**: `u-test:179` static `fetchTourPricing("hcm")` → CMS reseed removed `hcm` → `pricingDoc=null` → `:180-182` takes the skip branch with `check(..., true)` → **10 else-branch assertions (`:193,:194,:199,:225,:237,:240,:246,:247,:258,:263`) silently never run while the file exits 0** (full-run evidence: `U8 … (skipped: no tiers) :: no tiers for hcm`)
- **Fixture probe (2026-09-30)**: live `tourPricing` slugs = `bi-an-ha-noi` (1 tier, clean) and `"mat-ma-do-thi "` (trailing space → app's exact-slug lookup misses → detail page has NO PriceBlock — must be rejected). Destination pages: `hcm` → 404; `bi-an-ha-noi`/`mat-ma-do-thi`/`nyc` → 200. **12-probe U8 dry-run on `bi-an-ha-noi` = PASS end-to-end** (detail cells 28/900 → will be 22.4/600 post-P2, 375 overflow ok, checkout form, date pick, summary, travel-date F7 classes, momo QR, payable, 0 pageerrors)

## Decision: dynamic fixture (locked)
- New helper in `tests/helpers/cms-expectations.mjs`: `export async function resolveTourPricingFixture()` → `{ slug, doc } | null`:
  1. `*[_type == "tourPricing" && count(tiers) > 0]{tourSlug, tiers}` (pricing docs with ≥1 tier)
  2. `*[_type == "destination" && defined(slug.current)]{ "slug": slug.current }` (precedent `src/sanity/queries/destinations.ts:56`)
  3. Intersect on **EXACT string equality** (no trim) — mirrors the app's exact-slug pricing lookup, so `"mat-ma-do-thi "` is correctly rejected; deterministic `sort()`; today yields `bi-an-ha-noi`
  4. Reuse `fetchTourPricing(slug)` for the doc or return `doc` from step 1 directly (KISS: one extra HTTP round-trip max)
- **Never hardcode the replacement slug** (reseed would repeat this bug); `bi-an-ha-noi` is today's outcome, not an input
- **Loud skip**: if resolver returns null (CMS empty/changed) → `results.push(\`SKIP U8 … (N assertions)\`)` + `skips.push(...)` + `console.warn("SKIPPED: …")` before exit — **forbidden**: `check(..., true)` placeholder (hides red as green). Skip stays non-fatal (CMS data outage must not fail the code suite) but is counted and printed in both results and stderr
- Integration: `:179` → `const fx = await resolveTourPricingFixture().catch(() => null); if (!fx) { loud-skip } else { … }`; `:184` detail URL → `/vi/explore/destinations/${fx.slug}`; `:202` checkout → `?tour=${fx.slug}`; `:180` tiers check becomes redundant (resolver guarantees tiers) — keep a defensive `fx.doc.tiers.length` guard inside the else

## Assertion rewrite table (check @ line → old threshold → new threshold)
| Check | line | OLD | NEW |
|---|---|---|---|
| U1 search icon | `:68` | 28×28 (`near 28`), name "size-7…" | **24×24**, name "size-6…" |
| U1 my-trips icon | `:69` | 28×28 | **24×24** |
| U1 icon buttons | `:70` | 36×36 | unchanged (never upscaled) |
| U2 hero adornment | `:81` | 24×24 | **20×20** |
| U2 pl-10 clearance | `:82` | right ≤ inputLeft+41 | unchanged (20px icon passes) |
| U2 quick-access ×5 | `:84` | all 28×28 | **all 24×24** |
| U2 /search adornment | `:87` | 24×24 | **20×20** |
| U3 group height+fs | `:92` | h≥32 ∧ fs≥14 | **h≥28 ∧ fs≥12** (actual ≈30/12) |
| U3 buttons ≥32 | `:93` | h≥32 ×2 | **h≥26** ×2 (actual ≈28) |
| U3 active fw | `:97` | fw≥800 | **fw≥600** (semibold) |
| U3 inequality | `:99` | active.fw > inactive.fw | unchanged (600>400 ✓) + opacity pair unchanged |
| U4 active fw | `:112` | fw≥800 | **fw≥600** |
| U5 trigger box | `:124` | 72–90 (expect 80) | **47–49** (`near 48`, name "48±1") |
| U5 trigger icon | `:125` | 36–44 (expect 40) | **23–25** (name "24±1") |
| U6 sheet-trigger icon | `:134` | 28×28 | **24×24** |
| U6 sheet link icons | `:143` | 24×24 | **20×20** |
| U6 mobile trigger | `:152` | 80±1 (+viewport bounds) | **48±1** (+ bounds unchanged) |
| U7 card value | `:172` | fs≥24 ∧ fw≥800 | **fs≥14 ∧ fw≥600** |
| U7 label+ratio | `:173` | label≤13 ∧ ratio≥2 | label≤13 ∧ **ratio≥1.2** (14.4/12=1.2000000000000002) |
| U7 value vs h3 | `:174` | value fs > h3 fs | **semantic flip: value fs < h3 fs** (title regains primacy = 60% tier intent; rename check) |
| U7 inside card | `:175` | rect inside | unchanged |
| U8 fixture | `:179` | static `fetchTourPricing("hcm")` | **dynamic `resolveTourPricingFixture()`** |
| U8 skip branch | `:180-182` | `check(…, true)` ×2 (silent) | **loud SKIP (count + warn), no check(true)** |
| U8 detail URL | `:184` | `/destinations/hcm` | `/destinations/${fx.slug}` |
| U8 detail cells | `:193` | fs≥28 ∧ fw≥800 | **fs≥22 ∧ fw≥600** (22.4) |
| U8 thead labels | `:194` | th≤13 | unchanged |
| U8 detail 375 overflow | `:199` | sw≤iw | unchanged |
| U8 checkout URL | `:202` | `?tour=hcm` | `?tour=${fx.slug}` |
| U8 live total | `:225` | fs≥36 ∧ fw≥800 | **fs≥28 ∧ fw≥600** (28.8) |
| U8 date cell + summary rendered | `:237,:240` | boolean | unchanged |
| U8 summary total dd | `:246` | fs≥28 ∧ fw≥800 ∧ text-primary | **fs≥22 ∧ fw≥600** ∧ text-primary (22.4) |
| U8 travel-date F7 guard | `:247` | `font-semibold`+`text-primary` | **unchanged** (goes LIVE — previously skipped) |
| U8 payable | `:258` | fs≥40 ∧ fw≥800 | **fs≥32 ∧ fw≥600** |
| U8 checkout 375 overflow | `:263` | sw≤iw | unchanged |
| U9 pageerrors | `:267` | ===0 | unchanged |
- Also update file header comment `:6` (authority = plan `260930-1705`, supersedes 1544 thresholds) and every check **name string** carrying old sizes (U1/U2/U5/U6/U7/U8 names) — names are the human-readable spec.

## NEW stroke-width checks (6 — one per touched context, ≤1.5)
| # | where | method |
|---|---|---|
| S1 | U1 block (after `:69`) | `readStyle(…, ["strokeWidth"])` on both header svgs → `parseFloat ≤ 1.5` |
| S2 | U2 block (`u2a` + `u2c`) | add `strokeWidth` to evaluate reads → both adornments ≤ 1.5 |
| S3 | U2 quick-access (`u2b`) | add stroke read → **all 5** ≤ 1.5 |
| S4 | U5 block (`u5`) | add stroke read on trigger svg → ≤ 1.5 |
| S5 | U6 block (`u6sheet`) | add stroke read → both sheet-link svgs ≤ 1.5 (sheet-trigger covered by S1's sibling `:134` — add stroke read there too) |
| — | implementation note | `getComputedStyle(svg).strokeWidth` returns `"1.5px"` post-change (`parseFloat` handles; probe-verified) |

## Regression verification (this phase)
- Grep audit (already run): **no non-`u-*.mjs` test asserts `size-7`/`h-5 w-5`/`stroke-width`/`text-2xl`/`font-black`/`fw≥800`** — only unrelated `o-footer` `text-4xl` wordmark + `x-blog` `text-4xl|5xl` headline
- Selector-contract re-checks after edits: U7 `p.text-xs` discovery (`:160`) intact · `r-entry-popup-cms.mjs:235` lowercase `en|vi` textContent · `c-booking.mjs:111`/`s-tour-hero.mjs:190` `aria-pressed` counts (switcher untouched there) · `i-ai-assistant.mjs` trigger = visibility/aria/375 only (48px fine)
- Standalone run target: `node tests/browser/u-icon-switcher-price.mjs` → **all checks ok, `SKIP` lines = 0** (fixture resolves), exit 0; `console.warn` absent

## Acceptance Criteria
- [ ] Every threshold above updated (nothing deleted; U7 `:174` flipped with new name, not removed)
- [ ] U8 runs live on `bi-an-ha-noi` (or whatever resolver picks): 10 previously-skipped assertions execute
- [ ] 6 stroke checks present and green; loud-skip path unit-sane (resolver null → WARN + counted SKIP, never `check(true)`)
- [ ] `npm run lint` 0 · `npx tsc --noEmit` 0

## Out of scope (see unresolved Q in plan.md)
- `c-booking`/`c-payment`/`f-ui`/`h4-p4-e2e`/`d8`/`g-reviews`/`k`/`n`/`p-tours`/`s-tour-hero` static `hcm` references (10 pre-existing reds) — catalogued in P4; fixing them is a separate controller decision (shared resolver adoption), NOT part of user-approved downscale scope

**Status:** COMPLETED

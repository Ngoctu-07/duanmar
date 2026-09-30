# Phase 2: Price Prominence (200% + font-black)

**Plan**: [`plan.md`](plan.md) · **Est**: 1.5h · **Status**: pending · **Files**: 7 modify, 0 create

## Context Links
- **Full price audit — every `formatPrice(` site in `src` (grep = 9 hits) + range renderer**:

| # | Renderer | file:line (value) | today | after (exact 200%) |
|---|---|---|---|---|
| 1 | `PriceRangeRow` value span | `src/components/pricing/price-range.tsx:20-22` | 12px / 600 (`text-xs font-semibold`) | **24px / 900** `text-2xl font-black` |
| 2 | `PriceBlock` per-guest cell | `src/components/pricing/price-block.tsx:73-75` | 14px / 600 | **28px / 900** `text-[1.75rem] font-black` (keep `tabular-nums text-primary`) |
| 3 | `PriceBlock` group-total cell | `src/components/pricing/price-block.tsx:76-78` | 14px / 400 muted | **28px / 900** `text-[1.75rem] font-black` (keep `text-muted-foreground`) |
| 4 | booking live total | `src/components/booking/booking-pricing-section.tsx:72-74` | 18px / 600 `text-lg font-semibold` | **36px / 900** `text-4xl font-black` |
| 5 | payment payable amount | `src/components/booking/booking-payment-section.tsx:169-171` | 20px / 600 `text-xl font-semibold` | **40px / 900** `text-[2.5rem] font-black` |
| 6 | checkout summary total row | via `ticket-rows.ts:57-65` → `booking-summary.tsx:127-133` `<dd>` | 14px / 600 (`row.strong`) | **28px / 900** `text-[1.75rem] font-black text-primary` (new `row.price` branch) |
| 7 | My Trips detail total row | same rows → `my-trips-detail.tsx:98-104` `<dd>` | 14px / 600 | **28px / 900** (identical branch — shared flag) |

- **Consumers covered DRY** (no per-call-site edits): `PriceRangeRow` renders in `destination-card.tsx:79` (→ homepage `featured-destinations.tsx:33`, tours `tour-category-section.tsx:50`, `/tours` search `tour-search-results.tsx:46`, `/explore/destinations` page `:86`) **and** `/explore/itineraries` `page.tsx:52` = **6 call sites, 1 component edit**. `PriceBlock` renders at `explore/destinations/[slug]/page.tsx:92` + `explore/itineraries/[slug]/page.tsx:77` = 1 edit. `buildTicketRows` feeds `booking-summary.tsx:46` + `my-trips-detail.tsx:58` = 1 flag edit (comment at `ticket-rows.ts:23-25` mandates both stay identical).
- **Audit negatives (re-verified, do not invent components)**: no sticky booking bar exists (`grep sticky src` → only `header.tsx:36`); `/search` page (`search-client.tsx`) renders **no prices** (only normalize/match logic); `/explore/destinations` region filters are plain links with no price UI; no price filter/`PriceInput` anywhere. Formatting helpers `src/lib/pricing.ts` (`formatPrice` :116, `formatPriceRange` :191, `buildPriceRangeLabels` :210) = **logic untouched** (presentational classes only).
- **Measured baseline**: card value = fs 12, fw 600, color primary; label fs 12 fw 450 muted (`price-range.tsx:19`).

## Decisions (KISS/YAGNI/DRY)
1. **Exact 2× via standard steps where they exist** (`text-2xl`=24, `text-4xl`=36) **and arbitrary values where they don't** (`text-[1.75rem]`=28 from 14, `text-[2.5rem]`=40 from 20) — literal user requirement "double font size (200%)", so no 24-vs-30 rounding drift.
2. **`font-black` (900) on every figure** (user: `font-bold`/`font-black`); hierarchy kept via color only (`text-primary` vs `text-muted-foreground`) — one decision, no per-site weight bikeshedding.
3. **Shared-primitive edits only**: `PriceRangeRow` (covers 6 sites), `PriceBlock` (2), `TicketRow.price` flag (2) = DRY; **no** edits inside `destination-card.tsx` / listing pages.
4. **Explicit exclusions (be precise)**: booking per-guest **sentence** `booking-pricing-section.tsx:64-69` — figure is an interpolation inside an i18n string (`t("perGuest", {price,…})`), styling part of a sentence requires message surgery → YAGNI, leave 14px. Also untouched: all labels/`text-xs` section headings (`price-block.tsx:28,41`, `booking-pricing-section.tsx:38`), table `thead` (`price-block.tsx:41-51`), disclaimer `:86`, `dt` labels, "payable" label `:168` (test reads it as anchor then styles sibling — `c-payment.mjs:112-116`).
5. **`flex-wrap` added to `PriceRangeRow`** (layout mitigation): label(≈82px) + 24px value(≈266px) exceeds md/2-col content width (≈308px) → without wrap the `overflow-hidden` card (`destination-card.tsx:45`) would clip the price. With `flex-wrap gap-x-3 gap-y-1`, value drops to its own line; long ranges (e.g. 35.000.000 ₫ – 89.000.000 ₫) wrap at spaces instead of overflowing.

## Implementation Steps (ordered)
1. **`src/components/pricing/price-range.tsx`**
   - `:16-18` `<p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs ${className}">` (add `flex-wrap`, split gap)
   - `:20` value span → `className="text-2xl font-black tabular-nums text-primary"` (label span `:19` untouched)
2. **`src/components/pricing/price-block.tsx`**
   - `:73` → `className="py-2.5 pl-4 text-right text-[1.75rem] font-black tabular-nums text-primary"`
   - `:76` → `className="py-2.5 pl-4 text-right text-[1.75rem] font-black tabular-nums text-muted-foreground"`
   - Keep `overflow-x-auto` region (`:33-38`, `role=region` + `tabIndex` for keyboard scroll) and `min-w-[20rem]` (`:39`) — table widens & scrolls inside region; assert **page** `scrollWidth <= innerWidth` at 375 in Phase 3.
3. **`src/components/booking/booking-pricing-section.tsx:72`** — `text-lg font-semibold` → `text-4xl font-black`. Prose `:64-69` untouched (Decision 4).
4. **`src/components/booking/booking-payment-section.tsx:169`** — `text-xl font-semibold` → `text-[2.5rem] font-black`. Flex layout `:148` (`flex-col … sm:flex-row`) keeps 40px figure full-width on mobile; overflow re-checked at 375 after selecting a payment method.
5. **`src/components/booking/ticket-rows.ts`** — extend `TicketRow` (`:6-10`) with `price?: boolean`; set `price: true` on the total entry (`:57-65`, alongside existing `strong: true`). `strong` semantics untouched (travel-date row `:40-44` must keep `font-semibold text-primary` → `f-ui.mjs:153`).
6. **`src/components/booking/booking-summary.tsx:127-133`** — dd class template →
   `row.price ? "text-[1.75rem] font-black text-primary" : row.strong ? "font-semibold text-primary" : "font-medium"` (price branch **first**; travel-date row falls into `strong` branch → byte-identical classes).
7. **`src/components/my-trips/my-trips-detail.tsx:98-104`** — identical template change (mirror of step 6; the two renderers must stay in lockstep per `ticket-rows.ts:23-25`).

## Layout-overflow risk map
| Surface | Risk | Mitigation / check |
|---|---|---|
| Destination/itinerary card grid (3-col @1280, 2-col @768) | label+24px value > content width → clip/widen | `flex-wrap` (step 1); assert price fs ≥24 AND card rect contains price rect |
| Price table on tour detail @375 | 28px cells widen table | existing `overflow-x-auto` region; assert page-level `scrollWidth <= 375` |
| Booking summary dl row (`items-baseline`, `gap-4`) | 28px value vs long label | value `text-right`, card `p-5` full column width — assert dd rect right ≤ card right |
| Payment 40px amount next to 192px QR | long totals (9+ digits) | stacked `flex-col` under `sm`; assert page overflow at 375 after QR shows |
| Card `overflow-hidden` (`destination-card.tsx:45`) | silently clips price | `flex-wrap` prevents; visual screenshot in new test |

## Acceptance Criteria
- [ ] All 7 rows in the audit table measure ≥ target font-size (24/28/36/40) with fw ≥ 800 via computed style
- [ ] Card price fs ≥ 2× label fs **and** > card title fs (20px) → price is dominant figure in container
- [ ] No horizontal page overflow at 375 on `/vi`, `/vi/explore/destinations/<priced-slug>`, `/vi/booking/checkout?tour=hcm` (post-QR)
- [ ] `f-ui.mjs` F7 travel-date dd classes unchanged; `c-payment.mjs` D5/D6/D7 total strings unchanged (text content identical — only classes differ)
- [ ] `src/lib/pricing.ts` untouched · `npm run lint` 0 · `npx tsc --noEmit` 0 · `npm test` 26/26

## Verify (after edits)
```bash
node tests/browser/f-ui.mjs && node tests/browser/c-payment.mjs && node tests/browser/c-booking.mjs
node tests/browser/s-tour-hero-carousel.mjs   # PriceBlock above-fold + aria-pressed invariant
```
**Status:** PENDING

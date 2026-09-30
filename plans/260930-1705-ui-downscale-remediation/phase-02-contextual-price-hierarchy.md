# Phase 2: Contextual Price Hierarchy (cards 60% / detail + checkout 80%)

**Plan**: [`plan.md`](plan.md) · **Est**: 0.75h · **Status**: completed · **Files**: 6 modify, 0 create

## Context Links
- Rollback source: `plans/260930-1544-icon-switcher-price-prominence/phase-02-price-prominence.md` (the 200% + `font-black` enlargement)
- Grep evidence: `font-black` exists in `src` at **exactly 7 lines** (table below), `font-extrabold` only in switcher (P1) → refinement touches only these; `src/lib/pricing.ts` formatting untouched
- **Route mapping (user said `/tours/[slug]` — actual routes)**:
  | User context | Real route | Component |
  |---|---|---|
  | Tour detail page (80%) | `/[locale]/explore/destinations/[slug]` **and** `/[locale]/explore/itineraries/[slug]` | `PriceBlock` (renders on both — `src/app/[locale]/explore/destinations/[slug]/page.tsx:1`, `…/itineraries/[slug]/page.tsx:1`) |
  | Listing cards (60%) | `/[locale]/tours` (+search results), homepage featured, `/[locale]/explore/itineraries` index | `PriceRangeRow` via `destination-card.tsx` |
  | User's example URL `…/destinations/hcm` | **404 post-reseed** | manual QA uses `bi-an-ha-noi` instead |

## Locked decision table (element · before → after · % of current)
| Element | file:line | before | after | % of current |
|---|---|---|---|---|
| card price value | `price-range.tsx:20` | `text-2xl font-black` (24px/900) | `text-[0.9rem] font-semibold` (14.4px/600) | **60% exact** |
| detail PriceBlock cells (2 rows) | `price-block.tsx:73,76` | `text-[1.75rem] font-black` (28px/900) | `text-[1.4rem] font-semibold` (22.4px/600) | **80% exact** |
| booking live total | `booking-pricing-section.tsx:72` | `text-4xl font-black` (36px/900) | `text-[1.8rem] font-semibold` (28.8px/600) | 80% (checkout = detail tier) |
| payable amount | `booking-payment-section.tsx:169` | `text-[2.5rem] font-black` (40px/900) | `text-[2rem] font-semibold` (32px/600) | 80% |
| checkout summary total dd | `booking-summary.tsx:130` | `text-[1.75rem] font-black` | `text-[1.4rem] font-semibold` | 80% |
| my-trips total dd | `my-trips/my-trips-detail.tsx:101` | `text-[1.75rem] font-black` | `text-[1.4rem] font-semibold` | 80% |
- All six keep `tabular-nums text-primary` (size + weight only). Weight: all `font-black` → `font-semibold` (user's target; kills 900 "bulky" look).

## Decisions (locked)
1. **Checkout/booking prices = "detail tier" 80% (option a)** — covers booking live total, payable, summary dd, my-trips dd. Justification: (i) matches user's two named contexts conceptually (these are focal conversion prices, not cards), (ii) consistent 2-tier hierarchy (cards 60% vs focal 80%) instead of a third ad-hoc tier, (iii) conversion prices stay prominent. Rejected: (b) global 83.33% → 30/33.3/23.3px — mixes an unrelated percentage into price semantics; (c) leave untouched — leaves 40px/900 "absurd" prices directly contradicting the bulk-refinement goal. Listed as residual unresolved Q (see plan.md).
2. **Card value = `text-[0.9rem]` (14.4px), not `text-sm` (14px)**: exact 60%, AND 14.4/12 = 1.2000000000000002 keeps the U7 ratio assertion `≥1.2` mathematically safe (14px would compute 1.167 and fail). `text-[0.9rem]` verified generatable (TW4 arbitrary values compile — probe in plan.md).
3. **Detail tier exactness**: no Tailwind step equals 22.4/28.8/32 → arbitrary `text-[1.4rem]`/`text-[1.8rem]`/`text-[2rem]` (80% exact; `text-2xl`=24, `text-3xl`=30 both wrong). Card 60% likewise has no standard step (24→14.4; nearest `text-sm`=14 → 58.3%) → arbitrary chosen for exactness + ratio safety (decision 2).
4. **`price-range.tsx:17-19` row container keeps `text-xs`** — U7 discovers the row via `p.classList.contains("text-xs")` (`u-icon-switcher-price.mjs:160`); label span (`text-muted-foreground`, 12px) unchanged. Only the value `<span>` at `:20` changes.
5. **Travel-date dd row unchanged**: `ticket-rows.ts:44` sets `strong: true` only (NOT `price`), so the ternary at `booking-summary.tsx:129-133` / `my-trips-detail.tsx:100-104` takes the `strong` branch → `font-semibold text-primary` stays; only the `price` branch class string changes (size/weight, keeps `text-primary`). F7 guard `f-ui.mjs:153` + u-test `:247` must keep passing (both assert `font-semibold` + `text-primary` on "Ngày khởi hành" dd).
6. **No other price-like figures in scope**: `o-footer-refinement.mjs:149` `text-4xl` = footer wordmark (unrelated), `x-blog-feed.mjs:103` headline (unrelated), email templates (`src/lib/email/`) untouched (not UI).

## Implementation Steps (ordered)
1. `src/components/pricing/price-range.tsx:20` — `text-2xl font-black` → `text-[0.9rem] font-semibold` (span keeps `tabular-nums text-primary`; `:17` p-row and `:19` label untouched)
2. `src/components/pricing/price-block.tsx:73` and `:76` — `text-[1.75rem] font-black` → `text-[1.4rem] font-semibold` (both cells: price + muted comparison; keep `py-2.5 pl-4 text-right tabular-nums …` and their `text-primary`/`text-muted-foreground` colors)
3. `src/components/booking/booking-pricing-section.tsx:72` — `text-4xl font-black` → `text-[1.8rem] font-semibold`
4. `src/components/booking/booking-payment-section.tsx:169` — `text-[2.5rem] font-black` → `text-[2rem] font-semibold`
5. `src/components/booking/booking-summary.tsx:130` — ternary price branch → `"text-[1.4rem] font-semibold text-primary"` (strong/else branches untouched)
6. `src/components/my-trips/my-trips-detail.tsx:101` — same ternary price branch edit (single source pattern shared with step 5 — do both, keep strings identical per DRY)

## Acceptance Criteria
- [ ] Homepage card price: fs 14.4, fw 600, label 12, ratio 1.2, still inside card, p-row still `text-xs`
- [ ] Detail PriceBlock: both td cells fs 22.4 fw 600; thead th ≤13 unchanged; no 375px overflow (table scrolls in region)
- [ ] Checkout: live total 28.8/600 · summary total dd 22.4/600 `text-primary` · payable 32/600; travel-date dd stays `font-semibold text-primary` fs14
- [ ] My-trips detail total dd 22.4/600; grep `font-black` in `src` = 0 after this phase
- [ ] `npm run lint` 0 · `npx tsc --noEmit` 0

## Out of scope (audit negatives)
- Currency formatting/rounding (`src/lib/pricing.ts`), tier resolution, CMS docs — pure presentation change
- Labels/disclaimers/table headers/prose — never enlarged by 1544 (only the 7 value lines were) → untouched
- Homepage/listing label `text-xs` container and h3 card titles (h3 20px regains primacy over 14.4px price — intended; U7 flips accordingly in P3)

**Status:** COMPLETED

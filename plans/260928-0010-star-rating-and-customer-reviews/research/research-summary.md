# Research Summary — Star Rating & Customer Reviews

**Date**: 2026-09-28 · Trust level: verified against working tree (spot-checked `grep`/`read` during planning)

## 1. Tour detail page anchors — `src/app/[locale]/explore/destinations/[slug]/page.tsx`

| Fact | Line | Note |
|---|---|---|
| async server component, `revalidate = 300` (ISR) | :44, :17 | page stays server component; reviews = client subtree |
| `getDestination` fetch (tags `sanity:destination:{slug}`) | :23-27 | Sanity READ only |
| `Promise.all([destination, pricingDoc, t])` | :46-52 | `getTranslations("destinations")` at :51 |
| content wrapper `max-w-3xl` | :80 | all inserts live inside |
| region chip + `BookTicketButton slug={destination.slug.current}` | :81-86 | booking CTA |
| `<h1 className="text-4xl font-bold mb-4">` — NO flex row | :87 | wrap in `flex items-start justify-between gap-3` for badge |
| `<PriceBlock>` closes wrapper | :94-95 | **reviews section inserted between :95 and :96** |
| Destination shape | queries | `{ _id, name, slug:{current}, region, description?, image?{asset:{url,metadata},alt} }` — **no rating field** |

## 2. Badge surfaces (name-bearing cards)

| Surface | File | Name element | Slug source | Planned edit |
|---|---|---|---|---|
| Detail H1 | `src/app/[locale]/explore/destinations/[slug]/page.tsx` | h1 :87 | param `slug` (bookable) | wrap flex, badge top-right |
| Destination card | `src/components/explore/destination-card.tsx` | h3 :46 | `destination.slug.current` (bookable) | wrap `flex items-start justify-between gap-2` |
| Trending itineraries | `src/components/homepage/trending-itineraries.tsx` | h3 :51 (`{itinerary.title}` :52) | none — itinerary ≠ tour | `<TourRatingBadge />` (no slug → null) |
| Itineraries list | `src/app/[locale]/explore/itineraries/page.tsx` | h2 :48 (`:49`) | none | `<TourRatingBadge />` (no slug → null) |
| Map list | `src/app/[locale]/explore/map/page.tsx` | h3 :73 (`{item.name}` :74) | `item.slug` = destination slug (bookable) | wrap flex |
| Deals | `src/app/[locale]/deals/page.tsx` | h2 :33 | none (title-keyed items, i18n only) | `<TourRatingBadge />` (no slug → null) |
| Search result row | `src/components/search/search-client.tsx` | div :94; chip row :89 already flex | dest rows only: `type==="destination"` → last `href` segment | wrap title in `flex justify-between` |
| My trips row | `src/components/my-trips/my-trips-client.tsx` | p :80; row :77 already `justify-between` | `booking.slug` (bookable) | badge between info block and right `→` arrow |
| My trips detail | `src/components/my-trips/my-trips-detail.tsx` | p :85 | `booking.slug` (bookable) | flex row, badge right |

- **Bookable tour slug** = destination slug = `?tour=` value of `booking/checkout` = `TripBooking.slug`. Only `BookTicketButton` (`src/components/booking/book-ticket-button.tsx:15`) creates it → only destination surfaces can carry reviews.
- **EXCLUDED (rationale)**: `news-item-card.tsx`, events/festivals cards — non-tour content, no slug, no booking path (research flag, confirmed by grep: `BookTicketButton` used only by destination detail).
- Itinerary/deal items: wired with **no slug prop** → component renders null (no dead UI, no cross-slug rating bleed).

## 3. No-auth persistence + eligibility precedents

| Fact | Location |
|---|---|
| localStorage key `vn-my-trips:v1` (versioned) | `src/lib/booking-history.ts:27` |
| `TripBooking{reference, slug, tourName, email, fullName, paidAt, …}` | `booking-history.ts:9-25` |
| type guard `isTripBooking` (field-by-field) | `booking-history.ts:29-55` |
| `listBookings()` newest first, silent `[]` on corrupt/private mode | `booking-history.ts:58-70` |
| `saveBooking` upsert by `reference`, **silent quota try/catch** | `booking-history.ts:76-88` |
| written on mock payment | `src/components/booking/booking-summary.tsx:53-71` |
| slug-match eligibility precedent | `src/lib/tour-capacity.ts:59` (`if (booking.slug !== slug) continue`) |
| hydration-safe read (SSR value → `useEffect` → `loaded`) | `src/components/booking/booking-form.tsx:59-64`, `src/components/my-trips/my-trips-detail.tsx:25-29` |
| cross-tab `storage` listener | `booking-form.tsx:68-77` (key-filtered) |

## 4. Ratings/reviews, Sanity, i18n, UI inventory

| Fact | Evidence |
|---|---|
| No rating/review UI or schema exists | 0 `Star` imports, 0 `review/rating` matches in `src/` (grep, preview excluded); Sanity = 4 schemas, no rating field |
| Sanity read-only (no write client/token) | `src/sanity/lib/fetch-published.ts` only → reviews stay localStorage |
| i18n namespaces | `src/messages/en.json` / `vi.json`, `destinations` at :111-122 (identical line numbers) |
| parity enforced both ways | `tests/unit/i18n-parity.test.ts` (flattens keys, fails on any diff) |
| No Avatar component | `src/components/ui/` = button, card, input, label, navigation-menu, select, sheet, textarea |
| `lucide-react@^1.48.0` available | `Star`, `User` usable |
| `next/image` data-URL support | `next/dist/shared/lib/get-img-props.js:272` skips validation for `src.startsWith("data:")` |
| `next/image` usage pattern | `destination-card.tsx:30-38` |
| badge token precedent `bg-primary/10 … text-primary` | `trending-itineraries.tsx:48`, `my-trips-detail.tsx:78`, `search-client.tsx:90` |
| crimson theme NOT yet applied (PENDING plan) | `plans/260927-2100-global-theme-redesign-brand-migration/`, `plans/260927-2345-force-apply-theme-brand-updates/` (untracked) → MUST use `text-primary`/`bg-primary/10`, never hex/`red-*` |
| date formatting precedent | `src/lib/date-window.ts:62-71` (`Intl.DateTimeFormat(locale, …)`) |

## 5. Test harness facts

| Fact | Location |
|---|---|
| unit runner: `tests/unit/*.test.{ts,mts}` via `npx tsx`, exit 1 on any fail | `npm test` → `tests/run-unit.mjs` |
| local `check()` harness, `node:assert/strict`, no framework | `tests/unit/booking-logic.test.ts:1-22` |
| CSS-importing render tests need `needsCssStub` entry | `tests/run-unit.mjs:15` (only if unit test renders CSS-importing components) |
| i18n parity runs inside `npm test` | `tests/unit/i18n-parity.test.ts` |
| browser runner: `tests/browser/*.mjs`, plain node, dev server on :3000 required | `npm run test:browser` → `tests/run-browser.mjs` |
| browser pattern: `check()`, chrome-devtools lib, screenshots → `tests/.output` | `tests/browser/c-booking.mjs:1-45` |
| **eligibility probe harness**: seeds fake booking into `vn-my-trips:v1`, reloads | `tests/browser/h4-p4-e2e.mjs:164-197` |
| probe cleanup pattern | `tests/browser/h4-p4-e2e.mjs:220-231` |

## 6. Scripts

`npm run lint` (eslint) · `npm test` (unit + parity) · `npm run build` (next build) · `npm run test:browser` (needs `npm run dev` on :3000)

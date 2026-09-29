# Research Summary — Review Management (Kebab, Time-gated Edit, Rating Recalc)

Sources: 3 parallel explore agents (reviews architecture / identity+menu / time+menu), verified against source 2026-09-28.

## 1. Architecture facts (all verified, file:line)

- **No auth/backend.** Reviews + bookings are localStorage-only. `src/lib/booking-history.ts:4` comment: "no auth/backend in this app". API routes: only `revalidate`, `draft-mode/enable`, `contact`. No cookies/session anywhere in `src/`.
- **Review type** `src/lib/reviews.ts:8-18`: `{ reference, tourSlug, authorName, authorEmail, rating, comment, images, createdAt, bookingReference }` — `createdAt` = ISO string.
- **Storage**: `vn-reviews:v1` (array), `vn-my-trips:v1` (bookings). Upsert key `reference = `${bookingReference}:${tourSlug}`` composed at `write-review-form.tsx:89`.
- **Events**: `vn-reviews:changed` (same-tab) dispatched by `saveReview`/`deleteReview` via private `notifyChanged()` (`reviews.ts:24-30` — private; new mutations MUST live in reviews.ts or export it); cross-tab via native `storage`.
- **`deleteReview(reference)` exists** (`reviews.ts:87-101`), unit-tested (`reviews.test.ts:228-245`), **zero component callers** (dead in UI).
- **Rating is derived**: `getAggregate(listReviews(), slug)` recomputed on every event. Consumers all auto-refresh: `TourRatingBadge` ×6 surfaces (detail:91, destination-card:49, search:103, map:78, my-trips:87, my-trips-detail:88), `CustomerReviews` count+list (`customer-reviews.tsx:38-47`), `WriteReviewForm` re-prefill (`:64-79`). → **Delete → recalc is automatic, no cache.**
- **Edit today = form prefill + resubmit** (`write-review-form.tsx:47-79, 88-100`); no menu, no actions on card (`review-card.tsx` — pure presentational, props `{review, locale}`, single testid `review-card:32`).
- ⚠️ **`createdAt` overwritten on every save** (`write-review-form.tsx:96` `new Date().toISOString()`; `saveReview` writes incoming object as-is `:70-85`). **3h gate is vacuous unless `createdAt` is preserved on upsert.**
- ⚠️ `write-review-form.refresh()` has no `else` (`:56-60`) → after delete, form keeps stale values (would silently re-create on submit). **Must fix in this feature.**

## 2. Ownership predicate (no auth)

- Identity = set of `reference` values in `vn-my-trips:v1` (client-generated `VN-<base36 ts>` at `booking-summary.tsx:38-40`).
- Predicate: `listBookings().some(b => b.reference === review.bookingReference)` — prefer field over string-split. SSR-safe guard `typeof window === "undefined" → false` (mirrors `reviews.ts:55`).
- Caveat: purely per-device convenience affordance, **not a security boundary**; after My Trips "Delete all trips" (`clearBookings`, doesn't touch reviews) kebab disappears while review stays visible → accepted behavior, note in plan.
- `hasBookingForSlug` (`reviews.ts:125`) is slug-level, insufficient for ownership.

## 3. Time / server clock

- **No server-time mechanism exists.** `revalidate` returns time but requires HMAC; `contact` logs server time only in console; `headers()` unused; destination page ISR `revalidate=300` (never embed time in RSC).
- Recommended: **new tiny `GET /api/server-time` → `{ time: ISO }`** (`runtime="nodejs"`, GET, precedent `api/contact/route.ts`). Client fetch precedent `contact-form.tsx:74-79`.
- Gate must be computed **post-mount** (hydration-safe; clock precedent `travel-date-field.tsx:101-110`; prior hydration incidents documented in `plans/reports/code-review-*-20260927.md`).
- Injectable-clock unit-test convention: `travel-date.test.mts:29-43` style (`now = new Date()` param).
- Reviews are client-only → **no server-side enforcement possible**; server-time only defeats lying device clocks. Fail-closed repo precedent: `booking-validation.ts:76`.

## 4. Menu UI verdict (critical)

- `src/components/ui/` has NO dropdown/menu/popover. `@base-ui/react@1.8.0` **Menu primitive installed** (`node_modules/@base-ui/react/menu/` full parts incl. Portal/Positioner/Popup).
- ⚠️ **Base UI `Menu.Item` CANNOT satisfy AC "disabled attribute = true"**: renders `<div>` by default (`menu/item/MenuItem.js:18,64`); `disabled` prop → `data-disabled` + `aria-disabled` only; `useButton` with `focusableWhenDisabled:true, composite:true` **actively strips native `disabled`** (`internals/use-button/useButton.js:60-72` effect sets `element.disabled = false`) to keep items focusable. Docs only document `data-disabled` for disabled items.
- → **Decision: bespoke minimal dropdown** (`role="menu"` + plain `<button role="menuitem" disabled>` items): native `disabled` attr, no portal (stays inside card), no `aria-disabled` (avoids g-reviews `WRAP` trap), no `aria-pressed` (avoids c-booking B6 trap), full testid control. ~120 LOC.
- Icon: **`EllipsisVertical`** from lucide-react 1.48.0 (verified export; `MoreVertical` alias). Stroke-based (`fill="none"`) → does NOT break g-reviews `${CARD} svg.fill-current === 4` assertion (`g-reviews.mjs:218-219`). Menu must render **no `<img>`** (g-reviews `:220-221` asserts card img count === 1).
- Style precedent: `ui/select.tsx` popup classes (`:58-95`), item row classes (`:110-136`); wrapper pattern `data-slot` from `sheet.tsx`.
- Confirm precedent: **`window.confirm(t(...))`** — `my-trips-client.tsx:44-48`, testable via `page.once("dialog", d => d.accept())` (`f-ui.mjs:212`). No AlertDialog component exists.

## 5. Test traps (must not break)

| Trap | Citation | Rule for this feature |
|---|---|---|
| `${CARD} svg.fill-current` === 4 | `g-reviews.mjs:218` | kebab icon stroke-only ✓ |
| `${CARD} img` === 1 | `g-reviews.mjs:220` | menu renders no img ✓ |
| `WRAP = #customer-reviews [aria-disabled="true"]` | `g-reviews.mjs:22` used `:179,199,286` | never put `aria-disabled` on menu items/buttons; form wrapper `aria-disabled` only when no-review states (R4 asserts ZERO only when form enabled — expired-form gate would appear only when an old existing review present, not asserted by WRAP checks) |
| `button[aria-pressed]` outside `#customer-reviews` = 0 | `c-booking.mjs:48-51` | trigger uses `aria-haspopup`/`aria-expanded` ✓ |
| i18n parity (flattened) | `i18n-parity.test.ts:48-58` | every new key in BOTH en/vi |
| `isReview` requires all 9 fields | `reviews.test.ts:70-72` | no NEW required field on TourReview |
| Search-page trap: `about.*` objects → phantom results | `search/page.tsx:115-117` | new keys under `destinations.reviews.*` (not scanned) |

## 6. Plug-in points

- Kebab: `review-card.tsx:35-43` header row → add `justify-between` + menu (prop `owned: boolean`; card stays presentational).
- Ownership compute: `customer-reviews.tsx:30-47` `refresh()` already re-reads storage + events → compute owned set alongside, pass down.
- Delete → `deleteReview(review.reference)` → existing event wiring refreshes badge/list/count.
- Edit → scroll/focus existing `WriteReviewForm` (edit mechanism stays prefill+upsert).
- Form fixes: `write-review-form.tsx:56-60` add `else` clear; add 3h-expiry gate when `existing` review present.
- i18n block: `destinations.reviews` at `en.json:130-145` / `vi.json` (identical keys).

## 7. Recommended decisions (for plan)

1. `GET /api/server-time` new route; fetch **on menu open**; fetch failure → fail-closed (Edit disabled).
2. Preserve original `createdAt` on upsert **inside `saveReview`** (single choke point; unit-testable).
3. Gate BOTH menu Edit item (AC literal) AND prefilled form path (else AC trivially bypassable) — form gate reuses existing disabled-wrapper pattern.
4. Delete confirm = `window.confirm` (repo precedent, Puppeteer-testable).
5. Bespoke dropdown component (Base UI Menu disqualified by native-disabled AC — see §4).
6. Orphaned reviews (bookings cleared) → menu hidden; accepted, documented.

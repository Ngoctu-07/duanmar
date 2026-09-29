# Phase 02 — Bespoke Kebab Menu + Ownership Plumbing + i18n

## Context Links
- Plan: `plan.md` P2 · Research: `research/research-summary.md` §4 (menu verdict — Base UI disqualified), §5 (test traps), §6 (plug-in points), §2 (ownership)
- Files: NEW `src/components/reviews/review-actions-menu.tsx`; MODIFY `src/components/reviews/review-card.tsx`, `src/components/reviews/customer-reviews.tsx`, `src/messages/en.json`, `src/messages/vi.json`

## Overview
- Priority: high · Status: pending · Progress: 0% · Est: 0.75 day · Depends on: P1 (`fetchServerNow`, `isEditWindowExpired`, `isMyReview`)
- Owner-only vertical-ellipsis action menu on the review card: trigger + `role="menu"` panel with **Edit** (time-gated) and **Delete** (confirm → `deleteReview`), wired through an `owned` prop computed in `CustomerReviews`. Card stays presentational.

## Key Insights
- **Base UI `Menu.Item` cannot satisfy AC3**: renders `<div>` (`menu/item/MenuItem.js:18,64`), `disabled` → `data-disabled`/`aria-disabled` only, and `useButton` (`focusableWhenDisabled+composite`) **actively sets `element.disabled = false`** (`useButton.js:60-72`) → bespoke dropdown (~130 ln), no portal, no Base UI import (research §4).
- Plug-in points: `review-card.tsx:35-43` header row (`flex items-center gap-3`) → becomes `justify-between` wrapper; `customer-reviews.tsx:30-33 refresh()` already re-reads localStorage on `vn-reviews:changed` + `storage` → compute owned refs there; `:73` passes `owned` down.
- Ownership must also react to BOOKING changes (cross-tab "Delete all trips") → add `BOOKINGS_STORAGE_KEY` to the storage condition at `customer-reviews.tsx:39` (today only `REVIEWS_STORAGE_KEY`, `:39`).
- Icon: `EllipsisVertical` exists in lucide-react 1.48.0 (`dist/esm/icons/ellipsis-vertical.mjs`), stroke-only (`fill="none"`) → does NOT break `g-reviews.mjs:218` `svg.fill-current === 4`; menu must render **no `<img>`** (`:220` img count === 1).
- Traps (research §5): zero `aria-disabled` and zero `aria-pressed` anywhere in the menu (trigger uses `aria-haspopup="menu"` + `aria-expanded`); no i18n keys outside `destinations.reviews.*` (search scans `news.*`/`about.*` at `search/page.tsx:105-117`).
- **Self-contained menu** (decision, justified): the component owns confirm+delete+edit-scroll itself — (a) `deleteReview` dispatches `vn-reviews:changed` → `CustomerReviews`/`TourRatingBadge`/`WriteReviewForm` all refresh with zero callbacks; (b) Edit's scroll target is a stable DOM testid (P3) not React state; (c) avoids threading 2 callbacks through the presentational card (only prop = `owned`); (d) matches inline-confirm precedent `my-trips-client.tsx:44-48`.
- Panel is NOT portaled → stays inside `#customer-reviews`; only `aria-disabled` node in that subtree remains the form wrapper (WRAP trap safe).
- `refresh()` reads `listReviews()` once → derive `ownedReferences = new Set(all.filter(isMyReview).map(r => r.bookingReference))` (dedups a booking that reviewed several tours).

## Requirements
**Functional**
1. NEW `src/components/reviews/review-actions-menu.tsx` (~130 ln, `"use client"`), props `{ review: TourReview }`, state `open: boolean` + `verdict: {key, expired} | null`-style gate (or `editExpired` default `false`):
   - **Trigger**: `<button type="button" data-testid="review-actions-trigger" aria-haspopup="menu" aria-expanded={open} aria-label={t("reviews.menuLabel")} onClick={toggle}>` wrapping `<EllipsisVertical className="h-4 w-4" aria-hidden />`; classes `shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50`.
   - **On open** (`toggle` → true): fire `evaluate()`: `const now = await fetchServerNow(); setEditExpired(now === null ? true : isEditWindowExpired(review.createdAt, now));` (fetch on OPEN, binding 3 — never on mount).
   - **Panel** (only when open): `<div role="menu" data-testid="review-actions-menu" className="absolute right-0 top-full z-10 mt-1 min-w-32 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">` with EXACTLY two items:
     - Edit: `<button type="button" role="menuitem" data-testid="review-actions-edit" disabled={editExpired} onClick={onEdit} className="flex w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground disabled:opacity-50">` = `t("reviews.menuEdit")`.
     - Delete: `<button type="button" role="menuitem" data-testid="review-actions-delete" onClick={onDelete} className="…same minus disabled:opacity-50…">` = `t("reviews.menuDelete")`.
   - `onEdit`: close menu → `const form = document.querySelector('[data-testid="write-review-form"]'); form?.scrollIntoView({ behavior: "smooth", block: "center" }); form?.querySelector("textarea")?.focus();` (testid lands in P3 — optional chaining keeps P2 standalone).
   - `onDelete`: `if (!window.confirm(t("reviews.deleteConfirm"))) return; deleteReview(review.reference); setOpen(false);` (repo precedent `my-trips-client.tsx:44-48`).
   - Close on: outside `pointerdown` + `Escape` (document listeners added while open, removed on close/unmount); item click closes.
   - Header wrapper in the card gets `relative` so the panel anchors to the card.
2. `src/components/reviews/review-card.tsx`: add `owned: boolean` to `ReviewCardProps` (`:9-12`); replace header `:35` with `<div className="flex items-start justify-between gap-2">` containing LEFT `<div className="flex min-w-0 items-center gap-3">` (avatar + name/date, unchanged content `:36-42`) and RIGHT `{owned && <ReviewActionsMenu review={review} />}`. Stars `:45-63`, comment `:65-67`, images `:69-83` untouched.
3. `src/components/reviews/customer-reviews.tsx`: state `const [ownedReferences, setOwnedReferences] = useState<Set<string>>(new Set());` · `refresh()` (`:30-33`) becomes `const all = listReviews(); setReviews(reviewsForSlug(all, tourSlug)); setOwnedReferences(new Set(all.filter(isMyReview).map((r) => r.bookingReference))); setLoaded(true);` · storage condition `:39` gains `|| event.key === BOOKINGS_STORAGE_KEY` (+ import from `@/lib/booking-history`) · card render `:73` gains `owned={ownedReferences.has(review.bookingReference)}` · import `isMyReview` from `@/lib/reviews`.
4. i18n — append to `destinations.reviews` in BOTH `src/messages/en.json` (block `:130-145`, keys are line-aligned across locales: `errorStorage` at `:144` in both) and `src/messages/vi.json` (block `:130-145`), identical shapes, same relative position (5 keys):
   | key | en | vi |
   |---|---|---|
   | `menuLabel` | `Review actions` | `Thao tác đánh giá` |
   | `menuEdit` | `Edit` | `Chỉnh sửa` |
   | `menuDelete` | `Delete` | `Xóa` |
   | `deleteConfirm` | `Delete this review? This cannot be undone.` | `Xóa đánh giá này? Thao tác này không thể hoàn tác.` |
   | `editWindowClosed` | `Reviews can only be edited within 3 hours of posting.` | `Chỉ có thể chỉnh sửa đánh giá trong vòng 3 giờ sau khi đăng.` |
   (`editWindowClosed` is consumed by P3 — added now so i18n is edited exactly once.)

**Non-functional**: files <200 LOC · theme tokens ONLY (`bg-popover text-popover-foreground bg-accent text-accent-foreground ring-ring/50 border shadow-md`; NEVER hex/`red-*`) · a11y: labelled focusable trigger, `role=menu`/`role=menuitem`, Escape + outside-click close, Edit = native `disabled` (no `aria-disabled`) · no new deps · no links (no `@/i18n/navigation` needed) · hydration-safe (menu renders only after `refresh()` sets `owned`, mirroring the `writeReviewHint` no-flash pattern).

## Related Code Files
**Tạo**: `src/components/reviews/review-actions-menu.tsx`
**Sửa**: `src/components/reviews/review-card.tsx` (`:9-12`, `:35-43`), `src/components/reviews/customer-reviews.tsx` (`:1-13` imports, `:30-47`, `:73`), `src/messages/en.json`, `src/messages/vi.json` (`destinations.reviews` +5 keys ×2)
**Không sửa**: `write-review-form.tsx` (P3), `src/lib/reviews.ts` (P1), `src/lib/edit-window.ts` (P1), `tour-rating-badge.tsx`, `tests/browser/g-reviews.mjs` (30 checks must survive verbatim), `booking-history.ts` (import only)

## Implementation Steps
1. Add the 5 keys to `en.json` + `vi.json` in the SAME step (parity test `i18n-parity.test.ts` flattens both files).
2. Create `review-actions-menu.tsx` per Functional 1 (P1 helpers imported from `@/lib/edit-window`, `deleteReview` from `@/lib/reviews`).
3. `review-card.tsx`: prop + header restructure (keep `min-w-0`/`truncate` so long author names can't push the `shrink-0` kebab out of the card).
4. `customer-reviews.tsx`: state + refresh derive + `owned` prop + bookings listener.
5. Verify: lint/test/build + DOM probe (below).

## Todo List
- [ ] `destinations.reviews.{menuLabel,menuEdit,menuDelete,deleteConfirm,editWindowClosed}` ×2 locales
- [ ] `review-actions-menu.tsx` (trigger/panel/2 items, server-time on open, confirm-delete, edit-scroll, outside+Escape close)
- [ ] `review-card.tsx` `owned` prop + `justify-between` header
- [ ] `customer-reviews.tsx` owned-set plumbing + `BOOKINGS_STORAGE_KEY` listener + `owned` pass-down
- [ ] Verify: `npm run lint` · `npm test` · `npm run build` · DOM probe

## Success Criteria
- `npm run lint` → 0 · `npm test` → **`14/14 files passed`** (parity includes the 5 new keys) · `npm run build` → 0 · `wc -l` all touched files <200 (menu ≈130).
- i18n: `node -e "const e=require('./src/messages/en.json'),v=require('./src/messages/vi.json');const a=Object.keys(e.destinations.reviews),b=Object.keys(v.destinations.reviews);console.log(a.length,a.filter(k=>!b.includes(k)),b.filter(k=>!a.includes(k)))"` → **`19 [] []`** (14 existing + 5 new, both locales identical).
- **Trap greps (all must be 0)**: `grep -c "aria-disabled" src/components/reviews/review-actions-menu.tsx` → 0 · `grep -c "aria-pressed" src/components/reviews/review-actions-menu.tsx` → 0 · `grep -c "<img" src/components/reviews/review-actions-menu.tsx` → 0 · `grep -E "#[0-9a-fA-F]{3}|red-" src/components/reviews/review-actions-menu.tsx src/components/reviews/review-card.tsx src/components/reviews/customer-reviews.tsx` → 0 · `grep -c "from \"@base-ui" src/components/reviews/review-actions-menu.tsx` → 0.
- **DOM probe** (dev :3000, harness shape = `g-reviews.mjs:8-14,37-100` with `PROBE_REF = "VN-K-REVIEW"`, `dismissPromo`, `pageerror` collector, screenshots → `tests/.output/k-p2-*.png`): seed booking `VN-K-REVIEW` (slug `hcm`) + reviews `VN-K-REVIEW:hcm` (author "K Owner", rating 4, fresh `createdAt`) AND `VN-K-OTHER:hcm` (author "K Orphan", rating 2, `bookingReference: "VN-K-OTHER"` not in bookings) → reload `/vi/explore/destinations/hcm` → prints `P2 probe: ok` when ALL hold:
  1. exactly 2 `[data-testid="review-card"]`; `document.querySelectorAll('[data-testid="review-card"] [data-testid="review-actions-trigger"]').length === 1` (owner), and the card whose text contains "K Orphan" contains **0** triggers.
  2. trigger attrs: `aria-haspopup="menu"`, `aria-expanded="false"`, non-empty `aria-label` = `vi.json destinations.reviews.menuLabel`.
  3. click trigger → exactly 1 `GET /api/server-time` (200) + `[data-testid="review-actions-menu"]` visible with exactly 2 `[role="menuitem"]`; labels = `Chỉnh sửa` / `Xóa` (from `vi.json`); `[data-testid="review-actions-edit"]` `disabled === false` (assert only AFTER the server-time response).
  4. Escape (or outside click) → menu removed; `aria-expanded` back to `"false"`.
- `npm run test:browser` not required in P2 (dev-time manual probe only); full suite runs in P4 — but if run, `g-reviews.mjs` must still print `all 30 checks passed`.

## Risk Assessment
- **R1 g-reviews 30-check regression** (highest risk) → hard rules: stroke-only icon, zero `<img>`, zero `aria-disabled`/`aria-pressed` on menu controls, no new `TourReview` field; trap greps above gate the phase.
- **R2 panel clipped** → card `review-card.tsx:33` has no `overflow-hidden`; ancestors (`section`, `space-y-4`) don't clip — verify with screenshot; `z-10` beats sibling cards.
- **R3 hydration flash of kebab** → `owned` starts `false` (SSR renders none), set post-mount; no `aria-hidden`/placeholder button rendered.
- **R4 leaked listeners** (outside-click/Escape) → attach only while open, cleanup in `useEffect` return; `pageerror` collector in probe.
- **R5 orphan reviews** silently lack the menu (accepted, binding 1) → probe asserts this explicitly so it's a documented behavior, not a bug.
- **R6 i18n parity drift** → both locales edited in one step + the `19 [] []` node check.

## Security Considerations
- Menu renders no new user data (labels are static i18n); author/comment already rendered by the card via React escaping (no `dangerouslySetInnerHTML`).
- Ownership check is client-side convenience only — anyone can forge localStorage; there is no server-side review data to protect (research §2) → no security claim made; JSDoc + changelog say so.
- Delete requires explicit `window.confirm` (accidental-destruction guard); destructive payload removal is local-only.
- Only new network call is P1's read-only `/api/server-time`; no credentials, no storage of anything beyond existing keys.

## Next Steps
- P3 adds `data-testid="write-review-form"` (the Edit scroll target this component queries) + the 3h form gate + else-clear.
- P4 converts every probe assertion into `k-review-actions.mjs` K1–K2 (and K3–K6 for P3 behavior).

## Decisions already made
Bespoke dropdown, no Base UI Menu, no portal · self-contained menu (confirm + delete + scroll inline; only prop = `review`) · server time fetched on menu OPEN (not mount) · `EllipsisVertical` icon · 5 i18n keys added in P2 incl. P3's `editWindowClosed` (single parity-safe edit) · owned set derived once per `refresh()` via `isMyReview` · `BOOKINGS_STORAGE_KEY` listener added so cross-tab booking deletion hides the menu live.

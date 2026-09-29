# Phase 2: Reviews Data + Customer Reviews Section

## Context Links
- Plan: `plan.md` P2 · Research: `research/research-summary.md` §1, §3, §4
- Files: `src/components/reviews/customer-reviews.tsx`, `review-card.tsx`, `review-avatar.tsx` (new), `src/app/[locale]/explore/destinations/[slug]/page.tsx` (:95→:96), `src/messages/{en,vi}.json`
- Depends on: Phase 1 (`src/lib/reviews.ts`)

## Overview
- Priority: high · Status: pending · Progress: 0% · Est: 0.5 day
- Client "Customer Reviews" subtree at bottom of detail page: title + count, write-review mount point (empty in P2), review feed (avatar, stars, comment, ≤3 images), empty state. Detail page **stays a server component**.

## Key Insights
- Insert point = between :95 (wrapper close) and :96 (`</div>`) inside `max-w-3xl` :80 → section inherits page width; feed reads localStorage only after mount → server HTML = title + empty-state skeleton-free layout (no wrong data cached in ISR).
- Avatar component reused twice (feed card + Phase 3 "posting as" row) → kept as own file; all 3 files stay far under 200 lines.
- `next/image` accepts `data:` srcs (`get-img-props.js:272`) → review thumbs can use `next/image` with explicit width/height (no `fill`), `sizes` not required.
- Dates via `Intl.DateTimeFormat(locale, { day:"numeric", month:"short", year:"numeric" })` (precedent `date-window.ts:62-71`); `locale` passed from server page prop (already in `PageProps`).

## Architecture
```
page.tsx (server, ISR) ──<CustomerReviews tourSlug locale/>──▶ "use client"
                              │ state: reviews = listReviews() (+ storage listener)
                              ├── WriteReviewForm slot  ← Phase 3 (renders null in P2)
                              ├── 0 reviews → empty state block
                              └── reviews → <ReviewCard>×  → <ReviewAvatar/> + Star row + comment + ≤3 <Image/>
```

## Requirements
**Functional**
- `customer-reviews.tsx` (`"use client"`): props `{ tourSlug: string; locale: string }`; `useTranslations("destinations")`; loads `reviewsForSlug(listReviews(), tourSlug)` in `useEffect` (`loaded` flag, SSR-safe), subscribes to `storage` filtered on `REVIEWS_STORAGE_KEY`; renders `<h2 id="customer-reviews">` title, count line, **Write-a-Review mount point (Phase 3 placeholder `null`)**, empty state when 0, else `space-y-4` feed; exposes `onReviewsChanged` so Phase 3 form re-renders feed (state lifted here).
- `review-card.tsx`: card (`rounded-xl border bg-card p-4 sm:p-5`) with `<ReviewAvatar name/>` + author name + formatted `createdAt` + 5-star row (lucide `Star`, `fill-current` for filled ≤ rating, `text-primary` for filled, `text-muted-foreground/40` empty; `aria-label` from `reviews.ratingAria`… count=1 → reuse `t("ratingAria", {avg: formatRating(rating), count: 1})`) + comment (`whitespace-pre-line break-words`) + images: `images.slice(0,3)` → `next/image` grid (`h-24 w-24 sm:h-28 sm:w-28 rounded-md object-cover`, data URL src, width/height 112, `alt = authorName`), capped at 3 by lib anyway.
- `review-avatar.tsx`: `{ name: string; size?: "sm"|"md" }` → initials (first char of first 2 words, `toUpperCase`), `flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary`; empty name → lucide `User`.
- Detail page edit: import + `<CustomerReviews tourSlug={slug} locale={locale} />` after `</PriceBlock>` (:94), before wrapper close (:95→:96). Page stays async server component, `revalidate` unchanged.
- i18n (add to BOTH `en`+`vi`, under `destinations.reviews`): `title` ("Customer Reviews"/"Đánh giá của khách hàng"), `count` ("{count} reviews"/"{count} đánh giá"), `empty` ("No reviews yet — be the first to share your experience."/"Chưa có đánh giá — hãy là người đầu tiên chia sẻ.").

**Non-functional**: 3 files < 150 lines each · no hydration mismatch (all localStorage reads inside `useEffect`) · feed scroll/perf trivial (device-local volume) · a11y: section `aria-labelledby`, stars `aria-hidden` + textual aria-label, images lazy.

## Related Code Files
**Tạo**: `src/components/reviews/customer-reviews.tsx`, `src/components/reviews/review-card.tsx`, `src/components/reviews/review-avatar.tsx`
**Sửa**: `src/app/[locale]/explore/destinations/[slug]/page.tsx` (1 import + 1 JSX line), `src/messages/en.json`, `src/messages/vi.json`
**Không sửa**: `src/lib/reviews.ts` (P1 core already sufficient), Sanity queries, `PriceBlock`, badge component

## Implementation Steps
1. `review-avatar.tsx`: initials helper + `User` fallback (memo-free, pure render).
2. `review-card.tsx`: props `{ review: TourReview; locale: string }`; star row loop 1..5; images `slice(0, 3)`; date via `Intl.DateTimeFormat`; no interactive elements.
3. `customer-reviews.tsx`: state `{ reviews, loaded }`; `refresh()` = `setReviews(reviewsForSlug(listReviews(), tourSlug))`; `useEffect` init + `storage` listener (key filter `REVIEWS_STORAGE_KEY` or `null`); layout: `mt-12` section, `h2 text-2xl font-bold mb-1`, `p text-sm text-muted-foreground mb-5` count, then feed/empty (`rounded-xl border border-dashed p-8 text-center text-muted-foreground`), `id="customer-reviews"` anchor. Export `CustomerReviews` only; leave `renderWriteReview` TODO-commented slot for P3 (comment, not dead component).
4. `page.tsx`: add import + `<CustomerReviews tourSlug={slug} locale={locale} />` between :95/:96.
5. i18n: `destinations.reviews.{title,count,empty}` in en + vi (merge into existing `reviews` object from P1).
6. Verify: `npm run lint` · `npm test` (parity) · `npm run build` · manual `http://localhost:3000/vi/explore/destinations/hcm` → section below price, empty state visible, console clean (no hydration warnings).

## Todo List
- [ ] `review-avatar.tsx` · [ ] `review-card.tsx` · [ ] `customer-reviews.tsx` (state + storage listener + empty/feed)
- [ ] `page.tsx` insertion :95→:96 · [ ] i18n keys ×3 in en + vi
- [ ] Verify lint / test / build / manual empty state

## Success Criteria
- `/vi/explore/destinations/hcm` shows "Customer Reviews" + empty state, no console errors/hydration mismatch · seeding a review via DevTools (`saveReview` equivalent in console) after reload renders card with avatar initials, N filled stars, comment, ≤3 images · badge from P1 updates too (same storage key) · all tests green.

## Risk Assessment
- **R1 ISR staleness**: static HTML has no review content (client reads) → never stale; only trade-off = empty→content pop after hydration (accepted, same pattern as my-trips).
- **R2 localStorage unavailable (private mode)**: `listReviews()` returns `[]` → empty state (graceful).
- **R3 long comments / XSS**: render as React text (auto-escaped), `break-words`; no `dangerouslySetInnerHTML`.
- **R4 data-URL images in markup**: large HTML only after hydration → fine; capped 3 × ~100 KB (P3 enforces).
- **R5 i18n parity**: 3 keys added to both files together.

## Security Considerations
- No `authorEmail` rendered (stored for provenance only, shown to owner in P3 form header) · images are user-supplied data URLs rendered sandboxed by React (no scripts) · no network upload of review data (device-local only).

## Next Steps
- Phase 3 mounts `write-review-form.tsx` in the P2 slot and lifts refresh via `onReviewsChanged`.

## Decisions already made
Derived ratings from reviews (empty state at 0) · localStorage `vn-reviews:v1` · slug-only eligibility (P3) · badge surfaces unchanged here · separate `review-avatar.tsx` (reused in P3) vs merging.

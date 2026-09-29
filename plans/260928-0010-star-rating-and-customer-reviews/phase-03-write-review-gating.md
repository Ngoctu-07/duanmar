# Phase 3: Write-Review Form + Booking Gating

## Context Links
- Plan: `plan.md` P3 · Research: `research/research-summary.md` §2-3
- Files: `src/components/reviews/write-review-form.tsx` (new), `src/lib/reviews.ts` (+`downscaleImageToDataUrl`), `src/components/reviews/customer-reviews.tsx` (mount), `src/messages/{en,vi}.json`
- Depends on: Phase 1 (lib), Phase 2 (section slot + avatar)

## Overview
- Priority: high · Status: pending · Progress: 0% · Est: 0.5 day
- "Write a Review" block above the feed: **enabled ONLY if `listBookings().some(b => b.slug === tourSlug)`**, strictly disabled until hydration, one review per booking per tour (upsert), 3-image cap with client-side downscale, quota guard with visible error.

## Key Insights
- Gating precedent = `my-trips-detail.tsx:25-29` (`loaded` flag) + `tour-capacity.ts:59` (slug match) + `booking-form.tsx:68-77` (storage listener so a booking made in another tab enables the form live).
- While `!loaded`: render **disabled with NO hint text** (avoids false "not booked" flash); after load: eligible → enabled; ineligible → disabled + `writeReviewHint`. Triple lock: container `aria-disabled` + `pointer-events-none` + `disabled` on every control **and** early-return in submit handler.
- Prefill author from the matching booking (`fullName`, `email`) → no name/email inputs (less PII surface, guaranteed consistency with booking).
- Downscale lives in `src/lib/reviews.ts` (NOT a 7th component) to keep form <200 lines and the allow-list intact: canvas → `toDataURL("image/jpeg", 0.7)`, longest edge 800px; **file too large after cap is rejected client-side** (no server).

## Architecture
```
CustomerReviews (state owner)
  └── WriteReviewForm { tourSlug, locale, onSaved(reviews) }
        ├── useEffect → listBookings() → eligible + loaded + existing review (upsert pre-fill)
        ├── storage listener (vn-my-trips:v1 + vn-reviews:v1)
        ├── rating: 5 star toggle buttons (aria-pressed) · comment: <Textarea>
        ├── images: <input type=file accept=image/* multiple> → ≤3 → downscale → thumbs + remove
        └── submit → validate → saveReview({reference:`${bookingReference}:${tourSlug}`, …})
              ├─ true  → onSaved(reviewsForSlug(...)) → feed + badge update (same key)
              └─ false → errorStorage, form state preserved
```

## Requirements
**Functional**
- `write-review-form.tsx` (`"use client"`, target < 190 lines): props `{ tourSlug: string; locale: string; onSaved: () => void }`.
  - **Gating**: `const [state, setState] = useState({ loaded:false, booking:null, existing:null })`; `useEffect` → `booking = listBookings().find(b => b.slug === tourSlug) ?? null`, `existing = listReviews().find(r => r.reference === `${booking?.reference}:${tourSlug}`)`, `loaded=true`; `storage` listener re-runs on `vn-my-trips:v1` / `vn-reviews:v1` (`booking-form.tsx:68-77`). `enabled = loaded && booking !== null`.
  - **Disabled render** (`!enabled`): wrapper `aria-disabled="true" pointer-events-none grayscale opacity-60 cursor-not-allowed` + `disabled` on textarea/star buttons/file input/submit; show `writeReviewHint` ONLY when `loaded && !booking`; while `!loaded` → same shell, hint hidden.
  - **Enabled form**: heading `writeReview` (`h3 text-lg font-semibold`), "posting as" row = `<ReviewAvatar name={booking.fullName}/>` + name, `ratingLabel` + 5 star buttons (`aria-pressed`, `aria-label={t("ratingLabel")} {n}`), `commentPlaceholder` textarea (required, `rows=4`), images (`imagesHint`, max 3, thumbs with ✕ remove), submit `Button` (`submitting` while saving, disabled unless `rating && comment.trim()`; `errorRequired` shown if attempted empty).
  - **Submit**: validate rating 1-5 + non-empty comment → build `TourReview { reference: \`${booking.reference}:${tourSlug}\`, tourSlug, authorName: booking.fullName, authorEmail: booking.email, rating, comment, images, createdAt: new Date().toISOString(), bookingReference: booking.reference }` → `saveReview()` → success: `submitSuccess` message + reset + `onSaved()`; failure: `errorStorage` message, form keeps values.
  - **Images**: `<input>` → `Array.from(files).slice(0, 3)` → each `downscaleImageToDataUrl(file, 800, 0.7)`; reject non-image types; keep ≤3 total.
- `src/lib/reviews.ts` additions: `downscaleImageToDataUrl(file: Blob, maxSize = 800, quality = 0.7): Promise<string>` — decode (`createImageBitmap` fallback `Image` + object URL), scale so longest edge ≤ `maxSize`, draw to canvas, `canvas.toDataURL("image/jpeg", quality)`; rejects (corrupt/non-image) or `toDataURL` throw → form shows `errorStorage` (generic processing message) and drops the file. Keep `reviews.ts` < 190 lines: if exceeded, move `downscaleImageToDataUrl` body into `write-review-form.tsx` (documented fallback, no new file).
- `customer-reviews.tsx` edit: mount `<WriteReviewForm tourSlug={tourSlug} locale={locale} onSaved={refresh} />` between title/count and feed (P2 slot).
- i18n (BOTH files, `destinations.reviews`): `writeReview`, `writeReviewHint` ("Only customers who booked this tour can write a review."/"Chỉ khách đã đặt tour này mới có thể viết đánh giá."), `ratingLabel`, `commentPlaceholder`, `submit`, `submitting`, `submitSuccess`, `imagesHint` ("Up to 3 images (optional)"/"Tối đa 3 ảnh (không bắt buộc)"), `errorRequired`, `errorStorage`.

**Non-functional**: form < 190 lines (fallback: downscale moves in) · no PII inputs · disabled state keyboard-safe (controls `disabled`) · quota: ≤3 × ~100 KB ≈ 300 KB/review, `saveReview` try/catch → `false` → `errorStorage`.

## Related Code Files
**Tạo**: `src/components/reviews/write-review-form.tsx`
**Sửa**: `src/lib/reviews.ts` (+`downscaleImageToDataUrl`), `src/components/reviews/customer-reviews.tsx` (mount line), `src/messages/en.json`, `src/messages/vi.json`
**Không sửa**: `booking-history.ts`, `customer-reviews` feed logic, badge, Sanity

## Implementation Steps
1. `reviews.ts`: add `downscaleImageToDataUrl` (async, canvas, JPEG q0.7, ≤800px). **No** `isEligible` helper — eligibility stays the inline `listBookings().some(b => b.slug === tourSlug)` (KISS, matches spec wording).
2. `write-review-form.tsx`: gating state/effects → disabled shell (aria-disabled + pointer-events-none + grayed + hint rule) → enabled form (star buttons, textarea, images, submit) → submit pipeline (validate, build record with composite `reference`, `saveReview`, messages, `onSaved`).
3. `customer-reviews.tsx`: insert form mount above feed/empty.
4. i18n: 10 keys ×2 files (merge into `destinations.reviews`).
5. Verify: `npm run lint` · `npm test` · `npm run build` · manual at `/vi/explore/destinations/hcm`:
   - no booking → form `aria-disabled="true"`, not clickable (click does nothing), hint visible, controls `disabled`;
   - seed probe booking (h4 pattern `h4-p4-e2e.mjs:164-197`, slug `hcm`) → reload → form enabled, hint gone;
   - submit review → card appears, badge `4.0 ★` appears top-right of H1, both persist across reload;
   - second submit same booking → still 1 card (upsert); cleanup probe + review.

## Todo List
- [ ] `downscaleImageToDataUrl` in `src/lib/reviews.ts` (+ line-count check <190)
- [ ] `write-review-form.tsx` gating shell (loaded/eligible/hint rules, aria-disabled, pointer-events-none, disabled controls)
- [ ] form fields (stars, textarea, ≤3 images with thumbs) + submit pipeline + messages
- [ ] mount in `customer-reviews.tsx` · [ ] i18n ×10 in en + vi
- [ ] Verify lint / test / build / manual 4-step checklist

## Success Criteria
- Without booking probe: `[aria-disabled="true"]` present, `getComputedStyle(pointerEvents) === "none"`, clicking submit/section changes nothing, hint shown **after** hydration (no flash).
- With probe: form enabled, submit persists across reload, badge avg updates, exactly 1 review per `${reference}:${tourSlug}`.
- Image >3 ignored (only 3 kept), stored value starts with `data:image/jpeg`, quota failure → `errorStorage` visible and nothing partially saved.
- `npm test` green (parity for 10 keys) · `npm run build` green.

## Risk Assessment
- **R1 hydration flash**: `loaded` gate + hint hidden pre-load (binding decision) · **R2 quota**: try/catch → user-visible `errorStorage`, no silent data loss · **R3 false eligibility**: slug-only match (binding); other device's booking won't exist — message explains · **R4 form >200 lines**: documented fallback moves downscale into form · **R5 cross-tab**: storage listeners refresh both eligibility and feed · **R6 ISR vs fresh bookings**: eligibility is client-side → always current.

## Security Considerations
- No new PII inputs (name/email copied from existing booking, not re-collected) · review data never leaves device (no network) · `authorEmail` stored but never rendered outside owner's own form · file input `accept="image/*"` + type check (no SVG/script vectors: re-encoded via canvas to JPEG strips metadata/EXIF/scripts) · comments rendered as text (React escaping) · no tokens/keys involved.

## Next Steps
- Phase 4 codifies all of the above into `tests/unit/reviews.test.ts` + `tests/browser/g-reviews.mjs` and runs the full pipeline.

## Decisions already made
Derived ratings (badge updates from same key) · localStorage `vn-reviews:v1` · **eligibility = `listBookings().some(b => b.slug === tourSlug)` only, disabled until `loaded`** · badge surfaces unchanged · image cap 3 @ 800px JPEG q0.7 · prefill author from booking (no PII inputs) · composite `reference` upsert key · quota/processing errors surfaced (`errorStorage`) instead of silent swallow.

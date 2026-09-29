# Phase 01 — Review Gallery Lightbox (single-image viewer)

**Status**: Complete · **Priority**: High · **AC**: 1 — *click a review photo thumbnail → lightbox modal shows the full-size image* · **Depends on**: —

## Context Links
- `src/components/reviews/review-card.tsx:74-88` — current thumbnails (guard `review.images.length>0` `:74`, `slice(0,3)` `:76`, `next/image` `:77-85`, `alt={review.authorName}` `:80`, class `h-24 w-24 rounded-md object-cover sm:h-28 sm:w-28` `:84`) — **not clickable, no testid**; component `"use client"` `:1`, `useTranslations("destinations")` `:30`, returns `<article data-testid="review-card">` `:33-89`.
- Images = **JPEG data URLs ≤800px** from `src/lib/reviews.ts:150-184` (`downscaleImageToDataUrl`), `TourReview.images: string[]`, storage `vn-reviews:v1`.
- Dialog machinery `src/components/ui/dialog.tsx`: `Dialog` `:10-12` · portal `:52` · overlay `fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs` `:29-33` · content centered `w-[min(92vw,42rem)] max-h-[80vh] overflow-y-auto rounded-xl border bg-card p-3` `:54-60` · close button props `showCloseButton/closeSlot/closeLabel` `:42-49` + `data-slot={closeSlot}` `:65` + sr-only label `:75` · `DialogTitle` `data-slot="dialog-title"` `:83-94`.
- Precedent `src/components/layout/promo-modal.tsx:23-29`: `<Dialog open onOpenChange>` + `DialogContent data-slot="promo-modal" closeSlot="promo-modal-close" closeLabel={t("close")}` + `<DialogTitle className="sr-only">`.
- i18n block `src/messages/{en,vi}.json:133-153` (`destinations.reviews.*`, last key `editWindowClosed` `:152`).
- Test contracts: `tests/browser/g-reviews.mjs:220-221` (`${CARD} img` === 1) · `k-review-actions.mjs:78-88` (`review-actions-trigger` per card) · `c-booking.mjs:48-49` (`button[aria-pressed]` outside `#customer-reviews`) · `tests/helpers/promo.mjs:10-18` (waits for 0 `dialog-overlay`).

## Requirements
- R1: thumbnail becomes a real `<button>` (`type="button"`) with `data-testid="review-image-thumb"` + non-empty `aria-label`; whole thumb clickable; **no** `aria-pressed`, **no** `data-testid="review-actions-trigger"`.
- R2: click → controlled dialog shows full-size image (same data URL as thumb) centered on the dark overlay.
- R3: close via close button, Escape, and backdrop click (all free from Base UI modal: `modal` default `true`, `disablePointerDismissal` default `false` → outside press dismisses; focus trapped, scroll locked — `@base-ui/react/dialog/root/DialogRoot.d.ts:34-60`).
- R4: dialog content in **PORTAL** (outside `<article>`) → `g-reviews` R5 (`:220`) stays green; component rendered as a React sibling of `</article>` too.
- R5: 3 new i18n keys × both locales; no new deps; file <200 LOC.

## Architecture
`ReviewCard` owns `activeImage: string | null`; thumb `onClick` sets it; `<ReviewImageLightbox src author onClose />` renders a controlled `Dialog` (open ⇔ `src !== null`) — one dialog root per card, closed = zero DOM.

## Related Code Files
- **Create**: `src/components/reviews/review-image-lightbox.tsx` (~55 LOC)
- **Modify**: `src/components/reviews/review-card.tsx` (91 → ~112 LOC: state `:29-31`, thumb map `:76-86`, return → fragment `:32-90`)
- **Modify**: `src/messages/en.json:152` and `src/messages/vi.json:152` (insert after `editWindowClosed`, before closing brace `:153`)
- **Delete**: none

## Implementation Steps
1. **i18n (both files)** — add under `destinations.reviews`:
   - `lightboxClose`: EN `Close` / VI `Đóng` (mirrors `promo.close`)
   - `lightboxTitle`: EN `Photo viewer` / VI `Trình xem ảnh` (sr-only `DialogTitle`)
   - `lightboxImageAlt`: EN `Photo by {author}` / VI `Ảnh của {author}` (thumb `aria-label` + full-size `alt`)
2. **Create `review-image-lightbox.tsx`** (`"use client"`), sketch:
   ```tsx
   <Dialog open={src !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
     <DialogContent
       data-slot="review-lightbox"
       closeSlot="review-lightbox-close"
       closeLabel={t("reviews.lightboxClose")}
       className="w-[min(96vw,64rem)] max-h-[92vh] p-3"
     >
       <DialogTitle className="sr-only">{t("reviews.lightboxTitle")}</DialogTitle>
       {/* eslint-disable-next-line @next/next/no-img-element -- data-URL full-size image */}
       <img src={src} alt={t("reviews.lightboxImageAlt", { author })}
            className="mx-auto block max-h-[80vh] w-auto max-w-full rounded-md object-contain" />
     </DialogContent>
   </Dialog>
   ```
   - Props: `{ src: string | null; author: string; onClose: () => void }`.
   - `data-slot`/`closeSlot` override works (spread after hardcoded attr, precedent `promo-modal.tsx:25-26`).
3. **Display strategy — plain `<img>`, not `next/image`**: precedent `review-image-input.tsx:61-66`; Next force-sets `unoptimized=true` for `data:`/`blob:` src (`node_modules/next/dist/shared/lib/get-img-props.js:272-276`) so `next/image` adds nothing for one full-size data URL (no loader/resize benefit). KISS.
4. **Panel/overlay override**: pass `className` (merged via `cn` = clsx+tailwind-merge → later wins) to beat defaults `dialog.tsx:57`. Overlay stays default (`dialog.tsx:53` gives no className passthrough) — dark `bg-black/50 backdrop-blur-xs` z-[60] is already the backdrop; do NOT edit `dialog.tsx`.
5. **`review-card.tsx`**:
   - `const [activeImage, setActiveImage] = useState<string | null>(null);`
   - wrap each `<Image …/>` in `<button type="button" data-testid="review-image-thumb" aria-label={t("reviews.lightboxImageAlt", { author: review.authorName })} onClick={() => setActiveImage(image)} className="rounded-md focus-visible:outline-2">` (keep inner `<Image>` + its `alt`/classes unchanged → `img` count per card unchanged).
   - return `<><article …>…</article><ReviewImageLightbox src={activeImage} author={review.authorName} onClose={() => setActiveImage(null)} /></>`.
6. `npm run lint` + `npm test` (parity for new keys).

## Todo List
- [x] Add 3 keys to `src/messages/en.json` + `src/messages/vi.json`
- [x] Create `src/components/reviews/review-image-lightbox.tsx`
- [x] Convert thumbs → `<button data-testid="review-image-thumb">` in `review-card.tsx`
- [x] Add lightbox state + sibling render in `review-card.tsx`
- [x] Visual check on `/vi/explore/destinations/hcm` (seeded review w/ image): image large + centered, X/Escape/backdrop close, 0 console errors
- [x] `npm run lint` && `npm test` (14/14)

## Success Criteria
- Thumb = button with testid + aria-label; click shows full-size image in portal dialog; close via X / Escape / backdrop.
- `page.$$eval('[data-testid="review-card"] img')` still 1 per card (g-reviews R5); 0 `aria-pressed` added; trigger testid untouched.
- i18n parity green; all files <200 LOC; no new deps; lint clean.

## Risks
- Promo + lightbox both use `z-[60]` overlay → mutually exclusive only if promo dismissed first (test ordering, P3).
- Panel width `w-[min(96vw,64rem)]` vs close button position (`absolute top-2 right-2`) — verify button stays visible/clickable in visual check.
- Small fixture image (1×1 PNG) still renders — panel width is class-driven, not image-driven (screenshot evidence prefers a generated ≥320px image, P3).

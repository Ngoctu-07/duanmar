# Review Image Lightbox & Contact Form Heading — Plan

**Date**: 2026-09-28 · **Type**: Feature (UI) · **Status**: Complete

## Executive Summary
Two small UI gaps + one href fix. (1) Review photo thumbnails are not clickable → add a **single-image lightbox** (reuse Base UI `Dialog`, portal-rendered, dark backdrop; no prev/next/swipe/zoom — YAGNI). (2) `/contact` feedback form has no heading → add `<h2>` **"Form liên hệ"** as the FIRST child of `form[data-testid="contact-form"]` + `contact.formHeading` i18n ×2 locales. (3) Search index entry `/about/contact` → `/contact` (`search/page.tsx:115-117`). Phone + Gmail contact cards are **verify-only** (already render). New browser test `tests/browser/n-lightbox-contact.mjs` proves both ACs.

## Context Links
- **Reports**: `reports/plan-summary.md` (later phases → `reports/`)
- **Precedents**: `src/components/layout/promo-modal.tsx:23-29` (controlled Dialog + `closeSlot`/`closeLabel`/sr-only title) · `src/components/ui/dialog.tsx:39-81` (portal `:52`, overlay `:31`, panel `:57`, close `:63-77`) · `src/components/reviews/review-image-input.tsx:61-66` (plain `<img>` + eslint-disable for data URL) · `src/components/booking/booking-contact-section.tsx:22-26` (`<h2 id>` + `aria-labelledby`)
- **Test contracts**: `tests/browser/g-reviews.mjs:220-221` (1 `img`/card) · `k-review-actions.mjs:78-88` (trigger testid) · `c-booking.mjs:48-49` (`button[aria-pressed]` outside `#customer-reviews`) · `j-about-contact.mjs:87-99,117-155,159-164` · `m-footer-brand.mjs:116-119,173-174` · `tests/helpers/promo.mjs:1-19` · `tests/unit/i18n-parity.test.ts:22-58`

## Binding Decisions (do not re-ask)
1. Lightbox = **single-image viewer only** (no prev/next, no swipe, no zoom).
2. Search index fix `src/app/[locale]/search/page.tsx:115-117` `/about/contact` → `/contact`; legacy 308 stub `src/app/[locale]/about/contact/page.tsx:14` STAYS (`j-about-contact.mjs:159-164` asserts it).
3. Contact details block = **verify only, no change** — `contact/page.tsx:39-64` renders 5 cards from `contact.nodes` (Phone + Email/Gmail), asserted `j-about-contact.mjs:87-99`.
4. Lightbox markup renders in the Dialog **PORTAL**, outside `<article>` (`g-reviews.mjs:220` counts `${CARD} img` === 1/card) and as a React sibling of the card (defense-in-depth if portal ever disabled).
5. Heading lives INSIDE `<form>` as first child (AC2 test = first element of `form[data-testid="contact-form"]`); VI copy is exactly `Form liên hệ`.
6. Footer Col B untouched (byte-equal to `contact.nodes`, `m-footer-brand.mjs:116-119`) — no `/contact` link added there.

## Implementation Phases

| # | Phase | Status | Progress | Plan file | Depends on | Verification |
|---|-------|--------|----------|-----------|-----------|--------------|
| 1 | Review image lightbox (thumb → button, portal dialog) + 3 i18n keys | Complete | 100% | [phase-01](phase-01-review-lightbox.md) | — | lint, `npm test`, DOM `/vi/explore/destinations/hcm` |
| 2 | Contact form heading + `contact.formHeading` ×2 + search href fix | Complete | 100% | [phase-02](phase-02-contact-heading-and-ctas.md) | P1 (shared `messages/*.json`) | lint, `npm test`, DOM `/vi/contact` + `/en/contact` |
| 3 | Browser test `n-lightbox-contact.mjs` + pipeline + changelog | Complete | 100% | [phase-03](phase-03-tests-pipeline-changelog.md) | P1–P2 | `npm test` 14/14, build, `npm run test:browser` |

## New Files (exact allow-list)
- **Create (2)**: `src/components/reviews/review-image-lightbox.tsx` · `tests/browser/n-lightbox-contact.mjs` (+ this plan dir)
- **Modify (5)**: `src/components/reviews/review-card.tsx` · `src/components/contact/contact-form.tsx` · `src/app/[locale]/search/page.tsx` · `src/messages/en.json` · `src/messages/vi.json` · `docs/project-changelog.md` (P3)
- **Delete: 0.** No `*-enhanced` files · no new dependencies · every code file <200 LOC (contact-form 158→~163, review-card 91→~112).

## Global Verification (every phase)
`npm run lint` → `npm test` (14/14, incl. i18n parity en↔vi) → **stop dev server** → `npm run build` → `npm run dev` :3000 → `npm run test:browser` (13 files; only pre-existing `revalidate-webhook` env failure tolerated; `tests/browser/revalidate-webhook.mjs` NEVER edited).

## Key Risks
- `dismissPromo` (`tests/helpers/promo.mjs:10-18`) waits for ZERO `[data-slot="dialog-overlay"]` then presses Escape → tests must dismiss promo BEFORE opening lightbox, never while open.
- Overlay/backdrop is not class-overridable (`dialog.tsx:53` renders `<DialogOverlay />` with no passthrough) → accept default `bg-black/50 backdrop-blur-xs z-[60]`; if too light, requires `dialog.tsx` edit (OUTSIDE allow-list → do not).
- Heading must not add `role="alert"`/button/`aria-pressed` → would break `j-about-contact.mjs:117-128` (exactly 4 alerts) / `k-review-actions` / `c-booking`.
- i18n parity fails if a key lands in only one locale (`i18n-parity.test.ts`).
- Per-card lightbox state → up to N dialog roots on a page (all closed = 0 DOM) — accepted, KISS.

## Unresolved Questions — ALL RESOLVED
1. EN heading value = `Contact Form` (accepted, VI locked `Form liên hệ`).
2. `lightboxClose` EN/VI = `Close`/`Đóng` (accepted, mirrors `promo.close`).
3. Sizing tuned in P1 visual check: panel `w-[min(96vw,64rem)] max-h-[92vh]` + `max-h-[80vh]` image (accepted).

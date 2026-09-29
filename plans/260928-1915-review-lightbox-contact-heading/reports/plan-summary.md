# Plan Summary — Review Lightbox + Contact Heading (2026-09-28 · Planned · Feature UI)

## What
1. **AC1**: review photo thumbnail → clickable button → single-image lightbox (Base UI Dialog, portal, dark backdrop; no prev/next/swipe/zoom).
2. **AC2**: `/contact` form gets a prominent heading line — VI `Form liên hệ` (EN `Contact Form`) as FIRST child of `form[data-testid="contact-form"]`; Phone + Gmail cards already render (verify-only).
3. Search index entry `/about/contact` → `/contact` (`src/app/[locale]/search/page.tsx:115-117`); legacy 308 stub untouched.

## Why
Thumbnails currently render but are inert (`review-card.tsx:74-88`) and the contact form has no heading (page has only h1 `:33`, form starts straight into Field 1 `:98`); search still advertises the retired `/about/contact` URL.

## Files
- **Create**: `src/components/reviews/review-image-lightbox.tsx` · `tests/browser/n-lightbox-contact.mjs`
- **Modify**: `src/components/reviews/review-card.tsx` · `src/components/contact/contact-form.tsx` · `src/app/[locale]/search/page.tsx` · `src/messages/{en,vi}.json` · `docs/project-changelog.md`
- **Delete**: none · **New deps**: none

## i18n (×2 locales, parity test enforced)
`destinations.reviews.{lightboxClose,lightboxTitle,lightboxImageAlt}` · `contact.formHeading`

## Phases
| # | Phase | Status |
|---|-------|--------|
| 1 | [phase-01-review-lightbox.md](../phase-01-review-lightbox.md) — lightbox + 3 keys | Planned |
| 2 | [phase-02-contact-heading-and-ctas.md](../phase-02-contact-heading-and-ctas.md) — heading + search href | Planned |
| 3 | [phase-03-tests-pipeline-changelog.md](../phase-03-tests-pipeline-changelog.md) — `n-lightbox-contact.mjs` + gates + changelog | Planned |

## Open Questions
1. EN `contact.formHeading` = `Contact Form`? (VI locked to `Form liên hệ`)
2. `lightboxClose` `Close`/`Đóng` OK? (mirrors `promo.close`)
3. Backdrop stays default (`dialog.tsx:53` exposes no overlay className) — accept `bg-black/50 backdrop-blur-xs`?

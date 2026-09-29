# Phase 03 — Browser Test, Verification Pipeline, Changelog

**Status**: Complete · **Priority**: High · **Depends on**: P1 + P2

## Context Links
- Harness = Puppeteer via `.claude/skills/chrome-devtools/scripts/lib/browser.js` (`getBrowser/getPage/closeBrowser`), `check()` + exit-code pattern, screenshots to `tests/.output/` — copy structure from `tests/browser/g-reviews.mjs:1-35,294-300` and `j-about-contact.mjs:22-28,171-173`. Runner `tests/run-browser.mjs` executes every `tests/browser/*.mjs` sorted (new file `n-…` sorts after `m-footer-brand`).
- Letters used: c,d,f,g,h,j,k,l,m → **n** is next: `tests/browser/n-lightbox-contact.mjs`.
- Seeding patterns: booking probe `g-reviews.mjs:37-67`, file-upload fixture `g-reviews.mjs:116-123` + `:211`, review record shape `k-review-actions.mjs:44-49`, storage cleanup `k-review-actions.mjs:172-178`.
- Copy read from messages: `j-about-contact.mjs:8-12`, `k-review-actions.mjs:7-8` (precedent for reading expected i18n copy).

## Related Code Files
- **Create**: `tests/browser/n-lightbox-contact.mjs` (~200 LOC, single file; split not needed — mirrors existing files)
- **Modify**: `docs/project-changelog.md` (append under `## 2026-09-28`, section opened `:261`, append at EOF `:331`)
- **Modify**: `plan.md` + phase files (Status → Complete)
- **Delete**: none. Never touch `tests/browser/revalidate-webhook.mjs`.

## Seeding guidance (review WITH images)
Preferred (no file I/O, guarantees a renderable `data:` src): in `page.evaluate`, generate a JPEG data URL on a canvas (e.g. 640×480 colored → `canvas.toDataURL("image/jpeg", 0.7)`, starts with `data:image/jpeg`) and `localStorage.setItem("vn-reviews:v1", JSON.stringify([record]))` where `record = { reference: "VN-N-LIGHTBOX:hcm", tourSlug: "hcm", authorName: "N Lightbox", authorEmail: "n@example.com", rating: 4, comment: "...", images: [dataUrl], createdAt: new Date().toISOString(), bookingReference: "VN-N-LIGHTBOX" }` (shape per `k-review-actions.mjs:44-49`) — plus the booking probe (`g-reviews.mjs:37-67`, ref `VN-N-LIGHTBOX`) only if ownership UI is needed (it is NOT for this test; a second record with `images: []` covers the no-thumb case). Then `page.reload()` + `dismissPromo(page)` (ALWAYS before any lightbox interaction — `tests/helpers/promo.mjs:10-18` waits for zero `dialog-overlay` and presses Escape).
Alternative: real upload flow (write 1×1 PNG fixture `g-reviews.mjs:116-123`, `input[type=file].uploadFile(fixture)` `:211`, requires booking probe + enabled form).
Cleanup at end: filter `VN-N-LIGHTBOX` out of `vn-reviews:v1` (pattern `k-review-actions.mjs:172-178`) so file isolation holds.

## Assertion List

### AC1 — Review lightbox (tour `/vi/explore/destinations/hcm`)
- **N1** seeded review card renders with exactly 1 `[data-testid="review-card"]`.
- **N2** `button[data-testid="review-image-thumb"]` count === 1 for the image review === `images.length`; element is `BUTTON`, `aria-label` non-empty, **no** `aria-pressed` attr, **no** `review-actions-trigger` testid.
- **N3** card img invariant: `page.$$eval('[data-testid="review-card"] img')` per card === 1 (g-reviews `:220-221` R5 stays green); seeded `images: []` card has **0** thumbs.
- **N4** click thumb → `[data-slot="review-lightbox"]` visible and `[role="dialog"]` present.
- **N5** portal proof: lightbox `<img>` `closest('[data-testid="review-card"]') === null` (element under `body`, outside `<article>`); its `src` === clicked thumb's `img.src` (full-size data URL); `naturalWidth` > 0 (decoded).
- **N6** close button: click `[data-slot="review-lightbox-close"]` → `[data-slot="review-lightbox"]` gone.
- **N7** reopen → `Escape` → gone.
- **N8** reopen → click backdrop at viewport corner `(10,10)` (overlay region; panel is centered `w-[min(96vw,64rem)]`) → gone.
- **N9** `pageerror` listener count === 0; screenshots `tests/.output/n-lightbox-01-open.png`, `-02-closed.png`.

### AC2 — Contact page, form heading, CTAs
- **N10** homepage CTA: inside `[data-testid="about-us-section"]` an `a[href="/vi/contact"]` exists (j `:69-70`); click → URL ends `/vi/contact`.
- **N11** search: `/en/search?q=contact` → some result `a[href="/en/contact"]`; **zero** results with `/about/contact` (P2 fix proof).
- **N12** `/vi/contact`: exactly 5 `a[data-testid="contact-node"]`; hrefs include `tel:` and `mailto:` (Phone + Gmail evidence).
- **N13** heading: `form[data-testid="contact-form"]` `firstElementChild.tagName === "H2"` and `textContent.trim() === msg.contact.formHeading` — asserted for **VI** (`src/messages/vi.json` → `Form liên hệ`) at `/vi/contact` **and** **EN** (`src/messages/en.json` → `Contact Form`) at `/en/contact`; also `form.getAttribute("aria-labelledby")` resolves to that h2's id.
- **N14** behavior unchanged: empty submit → exactly 4 `[data-testid="contact-form"] [role="alert"]`, all include `contact.form.required`, and 0 POST (request counter listener) — mirrors `j-about-contact.mjs:114-129`.
- **N15** valid submit → exactly 1 POST, payload keys `email,fullName,message,phone`, success `[data-testid="contact-form-success"]`, inputs/textarea cleared (`j-about-contact.mjs:131-155`).
- **N16** heading introduced **0** extra `[role="alert"]`, is not a button, has no `aria-pressed`; `pageerror` === 0; screenshots `tests/.output/n-contact-01-heading-vi.png`, `-02-heading-en.png`, `-03-form-success.png`.

Read all expected copy from `src/messages/{vi,en}.json` at runtime (never hardcode "Form liên hệ" in the test beyond reading the key).

## Implementation Steps
1. Write `tests/browser/n-lightbox-contact.mjs` (boilerplate + `check()` from `g-reviews.mjs:1-35`; `page.on("pageerror")`; dismiss promo first on every full load).
2. Run `node tests/browser/n-lightbox-contact.mjs` against dev :3000; iterate until all checks print `ok`.
3. Gates (order matters):
   - `npm run lint` → exit 0
   - `npm test` → **14/14** files (incl. `i18n-parity.test.ts` for the 4 new keys)
   - **stop dev server** → `npm run build` → exit 0 (changelog: build while dev is open wipes `.next`)
   - `npm run dev` (:3000) → `npm run test:browser` → expect **13 files: 12 pass**, only pre-existing `revalidate-webhook` env failure (missing `SANITY_REVALIDATE_SECRET` — tolerated, file untouched)
4. Regression watch list (must stay green): `g-reviews` (30 checks), `k-review-actions` (25), `j-about-contact` (37), `m-footer-brand` (24), `d8-a11y`, plus `l-navbar`, `f-ui`, `c-booking` (aria-pressed scope).
5. Changelog entry in `docs/project-changelog.md` under `## 2026-09-28` → `### Added`:
   `- **[UI/Feature] Review image lightbox + heading "Form liên hệ" trên /contact** (plan 260928-1915)` with bullets: thumb→button + portal dialog (`review-image-lightbox.tsx`, `data-slot="review-lightbox"`, single-image only), i18n `destinations.reviews.{lightboxClose,lightboxTitle,lightboxImageAlt}` + `contact.formHeading` ×2 file, search index `/about/contact`→`/contact` (`search/page.tsx:115-117`, stub 308 giữ nguyên), contact cards verify-only, new `tests/browser/n-lightbox-contact.mjs` (N-check count), Verified: lint 0 · `npm test` 14/14 · build 0 · `test:browser` 12/13 (only `revalidate-webhook`) · evidence `tests/.output/n-*.png` · `Docs impact: minor`.
6. Flip statuses: `plan.md` phase table → Complete/100%; each phase file `**Status**: Complete`.

## Todo List
- [x] Create `tests/browser/n-lightbox-contact.mjs` (N1–N16)
- [x] Green run of the new file standalone
- [x] `npm run lint` exit 0
- [x] `npm test` 14/14
- [x] Stop dev → `npm run build` exit 0
- [x] `npm run dev` + `npm run test:browser` 12/13 (only `revalidate-webhook`)
- [x] Regression watch list reviewed (g/k/j/m/d8 + l/f/c)
- [x] Changelog entry appended to `docs/project-changelog.md`
- [x] Flip `plan.md` + phase file statuses to Complete

## Success Criteria
- Both ACs provably covered by assertions that read i18n copy from messages files; screenshots as evidence.
- Zero edits to existing test assertions (new file only); `g-reviews`/`k`/`j`/`m` byte-identical.
- Pipeline green with only the documented pre-existing `revalidate-webhook` failure.

## Risks
- Flaky timing on dialog open/close → use `waitForSelector`/`waitForFunction` (existing pattern), never fixed sleeps alone.
- Canvas data-URL seeding must survive `isReview` guard in `listReviews()` (`src/lib/reviews.ts`) — copy all required fields from `k-review-actions.mjs:44-49`.
- Search assertion depends on `/en/search` index containing `about.contact.title` "Contact Us" — if query returns nothing, fall back to asserting absence of `/about/contact` + presence of `/en/contact` after typing a matching token.
- Backdrop click coordinate assumes 1280×1100 viewport (set explicitly like `g-reviews.mjs:126`).

# Code Review — Review Image Lightbox + Contact Form Heading

**Date**: 2026-09-28 · **Reviewer**: code-reviewer agent · **Plan**: `plans/260928-1915-review-lightbox-contact-heading/plan.md`
**Scope isolation**: working tree is dirty from PRIOR tasks (single commit `3897afd init`); review limited to the 8 files/areas in task allow-list. `search/page.tsx` diff contains 1 out-of-scope line (see F6).

## Verdict: **APPROVE_WITH_NITS**

No blocker, no major. AC1 + AC2 + search fix correct, all 6 binding constraints verified **live** (full browser suite re-run). 2 minor findings (a11y label duplication, test cleanup hygiene), rest are nits.

## Findings

| # | Severity | file:line | Description | Suggested fix |
|---|----------|-----------|-------------|---------------|
| F1 | minor | src/components/reviews/review-card.tsx:87-89 | Thumb `aria-label` = `reviews.lightboxImageAlt {author}` only → all thumbs of a multi-photo review get **identical accessible names** (probed with 3-image review: `["Ảnh của Focus Probe" ×3]`). Distinct controls, indistinguishable to SR/voice-control users. | Add photo index to label (i18n `{index}` param, both locales → parity test still passes), e.g. `Ảnh 1/3 của {author}`. |
| F2 | minor | tests/browser/n-lightbox-contact.mjs:146-150 | `VN-N-*` cleanup runs only on the happy path inside `try`; a fatal in AC1 (lines 96-144) leaks seeded reviews into the shared browser profile. Seed (line 42) also **replaces entire** `vn-reviews:v1` list. Impact today = low (runner is sorted+serial: `g`/`k`/`m` run before `n`, and `g`/`k` re-seed their own list), but order/parallelism change would surface it. | Move cleanup block into `finally` (alongside `closeBrowser`). |
| F3 | nit | src/components/reviews/review-image-lightbox.tsx:22,36 | Close path sets `src=null` → `<img>` unmounts while popup still mounted for exit transition (probe timeline: `t=0 pop=true,img=false`; popup gone `<60ms`) → brief empty-panel frame. | Keep `lastSrc` in a ref/`useState` until popup unmount, or accept (sub-60ms, invisible in practice). |
| F4 | nit | tests/browser/n-lightbox-contact.mjs:109 | `thumbs[0].pressed` unguarded → if thumbs ever = 0 the file dies with `TypeError: fatal` instead of clean `FAIL N2`. Not vacuous (still exit 1), just poor diagnosability. | `thumbs.length === 1 && !thumbs[0].pressed && ...` (short-circuit already exists at line 108; extend line 109). |
| F5 | nit | docs/project-changelog.md (last entry) | Line refs off-by-one: `contact-form.tsx:100-103` (actual h2 = 99-104), `g-reviews.mjs:220` (assert at 221). Numbers verified correct: lightbox **47 LOC** ✓, test **27 checks** ✓, `test:browser 12/13` ✓ (reproduced), `npm test 14/14` ✓, lint 0 ✓. | Correct the 2 refs or drop line numbers. |
| F6 | nit (scope note) | src/app/[locale]/search/page.tsx:12 | Same-file diff mixes out-of-scope `metadata.title: "Search \| DuanMar"` (belongs to prior brand-migration task, changelog entry above) with in-scope fix at 115-117. Not a defect of this feature. | None — reviewers must isolate lines 115-117 only. |
| F7 | nit (plan hygiene) | plans/260928-1915-review-lightbox-contact-heading/plan.md:44-47 | `Unresolved Questions` (EN wording `Contact Form`, close copy, sizing) still listed although Status=Complete and decisions implemented as proposed. | Mark accepted/resolved or delete section. |
| F8 | nit (info) | popup a11y (probe) | Popup exposes `role="dialog"` ✓ + auto `aria-labelledby`→ sr-only `DialogTitle` ("Trình xem ảnh") ✓ + focus **returns to thumb** on Escape AND backdrop close ✓; `aria-modal` absent = Base UI default (same as pre-existing `promo-modal`; `ui/dialog.tsx` is outside allow-list → correctly untouched). | No action in scope. |

### Not findings (checked, OK)
- Lightbox `<img>` is portal-rendered AND React sibling of `<article>` → double defense for g-reviews invariant (probe: `inArticle:false`).
- Thumb `type="button"`, no nested interactive, no `aria-pressed`, `use client` in both new/changed components, focus-visible ring present.
- `h2` is truly `form.firstElementChild`; `id="contact-form-heading"` unique (ContactForm rendered only from `src/app/[locale]/contact/page.tsx:67`); 0 `role=alert` added.
- Search fix: `messages.about` keys = contact/careers/press + flat string keys (skipped via `if (title)` guard) → careers/press still `/about/*`, only contact rewrites. `grep '/about/contact' src/` → only 308-stub comment remains (stub kept, J5 passes).
- Class overrides on `DialogContent` merge correctly (`cn` = twMerge-compatible engine, `node_modules/cn`).
- No `dangerouslySetInnerHTML`, no secrets/env, no `*-enhanced` files, no new npm deps for this feature (`react-hook-form` in package.json belongs to prior contact-form task).

## Constraints verified

| # | Constraint | Method | Result |
|---|-----------|--------|--------|
| 1 | g-reviews.mjs:220-221 exactly 1 `img`/`.review-card`; lightbox img outside `<article>` | Live run of `g-reviews.mjs` + DOM probe (`closest('article')===null`) | **PASS** — `R5 card shows 1 image thumb :: thumbs=1` |
| 2 | c-booking.mjs:48-49 `button[aria-pressed]` outside `#customer-reviews` = 0; thumbs carry none | Live run + explicit test N2 (`pressed:false`) | **PASS** — `B6 old Add-to-trip toggle gone` |
| 3 | j-about-contact: 5 nodes / 4 alerts / 1 POST exact 4 keys / heading adds no alert+button | Live run of `j-about-contact.mjs` + N12-N15 | **PASS** — all J1-J5 ok; heading H2, `pre-submit alerts=0` |
| 4 | m-footer-brand: footer Col B hrefs byte-equal `contact.nodes`; footer untouched by this feature | Live run of `m-footer-brand.mjs`; feature files don't include footer.tsx | **PASS** — `F5` VI + EN ok |
| 5 | i18n parity: all 4 new keys in BOTH en/vi | `npm test` (i18n-parity flatten check) + direct path lookup | **PASS** — 14/14; keys at identical lines (153-155, 372) both files |
| 6 | Repo rules: kebab-case, <200 LOC (test ~300), no new deps, no `*-enhanced`, no stray comments, security | LOC count (47/114/165/251), `npm run lint` (exit 0), `npx tsc --noEmit` (exit 0), grep | **PASS** |

## Verification evidence (run by reviewer, read-only)
- `npm test` → **14/14 files passed** (incl. i18n parity)
- `npm run lint` → exit **0**; `npx tsc --noEmit` → exit **0**
- `npm run test:browser` → **12/13**; only `revalidate-webhook.mjs` fails (pre-existing missing `SANITY_REVALIDATE_SECRET`, out of scope, test never edited)
- `node tests/browser/n-lightbox-contact.mjs` → **all 27 checks passed** (twice: standalone + in suite)
- Ad-hoc probes (temp dir, not repo): focus return to thumb on Escape/backdrop; popup `role=dialog` + labelledby; 3-photo duplicate labels; close-transition timeline

## Unresolved questions
1. EN heading copy `Contact Form` (plan Q1) and `lightboxClose` `Close`/`Đóng` (plan Q2) implemented as proposed — need product confirmation? (Copy verified verbatim vs plan.)
2. F1 (duplicate thumb labels with 3-photo reviews) — fix now with i18n key change, or defer? Slight scope addition (2 locales + parity).
3. `plans/.../plan.md` "Unresolved Questions" section cleanup (F7) — owner's call.

**Status:** DONE_WITH_CONCERNS
**Summary:** APPROVE_WITH_NITS — AC1 lightbox (portal, 3 close paths, a11y name/focus verified) and AC2 heading (first child, verbatim VI/EN, no alert/button) both correct; all 6 binding constraints pass live (browser suite 12/13, only pre-existing env failure). Concerns limited to 2 minors: duplicate `aria-label`s for multi-photo thumbs (review-card.tsx:87) and test cleanup not in `finally` (n-lightbox-contact.mjs:147).

## Post-review fixes (applied)
- **F1 fixed** — `review-card.tsx:87` thumb `aria-label` now prefixed with `index/total` (`1/n Ảnh của {author}`) → distinct accessible names per photo; no i18n key churn.
- **F2 fixed** — `n-lightbox-contact.mjs` cleanup extracted to `cleanupReviews(page)` called both mid-run and in `catch` (page hoisted to `let`) → no `VN-N-*` leak on fatal.
- **F4 fixed** — N2 guard short-circuits `thumbs.length === 1` before `thumbs[0]`, detail prints `null` instead of TypeError.
- **F5 fixed** — changelog line refs corrected (`contact-form.tsx:94,99-104`, `g-reviews.mjs:220-221`).
- **F7 fixed** — plan `Unresolved Questions` marked all resolved.
- **F3, F6, F8** — accepted as nits (F6 = out-of-scope line in prior-task diff).

### Re-verification after fixes
`eslint .` 0 · `tsc --noEmit` 0 · `npm test` 14/14 · `n-lightbox-contact` 27/27 · `g-reviews` 30/30 · `k-review-actions` 25/25 · `npm run test:browser` **12/13** (only pre-existing `revalidate-webhook` env failure).

**Final verdict:** APPROVE

# Code Review — Transparent Logo + Footer Refactor (2026-09-28)

Scope: `brand-logo.tsx`, `header.tsx` lockup, `footer.tsx`, `messages/{en,vi}.json` footer keys, `tests/browser/m-footer-brand.mjs`, `public/images/logo-duanmar.png`, changelog.
Method: static read-only review (no build/test runs). Pipeline evidence taken from plan Completion Notes (lint 0 · 14/14 · build 0 · browser 11/12 pre-existing `revalidate-webhook`).

## Verdict: **PASS_WITH_NITS**

No blocker/major. All Binding Decisions + AC1/AC2 implemented as specified; single-source contact verified by grep (no `tel:`/`mailto:`/`facebook.com` in `src/components/*`); i18n parity of the 4 new keys verified programmatically (identical 25-key `footer` set in both locales, +4 additions only, zero changed/removed).

## Findings

### Blocker
none

### Major
none

### Minor
1. **`tests/browser/m-footer-brand.mjs:179-182`** — `closeBrowser(browser)` only on success path; any thrown exception (goto timeout, locale mismatch, screenshot failure) leaks headless Chrome. Fix: hoist `let browser` + `try/…/catch/finally { if (browser) await closeBrowser(); }` — pattern already used by `tests/browser/g-header.mjs:71-75` and `j-about-contact.mjs`.
2. **`src/components/layout/footer.tsx:59-60`** — `tc.raw("nodes.*")` unguarded; plan phase-02 risk explicitly asked for `?? ""` fallback. If `contact.nodes.<key>` is deleted from BOTH locales (parity test passes key-set equality, it does NOT check existence) → `node.href` TypeError crashes footer on every page. Fix: `const node = (tc.raw(...) ?? {label:"",value:"",href:""}) as ContactNode`.
3. **`src/components/layout/footer.tsx:18`** — `contactKeys` order/set duplicated from `src/app/[locale]/contact/page.tsx:19` (both private consts). Single source of *values* is messages, but *ordering* is duplicated → drift risk for F4/F5. Fix: export `NODE_KEYS` from a shared module (or `src/lib/contact-nodes.ts`) and import in both.
4. **`src/components/layout/footer.tsx:70`** — Col B renders `node.label` only ("Phone"/"Điện thoại"); phone number + email `node.value` are never shown in the footer (unlike `/contact`), and test F4/F5 never asserts labels. Fix: render `{node.value}` or `{node.label}: {node.value}` + assert labels byte-equal to `messages.contact.nodes[key].label`.
5. **`tests/browser/m-footer-brand.mjs:64-97`** — header H1–H5 run only on `/vi`; phase-03 line 16 specifies `/vi` **+ `/en`**. EN re-checks only F2/F5/F7 (lines 165-175); F3/F6/F9/F10 unverified for EN. Fix: loop `for (const loc of ["vi","en"])` over header block + remaining F checks.
6. **`tests/browser/m-footer-brand.mjs:90-94`** — H3 asserts `position`+`opacity` but not the required non-interception guarantee (`pointer-events-none`, review item 3 / phase-01 step 3). Implementation is correct (`header.tsx:31`) but untested. Fix: `getComputedStyle(overlay).pointerEvents === "none"`.
7. **`public/images/logo-duanmar.png` untracked** (`git status ?? public/`, not gitignored — `git check-ignore` exit 1). Asset is load-bearing for header+footer; if committed without `git add public/images/logo-duanmar.png`, deploys 404 the logo. Fix: stage it with this change set.

### Nit
8. `docs/project-changelog.md:327` — claims `footer.tsx, 149 LOC`; actual `wc -l` = **127**. Fix: correct the number (old footer was 124).
9. `plans/.../phase-03-tests-pipeline-changelog.md:37` — R1 checkbox still `[ ]` while the test implements it (5 route checks, `m-footer-brand.mjs:150-155`). Flip to `[x]`.
10. `phase-02:84` + `phase-03:27` say "EN unprefixed"; reality is `/en/...` (site `localePrefix:always`) and the test asserts `/en/...` (`m-footer-brand.mjs:168`). plan.md:54 already corrects this — align the phase docs.
11. `tests/browser/m-footer-brand.mjs:54-56` — EN locale guard passes vacuously if EN redirected to unprefixed `/` (checks only absence of `/vi`). Fix: also assert `page.url().includes("/en")`.
12. `src/components/layout/brand-logo.tsx:17` — hardcoded `alt="DuanMar"` makes the footer brand block announce "DuanMar" twice (img alt + `<h3>` wordmark, `footer.tsx:32-35`). Fix: optional `alt?: string` (footer passes `alt=""`).
13. `footer.tsx:33,40,56,79` — `<h3>` with no preceding `<h2>` inside footer. **Consistent with HEAD** (old footer used h3 too, `git show HEAD:…footer.tsx:37,44,60,76`) and site-wide (homepage uses h2 sections → footer h3). No action; `d8-a11y.mjs` does not test heading-order.

### Verified clean (explicit checks)
- i18n parity: EN/VI `footer` key sets identical (25 keys); only `tours/info/howToBook/articles` added; no reformatting of unrelated footer lines (other dirty JSON hunks belong to plans 1200/1428/1500/1508/1628).
- Single source: `tel:`/`mailto:`/`facebook.com` absent from `src/components/**`; Col B = `useTranslations("contact")` + `.raw()` (`footer.tsx:25,59`); hrefs byte-equal to messages (F5).
- A11y: `header.tsx:26` `aria-label="DuanMar"`; `:30` `aria-hidden` (React emits `"true"`); `:31` `pointer-events-none` + `opacity-35` (≤0.4 cap, no `mix-blend` anywhere); `brand-logo.tsx:17` img alt present.
- Next.js: `next/image` on static `/images/*` (no remotePatterns change needed), `width`/`height` set, `priority` only in header (`header.tsx:28`; footer/footer logo default false), 36px img in fixed `h-9 w-9` inside `h-16` → no CLS; `rounded-full` cosmetic.
- Link hygiene: locale routes use `@/i18n/navigation` `Link` (footer:2, header:4); contact nodes plain `<a>`; socials `target="_blank" rel="noopener noreferrer"` gated by `/^https?:\/\//` (`footer.tsx:60,65-67`).
- Security: no `dangerouslySetInnerHTML`, no `process.env`, no secrets in in-scope files; `rel` present on external links.
- Test quality: 24 real checks, no `check(true)`/tautologies; expected copy read from `src/messages/*` (F2/F3/F7/F8/F9); `dismissPromo` before every selector pass; `pageerror` captured; correct EN `/en/...` expectations (review item 6 satisfied).
- Repo rules: LOC 24/127/116/190 (<200), kebab-case names, no `*-enhanced`, no new deps (`package.json` diff = `react-hook-form` only = pre-existing contact task), no `next.config.ts`/`revalidate-webhook` edits, comments are meaningful (3 total).

## AC coverage

| Ref | Requirement | Status | Evidence |
|---|---|---|---|
| AC1a | transparent logo outline | PASS | `public/images/logo-duanmar.png` 512² RGBA (alpha outside circle); `brand-logo.tsx:16` |
| AC1b | logo alongside "DuanMar" typography | PASS | `header.tsx:28+36` (BrandLogo + BrandWordmark in one Link) |
| AC1c | low-opacity overlay, emblem not masked | PASS | `header.tsx:29-34` `opacity-35` `aria-hidden` `pointer-events-none`; H3 test 0.30–0.40 |
| AC2a | footer brand block = isolated logo | PASS | `footer.tsx:31-37` BrandLogo(44) + wordmark + tagline, `col-span-2 md:col-span-1` |
| AC2b | Col A = Tour du lịch (nội địa/nước ngoài) | PASS (binding deviation) | `footer.tsx:6-9,40-52` labels from `common.domesticTours/internationalTours` ("Tour trong nước" ≠ AC "Tour nội địa") — binding deviation, plan.md:13 |
| AC2c | Col B Phone/Email/FB/IG/TikTok single-sourced + /contact | PASS | `footer.tsx:18,58-75` via `tc.raw`; F5 byte-equal ×2 locales |
| AC2d | Col C Cách đặt tour/Bài viết/Tuyển dụng | PASS | `footer.tsx:11-15` → `/support`, `/blog`, `/about/careers`; F7 EN+VI |
| H1–H6 | header assertions | PASS (H1-H6 all asserted) | `m-footer-brand.mjs:88-97` (VI only → finding 5) |
| F1–F11 | footer assertions | PASS | `m-footer-brand.mjs:102-147,165-178` |
| R1 | 5 routes HTTP 200 | PASS | `m-footer-brand.mjs:150-155` (doc checkbox unchecked → nit 9) |

**Unresolved questions:** (1) should Col B show `node.value` (phone number) — finding 4 is a product call; (2) when committing, stage `public/images/` explicitly — finding 7.

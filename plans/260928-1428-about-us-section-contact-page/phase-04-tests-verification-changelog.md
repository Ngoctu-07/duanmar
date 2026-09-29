# Phase 04 — Tests + Full Pipeline + Changelog

## Context Links
- Plan: `plan.md` P4 · Research: `research/research-summary.md` §8 (runners, harness, known env failure)
- Files: NEW `tests/browser/j-about-contact.mjs`, `tests/unit/contact-validation.test.ts`; `docs/project-changelog.md`

## Overview
- Priority: high · Status: Complete · Progress: 100% · Est: 0.5 day · Depends on: P1–P3
- Browser e2e for header removal / homepage section / contact nodes / form submit / redirect; unit tests for shared validation lib; run full pipeline; append changelog entry.

## Key Insights
- Runners auto-discover: `npm test` → `tests/run-unit.mjs` scans `tests/unit/*.test.{ts,mts}` (`npx tsx`, local `check()` + `node:assert/strict`, NO framework); `npm run test:browser` → `tests/run-browser.mjs` requires `npm run dev` on :3000, runs `tests/browser/*.mjs` sorted; harness = `.claude/skills/chrome-devtools/scripts/lib/browser.js` + `check()` helper (copy shape from `g-header.mjs:22-33` incl. `dismissPromo`, `pageerror` listener).
- `g-header.mjs` asserts only trip-planner/search/my-trips → unaffected; no existing test touches `/about*` (grep = 0) → P3 changes break nothing pre-existing. Known pre-existing failure: `revalidate-webhook` (needs `SANITY_REVALIDATE_SECRET`) — ignore, do not "fix" by cheating.
- i18n values in assertions read from `src/messages/vi.json` via `node:fs` (avoids hardcoding translated strings; parity test already guarantees en/vi key equality).
- Redirect assertion must use `redirect: "manual"` fetch (status + `location` header) — following fetch hides the 308.
- Validation lib is DOM-free → plain tsx unit test (pattern `booking-logic.test.ts`).

## Requirements
**Functional**
1. NEW `tests/unit/contact-validation.test.ts` (~90 ln): import `{ validateContactPayload, maskEmail, maskPhone }` from `@/lib/contact-validation` (or relative — match existing tests' import style); cases: valid payload → `{}`; each field missing/empty → its required key; `"a@b"`/`"ab b@c.com"`/`123` email → `emailInvalid`; `"abc"`/`""` phone → `phoneInvalid`; short name → `nameInvalid`; message >5000 → `messageInvalid`; non-object input (null/`"str"`/array) → all-required errors (no throw); `maskEmail("a@example.com")` contains no full local part; `maskPhone` no full digits. Local `check()` + `assert.deepEqual`/`assert.equal`, final summary + `process.exitCode` (copy `i18n-parity.test.ts` shape).
2. NEW `tests/browser/j-about-contact.mjs` (~150 ln) — `check()` asserts, sections:
   - **H1 header** (`/vi`, desktop 1280×900): `header a` hrefs contain NO `/about`; still contain `/explore` + `/culture`; mobile viewport (375×812) `Sheet` open → nav has no `/about`.
   - **H2 homepage section**: exactly 1 `[data-testid="about-us-section"]`; `previousElementSibling.textContent` contains `home.featuredDestinations` value (read `vi.json`); `[data-testid="about-us-section"] a[href="/vi/contact"]` exists; `[data-testid="about-promo-video"]` exists; click `[data-testid="about-promo-play"]` → no new `pageerror` (mp4 absent by design) → fallback caption visible.
   - **H3 contact nodes** (`/vi/contact`): 5 `a[data-testid="contact-node"]`; href prefixes in order `tel:`, `mailto:`, contains `facebook.com`, `instagram.com`, `tiktok.com`; every href non-empty; nodes visible (bounding box > 80px wide → "oversized").
   - **H4 form**: submit with empty fields → 4 error texts visible AND zero POST (listen `request` for `/api/contact`); fill valid (values from `vi.json` `contact.form` labels via `page.getByLabel` or `input[name=…]`) → exactly 1 POST `/api/contact` with `content-type: application/json` and payload keys `fullName,email,phone,message` → response 200 → `[data-testid="contact-form-success"]` visible + inputs cleared.
   - **H5 redirect**: `fetch("http://localhost:3000/vi/about/contact", { redirect: "manual" })` → status 308 (accept 307 fallback) + `headers.get("location")` endsWith `/vi/contact`; `/vi/about` → 200.
   - Screenshots into `tests/.output` like `g-header.mjs`; summary `ok/FAIL` + non-zero exit on failure.
3. Changelog: append under existing `## 2026-09-28` (`docs/project-changelog.md:261`):
   `- **[Feature] Homepage About Us section (50/50 text+CTA/video) + new /contact page (contact nodes + React Hook Form form → /api/contact, JSON validation, no DB); header "About Us" nav item removed; /about/contact → 308 /contact** (plan \`260928-1428-about-us-section-contact-page\`)` + next line `  - Verified: npm run lint 0 · npm test NN/NN · npm run build 0 · npm run test:browser NN/NN (revalidate-webhook pre-existing env failure)` + `  - Docs impact: minor`.
4. Full pipeline, in order: `npm run lint` → `npm test` → `npm run build` → `npm run dev` (:3000, fresh) → `npm run test:browser` → manual DOM spot-checks (below).

**Non-functional**: tests <200 LOC, no test skips/cheats, no fake mocks of app code, no changes to product code allowed in this phase except fixing defects found (report first, then minimal fix + rerun).

## Related Code Files
**Tạo**: `tests/unit/contact-validation.test.ts`, `tests/browser/j-about-contact.mjs`
**Sửa**: `docs/project-changelog.md` (append-only under `## 2026-09-28`)
**Không sửa**: any `src/**` (unless a P1–P3 defect surfaced → fix in the owning phase's file, note deviation), existing tests (`g-header.mjs` etc.), `tests/run-*.mjs`, `package.json`

## Implementation Steps
1. Write `contact-validation.test.ts` (cases above), run `npm test` → new file green among suite.
2. Write `j-about-contact.mjs` (H1–H5, reading expected i18n strings from `vi.json`; `dismissPromo` first like other tests; `page.on("pageerror")` collected).
3. Start `npm run dev` on :3000; run `npm run test:browser` → all suites (note: `revalidate-webhook` pre-existing env failure is NOT ours).
4. Run full pipeline; record exact counts.
5. Append changelog entry with verified line + `Docs impact: minor` (roadmap absent → skip).
6. Final DOM/manual sweep + mark phases complete in `plan.md` (Status/Progress → Complete/100%).

## Todo List
- [x] `tests/unit/contact-validation.test.ts` (valid/required/pattern/cap/mask/no-throw)
- [x] `tests/browser/j-about-contact.mjs` (H1 header, H2 section+video, H3 nodes, H4 form submit, H5 redirect)
- [x] `npm run lint` · `npm test` · `npm run build` all green
- [x] `npm run dev` + `npm run test:browser` green (excluding pre-existing `revalidate-webhook` env failure)
- [x] Changelog append (verified line + `Docs impact: minor`)
- [x] Update `plan.md` statuses → Complete/100%

## Success Criteria
- `npm run lint` → 0 errors · `npm test` → all unit files ok (incl. new `contact-validation.test.ts` + `i18n-parity.test.ts`) · `npm run build` → 0.
- `npm run test:browser` → `j-about-contact.mjs` all checks `ok` (H1–H5); only tolerated failure = pre-existing `revalidate-webhook` (missing `SANITY_REVALIDATE_SECRET`).
- Manual: `/vi` shows About section between Featured Destinations and Experience Categories; header (desktop+mobile) has no About item; `/vi/contact` 5 nodes clickable (`tel:` opens dial, `mailto:` opens mail client, socials navigate); empty submit blocks with 4 errors; valid submit → success message; `/vi/about/contact` → 308 → `/vi/contact`.
- Diff hygiene: no `*-enhanced` files, all new files <200 LOC, no hex/`red-*`, no `next/link` in touched files (all `@/i18n/navigation`), changelog entry present with plan tag.

## Risk Assessment
- **R1 flaky form submit timing** → use `page.waitForResponse(r => r.url().includes("/api/contact"))` + `role="status"` wait, not fixed sleeps.
- **R2 promo overlay intercepts clicks** on section CTA → scope selectors with `data-testid`, assert CTA via `href` not coordinates.
- **R3 browser suite needs dev server** → runner exits early with clear message if :3000 down (document: start `npm run dev` first).
- **R4 red-team: tests asserting wrong thing** → assertions read expected strings from `vi.json` (source of truth), not hardcoded guesses; redirect asserted via status code, not just final URL.

## Security Considerations
- Tests POST only benign fixtures (no PII, no secrets) to local dev server · logs scanned to confirm masked email only (no raw fixture email in server output) · no tokens/env values asserted or printed · changelog/tests contain no credentials · rate-limiting gap noted as non-functional follow-up in changelog line.

## Next Steps
- Session complete only when pipeline is green; deviations (extra files, fallback 307, test fixes) recorded in `plan.md` Completion Notes like reference plan.

## Decisions already made
Test file names `j-about-contact.mjs` + `contact-validation.test.ts` (auto-discovered, no runner edits) · i18n strings read from `vi.json` in tests · redirect via `redirect:"manual"` status assert · changelog shape per template · `revalidate-webhook` failure tolerated as pre-existing env issue.

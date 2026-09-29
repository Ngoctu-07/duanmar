# Phase 02 — Browser Test, Verification Pipeline, Changelog

**Status**: Complete · **Priority**: High · **Depends on**: P1

## Context Links
- Harness: Puppeteer via `.claude/skills/chrome-devtools/scripts/lib/browser.js` (`getBrowser/getPage/closeBrowser`), `check()` accumulator + `process.exit(1)` on failure, `dismissPromo` from `tests/helpers/promo.mjs`, screenshots → `tests/.output/` (gitignored, evidence only) — copy boilerplate verbatim from `tests/browser/m-footer-brand.mjs:1-26,49-57,188-194`.
- Runner: `tests/run-browser.mjs:24-27` globs `tests/browser/*.mjs` sorted → new `o-footer-refinement.mjs` runs after `n-…`, before `revalidate-webhook` (n < o < r); suite count 13 → **14 files**.
- Contract duplicates to mirror: 4 children + title order `m-footer-brand.mjs:103-108` · brand block `:135-139` · bottom bar `:140-147` · overflow @1280 `:86+97` · overflow @375 `h4-p4-e2e.mjs:262-274` (`scrollW <= vw + 1`).
- Expected sizes (from P1): wordmark 48px @1280 (`text-5xl`), 36px @375 (`text-4xl`); header wordmark 20px (`header.tsx:36` `text-xl`); `tracking-tight` = -0.025em (negative px), `leading-none` = line-height 1×font-size, `font-bold` = 700; nav gaps 24px (`gap-x-6`/`md:gap-x-6`).
- Changelog: `docs/project-changelog.md` — `## 2026-09-28` at `:261`, file 341 lines; append `### Changed` block at EOF (house precedent: latest entries appended at EOF with repeated section heading).

## Related Code Files
- **Create**: `tests/browser/o-footer-refinement.mjs` (~180 LOC, single file — mirrors existing test files, no split needed)
- **Modify**: `docs/project-changelog.md` (EOF append) · `plan.md` + `phase-01`/`phase-02` (Status → Complete, 100%)
- **Delete**: none. **0 edits to existing tests** — `m-footer-brand.mjs` must still pass **24/24**; never touch `revalidate-webhook.mjs`.

## Assertion List (`o-footer-refinement.mjs`, VI locale @ `/vi`)
- **O1a**: `footer .grid` has exactly **4 direct children** (F1 duplicate, cheap contract guard).
- **O1b**: per-child `h3` titles order = `["DuanMar", vi.footer.tours, vi.footer.contact, vi.footer.info]` (F2 duplicate).
- **O2a**: computed `font-size` of footer wordmark span (`footer h3 span.font-brand` = `footer .grid > div:first-child h3 span`) @1280 ∈ **[32, 48]px** (200–300% of 16; expect 48).
- **O2b**: footer wordmark font-size ≥ header wordmark font-size (`header span.font-brand`, expect 20px).
- **O3a**: computed `letter-spacing` parseFloat **< 0** (tracking-tight → -0.025em → negative px).
- **O3b**: computed `line-height` ≤ **1.15 ×** font-size (leading-none → =1.0).
- **O3c**: computed `font-weight` ≥ **600** (font-bold → 700).
- **O4a**: wordmark `getBoundingClientRect().width` **> 150px** @1280 (≈190px expected).
- **O4b**: wordmark right ≤ brand-block right + 1 **and** ≤ `footer .grid` right + 1 @1280 (fits column, no overflow).
- **O5a** @1280×900: for nav children indices 1→2→3, each horizontal gap `(left[i+1] − right[i])` **≤ 25px** (expect 24; AC2 proof).
- **O5b** @1280: nav cluster width `(right[3] − left[1])` ≤ **55%** of `footer .grid` width (expect 313/~1248 ≈ 30%; was ~928 ≈ 74%).
- **O6a** tablet: resize `page.setViewport({width:768, height:1024})` — **guard**: if `matchMedia("(min-width: 768px)")` is false (scrollbar ate width) re-set to 800×1024 and include in detail; then nav gaps each ≤ 25px (md applied, AC2 on tablet).
- **O6b** tablet: `documentElement.scrollWidth ≤ innerWidth + 1` (no overflow) AND brand block right ≤ first nav left (brand still its own column left of cluster).
- **O7a** mobile: `setViewport({width:375, height:812})` → `documentElement.scrollWidth ≤ innerWidth + 1` (mirrors `h4-p4-e2e.mjs:273` contract).
- **O7b** mobile: brand block (child 0) width ≈ `footer .grid` width (±2px) → `col-span-2` still spans (AC2 mobile unchanged).
- **O7c** mobile: footer wordmark font-size ∈ **[32,48]** and ≥ 36 (AC1 mobile = 225%).
- **O8a**: brand block regression — ≥1 `img` with `src` containing `logo-duanmar` AND grid text includes `vi.footer.tagline` (F8 duplicate).
- **O8b**: `footer .mt-8 a` yields ≥4 hrefs incl. `/vi/support`,`/vi/privacy`,`/vi/accessibility`,`/vi/sitemap` (F9 duplicate).
- **O9**: screenshots `tests/.output/o-footer-01-1280.png`, `o-footer-02-768.png` (or `-02-800` if guard fired → keep name `-02-768`, detail carries actual), `o-footer-03-375.png` — evidence only.
- **O10**: `pageerror` listener count === **0**.
- (~19 `check()` calls; locale read from `src/messages/vi.json` at runtime — never hardcode VI copy; cookie pin + `dismissPromo` per `m-footer-brand.mjs:49-57`.)

## Implementation Steps
1. Copy `m-footer-brand.mjs` boilerplate (`:1-26` imports/OUT/msg/check, `:49-57` `go()`, `:188-194` summary/exit) → new file `tests/browser/o-footer-refinement.mjs`; drop unused NODE_KEYS/SOCIALS/R-route logic (YAGNI).
2. Flow: `getBrowser({headless:true, viewport:{width:1280,height:900}})` → `go(page,"vi")` (dismissPromo) → O1–O5 @1280 + screenshot 01 → O6a/O6b @768(+guard) + screenshot 02 (no reload → no promo re-show; resize only) → O7 @375 + screenshot 03 → O8 (DOM asserts, viewport-independent) → O10.
3. Run `node tests/browser/o-footer-refinement.mjs` vs dev `:3000`; iterate until all `ok`. If O5/O6 fails: re-measure actual gaps — adjust ONLY test threshold detail strings within stated tolerances (≤25px, ≤55%), never loosen beyond brief.
4. Full gates (order matters, per `development-rules` pre-commit rules): `npm run lint` → `npm test` (14/14) → **stop dev** → `npm run build` (exit 0) → `npm run dev` `:3000` → `npm run test:browser` (**14 files → 13/14**, only `revalidate-webhook.mjs` fails = missing `SANITY_REVALIDATE_SECRET`, pre-existing, NEVER edit).
5. Regression: confirm `m-footer-brand.mjs` prints `all 24 checks passed` inside the suite run (0 edits to existing tests).
6. Changelog: append to `docs/project-changelog.md` EOF (under `## 2026-09-28` `:261`) a `### Changed` block, Vietnamese bullets, pattern of existing entries:
   - `- **[UI/UX] Footer: phóng to wordmark thương hiệu + thu gọn khoảng cách cột** (plan \`260928-2030-footer-brand-type-column-gaps\`)`
   - sub-bullets: AC1 (`footer.tsx:34` → `text-4xl md:text-5xl font-bold tracking-tight leading-none`, 36px/48px = 225%/300%, không sửa `brand-wordmark.tsx`) · AC2 (`footer.tsx:30` → `grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-[1fr_auto_auto_auto] md:gap-x-6`, gap 32→24px, cụm nav ~928→313px (measured) @xl, brand `1fr` nở, mobile giữ nguyên) · Tests (NEW `o-footer-refinement.mjs` ~19 checks: 4 children + title order · font-size 1280 ∈[32,48] ≥ header · tracking/line-height/weight · width>150 + không tràn cột · gap ≤25px @1280+768 · cluster ≤55% grid · 375 scrollWidth + col-span-2 · logo+tagline+bottom bar · screenshot ×3 · 0 pageerror)
   - ends with: `  - Verified: lint exit 0 · \`npm test\` **14/14** · \`npm run build\` exit 0 · \`npm run test:browser\` **13/14** (fail duy nhất \`revalidate-webhook\` = env pre-existing, không sửa test cũ) · \`m-footer-brand.mjs\` **24/24** · evidence \`tests/.output/o-footer-01..03.png\`` and `  - Docs impact: minor`
7. Flip statuses: `plan.md` + `phase-01`/`phase-02` → Status **Complete**, Progress **100%**; write `reports/plan-summary.md`.

## Todo List
- [x] Create `tests/browser/o-footer-refinement.mjs` (boilerplate from `m-footer-brand.mjs`)
- [x] O1–O5 assertions @1280 (structure, type scale, compactness)
- [x] O6 tablet 768 (md-guard → 800 fallback) + O7 mobile 375 (overflow, col-span-2, 36px)
- [x] O8 brand/bottom-bar regression + O9 screenshots ×3 + O10 pageerrors
- [x] `node tests/browser/o-footer-refinement.mjs` → all ok
- [x] `npm run lint` → 0 · `npm test` → 14/14
- [x] stop dev → `npm run build` → 0 → restart dev
- [x] `npm run test:browser` → **13/14** (only `revalidate-webhook`), `m-footer-brand` 24/24
- [x] Append `### Changed` changelog block (VN bullets, `Verified:`, `Docs impact: minor`)
- [x] Flip plan/phase statuses → Complete; write `reports/plan-summary.md`

## Success Criteria
- 19/19 new checks pass; suite 13/14 with sole failure = `revalidate-webhook` (env, untouched); lint 0, unit 14/14, build 0.
- 0 lines changed in any existing test; `git diff` shows only `footer.tsx` (2 lines) + `docs/project-changelog.md` + plan dir + new test file.
- Screenshots `o-footer-01..03.png` exist as evidence (no pixel-diff assertions).

## Risk Assessment
- Threshold flakiness (O5 ≤25px): gap is deterministic CSS (24px) — no animation/transition on grid; safe.
- md-guard viewport bump changes O6 detail string — assert on measured values, record actual viewport in detail (never silent skip).
- `h4-p4-e2e.mjs` checkout page also renders footer @375 — P1 wordmark change flows through it; suite run is the guard (its H8 check `:273` covers it).
- Runner file count changes (13→14): documented; do NOT edit `run-browser.mjs`.

## Security Considerations
None — test + docs only; no secrets, no `revalidate-webhook.mjs`, no `.env` writes (known failure tolerated as-is).

## Next Steps
- None (terminal phase). Docs impact: minor (changelog + plan statuses).

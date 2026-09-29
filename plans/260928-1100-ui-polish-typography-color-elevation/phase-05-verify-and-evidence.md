# Phase 05 — Verification, Evidence & Changelog

## Context Links
- [plan.md](plan.md) · phases 01–04
- Commands: `package.json` scripts (`lint`, `test`, `test:browser`, `build`)
- Dev-server prerequisite: `SANITY_REVALIDATE_SECRET` from `/c/Users/Lenovo/AppData/Local/Temp/opencode/revalidate-secret.txt` (never write it to `.env*` or git)
- Evidence pattern: `plans/260927-2345-force-apply-theme-brand-updates/evidence/{home-vi,home-en,checkout-hcm}.png`
- Changelog: `docs/project-changelog.md` (`## 2026-09-28` section already exists — append, never rewrite history)
- Known-sensitive tests: `tests/browser/f-ui.mjs:142` (`font-semibold`+`text-primary`), `tests/browser/h4-p4-e2e.mjs` (day +7/+8 month nav — fixed earlier, re-confirm), `tests/unit/h6-render-capacity.test.mts:109-110` (RDP px)

## Overview
**Priority**: P1 (gate for the whole feature) · **Status**: Pending · **Effort**: ~45 min · **Files**: `docs/project-changelog.md` (append) + plan statuses + `evidence/*.png`

## Key Insights
1. Build and dev cannot overlap on `.next` (changelog:14) → run `lint` → `test` → `build` **first**, then start dev for browser tests + screenshots.
2. Browser suite needs a live dev server; revalidate-webhook test needs the exported secret.
3. Grep gates are the cheapest proof for AC1/AC2 (rename counts, token counts) — capture them into the report so the review doesn't re-derive them.
4. Contrast numbers are already computed (phase-02) — restate them in the changelog as evidence (repo convention: prior entries list verified ratios).

## Requirements
- Functional: all 4 ACs demonstrably shipped; screenshots prove visual intent (muted red, soft elevation, no doubled edges).
- Non-functional: `lint`/`test`/`test:browser`/`build` all exit 0; no test assertion edited; no history rewritten.

## Related Code Files
- **Modify**: `docs/project-changelog.md` (append), `plan.md` + 5 phase files (Status → Complete)
- **Create**: `evidence/{home-vi,home-en,checkout}.png`, `reports/verification-log.md` (command output summary)
- **Delete**: none

## Implementation Steps
1. Static gates:
   ```bash
   npm run lint
   npm test                                   # expect 11/11 incl. EN/VI parity
   npm run build                              # exit 0; NOT while dev holds .next
   grep -rn "DuanMAR" src/ | wc -l            # 0
   grep -rn "DuanMar" src/ | wc -l            # 35
   grep -rn "DuanMAR" docs/ | wc -l           # 4 (history intact)
   grep -rn "DuanMAR" plans/ | wc -l          # 36 (history intact)
   grep -c "oklch(0.5 0.19 25)\|oklch(0.68 0.17 25)" src/app/globals.css   # 0
   grep -rn "hover:shadow-lg" src/            # 0
   grep -rn "ring-1 ring-foreground/10" src/components/ui/card.tsx         # 0
   grep -o "\.shadow-soft" .next/static/css/*.css                          # present
   grep -o "font-weight:450" .next/static/css/*.css                        # present
   ```
2. Start dev: `export SANITY_REVALIDATE_SECRET=$(cat /c/Users/Lenovo/AppData/Local/Temp/opencode/revalidate-secret.txt) && npm run dev` → `http://localhost:3000` returns 200 for `/vi`, `/en`, `/vi/booking/checkout?tour=hcm`.
3. `npm run test:browser` → **7/7** (`c-booking`, `c-payment`, `d8-a11y`, `f-ui`, `g-header`, `h4-p4-e2e`, `revalidate-webhook`). Any failure → fix the cause (never the assertion), rerun from step 1.
4. Evidence screenshots (fresh context, `localStorage` cleared, no booking PII) → `evidence/`:
   - `home-vi.png` (hero + quick-access + trending cards: resting shadow + lift-ready)
   - `home-en.png` (brand `DuanMar` in footer/wordmark, muted primary CTAs)
   - `checkout.png` (`/vi/booking/checkout?tour=hcm`: form rows aligned, inputs/buttons resting shadow, summary card elevation, weight-450 body)
   - dark spot check (devtools `.dark` class): record that shadows flatten by design (phase-03 R6).
5. Contrast evidence table (from phase-02) → `reports/verification-log.md`: light white↔#9F0618 8.38:1 · light primary on muted 7.64:1 · dark #DA534F on bg 5.04 / card 4.54 / button text 5.04 · ring/50 2.90 (was 2.58).
6. Changelog: append under `## 2026-09-28` in `docs/project-changelog.md` (single new `### Changed` block; never edit lines 264-271):
   ```md
   ### Changed
   - **[Feature] UI polish — DuanMar rename, muted primary red, soft elevation, body 450** (plan `260928-1100`)
     - Brand: 35 chỗ `DuanMAR` → `DuanMar` trong `src/` (28 `metadata.title` incl. `layout.tsx:17`, footer `footer.tsx:96`, `brand-wordmark.tsx:3,5`, privacy/sitemap prose, `en/vi.json:1162`); lịch sử changelog + `plans/` giữ nguyên; không đụng git remote / `vietnam-tourism*`
     - Palette: 5 token đỏ light → `oklch(0.444 0.177 25.331)` (≈#9F0618, trắng↔8.38:1) · 5 token dark → `oklch(0.62 0.17 25)` (≈#DA534F — đề xuất 0.55 fail AA 3.39:1 trên dark card; 0.62 giữ 4.54–5.04:1) · `--destructive`/`--chart-2`/`--primary-foreground` giữ nguyên
     - Elevation: token `--shadow-soft` + rule `@layer components .rounded-xl.border` (43 page-card sites, 0 edit site) · `card.tsx` bỏ `ring-1 ring-foreground/10` → `shadow-soft`, `--card-spacing` 4→5 · 3 hover site `shadow-lg/md` → `shadow-md` · controls (`button` 4 variant, `input`, `textarea`, select trigger) `shadow-sm` · ghost/link + overlay shadows + header không đổi
     - Volume: control cao chuẩn `h-9` (button default/icon, input, select trigger; `lg`/`icon-lg` → 10) khớp 8 CTA `h-9` sẵn có + submit `booking-form:153` · floor padding `p-4`→`p-5` (5 site, ticker `w-56` giữ `p-4`)
     - Typography: token `--font-weight-body: 450` + `font-body` trên `body` (Inter variable) · scale 500/600/700 (169 chỗ) giữ nguyên
     - Verified: lint + `next build` exit 0 · `npm test` 11/11 (parity) · `npm run test:browser` 7/7 · grep `DuanMAR` src=0/`DuanMar`=35 · contrast 8.38/7.64/5.04/4.54 · evidence `plans/260928-1100-.../evidence/{home-vi,home-en,checkout}.png`
     - Docs impact: minor (changelog này + plan statuses)
   ```
7. Update statuses: `plan.md` table (5 rows → Complete/100%) + each phase file Overview `Status` → Complete.
8. Scope check — the tree has **no clean baseline** (single `init` commit, 51 paths already dirty from plans `260927-2100`/`2345`/`260928-0010`, incl. `tests/browser/{f-ui,h4-p4-e2e}.mjs`), so `git status` diffing is not a per-phase gate. Instead: capture `git status --porcelain | wc -l` before phase-01 (52 incl. this plan dir) and after phase-04 (must be ≤ same + any newly created files listed explicitly); confirm no `.env*`, `package.json`, `.git/config` path appears; **do not commit** (explicit request required).

## Todo List
- [ ] Static gates: lint / test 11/11 / build 0
- [ ] Grep gates (rename, tokens, hover, ring, built CSS)
- [ ] Start dev with secret; home/checkout 200
- [ ] `npm run test:browser` 7/7
- [ ] 3 evidence screenshots + dark spot-check note
- [ ] `reports/verification-log.md` (outputs + contrast table)
- [ ] Changelog append under `## 2026-09-28`
- [ ] Plan + phase statuses → Complete
- [ ] `git status` scope check

## Success Criteria
- All four commands green with zero assertion edits; all grep gates at expected values; screenshots present in `evidence/`; changelog appended (history lines untouched); plan statuses updated.

## Risk Assessment
- **R1**: browser test flake / date-dependent `h4-p4-e2e` → rerun once; if it fails identically on baseline, report as pre-existing (do not patch assertions to pass).
- **R2**: build blocked by running dev → strict command order (step 1 before step 2).
- **R3**: screenshot captures PII in `localStorage` → fresh browser context, cleared storage, no completed booking in evidence profile.
- **R4**: changelog wording drifts from actual diff → write it from the final `git diff --stat`, not from the plan.

## Security Considerations
- `SANITY_REVALIDATE_SECRET` only via env var from the temp file; never committed, never printed in logs/`reports/`; no `.env*` modification; screenshots contain no tokens/emails/booking references.

## Next Steps
- User sign-off on evidence (AC2 red tone, AC3 elevation judged visually). Docs impact: **minor** (changelog + plan statuses only). Optional follow-ups listed in `reports/plan-summary.md`.

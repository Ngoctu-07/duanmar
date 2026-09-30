# Phase 03 — Verification Tests + Docs

**Status**: Pending · **Priority**: P2 · **Plan**: [plan.md](./plan.md)

## Overview
Byte-level unit tests (no browser, no native deps) + Chromium browser test asserting exact head tags, HTTP delivery of all 5 assets, and tab-size visual fidelity via screenshot harness. Then changelog entry.

## Context Links
- Unit runner: `tests/run-unit.mjs` — runs `tests/unit/*.test.{ts,mts}` via `npx tsx`, pass = exit 0; pattern: manual `eq`/fails + `process.exit` (`tests/unit/pricing.test.ts`)
- Browser runner: `tests/run-browser.mjs` — requires dev server on `http://localhost:3000`, runs every `tests/browser/*.mjs` plain `node`; pattern `tests/browser/a-ux-microinteractions.mjs:10-27` (`OUT`→`tests/.output/`, `getBrowser/getPage/closeBrowser` from `.claude/skills/chrome-devtools/scripts/lib/browser.js`, `check(name, ok, detail)` helper)
- Only Chromium available → Safari/Firefox visual = manual residual (unresolved Q3)

## Related Code Files
**Create**
1. `tests/unit/favicon-assets.test.mts` (<200 lines, no imports beyond `node:fs`/`node:path`/`node:crypto`):
   - helpers: `pngInfo(buf)` → `{ w: readUInt32BE(16), h: readUInt32BE(20), colorType: buf[25] }` (assert PNG magic first); `parseIco(buf)` → entries + payload slices
   - asserts:
     - all 5 files exist under `public/`
     - ICO: magic `00 00 01 00`, count 2, entries 16×16 & 32×32, both payloads valid PNGs colorType 6
     - `apple-touch-icon.png`: 180×180, colorType **2** (white-flatten proof)
     - `icon-192.png` 192×192 / `icon-512.png` 512×512, colorType 6, square
     - `icon.svg`: contains `viewBox="0 0 512 512"`, exactly one `<image`, `href="data:image/png;base64,…"` whose decoded SHA-256 equals `icon-512.png` file bytes; **no** `<script`; no `href="http` (remote asset refs forbidden; `xmlns` URL allowed)
   - end: `console.log(fails === 0 ? "ALL PASS" : …)`, `process.exit(fails === 0 ? 0 : 1)`
2. `tests/browser/z-favicon-head.mjs` (<200 lines, `a-ux-microinteractions.mjs` skeleton):
   - per locale `/en`, `/vi` (`networkidle2`): `page.evaluate` collecting `link[rel=icon]` + `link[rel=apple-touch-icon]` → `check` exact triples: `{rel:icon, href:/favicon.ico, sizes:any}`, `{rel:icon, href:/icon.svg, type:image/svg+xml}`, `{rel:apple-touch-icon, href:/apple-touch-icon.png}`; each exactly once (no dupes after merge)
   - `node fetch` (in-test): `/favicon.ico` → 200 + bytes `00 00 01 00`; `/icon.svg` → 200 + `image/svg+xml` + `<?xml|<svg`; `/apple-touch-icon.png`, `/icon-192.png`, `/icon-512.png` → 200 + PNG magic `89 50 4E 47`
   - visual harness: `page.setContent` with "DuanMar" text + `<img>` at 16/32/180 px (natural size) → `check` `naturalWidth===16|32|180` and `naturalHeight===naturalWidth` (1:1, no distortion); screenshot clip → `tests/.output/z-favicon-tab-sizes.png`; also load `/icon.svg` at 64px for Retina crispness shot
   - print ok/FAIL lines; `process.exit(errors.length ? 1 : 0)`; `closeBrowser()` in `finally`
3. **Docs**: edit `docs/project-changelog.md` — new `## 2026-09-30` section, `### Added` entry: favicon set, `icons:generate` script, root metadata links, 2 test files; note docs impact: minor. (No `docs/development-roadmap.md` exists → skip roadmap.)

**Modify**: none besides changelog. **Delete**: none.

## Implementation Steps
1. Write unit test → `npm test` green
2. Ensure dev server up (`npm run dev`) → write browser test → `npm run test:browser` green
3. Full gates: `npm run lint` → `npm test` → `npm run test:browser` → `npm run build` (never concurrent with dev — CSS-404 warning in `docs/project-changelog.md`)
4. Eyeball `tests/.output/z-favicon-tab-sizes.png` + real browser tab (Chrome/Edge) beside title
5. Changelog entry

## Success Criteria / Acceptance
- [ ] `npm test`: `favicon-assets.test.mts` ok, suite total green
- [ ] `npm run test:browser`: `z-favicon-head.mjs` ok — 3 exact tags ×2 locales, 5×HTTP 200 + magic, harness screenshots in `tests/.output/`
- [ ] `npm run lint` + `npm run build` exit 0
- [ ] `docs/project-changelog.md` updated

## Risk / Security
- Chromium-only → mitigate with byte/HTTP assertions; residual Safari/Firefox visual → unresolved Q3
- Browser test flakiness (`networkidle2` timeouts) → 60s timeouts + `dismissPromo` if promo modal intercepts (`tests/helpers/promo.mjs`)

## Next Steps
Code review → commit (script + assets + metadata + tests + changelog in one conventional commit). Deferred: `site.webmanifest` (Q2), apple-touch bg decision (Q1).

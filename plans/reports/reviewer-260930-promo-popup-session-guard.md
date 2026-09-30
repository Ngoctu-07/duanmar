# Review — 260930-1740 promo-popup-session-guard (adversarial)

**Reviewer**: code-reviewer · **Scope**: `src/components/layout/promo-modal.tsx`, `tests/browser/r-entry-popup-cms.mjs`, `docs/project-changelog.md` (entry under `## 2026-09-30`)
**Verdict**: **FIX-FIRST** (1 Major)

## Gates (re-verified this review vs session facts)
- `npm run lint` **0/0** (re-ran) · `npx tsc --noEmit` **0** (re-ran) — rest taken as session-verified: `npm test` 26/26 · build 0 · targeted r-entry 16/16 · suite 18/30 red ⊆ known list by name.

## Findings

### 1. MAJOR — reload-loaded document re-opens modal on locale remount (guard hole)
`src/components/layout/promo-modal.tsx:34-37`
`if (navType !== "reload" && seen === "true") return` skips the flag gate whenever the current document was loaded via F5. `PerformanceNavigationTiming.type` stays `"reload"` for the whole document lifetime, and locale segment change DOES remount PromoModal (fresh instance re-runs the `[]` effect — plan itself asserts this). Net: **F5 → dismiss → EN/VI toggle → modal reopens**, violating plan truth-table row "soft nav w/ locale-remount → no" and changelog claim "soft nav (kể cả locale remount) → chặn". Untested: R15 toggle runs on a `navigate` doc; R18 is a full `goto`.

Probe (live :3000, read-only script, instrumented `sessionStorage.setItem` + modal count):
```
B0 reload-load  {"navType":"reload","count":1,"setFlag":2}
B1 dismissed    {"navType":"reload","count":0,"setFlag":2}
B2 +VI toggle   {"navType":"reload","count":1,"overlay":1,"setFlag":4}   ← HOLE (reopen, effect re-ran twice)
C1 same-locale link nav on reload-doc: count=0, setFlag+0 (instance persists — path is safe)
```
**Fix**: document-lifetime marker at module scope (resets on full load, survives remounts; `window` global equivalent OK):
```tsx
let popupShownThisDocument = false // module scope
...
if (popupShownThisDocument) return // before setOpen
setOpen(true); popupShownThisDocument = true
```
Keep navType gate (`back_forward`/`prerender`) + sessionStorage flag (cross-document `navigate` suppression only). Module marker also hardens private-mode + double-mount (probe saw 2 effect runs/toggle) cases. **Add R19**: after R16b (reload doc, dismissed) soft locale toggle → assert `count===0` in 8s window (fails on current code → proves coverage; also restores the dropped EN→VI toggle direction).

### 2. MINOR — "dismiss only when modal confirmed present" is comment-only, not enforced
`tests/browser/r-entry-popup-cms.mjs:330-334` (also :242, pre-existing)
`check()` failures don't halt execution; if R16 fails (count 0), `page.click('[data-slot="promo-modal-close"]')` stalls 30s on absent selector → phase-02 success criterion "No check waits on an absent selector via page.click" only holds on the pass path. Changelog :522 claims dismiss runs only when modal confirmed present — overstated.
**Fix**: `if (reState.count === 1) { await page.click(...); ...R16b wait... }` (skip click+R16b when absent); optional same guard at :242.

### 3. MINOR — comment overclaims flag coverage
`src/components/layout/promo-modal.tsx:28-29` — "the flag covers remounts" is false on `reload` docs (finding 1). Reword with the fix: marker covers in-document remounts; flag covers subsequent `navigate` documents.

### 4. NIT — redundant catch
`promo-modal.tsx:35-36` — `let seen = null` + `catch { seen = null }`: on throw the assignment never ran, `seen` is already null. `try { seen = sessionStorage.getItem("hasSeenPopup") } catch {}` suffices.

### 5. NIT (spec-claim, non-shipped) — plan decision 4 inaccuracy
Plan claims "CMS disabled→enabled later in same session won't show", but flag is never written while `showable` false → later locale remount (fresh instance, navType `navigate`, flag unset) WILL show. Changelog only claims flag-write blocked (accurate). No code change required; note for plan accuracy.

## Adversarial checks — clean
- **SSR/hydration**: `performance`/`sessionStorage` accessed only inside effect; render path props-only; `open` starts false on both sides. No mismatch.
- **exhaustive-deps / set-state-in-effect disables**: correctly placed on reported lines (deps array :42, `setOpen` :39); lint re-run 0/0.
- **`showable` stale-prop**: props re-resolved server-side per navigation, so "final at mount" is slightly overstated, but consequences are the documented YAGNI (no show until next document) + benign live src swap. Accepted.
- **`back_forward`/`prerender`**: type gate blocks ✓ · API-missing `undefined` → flag-gated fail-open ✓ matches truth table.
- **R2 hygiene**: runs AFTER R2 assert → a genuine first-load regression still fails R2; hygiene only passes when reload restores show (exactly the inherited-flag case). Does not mask. Uses `removeItem` (better than plan's `clear()` — preserves other keys).
- **R15/R16/R17/R18 vacuity**: all assert the positive/negative within calibrated windows; R16 `count===1` + `navType reload` + `marker null` non-vacuous; R18 `marker===null` + `navType==="navigate"` valid full-load proof; 8s/10s hydration-evade risk explicitly accepted in plan risk table (same window as historical repro).
- **Deleted coverage**: EN asset chain preserved via R16 (src+alt EN); VI asset/alt still via R3/R5 first load; no behavior left unasserted except EN→VI toggle direction (folded into proposed R19).
- **Regression surface**: only `r-entry` asserts popup presence; `dismissPromo` helper byte-unchanged, 27 consumer files (grep-verified); `sessionStorage` used nowhere else in `src/` (no key collision); `__promoI18nNoReload` only in r-entry.
- **Security/perf**: no PII, single boolean key, no quota/attack surface; key name generic but collision-free today (Nit: could namespace later).
- **Changelog**: entry correctly under `## 2026-09-30` `### Fixed` before `### Added`; gates/counts match (16/16 = clean path count without conditional hygiene); claims accurate except finding 1 ("soft nav … chặn") and finding 2 (dismiss-guard claim).

## Unresolved Questions
- None blocking. Finding 5 is plan-text accuracy only.

**Status:** DONE
**Summary:** FIX-FIRST — Major: on any F5-loaded document the `reload` flag-gate bypass lets a locale-segment remount re-open the popup (probe-confirmed on live :3000, contradicts approved truth table + changangelog, no test covers it); fix via module-scoped document marker + new R19. Two Minors (unguarded `page.click` stall despite comment/changelog claim, stale comment) and two Nits; all other gates/checks clean.

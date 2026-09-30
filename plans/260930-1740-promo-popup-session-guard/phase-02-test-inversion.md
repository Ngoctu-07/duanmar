# Phase 02 — Test Inversion: r-entry-popup-cms.mjs

**Status**: Pending · **Priority**: P1 · **Plan**: [plan.md](./plan.md) · **Depends**: Phase 01

## Overview
Invert the two DESIGNED re-trigger assertions (R15/R16, plan 260929-1617) that now contradict the requirement, repurpose R16 to hard-reload coverage (keeps D2 EN asset-chain proof), add flag + repeat-load checks (R17/R18), plus a first-load hygiene fallback. One file only.

## Context Links
- `tests/browser/r-entry-popup-cms.mjs` (352 lines; test files legitimately long — `c-booking.mjs` 425, `f-ui.mjs` 248 → no split, KISS)
- Existing structure: R1 :54-83 (live CMS → `enabled`/`mode`) · goto :89 · marker :91-93 · enabled branch :95-309 (R2 :99-108, R3-R5 :110-147, R12-R14 :149-209, screenshots :211-212, R6 dismiss :214-222, R7 nav :224-229, **R15/R16 :231-300**, cleanup :302-309) · disabled branch R8-R10 :310-334 · R11 :337
- Dismiss pattern :214-222: `page.click('[data-slot="promo-modal-close"]')` — **puppeteer `page.click` waits up to `page.setDefaultTimeout` (30s) when the selector is absent** → never call it while modal absent (stall failure mode)
- Run: `node tests/browser/r-entry-popup-cms.mjs` (targeted) / `npm run test:browser` (full, `tests/run-browser.mjs` — needs :3000 dev)

## Related Code Files
**Modify**: `tests/browser/r-entry-popup-cms.mjs` — **Create/Delete**: none (no new file: everything popup-related lives here; helper `tests/helpers/promo.mjs` untouched).

## Implementation Steps

**1. R2 hygiene fallback (stale-tab insurance, ~6 lines after R2 assert :108)**
`browser.js:220-233` reconnects to a saved wsEndpoint; a not-cleanly-closed prior browser could hand over a tab where `hasSeenPopup` is already `"true"` → R2 would fail post-fix (new failure mode vs baseline). Guard:
```js
const flaggedAtStart = await page.evaluate(() => sessionStorage.getItem("hasSeenPopup") === "true");
if (!promo && flaggedAtStart) {           // inherited flag artifact, not a product bug
  await page.evaluate(() => sessionStorage.removeItem("hasSeenPopup"));
  await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
  promo = await page.waitForSelector('[data-slot="promo-modal"]', { timeout: 10000 }).catch(() => null);
}
```
Clean path (normal): flag unset → zero behavior change → R2 still proves **first `'navigate'` load shows**.

**2. NEW R17 — flag semantics (right after R2/R17-hygiene, before R3)**
```js
const flagAfterShow = await page.evaluate(() => sessionStorage.getItem("hasSeenPopup"));
check("R17 sessionStorage hasSeenPopup === \"true\" after first show", flagAfterShow === "true", `flag=${flagAfterShow}`);
```

**3. R15 inverted (:254-273) — soft locale toggle must NOT reopen**
Keep helpers `clickHeaderLocale`/`readModalState` (:232-252) unchanged (add `navType` + `flag` fields to `readModalState`: `performance.getEntriesByType("navigation")[0]?.type`, `sessionStorage.getItem("hasSeenPopup")`). Replace body:
```js
const clickedEn = await clickHeaderLocale("en");
await page.waitForFunction(() => location.pathname.startsWith("/en/"), { timeout: 8000 }).catch(() => {});
await page.waitForFunction(          // reuse the OLD 8s window: a reopen (bug) resolves this → count 1 → FAIL
  () => document.querySelectorAll('[data-slot="promo-modal"]').length === 1, { timeout: 8000 }
).catch(() => {});
const enState = await readModalState();
check("R15 EN toggle does NOT reopen modal (/en, soft nav: navType navigate, marker 1, flag set)",
  clickedEn && enState.path.startsWith("/en/") && enState.count === 0 &&
  enState.marker === 1 && enState.navType === "navigate" && enState.flag === "true",
  JSON.stringify({ clickedEn, ...enState }));
```
Inversion semantics: absence asserted AFTER the identical 8s window in which today's bug reproduces → bug present ⇒ FAIL (count 1), bug fixed ⇒ PASS. Marker `1` proves still the original document (soft); navType `navigate` proves PerformanceNavigationTiming did NOT change across soft nav (flag is what blocks, not navType).

**4. R16 repurposed (:275-300) — hard reload DOES reopen, EN asset chain preserved**
Delete the old "dismiss EN modal → toggle VI → assert reopen" block. Replace with:
```js
await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
await page.waitForFunction(() => document.querySelectorAll('[data-slot="promo-modal"]').length === 1, { timeout: 10000 }).catch(() => {});
const reState = await readModalState();
const enExpected = enAsset?.asset?.url ?? null;          // already computed :260
check("R16 hard reload reopens modal on /en (navType reload, EN asset chain D2, marker reset, flag set)",
  reState.path.startsWith("/en/") && reState.count === 1 && !!enExpected &&
  reState.src !== null && reState.src.includes(enExpected) &&
  reState.alt === msg.en.promo.imageAlt &&
  reState.navType === "reload" && reState.marker === null && reState.flag === "true",
  JSON.stringify({ ...reState, enExpected }));
await page.screenshot({ path: `${OUT}/r-entry-popup-03-locale-en.png` });   // moved from :273 — modal is open HERE now
```
- D2 EN fallback chain coverage from 260929-1617 survives (modal-open-with-EN-asset assertion retained, just via reload instead of toggle).
- `marker === null` distinguishes full document load from soft nav (marker was `1` pre-reload).
- **Dismiss only here** (modal confirmed present): reuse :214-222 pattern (click + `promoGone` wait). The old cleanup block :302-309 must NOT run while modal absent (30s click stall, see risk) — it is superseded by this dismiss.

**5. NEW R18 — same-tab second document load blocked (closes probe #5)**
```js
await page.goto(`${BASE}/en`, { waitUntil: "networkidle2", timeout: 60000 });   // different URL than /en/tours/domestic → navType "navigate"
const secondNavType = await page.evaluate(() => performance.getEntriesByType("navigation")[0]?.type);
await page.waitForFunction(() => document.querySelectorAll('[data-slot="promo-modal"]').length === 1, { timeout: 8000 }).catch(() => {});
const second = await page.evaluate(() => ({
  count: document.querySelectorAll('[data-slot="promo-modal"]').length,
  flag: sessionStorage.getItem("hasSeenPopup"),
  marker: window.__promoI18nNoReload ?? null,
}));
check("R18 second full load same tab (navType navigate) suppressed by flag",
  secondNavType === "navigate" && second.marker === null && second.count === 0 && second.flag === "true",
  JSON.stringify({ secondNavType, ...second }));
```

**6. Untouched**: R1 guard, R2 (apart from hygiene), R3-R5, R6, R7, R11, screenshots 01/02, disabled branch R8-R10 (no flag write when suppressed → no flag assertions there), `dismissPromo` helper (no change — early-return at `promo.mjs:4-6`; corrected note: suppressed call = full 2s selector timeout, not "faster"; ≤+2s per call on the 27 consumer files, no assertion depends on presence).

## Success Criteria / Acceptance
- [ ] `node tests/browser/r-entry-popup-cms.mjs` → `all N checks passed` (enabled mode: R1-R7 + R11-R18; disabled: R1, R8-R11)
- [ ] Checks map to repro matrix: R2↔#1, R15↔#3 (inverted), R16↔#6, R18↔#5 (inverted), R17↔#7
- [ ] No check waits on an absent selector via `page.click` (no 30s stalls; total runtime ≈ +20s vs old file)

## Risk / Rollback
- False-green window: absence asserted after 8s — same window today's reopen is observed in probes → acceptable; hydration-latency risk noted in plan.
- File-level revert (`git checkout -- tests/browser/r-entry-popup-cms.mjs`) decouples from phase-01.

## Next Steps
Phase 03 (`phase-03-gates-and-docs.md`) — full gates + changelog.

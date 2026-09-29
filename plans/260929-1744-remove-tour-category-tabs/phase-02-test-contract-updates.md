# Phase 02 — Test Contract Updates (`p-tours-category.mjs`)

**Status**: Complete (100%) · **Depends on**: Phase 1 · **Priority**: High

## Changes
1. Delete `readTabNav` helper (`:67-76`).
2. **P7** (was: tab nav 2 links/hrefs/labels) → `nav[aria-label="Tour category"]` count === 0 on domestic ("in-page category sub-tabs removed").
3. **P8** (was: domestic aria-current) → new `readHeaderNav(page)` helper (`header nav a` → href+label) asserts both tour links present with i18n labels on the domestic page.
4. **P9** (was: international aria-current) → same header-links assertion on the international page.
5. **P20 ×2** (was: exactly one category nav) → `count === 0` (both pages).
6. **NEW P21** (after international block): click-through filtering proof:
   - `goto(/vi/tours/domestic)` → `page.click('header nav a[href="/vi/tours/international"]')` → `page.waitForURL('**/vi/tours/international')` → poll `readCards` (≤10s) until slugs stabilize → assert rendered set == `expectedInternational` set and zero domestic-only slugs.
   - Asserts the CRITICAL requirement: header navigation still drives route-based filtering end-to-end.
7. Unchanged: P1–P6, P10–P19 (incl. live-GROQ set equality, empty states, badges, EN fetch, detail SSR), screenshots.

## Note
Check IDs P7/P8/P9 keep their letters but change semantics (tab-contract → tabs-removed + header-preservation). Documented in report/changelog.

## Todo
- [ ] Remove `readTabNav`, repurpose P7/P8/P9
- [ ] Flip P20 ×2 to count === 0
- [ ] Add P21 header click-through segregation check
- [ ] Run file standalone → all checks green

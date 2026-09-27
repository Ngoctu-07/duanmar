# Code Review — Fix: Studio breadcrumb `title?.toLowerCase` crash (numeric preview)

**Scope reviewed:** `src/sanity/schemaTypes/tour-pricing.ts` (only file changed), plan `plans/260926-2030-fix-studio-breadcrumb-numeric-preview/plan.md`, context: `destination.ts`, `homepage.ts`, `post.ts`, `index.ts`, `structure.ts`.
**Given as verified (not re-run):** eslint 0 · tsc 0 · build exit 0 · `tierPreviewLabel` 13/13 · bundle grep (new label in, old `title: "minGuests"` out) · mechanism repro · website 200/404 unchanged.
**Evidence sources:** `node_modules/sanity/lib/index.js` (BreadcrumbButton, preview pipeline), `node_modules/@sanity/types/lib/index.d.ts`.

---

## Verdict: **APPROVE**

---

## Findings

### Critical
- **No findings.**

### Major
- **No findings.**

### Minor
1. **Document-level `subtitle` is a raw number (pre-existing, not introduced by this fix)** — `src/sanity/schemaTypes/tour-pricing.ts:144` (`select: { title: "tourSlug", subtitle: "tiers.0.groupTotalVnd" }`). Same *class* of issue as the fixed bug (numeric preview value) but **not** a crash: no consumer in any Sanity lib chunk applies string methods to `subtitle` (grep over `sanity/lib/*.js` + `_chunks-es/*.js`: zero `subtitle.*toLowerCase|replace|split|slice|…`); Sanity's own validator explicitly permits numbers for `title`/`subtitle` (`index.js:45796-45800`, `isRenderable` allows `string|number|boolean|null|undefined`) — which is exactly why Sanity did **not** catch the original title crash. Runtime type mismatch with `PreviewValue.subtitle?: string` (`@sanity/types/lib/index.d.ts:708`) and the pane shows an unformatted `1200000` (no `₫`). **Recommendation:** optional `prepare` at document level later; correctly left alone now (plan.md:54, YAGNI). Not blocking.
2. **Plan follow-ups still open** — `plan.md:4` `status: pending`; `docs/project-changelog.md` has no entry for this fix (plan.md:78 mandates changelog + status update *after* this review). Process follow-up, not a code defect.

### Nit
- **Declared param types are aspirational** — `tour-pricing.ts:9-10` types `min/max` as `number | null | undefined`, but Sanity's `prepare` value is `Record<keyof Select, any>` (`@sanity/types/lib/index.d.ts:714-716`), so tsc cannot verify the select paths deliver numbers. Runtime-safe regardless (every branch template-stringifies; see Q1). Optional: type params `unknown` to be honest.
- `tour-pricing.ts:15` puts an en dash into the derived data-testid (`breadcrumb-item-3–8-guests`). Harmless (unicode allowed in testids).

---

## Review-focus answers (Q1–Q8)

### Q1 — `prepare` guarantees STRING title in every reachable path? ✅ CLEAN
`tierPreviewLabel` (`tour-pricing.ts:8-16`) is **total and stringify-only** — no method calls, no coercions that can throw:
- `min` null/undefined → `"Tier"` (covers empty new row: all selects undefined)
- `max` null/undefined → `` `${min}+ guests` ``
- `min === max` → `` `${min} guests` `` · else → `` `${min}–${max} guests` ``
- `0`: `0 == null` is `false` → `` `0+ guests` `` — string (and `min≥1` validation makes 0 unreachable anyway)
- negative / float / `NaN` / legacy string `"3"` / array / plain object → template literal → always a string (`"[object Object]"`, `"NaN+ guests"` worst case). JSON cannot carry `Symbol` or a throwing `toPrimitive`, so `` `${x}` `` provably cannot throw.
Additional backstops (defense in depth, not relied upon): `invokePrepare` wraps `prepare` in try/catch (`index.js:45844-45856`) → `INVALID_PREVIEW_FALLBACK` which is `{title: "Invalid preview config", …}` — a **string** (`index.js:45503`); and `useValuePreviewWithFallback` does `preview?.value?.title || t("preview.default.title-fallback")` (`index.js:27482`) catching `undefined/null/""`. No reachable path yields a truthy non-string title.

### Q2 — `defineArrayMember` typing accepts `preview.prepare`? ✅ CLEAN (with noted looseness)
`PreviewConfig<Select = Record<string,string>, PrepareValue = Record<keyof Select, any>>` with `prepare?: (value, viewOptions?) => PreviewValue` (`index.d.ts:714-717`); `PreviewValue.title?: string; subtitle?: string` (`:703-712`). Our select values are all path strings ✓; return `{title: string, subtitle: string | undefined}` is assignable (`exactOptionalPropertyTypes` not enabled — no match in `tsconfig.json`) ✓; tsc 0 given ✓. **Looseness:** `PrepareValue` members are `any`, so TS cannot catch a wrong `select` path — noted as Nit, not hiding a runtime issue here because Q1's stringify-total function makes input types irrelevant. Runtime accepts `prepare` on array members: `prepareForPreview` reads `type.preview.prepare` regardless of how the type was defined (`index.js:45874-45896`), and `getPreviewPaths` derives observation paths from `select` (`index.js:45740-45743`).

### Q3 — Any other non-string reaching `BreadcrumbButton`? ✅ CLEAN
Crash site confirmed: `index.js:61102` `title?.toLowerCase().replace(/ /g,"-")` inside `BreadcrumbButton` (`:61079`); `title` comes only from `useBreadcrumbPreview` → `useValuePreviewWithFallback` (`:60937`, `:27477`). Only `title` is consumed (breadcrumb renders `subtitle`/badge nowhere). Exhaustive `preview` inventory across `src/` (grep found no others outside `sanity/schemaTypes`):
- `tour-pricing.ts:128-138` member → `prepare` → string ✓
- `tour-pricing.ts:144` doc → `tourSlug` (string, required); unset draft → `undefined` → `||` fallback "Untitled" ✓ (plan.md:54 correctly leaves it)
- `destination.ts:68` → `name` (string, required) ✓
- `homepage.ts:32` → `title` (string, required) ✓
- `post.ts` → **no preview** → `observeForPreview` else-branch → `defaultPrepare(rawValue)`; `post` has no field literally named `title` → `undefined` → fallback ✓ (pre-existing, unchanged)
- `structure.ts` (7 lines) → no titles ✓
- Field-level breadcrumb segment (e.g. path `tiers.0.minGuests`, schemaType = number field, no preview): `useValuePreview` requires `schemaType && previewValue` and `isRecord(number)` is false → `snapshot: null` → fallback string ✓ (`index.js:45949-45951`, `useValuePreview` `:…bb0` guard)
- Missing/unresolvable `schemaType` → `of(IDLE_STATE)` → `value` undefined → fallback ✓

### Q4 — Does subtitle change break anything? ✅ CLEAN
New subtitle is `` `${totalVnd}₫` `` (string) or `undefined`. Verified zero string-method usage on `subtitle` across all Sanity lib bundles (only JSX render sites: `structureTool.js:9947`, `index.js:206-207` — React children, handles strings). Breadcrumb doesn't touch subtitle at all. Old subtitle (`groupTotalVnd` raw number via `defaultPrepare`) was also tolerated; no behavioral regression.

### Q5 — Exporting `tierPreviewLabel` from a schema file: side effects? ✅ CLEAN
- Pure function, zero module-level side effects (the `defineType(...)` call executed before the change too).
- Only importer of `schemaTypes/index.ts` is `sanity.config.ts:13` (Studio). Website pages import only `@/sanity/queries/tour-pricing` (`explore/destinations/[slug]/page.tsx:14`, `explore/itineraries/[slug]/page.tsx:8`).
- Named export is ignored by the schema registry (it consumes the default-exported definition object); no registry/bundling hazard. Given bundle grep confirms presence in Studio bundle only.

### Q6 — Subtitle value sensible, null guard correct? ✅ CLEAN
`tour-pricing.ts:136`: `totalVnd == null ? undefined : \`${totalVnd}₫\`` — `== null` covers both `null` and `undefined`; **`0` correctly passes through to `"0₫"`** (guard is null-check, not falsy — important since VND 0 is valid per `rule.min(0)`); `${undefined}₫` unreachable; `NaN` unreachable (JSON can't encode it; `min(0)` validation). Value = `groupTotalVnd` of the tier row = the row's most decision-relevant number; label `N–M guests` + total is the sensible pairing.

### Q7 — Public website regression? ✅ CLEAN
Schema file not in the website import graph (Q5); queries, messages, pages untouched; `mapPricingTiers`/price block consume GROQ data, not previews. Given B5 (200/404 + price block with real data) confirms.

### Q8 — Project rules? ✅ CLEAN
146 lines (<200); kebab-case filename; 2 short WHY-comments (crash rationale + data contract — justified, not bloat); KISS (one pure fn, no speculative branches); YAGNI honored (no document-preview change, no schema/dep upgrades — plan.md:54, plan.md:74).

---

## Mechanism confirmation (why the fix is the right one)
- Old: no `prepare` → `defaultPrepare` returned `{title: minGuests /* number */}` (`index.js:45865-45873`), Sanity's `isRenderable` **allows** numbers (`index.js:45797-45801`) so no console error, then `title?.toLowerCase()` (`index.js:61102`) throws — exactly the reported stack.
- New: `prepare` always returns `title` as string; fallback and try/catch paths also return strings. Root cause eliminated at the only crash site.

## Unresolved questions
1. Plan **B6** (live Studio verification of the breadcrumb after fix — Puppeteer or manual user click-through) is not covered by the given verifications; auth/CORS may block automation (plan.md:68). Needs user confirmation.
2. No VCS baseline available (dir is not a git repo; `.next` has no pre-fix chunks) — cannot independently confirm whether `tour-pricing.ts:144` document `subtitle` line is byte-identical to pre-fix. Does not change any safety conclusion (see Minor #1).
3. Changelog entry + plan `status` flip remain pending by design (post-review step, plan.md:78).

---
**Status:** DONE_WITH_CONCERNS
**Summary:** Fix is correct and crash-proof on every reachable path (title provably string; Sanity's own validator/fallback/try-catch backstops verified in source); verdict APPROVE with 2 Minor (pre-existing numeric doc subtitle, pending changelog/plan-status) and 2 Nits. Concern limited to B6 live-Studio verification still unconfirmed.

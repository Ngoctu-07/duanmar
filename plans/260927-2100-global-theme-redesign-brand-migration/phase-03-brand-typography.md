# Phase 03 — Brand Typography (Sora Wordmark + `brand-wordmark` Component)

**Date**: 2026-09-27 · **Priority**: P1 · **Status**: Complete · **Est**: 0.25 day

## Context Links
- **Research**: [research/research-summary.md](research/research-summary.md) §3
- **Plan**: [plan.md](plan.md)
- **Prior bug**: `docs/project-changelog.md:14` — font `variable` class must be on `<html>`
- **Key files**: `src/app/layout.tsx`, `src/app/globals.css`, `src/components/layout/{header,footer}.tsx`

## Overview
Give the brand wordmark its own display face — **Sora** (geometric sans) — separate from the Inter body font, exposed as a new `font-brand` utility. Extract a shared `src/components/layout/brand-wordmark.tsx` used by header and footer so the wordmark lives in exactly one place.

## Key Insights
- `src/app/layout.tsx:2,5-8,21`: `Inter({subsets:["latin","vietnamese"], variable:"--font-sans"})` with `.variable` on `<html>` — **the Sora variable must join that same `className` on `<html>`** (past P1: variable on `<body>` broke `font-sans`).
- `globals.css:11` `--font-heading: var(--font-sans)`; `font-heading` used only at `src/components/ui/card.tsx:40` + `src/components/ui/sheet.tsx:108` → **do NOT point heading at Sora** (keep UI chrome neutral); add a NEW `--font-brand` token instead.
- `@theme inline` pattern for fonts: `--font-sans: var(--font-sans);` (globals.css:10) — mirror it with `--font-brand: var(--font-brand);` so Tailwind emits a `font-brand` utility resolving at runtime.
- Google Fonts fetch proven working at build time (`.next/dev/server/next-font-manifest.json` contains inter woff2). Sora does NOT ship a `vietnamese` subset (Google Fonts metadata lists latin + latin-ext only) — **verified at implementation (2026-09-28)**: build failed with `TS2322: Type 'vietnamese' is not assignable to 'latin'|'latin-ext'`, so `subsets:["latin","latin-ext"]` was used. Brand text `DuanMAR` is ASCII, so Vietnamese diacritics never render in Sora; Inter keeps `["latin","vietnamese"]` for body copy.
- Render sites: `header.tsx:27` (`text-xl font-bold`), `footer.tsx:37` (`font-semibold`), `footer.tsx:93` (plain copyright — leave as body font).

## Requirements
### Functional
- [x] Sora loaded via `next/font/google`, `subsets: ["latin","latin-ext"]` (no vietnamese subset exists), `variable: "--font-brand"`
- [x] New `font-brand` utility available (`@theme inline` mapping) — Inter stays body, `--font-heading` unchanged
- [x] `src/components/layout/brand-wordmark.tsx` renders `DuanMAR` with `font-brand`
- [x] Header + footer wordmarks consume the component; copyright line stays Inter

### Non-functional
- Font `variable` classes must be on `<html>` (hydration/font regression risk)
- Build must succeed offline-tolerant (Google Fonts fetched at build; cached manifest exists)
- New file stays well under 200 lines; no duplicate/`-enhanced` files created anywhere

## Architecture
```
layout.tsx  Inter { variable:"--font-sans" } ┐
            Sora   { variable:"--font-brand" }┴─► <html className={`${inter.variable} ${sora.variable}`}>
                                                              │
globals.css @theme inline:  --font-sans: var(--font-sans);      ├─► font-sans  (body, Inter)
                          --font-heading: var(--font-sans);    ├─► font-heading (UI chrome — unchanged)
                          --font-brand: var(--font-brand);  ◄──┘─► font-brand  (Sora)

brand-wordmark.tsx ─► header.tsx:27 (text-xl font-bold)
                   └► footer.tsx:37 (font-semibold)   footer.tsx:93 stays font-sans
```

## Related Code Files
**Modify**
- `src/app/layout.tsx` — add `Sora` import + const, merge variable classes on `<html>` (L21)
- `src/app/globals.css` — add `--font-brand: var(--font-brand);` inside `@theme inline` (near L10-11)
- `src/components/layout/header.tsx:27` — replace inline `<span>` with `<BrandWordmark className="text-xl font-bold" />`
- `src/components/layout/footer.tsx:37` — wrap `<h3 className="mb-4">` around `<BrandWordmark className="font-semibold" />`

**Create**
- `src/components/layout/brand-wordmark.tsx` (new, allowed — see plan.md guardrails)

**Delete**: none.

## Implementation Steps
1. `src/app/layout.tsx`:
```tsx
import { Inter, Sora } from "next/font/google";

const sora = Sora({
  subsets: ["latin", "latin-ext"],
  variable: "--font-brand",
  display: "swap",
});
// ...
<html className={`${inter.variable} ${sora.variable}`}>
```
   Keep `metadata.title` as already migrated in Phase 02 (`DuanMAR`).
2. `src/app/globals.css` `@theme inline` (after L10): add `--font-brand: var(--font-brand);`. Do **not** alter `--font-heading: var(--font-sans);`.
3. Create `src/components/layout/brand-wordmark.tsx`:
```tsx
import { cn } from "cn";

/** Brand wordmark — Sora display face, single source for "DuanMAR" in the UI. */
export function BrandWordmark({ className }: { className?: string }) {
  return <span className={cn("font-brand", className)}>DuanMAR</span>;
}
```
4. `header.tsx:27` → `<BrandWordmark className="text-xl font-bold" />` (import from `@/components/layout/brand-wordmark`).
5. `footer.tsx:37` → `<h3 className="mb-4"><BrandWordmark className="font-semibold" /></h3>`. Leave `footer.tsx:93` copyright as body font.
6. Verify: build → check `.next` font manifest contains `sora` woff2 (latin + latin-ext) and `inter` unchanged; DevTools `Computed` on header wordmark shows Sora, body shows Inter, `CardTitle`/`SheetTitle` still Inter.
7. Run verification commands; screenshot header/footer at desktop + mobile widths on `/en` and `/vi` (Vietnamese glyphs must render, no tofu).

## Todo List
- [x] `layout.tsx`: import + init Sora with `variable: "--font-brand"`
- [x] `layout.tsx`: both variable classes on `<html>`
- [x] `globals.css`: add `--font-brand` to `@theme inline`
- [x] Create `src/components/layout/brand-wordmark.tsx`
- [x] `header.tsx:27` + `footer.tsx:37` consume `BrandWordmark`
- [x] Confirm `--font-heading` untouched (card/sheet still Inter)
- [x] Verify Sora subsets present in font manifest (latin + latin-ext; no vietnamese subset exists)
- [x] `npm run lint` · `npm run build` · `npm test` · `npm run test:browser`

## Success Criteria
- [x] Header + footer wordmark render in Sora; body/UI chrome render in Inter (verified in DevTools)
- [x] Vietnamese diacritics render correctly (no fallback/tofuroot) on `/vi`
- [x] `grep -rn "font-brand" src/` → token in `globals.css`, class in `brand-wordmark.tsx`
- [x] Only ONE literal `DuanMAR` in layout components (inside `brand-wordmark.tsx`)
- [x] Font manifest lists both `inter` and `sora`
- [x] `npm run lint`, `npm run build`, `npm test`, `npm run test:browser` → 0 failures
- [x] No new files besides `src/components/layout/brand-wordmark.tsx`; every touched code file < 200 lines

## Risk Assessment
| Risk | Impact | Mitigation |
|---|---|---|
| Sora `vietnamese` subset missing/failed fetch | Med | **Realized**: Sora has no vietnamese subset → shipped `subsets:["latin","latin-ext"]` (ASCII brand text); body stays Inter with vietnamese. Documented here + research-summary. |
| Variable class not on `<html>` → font regression (past P1) | High | Merge into existing `className` on `<html>`; visual check body font |
| Pointing `--font-heading` at Sora changes UI chrome | Med | Explicitly do NOT touch `--font-heading` (card/sheet stay Inter) |
| Google Fonts unreachable at build | Low | Manifest already cached; `display:"swap"` prevents FOIT |
| FOUC / layout shift from second font | Low | `display:"swap"` + wordmark-only usage |

## Security Considerations
- `next/font/google` fetches at build time only — no runtime third-party requests, no API keys.
- No user data, auth, or external scripts introduced.

## Next Steps
- All 3 phases complete → update `docs/project-changelog.md` + `docs/development-roadmap.md` (docs impact: minor).
- Optional follow-ups (out of scope): favicon/OG image assets in `public/`, Leaflet map theming, theme toggle.

---

**Decisions already made (do not re-litigate)**: **Sora** as brand/display font (`subsets:["latin","latin-ext"]` — no vietnamese subset exists; ASCII wordmark); Inter remains body; `--font-heading` stays Inter (no repointing); new `--font-brand` token + `brand-wordmark` component; brand text = **DuanMAR** (Phase 02); deep crimson `#B91C1C` / soft black `#18181B` palette (Phase 01); scope = brand + visible copy only.

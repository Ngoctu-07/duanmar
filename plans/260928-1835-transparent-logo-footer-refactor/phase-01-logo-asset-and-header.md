# Phase 01 — Logo Asset & Header Lockup

Status: **Complete** · Priority: P1 · Parent: [plan.md](./plan.md)

## Context Links
- Source: `D:\logo duanmar.jpg` (1024×1024, black square bg, circular white-ring badge) — copy at `plans/260928-1835-transparent-logo-footer-refactor/scripts/logo-source.jpg`
- Mask rule: alpha=0 OUTSIDE badge circle, black disc interior KEPT → `public/images/logo-duanmar.png` (**lead produces asset in parallel; this phase only verifies + consumes**)
- Precedent `next/image` local asset: `src/components/layout/promo-modal.tsx:4,30` (`/images/promo-modal.png`, `public/images/` exists with 1 file)
- `next.config.ts:22-26` — local `/images/**` needs no remotePatterns change

## Requirements
1. Transparent logo available at `public/images/logo-duanmar.png`.
2. Header: transparent logo + solid `BrandWordmark` side by side.
3. Low-opacity duplicate brand name absolutely overlaid on emblem (`opacity 0.3–0.4`, `aria-hidden`) — stylizes name without masking emblem.
4. Link accessible name = "DuanMar".

## Related Code Files
- MODIFY `src/components/layout/header.tsx:25-27` (current lockup = `<Link href="/"><BrandWordmark className="text-xl font-bold" /></Link>`; file 106 LOC)
- CREATE `src/components/layout/brand-logo.tsx` (<40 LOC; shared by header + footer brand block → DRY, keeps both files <200)
- REUSE `src/components/layout/brand-wordmark.tsx:4-6` (unchanged; single source of "DuanMar" text)
- VERIFY ONLY `public/images/logo-duanmar.png` (do not regenerate unless missing/corrupt)

## Implementation Steps
1. Verify asset: file exists, PNG, alpha channel with transparent corners, opaque center disc, dimensions 1024×1024. If missing → stop and request lead's script output (do NOT write a new masking script).
2. CREATE `src/components/layout/brand-logo.tsx`:
   - `export function BrandLogo({ size = 36, className, priority = false }: ...)` rendering `<Image src="/images/logo-duanmar.png" alt="DuanMar" width={size} height={size} priority={priority} className={cn("shrink-0 rounded-full", className)} />`
   - No `"use client"` needed unless imported state; keep it a server-safe presentational component (`import Image from "next/image"`).
3. EDIT `src/components/layout/header.tsx:25-27` → lockup:
   ```tsx
   <Link href="/" aria-label="DuanMar" className="relative flex items-center gap-2">
     <span className="relative inline-flex h-9 w-9 shrink-0">
       <BrandLogo size={36} priority />
       <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center font-brand text-[7px] font-bold leading-none text-foreground opacity-35">
         DuanMar
       </span>
     </span>
     <BrandWordmark className="text-xl font-bold" />
   </Link>
   ```
   - Overlay must be `absolute` inside the logo wrapper (not the whole link) so it sits ON the emblem; `pointer-events-none` keeps logo click-through; `aria-hidden` keeps it out of a11y tree.
   - Keep link `href="/"` (j-about-contact.mjs:39 asserts no `/about`; l-navbar.mjs:43 checks header href set).
4. A11y: link `aria-label="DuanMar"` overrides inner text/img for SR name; overlay hidden; solid wordmark stays visible text (do NOT aria-hide it).
5. Size guard: logo ≤40px inside `h-16` header bar (`header.tsx:23-24`) — no vertical overflow at 375px/1280px viewports.
6. Do not touch `header.tsx:11-17` navItems, `29-39` nav, `41-102` actions/sheet.
7. Do NOT edit footer in this phase (phase-02 wires `BrandLogo` into footer brand block).

## Todo
- [x] Verify `public/images/logo-duanmar.png` (transparent outside circle, opaque disc)
- [x] Create `src/components/layout/brand-logo.tsx`
- [x] Rework `header.tsx:25-27` lockup: logo + wordmark + overlay
- [x] a11y: `aria-label="DuanMar"`, overlay `aria-hidden`, opacity 0.3–0.4
- [x] `npm run lint` + `npm run build` green

## Success Criteria
- `public/images/logo-duanmar.png` renders with transparent corners on header bg (no black square).
- Header shows logo + "DuanMar"; a faint duplicate name sits over the emblem at opacity ≤0.4; emblem ring/detail still visible.
- `header a[href="/"]` still present with `aria-label="DuanMar"`; existing g-header/l-navbar/j-about-contact assertions unaffected.
- Files <200 LOC; no new deps; no `next.config.ts` change.

## Risks
- Asset produced late by lead → phase blocked (verify first, report BLOCKED rather than improvising a mask).
- Overlay too opaque/large hides emblem → cap opacity 0.35 default, font ≤8px.
- `next/image` static import warning if `logo-duanmar.png` missing → build fails; asset check is step 1.

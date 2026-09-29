# Phase 01 — Promo Modal Component + i18n + Image Gate

## Context Links
- Research: `src/components/ui/sheet.tsx` (138 LOC, only overlay primitive), `src/app/[locale]/layout.tsx` (20 LOC), `src/app/globals.css:2` (`tw-animate-css`), `tests/unit/i18n-parity.test.ts` (sorted key-set equality)
- Binding decisions: image file user-provided · mounts EVERY load · close via X/Escape
- Related phases: `phase-03-test-harness.md` (depends on `data-slot="promo-modal"` selector), `phase-04-verify-and-evidence.md` (image gate before build)

## Overview
- Priority: P1 · Status: Complete
- Build generic dialog primitive + promo modal client component + `promo` i18n namespace; verify marketing image exists.

## Key Insights
- No dialog.tsx/toast.tsx exists; `@base-ui/react@^1.8.0` installed (sheet imports `Dialog as SheetPrimitive` from `@base-ui/react/dialog`). Hand-write dialog mirroring sheet (KISS, no registry).
- `[locale]/layout.tsx` is a server component wrapping children in `NextIntlClientProvider` — a client child renders at first client paint of every full document load (SPA Link navs keep layout → no re-show; AC-literal: navigate/reload = document load).
- All overlays are `z-50` (= header) → promo must be `z-[60]` to cover header + mobile sheet.
- Parity test flattens+sorts keys → only EN/VI key-set equality matters, insertion position free.
- `public/` empty; `next/image` house style = 3 usages (`hero-section.tsx` fill+priority).

## Requirements
- R1 `ui/dialog.tsx`: Portal + Backdrop + centered Popup, controlled `open`/`onOpenChange` passthrough, sheet-style transitions, X close button with i18n `closeLabel` (sr-only), Escape closes (base-ui modal default), `z-[60]`.
- R2 `promo-modal.tsx`: client component, `open` default `true`, renders `<Image src="/images/promo-modal.png">` + visible X top; popup exposes `data-slot="promo-modal"`, close `data-slot="promo-modal-close"`; no `aria-live` anywhere.
- R3 Mount `<PromoModal />` in `src/app/[locale]/layout.tsx` inside provider (after `<Footer />` → portal last in body, natural stacking).
- R4 i18n: top-level `promo` namespace added to `src/messages/en.json` AND `vi.json` (same key sets).
- R5 Image gate: `public/images/promo-modal.png` must exist before build; if absent at any point → BLOCKED, ask lead/user (do not generate art).

## Related Code Files
- Create: `src/components/ui/dialog.tsx` (~100 LOC), `src/components/layout/promo-modal.tsx` (~60 LOC)
- Modify: `src/app/[locale]/layout.tsx` (import + 1 element), `src/messages/en.json`, `src/messages/vi.json` (`promo` namespace)
- Delete: none

## Implementation Steps
1. **Gate first**: `test -f public/images/promo-modal.png || echo MISSING` → if MISSING, stop and ask user to drop the file.
2. Create `src/components/ui/dialog.tsx` mirroring `sheet.tsx`:
   - `"use client"`; `import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"`; `cn` from `"cn"`; `XIcon` from `lucide-react`; `Button` from `@/components/ui/button`.
   - `Dialog` (Root, `data-slot="dialog"`), `DialogPortal`, `DialogOverlay`: `fixed inset-0 z-[60] bg-black/50 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 backdrop-blur-xs` (sheet `bg-black/10` precedent, stronger dim for modal).
   - `DialogContent({ closeLabel = "Close", className, children, ...props })`: `SheetPortal`-style `DialogPortal` + Overlay + `DialogPrimitive.Popup` `data-slot="dialog-content"` centered: `fixed left-1/2 top-1/2 z-[60] w-[min(92vw,42rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-3 shadow-soft transition duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 data-ending-style:scale-95 data-starting-style:scale-95` — ensure `{...props}` spread AFTER `data-slot` so callers can override (promo passes `data-slot="promo-modal"`).
   - Close button: `DialogPrimitive.Close` rendered as `Button variant="ghost" size="icon-sm"` `absolute right-2 top-2` with `XIcon` + `<span className="sr-only">{closeLabel}</span>`, `data-slot="dialog-close"` (promo passes override `promo-modal-close`). Must be visually obvious (AC1): no `hidden`, default ghost hover on card bg — if ghost contrast too subtle on light card, use `variant="outline"` size `icon-sm`; verify visually in evidence screenshot.
   - `DialogTitle` (sr-only capable: `className="sr-only"` by caller) + `DialogDescription` optional exports for a11y (`aria-labelledby` wiring).
   - Export compound names (`Dialog, DialogTrigger, DialogClose, DialogContent, DialogTitle, DialogDescription`).
3. Create `src/components/layout/promo-modal.tsx`: `"use client"`; `useState(true)` + `onOpenChange`; `useTranslations("promo")`; `<Dialog open={open} onOpenChange={setOpen}>` → `<DialogContent data-slot="promo-modal" closeSlot="promo-modal-close" closeLabel={t("close")}>` containing `<DialogTitle className="sr-only">{t("title")}</DialogTitle>` + `<Image src="/images/promo-modal.png" alt={t("imageAlt")} width={1200} height={800} priority className="h-auto w-full rounded-lg" />`. (`closeSlot` prop in `dialog.tsx` sets the close button's `data-slot`, default `"dialog-close"` — avoids relying on JSX spread order.)
   - Fallback if hydration mismatch/pageerror observed: gate with `const [open,setOpen]=useState(false)` + `useEffect(()=>setOpen(true),[])` (mount immediately post-hydration).
4. Mount in `src/app/[locale]/layout.tsx`: `import { PromoModal } from "@/components/layout/promo-modal";` → `<PromoModal />` after `<Footer />`.
5. i18n (BOTH files, identical key sets):
   - `en.json`: `"promo": { "title": "Special offer for you", "imageAlt": "Special promotional offer", "close": "Close" }` (top-level, append near end).
   - `vi.json`: `"promo": { "title": "Ưu đãi đặc biệt dành cho bạn", "imageAlt": "Thông tin ưu đãi đặc biệt", "close": "Đóng" }`.
   - Run `npm test` → i18n parity must stay green.
6. Quick check: `npm run lint`.

## Todo List
- [ ] Image gate passes (else BLOCKED → user)
- [ ] `ui/dialog.tsx` created (centered, z-[60], X close i18n, data-slot override works)
- [ ] `layout/promo-modal.tsx` created (open default true, Image, sr-only title)
- [ ] Mounted in `[locale]/layout.tsx`
- [ ] `promo` namespace EN+VI, `npm test` green
- [ ] `npm run lint` green

## Success Criteria
- `/vi` full load mounts modal above header (visually verified); X visible top; Escape closes; closes fully unmount (detached) so `[role="dialog"]` first-match is safe.
- Both message files contain identical `promo.*` key sets; 11/11 unit tests pass; lint clean.

## Risk Assessment
- Hydration mismatch (open dialog SSR) → pageerror; mitigation: mounted-gate fallback (step 3).
- Missing image at runtime → broken/next-image error; mitigation: hard gate before build (step 1 + phase-04).
- Base-ui `data-slot` override order → verify spread order; else add explicit slot prop.

## Security Considerations
- Static public asset only; no user input, no storage, no network calls, no secrets. Close label i18n'd (no hardcoded en in sr-only).

## Next Steps
- Phase 02 (toast) is independent; Phase 03 depends on `data-slot="promo-modal"` selector existing — do not rename without updating `tests/helpers/promo.mjs`.

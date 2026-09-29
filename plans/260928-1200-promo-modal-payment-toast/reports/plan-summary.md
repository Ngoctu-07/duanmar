# Plan Summary — Entry Promotional Modal & Payment Success Toast

**Plan:** `plans/260928-1200-promo-modal-payment-toast/` · **Date:** 2026-09-28 · **Work context:** `D:\tour`

## Decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | Hand-write `src/components/ui/dialog.tsx` (~100 LOC) mirroring `sheet.tsx` (base-ui Dialog, Portal+Backdrop+centered Popup, `z-[60]`, sheet-style `data-starting-style:`/`data-ending-style:`) | Only overlay primitive is sheet; shadcn registries empty; no new deps (KISS) |
| D2 | `closeLabel`/`closeSlot` props → i18n sr-only X (sheet hardcodes "Close") | AC1 visible X; i18n house rule |
| D3 | `src/components/layout/promo-modal.tsx` client child of `src/app/[locale]/layout.tsx`, `open` default `true` | Mounts at first client render of EVERY full document load (AC-literal); SPA Link navs keep layout → no re-show (documented) |
| D4 | NO storage key for promo | AC every-load; immune to `f-ui.mjs:55 localStorage.clear()`; YAGNI |
| D5 | Popup `data-slot="promo-modal"` + close `data-slot="promo-modal-close"` | Lets `dismissPromo` distinguish promo from header sheet (`g-header.mjs:44` first-match `[role="dialog"]`) |
| D6 | Toast `src/components/booking/payment-success-toast.tsx`, effect on `status` in payment section, `role="status"` but NO `aria-live` attr, no `<p>` tag | Tests match only `p[aria-live="polite"]` (grep-verified) → zero selector collision, keeps a11y announcement |
| D7 | Toast `fixed bottom-4 right-4 z-[80]` container FULLY `pointer-events-none`, no interactive children, auto 5000ms only | c-payment clicks bank radio `:128` while toast visible → non-blocking at any coordinate |
| D8 | Styling: `bg-foreground text-background border-l-4 border-primary shadow-soft rounded-xl` + `animate-in slide-in-from-bottom-2 fade-in-0` | Dark/red theme via tokens (no hex); tw-animate-css imported `globals.css:2` |
| D9 | i18n: top-level `promo.*` + `booking.toastSuccess` in BOTH `en.json`/`vi.json` | Parity test = sorted key-set equality |
| D10 | `tests/helpers/promo.mjs::dismissPromo(page)` — X click → Escape fallback → wait `detached`; wired AFTER all 19 goto/reload sites (6 files) as setup only | Repo rule: zero assertion edits; detach wait protects first-match dialog query |
| D11 | Image gate `test -f public/images/promo-modal.png` BEFORE build; missing → BLOCKED → user | User-provided file; next/image failure would trip `pageerror` listeners |
| D12 | Fallback if dialog SSR hydration pageerror: `useState(false)` + `useEffect` open gate | Still mounts immediately post-hydration |

## File Estimate

| Action | File | ~LOC |
|---|---|---|
| create | `src/components/ui/dialog.tsx` | 100 |
| create | `src/components/layout/promo-modal.tsx` | 60 |
| create | `src/components/booking/payment-success-toast.tsx` | 45 |
| create | `tests/helpers/promo.mjs` | 20 |
| modify | `src/app/[locale]/layout.tsx` | +2 |
| modify | `src/components/booking/booking-payment-section.tsx` (183 → ~193) | +10 |
| modify | `src/messages/en.json` / `vi.json` | +4 keys each |
| modify | 6 × `tests/browser/*.mjs` | +38 setup lines (19 dismiss + 19 imports… 6 imports) |
| create | `{plan}/evidence/capture-evidence.mjs` + 3 PNGs | — |
| append | `docs/project-changelog.md` (EOF under `## 2026-09-28`) | ~8 |

No deletions, no new dependencies, no commits (dirty tree → grep/count gates).

## Top Risks
1. **Test first-match collisions** (`[role="dialog"]` g-header, `p[aria-live]` c-payment/d8) → mitigations D5/D6 + detach-wait helper + grep gates (25 `dismissPromo` hits, `check(` counts unchanged).
2. **Toast overlay blocking radio click** (`c-payment:128`) → D7 full `pointer-events-none`; confirmed by 7/7 run.
3. **Missing marketing image** → D11 hard gate before build (user must drop file).
4. **Base-ui open-dialog SSR hydration error** → D12 fallback; `pageerror` listeners would catch.
5. **Dev/build port contention on :3000** → stop dev (taskkill PID from netstat) before build; restart with secret before browser run.
6. **Missed dismiss site among 19** → grep-count gate + all 6 files listed with line anchors in phase-03.

## Open Questions (for lead)
1. Promo visible copy: plan uses sr-only `promo.title` only (visible content = image + X, per AC). Is a visible heading/CTA/link on the modal wanted? (If yes, copy needed EN+VI.)
2. VI toast wording proposed: `Cảm ơn quý khách đã đặt tour. Chúng tôi sẽ liên hệ trong vòng 5 phút.` — confirm (EN is verbatim user text; VI is translator's choice).
3. Backdrop click-to-close: base-ui modal default allows it; AC says X or Escape only. Keep backdrop-close (recommended, standard UX) or disable?
4. Modal image aspect: plan renders `width=1200 height=800` attrs with `h-auto w-full` (intrinsic ratio wins — no distortion whatever the file dims). If user's PNG is very tall, modal height could exceed viewport → should we cap with `max-h-[80vh] overflow-y-auto`? (Recommended: yes, add in impl.)
5. `README.md` referenced by CLAUDE.md does not exist in repo — no context loaded from it; confirm not required.

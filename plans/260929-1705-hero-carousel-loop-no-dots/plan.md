# Tour Detail Hero Carousel — Infinite Loop Fix + Remove Pagination Dots

**Date**: 2026-09-29 · **Type**: Bug-fix (UX) · **Status**: Complete · **Progress**: 100%

## Reported issues
1. Carousel "stops / fails to cycle back" after the last image (Image 3) — want endless 1→2→3→1.
2. Remove pagination dots beneath the hero image (minimalist layout).

## Root cause analysis (empirical, dev server @1280×900)
Probed `http://localhost:3000/vi/explore/destinations/hcm` (component `src/components/explore/destination-hero-carousel.tsx` — the only carousel in the app; its own docstring calls it "Tour detail hero carousel"):

| Probe | Result |
|-------|--------|
| Cursor parked OFF hero, 18s sample | **Loop works**: `0→1→2→3(clone)→snap→0→1→2→3→0` — twice, smooth 700ms glide, snap back to real slide 0 at +600–700ms after clone lands |
| Cursor moved ONTO hero (boundary crossing) | `mouseenter` fires → `setPaused(true)` → **autoplay stops dead** (0 ticks in 6s) until `mouseleave` |
| Mouse first lands inside hero (no prior position) | `mouseenter` never synthesized → keeps looping — **why the browser test never saw the pause** (`s-tour-hero-carousel.mjs:62` deliberately parks cursor off-hero + CDP first-move quirk) |

**Conclusion**: the infinite loop (clone-slide wrap at `:45-64`) is implemented and verified working. The user-visible "stop at image 3" is **pause-on-hover** (`:74-75`) freezing autoplay wherever the pointer rests — commonly noticed on the last image. Pause-on-focus (`:76-77`) compounds it after a dot click (button keeps focus). Test suite masked this by design.

Dot removal additionally makes focus-pause dead code (nothing inside the hero stays focusable once dots are gone).

## Remediation

### A. Guarantee continuous endless loop (root-cause fix)
- **Remove hover/focus pause** (`onMouseEnter/onMouseLeave/onFocusCapture/onBlurCapture`, `paused` state) → autoplay runs unconditionally → true 1→2→3→1 continuous loop.
- **Keep** `prefers-reduced-motion` autoplay disable (OS-level user control; only remaining pause mechanism).
- **Keep** existing clone-first-slide + snap mechanism (verified working — do not rewrite).
- Decision: this drops "pause on hover" a11y nicety; WCAG 2.2.2 mechanism is retained via reduced-motion (documented in changelog). User's explicit goal = uninterrupted loop.

### B. Remove pagination dots
- Delete the dots block (`:106-125`) → no indicators under the image frame.
- Dead-code cleanup that follows: `cadence` state, `active` computation, `useTranslations` import/`t`, `slideLabel` i18n key (**remove from `en.json` AND `vi.json`** — parity test enforces symmetric key sets).
- Keep: `data-testid="destination-hero-carousel"`, clone slide (loop requires it), `aria-hidden` per-slide, reduced-motion effect.

### C. Test contract updates (`tests/browser/s-tour-hero-carousel.mjs`) — needs approval
| Current check | Change to |
|---|---|
| S1 snapshot `dots` array | assert **0 buttons** in carousel (dots removed) |
| S2 "clone slide appended imgs=gallery+1" | **unchanged** (loop still clone-based) |
| S2 "one dot per gallery image, no aria-pressed" | **replaced** → "pagination dots removed" (`dots.length === 0`); keeps B6 spirit |
| S2 "autoplay advances after ~3s" + "infinite loop returns to first slide" (dot `aria-current` tracking) | **rewrite to active-slide tracking** (child with no `aria-hidden`, same method as probe) |
| — | **strengthen loop check** (fixes old blind spot): assert sequence observes clone (child == total) AND real child 0 active again within ~1.5s — previously `active===0` was already true while the CLONE displayed, so a failed snap would have passed |
| S1/i18n label assertions (dot labels incl. `slideLabel`) | removed with the dot checks; `slideLabel` key deleted from both message files |

No other test/file references the carousel or `slideLabel` (grep-verified).

## Phases
1. [phase-01](phase-01-remove-pause-continuous-loop.md) — remove pause + dead state; loop verification via live probe.
2. [phase-02](phase-02-remove-dots-i18n.md) — remove dots block + `slideLabel` (en/vi) + dead code.
3. [phase-03](phase-03-tests-gates-docs.md) — rewrite S-checks, run all gates, screenshots, changelog, report, statuses.

## Gates (all)
lint 0 · `npm test` **18/18** · `npm run build` 0 (dev stopped/restarted) · `sanity schemas validate` 0 · `npm run test:browser` → every file green **except** pre-existing env fail `revalidate-webhook.mjs` (missing `SANITY_REVALIDATE_SECRET`).

## Files
**Modify**: `src/components/explore/destination-hero-carousel.tsx` · `src/messages/en.json` · `src/messages/vi.json` · `tests/browser/s-tour-hero-carousel.mjs` · `docs/project-changelog.md` · plan statuses.
**Create**: report. **Delete**: 0. **Schema/queries**: 0.

## Risks
- Removing hover pause = autoplay never pauses by pointer (accepted: user's explicit ask; reduced-motion retained).
- Active-slide rewrite must not reintroduce `aria-pressed` (B6 invariant) — use `aria-hidden` absence / transform instead.
- Loop probe evidence lives in temp scripts — final proof = strengthened S2 checks + screenshots.

## Success criteria
- Live probe: continuous `…2→3(clone)→0→1…` cycling with cursor ANYWHERE (on/off hero).
- Zero pagination dots/indicators under hero (desktop + mobile).
- New S2 checks green; full suite green except known env fail.

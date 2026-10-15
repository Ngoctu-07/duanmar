# FAB Ghost Masking Bugfix — Plan (done)

## Root causes
- `transition-all duration-300` on FAB wrapper animated `clip-path` → seam lagged scroll 300ms: background gap band (black streak), stale white above boundary (bleed), dislocation on enter/leave.
- Percentage clips from independently rounded values → sub-pixel seam gap.
- Per-frame React state re-renders → stutter; float-bob motion untracked between scroll events.

## Fix
- `use-fab-footer-inversion.ts`: pixel seam from `fab.bottom - footerTop`, single value, 1px overlap favoring outline; clips written directly to layer styles in rAF (no per-frame state); continuous loop gated by IO + 200px rootMargin.
- `assistant-widget.tsx`: layers at identical `absolute inset-0 top-0 left-0 block`; `transition-all` → `transition-transform`; button `overflow-hidden`; outline starts hidden pre-paint; `data-overlap` via dataset.
- Verified live headless: top/mid/bottom branches, seam = H-1, white edge within 1px of footerTop, re-scroll consistent, zero pageerrors.

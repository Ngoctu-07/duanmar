# Phase 01 — Header Icon Tooltips (Lightweight CSS)

**Status**: Complete · **Priority**: High

## New `src/components/ui/hover-tooltip.tsx` (pure CSS, no deps, server/client safe)
```tsx
export function HoverTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}
```
- Visual-only duplicate → `aria-hidden` (icon Button keeps its `aria-label` for screen readers — d8-safe).
- Shows on hover **and** keyboard focus (`group-focus-within`).

## `header.tsx` (desktop icons only, `:63-84`)
- Wrap Search Button → `<HoverTooltip label={t("search")}>` ; Luggage Button → `<HoverTooltip label={mt("navLabel")}>`.
- Reuse existing keys (common.search / myTrips.navLabel) → **no new i18n keys, parity untouched**.
- Mobile Sheet links (`:97-110`) untouched (already labeled).

## Verify
- Desktop hover: pill with "Search"/"Tìm kiếm" under magnifier; "My trips"/"Chuyến đi của tôi" under suitcase; `f-ui`, `g-header`, `d8` green.

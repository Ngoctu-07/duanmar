# Phase 02 — Header: "Home" Item + Self-Refresh Logic

**Status**: Complete (100%) · **Depends on**: Phase 1 + refresh-mechanism decision · **Priority**: High

## Changes — `src/components/layout/header.tsx`
1. `navItems` prepend home:
   ```tsx
   const navItems = [
     { key: "home", href: "/" },
     { key: "domesticTours", href: "/tours/domestic" },
     { key: "internationalTours", href: "/tours/international" },
     { key: "deals", href: "/deals" },
     { key: "blog", href: "/blog" },
   ];
   ```
   (`common.home` exists in both locales — no i18n edits.)
2. Self-refresh handler (Header is `"use client"`):
   ```tsx
   const pathname = usePathname(); // from @/i18n/navigation — "/" on home
   const handleHomeClick = (e) => {
     if (pathname === "/") {
       e.preventDefault();
       window.location.reload();        // HARD (recommended)
       // ── or, if soft approved: router.refresh();
     }
   };
   ```
   Attach to BOTH renders: desktop `navItems.map` Link and Sheet `navItems.map` Link → `onClick={item.href === "/" ? handleHomeClick : undefined}`.
3. Imports: `usePathname` from `@/i18n/navigation` (+ `useRouter` from same if soft).

## Verify
- Desktop nav = 5 links: Home · Tour trong nước · Tour nước ngoài · Ưu đãi & Gói du lịch · Blog; sheet shows same 5.
- From `/tours/domestic`, clicking Home navigates to `/vi` (soft, no reload — marker persists).
- On `/vi`, clicking Home reloads page (marker wiped / RSC refetch — per decision).

## Todo
- [ ] navItems + handler + both render sites
- [ ] Visual 5-item nav (desktop ≥768 + sheet)
- [ ] Navigation behavior check (on-route vs on-home)

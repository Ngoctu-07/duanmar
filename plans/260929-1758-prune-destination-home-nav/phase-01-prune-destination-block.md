# Phase 01 — Prune "Destination" Promo Block from Tour Pages

**Status**: Complete (100%) · **Depends on**: plan approval + scope decision · **Priority**: High

## Changes (per approved scope — default: promo block only)
In BOTH `src/app/[locale]/tours/domestic/page.tsx` and `international/page.tsx`:
- Delete the middle block:
  ```tsx
  <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
    <p className="text-muted-foreground">{t("….body")}</p>
    <Link href="/explore/destinations" …>{t("….cta")}</Link>
  </div>
  ```
- Keep: h1 + subtitle block (`div.mb-10.text-center`) and `<TourCategorySection category="…" />` (the grid — data layer untouched).
- Remove now-unused `Link` import from each page if no other usage (check per file).
- Messages `tours.*.body/cta` left in place (unused keys; parity intact; no churn).

## Verify
- DOM dump: `main` children = title block + grid only.
- Visual: `/vi/tours/domestic`, `/vi/tours/international`, `/en/tours/domestic` — no promo copy/CTA; grid directly after title.

## Todo
- [ ] Remove block from domestic/page.tsx (+ unused import)
- [ ] Remove block from international/page.tsx (+ unused import)
- [ ] DOM + visual check

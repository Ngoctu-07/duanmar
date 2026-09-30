# Phase 02 — Head Metadata Integration

**Status**: Pending · **Priority**: P2 · **Plan**: [plan.md](./plan.md)

## Overview
Add `icons` to root `metadata` so Next renders the exact three requested `<link>` tags on every route. Single injection point — no `<head>` JSX, no file conventions.

## Context Links
- Edit target: `src/app/layout.tsx:16-19` — `export const metadata: Metadata = { title, description }` (no `icons` today)
- Renderer verified: `node_modules/next/dist/lib/metadata/metadata.js:1621-1641` (spreads `{url, rel, ...props}` → `sizes`/`type` attributes pass through; `rel` defaults `icon` / `apple-touch-icon`); shape accepted by `resolvers/resolve-icons.js` (`IconKeys = ['icon','shortcut','apple','other']`, `constants.js:33`)
- No overrides: grep `icons:` and `manifest:` across `src/` = 0 hits; `src/app/[locale]/layout.tsx` exports no `metadata` (only sanity popup fields at :28-29)
- Metadata merge: child page metadata (e.g. `src/app/[locale]/about/page.tsx:4`) overrides only its own keys → root `icons` preserved (browser test asserts this on `/en` + `/vi`)

## Related Code Files
**Modify**
1. `src/app/layout.tsx` — extend `metadata` (lines 16-19) to:
```ts
export const metadata: Metadata = {
  title: "DuanMar",
  description: "Discover Vietnam - Your Premier Travel Destination",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
};
```
**Create/Modify elsewhere**: none. `public/icon-192.png` / `public/icon-512.png` intentionally NOT in head (manifest deferred — plan decision 7); they stay reachable at their URLs.

**Delete**: none.

## Why `public/` + metadata (not `src/app/icon.*` conventions)
1. Legacy browsers request `/favicon.ico` with zero HTML → must exist as static root file (also true for app-convention, but public/ is explicit and diff-visible)
2. Exact href/attribute control required by spec; conventions add their own URL forms — mixing both mechanisms would double-inject tags (DRY)
3. One mechanism to test: the metadata object is the single source of truth

## Implementation Steps
1. Edit `src/app/layout.tsx` metadata as above (keep title/description byte-identical)
2. `npm run lint`
3. With dev server (`npm run dev`, log `.next-dev.log`): `curl -s http://localhost:3000/en | grep -oE '<link rel="(icon|apple-touch-icon)"[^>]*>'` → expect exactly 3 lines matching spec
4. Repeat for `/`, `/vi`, `/en/about` (deep route with own page metadata)

## Success Criteria / Acceptance
- [ ] HTML contains exactly one each of the three specified tags (no dupes, no `«nxt-icon»`-style extra links — icon-mark is a `<meta>`, not a link, per `generate/icon-mark.js`)
- [ ] `title`/`description` unchanged; `src/app/[locale]/layout.tsx` untouched
- [ ] Tags present on root + locale + deep routes (merge proven)
- [ ] `npm run lint` clean

## Risk / Security
- Metadata merge surprise (page wipes parent `icons`) → disproven by grep + asserted in Phase 3 tests on `/en`,`/vi`
- Fully additive; rollback = revert this one hunk

## Next Steps
Phase 3 verifies head + assets: [phase-03-verification-tests-docs.md](./phase-03-verification-tests-docs.md)

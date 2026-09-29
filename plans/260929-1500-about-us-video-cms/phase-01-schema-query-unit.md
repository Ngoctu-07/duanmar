# Phase 1 — Studio Schema, Query Projection, Unit Contract Test

**Plan**: [plan.md](plan.md) · **Priority**: High · **Status**: Complete (100%) · **Depends on**: —

## Context Links
- `src/sanity/schemaTypes/homepage.ts` (5 fields, preview `title`) — register unchanged (`schemaTypes/index.ts` already lists it)
- `src/sanity/queries/homepage.ts:4-11` (`HOMEPAGE_QUERY`) — call site `src/app/[locale]/page.tsx:22` passes `{}`
- Unit precedent: `tests/unit/site-configuration-query.test.mts` (query contract, 0 network) · runner `tests/run-unit.mjs` globs `tests/unit/*.test.{ts,mts}` (16 → 17 files)

## Overview
AC1 (Studio fields) + query plumbing: 3 new fields on `homepage`, projected with **no new params** (call-site safety), guarded by a new unit contract test.

## Key Insights
- `type: "file"` value shape = `{asset: {…ref}}` → GROQ `aboutUsVideo{asset->{url}}` yields `{asset:{url}}`; images also expose `metadata.dimensions`.
- `FileOptions.accept?: string` (types line 1324) → `"video/mp4,video/webm"` is a valid MIME list.
- `type: "url"` brings built-in URL validation; keep optional (no cross-field "one of two" rule — KISS/YAGNI).

## Requirements
- Fields (all optional, on `homepage`): `aboutUsVideo` (file, accept mp4/webm), `aboutUsVideoStreamUrl` (url), `aboutUsVideoPoster` (image + hotspot) — each with a bilingual-friendly English description (schema descriptions are EN today).
- `HOMEPAGE_QUERY` projects all three; still **0 params**, still `[0]`, hero projection byte-identical.
- Studio validate: 0 errors.

## Related Code Files
**Modify**: `src/sanity/schemaTypes/homepage.ts` · `src/sanity/queries/homepage.ts` · (test file created)
**Create**: `tests/unit/homepage-about-video-query.test.mts`
**Delete**: none

## Implementation Steps
1. `homepage.ts` — append after `heroImage`:
   - `aboutUsVideo` — `type:"file"`, `options:{ accept: "video/mp4,video/webm" }`, description "Homepage About Us background video (autoplay, muted, looping). Upload MP4/WebM — wins over the URL field."
   - `aboutUsVideoStreamUrl` — `type:"url"`, description "Direct link to an externally hosted video (mp4/webm). Used only when no file is uploaded."
   - `aboutUsVideoPoster` — `type:"image"`, `options:{ hotspot:true }`, description "Poster shown before playback and as fallback when no video is set."
2. `homepage.ts` query — extend projection only:
   ```groq
   *[_type == "homepage"][0]{
     title, heroTitle, heroSubtitle, heroImage { ${imageFragment} },
     aboutUsVideo { asset->{url} },
     aboutUsVideoStreamUrl,
     aboutUsVideoPoster { asset->{url, metadata{dimensions{width, height}}} }
   }
   ```
3. New unit test `tests/unit/homepage-about-video-query.test.mts` (node:assert, same harness shape as `site-configuration-query.test.mts`): exports non-empty · contains `aboutUsVideo { asset->{url} }` · contains `aboutUsVideoStreamUrl` · contains `aboutUsVideoPoster` · **no `$`** (call-site safety) · hero fields still projected · image fragment still present · no ternary + balanced parens.
4. Gates: `npm run lint` → `npm test` (**17/17**) → `set -a; . ./.env.local; set +a; npx sanity schemas validate` (0 errors; source env first — dev server may run during this, it only reads).

## Todo List
- [ ] 3 schema fields on `homepage.ts`
- [ ] `HOMEPAGE_QUERY` projection (0 params)
- [ ] New unit contract test
- [ ] Gates: lint, unit 17/17, schema validate

## Success Criteria
- Studio `/studio` → Homepage doc shows Video (file), Video URL, Poster fields.
- `npm test` 17/17; schema validate 0 errors; grep shows no `$` added to `HOMEPAGE_QUERY`.

## Risk Assessment
- File MIME list rejected by Studio → validate + manual Studio open catches immediately.

## Security Considerations
- External URL field: Sanity `url` type accepts http(s); no `javascript:` risk in `<video src>` under React (URL only), and CMS editors are trusted authors.

## Next Steps
Phase 2 — frontend binding.

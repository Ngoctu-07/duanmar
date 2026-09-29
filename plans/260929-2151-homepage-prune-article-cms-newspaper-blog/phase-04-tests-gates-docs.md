# Phase 04 — Tests, Gates, Docs (closes 3 pending features)

**Status**: Complete · **Depends on**: Phase 3 · **Priority**: High

## Unit
- New `tests/unit/article-schema-queries.test.mts`: groq-js parse + assert `_type == "article"`, `publishedAt <= now()`, `order(publishedAt desc)`, featuredImage/content projection; schema source field names (title/slug/excerpt/content/featuredImage/gallery/publishedAt + block arrays); `post.ts` file gone + not in `index.ts`; messages contain no `news.items`.
- Existing 18 unit files must stay green (i18n parity auto-validates key deletions).

## Browser (runner auto-discovers; 20 files now → 22)
- **`x-blog-newspaper.mjs`**: `/vi`+`/en` `/blog` → 200, `h1 == blog.title`; zero `/Article\s*\d/` ordinals in body; if live CMS articles > 0: ≥N `[data-testid="newspaper-article"]`, per block `h2` large (`text-4xl|text-3xl`), `time[datetime]`, excerpt p, `md:columns-2` body wrapper present when content non-empty, `border-t` rules between blocks, first link href `/news/<slug>`; if 0: empty-state text visible + no blocks; zero pageerrors; screenshots (when content present) `x-blog-*.png`.
- **`y-homepage-prune.mjs`**: `/vi`+`/en` — DOM does NOT contain the 4 removed headings (assert via their i18n strings: `home.trade.title`, `events.tickerTitle`, `itineraries.title`, `home.experienceCategories` — read live from messages, not hardcoded); section count == 6 (hero…newsletter via `main > *` heuristic or explicit: about/featured/stories/newsletter present, trade/ticker/trending/experience absent); Stories section (`h2 == blog.title`) present iff live articles ≥1 (data-driven); screenshots; zero pageerrors.
- Regressions: `w`(purge), `j`, `n`, `v`, `l`(L4 blog h1), `p`(P19), `u`-suite equivalents.

## Gates (ordered)
1. targeted: x, y, w, j, n, v, l, p.
2. `npm run lint` 0 → `npm test` 19/19 → stop dev → `npm run build` 0 → `npx sanity schemas validate` 0 → restart dev → `npm run test:browser` **21/22** (sole fail = `revalidate-webhook` env).
   - **This run also closes owed gates for `260929-2135-purge-team-gallery`** (build+suite were pending).
3. Seed script (if Q4 approved): `node scripts/seed-articles.mjs` dry-run recorded.

## Docs
- `docs/project-changelog.md` `## 2026-09-29` — add bullets: (a) **narrative CMS feature** (owed from 2114), (b) teamGallery purge, (c) homepage 4-section pruning, (d) `article` schema + mock purge, (e) newspaper blog feed.
- Reports: `plans/260929-2135-purge-team-gallery/reports/…` + `plans/260929-2151-…/reports/implementation-2026-09-29-…`.
- Status flips → Complete 100%: `260929-2114` (plan + 3 phases, **owed**), `260929-2135` (plan + 2 phases, **owed**), `260929-2151` (plan + 4 phases).
- Outstanding: `SANITY_WRITE_TOKEN` (purge-team-gallery `--apply`, seed-articles `--apply`), Studio content (articles incl. narrative fill), `SANITY_REVALIDATE_SECRET`.

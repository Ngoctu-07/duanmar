# Phase 04 — Tests + Docs (+ email phase-04 close-out)

**Status:** complete · **Plan:** [plan.md](./plan.md)

## Tests

**Rewrite `tests/browser/x-blog-newspaper.mjs`** (contract pivot; keep filename or rename `x-blog-feed.mjs` — prefer rename for self-documenting files, update runner auto-discovery = glob so no runner edit):
- Keep: X1 `/blog` 200 both locales · X2 `h1 === blog.title` · X3 live block count · X4 empty state · X5 no `Article N` **+ add `Bài \d`** (research gap) · X6 h2 size → `text-(4xl|5xl)` · X9 excerpt · X11 zero pageerrors.
- Change: X7 divider → `border-t` on blocks (feed keeps rules) **or** assert reaction bar present; **X8 hrefs → `/blog/`**; **X10 → NOT has `columns-2` + HAS `max-w-4xl mx-auto` body wrapper + reaction bar `data-testid="like-button"` count**.
- Add: detail `/vi/blog/<first slug>` 200, same `feed-article-block` structure (single mode), back-link `/blog`; `/vi/news` + `/vi/news/<slug>` redirect → 308→200 `/blog…`.

**New `tests/browser/e-social-feed-heart.mjs`** (letter `e` free):
- Feed: blocks stack vertically w/ dividers, oversized title, full-width image (when CMS has one), body single-column, heart button + count per block; click first heart → `aria-pressed=true`, fill red class, count +1; click again → count unchanged; reload → still red (localStorage); zero pageerrors.
- API direct: POST like → 200 `{count:number}`; GET → 405.
- Screenshots (feed desktop + heart closeup).

**New unit `tests/unit/article-likes.test.mts`**:
- `article-likes` storage module (mark/isLiked/set-once semantics) with jsdom-less harness like booking-logic (mock window.localStorage).
- DB module: temp-file `DatabaseSync` → increment 1→2, `getArticleLikeCounts` map, bad-slug rejects, degrade path (bad path → 0) — run against `data/test-*.db` in tmp, cleanup.
- i18n parity auto-covers new keys (existing test).

**Email phase-04 (plan 2229 — finish here):**
- `tests/unit/booking-confirmation-email.test.mts` (subject/footer/date/XSS/validation/delay).
- `tests/browser/b-booking-confirmation-email.mjs` (letter `b`: 415/400/405/202 contract + payment-flow POST spy + dry-run).
- `.env.example` email vars; `docs/booking-confirmation-email.md`.

## Docs
- `docs/project-changelog.md` → `## 2026-09-29` bullets: 2114 narrative · 2135 purge · 2151 prune/article/newspaper · 2207 UX · 2229 email · 2254 routing/feed/hearts.
- `docs/` new: article-likes backend note (forgeability caveat, sqlite location, degrade mode) — fold into changelog + a short `docs/social-feed-reactions.md` only if non-trivial.
- `.gitignore`: `data/`.
- Status flips → Complete + reports for 2114/2135/2151/2207/2229/2254.

## Combined gate cycle (final)
lint 0 → `npm test` (~23) → stop dev → `npm run build` 0 → sanity schema 0 → restart dev → full `npm run test:browser` (expect 21/22: revalidate-webhook env-fail only) → fix failures → close all plans.

# Phase 02 — Social-Style Continuous Feed Layout

**Status:** complete · **Plan:** [plan.md](./plan.md)

## Files
**Rename + rewrite**
- `src/components/blog/newspaper-article.tsx` → **`src/components/blog/feed-article-block.tsx`** (`FeedArticleBlock`) — spec pivot from newspaper grid (delete old file after move; update imports).

Structure (data-testid `feed-article-block`):
```tsx
<article className="border-t border-border py-12 first:border-t-0 first:pt-0">
  <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]">
    <Link href={`/blog/${slug}`}>{title}</Link>
  </h2>
  {featuredImageUrl && <figure className="mt-6"><img className="w-full aspect-video rounded-xl object-cover" … /></figure>}
  <div className="mt-6 max-w-4xl mx-auto">       // text-flow fix: spacious reading column
    {excerpt lead p (optional, text-muted-foreground italic)}
    <ArticleRichText blocks={content} className="mt-4 space-y-5 text-lg leading-relaxed text-foreground/80" />
  </div>
  <ReactionBar slug count>                        // phase-03 (placeholder div until then)
</article>
```
- Props: `{ item: NewsItem; initialLikeCount?: number; single?: boolean }` — `single` = detail mode (no divider handled by parent, h1 instead of h2? **Detail uses `<h1>`** oversized same classes; feed uses `<h2>` for X6/heading semantics).
- Remove: `md:columns-2`, `break-inside-avoid`, `text-[15px]`, ordinals (none existed), `first:` rules kept for divider flow.

**Edit**
- `src/app/[locale]/blog/page.tsx` — stream: `container mx-auto px-4 py-16` → `mx-auto max-w-4xl` list, `map(item => <FeedArticleBlock key={slug} …/>)`; keep `h1 = blog.title` + `blog.subtitle` (contracts X2/L4/Y4); empty state unchanged (hasEmptyState contract X4).
- `src/app/[locale]/blog/[slug]/page.tsx` (from phase-01) — single `<FeedArticleBlock single>` + back link.

## Verify
- `/vi/blog` 200, stacked blocks, NO `columns-2` anywhere, body readable width
- Wide viewport: text block centered (mx-auto), image full column width
- Mobile 375: no overflow, title scales (text-4xl → check no horizontal scroll)

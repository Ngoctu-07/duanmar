# Phase 03 — Newspaper Blog Feed + Homepage Stories Wiring

**Status**: Complete · **Depends on**: Phase 2 · **Priority**: High

## Shared typography module `src/components/sanity/portable-text-components.tsx`
- Extract the component map from `about-narrative.tsx` (normal → `p.leading-relaxed`, bullet/number lists, `strong.font-semibold`) into exported `PT_COMPONENTS`; `about-narrative.tsx` imports it (no behavior change → `v` test stays green). Export `pickLocaleBlocks(blocksEn, blocksVi, locale)` helper too (DRY fallback chain).

## `src/components/blog/article-rich-text.tsx` (small server component)
- Props `contentEn/contentVi/locale`; picks via helper; `null` when empty; renders `<PortableText value components={PT_COMPONENTS} />`.

## `src/components/blog/newspaper-article.tsx` (server, one block)
```
<article data-testid="newspaper-article" className="border-t border-border py-8 first:border-t-0">
  <time className="text-xs font-medium uppercase tracking-widest text-primary">…publishedAt…</time>
  <h2 className="mt-3 text-3xl/tight md:text-4xl font-bold tracking-tight hover:text-primary transition-colors">
    <Link href={`/news/${slug}`}>{title}</Link>            // large prominent headline
  </h2>
  <p className="mt-3 text-lg text-muted-foreground">{excerpt}</p>   // styled subtitle
  {featuredImage && <figure className="my-6 aspect-[16/9] overflow-hidden rounded-lg">…next/image fill object-cover…</figure>}
  <ArticleRichText … className applied by wrapper: "mt-4 text-[15px] leading-relaxed text-muted-foreground md:columns-2 md:gap-8 [&>*]:break-inside-avoid" />  // multi-column body
  {gallery…?} — render gallery images inline after first paragraph? NO (YAGNI): gallery reserved for detail page; list uses featuredImage only.  // inline image placement = featuredImage
</article>  // border-t = clean dividing rule line
```
- **No sequential labels** anywhere; `date` formatting via existing `formatNewsDate`; brand palette = design tokens only (text-primary/border-border/text-muted-foreground — no sepia/vintage).

## `src/app/[locale]/blog/page.tsx` refactor
- Keep: metadata, `h1 = t("title")` (L4 test), subtitle, empty state, `getStories` (→ latest articles).
- Replace `mx-auto max-w-3xl space-y-6 NewsItemCard` list → `mx-auto max-w-4xl divide-y? NO — rules come from article border-t` continuous `<div>` of `<NewspaperArticle>` blocks (top-to-bottom stream; first has no top rule).
- Keep `NewsItemCard` file (still used by `/news` list + homepage StoriesSection summary widget — requirement 1 says KEEP that layout).

## Homepage StoriesSection
- No code change required (P2 provider repoints `getStories`); verify summary widget grid renders latest 3 CMS articles, hides at 0.

## Verify
- `/vi`,`/en` blog: continuous feed, rule lines, no "Article N"; brand colors; homepage Stories = 3-card summary. `l-navbar` L4 green.

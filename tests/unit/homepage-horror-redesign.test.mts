import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

/**
 * Homepage horror/escape-room redesign — source-level contract.
 *
 * Locks the current visual structure (CMS-driven ambient hero + breakout promo
 * film, minimalist search, open pill-card gallery, Gypsy Curse display
 * headings, tightened search→featured gap) and proves the featured-tour data
 * contract is untouched (same GROQ fields, same card data props).
 */

const read = (path: string) =>
  readFileSync(new URL(`../../src/${path}`, import.meta.url), "utf8");

const page = read("app/[locale]/page.tsx");
const hero = read("components/homepage/hero-section.tsx");
const backdrop = read("components/homepage/hero-ambient-backdrop.tsx");
const promoVideo = read("components/homepage/promo-video.tsx");
const featured = read("components/homepage/featured-destinations.tsx");
const card = read("components/tours/tour-card.tsx");
const search = read("components/homepage/home-search.tsx");
const about = read("components/homepage/about-us-section.tsx");
const stories = read("components/homepage/stories-section.tsx");
const editorial = read("components/homepage/editorial-announcement-section.tsx");
const news = read("components/news/news-item-card.tsx");
const feed = read("components/blog/feed-article-block.tsx");
const domestic = read("app/[locale]/tours/domestic/page.tsx");
const international = read("app/[locale]/tours/international/page.tsx");
const deals = read("app/[locale]/deals/page.tsx");
const blog = read("app/[locale]/blog/page.tsx");
const support = read("app/[locale]/support/page.tsx");
const destinationDetail = read("app/[locale]/explore/destinations/[slug]/page.tsx");
const schema = read("sanity/schemaTypes/homepage.ts");
const globals = read("app/globals.css");
const layout = read("app/layout.tsx");
const en = JSON.parse(read("messages/en.json"));
const vi = JSON.parse(read("messages/vi.json"));
const { FEATURED_DESTINATIONS_QUERY, HOMEPAGE_QUERY } = await import(
  "../../src/sanity/queries/homepage.ts"
);

let passed = 0;
let failed = 0;
const check = (name: string, fn: () => void) => {
  try {
    fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name} :: ${(error as Error).message}`);
  }
};

const has = (source: string, tokens: string[]) => {
  for (const token of tokens) {
    assert.ok(source.includes(token), `missing ${token}`);
  }
};

/* --- component sequencing + scoped theme --- */

check("homepage order: hero → search → featured, inside the horror canvas", () => {
  const heroAt = page.indexOf("<HeroSection");
  const searchAt = page.indexOf("<HomeSearch");
  const featuredAt = page.indexOf("<FeaturedDestinations");
  assert.ok(heroAt >= 0 && searchAt >= 0 && featuredAt >= 0, "section marker missing");
  assert.ok(heroAt < searchAt, "search must follow the hero");
  assert.ok(searchAt < featuredAt, "featured destinations must follow the search");
  assert.ok(page.includes('className="horror-canvas"'), "homepage must use the scoped canvas");
  assert.ok(page.includes("lang={locale}"), "homepage must expose the active locale");
});

check("homepage keeps the existing post-featured sections in order", () => {
  const featuredAt = page.indexOf("<FeaturedDestinations");
  const editorialAt = page.indexOf("<EditorialAnnouncementSection");
  const aboutAt = page.indexOf("<AboutUsSection");
  const storiesAt = page.indexOf("<StoriesSection");
  assert.ok(featuredAt < editorialAt && editorialAt < aboutAt && aboutAt < storiesAt);
});

/* --- hero: CMS media, no static wordmark --- */

check("hero delegates the 7% dimming to the background media", () => {
  has(hero, ["h-screen", "min-h-[560px]", "-mt-16"]);
  assert.ok(!hero.includes("bg-black/[0.07]"), "hero-level 7% wash still present");
  assert.ok(!hero.includes("bg-black/10"), "old 10% wash remains");
  assert.ok(!hero.includes("bg-black/60"), "heavy dark scrim remains");
  assert.ok(
    !hero.includes("w-full items-center justify-center overflow-hidden"),
    "hero must not clip the breakout film",
  );
});

check("hero paints no static display wordmark (only an sr-only CMS H1)", () => {
  assert.ok(!hero.includes('data-testid="hero-display"'), "hero-display still rendered");
  assert.ok(!hero.includes("DECODE TRAVEL"), "hardcoded wordmark copy still present");
  assert.ok(!hero.includes('data-testid="hero-slogan"'), "hero subtitle must stay removed");
  has(hero, ["<h1 className=\"sr-only\">", "heroTitle", 't("heroTitle")']);
});

check("hero breaks out the promo film (50vw, 60% inside / 40% below)", () => {
  has(hero, [
    'data-testid="hero-video"',
    'data-testid="hero-video-frame"',
    "w-[50vw]",
    "max-w-3xl",
    "aspect-video",
    "absolute inset-x-0 bottom-0 z-20 flex justify-center",
    "translate-y-[40%]",
    "autoPlay",
    "muted",
    "loop",
    "playsInline",
  ]);
  assert.ok(
    !hero.includes("absolute inset-0 z-10 flex items-center justify-center"),
    "promo film is still centered instead of anchored to the hero bottom",
  );
});

check("search reserves the promo-film overhang and stacks above it", () => {
  has(search, ["breakoutVideo", "relative z-30", "--hero-video-overhang", "1.5rem"]);
  has(page, ["<HomeSearch breakoutVideo={Boolean(heroVideoSrc)} />"]);
  has(globals, ["--hero-video-overhang: min(11.25vw, 10.8rem)"]);
});

check("ambient backdrop adds no heavy vignette over the background media", () => {
  assert.ok(
    !backdrop.includes("rgba(0,0,0,0.85)"),
    "heavy radial vignette still darkens the background",
  );
});

check("background media keeps native clarity at 88% brightness; promo stays sharp", () => {
  const mediaClassCount = (backdrop.match(/hero-background-media/g) || []).length;
  assert.ok(mediaClassCount >= 3, `media grade applied ${mediaClassCount} times, expected 3`);
  has(globals, [".hero-background-media", "filter: brightness(0.88);"]);
  const mediaRuleStart = globals.indexOf(".hero-background-media");
  const mediaRuleEnd = globals.indexOf("}", mediaRuleStart);
  const mediaRule = globals.slice(mediaRuleStart, mediaRuleEnd);
  assert.ok(!mediaRule.includes("blur("), "background blur still present");
  assert.ok(!mediaRule.includes("sepia("), "sepia grade still present");
  assert.ok(!mediaRule.includes("contrast("), "contrast grade still present");
  assert.ok(!mediaRule.includes("scale("), "background overscan still present");
  const promoStart = hero.indexOf('data-testid="hero-video"');
  const promoEnd = hero.indexOf("/>", promoStart);
  const promoTag = promoStart >= 0 && promoEnd > promoStart ? hero.slice(promoStart, promoEnd) : "";
  assert.ok(promoTag, "promo video tag not found");
  assert.ok(
    !promoTag.includes("hero-background-media"),
    "promo video must not receive the background media grade",
  );
});

check("hero + About video render zero noise/CRT/glitch layers", () => {
  assert.ok(!backdrop.includes("CrtOverlay"), "hero still mounts a CRT overlay");
  assert.ok(!promoVideo.includes("CrtOverlay"), "About video still mounts a CRT overlay");
  assert.ok(
    !existsSync(new URL("../../src/components/homepage/crt-overlay.tsx", import.meta.url)),
    "crt-overlay component still exists",
  );
  // The global event-driven CRT splash (crt-static-overlay) is intentional and
  // uses feTurbulence; homepage media must never opt into it.
  assert.ok(
    !backdrop.includes("crt-static") && !promoVideo.includes("crt-static"),
    "homepage media opted into the global CRT overlay",
  );
  for (const token of [
    ".crt-overlay",
    ".crt-scanlines",
    ".crt-rgb",
    ".crt-band",
    ".crt-glitch",
    ".horror-grain",
  ]) {
    assert.ok(!globals.includes(token), `stale overlay CSS: ${token}`);
  }
});

check("About Us promo video is dimmed 7% and stays overlay-free", () => {
  has(promoVideo, ["brightness-[0.93]", "overflow-hidden"]);
  const videoTag = promoVideo.slice(
    promoVideo.indexOf("<video"),
    promoVideo.indexOf("</video>"),
  );
  has(videoTag, ["brightness-[0.93]"]);
  assert.ok(!promoVideo.includes("crt"), "no CRT/glitch markup in the promo frame");
});

check("hero maps the CMS background media (video / GIF)", () => {
  has(hero, ["backgroundMedia", "<HeroAmbientBackdrop"]);
  has(backdrop, [
    'data-testid="hero-background-media"',
    'data-testid="hero-background-video"',
    "isVideoMedia",
    "image/gif",
    "autoPlay",
    "muted",
    "loop",
    "playsInline",
    "unoptimized",
  ]);
});

check("page maps both new CMS media fields", () => {
  has(page, ["heroBackgroundMedia", "heroPromoVideo", "backgroundMedia={heroBackgroundMedia}"]);
});

check("schema defines heroBackgroundMedia + heroPromoVideo file fields", () => {
  has(schema, ['name: "heroBackgroundMedia"', 'name: "heroPromoVideo"']);
  const bg = schema.slice(schema.indexOf('name: "heroBackgroundMedia"')).slice(0, 500);
  assert.ok(bg.includes('type: "file"'), "background media must be a file asset");
  assert.ok(bg.includes("image/gif"), "background media must accept GIFs");
  const promo = schema.slice(schema.indexOf('name: "heroPromoVideo"')).slice(0, 500);
  assert.ok(promo.includes('type: "file"'), "promo video must be a file asset");
});

check("HOMEPAGE_QUERY selects both new media assets with mime types", () => {
  has(HOMEPAGE_QUERY, [
    "heroBackgroundMedia { asset->{url, mimeType} }",
    "heroPromoVideo { asset->{url, mimeType} }",
  ]);
});

check("hero background is an ambient fog layer too", () => {
  has(backdrop, [
    'data-testid="hero-ambient"',
    "horror-fog horror-fog-a",
    "horror-fog horror-fog-b",
    "horror-ember",
    "aria-hidden",
  ]);
});

check("ambient layers are motion-safe and dark-canvas scoped", () => {
  has(globals, [
    ".horror-canvas",
    "--background: #121212",
    "--primary: #b3151b",
    "--link: #e5484d",
    ".horror-fog-a",
    "@media (prefers-reduced-motion: reduce)",
  ]);
  const reduced = globals.slice(globals.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.ok(reduced.includes(".horror-fog-a") && reduced.includes(".horror-fog-b"));
});

/* --- typography --- */

check("Gypsy Curse is self-hosted via next/font/local and exposed as font-gypsy", () => {
  has(layout, [
    'from "next/font/local"',
    "./fonts/gypsy-curse.woff2",
    'variable: "--font-gypsy-curse"',
    "gypsyCurse.variable",
  ]);
  has(globals, ["--font-gypsy: var(--font-gypsy-curse)"]);
});

check("shipped display face is the Vietnamese-localized build", () => {
  assert.ok(
    existsSync(new URL("../../src/app/fonts/gypsy-curse-original.woff2", import.meta.url)),
    "original font source missing (regeneration input)",
  );
  assert.ok(
    existsSync(new URL("../../scripts/build-vietnamese-gypsy-font.py", import.meta.url)),
    "font build script missing",
  );
  has(read("app/fonts/gypsy-curse-license.txt"), ["Vietnamese-localized build"]);
  assert.ok(
    !globals.includes('[lang="vi"] .font-gypsy'),
    "VI locale must stay on the localized display face, not Oswald",
  );
});

check("body sans and display face are separated; the global 2x scale is gone", () => {
  has(globals, [
    "--font-heading: var(--font-sans)",
    "--font-display: var(--font-gypsy)",
    "--body-text: #d9d9d9",
    "--heading-color: #ffffff",
    "--display-title-size: 3rem",
    "--display-title-size: 3.75rem",
    "--display-title-size: 4.5rem",
    ":where(h1)",
    "font-synthesis: none",
    "-webkit-text-fill-color: currentColor",
    "-webkit-text-stroke: 0",
    "-webkit-background-clip: border-box",
    "background-clip: border-box",
    "mix-blend-mode: normal",
  ]);
  assert.ok(!globals.includes("--heading-display"), "red heading token must be removed");
  assert.ok(
    !globals.includes(":where(h1, .font-display)"),
    "font utility must not imply a heading color",
  );
  assert.ok(!globals.includes("--heading-scale"), "global 2x heading scale must be removed");
  assert.ok(!globals.includes(".heading-scale-1"), "heading-scale escape hatch must be removed");
  assert.ok(
    !globals.includes(":where(h1, h2, h3, h4, h5, h6, .font-heading)"),
    "old global all-heading Gypsy selector remains",
  );
});

check("primary section titles share the Gypsy display scale", () => {
  // Featured gallery: the size/face/color reference for every primary title.
  has(featured, ["display-title", "uppercase"]);
  assert.ok(!featured.includes("font-condensed"), "featured section title must not use Oswald");
  // Homepage section titles use the same shared scale.
  has(about, ["display-title", "text-balance"]);
  has(stories, ["display-title", "text-balance"]);
  has(editorial, ["font-display", "text-2xl", "lg:text-3xl", "text-body", "text-heading"]);
  assert.ok(
    !/font-display[^"\n]*text-\[#D9D9D9\]/.test(editorial),
    "editorial heading still hardcodes off-white",
  );
  assert.ok(!about.includes("heading-scale-1") && !stories.includes("heading-scale-1"));
});

check("category, deals, how-to-book and blog titles opt into the shared scale", () => {
  for (const source of [domestic, international, deals, blog, support]) {
    assert.ok(source.includes("display-title"), "primary title missing display-title");
  }
  has(feed, [
    "ARTICLE_TITLE_CLASS",
    "data-testid=\"feed-article-title\"",
    "text-center",
    "text-3xl",
    "md:text-4xl",
    "text-heading",
    "hover:text-link",
  ]);
  assert.ok(
    !feed.includes("text-5xl") && !feed.includes("text-6xl"),
    "article titles must stay below the 48px primary-section scale",
  );
  has(destinationDetail, [
    "display-title",
    "min-w-0",
  ]);
  assert.ok(
    !destinationDetail.includes("md:text-7xl"),
    "tour detail title must take its size from the shared display-title token",
  );
});

check("homepage blog cards use a larger white Gypsy title with red hover", () => {
  has(news, [
    "font-display",
    "text-2xl",
    "sm:text-3xl",
    "text-heading",
    "group-hover:text-link",
  ]);
});

check("section eyebrows use the clean body sans (small label, not a heading)", () => {
  has(featured, ["featuredEyebrow", "font-sans"]);
  has(search, ["searchEyebrow", "font-sans"]);
});

check("display font build keeps the solid-r rasteriser fix", () => {
  const build = readFileSync(
    new URL("../../scripts/build-vietnamese-gypsy-font.py", import.meta.url),
    "utf8",
  );
  has(build, ["skia-pathops", "thicken_hollow_r", "pathops.PathOp.UNION"]);
});

/* --- spacing: search → featured gap halved --- */

check("search → featured vertical gap is halved at every breakpoint", () => {
  has(search, ["pb-8", "md:pb-12"]);
  assert.ok(!search.includes("pb-16") && !search.includes("md:pb-24"), "old search bottom padding remains");
  has(featured, ["pt-10", "md:pt-14"]);
  assert.ok(!featured.includes("py-20") && !featured.includes("py-28"), "old featured vertical padding remains");
});

/* --- universal tour card (homepage design = SSOT) --- */

check("tour card is open (no box) and keeps the shared card contract", () => {
  has(card, [
    'data-slot="card"',
    "bg-transparent",
    "border-none",
    "shadow-none",
    'className="absolute inset-0 z-10 cursor-pointer"',
  ]);
  assert.ok(!card.includes("spotlight"), "unified card must not branch on a variant");
  assert.ok(!card.includes('variant = "default"'), "the boxed default variant must be gone");
});

check("tour card thumbnail is wide with strict 90-degree corners", () => {
  has(card, ["aspect-[21/9]", "rounded-none", "object-cover"]);
  assert.ok(
    !card.includes("rounded-[2rem]") && !card.includes("sm:rounded-[3rem]"),
    "tour card thumbnails must not keep pill/heavy radius",
  );
});

check("tour card content sits beneath the image, left aligned + Gypsy tour titles", () => {
  has(card, [
    "line-clamp-2",
    "uppercase",
    "font-display",
    "font-normal",
    "text-3xl",
    "sm:text-[2rem]",
    "text-heading",
    "inline-flex",
    "rounded-none",
    "bg-primary",
  ]);
  assert.ok(
    card.includes("rounded-none bg-primary"),
    "card CTA must stay strictly sharp",
  );
  assert.ok(
    !card.includes("rounded-md bg-primary"),
    "card CTA must not soften its corners",
  );
  assert.ok(
    !card.includes("font-condensed text-3xl"),
    "tour card titles should use Gypsy, not the condensed accent",
  );
  assert.ok(!card.includes("sm:text-[4rem]"), "tour card title still uses the 2x display size");
});

check("tour card special tag is scaled down to the meta-row size", () => {
  assert.ok(
    card.includes("<TourAttributeBadges isSpecialTour={destination.isSpecialTour} compact />"),
    "card must request the compact special-tour chip",
  );
  const badges = read("components/explore/tour-attribute-badges.tsx");
  has(badges, ["px-2 py-1 text-xs", "compact"]);
});

check("tour card grid rhythm is exported and reused by every surface", () => {
  has(card, ["TOUR_CARD_GRID", "gap-14 md:grid-cols-2 md:gap-x-8 md:gap-y-16 lg:grid-cols-3"]);
  for (const consumer of [
    "components/homepage/featured-destinations.tsx",
    "components/tours/tour-category-section.tsx",
    "components/tours/tour-search-results.tsx",
    "app/[locale]/explore/destinations/page.tsx",
  ]) {
    const source = read(consumer);
    assert.ok(source.includes("TOUR_CARD_GRID"), `${consumer} must use the shared grid`);
    assert.ok(source.includes("<TourCard"), `${consumer} must render the universal TourCard`);
    assert.ok(!source.includes("DestinationCard"), `${consumer} still references the old card`);
    assert.ok(!source.includes('variant="spotlight"'), `${consumer} still passes the old variant`);
  }
});

check("card data props are unchanged (no schema/query drift)", () => {
  has(card, [
    "destination: Destination",
    "actionLabel: string",
    "priceRange?: PriceRangeLabel",
    "aggregate?:",
  ]);
  for (const field of [
    "_id",
    "name",
    "slug",
    "region",
    "category",
    "country",
    "isSpecialTour",
    "description",
    "descriptionEn",
    "posterImage",
  ]) {
    assert.ok(FEATURED_DESTINATIONS_QUERY.includes(field), `query lost ${field}`);
  }
  assert.ok(FEATURED_DESTINATIONS_QUERY.includes("asset->{ _id, url,"));
  assert.ok(!FEATURED_DESTINATIONS_QUERY.includes("pillImage"));
});

/* --- search --- */

check("search stays minimalist (transparent, no CTA button) with a red eyebrow", () => {
  has(search, ['data-testid="home-search"', "searchEyebrow", "bg-transparent", "rounded-none"]);
  assert.ok(!search.includes("<button"), "search form must not gain a button");
});

/* --- i18n --- */

check("homepage copy exists in both locales and the old wordmark key is gone", () => {
  for (const key of ["searchEyebrow", "featuredEyebrow", "heroTitle", "heroVideoAria"]) {
    assert.ok(en.home[key]?.length > 0, `en.home.${key} missing`);
    assert.ok(vi.home[key]?.length > 0, `vi.home.${key} missing`);
  }
  assert.ok(!("heroDisplay" in en.home) && !("heroDisplay" in vi.home), "heroDisplay should be removed");
  assert.ok(!("heroFilmLabel" in en.home) && !("heroFilmLabel" in vi.home));
});

check("en/vi homepage key sets stay in sync", () => {
  assert.deepEqual(
    Object.keys(en.home).sort(),
    Object.keys(vi.home).sort(),
    "home locale key sets diverged"
  );
});

check("ambient video layer stays opt-in via env", () => {
  assert.ok(page.includes("NEXT_PUBLIC_HERO_AMBIENT_VIDEO"));
  assert.ok(hero.includes("ambientSrc"));
});

console.log(`\n${passed}/${passed + failed} assertions passed`);
process.exit(failed === 0 ? 0 : 1);

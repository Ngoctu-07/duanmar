import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const { DESTINATION_BY_SLUG_QUERY } = await import("../../src/sanity/queries/destinations.ts");
const { parse } = await import("groq-js");
const { ItineraryAccordion } = await import("../../src/components/explore/itinerary-accordion.tsx");

// The .tsx graph is compiled to CJS by tsx — load React the same way so the
// instances match (same trick as h6-render-capacity).
const req = createRequire(new URL("../../package.json", import.meta.url));
const React = req("react") as typeof import("react");
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");

const read = (rel: string) =>
  readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

const schema = read("src/sanity/schemaTypes/destination.ts");
const page = read("src/app/[locale]/explore/destinations/[slug]/page.tsx");
const accordionSource = read("src/components/explore/itinerary-accordion.tsx");
const rowSource = read("src/components/explore/itinerary-day-row.tsx");

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

const sampleDays = [
  {
    dayTitle: "Ngày 1: Tp. Hồ Chí Minh → Vũng Tàu",
    meals: "Ăn sáng, trưa, tối",
    details: [
      { _type: "block", style: "normal", children: [{ _type: "span", text: "Tham quan Bãi Sau" }] },
    ],
  },
  {
    dayTitle: "Ngày 2: Trở về Sài Gòn",
    meals: null,
    details: [
      { _type: "block", style: "normal", children: [{ _type: "span", text: "Chợ Bến Thành" }] },
    ],
  },
  { dayTitle: "Ngày 3: Tự do khám phá", meals: "Ăn trưa", details: null },
];

const render = (days: unknown[]) =>
  renderToStaticMarkup(
    React.createElement(ItineraryAccordion as never, {
      title: "Lịch trình",
      days,
    })
  );

// --- Studio schema -------------------------------------------------------------

check("schema: destination document exposes an itinerary array", () => {
  assert.ok(schema.includes('name: "itinerary"'), "itinerary field missing");
  assert.ok(schema.includes('name: "dayTitle"'), "dayTitle field missing");
  assert.ok(schema.includes('name: "meals"'), "meals field missing");
  assert.ok(schema.includes('name: "details"'), "details field missing");
});

check("schema: dayTitle required string, details is a Portable Text block array", () => {
  const dayBlock = schema.slice(schema.indexOf('name: "dayTitle"'));
  assert.ok(
    /name: "dayTitle"[\s\S]{0,200}rule\.required\(\)/.test(dayBlock),
    "dayTitle must be required"
  );
  assert.ok(dayBlock.includes('type: "string"'), "dayTitle must be an unlocalized string");
  const detailsField = schema.slice(schema.indexOf('name: "details"'));
  assert.ok(detailsField.includes('type: "block"'), "details must be a Portable Text block array");
  assert.ok(
    detailsField.includes('styles: [{ title: "Normal", value: "normal" }]'),
    "headings must stay disabled in day details (page outline safety)"
  );
  assert.ok(detailsField.includes('value: "bullet"'), "bullet lists must stay available");
});

check("schema: studio row preview titles days by plain dayTitle", () => {
  assert.ok(
    schema.includes('select: { title: "dayTitle", subtitle: "meals" }'),
    "day preview missing"
  );
});

check("schema: tour name/description/highlights/inclusions/exclusions are unlocalized", () => {
  for (const field of ["highlights", "inclusions", "exclusions"]) {
    assert.ok(schema.includes(`name: "${field}"`), `${field} field missing`);
  }
  const nameBlock = schema.slice(schema.indexOf('name: "name"'));
  assert.ok(nameBlock.includes('type: "string"'), "name must be an unlocalized string");
  assert.ok(!schema.includes('source: "name.vi"'), "slug source must not follow name.vi");
  assert.ok(schema.includes('source: "name"'), "slug source must follow name");
});

// --- GROQ projection ------------------------------------------------------------

check("schema: explicit descriptionEn + itineraryEn fields, no redundant _vi fields", () => {
  for (const field of ["descriptionEn", "itineraryEn"]) {
    assert.ok(schema.includes(`name: "${field}"`), `${field} field missing`);
  }
  for (const field of ["descriptionVi", "itineraryVi"]) {
    assert.ok(!schema.includes(`name: "${field}"`), `${field} must be pruned`);
  }
  assert.ok(!schema.includes('name: "vi"'), "expansion must use separate fields, not {vi,en} objects");
});

check("query: by-slug projection fetches English fields without _vi fields", () => {
  for (const field of ["descriptionEn", "itineraryEn"]) {
    assert.ok(DESTINATION_BY_SLUG_QUERY.includes(field), `query missing ${field}`);
  }
  for (const field of ["descriptionVi", "itineraryVi"]) {
    assert.ok(!DESTINATION_BY_SLUG_QUERY.includes(field), `query must not fetch ${field}`);
  }
});

check("page: vi renders base fields, en prefers *En with base fallback (never blank)", () => {
  assert.ok(page.includes("destination.descriptionEn"), "page must read descriptionEn");
  assert.ok(page.includes("destination.itineraryEn"), "page must read itineraryEn");
  assert.ok(!page.includes("descriptionVi"), "page must not read pruned descriptionVi");
  assert.ok(!page.includes("itineraryVi"), "page must not read pruned itineraryVi");
  assert.ok(page.includes("destination.itinerary ?? []"), "base itinerary must stay the fallback");
});

check("query: DESTINATION_BY_SLUG_QUERY parses with groq-js", () => {
  assert.equal(typeof DESTINATION_BY_SLUG_QUERY, "string");
  parse(DESTINATION_BY_SLUG_QUERY);
});

check("query: by-slug projection fetches itinerary day fields", () => {
  assert.ok(DESTINATION_BY_SLUG_QUERY.includes("itinerary[]"), "itinerary[] missing");
  const projection = DESTINATION_BY_SLUG_QUERY.slice(
    DESTINATION_BY_SLUG_QUERY.indexOf("itinerary[]")
  );
  for (const field of ["dayTitle", "meals", "details"]) {
    assert.ok(
      projection.includes(field),
      `itinerary projection missing ${field}`
    );
  }
});

// --- Page layout ----------------------------------------------------------------

check("page: strict 2-column grid at lg with single-column fallback", () => {
  assert.ok(
    page.includes('"mt-8 grid grid-cols-1 items-start gap-8"'),
    "base grid classes missing"
  );
  assert.ok(page.includes('"lg:grid-cols-2 lg:gap-8"'), "lg two-column classes missing");
  assert.ok(page.includes('"max-w-3xl"'), "single-column fallback missing");
  assert.ok(page.includes("posterImage ?"), "grid must branch on the featured image");
});

check("page: centered container with equal outer margins", () => {
  assert.ok(
    page.includes("mx-auto w-full max-w-6xl px-4 py-8"),
    "page must wrap content in a centered max-w-6xl container"
  );
  assert.ok(!page.includes("container mx-auto px-4 py-8"), "full-bleed container must be gone");
});

check("page order: title header → description → itinerary → price", () => {
  const title = page.indexOf("<h1");
  const description = page.indexOf("tourDescription &&");
  const itinerary = page.indexOf("<ItineraryAccordion");
  const price = page.indexOf("<PriceBlock");
  assert.ok(title > -1 && description > title, `title=${title} description=${description}`);
  assert.ok(itinerary > description, `description=${description} itinerary=${itinerary}`);
  assert.ok(price > itinerary, `itinerary=${itinerary} price=${price}`);
});

check("page: title + tags share one header row above the poster grid", () => {
  const header = page.indexOf("<header");
  const h1 = page.indexOf("<h1");
  const tags = page.indexOf('data-testid="tour-meta-tags"');
  const grid = page.indexOf("className={cn(");
  const article = page.indexOf("<article");
  assert.ok(header > -1 && h1 > header, "h1 must live inside the page header");
  assert.ok(tags > h1, "metadata tags must follow the title in the same row");
  assert.ok(grid > tags, "poster grid must start below the header row");
  assert.ok(article > grid, "description column must start inside the grid");
  assert.ok(
    page.includes('<header className="mt-8 flex flex-wrap items-center gap-x-10 gap-y-5">'),
    "header must be a flex row that keeps tags beside the title"
  );
  assert.ok(
    page.includes('className="flex flex-wrap items-center gap-5"'),
    "meta tag row must keep a roomy internal gap between chips"
  );
});

check("page: tour title uses the shared display-title scale", () => {
  assert.ok(
    page.includes('<h1 className="display-title min-w-0">'),
    "tour title must opt into .display-title like every other page header"
  );
  assert.ok(!page.includes("text-5xl"), "old mobile title size must be gone");
  assert.ok(!page.includes("md:text-7xl"), "title size must come from --display-title-size");
});

check("page: description owns the column top so the poster aligns to it", () => {
  assert.ok(
    page.includes('data-testid="tour-description"'),
    "description needs a stable hook for baseline alignment"
  );
  const article = page.indexOf("<article");
  const description = page.indexOf('data-testid="tour-description"');
  assert.ok(description > article, "description must be the first block in the text column");
  assert.ok(
    page.indexOf("<ItineraryAccordion") > description,
    "itinerary must follow the description"
  );
});

check("page: single poster from the CMS, no gallery/carousel code", () => {
  assert.ok(page.includes("pickMainPoster"), "page must read the main poster helper");
  assert.ok(!page.includes("galleryImages"), "gallery references must be gone");
  assert.ok(!page.includes("pickGalleryImages"), "gallery helper must be gone");
  assert.ok(!page.includes("carousel"), "carousel references must be gone");
});

check("cta: book ticket is a red tag with the same type size as the chips", () => {
  const cta = read("src/components/booking/book-ticket-button.tsx");
  assert.ok(cta.includes("bg-primary"), "CTA must use the solid brand red fill");
  assert.ok(cta.includes("text-primary-foreground"), "CTA text must be white");
  assert.ok(cta.includes("text-sm"), "CTA type size must match the outlined chips");
  assert.ok(cta.includes("rounded-none"), "CTA must stay strictly sharp like the chips");
  assert.ok(!cta.includes("<Button"), "CTA must not render the shadcn button box");
  assert.ok(!cta.includes("<Ticket"), "CTA must stay icon-free for the minimalist tag");
  assert.ok(!cta.includes("lucide-react"), "CTA must not pull an icon dependency");
});

check("page: itinerary + price live in the text column, poster owns the right column", () => {
  assert.ok(page.includes("<PriceBlock"), "text column must keep PriceBlock");
  assert.ok(page.includes("<ItineraryAccordion"), "itinerary module not mounted");
  assert.ok(page.includes('t("itinerary.title")'), "itinerary heading not translated");
  assert.ok(page.includes("<TourPoster"), "poster column not mounted");
  assert.ok(page.includes("<TourRatingBadge"), "title row must keep rating");
  // The poster is the only thing rendered after the text column closes.
  const poster = page.indexOf("<TourPoster");
  assert.ok(poster > page.indexOf("</article>"), "poster must sit outside the text column");
  assert.ok(
    page.indexOf("<ItineraryAccordion") < page.indexOf("</article>"),
    "itinerary must not stay in the right column"
  );
});

check("layout: poster is a 2:3 portrait, cover-cropped, capped and sticky", () => {
  const poster = read("src/components/explore/tour-poster.tsx");
  assert.ok(poster.includes("aspect-[2/3]"), "poster must use the 2:3 portrait frame");
  assert.ok(poster.includes("object-cover"), "poster image must crop to fill");
  assert.ok(poster.includes("w-full"), "poster must fill its column width");
  assert.ok(poster.includes("max-w-md"), "poster must be capped at max-w-md");
  assert.ok(poster.includes("mx-auto"), "poster must be centered in its column");
  assert.ok(poster.includes("rounded-none"), "poster must keep sharp 90° corners");
  assert.ok(!poster.includes("rounded-xl"), "poster must not round its corners");
  assert.ok(poster.includes("lg:sticky"), "poster must stick while the text column scrolls");
  assert.ok(poster.includes("order-first"), "poster must lead on mobile");
});

check("typography: Barlow Semi Condensed is the global body face, Gypsy stays display", () => {
  const layout = read("src/app/layout.tsx");
  const globals = read("src/app/globals.css");
  assert.ok(layout.includes("Barlow_Semi_Condensed"), "Barlow Semi Condensed loader missing");
  assert.ok(layout.includes('variable: "--font-sans"'), "Barlow must drive --font-sans");
  assert.ok(layout.includes('"vietnamese"'), "Barlow must ship the Vietnamese subset");
  assert.ok(
    globals.includes("--font-heading: var(--font-sans)"),
    "UI headings must follow the body face"
  );
  assert.ok(
    globals.includes("--font-display: var(--font-gypsy)"),
    "Gypsy Curse must stay the display face"
  );
});

check("typography: base scale is one notch up, About Us + tour description are pinned", () => {
  const globals = read("src/app/globals.css");
  assert.ok(globals.includes("--text-sm: 0.9375rem"), "text-sm must be 15px");
  assert.ok(globals.includes("--text-base: 1.0625rem"), "text-base must be 17px");
  assert.ok(
    globals.includes("text-body text-base"),
    "body must inherit the scaled base size"
  );
  const about = read("src/components/homepage/about-narrative.tsx");
  assert.ok(about.includes("text-[1rem]"), "About Us paragraph must stay at 16px");
  assert.ok(page.includes("text-lg"), "tour description must keep its own size");
  assert.ok(!page.includes("text-base"), "tour description must not inherit the base bump");
});

check("polish: justified description + de-boxed itinerary/price", () => {
  assert.ok(page.includes("text-justify"), "description must be fully justified");
  const classNamesOf = (source: string) =>
    [...source.matchAll(/className="([^"]*)"/g)].map((match) => match[1]).join(" ");
  const boxed = /rounded-(?!none)\w|bg-card|(^|\s)border(\s|$)/;
  const accordion = classNamesOf(read("src/components/explore/itinerary-accordion.tsx"));
  assert.ok(!boxed.test(accordion), `itinerary must not keep card borders/fills: ${accordion}`);
  const price = classNamesOf(read("src/components/pricing/price-block.tsx"));
  assert.ok(!boxed.test(price), `price block must not keep card borders/fills: ${price}`);
  const row = read("src/components/explore/itinerary-day-row.tsx");
  assert.ok(!row.includes("border-t"), "day rows must not draw separators");
  assert.ok(!row.includes("hover:bg-muted"), "day rows must not paint hover boxes");
});

check("page: reviews + extra facts move below the poster grid", () => {
  assert.ok(page.includes("<CustomerReviews"), "page must keep CustomerReviews");
  assert.ok(
    page.indexOf("<CustomerReviews") > page.indexOf("</article>"),
    "reviews must not interrupt the strict column order"
  );
  assert.ok(page.includes("<TourDetailExtras"), "highlights/inclusions module not mounted");
});

// --- Components -----------------------------------------------------------------

check("accordion stays a server component; row owns the client state", () => {
  assert.ok(!accordionSource.includes('"use client"'), "accordion must stay server-side");
  assert.ok(accordionSource.includes("PortableText"), "accordion must render CMS rich text");
  assert.ok(rowSource.includes('"use client"'), 'row must declare "use client"');
  assert.ok(
    !rowSource.includes("next-sanity") && !rowSource.includes("PortableText"),
    "client row must never pull the next-sanity/PortableText graph into the bundle"
  );
});

check("row: disclosure button + chevron rotate 90° + reduced-motion safety", () => {
  assert.ok(rowSource.includes("ChevronRight"), "chevron icon missing");
  assert.ok(rowSource.includes("rotate-90"), "open state must rotate the chevron");
  assert.ok(rowSource.includes("aria-expanded"), "aria-expanded missing");
  assert.ok(rowSource.includes("aria-controls"), "aria-controls missing");
  assert.ok(rowSource.includes("grid-rows-[0fr]") && rowSource.includes("grid-rows-[1fr]"),
    "smooth expand via grid-template-rows missing");
  assert.ok(rowSource.includes("motion-reduce:transition-none"), "reduced motion guard missing");
  assert.ok(rowSource.includes("inert="), "collapsed panel must be inert");
});

check("render: default state = collapsed rows with title, meals and chevron", () => {
  const html = render(sampleDays);
  assert.ok(html.includes("Ngày 1: Tp. Hồ Chí Minh → Vũng Tàu"), "day title missing");
  assert.ok(html.includes("Ăn sáng, trưa, tối"), "meals missing");
  assert.equal((html.match(/aria-expanded="false"/g) ?? []).length, 2,
    "both days with details must start collapsed");
  assert.ok(html.includes("chevron-right"), "chevron svg missing");
  assert.equal((html.match(/grid-rows-\[0fr\]/g) ?? []).length, 2, "both panels must start collapsed");
  assert.ok(html.includes('aria-labelledby="tour-itinerary-heading"'), "section label missing");
  assert.ok(html.includes("Lịch trình"), "heading missing");
});

check("render: collapsed panels are aria-hidden + inert (unreachable for AT/keyboards)", () => {
  const html = render(sampleDays);
  const hiddenPanels = html.match(/<div[^>]*aria-hidden="true"/g) ?? [];
  assert.equal(hiddenPanels.length, 2, `expected 2 hidden panels, got ${hiddenPanels.length}`);
  assert.equal((html.match(/inert=""/g) ?? []).length, 2, "panels must be inert while collapsed");
});

check("render: heading order inside the module is h2 → h3", () => {
  const html = render(sampleDays);
  const h2 = html.indexOf("<h2");
  const h3 = html.indexOf("<h3");
  assert.ok(h2 > -1 && h3 > h2, `expected h2 (${h2}) before h3 (${h3})`);
});

check("render: rich-text details land inside the collapsed panel", () => {
  const html = render(sampleDays);
  assert.ok(html.includes("Tham quan Bãi Sau"), "details content missing");
  assert.ok(html.includes("grid-rows-[0fr]"), "details must start collapsed");
});

check("render: day without details renders as a static row (no dead click target)", () => {
  const html = render(sampleDays);
  assert.ok(html.includes("Ngày 3: Tự do khám phá"), "static day missing");
  const buttons = html.match(/<button/g) ?? [];
  assert.equal(buttons.length, 2, `expected 2 buttons, got ${buttons.length}`);
});

check("render: no days → module renders nothing", () => {
  assert.equal(render([]), "");
});

// --- Interaction (jsdom) --------------------------------------------------------

const checkAsync = async (name: string, fn: () => Promise<void>) => {
  try {
    await fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name} :: ${(error as Error).message}`);
  }
};

await checkAsync(
  "interaction: click expands the row and rotates the chevron 90°",
  async () => {
    const { JSDOM } = req("jsdom") as typeof import("jsdom");
    const dom = new JSDOM("<!doctype html><html><body></body></html>", {
      pretendToBeVisual: true,
      url: "http://localhost/",
    });
    // react-dom/client reads these DOM globals at require + render time.
    const globals = [
      "window", "document", "navigator", "Node", "Element", "HTMLElement",
      "SVGElement", "DocumentFragment", "Event", "MouseEvent", "KeyboardEvent",
      "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame",
      "MutationObserver", "CSSStyleSheet",
    ];
    for (const key of globals) {
      if (key in dom.window) {
        Object.defineProperty(globalThis, key, {
          value: (dom.window as unknown as Record<string, unknown>)[key],
          configurable: true,
          writable: true,
        });
      }
    }

    const { createRoot } = req("react-dom/client") as typeof import("react-dom/client");
    const doc = dom.window.document;
    const container = doc.createElement("div");
    doc.body.appendChild(container);
    const root = createRoot(container);
    const act = (React as unknown as { act: (fn: () => Promise<void>) => Promise<void> }).act;
    (globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

    await act(async () => {
      root.render(
        React.createElement(ItineraryAccordion as never, {
          title: "Lịch trình",
          days: sampleDays,
        })
      );
    });

    const button = container.querySelector("button");
    assert.ok(button, "expandable row button missing");
    assert.equal(button.getAttribute("aria-expanded"), "false", "row must start collapsed");
    const buttons = container.querySelectorAll("button");
    assert.equal(buttons.length, 2, `expected 2 expandable rows, got ${buttons.length}`);
    const noMealsRow = buttons[1];
    assert.ok((noMealsRow.textContent ?? "").includes("Ngày 2"), "second day missing");
    assert.ok(
      !(noMealsRow.textContent ?? "").includes("Ăn"),
      "a day without meals must not render a meals line"
    );

    await act(async () => {
      button.click();
    });

    assert.equal(button.getAttribute("aria-expanded"), "true", "click must expand the row");
    const chevron = button.querySelector("svg");
    assert.ok(
      (chevron?.getAttribute("class") ?? "").includes("rotate-90"),
      `chevron must rotate, class=${chevron?.getAttribute("class")}`
    );
    const panel = doc.getElementById(button.getAttribute("aria-controls") ?? "");
    assert.ok(panel, "aria-controls target missing");
    assert.ok(
      panel.className.includes("grid-rows-[1fr]"),
      `panel must animate open, class=${panel.className}`
    );
    assert.equal(panel.getAttribute("aria-hidden"), "false", "open panel must be exposed to AT");
    assert.ok(!panel.hasAttribute("inert"), "open panel must not stay inert");

    await act(async () => {
      button.click();
    });
    assert.equal(button.getAttribute("aria-expanded"), "false", "second click collapses again");
    assert.ok(panel.className.includes("grid-rows-[0fr]"), "panel must collapse back");
    assert.ok(panel.hasAttribute("inert"), "collapsed panel must be inert again");

    await act(async () => {
      root.unmount();
    });
  }
);

// --- i18n -----------------------------------------------------------------------

check("i18n: en + vi ship destinations.itinerary.title", () => {
  for (const locale of ["en", "vi"]) {
    const messages = JSON.parse(read(`src/messages/${locale}.json`));
    const title = messages.destinations?.itinerary?.title;
    assert.ok(typeof title === "string" && title.length > 0, `${locale} title missing`);
  }
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);

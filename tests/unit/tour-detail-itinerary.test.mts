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

check("schema: dayTitle required, details is a Portable Text block array", () => {
  const dayBlock = schema.slice(schema.indexOf('name: "dayTitle"'));
  assert.ok(
    /name: "dayTitle"[\s\S]{0,200}rule\.required\(\)/.test(dayBlock),
    "dayTitle must be required"
  );
  const detailsField = schema.slice(schema.indexOf('name: "details"'));
  assert.ok(detailsField.includes('type: "block"'), "details must be a Portable Text block array");
  assert.ok(
    detailsField.includes('styles: [{ title: "Normal", value: "normal" }]'),
    "headings must stay disabled in day details (page outline safety)"
  );
  assert.ok(detailsField.includes('value: "bullet"'), "bullet lists must stay available");
});

check("schema: studio row preview titles days by dayTitle", () => {
  assert.ok(
    schema.includes('select: { title: "dayTitle", subtitle: "meals" }'),
    "day preview missing"
  );
});

// --- GROQ projection ------------------------------------------------------------

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

check("page: 2-column grid at lg with single-column fallback", () => {
  assert.ok(page.includes('"mt-8 grid grid-cols-1 gap-8"'), "base grid classes missing");
  assert.ok(page.includes('"lg:grid-cols-2 lg:gap-10"'), "lg two-column classes missing");
  assert.ok(page.includes('"max-w-3xl"'), "single-column fallback missing");
  assert.ok(page.includes("hasItinerary ?"), "grid must branch on itinerary data");
});

check("page: overview column keeps price + reviews, itinerary mounts beside it", () => {
  assert.ok(page.includes("<PriceBlock"), "overview must keep PriceBlock");
  assert.ok(page.includes("<CustomerReviews"), "overview must keep CustomerReviews");
  assert.ok(page.includes("<TourRatingBadge"), "overview must keep rating");
  assert.ok(page.includes("<ItineraryAccordion"), "itinerary module not mounted");
  assert.ok(page.includes('t("itinerary.title")'), "itinerary heading not translated");
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

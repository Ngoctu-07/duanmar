import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });

const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(
      new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url)
    )
  ).href
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const errors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};

/** Self-contained env reader (pattern: s-tour-hero-carousel.mjs / j-about-contact.mjs). */
function envValue(key) {
  if (process.env[key]) return process.env[key];
  const file = fileURLToPath(new URL("../../.env.local", import.meta.url));
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : undefined;
}

/**
 * Live tour facts from the CMS (no fabricated content): pick a destination that
 * actually owns a poster asset, preferring one that also has itinerary days so
 * the strict column order can be verified.
 */
async function fetchTour() {
  const projectId = envValue("NEXT_PUBLIC_SANITY_PROJECT_ID");
  const dataset = envValue("NEXT_PUBLIC_SANITY_DATASET") || "production";
  if (!projectId) return null;
  const query =
    '*[_type == "destination"]{ "slug": slug.current, "poster": coalesce(posterImage.asset, galleryImages[0].asset) != null, "days": count(itinerary[]) }';
  const url = `https://${projectId}.api.sanity.io/v2026-09-25/data/query/${dataset}?query=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const docs = (await res.json()).result ?? [];
    const withImage = docs.filter((doc) => doc.slug && doc.poster);
    return withImage.find((doc) => doc.days > 0) ?? withImage[0] ?? null;
  } catch {
    return null;
  }
}

try {
  const browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 900 } });
  const page = await getPage(browser);
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  const tour = await fetchTour();
  check("live CMS query returns a tour with a poster asset", Boolean(tour), JSON.stringify(tour));
  if (!tour) throw new Error("no tour with a poster asset to verify");

  await page.goto(
    `http://localhost:3000/vi/explore/destinations/${encodeURIComponent(tour.slug)}`,
    { waitUntil: "networkidle2", timeout: 60000 }
  );
  await dismissPromo(page);
  await sleep(400);

  // --- P1 poster mount + portrait geometry
  const desktop = await page.evaluate(() => {
    const poster = document.querySelector('[data-testid="tour-poster"]');
    const frame = poster?.firstElementChild ?? null;
    const img = frame?.querySelector("img") ?? null;
    const article = document.querySelector("article");
    const h1 = document.querySelector("main h1");
    const description = document.querySelector('[data-testid="tour-description"]');
    const tags = document.querySelector('[data-testid="tour-meta-tags"]');
    const chips = [...(tags?.querySelectorAll("span.rounded-none") ?? [])];
    const cta = tags?.querySelector("a[href*='/booking/checkout']") ?? null;
    const itinerary = article?.querySelector('section[aria-labelledby="tour-itinerary-heading"]') ?? null;
    const price = document.querySelector('section[aria-labelledby="tour-price-heading"]');
    const main = document.querySelector("main");
    const grid = poster?.parentElement ?? null;
    const plain = (node) => {
      if (!node) return null;
      const s = getComputedStyle(node);
      return {
        border: s.borderTopWidth,
        bg: s.backgroundColor,
        radius: s.borderTopLeftRadius,
      };
    };
    const boxOf = (node) => {
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return {
        top: Math.round(r.top + window.scrollY),
        left: Math.round(r.left),
        right: Math.round(r.right),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    };
    return {
      poster: boxOf(poster),
      frame: boxOf(frame),
      posterRatio: frame ? frame.getBoundingClientRect().height / frame.getBoundingClientRect().width : 0,
      posterRadius: frame ? getComputedStyle(frame).borderTopLeftRadius : null,
      root: boxOf(poster?.parentElement?.parentElement ?? null),
      img: img
        ? {
            cls: img.className,
            loaded: img.complete && img.naturalWidth > 0,
            alt: img.getAttribute("alt") ?? "",
          }
        : null,
      article: boxOf(article),
      grid: boxOf(grid),
      gap: grid ? parseFloat(getComputedStyle(grid).columnGap) || 0 : 0,
      h1: boxOf(h1),
      h1Color: h1 ? getComputedStyle(h1).color : "",
      h1Family: h1 ? getComputedStyle(h1).fontFamily : "",
      h1Fs: h1 ? parseFloat(getComputedStyle(h1).fontSize) : null,
      tags: boxOf(tags),
      cta: cta
        ? {
            bg: getComputedStyle(cta).backgroundColor,
            color: getComputedStyle(cta).color,
            fs: getComputedStyle(cta).fontSize,
            radius: getComputedStyle(cta).borderTopLeftRadius,
          }
        : null,
      chipFs: chips.map((chip) => getComputedStyle(chip).fontSize),
      description: boxOf(description),
      descAlign: description ? getComputedStyle(description).textAlign : null,
      descFont: description ? getComputedStyle(description).fontFamily : null,
      descFs: description ? getComputedStyle(description).fontSize : null,
      bodyFont: getComputedStyle(document.body).fontFamily,
      bodyFs: getComputedStyle(document.body).fontSize,
      navFs: (() => {
        const link = document.querySelector("header nav a");
        return link ? getComputedStyle(link).fontSize : null;
      })(),
      itinerary: boxOf(itinerary),
      itineraryStyle: plain(itinerary),
      price: boxOf(price),
      priceStyle: plain(price),
      main: boxOf(main),
    };
  });

  check("P1 poster column mounted", Boolean(desktop.poster), JSON.stringify(desktop.poster));
  check(
    "P1 poster is a portrait 3:4 frame (h/w = 4/3)",
    Math.abs(desktop.posterRatio - 4 / 3) < 0.02,
    `ratio=${desktop.posterRatio.toFixed(4)}`
  );
  check(
    "P1 poster image is cropped to fill (object-cover) and loaded",
    Boolean(desktop.img?.loaded) && (desktop.img?.cls ?? "").includes("object-cover"),
    JSON.stringify(desktop.img)
  );
  const columnLeft = desktop.article && desktop.article.right + desktop.gap;
  const columnCenter = columnLeft !== null && desktop.grid
    ? (columnLeft + desktop.grid.right) / 2
    : null;
  const posterCenter = desktop.poster
    ? (desktop.poster.left + desktop.poster.right) / 2
    : null;
  check(
    "P1 poster is capped at max-w-md (448px), no column bleed",
    desktop.poster && desktop.poster.w <= 449,
    `poster=${desktop.poster?.w}`
  );
  check(
    "P1 poster is centered inside the right column (mx-auto)",
    posterCenter !== null && columnCenter !== null && Math.abs(posterCenter - columnCenter) <= 8,
    `posterCenter=${posterCenter} columnCenter=${columnCenter}`
  );
  check(
    "P1 poster frame has sharp 90° corners (radius 0)",
    desktop.posterRadius === "0px",
    `radius=${desktop.posterRadius}`
  );

  // --- P2 strict two-column split: text left, poster right
  check(
    "P2 desktop: text column left of the poster (2-column split)",
    desktop.article && desktop.poster && desktop.article.right <= desktop.poster.left,
    `article.right=${desktop.article?.right} poster.left=${desktop.poster?.left}`
  );
  check(
    "P2 desktop: poster spans the full column height of a 3:4 poster",
    desktop.poster && desktop.poster.h > 500,
    `poster=${desktop.poster?.w}x${desktop.poster?.h}`
  );

  // --- P3 left column order: title → description → itinerary → price
  check(
    "P3 title sits above the description",
    desktop.h1 && desktop.description && desktop.h1.top < desktop.description.top,
    `${desktop.h1?.top} < ${desktop.description?.top}`
  );
  if (tour.days > 0) {
    check(
      "P3 itinerary sits below the description (moved into the text column)",
      desktop.description && desktop.itinerary && desktop.description.top < desktop.itinerary.top,
      `${desktop.description?.top} < ${desktop.itinerary?.top}`
    );
  } else {
    check("P3 itinerary skipped (tour has no CMS days)", true, "days=0");
  }
  if (desktop.price) {
    check(
      "P3 price block is the bottom block of the text column",
      desktop.itinerary
        ? desktop.itinerary.top < desktop.price.top
        : (desktop.description?.top ?? 0) < desktop.price.top,
      `itinerary=${desktop.itinerary?.top} price=${desktop.price.top}`
    );
    check(
      "P3 price block belongs to the left column (not under the poster)",
      desktop.price && desktop.poster && desktop.price.right <= desktop.poster.left,
      `price.right=${desktop.price.right} poster.left=${desktop.poster.left}`
    );
  } else {
    check("P3 price block present (skipped: no pricing tiers for this tour)", true, "no tiers");
  }

  // --- P4 title styling survives the redesign: Gypsy display face + white ink
  check(
    "P4 h1 keeps the white display title treatment",
    desktop.h1Color === "rgb(255, 255, 255)" && /gypsy/i.test(desktop.h1Family),
    `color=${desktop.h1Color} family=${desktop.h1Family}`
  );
  check(
    "P4 title grew exactly one display step (72px at 1280)",
    desktop.h1Fs === 72,
    `h1=${desktop.h1Fs}px`
  );
  check(
    "P4 metadata tags sit to the right of the title on the same row",
    desktop.tags && desktop.h1 && desktop.tags.left >= desktop.h1.right,
    `h1.right=${desktop.h1?.right} tags.left=${desktop.tags?.left}`
  );
  check(
    "P4 book-ticket tag is solid brand red with white text",
    desktop.cta &&
      desktop.cta.bg === "rgb(127, 29, 29)" &&
      desktop.cta.color === "rgb(255, 255, 255)",
    JSON.stringify(desktop.cta)
  );
  check(
    "P4 book-ticket tag keeps the chip type size (15px)",
    desktop.cta?.fs === "15px" && desktop.chipFs.every((fs) => fs === "15px"),
    `cta=${desktop.cta?.fs} chips=${desktop.chipFs.join(",")}`
  );

  // --- P4b poster baseline: top edge matches the description, not the title
  check(
    "P4 poster top aligns with the description top (same axis)",
    desktop.poster &&
      desktop.description &&
      Math.abs(desktop.poster.top - desktop.description.top) <= 1,
    `poster=${desktop.poster?.top} description=${desktop.description?.top}`
  );

  // --- P6 typography + de-boxed text column
  check(
    "P6 body/description use Barlow Semi Condensed",
    /Barlow Semi Condensed/i.test(desktop.bodyFont) &&
      /Barlow Semi Condensed/i.test(desktop.descFont ?? desktop.bodyFont),
    desktop.bodyFont
  );
  check(
    "P6 description is fully justified",
    desktop.descAlign === "justify",
    `text-align=${desktop.descAlign}`
  );
  if (tour.days > 0) {
    check(
      "P6 itinerary block has no border / fill / radius",
      desktop.itineraryStyle &&
        desktop.itineraryStyle.border === "0px" &&
        desktop.itineraryStyle.bg === "rgba(0, 0, 0, 0)" &&
        desktop.itineraryStyle.radius === "0px",
      JSON.stringify(desktop.itineraryStyle)
    );
  } else {
    check("P6 itinerary de-box skipped (tour has no CMS days)", true, "days=0");
  }
  if (desktop.price) {
    check(
      "P6 price block has no border / fill / radius",
      desktop.priceStyle &&
        desktop.priceStyle.border === "0px" &&
        desktop.priceStyle.bg === "rgba(0, 0, 0, 0)" &&
        desktop.priceStyle.radius === "0px",
      JSON.stringify(desktop.priceStyle)
    );
  } else {
    check("P6 price de-box skipped (no pricing tiers)", true, "no tiers");
  }

  // --- P7 centered container, tight column gap, scaled base type
  const rootMargin =
    desktop.root ? Math.round((1280 - desktop.root.w) / 2) : null;
  check(
    "P7 layout container is capped at max-w-6xl (1152px)",
    desktop.root && desktop.root.w <= 1152 && desktop.root.w >= 1100,
    `root=${desktop.root?.w}`
  );
  check(
    "P7 layout container is horizontally centered (equal outer margins)",
    desktop.root !== null && desktop.root.left === rootMargin,
    `left=${desktop.root?.left} expected=${rootMargin}`
  );
  check("P7 column gap reduced to 32px (gap-8)", desktop.gap === 32, `gap=${desktop.gap}`);
  check(
    "P7 body base type is one notch up (17px) and nav follows (15px)",
    desktop.bodyFs === "17px" && desktop.navFs === "15px",
    `body=${desktop.bodyFs} nav=${desktop.navFs}`
  );
  check(
    "P7 tour description keeps its original 18px size",
    desktop.descFs === "18px",
    `desc=${desktop.descFs}`
  );

  await page.screenshot({ path: `${OUT}/s-tour-poster-01-desktop.png` });

  // --- P5 mobile: poster leads the page (order-first) and fits the viewport
  await page.setViewport({ width: 375, height: 812 });
  await sleep(500);
  const mobile = await page.evaluate(() => {
    const poster = document.querySelector('[data-testid="tour-poster"]');
    const h1 = document.querySelector("main h1");
    const description = document.querySelector('[data-testid="tour-description"]');
    const main = document.querySelector("main");
    return { poster: poster ? (() => { const r = poster.getBoundingClientRect(); return { top: Math.round(r.top + window.scrollY), w: Math.round(r.width), left: Math.round(r.left) }; })() : null, h1Top: h1 ? Math.round(h1.getBoundingClientRect().top + window.scrollY) : null, descriptionTop: description ? Math.round(description.getBoundingClientRect().top + window.scrollY) : null, mainW: main ? Math.round(main.getBoundingClientRect().width) : null };
  });
  check(
    "P5 mobile: title → poster → description reading order",
    mobile.poster &&
      mobile.h1Top !== null &&
      mobile.descriptionTop !== null &&
      mobile.h1Top < mobile.poster.top &&
      mobile.poster.top < mobile.descriptionTop,
    `h1=${mobile.h1Top} poster=${mobile.poster?.top} description=${mobile.descriptionTop}`
  );
  check(
    "P5 mobile: poster fits the viewport width",
    mobile.poster && mobile.poster.w <= 375 && mobile.poster.left >= 0,
    JSON.stringify({ w: mobile.poster?.w, left: mobile.poster?.left })
  );
  await page.screenshot({ path: `${OUT}/s-tour-poster-02-mobile.png` });

  console.log(results.join("\n"));
  console.log(errors.length ? `\n${errors.length} problem(s): ${errors.join("; ")}` : "\nall checks passed");
  await closeBrowser(browser);
  process.exit(errors.length ? 1 : 0);
} catch (error) {
  console.log(results.join("\n"));
  console.error(`fatal: ${error.message}`);
  process.exit(1);
}

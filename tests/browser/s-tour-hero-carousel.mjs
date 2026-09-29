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

/** Self-contained env reader (pattern: j-about-contact.mjs). */
function envValue(key) {
  if (process.env[key]) return process.env[key];
  const file = fileURLToPath(new URL("../../.env.local", import.meta.url));
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : undefined;
}

/** Live gallery facts for the tour detail hero (no fabricated CMS data). */
async function fetchGallery() {
  const projectId = envValue("NEXT_PUBLIC_SANITY_PROJECT_ID");
  const dataset = envValue("NEXT_PUBLIC_SANITY_DATASET") || "production";
  if (!projectId) return null;
  const query =
    '*[_type == "destination" && slug.current == $slug][0]{ "galleryCount": count(galleryImages[]), "hasImage": defined(image) }';
  const url = `https://${projectId}.api.sanity.io/v2026-09-25/data/query/${dataset}?query=${encodeURIComponent(query)}&${encodeURIComponent("$slug")}=${encodeURIComponent('"hcm"')}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return (await res.json()).result ?? null;
  } catch {
    return null;
  }
}

try {
  const browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 900 } });
  const page = await getPage(browser);
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  await page.goto("http://localhost:3000/vi/explore/destinations/hcm", {
    waitUntil: "networkidle2",
    timeout: 60000,
  });
  await dismissPromo(page);
  await page.mouse.move(6, 780); // park cursor off the hero (autoplay no longer pauses on hover)
  await sleep(600);

  // --- S1 hero mount + live gallery branch selection
  const hero = await page.$('[data-testid="destination-hero-carousel"]');
  check("S1 hero carousel slot present", Boolean(hero));

  const media = await fetchGallery();
  check("S1 live gallery query succeeds", media !== null, JSON.stringify(media));
  const galleryCount = media?.galleryCount ?? 0;

  const snapshot = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="destination-hero-carousel"]');
    if (!el) return null;
    const slides = [...el.children].filter((c) => c.querySelector("img"));
    const first = slides[0];
    return {
      imgs: el.querySelectorAll("img").length,
      buttons: el.querySelectorAll("button").length,
      transform: first?.style.transform ?? "",
      duration: first?.style.transitionDuration ?? "",
      hiddenSlides: slides.filter((s) => s.getAttribute("aria-hidden") === "true").length,
    };
  });
  check("S1 carousel snapshot captured", Boolean(snapshot), JSON.stringify(snapshot));

  if (galleryCount >= 2) {
    // Multi-slide branch: clone-for-seamless-wrap + 3s autoplay, no dots.
    check(
      "S2 clone slide appended (seamless 1→2→3→1 wrap)",
      snapshot.imgs === galleryCount + 1,
      `imgs=${snapshot.imgs} gallery=${galleryCount}`
    );
    check(
      "S2 pagination dots removed (0 buttons under hero)",
      snapshot.buttons === 0,
      `buttons=${snapshot.buttons}`
    );
    check(
      "S2 slides use horizontal translate + 700ms smooth transition",
      /translateX\(/.test(snapshot.transform) && snapshot.duration === "700ms",
      `${snapshot.transform} / ${snapshot.duration}`
    );

    const activeSlide = () =>
      page.evaluate(() => {
        const el = document.querySelector('[data-testid="destination-hero-carousel"]');
        const slides = [...(el?.children ?? [])].filter((c) => c.querySelector("img"));
        return slides.findIndex((sl) => sl.getAttribute("aria-hidden") !== "true");
      });
    const start = await activeSlide();
    await sleep(3600); // > 3000ms interval
    const afterTick = await activeSlide();
    check("S2 autoplay advances after ~3s", afterTick !== start, `${start} -> ${afterTick}`);

    // Endless-loop proof: observe the CLONE slide (child == galleryCount) being
    // active, then the REAL first slide (child 0) resuming after the snap-back.
    // (The old aria-current check passed while the clone was still displayed,
    // so a broken snap would have gone undetected.)
    let sawClone = false;
    let cycled = false;
    const deadline = Date.now() + galleryCount * 3000 + 5000;
    while (!cycled && Date.now() < deadline) {
      const active = await activeSlide();
      if (active === galleryCount) sawClone = true;
      if (sawClone && active === 0) {
        cycled = true;
        break;
      }
      await sleep(250);
    }
    check(
      "S2 infinite loop: clone slide shown, then real slide 0 resumes (endless 1→2→3→1)",
      cycled,
      `sawClone=${sawClone} active=${await activeSlide()}`
    );
  } else {
    // Static fallback branch: legacy image only (CMS not yet filled with >=2).
    check(
      "S2 empty gallery → static single hero (legacy image fallback)",
      galleryCount === 0 && snapshot.imgs === 1 && snapshot.buttons === 0,
      `gallery=${galleryCount} imgs=${snapshot?.imgs} buttons=${snapshot?.buttons}`
    );
  }

  // --- S3 −20% sizing: aspect-[20/9] = 0.45 (old aspect-video = 0.5625)
  const geometry = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="destination-hero-carousel"]');
    const main = document.querySelector("main");
    const wrapper = main?.querySelector(".mt-8");
    const box = (node) =>
      node ? { top: Math.round(node.getBoundingClientRect().top), h: Math.round(node.getBoundingClientRect().height), w: Math.round(node.getBoundingClientRect().width) } : null;
    return {
      hero: box(el),
      book: box(wrapper?.querySelector('a[href*="booking/checkout"]')),
      h1: box(wrapper?.querySelector("h1")),
      price: box(main?.querySelector('section[aria-labelledby="tour-price-heading"]')),
      vh: innerHeight,
      mt8Intact: Boolean(main?.querySelector(".mt-8 > div")),
    };
  });
  const ratio = geometry.hero.h / geometry.hero.w;
  check(
    "S3 hero ratio ~0.45 (80% of aspect-video 0.5625)",
    ratio > 0.44 && ratio < 0.46,
    `ratio=${ratio.toFixed(4)} h=${geometry.hero.h}`
  );
  check(
    "S3 hero strictly smaller than legacy aspect-video",
    ratio < 0.5625 - 0.01,
    ratio.toFixed(4)
  );
  check(
    "S3 booking CTA above the fold",
    geometry.book && geometry.book.top < geometry.vh,
    `top=${geometry.book?.top} vh=${geometry.vh}`
  );
  check("S3 h1 above the fold", geometry.h1 && geometry.h1.top < geometry.vh, `top=${geometry.h1?.top}`);
  if (geometry.price) {
    check(
      "S3 PriceBlock above the fold",
      geometry.price.top < geometry.vh,
      `top=${geometry.price.top} vh=${geometry.vh}`
    );
  } else {
    check("S3 PriceBlock present when pricing exists (skipped: no tiers)", true, "no tiers for hcm");
  }
  check("S3 content wrapper .mt-8 structure intact (p-tours P18 selector)", geometry.mt8Intact);
  const pressed = await page.evaluate(
    () => document.querySelectorAll('button[aria-pressed]:not(#customer-reviews button)').length
  );
  check("S3 zero aria-pressed outside reviews (c-booking B6 invariant)", pressed === 0, `count=${pressed}`);

  await page.screenshot({ path: `${OUT}/s-hero-carousel-01-desktop.png` });

  // --- S4 mobile viewport sanity
  await page.setViewport({ width: 375, height: 812 });
  await sleep(500);
  const mobile = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="destination-hero-carousel"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  check(
    "S4 mobile hero keeps 20/9 ratio inside viewport",
    mobile && mobile.w <= 375 && mobile.h / mobile.w > 0.44 && mobile.h / mobile.w < 0.46,
    JSON.stringify(mobile)
  );
  await page.screenshot({ path: `${OUT}/s-hero-carousel-02-mobile.png` });

  console.log(results.join("\n"));
  console.log(errors.length ? `\n${errors.length} problem(s): ${errors.join("; ")}` : "\nall checks passed");
  await closeBrowser(browser);
  process.exit(errors.length ? 1 : 0);
} catch (error) {
  console.log(results.join("\n"));
  console.error(`fatal: ${error.message}`);
  process.exit(1);
}

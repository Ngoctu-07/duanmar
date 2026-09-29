import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });
const msg = {
  vi: JSON.parse(readFileSync(new URL("../../src/messages/vi.json", import.meta.url), "utf8")),
  en: JSON.parse(readFileSync(new URL("../../src/messages/en.json", import.meta.url), "utf8")),
};
const BASE = "http://localhost:3000";

const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url))
  ).href
);

/** Self-contained env reader (copied from tests/helpers/cms-expectations.mjs). */
function envValue(key) {
  if (process.env[key]) return process.env[key];
  const file = fileURLToPath(new URL("../../.env.local", import.meta.url));
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : undefined;
}

/** Live published destinations with category/attribute fields (no fabricated data). */
async function fetchDestinationCats() {
  const projectId = envValue("NEXT_PUBLIC_SANITY_PROJECT_ID");
  const dataset = envValue("NEXT_PUBLIC_SANITY_DATASET") || "production";
  if (!projectId) throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID missing");
  const query =
    '*[_type == "destination"]{ "slug": slug.current, name, category, isSpecialTour, isFeatured }';
  const url =
    `https://${projectId}.api.sanity.io/v2026-09-25/data/query/${dataset}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`CMS query failed: ${res.status}`);
  const json = await res.json();
  return json.result ?? [];
}

const isInternational = (doc) => doc.category === "international";
const isDomestic = (doc) => doc.category === "domestic";
const isFeatured = (doc) => doc.isFeatured === true;

const results = [];
const errors = [];
const pageErrors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};

/** Rendered card slugs + badge-bearing card slugs on the current page. */
const readCards = (page) =>
  page.evaluate(() => {
    const links = [...document.querySelectorAll('main a[href]')]
      .map((a) => a.getAttribute("href"))
      .filter((h) => /^\/vi\/explore\/destinations\/[^/]+$/.test(h));
    const cards = [...document.querySelectorAll('[data-slot="card"]')].map((c) => c.innerText);
    return { slugs: [...new Set(links.map((h) => h.replace("/vi/explore/destinations/", "")))], cards };
  });

const readTabNav = (page) =>
  page.evaluate(() => {
    const nav = document.querySelector('nav[aria-label="Tour category"]');
    if (!nav) return null;
    return [...nav.querySelectorAll("a")].map((a) => ({
      href: a.getAttribute("href"),
      label: a.textContent.trim(),
      current: a.getAttribute("aria-current"),
    }));
  });

/** Global header nav (desktop, 4 links) — the sole category navigation now. */
const readHeaderNav = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("header nav a")].map((a) => ({
      href: a.getAttribute("href"),
      label: a.textContent.trim(),
    }))
  );

const countCategoryNav = (page) =>
  page.evaluate(
    () => document.querySelectorAll('nav[aria-label="Tour category"]').length
  );

const goto = async (page, path) => {
  const resp = await page.goto(`${BASE}${path}`, {
    waitUntil: "networkidle2",
    timeout: 60000,
  });
  await dismissPromo(page);
  return resp?.status() ?? 0;
};

/** Badge labels a flagged doc must show on its card (special-tour flag only). */
function labelsOfTarget(target) {
  const out = [];
  if (target.isSpecialTour === true) out.push(msg.vi.destinations.special);
  if (out.length === 0) throw new Error(`no badge labels for flagged doc ${target.slug}`);
  return out;
}

let browser = null;
try {
  browser = await getBrowser();
  const page = await getPage(browser);
  page.on("pageerror", (e) => pageErrors.push(e.message));
  await page.setViewport({ width: 1280, height: 900 });

  const cats = await fetchDestinationCats();
  const expectedDomestic = cats.filter(isDomestic).map((d) => d.slug);
  const expectedInternational = cats.filter(isInternational).map((d) => d.slug);

  // --- DOMESTIC: 200, h1, tab nav, aria-current, filter set, badges
  const domStatus = await goto(page, "/vi/tours/domestic");
  const domH1 = await page.$eval("h1", (el) => el.textContent.trim());
  check("P1 domestic → 200", domStatus === 200, `status=${domStatus}`);
  check("P3 domestic h1 exact i18n", domH1 === msg.vi.tours.domestic.title, domH1);

  const domNav = await readTabNav(page);
  check(
    "P7 domestic: in-page category sub-tabs removed (nav absent)",
    domNav === null,
    JSON.stringify(domNav)
  );
  const domHeader = await readHeaderNav(page);
  check(
    "P8 domestic: header exposes Home + both category links (i18n labels)",
    domHeader.length === 5 &&
      domHeader[0].href === "/vi" &&
      domHeader[1].href === "/vi/tours/domestic" &&
      domHeader[2].href === "/vi/tours/international" &&
      domHeader[0].label === msg.vi.common.home &&
      domHeader[1].label === msg.vi.common.domesticTours &&
      domHeader[2].label === msg.vi.common.internationalTours,
    JSON.stringify(domHeader)
  );
  const domNavCount = await countCategoryNav(page);
  check("P20 domestic: zero in-page category navs", domNavCount === 0, `count=${domNavCount}`);

  const domCards = await readCards(page);
  const domSet = new Set(domCards.slugs);
  const expDomSet = new Set(expectedDomestic);
  if (expDomSet.size === 0) {
    const empty = await page.evaluate(
      (text) => document.body.innerText.includes(text),
      msg.vi.tours.empty
    );
    check("P10 domestic: empty expected → empty-state copy shown", empty);
    check("P10 domestic: no cards rendered", domCards.slugs.length === 0, JSON.stringify(domCards.slugs));
  } else {
    const equal =
      domSet.size === expDomSet.size && [...expDomSet].every((s) => domSet.has(s));
    check(
      "P10 domestic rendered slugs == live GROQ expected set",
      equal,
      `expected=${JSON.stringify(expectedDomestic)} rendered=${JSON.stringify(domCards.slugs)}`
    );
  }
  const domLeak = domCards.slugs.filter((s) =>
    cats.some((c) => c.slug === s && isInternational(c))
  );
  check("P12 domestic: zero international-only slugs", domLeak.length === 0, JSON.stringify(domLeak));
  await page.screenshot({ path: `${OUT}/p-tours-01-domestic.png`, fullPage: true });

  // --- INTERNATIONAL: 200, h1, aria-current inverse, filter set, badges
  const intStatus = await goto(page, "/vi/tours/international");
  const intH1 = await page.$eval("h1", (el) => el.textContent.trim());
  check("P2 international → 200", intStatus === 200, `status=${intStatus}`);
  check("P4 international h1 exact i18n", intH1 === msg.vi.tours.international.title, intH1);

  const intHeader = await readHeaderNav(page);
  check(
    "P9 international: header exposes Home + both category links (i18n labels)",
    intHeader.length === 5 &&
      intHeader[0].href === "/vi" &&
      intHeader[1].href === "/vi/tours/domestic" &&
      intHeader[2].href === "/vi/tours/international" &&
      intHeader[0].label === msg.vi.common.home &&
      intHeader[1].label === msg.vi.common.domesticTours &&
      intHeader[2].label === msg.vi.common.internationalTours,
    JSON.stringify(intHeader)
  );
  const intNavCount = await countCategoryNav(page);
  check("P20 international: zero in-page category navs", intNavCount === 0, `count=${intNavCount}`);

  const intCards = await readCards(page);
  const intSet = new Set(intCards.slugs);
  const expIntSet = new Set(expectedInternational);
  if (expIntSet.size === 0) {
    const empty = await page.evaluate(
      (text) => document.body.innerText.includes(text),
      msg.vi.tours.empty
    );
    check("P11 international: empty expected → empty-state copy shown", empty);
    check("P11 international: no cards rendered", intCards.slugs.length === 0, JSON.stringify(intCards.slugs));
  } else {
    const equal =
      intSet.size === expIntSet.size && [...expIntSet].every((s) => intSet.has(s));
    check(
      "P11 international rendered slugs == live GROQ expected set",
      equal,
      `expected=${JSON.stringify(expectedInternational)} rendered=${JSON.stringify(intCards.slugs)}`
    );
  }
  const intLeak = intCards.slugs.filter((s) =>
    cats.some((c) => c.slug === s && isDomestic(c))
  );
  check("P12 international: zero domestic/undefined slugs", intLeak.length === 0, JSON.stringify(intLeak));
  await page.screenshot({ path: `${OUT}/p-tours-02-international.png`, fullPage: true });

  // --- P21 header link click → route-based filtering preserved end-to-end
  await goto(page, "/vi/tours/domestic");
  await page.click('header nav a[href="/vi/tours/international"]');
  await page
    .waitForFunction(
      () => location.pathname === "/vi/tours/international",
      { timeout: 15000 }
    )
    .catch(() => {});
  // Wait until the rendered card set matches the live international expectation
  // (proves the route re-fetched the segregated dataset, not stale domestic cards).
  await page
    .waitForFunction(
      (expected) => {
        const links = [...document.querySelectorAll("main a[href]")]
          .map((a) => a.getAttribute("href"))
          .filter((h) => /^\/vi\/explore\/destinations\/[^/]+$/.test(h));
        const slugs = [
          ...new Set(
            links.map((h) => h.replace("/vi/explore/destinations/", ""))
          ),
        ];
        const set = new Set(slugs);
        return (
          location.pathname === "/vi/tours/international" &&
          set.size === expected.length &&
          expected.every((s) => set.has(s))
        );
      },
      { timeout: 15000 },
      expectedInternational
    )
    .catch(() => {});
  const p21 = await page.evaluate(() => {
    const links = [...document.querySelectorAll("main a[href]")]
      .map((a) => a.getAttribute("href"))
      .filter((h) => /^\/vi\/explore\/destinations\/[^/]+$/.test(h));
    return {
      path: location.pathname,
      slugs: [
        ...new Set(
          links.map((h) => h.replace("/vi/explore/destinations/", ""))
        ),
      ],
    };
  });
  const p21Set = new Set(p21.slugs);
  const p21Expected = new Set(expectedInternational);
  const p21Equal =
    p21Set.size === p21Expected.size &&
    [...p21Expected].every((s) => p21Set.has(s));
  check(
    "P21 header click → international route + perfectly segregated dataset",
    p21.path === "/vi/tours/international" && p21Equal,
    `path=${p21.path} expected=${JSON.stringify(expectedInternational)} rendered=${JSON.stringify(p21.slugs)}`
  );

  // --- P19 homepage featured section: strictly live isFeatured === true docs
  await goto(page, "/vi");
  const homeSection = await page.evaluate((title) => {
    const h2 = [...document.querySelectorAll("h2")].find(
      (el) => el.textContent.trim() === title
    );
    const section = h2?.closest("section");
    if (!section) return null;
    return [
      ...new Set(
        [...section.querySelectorAll('a[href^="/vi/explore/destinations/"]')].map(
          (a) => a.getAttribute("href").replace("/vi/explore/destinations/", "")
        )
      ),
    ];
  }, msg.vi.home.featuredDestinations);
  const featuredExpected = cats.filter(isFeatured).map((d) => d.slug);
  check("P19 homepage featured section found", Array.isArray(homeSection), String(homeSection));
  if (Array.isArray(homeSection)) {
    const leak = homeSection.filter((s) => !featuredExpected.includes(s));
    check(
      "P19 homepage renders only isFeatured === true docs",
      leak.length === 0,
      JSON.stringify({ leak, featuredExpected, rendered: homeSection })
    );
    if (featuredExpected.length === 0) {
      check("P19 no featured docs → section renders no cards", homeSection.length === 0, JSON.stringify(homeSection));
    } else if (featuredExpected.length <= 6) {
      const missing = featuredExpected.filter((s) => !homeSection.includes(s));
      check(
        "P19 all featured docs rendered (cap 6)",
        missing.length === 0 && homeSection.length <= 6,
        JSON.stringify({ missing, rendered: homeSection })
      );
    } else {
      check(
        "P19 >6 featured docs → section capped at 6",
        homeSection.length === 6,
        JSON.stringify(homeSection)
      );
    }
  }

  // --- P14 conditional badges (dataset-driven, never fabricated)
  const badgeLabels = [msg.vi.destinations.special];
  const flagged = cats.filter((d) => d.isSpecialTour === true);
  if (flagged.length > 0) {
    const target = flagged[0];
    const targetPage = isInternational(target) ? "/vi/tours/international" : "/vi/tours/domestic";
    await goto(page, targetPage);
    const found = await page.evaluate(
      ({ slug, labels }) => {
        const link = document.querySelector(`a[href="/vi/explore/destinations/${slug}"]`);
        const card = link?.closest('[data-slot="card"]');
        return { hasCard: Boolean(card), text: card?.innerText ?? "", labels };
      },
      { slug: target.slug, labels: badgeLabels }
    );
    const expected = labelsOfTarget(target);
    check(
      "P14 flagged doc card shows its badge labels",
      found.hasCard && expected.every((l) => found.text.includes(l)),
      JSON.stringify({ slug: target.slug, expected, text: found.text.slice(0, 200) })
    );
  } else {
    const allCardText = [...domCards.cards, ...intCards.cards].join("\n");
    const hits = badgeLabels.filter((l) => allCardText.includes(l));
    check("P14 no flagged docs → no badge labels on any card", hits.length === 0, JSON.stringify(hits));
  }

  // --- P5/P6 EN pages via in-page fetch (header nav contract, no locale cookie needed)
  const enPages = await page.evaluate(async (urls) => {
    const out = [];
    for (const url of urls) {
      const r = await fetch(url);
      const doc = new DOMParser().parseFromString(await r.text(), "text/html");
      out.push({ url, status: r.status, h1: (doc.querySelector("h1")?.textContent ?? "").trim() });
    }
    return out;
  }, ["/en/tours/domestic", "/en/tours/international"]);
  for (const p of enPages) check(`P5/P6 ${p.url} → 200`, p.status === 200, `status=${p.status}`);
  check(
    "P5/P6 EN h1s exact i18n",
    enPages[0].h1 === msg.en.tours.domestic.title && enPages[1].h1 === msg.en.tours.international.title,
    `${enPages[0].h1} | ${enPages[1].h1}`
  );

  // --- P13/P17 listing + detail regression (badges must not break reviews SSR)
  await goto(page, "/vi/explore/destinations");
  const listCards = await page.evaluate(
    () => document.querySelectorAll('[data-slot="card"]').length
  );
  check("P13 listing → 200 with cards", listCards > 0, `cards=${listCards}`);

  await goto(page, "/vi/explore/destinations/hcm");
  const detail = await page.evaluate(async (url) => {
    const h1 = (document.querySelector("h1")?.textContent ?? "").trim();
    const chip = (document.querySelector("main .mt-8 > div")?.innerText ?? "").trim();
    const response = await fetch(url);
    const doc = new DOMParser().parseFromString(await response.text(), "text/html");
    return { h1, chip, status: response.status, reviews: Boolean(doc.querySelector("#customer-reviews")) };
  }, "/vi/explore/destinations/hcm");
  check("P13 detail → 200 + non-empty h1", detail.status === 200 && detail.h1.length > 0, JSON.stringify(detail));
  check("P13 SSR #customer-reviews intact", detail.reviews, JSON.stringify(detail));

  const liveName = cats.find((c) => c.slug === "hcm")?.name;
  check(
    "P17 detail h1 matches live CMS name",
    liveName ? detail.h1 === liveName : detail.h1.length > 0,
    `h1=${detail.h1} cms=${liveName ?? "(query failed)"}`
  );

  // --- P18 detail chip row: badges exactly match this doc's CMS data
  const hcmDoc = cats.find((c) => c.slug === "hcm");
  const hcmFlagged = hcmDoc && hcmDoc.isSpecialTour === true;
  const hcmExpected = hcmFlagged ? labelsOfTarget(hcmDoc) : [];
  const chipHits = badgeLabels.filter((l) => detail.chip.includes(l));
  check(
    "P18 detail chip row badges match live CMS data",
    hcmExpected.every((l) => detail.chip.includes(l)) &&
      chipHits.length === hcmExpected.length,
    JSON.stringify({ expected: hcmExpected, hits: chipHits, chip: detail.chip })
  );

  // --- P16 zero uncaught page errors across the session
  check("P16 zero pageerrors", pageErrors.length === 0, JSON.stringify(pageErrors.slice(0, 3)));
} catch (error) {
  errors.push(`fatal: ${error.message}`);
} finally {
  if (browser) await closeBrowser(browser).catch(() => {});
}

console.log(results.join("\n"));
if (errors.length > 0) {
  console.error(`\n${errors.length} problem(s):`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}
console.log(`\nall ${results.length} checks passed`);

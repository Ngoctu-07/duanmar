import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });
const msg = {
  vi: JSON.parse(readFileSync(new URL("../../src/messages/vi.json", import.meta.url), "utf8")),
  en: JSON.parse(readFileSync(new URL("../../src/messages/en.json", import.meta.url), "utf8")),
};
const NODE_KEYS = ["phone", "email", "facebook", "instagram", "tiktok"];
const SOCIALS = ["facebook", "instagram", "tiktok"];

const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url))
  ).href
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const errors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};

const columns = (page) =>
  page.$$eval("footer .grid", (grids) => {
    const grid = grids[0];
    const blocks = [...grid.children];
    return {
      count: blocks.length,
      titles: blocks.map((b) => (b.querySelector("h3")?.textContent ?? "").trim()),
      links: blocks.map((b) =>
        [...b.querySelectorAll("a")].map((a) => ({
          href: a.getAttribute("href"),
          label: a.textContent.trim(),
          target: a.getAttribute("target"),
          rel: a.getAttribute("rel"),
        }))
      ),
      imgs: blocks.map((b) => [...b.querySelectorAll("img")].map((i) => i.getAttribute("src"))),
      text: grid.textContent,
      allHrefs: [...document.querySelectorAll("footer a")].map((a) => a.getAttribute("href")),
    };
  });

const go = async (page, locale) => {
  // pin locale: an earlier /vi visit sets NEXT_LOCALE=vi; "/en" serves EN directly (200)
  await page.setCookie({ name: "NEXT_LOCALE", value: locale, url: "http://localhost:3000" });
  await page.goto(`http://localhost:3000/${locale}`, { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  if (page.url().includes(`/${locale === "vi" ? "en" : "vi"}`)) {
    throw new Error(`locale mismatch: wanted ${locale}, got ${page.url()}`);
  }
};

let browser = null;
try {
  browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 900 } });
  const page = await getPage(browser);
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  // --- H header lockup (VI)
  await go(page, "vi");
  const header = await page.evaluate(() => {
    const link = document.querySelector('header a[aria-label="DuanMar"]') ?? document.querySelector('header a[href="/"]');
    if (!link) return null;
    const img = link.querySelector("img");
    const overlay = [...link.querySelectorAll("span[aria-hidden]")].find(
      (s) => s.textContent.trim() === "DuanMar"
    );
    const wordmark = [...link.querySelectorAll("span")].find(
      (s) => s.className.includes("font-brand") && !s.hasAttribute("aria-hidden")
    );
    const rect = img?.getBoundingClientRect();
    return {
      aria: link.getAttribute("aria-label"),
      imgSrc: img?.getAttribute("src") ?? "",
      imgAlt: img?.getAttribute("alt") ?? "",
      imgH: rect?.height ?? 0,
      overlayOpacity: overlay ? parseFloat(getComputedStyle(overlay).opacity) : null,
      overlayPos: overlay ? getComputedStyle(overlay).position : null,
      wordmark: wordmark?.textContent.trim() ?? "",
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  check("H1 lockup aria-label=DuanMar", header?.aria === "DuanMar", String(header?.aria));
  check("H2 logo img present + alt", header?.imgSrc.includes("logo-duanmar") && header?.imgAlt === "DuanMar", `${header?.imgSrc} alt=${header?.imgAlt}`);
  check(
    "H3 overlay absolute + opacity 0.30-0.40",
    header?.overlayPos === "absolute" && header?.overlayOpacity >= 0.3 && header?.overlayOpacity <= 0.4,
    `pos=${header?.overlayPos} opacity=${header?.overlayOpacity}`
  );
  check("H4 solid wordmark present", header?.wordmark === "DuanMar", header?.wordmark);
  check("H5 logo <=40px + no h-overflow", header?.imgH > 0 && header.imgH <= 40 && header.overflow <= 0, `h=${header?.imgH} overflow=${header?.overflow}`);
  await (await page.$("header")).screenshot({ path: `${OUT}/m-brand-01-header-vi.png` });

  // --- F footer (VI)
  const viCols = await columns(page);
  const vi = msg.vi;
  check("F1 exactly 4 column blocks", viCols.count === 4, String(viCols.count));
  check(
    "F2 titles order",
    JSON.stringify(viCols.titles) === JSON.stringify(["DuanMar", vi.footer.tours, vi.footer.contact, vi.footer.info]),
    JSON.stringify(viCols.titles)
  );
  check(
    "F3 Col A 2 tour links",
    viCols.links[1].length === 2 &&
      viCols.links[1].map((l) => l.href).join() === "/vi/tours/domestic,/vi/tours/international" &&
      viCols.links[1].map((l) => l.label).join() === [vi.common.domesticTours, vi.common.internationalTours].join(),
    JSON.stringify(viCols.links[1])
  );
  const viNodes = NODE_KEYS.map((k) => vi.contact.nodes[k].href);
  check("F4 Col B 5 links in order", viCols.links[2].length === 5, JSON.stringify(viCols.links[2].map((l) => l.label)));
  check(
    "F5 Col B hrefs byte-equal contact.nodes",
    JSON.stringify(viCols.links[2].map((l) => l.href)) === JSON.stringify(viNodes),
    JSON.stringify(viCols.links[2].map((l) => l.href))
  );
  check(
    "F6 socials _blank+noopener, tel/mailto same-tab",
    SOCIALS.every((_, i) => viCols.links[2][i + 2].target === "_blank" && /noopener/.test(viCols.links[2][i + 2].rel) && /noreferrer/.test(viCols.links[2][i + 2].rel)) &&
      viCols.links[2].slice(0, 2).every((l) => l.target === null),
    JSON.stringify(viCols.links[2].map((l) => [l.target, l.rel]))
  );
  check(
    "F7 Col C 3 links + labels",
    viCols.links[3].map((l) => l.href).join() === "/vi/support,/vi/blog,/vi/about/careers" &&
      viCols.links[3].map((l) => l.label).join() === [vi.footer.howToBook, vi.footer.articles, vi.footer.careers].join(),
    JSON.stringify(viCols.links[3])
  );
  check(
    "F8 brand block logo + tagline",
    viCols.imgs[0].some((s) => s.includes("logo-duanmar")) && viCols.text.includes(vi.footer.tagline),
    JSON.stringify(viCols.imgs[0])
  );
  const bottomHrefs = await page.$$eval("footer .mt-8 a", (as) => as.map((a) => a.getAttribute("href")));
  const bottomText = await page.$eval("footer", (f) => f.textContent);
  check(
    "F9 bottom bar kept",
    ["/vi/support", "/vi/privacy", "/vi/accessibility", "/vi/sitemap"].every((h) => bottomHrefs.includes(h)) &&
      bottomText.includes(vi.footer.rights),
    JSON.stringify(bottomHrefs)
  );
  check("F10 old groups gone", !viCols.allHrefs.some((h) => /\/explore\/|\/plan-your-trip\/|\/trade/.test(h)), JSON.stringify(viCols.allHrefs));

  // --- R routes
  const viRoutes = await page.evaluate(async (urls) => {
    const out = [];
    for (const u of urls) out.push({ u, s: (await fetch(u)).status });
    return out;
  }, viCols.links.flat().map((l) => l.href).filter((h) => h.startsWith("/vi/")));
  for (const r of viRoutes) check(`R1 ${r.u} → 200`, r.s === 200, String(r.s));

  await page.evaluate(() => document.querySelector("footer").scrollIntoView());
  await sleep(300);
  await (await page.$("footer")).screenshot({ path: `${OUT}/m-brand-02-footer-vi.png` });

  // --- EN locale parity
  await go(page, "en");
  const enCols = await columns(page);
  const en = msg.en;
  check("F2 EN titles order", JSON.stringify(enCols.titles) === JSON.stringify(["DuanMar", en.footer.tours, en.footer.contact, en.footer.info]), JSON.stringify(enCols.titles));
  check(
    "F7 EN Col C prefixed hrefs",
    enCols.links[3].map((l) => l.href).join() === "/en/support,/en/blog,/en/about/careers",
    JSON.stringify(enCols.links[3])
  );
  check(
    "F5 EN Col B hrefs byte-equal contact.nodes",
    JSON.stringify(enCols.links[2].map((l) => l.href)) === JSON.stringify(NODE_KEYS.map((k) => en.contact.nodes[k].href)),
    JSON.stringify(enCols.links[2].map((l) => l.href))
  );
  await (await page.$("footer")).screenshot({ path: `${OUT}/m-brand-03-footer-en.png` });

  check("F11 zero pageerrors", errors.length === 0, errors.join("; "));
  await closeBrowser(browser);
  browser = null;
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

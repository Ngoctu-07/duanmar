import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";
import { fetchContactSettings, expectedContactChannels } from "../helpers/cms-expectations.mjs";

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });
const msg = {
  vi: JSON.parse(readFileSync(new URL("../../src/messages/vi.json", import.meta.url), "utf8")),
  en: JSON.parse(readFileSync(new URL("../../src/messages/en.json", import.meta.url), "utf8")),
};

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

const SOCIAL_LABEL = {
  facebook: "Facebook",
  tiktok: "TikTok",
  instagram: "Instagram",
  threads: "Threads",
  youtube: "YouTube",
};

const columns = (page) =>
  page.$$eval("footer .grid > div", (blocks) =>
    blocks.map((b) => ({
      testid: b.getAttribute("data-testid") ?? "",
      heading: (b.querySelector("h3")?.textContent ?? "").trim(),
      links: [...b.querySelectorAll("a")].map((a) => ({
        href: a.getAttribute("href"),
        label: a.textContent.trim(),
        target: a.getAttribute("target"),
        rel: a.getAttribute("rel"),
      })),
      imgs: [...b.querySelectorAll("img")].map((i) => i.getAttribute("src")),
      text: b.textContent,
    }))
  );

const bottom = (page) =>
  page.evaluate(() => {
    const bar = document.querySelector('[data-testid="footer-bottom"]');
    return {
      links: [...bar.querySelectorAll("a")].map((a) => ({ href: a.getAttribute("href"), label: a.textContent.trim() })),
      text: bar.textContent,
      localeButtons: [...bar.querySelectorAll('[role="group"] button')].map((b) => b.textContent.trim()),
      activeLocale: bar.querySelector('[role="group"] button[aria-current="true"]')?.textContent.trim() ?? null,
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

  // --- VI footer structure
  await go(page, "vi");
  const viCols = await columns(page);
  const vi = msg.vi;
  check("F1 exactly 5 column blocks", viCols.length === 5, String(viCols.length));
  check(
    "F2 column order = brand, tours, information, connect, policies",
    JSON.stringify(viCols.map((c) => c.heading)) ===
      JSON.stringify(["", vi.footer.tours, vi.footer.info, vi.footer.connect, vi.footer.policies]),
    JSON.stringify(viCols.map((c) => c.heading))
  );

  const brand = viCols[0];
  check("F3a brand block is first + has knockout mark", brand.testid === "footer-brand" && brand.imgs.some((s) => s.includes("logo-duanmar-white")), JSON.stringify(brand.imgs));
  check("F3b brand block carries the tagline", brand.text.includes(vi.footer.tagline), brand.text.slice(0, 80));

  const contactSettings = await fetchContactSettings().catch(() => null);
  const viExpected = expectedContactChannels(contactSettings, vi.contact.nodes);
  const enExpected = expectedContactChannels(contactSettings, msg.en.contact.nodes);
  const expectedPrimary = viExpected.filter((c) => c.kind !== "social");
  const expectedSocial = viExpected.filter((c) => c.kind === "social");

  const brandPrimary = brand.links.filter((l) => l.href?.startsWith("tel:") || l.href?.startsWith("mailto:"));
  check(
    "F4a brand block renders Phone + Email from contactSettings",
    JSON.stringify(brandPrimary.map((l) => l.href)) === JSON.stringify(expectedPrimary.map((c) => c.href)) &&
      JSON.stringify(brandPrimary.map((l) => l.label)) === JSON.stringify(expectedPrimary.map((c) => c.value)),
    JSON.stringify(brandPrimary)
  );

  check(
    "F5 tours column = domestic, international, deals",
    viCols[1].links.map((l) => l.href).join() === "/vi/tours/domestic,/vi/tours/international,/vi/deals" &&
      viCols[1].links.map((l) => l.label).join() === [vi.common.domesticTours, vi.common.internationalTours, vi.common.deals].join(),
    JSON.stringify(viCols[1].links)
  );

  check(
    "F6 information column = how-to-book, blog, careers, accessibility, sitemap",
    viCols[2].links.map((l) => l.href).join() === "/vi/support,/vi/blog,/vi/about/careers,/vi/accessibility,/vi/sitemap" &&
      viCols[2].links.map((l) => l.label).join() ===
        [vi.footer.howToBook, vi.footer.blog, vi.footer.careers, vi.footer.accessibility, vi.footer.sitemapHtml].join(),
    JSON.stringify(viCols[2].links)
  );

  const socialCol = viCols[3];
  check(
    "F7a connect column = CMS-driven socials, platform labels in order",
    JSON.stringify(socialCol.links.map((l) => l.href)) === JSON.stringify(expectedSocial.map((c) => c.href)) &&
      JSON.stringify(socialCol.links.map((l) => l.label)) === JSON.stringify(expectedSocial.map((c) => SOCIAL_LABEL[c.key])),
    JSON.stringify(socialCol.links)
  );
  check(
    "F7b social anchors are text-only + _blank/noopener/noreferrer",
    socialCol.links.length === expectedSocial.length &&
      socialCol.links.every((l) => l.target === "_blank" && /noopener/.test(l.rel ?? "") && /noreferrer/.test(l.rel ?? "")) &&
      socialCol.links.every((l) => !/[<>]/.test(l.label)),
    JSON.stringify(socialCol.links.map((l) => [l.target, l.rel]))
  );

  check(
    "F8 policies column 4 links + labels",
    viCols[4].links.map((l) => l.label).join() ===
      [vi.footer.privacyPolicy, vi.footer.terms, vi.footer.refundPolicy, vi.footer.faqs].join() &&
      viCols[4].links.map((l) => l.href).join() ===
        "/vi/privacy#privacy-policy,/vi/privacy#terms,/vi/support#contact,/vi/support",
    JSON.stringify(viCols[4].links)
  );

  const viBottom = await bottom(page);
  check(
    "F9a bottom bar = terms, privacy, cookie legal links",
    viBottom.links.map((l) => l.href).join() === "/vi/privacy#terms,/vi/privacy#privacy-policy,/vi/privacy#privacy-policy" &&
      viBottom.links.map((l) => l.label).join() === [vi.footer.terms, vi.footer.privacyPolicy, vi.footer.cookieSettings].join(),
    JSON.stringify(viBottom.links)
  );
  check("F9b copyright line", viBottom.text.includes(vi.footer.rights), viBottom.text.slice(0, 80));
  check(
    "F9c footer language selector EN / VI with active locale",
    JSON.stringify(viBottom.localeButtons) === JSON.stringify(["en", "vi"]) && viBottom.activeLocale === "vi",
    JSON.stringify({ buttons: viBottom.localeButtons, active: viBottom.activeLocale })
  );

  const allHrefs = viCols.flatMap((c) => c.links.map((l) => l.href));
  check("F10 old groups gone", !allHrefs.some((h) => /\/explore\/|\/plan-your-trip\/|\/trade/.test(h ?? "")), JSON.stringify(allHrefs));

  // --- Routes resolve
  const viRoutes = await page.evaluate(async (urls) => {
    const out = [];
    for (const u of urls) out.push({ u, s: (await fetch(u)).status });
    return out;
  }, allHrefs.filter((h) => h?.startsWith("/vi/")));
  for (const r of viRoutes) check(`R1 ${r.u} → 200`, r.s === 200, String(r.s));

  await page.evaluate(() => document.querySelector("footer").scrollIntoView());
  await sleep(300);
  await (await page.$("footer")).screenshot({ path: `${OUT}/m-brand-02-footer-vi.png` });

  // --- EN locale parity
  await go(page, "en");
  const enCols = await columns(page);
  const en = msg.en;
  check(
    "F11 EN headings parity",
    JSON.stringify(enCols.map((c) => c.heading)) ===
      JSON.stringify(["", en.footer.tours, en.footer.info, en.footer.connect, en.footer.policies]),
    JSON.stringify(enCols.map((c) => c.heading))
  );
  check(
    "F11b EN information column prefixed hrefs",
    enCols[2].links.map((l) => l.href).join() === "/en/support,/en/blog,/en/about/careers,/en/accessibility,/en/sitemap",
    JSON.stringify(enCols[2].links)
  );
  check(
    "F11c EN connect hrefs byte-equal contactSettings",
    JSON.stringify(enCols[3].links.map((l) => l.href)) === JSON.stringify(enExpected.filter((c) => c.kind === "social").map((c) => c.href)),
    JSON.stringify(enCols[3].links.map((l) => l.href))
  );
  await (await page.$("footer")).screenshot({ path: `${OUT}/m-brand-03-footer-en.png` });

  check("F12 zero pageerrors", errors.length === 0, errors.join("; "));
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

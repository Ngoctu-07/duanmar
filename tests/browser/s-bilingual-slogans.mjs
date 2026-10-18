import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

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

const results = [];
const errors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};

const FOOTER = '[data-testid="footer-slogan"]';

const go = async (page, locale) => {
  await page.setCookie({ name: "NEXT_LOCALE", value: locale, url: "http://localhost:3000" });
  await page.goto(`http://localhost:3000/${locale}`, { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
};

const readSlogans = (page) =>
  page.evaluate(() => {
    const footerEl = document.querySelector('[data-testid="footer-slogan"]');
    const heroSloganEl = document.querySelector('[data-testid="hero-slogan"]');
    const heroDisplayEl = document.querySelector('[data-testid="hero-display"]');
    const brand = document.querySelector("footer .grid > div:first-child");
    const h1 = document.querySelector("main h1");
    return {
      footer: footerEl?.textContent?.trim() ?? null,
      // the subtitle slogan element was removed in favour of the giant wordmark
      heroSloganPresent: Boolean(heroSloganEl),
      heroDisplay: heroDisplayEl?.textContent?.trim() ?? null,
      // the giant display wordmark IS the page H1, centred in the hero overlay
      heroDisplayIsH1: Boolean(heroDisplayEl && h1 && heroDisplayEl === h1),
      footerInBrand: Boolean(footerEl && brand && brand.contains(footerEl)),
      probe: window.__sloganProbe ?? null,
      active:
        document.querySelector('header [role="group"] button[aria-current="true"]')?.textContent?.trim() ?? null,
      navType: performance.getEntriesByType("navigation")[0]?.type ?? null,
    };
  });

const switchLocale = async (page, target) => {
  await page.evaluate((value) => {
    const group = document.querySelector('header [role="group"]');
    [...group.querySelectorAll("button")].find((b) => b.textContent.trim() === value)?.click();
  }, target);
  await page.waitForFunction((t) => location.pathname.startsWith(`/${t}`), { timeout: 20000 }, target);
};

let browser = null;
try {
  browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 900 } });
  const page = await getPage(browser);
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  // ---------- VI ----------
  await go(page, "vi");
  const vi = await readSlogans(page);
  check("S1 VI footer slogan rendered + non-empty", Boolean(vi.footer), JSON.stringify(vi.footer));
  check("S1b VI hero subtitle slogan removed", vi.heroSloganPresent === false, String(vi.heroSloganPresent));
  check("S1c VI hero giant wordmark = home.heroDisplay (is the H1)", vi.heroDisplay === msg.vi.home.heroDisplay && vi.heroDisplayIsH1, JSON.stringify({ text: vi.heroDisplay, isH1: vi.heroDisplayIsH1 }));
  check("S1d active locale is vi", vi.active === "vi", String(vi.active));
  // CMS fields start empty → i18n fallback; an editor filling Studio flips the
  // expectation below to CMS text without breaking the run.
  const viFooterFallback = vi.footer === msg.vi.footer.tagline;
  check(
    "S2 footer slogan sits in the brand block (under the logo)",
    vi.footerInBrand,
    JSON.stringify({ footerInBrand: vi.footerInBrand })
  );
  check(
    "S2b rendered VI footer text matches the i18n fallback while CMS fields are empty",
    viFooterFallback,
    `footerFallback=${viFooterFallback}`
  );

  // ---------- toggle VI → EN, no hard refresh ----------
  await page.evaluate(() => {
    window.__sloganProbe = `${Date.now()}-${Math.random()}`;
  });
  const probeBefore = (await readSlogans(page)).probe;

  await switchLocale(page, "en");
  await page.waitForFunction(
    (sel, prev) => document.querySelector(sel)?.textContent?.trim() !== prev,
    { timeout: 20000 },
    FOOTER,
    vi.footer
  );
  await dismissPromo(page);
  const en = await readSlogans(page);

  check("S3 URL switched to /en", page.url().includes("/en"), page.url());
  check("S4 no hard refresh (window marker survived)", en.probe !== null && en.probe === probeBefore, `${probeBefore} → ${en.probe}`);
  check("S5 footer slogan re-rendered in EN", Boolean(en.footer) && en.footer !== vi.footer, JSON.stringify({ vi: vi.footer, en: en.footer }));
  check("S5b EN hero giant wordmark present + still the H1", en.heroDisplay === msg.en.home.heroDisplay && en.heroDisplayIsH1, JSON.stringify(en.heroDisplay));
  check("S5c hero subtitle slogan still absent in EN", en.heroSloganPresent === false);
  check(
    "S6 EN footer text = i18n EN fallback when CMS is empty",
    viFooterFallback ? en.footer === msg.en.footer.tagline : Boolean(en.footer),
    en.footer
  );
  check("S7 active locale is en", en.active === "en", String(en.active));
  check("S7b still soft navigation (no document reload)", en.navType === vi.navType, `${vi.navType} → ${en.navType}`);

  // ---------- toggle EN → VI (symmetric) ----------
  await switchLocale(page, "vi");
  await page.waitForFunction(
    (sel, prev) => document.querySelector(sel)?.textContent?.trim() === prev,
    { timeout: 20000 },
    FOOTER,
    vi.footer
  );
  await dismissPromo(page);
  const back = await readSlogans(page);
  check("S8 back to VI restores the original footer slogan", back.footer === vi.footer, JSON.stringify(back.footer));
  check("S8b back to VI restores the giant wordmark", back.heroDisplay === vi.heroDisplay && back.heroDisplayIsH1, JSON.stringify(back.heroDisplay));
  check("S8c window marker still alive after both toggles", back.probe === probeBefore, String(back.probe));

  check("S9 zero pageerrors", pageErrors.length === 0, pageErrors.join("; "));
  await (await page.$("footer")).screenshot({ path: `${OUT}/s-slogan-footer-vi.png` }).catch(() => {});
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

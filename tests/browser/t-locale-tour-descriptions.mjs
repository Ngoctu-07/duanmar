import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

/**
 * T-promo: homepage Featured Destination cards must switch their preview
 * description between the VI base (`description`) and EN (`descriptionEn`)
 * when the header language switcher toggles — soft nav only, no hard refresh.
 */

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });

const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(
      new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url)
    )
  ).href
);

const SECTION = '[data-testid="featured-destinations"]';
const CARDS = `${SECTION} p.line-clamp-2`;

const results = [];
const errors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};

const readDescriptions = (page) =>
  page.$$eval(CARDS, (els) => els.map((el) => el.textContent?.trim() ?? ""));

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

  await page.setCookie({ name: "NEXT_LOCALE", value: "vi", url: "http://localhost:3000" });
  await page.goto("http://localhost:3000/vi", { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  await page.waitForSelector(CARDS, { timeout: 15000 });

  const viDescriptions = await readDescriptions(page);
  check("T1 featured section renders cards", viDescriptions.length > 0, `count=${viDescriptions.length}`);
  check("T1 VI cards have description text", viDescriptions.every((d) => d.length > 0));

  // Marker proves the page was never hard-reloaded across the locale switch.
  await page.evaluate(() => {
    window.__tourDescProbe = `${Date.now()}-${Math.random()}`;
  });
  const probeBefore = await page.evaluate(() => window.__tourDescProbe);
  await page.screenshot({ path: `${OUT}/t-tour-desc-vi.png` });

  await switchLocale(page, "en");
  await page
    .waitForFunction(
      (sel, prev) => {
        const now = [...document.querySelectorAll(sel)].map((el) => el.textContent?.trim() ?? "");
        return now.length === prev.length && now.some((text, i) => text && text !== prev[i]);
      },
      { timeout: 20000 },
      CARDS,
      viDescriptions
    )
    .catch(() => {});
  const enDescriptions = await readDescriptions(page);

  check("T2 URL switched to /en", page.url().includes("/en"), page.url());
  check(
    "T3 no hard refresh (window marker survived)",
    (await page.evaluate(() => window.__tourDescProbe)) === probeBefore,
    `${probeBefore}`
  );
  check(
    "T4 tour descriptions re-rendered in EN",
    enDescriptions.length === viDescriptions.length &&
      enDescriptions.some((text, i) => text && text !== viDescriptions[i]),
    JSON.stringify({ vi: viDescriptions[0]?.slice(0, 40), en: enDescriptions[0]?.slice(0, 40) })
  );
  await page.screenshot({ path: `${OUT}/t-tour-desc-en.png` });

  // Toggle back → VI base returns.
  await switchLocale(page, "vi");
  await page
    .waitForFunction(
      (sel, prev) => {
        const first = document.querySelector(sel)?.textContent?.trim() ?? "";
        return first !== prev;
      },
      { timeout: 20000 },
      CARDS,
      enDescriptions[0] ?? ""
    )
    .catch(() => {});
  const backDescriptions = await readDescriptions(page);
  check(
    "T5 back to VI restores the base description",
    JSON.stringify(backDescriptions) === JSON.stringify(viDescriptions),
    JSON.stringify(backDescriptions[0]?.slice(0, 40))
  );

  check("T6 zero pageerrors", pageErrors.length === 0, pageErrors.join("; "));
  await closeBrowser(browser);
} catch (error) {
  errors.push(`fatal: ${error.message}`);
  try {
    await closeBrowser();
  } catch {
    /* browser already gone */
  }
}

console.log(results.join("\n"));
if (errors.length > 0) {
  console.error(`\n${errors.length} problem(s):`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}
console.log(`\nall ${results.length} checks passed`);

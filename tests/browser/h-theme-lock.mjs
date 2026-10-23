/**
 * Theme lock: the site ships one dark theme. The Sun/Moon toggle is gone, the
 * `dark` class is always present, the canvas stays zinc-900 even when a stale
 * `theme=light` value is restored from localStorage, and there are no errors.
 */
import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });

const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url))
  ).href
);

const ORIGIN = "http://localhost:3000";
// zinc-900 #18181b
const DARK_CANVAS = ["rgb(24, 24, 27)", "#18181b"];
const isDark = (bg) => DARK_CANVAS.includes(bg);
const results = [];
const errors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};

const state = (page) =>
  page.evaluate(() => {
    const root = document.documentElement;
    return {
      dark: root.classList.contains("dark"),
      bg: getComputedStyle(document.body).backgroundColor,
      switcher: Boolean(document.querySelector('[data-testid="theme-switcher"]')),
      // Any leftover Sun/Moon button would also live in the header chrome.
      themeButtons: document.querySelectorAll(
        'button[aria-label*="theme" i], button[aria-label*="chế độ" i], button[title*="theme" i]'
      ).length,
    };
  });

try {
  const browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 900 } });
  const page = await getPage(browser);
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  await page.goto(`${ORIGIN}/vi`, { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  let s = await state(page);
  check("H1 dark class is always on <html>", s.dark === true, JSON.stringify({ dark: s.dark }));
  check("H1 canvas is the zinc-900 dark background", isDark(s.bg), s.bg);
  check("H1 no theme switcher in the DOM", s.switcher === false);
  check("H1 no leftover theme toggle buttons", s.themeButtons === 0, String(s.themeButtons));
  await page.screenshot({ path: `${OUT}/h-theme-lock-01-dark.png` });

  // A stale preference from the removed toggle must not lighten the page.
  await page.evaluate(() => localStorage.setItem("theme", "light"));
  await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  s = await state(page);
  check("H2 stored theme=light is ignored", s.dark === true && isDark(s.bg),
    JSON.stringify({ dark: s.dark, bg: s.bg }));

  // Same lock on the EN locale.
  await page.goto(`${ORIGIN}/en`, { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  s = await state(page);
  check("H3 EN locale stays dark", s.dark === true && isDark(s.bg),
    JSON.stringify({ dark: s.dark, bg: s.bg }));
  check("H3 EN locale has no switcher", s.switcher === false);

  await page.evaluate(() => localStorage.clear());
  check("H4 zero pageerrors", errors.length === 0, JSON.stringify(errors));

  await closeBrowser(browser);
} catch (error) {
  errors.push(`fatal: ${error.message}`);
}

console.log(results.join("\n"));
if (errors.length > 0) {
  console.error(`\n${errors.length} problem(s):`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}
console.log(`\nall ${results.length} checks passed`);

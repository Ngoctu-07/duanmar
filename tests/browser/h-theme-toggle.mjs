/**
 * Theme switcher: default dark, Sun/Moon toggle with active-state feedback,
 * light/dark swap, persistence across reload.
 */
import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";
import { revealHomeHeader } from "../helpers/header-reveal.mjs";

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });

const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url))
  ).href
);

  const ORIGIN = "http://localhost:3000";
  const isWhite = (bg) =>
    bg === "rgb(255, 255, 255)" ||
    bg === "oklch(1 0 0)" ||
    bg === "lab(100 0 0)" ||
    bg === "oklab(1 0 0)";
const results = [];
const errors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};

const state = (page) =>
  page.evaluate(() => {
    const root = document.documentElement;
    const dark = root.classList.contains("dark");
    const bg = getComputedStyle(document.body).backgroundColor;
    const sw = document.querySelector('[data-testid="theme-switcher"]');
    const btn = (v) => sw?.querySelector(`[data-testid="theme-switcher-${v}"]`);
    const opacity = (v) => btn(v) ? parseFloat(getComputedStyle(btn(v)).opacity) : null;
    return {
      dark,
      bg,
      present: Boolean(sw),
      moonActive: btn("dark")?.getAttribute("data-active"),
      sunActive: btn("light")?.getAttribute("data-active"),
      moonOpacity: opacity("dark"),
      sunOpacity: opacity("light"),
    };
  });

try {
  const browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 900 } });
  const page = await getPage(browser);
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  // Fresh profile: no stored theme → default dark (brand vibe preserved).
  await page.goto(`${ORIGIN}/vi`, { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  let s = await state(page);
  check("H1 switcher present in header", s.present);
  check("H1 default is dark", s.dark === true, JSON.stringify({ dark: s.dark }));
  check("H1 moon prominent when dark", s.moonActive === "true" && s.moonOpacity === 1,
    JSON.stringify({ active: s.moonActive, opacity: s.moonOpacity }));
  check("H1 sun muted when dark", s.sunActive === "false" && s.sunOpacity < 1,
    JSON.stringify({ active: s.sunActive, opacity: s.sunOpacity }));
  const darkBg = s.bg;

  // --- Switch to light: class removed, white background, active states flip.
  await revealHomeHeader(page);
  await page.click('[data-testid="theme-switcher-light"]');
  await page.waitForFunction(
    () => !document.documentElement.classList.contains("dark"),
    { timeout: 10000 }
  );
  s = await state(page);
  check("H2 light removes .dark", s.dark === false);
  check("H2 light background is white", isWhite(s.bg), s.bg);
  check("H2 background differs from dark", s.bg !== darkBg, `${darkBg} → ${s.bg}`);
  check("H2 sun prominent when light", s.sunActive === "true" && s.sunOpacity === 1,
    JSON.stringify({ active: s.sunActive, opacity: s.sunOpacity }));
  check("H2 moon muted when light", s.moonActive === "false" && s.moonOpacity < 1,
    JSON.stringify({ active: s.moonActive, opacity: s.moonOpacity }));
  await page.screenshot({ path: `${OUT}/h-theme-01-light.png` });

  // --- Persistence: reload keeps light.
  await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  s = await state(page);
  check("H3 light persists across reload", s.dark === false && isWhite(s.bg),
    JSON.stringify({ dark: s.dark, bg: s.bg }));

  // --- Switch back to dark.
  await revealHomeHeader(page);
  await page.click('[data-testid="theme-switcher-dark"]');
  await page.waitForFunction(
    () => document.documentElement.classList.contains("dark"),
    { timeout: 10000 }
  );
  s = await state(page);
  check("H4 dark restored", s.dark === true && s.bg === darkBg,
    JSON.stringify({ dark: s.dark, bg: s.bg }));
  check("H4 moon prominent again", s.moonActive === "true" && s.moonOpacity === 1);
  check("H4 zero pageerrors", errors.length === 0, JSON.stringify(errors));

  // Leave the shared profile dark for the rest of the suite.
  await page.evaluate(() => localStorage.clear());

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

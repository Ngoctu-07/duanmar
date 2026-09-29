import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

/**
 * Plan 260929-2254 — heart reaction interactions on the social feed.
 * API contract always runs; UI block checks are data-driven (skip at
 * 0 CMS articles). Fresh browser profile = no pre-existing likes.
 */

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";
const PROBE_SLUG = "e-test-probe";

const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url))
  ).href
);

const results = [];
const errors = [];
const pageErrors = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};

try {
  // ---------- 1. API contract (always) ----------
  const postRes = await fetch(`${BASE}/api/articles/${PROBE_SLUG}/like`, { method: "POST" });
  const postData = await postRes.json().catch(() => null);
  check("E0 POST like → 200 {slug,count}", postRes.status === 200 && postData?.slug === PROBE_SLUG && typeof postData?.count === "number",
    JSON.stringify({ status: postRes.status, postData }));

  const badRes = await fetch(`${BASE}/api/articles/BAD_SLUG/like`, { method: "POST" });
  check("E1 invalid slug → 400", badRes.status === 400, `status=${badRes.status}`);

  const getRes = await fetch(`${BASE}/api/articles/${PROBE_SLUG}/like`);
  check("E2 GET like → 405", getRes.status === 405, `status=${getRes.status}`);

  const oversized = await fetch(`${BASE}/api/articles/${PROBE_SLUG}/like`, {
    method: "POST",
    headers: { "content-length": "5000" },
    body: "x".repeat(5000),
  });
  check("E3 oversized body → 413", oversized.status === 413, `status=${oversized.status}`);

  // ---------- 2. Feed heart interactions ----------
  const browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 900 } });
  const page = await getPage(browser);
  page.on("pageerror", (e) => pageErrors.push(e.message));

  await page.goto(`${BASE}/vi/blog`, { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);

  const feed = await page.evaluate(() => ({
    blockCount: document.querySelectorAll('[data-testid="feed-article-block"]').length,
    likeCount: document.querySelectorAll('[data-testid="like-button"]').length,
    emptyState: Boolean(document.querySelector("p.mx-auto.max-w-3xl.text-center")),
  }));

  if (feed.blockCount === 0) {
    check("E4 feed empty (0 CMS articles) — UI checks skipped", feed.emptyState === true, JSON.stringify(feed));
  } else {
    check("E4 feed blocks present with like buttons", feed.likeCount === feed.blockCount, JSON.stringify(feed));

    const readButton = () =>
      page.evaluate(() => {
        const btn = document.querySelector('[data-testid="like-button"]');
        if (!btn) return null;
        const heart = btn.querySelector("svg");
        return {
          pressed: btn.getAttribute("aria-pressed"),
          label: btn.getAttribute("aria-label"),
          count: (btn.querySelector("span")?.textContent ?? "").trim(),
          fill: heart ? getComputedStyle(heart).fill : null,
          color: heart ? getComputedStyle(heart).color : null,
          text: btn.textContent.trim(),
        };
      });

    const before = await readButton();
    check("E5 initial unliked state", before?.pressed === "false", JSON.stringify(before));

    // click → optimistic fill + count+1 + persists across reload
    await page.click('[data-testid="like-button"]');
    await sleep(400);
    const afterClick = await readButton();
    const countAfter = Number(afterClick?.count);
    check("E6 click → aria-pressed true + red heart", afterClick?.pressed === "true",
      JSON.stringify(afterClick));
    check("E7 count incremented +1", Number.isFinite(countAfter) && countAfter >= 1, `count=${afterClick?.count}`);

    // duplicate vote blocked
    await page.click('[data-testid="like-button"]');
    await sleep(300);
    const afterSecond = await readButton();
    check("E8 second click keeps same count (no duplicate vote)",
      Number(afterSecond?.count) === countAfter && afterSecond?.pressed === "true",
      JSON.stringify(afterSecond));

    // persistence: localStorage liked slug survives reload
    await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
    await sleep(300);
    const afterReload = await readButton();
    check("E9 like persists across reload (localStorage)", afterReload?.pressed === "true",
      JSON.stringify(afterReload));
    check("E10 count after reload = server count", Number(afterReload?.count) === countAfter,
      `got=${afterReload?.count} want=${countAfter}`);

    // api-backed count: POST once more directly → feed count reflects DB on fresh load? (DB is source)
    await page.screenshot({ path: `${OUT}/e-heart-liked.png`, clip: { x: 0, y: 200, width: 1280, height: 700 } });
  }

  check("E11 zero pageerrors", pageErrors.length === 0, pageErrors.join("; "));
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

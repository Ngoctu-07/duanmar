import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";
import {
  checkVisitorCookie,
  getLikesBatch,
  pageCookieHeader,
  postLikeToggle,
  visitorIdFromSetCookie,
} from "../helpers/reviews-api.mjs";

/**
 * Plan 260929-2254 + 261007-2145 — heart reaction toggle on the social feed.
 * Server is the source of truth now: click flips like ↔ unlike (E8), reload
 * renders the cookie-scoped server state (E9/E10), batch GET mirrors the
 * button (E12). Deltas + final restore keep reruns hermetic at any baseline.
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
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};

try {
  // ---------- 1. API toggle contract (always) ----------
  const baseline = await getLikesBatch(BASE, [PROBE_SLUG], "");
  const baseCount =
    baseline.json?.counts?.[PROBE_SLUG] ?? 0;
  check("E0b batch GET baseline readable", baseline.status === 200, JSON.stringify(baseline.json));

  const first = await postLikeToggle(BASE, PROBE_SLUG, null);
  const cookieCheck = checkVisitorCookie(first.setCookies);
  check("E0 POST like → 200 {slug,count,isLiked:true}",
    first.status === 200 && first.json?.slug === PROBE_SLUG &&
    first.json?.count === baseCount + 1 && first.json?.isLiked === true,
    JSON.stringify({ status: first.status, json: first.json }));
  check("E0b POST mints vn_visitor (HttpOnly, Path=/, SameSite=Lax)",
    cookieCheck.ok, cookieCheck.detail);
  check("E0c POST body carries no visitor identity",
    first.json && !("visitor" in first.json) && !("authorEmail" in first.json),
    JSON.stringify(first.json));
  const visitorA = cookieCheck.visitor ?? visitorIdFromSetCookie(first.setCookies);

  const unlike = await postLikeToggle(BASE, PROBE_SLUG, visitorA);
  check("E-T1 second POST unlikes (count restored, isLiked false)",
    unlike.status === 200 && unlike.json?.count === baseCount && unlike.json?.isLiked === false,
    JSON.stringify(unlike.json));

  const relike = await postLikeToggle(BASE, PROBE_SLUG, visitorA);
  check("E-T2 third POST re-likes (count +1, isLiked true)",
    relike.status === 200 && relike.json?.count === baseCount + 1 && relike.json?.isLiked === true,
    JSON.stringify(relike.json));

  const secondVisitor = await postLikeToggle(BASE, PROBE_SLUG, null);
  const visitorB = visitorIdFromSetCookie(secondVisitor.setCookies);
  check("E-T3 fresh visitor likes too (shared count +1)",
    secondVisitor.status === 200 && secondVisitor.json?.count === baseCount + 2 &&
    secondVisitor.json?.isLiked === true && Boolean(visitorB) && visitorB !== visitorA,
    JSON.stringify(secondVisitor.json));

  const batchA = await getLikesBatch(BASE, [PROBE_SLUG], `vn_visitor=${visitorA}`);
  const batchB = await getLikesBatch(BASE, [PROBE_SLUG], `vn_visitor=${visitorB}`);
  check("E-T4 batch GET shows shared count + per-visitor isLiked",
    batchA.json?.counts?.[PROBE_SLUG] === baseCount + 2 &&
    batchA.json?.liked?.[PROBE_SLUG] === true &&
    batchB.json?.counts?.[PROBE_SLUG] === baseCount + 2 &&
    batchB.json?.liked?.[PROBE_SLUG] === true,
    JSON.stringify({ a: batchA.json, b: batchB.json }));

  const aOut = await postLikeToggle(BASE, PROBE_SLUG, visitorA);
  const isoA = await getLikesBatch(BASE, [PROBE_SLUG], `vn_visitor=${visitorA}`);
  const isoB = await getLikesBatch(BASE, [PROBE_SLUG], `vn_visitor=${visitorB}`);
  check("E-T5 visitor isolation: A unlikes, B still liked",
    aOut.json?.count === baseCount + 1 && aOut.json?.isLiked === false &&
    isoA.json?.liked?.[PROBE_SLUG] === false && isoB.json?.liked?.[PROBE_SLUG] === true,
    JSON.stringify({ aOut: aOut.json, isoA: isoA.json, isoB: isoB.json }));

  const bOut = await postLikeToggle(BASE, PROBE_SLUG, visitorB);
  const restored = await getLikesBatch(BASE, [PROBE_SLUG], "");
  check("E-T6 cleanup restores baseline count",
    bOut.json?.count === baseCount && bOut.json?.isLiked === false &&
    (restored.json?.counts?.[PROBE_SLUG] ?? 0) === baseCount,
    JSON.stringify({ bOut: bOut.json, restored: restored.json }));

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
          settled: !btn.disabled,
        };
      });
    const waitButton = (want) =>
      page.waitForFunction(
        (expected) => {
          const btn = document.querySelector('[data-testid="like-button"]');
          if (!btn || btn.disabled) return false;
          const count = (btn.querySelector("span")?.textContent ?? "").trim();
          return btn.getAttribute("aria-pressed") === expected.pressed && count === expected.count;
        },
        { timeout: 15000 },
        want
      );

    const before = await readButton();
    const beforeCount = Number(before?.count ?? "0");
    check("E5 initial unliked state", before?.pressed === "false", JSON.stringify(before));

    // click → optimistic flip, then server reconciliation settles the toggle
    await page.click('[data-testid="like-button"]');
    await waitButton({ pressed: "true", count: String(beforeCount + 1) });
    const afterClick = await readButton();
    check("E6 click → aria-pressed true + count +1 (settled, not just optimistic)",
      afterClick?.pressed === "true" && Number(afterClick?.count) === beforeCount + 1 && afterClick?.settled === true,
      JSON.stringify(afterClick));

    // toggle semantics: second click UNLIKES (dead no-revote behavior replaced)
    await page.click('[data-testid="like-button"]');
    await waitButton({ pressed: "false", count: String(beforeCount) });
    const afterSecond = await readButton();
    check("E8 second click unlikes (pressed false, count restored)",
      afterSecond?.pressed === "false" && Number(afterSecond?.count) === beforeCount,
      JSON.stringify(afterSecond));

    // persistence: server cookie state survives reload; cookie stays HttpOnly
    await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForFunction(
      (want) => {
        const btn = document.querySelector('[data-testid="like-button"]');
        return btn?.getAttribute("aria-pressed") === want.pressed &&
          ((btn.querySelector("span")?.textContent ?? "").trim() === want.count);
      },
      { timeout: 15000 },
      { pressed: "false", count: String(beforeCount) }
    );
    const afterReload = await readButton();
    check("E9 reload keeps server toggle state (unliked)", afterReload?.pressed === "false",
      JSON.stringify(afterReload));
    check("E10 count after reload = server count", Number(afterReload?.count) === beforeCount,
      `got=${afterReload?.count} want=${beforeCount}`);
    const cookieLeak = await page.evaluate(() =>
      document.cookie.split(";").some((part) => part.trim().startsWith("vn_visitor=")));
    check("E9b vn_visitor invisible to document.cookie (HttpOnly)", cookieLeak === false);

    // api-backed count: batch GET with the browser jar mirrors the button
    const articleSlug = await page.evaluate(() => {
      const btn = document.querySelector('[data-testid="like-button"]');
      const link = btn?.closest("article")?.querySelector('a[href*="/blog/"]');
      return link?.getAttribute("href")?.match(/\/blog\/([^/?#]+)/)?.[1] ?? null;
    });
    const jarHeader = await pageCookieHeader(page);
    check("E12a article slug resolved from feed block", typeof articleSlug === "string" && articleSlug.length > 0, String(articleSlug));
    const batch = articleSlug
      ? await getLikesBatch(BASE, [articleSlug], jarHeader)
      : { status: -1, json: null };
    check("E12 batch GET mirrors button (count + unliked)",
      batch.status === 200 && batch.json?.counts?.[articleSlug] === beforeCount &&
      batch.json?.liked?.[articleSlug] === false,
      JSON.stringify({ articleSlug, batch: batch.json, button: afterReload }));

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

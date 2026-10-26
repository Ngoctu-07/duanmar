import { readFileSync } from "node:fs";
import { dismissPromo } from "../helpers/promo.mjs";
import { signInReviewOwner } from "../helpers/auth-session.mjs";

/**
 * Account review history + auth ownership:
 * A. Both reviews posted by the signed-in account appear in the Reviews tab.
 * B. Deleting one removes it immediately and recalculates AVG/COUNT on the server.
 * C. The remaining review stays visible (no over-delete).
 */

const M = JSON.parse(
  readFileSync(new URL("../../src/messages/vi.json", import.meta.url), "utf8")
).destinations.reviews;
const { getBrowser, getPage, closeBrowser } = await import(
  new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url).href
);

const BASE = "http://localhost:3000";
const SLUG = "k2-account-slug";
const ROW_A = `VN-K2-A:${SLUG}`;
const ROW_B = `VN-K2-B:${SLUG}`;
const ROWS = [ROW_A, ROW_B];
const deleteRows = (page) =>
  page.evaluate(async (refs) => {
    for (const ref of refs) {
      await fetch(`/api/reviews/${encodeURIComponent(ref)}`, { method: "DELETE" }).catch(
        () => null
      );
    }
  }, ROWS);

const results = [];
const errors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};

let browser;
let page;
try {
  browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 1000 } });
  page = await getPage(browser);
  await signInReviewOwner(page);
  await deleteRows(page);

  const seeded = await page.evaluate(
    async ({ slug, rows }) => {
      for (const row of rows) {
        const response = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(row),
        });
        if (!response.ok) throw new Error(`seed ${row.reference} ${response.status}`);
      }
      const response = await fetch(`/api/ratings?slugs=${encodeURIComponent(slug)}`, {
        cache: "no-store",
      });
      return response.json();
    },
    {
      slug: SLUG,
      rows: [
        {
          reference: ROW_A,
          tourSlug: SLUG,
          bookingReference: "VN-K2-A",
          authorName: "K2 Account",
          authorEmail: "k2@example.test",
          rating: 5,
          comment: "Keep this review",
          images: [],
        },
        {
          reference: ROW_B,
          tourSlug: SLUG,
          bookingReference: "VN-K2-B",
          authorName: "K2 Account",
          authorEmail: "k2@example.test",
          rating: 3,
          comment: "Delete this review",
          images: [],
        },
      ],
    }
  );
  check(
    "A1 seed aggregate = 4.0 from 2 reviews",
    seeded?.aggregates?.[SLUG]?.avg === 4 && seeded?.aggregates?.[SLUG]?.count === 2,
    JSON.stringify(seeded)
  );

  await page.goto(`${BASE}/vi/account?tab=reviews`, {
    waitUntil: "networkidle2",
    timeout: 90000,
  });
  await dismissPromo(page);
  await page.waitForFunction(
    () => document.querySelectorAll('[data-testid="review-card"]').length === 2,
    { timeout: 20000 }
  );
  const initial = await page.evaluate(() => ({
    selected: [...document.querySelectorAll('[role="tab"]')].find(
      (tab) => tab.getAttribute("aria-selected") === "true"
    )?.textContent,
    cards: document.querySelectorAll('[data-testid="review-card"]').length,
    deletes: document.querySelectorAll('[data-testid="review-delete"]').length,
    text: document.getElementById("customer-reviews")?.textContent ?? "",
  }));
  check("A2 reviews tab is active", initial.selected === "Đánh giá", String(initial.selected));
  check(
    "A3 two own reviews each have Delete",
    initial.cards === 2 && initial.deletes === 2,
    JSON.stringify(initial)
  );

  let dialogMessage = null;
  page.once("dialog", (dialog) => {
    dialogMessage = dialog.message();
    dialog.accept();
  });
  await page.evaluate(() => {
    const card = [...document.querySelectorAll('[data-testid="review-card"]')].find((el) =>
      el.textContent.includes("Delete this review")
    );
    card?.querySelector('[data-testid="review-delete"]')?.click();
  });
  await page.waitForFunction(
    () =>
      document.querySelectorAll('[data-testid="review-card"]').length === 1 &&
      !document.body.innerText.includes("Delete this review"),
    { timeout: 20000 }
  );
  check("B1 confirm copy = deleteConfirm", dialogMessage === M.deleteConfirm, String(dialogMessage));
  check(
    "B2 deleted card removed, remaining card kept",
    await page.evaluate(
      () =>
        document.querySelectorAll('[data-testid="review-card"]').length === 1 &&
        document.body.innerText.includes("Keep this review")
    )
  );

  const after = await page.evaluate(async (slug) => {
    const response = await fetch(`/api/ratings?slugs=${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    return response.json();
  }, SLUG);
  check(
    "B3 aggregate recalculated to 5.0 / 1",
    after?.aggregates?.[SLUG]?.avg === 5 && after?.aggregates?.[SLUG]?.count === 1,
    JSON.stringify(after)
  );
} catch (error) {
  check("verification script completed", false, String(error?.stack ?? error));
} finally {
  try {
    if (page) await deleteRows(page);
  } catch {
    // Best-effort cleanup.
  }
  if (browser) await closeBrowser(browser);
}

console.log(results.join("\n"));
if (errors.length > 0) {
  console.error(`\n${errors.length} problem(s):`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}
console.log(`\nall ${results.length} checks passed`);

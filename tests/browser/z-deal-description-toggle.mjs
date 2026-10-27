import { dismissPromo } from "../helpers/promo.mjs";

/**
 * Deal-card description expand/collapse regression.
 *
 * Live promotions carry long terms, so the first cards are a real overflow
 * fixture. The test verifies:
 * - the default preview is clamped to three lines and exposes a toggle only
 *   when the rendered text actually overflows;
 * - expanding removes the clamp and reveals the full text;
 * - collapsing keeps the text unclamped while max-height animates, then
 *   reapplies the clamp so the final preview gets its ellipsis;
 * - the toggle is an accessible button wired to the description via
 *   aria-expanded / aria-controls;
 * - EN and mobile (375px) labels and layout behave the same.
 */

const { getBrowser, getPage, closeBrowser } = await import(
  new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url).href
);

const BASE = "http://localhost:3000";
const CARD = '[data-testid="deal-card"]';
const DESC = '[data-testid="deal-description"]';
const TOGGLE = '[data-testid="deal-description-toggle"]';

const results = [];
const errors = [];
const pageErrors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readCards = (page) =>
  page.evaluate(() => {
    return [...document.querySelectorAll('[data-testid="deal-card"]')].map((card) => {
      const desc = card.querySelector('[data-testid="deal-description"]');
      const toggle = card.querySelector('[data-testid="deal-description-toggle"]');
      const wrap = desc?.parentElement ?? null;
      const descStyle = desc ? getComputedStyle(desc) : null;
      const wrapStyle = wrap ? getComputedStyle(wrap) : null;
      return {
        title: card.querySelector("h2")?.textContent?.trim() ?? "",
        descId: desc?.id ?? null,
        descCount: card.querySelectorAll('[data-testid="deal-description"]').length,
        descText: desc?.textContent?.trim() ?? "",
        clamped: desc?.classList.contains("line-clamp-3") ?? false,
        lineClamp: descStyle?.webkitLineClamp ?? null,
        clientHeight: desc?.clientHeight ?? 0,
        scrollHeight: desc?.scrollHeight ?? 0,
        wrapperHeight: wrap?.getBoundingClientRect().height ?? 0,
        transitionProperty: wrapStyle?.transitionProperty ?? null,
        transitionDuration: wrapStyle?.transitionDuration ?? null,
        toggle: toggle
          ? {
              tag: toggle.tagName,
              type: toggle.getAttribute("type"),
              label: toggle.textContent?.trim() ?? "",
              expanded: toggle.getAttribute("aria-expanded"),
              controls: toggle.getAttribute("aria-controls"),
            }
          : null,
      };
    });
  });

const first = (cards) => cards[0];

let browser;
try {
  browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 900 } });
  const page = await getPage(browser);
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(`${BASE}/vi/deals`, { waitUntil: "networkidle2", timeout: 90000 });
  await dismissPromo(page);
  await page.waitForSelector(DESC, { timeout: 30000 });
  await sleep(500);

  const initial = await readCards(page);
  check("D0 deal cards rendered", initial.length > 0, `cards=${initial.length}`);
  check(
    "D1 every card has exactly one description element",
    initial.every((card) => card.descCount === 1 && card.descText.length > 0),
    JSON.stringify(initial.map((card) => ({ title: card.title, count: card.descCount })))
  );

  const withToggle = initial.filter((card) => card.toggle);
  check("D2 overflowing descriptions expose a toggle", withToggle.length > 0, `toggles=${withToggle.length}`);
  check(
    "D3 default preview is clamped to three lines",
    withToggle.every(
      (card) => card.clamped && card.lineClamp === "3" && card.clientHeight < card.scrollHeight
    ),
    JSON.stringify(
      withToggle.map((card) => ({
        clamped: card.clamped,
        lineClamp: card.lineClamp,
        client: card.clientHeight,
        scroll: card.scrollHeight,
      }))
    )
  );
  check(
    "D4 toggle is an accessible button wired to its description",
    withToggle.every(
      (card) =>
        card.toggle?.tag === "BUTTON" &&
        card.toggle.type === "button" &&
        card.toggle.expanded === "false" &&
        card.toggle.label === "Xem thêm" &&
        card.toggle.controls === card.descId
    ),
    JSON.stringify(withToggle.map((card) => card.toggle))
  );
  check(
    "D5 descriptions that fit do not render a toggle",
    initial
      .filter((card) => !card.toggle)
      .every((card) => card.clientHeight >= card.scrollHeight - 1),
    JSON.stringify(initial.filter((card) => !card.toggle).map((card) => card.title))
  );

  const initialFirst = first(initial);
  check(
    "D6 collapse transition targets max-height for 300ms",
    initialFirst.transitionProperty === "max-height" &&
      initialFirst.transitionDuration === "0.3s",
    JSON.stringify({
      property: initialFirst.transitionProperty,
      duration: initialFirst.transitionDuration,
    })
  );

  // --- expand
  await page.click(`${CARD} ${TOGGLE}`);
  await sleep(80);
  const expanding = first(await readCards(page));
  await sleep(400);
  const expanded = first(await readCards(page));
  check(
    "D7 clicking Xem thêm switches to Thu gọn and removes the clamp",
    expanded.toggle?.expanded === "true" &&
      expanded.toggle.label === "Thu gọn" &&
      !expanded.clamped,
    JSON.stringify(expanded.toggle)
  );
  check(
    "D8 expanded text is fully visible",
    expanded.clientHeight >= expanded.scrollHeight - 1 &&
      expanded.clientHeight > initialFirst.clientHeight,
    JSON.stringify({
      initial: initialFirst.clientHeight,
      expanded: expanded.clientHeight,
      scroll: expanded.scrollHeight,
    })
  );
  check(
    "D9 the description box grows during expansion",
    expanding.wrapperHeight > initialFirst.wrapperHeight + 1 &&
      expanded.wrapperHeight > initialFirst.wrapperHeight + 1,
    JSON.stringify({
      initial: initialFirst.wrapperHeight,
      mid: expanding.wrapperHeight,
      final: expanded.wrapperHeight,
    })
  );

  // --- collapse
  await page.click(`${CARD} ${TOGGLE}`);
  await sleep(80);
  const collapsing = first(await readCards(page));
  await sleep(400);
  const collapsed = first(await readCards(page));
  check(
    "D10 clicking Thu gọn switches back to Xem thêm immediately",
    collapsing.toggle?.expanded === "false" && collapsing.toggle.label === "Xem thêm",
    JSON.stringify(collapsing.toggle)
  );
  check(
    "D11 collapse keeps the text unclamped while the height animates",
    !collapsing.clamped && collapsing.clientHeight >= collapsing.scrollHeight - 1,
    JSON.stringify({
      clamped: collapsing.clamped,
      client: collapsing.clientHeight,
      scroll: collapsing.scrollHeight,
    })
  );
  check(
    "D12 collapse reapplies the three-line clamp after the transition",
    collapsed.clamped &&
      collapsed.lineClamp === "3" &&
      collapsed.clientHeight < collapsed.scrollHeight &&
      Math.abs(collapsed.wrapperHeight - initialFirst.wrapperHeight) <= 2,
    JSON.stringify({
      clamped: collapsed.clamped,
      client: collapsed.clientHeight,
      scroll: collapsed.scrollHeight,
      wrapper: collapsed.wrapperHeight,
      initialWrapper: initialFirst.wrapperHeight,
    })
  );

  // --- English labels
  await page.goto(`${BASE}/en/deals`, { waitUntil: "networkidle2", timeout: 90000 });
  await dismissPromo(page);
  await page.waitForSelector(TOGGLE, { timeout: 30000 });
  await sleep(400);
  const enInitial = await page.evaluate(() => {
    const toggle = document.querySelector('[data-testid="deal-description-toggle"]');
    return {
      label: toggle?.textContent?.trim() ?? "",
      expanded: toggle?.getAttribute("aria-expanded"),
    };
  });
  await page.click(TOGGLE);
  await sleep(400);
  const enExpanded = await page.evaluate(() => {
    const toggle = document.querySelector('[data-testid="deal-description-toggle"]');
    return {
      label: toggle?.textContent?.trim() ?? "",
      expanded: toggle?.getAttribute("aria-expanded"),
    };
  });
  check(
    "D13 EN labels are Read more / Show less",
    enInitial.label === "Read more" &&
      enInitial.expanded === "false" &&
      enExpanded.label === "Show less" &&
      enExpanded.expanded === "true",
    JSON.stringify({ initial: enInitial, expanded: enExpanded })
  );

  // --- mobile 375px
  await page.setViewport({ width: 375, height: 812 });
  await page.goto(`${BASE}/vi/deals`, { waitUntil: "networkidle2", timeout: 90000 });
  await dismissPromo(page);
  await page.waitForSelector(TOGGLE, { timeout: 30000 });
  await sleep(400);
  const mobile = await page.evaluate(() => {
    const toggle = document.querySelector('[data-testid="deal-description-toggle"]');
    return {
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      toggles: document.querySelectorAll('[data-testid="deal-description-toggle"]').length,
      label: toggle?.textContent?.trim() ?? "",
    };
  });
  await page.click(TOGGLE);
  await sleep(400);
  const mobileExpanded = await page.evaluate(() => {
    const toggle = document.querySelector('[data-testid="deal-description-toggle"]');
    return {
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      label: toggle?.textContent?.trim() ?? "",
      expanded: toggle?.getAttribute("aria-expanded"),
    };
  });
  check(
    "D14 mobile keeps the toggle and stays within the viewport",
    mobile.overflow <= 0 &&
      mobile.toggles > 0 &&
      mobile.label === "Xem thêm" &&
      mobileExpanded.overflow <= 0 &&
      mobileExpanded.label === "Thu gọn" &&
      mobileExpanded.expanded === "true",
    JSON.stringify({ mobile, mobileExpanded })
  );

  check("D15 zero page errors", pageErrors.length === 0, JSON.stringify(pageErrors));
} catch (error) {
  check("verification script completed", false, String(error?.stack ?? error));
} finally {
  if (browser) await closeBrowser(browser);
}

console.log(results.join("\n"));
if (errors.length > 0) {
  console.error(`\n${errors.length} check(s) failed: ${errors.join(", ")}`);
  process.exit(1);
}
console.log("\nall deal description toggle checks passed");

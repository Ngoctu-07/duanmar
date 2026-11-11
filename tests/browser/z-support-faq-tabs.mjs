import { dismissPromo } from "../helpers/promo.mjs";

/**
 * /support refactor regression:
 * - hero keeps the display title, subtitle uses the new copy;
 * - the oversized "Hướng dẫn đặt tour" heading is gone, replaced by two
 *   standard-font tabs (brand-red active state) directly under the hero;
 * - accordions filter by tab, carry no numeric prefixes, animate 300ms and
 *   rotate the chevron;
 * - the framed bottom contact box renders the red rectangular CTA in EN + VI.
 */

const { getBrowser, getPage, closeBrowser } = await import(
  new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url).href
);

const BASE = "http://localhost:3000";
const results = [];
const errors = [];
const pageErrors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readPage = (page) =>
  page.evaluate(() => {
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    const items = [...document.querySelectorAll('[data-testid="support-faq-item"]')];
    const questions = items.map((el) => el.querySelector('[data-testid="support-faq-question"]'));
    const firstPanel = items[0]?.querySelector('[id^="support-faq-panel-"]');
    const firstChevron = questions[0]?.querySelector("svg");
    const contact = document.querySelector('[data-testid="support-contact-box"]');
    const cta = document.querySelector('[data-testid="support-contact-cta"]');
    const headings = [...document.querySelectorAll("h1, h2")].map((h) => h.innerText.trim());
    return {
      heading: document.querySelector("h1")?.innerText ?? null,
      headings,
      tabs: tabs.map((tab) => {
        const style = cs(tab);
        return {
          label: tab.innerText.trim(),
          selected: tab.getAttribute("aria-selected"),
          font: style.fontFamily,
          color: style.color,
          borderWidth: style.borderBottomWidth,
          borderColor: style.borderBottomColor,
        };
      }),
      items: items.map((el) => el.getAttribute("data-faq-id")),
      questions: questions.map((q) => q?.innerText.trim() ?? ""),
      expanded: questions.map((q) => q?.getAttribute("aria-expanded")),
      panelTransition: firstPanel ? cs(firstPanel).transitionDuration : null,
      panelRows: firstPanel ? cs(firstPanel).gridTemplateRows : null,
      panelHeight: firstPanel ? Math.round(firstPanel.getBoundingClientRect().height) : null,
      chevronTransform: firstChevron ? cs(firstChevron).transform : null,
      chevronRotate: firstChevron ? cs(firstChevron).rotate : null,
      stepCards: document.querySelectorAll('[data-testid^="booking-step-"]').length,
      emailLink: document.querySelector('[data-testid="support-email-link"]')?.innerText.trim() ?? null,
      contact: contact
        ? {
            text: contact.innerText.replace(/\n+/g, " | "),
            border: cs(contact).borderTopColor,
            bg: cs(contact).backgroundColor,
            width: Math.round(contact.getBoundingClientRect().width),
            paddingTop: cs(contact).paddingTop,
          }
        : null,
      cta: cta
        ? {
            text: cta.innerText.trim(),
            href: cta.getAttribute("href"),
            bg: cs(cta).backgroundColor,
            color: cs(cta).color,
            radius: cs(cta).borderTopLeftRadius,
            weight: cs(cta).fontWeight,
            transform: cs(cta).textTransform,
            size: cs(cta).fontSize,
            paddingTop: cs(cta).paddingTop,
            paddingLeft: cs(cta).paddingLeft,
            cursor: cs(cta).cursor,
          }
        : null,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });

const click = async (page, testid) => {
  await page.click(`[data-testid="${testid}"]`);
  await sleep(400);
};

let browser;
try {
  browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 900 } });
  const page = await getPage(browser);
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const response = await page.goto(`${BASE}/vi/support`, {
    waitUntil: "networkidle2",
    timeout: 90000,
  });
  await dismissPromo(page);
  await sleep(400);

  const vi = await readPage(page);

  check("S1 support page answers 200", (response?.status() ?? 0) === 200, `status=${response?.status()}`);
  check(
    "S2 hero title kept, old how-to-book heading removed",
    vi.heading?.includes("HỖ TRỢ") &&
      !vi.headings.some((text) => text.includes("HƯỚNG DẪN ĐẶT TOUR")),
    JSON.stringify(vi.headings)
  );
  check(
    "S3 two category tabs under the hero",
    vi.tabs.length === 2 &&
      vi.tabs[0].label === "Hướng dẫn đặt tour" &&
      vi.tabs[1].label === "Sức khỏe",
    JSON.stringify(vi.tabs.map((tab) => tab.label))
  );
  check(
    "S4 tab labels use the standard body face (not Gypsy)",
    vi.tabs.every((tab) => /Barlow/i.test(tab.font) && !/Gypsy/i.test(tab.font)),
    JSON.stringify(vi.tabs.map((tab) => tab.font))
  );
  check(
    "S5 active tab is brand red with a 2px underline",
    vi.tabs[0].selected === "true" &&
      vi.tabs[1].selected === "false" &&
      vi.tabs[0].color === "rgb(179, 21, 27)" &&
      vi.tabs[0].borderWidth === "2px" &&
      vi.tabs[0].borderColor === "rgb(179, 21, 27)" &&
      vi.tabs[1].borderColor !== "rgb(179, 21, 27)",
    JSON.stringify(vi.tabs)
  );
  check(
    "S6 booking tab shows 4 unnumbered questions, all collapsed on load",
    vi.items.length === 4 &&
      vi.questions.every((q) => !/^\d+[.)]\s/.test(q)) &&
      vi.expanded.every((state) => state === "false") &&
      vi.panelHeight === 0 &&
      vi.stepCards === 5,
    JSON.stringify({
      items: vi.items,
      expanded: vi.expanded,
      panelHeight: vi.panelHeight,
      steps: vi.stepCards,
    })
  );
  check(
    "S7 panels animate height for 300ms",
    vi.panelTransition === "0.3s",
    JSON.stringify({ transition: vi.panelTransition, rows: vi.panelRows })
  );
  check(
    "S8 collapsed chevron sits unrotated",
    vi.chevronRotate === "none" || vi.chevronRotate === "0deg",
    JSON.stringify({ rotate: vi.chevronRotate, transform: vi.chevronTransform })
  );

  await click(page, "support-faq-question");
  const opened = await readPage(page);
  check(
    "S8b explicit click expands the answer, rotates the chevron and reveals the grid",
    opened.expanded[0] === "true" &&
      (opened.chevronRotate === "180deg" || opened.chevronTransform !== "none") &&
      (opened.panelHeight ?? 0) > 100 &&
      opened.stepCards === 5,
    JSON.stringify({
      expanded: opened.expanded[0],
      rotate: opened.chevronRotate,
      height: opened.panelHeight,
    })
  );

  await click(page, "support-tab-health");
  const health = await readPage(page);
  check(
    "S9 health tab filters down to its own question",
    health.items.length === 1 &&
      health.items[0] === "faq-3" &&
      /sức khỏe/i.test(health.questions[0]) &&
      health.tabs[1].selected === "true" &&
      health.tabs[1].color === "rgb(179, 21, 27)",
    JSON.stringify({ items: health.items, tabs: health.tabs.map((tab) => tab.selected) })
  );
  check(
    "S10 switching tabs keeps every panel collapsed",
    health.expanded.every((state) => state === "false") && health.panelHeight === 0,
    JSON.stringify({ expanded: health.expanded, height: health.panelHeight })
  );

  await click(page, "support-faq-question");
  const healthOpen = await readPage(page);
  check(
    "S11 health question toggles open with the same accordion mechanics",
    healthOpen.expanded[0] === "true" &&
      (healthOpen.chevronRotate === "180deg" || healthOpen.chevronTransform !== "none") &&
      (healthOpen.panelHeight ?? 0) > 0,
    JSON.stringify({
      expanded: healthOpen.expanded[0],
      rotate: healthOpen.chevronRotate,
      height: healthOpen.panelHeight,
    })
  );
  await click(page, "support-faq-question");
  const healthClosed = await readPage(page);
  check(
    "S12 clicking the health question again collapses it",
    healthClosed.expanded[0] === "false" && healthClosed.panelHeight === 0,
    JSON.stringify({ expanded: healthClosed.expanded, height: healthClosed.panelHeight })
  );

  await click(page, "support-tab-booking");
  const back = await readPage(page);
  check(
    "S13 returning to booking restores its 4 questions, all collapsed",
    back.items.length === 4 &&
      back.stepCards === 5 &&
      back.expanded.every((state) => state === "false"),
    JSON.stringify({ items: back.items, steps: back.stepCards, expanded: back.expanded })
  );

  await page.click(
    '[data-testid="support-faq-item"][data-faq-id="faq-5"] [data-testid="support-faq-question"]'
  );
  await sleep(400);
  const channels = await readPage(page);
  check(
    "S14 support-channels answer keeps the CMS email pill",
    channels.expanded[3] === "true" &&
      channels.emailLink !== null &&
      channels.emailLink.includes("@"),
    JSON.stringify({ expanded: channels.expanded, email: channels.emailLink })
  );

  await page.focus('[data-testid="support-tab-booking"]');
  await page.keyboard.press("ArrowRight");
  await sleep(400);
  const keyboardNext = await readPage(page);
  await page.keyboard.press("ArrowLeft");
  await sleep(400);
  const keyboardPrev = await readPage(page);
  check(
    "S14b keyboard arrows move + activate the tabs, panels stay collapsed",
    keyboardNext.tabs[1].selected === "true" &&
      keyboardPrev.tabs[0].selected === "true" &&
      keyboardNext.expanded.every((state) => state === "false") &&
      keyboardPrev.expanded.every((state) => state === "false"),
    JSON.stringify([
      keyboardNext.tabs.map((tab) => tab.selected),
      keyboardPrev.tabs.map((tab) => tab.selected),
    ])
  );

  check(
    "S15 contact box renders the Station Master copy",
    (back.contact?.text ?? "").includes("VẪN CÒN THẮC MẮC?") &&
      (back.contact?.text ?? "").includes("Trạm Trưởng"),
    JSON.stringify(back.contact)
  );
  check(
    "S16 contact CTA is the red rectangular brand button",
    back.cta?.text === "LIÊN HỆ CHÚNG TÔI" &&
      back.cta.bg === "rgb(179, 21, 27)" &&
      back.cta.color === "rgb(255, 255, 255)" &&
      back.cta.weight === "700" &&
      back.cta.transform === "uppercase" &&
      Number.parseFloat(back.cta.size) === 15 &&
      back.cta.paddingTop === "12px" &&
      back.cta.paddingLeft === "32px" &&
      // Site theme sets --radius: 0, so `rounded-sm` resolves to sharp corners.
      back.cta.radius === "0px" &&
      (back.cta.href ?? "").includes("/vi/contact"),
    JSON.stringify(back.cta)
  );
  check("S17 no horizontal overflow @1280", back.overflowX === false);
  check(
    "S16b contact container is ~5% tighter (48rem→45.6rem, padding −5%)",
    Math.abs((back.contact?.width ?? 0) - 729.6) <= 2 &&
      back.contact?.paddingTop === "38px" &&
      (back.contact?.width ?? 0) < 768,
    JSON.stringify({ width: back.contact?.width, paddingTop: back.contact?.paddingTop })
  );

  await page.goto(`${BASE}/en/support`, { waitUntil: "networkidle2", timeout: 90000 });
  await dismissPromo(page);
  await sleep(400);
  const en = await readPage(page);
  check(
    "S18 EN tabs, copy and CTA localize",
    en.tabs[0]?.label === "Tour Booking Guide" &&
      en.tabs[1]?.label === "Health & Safety" &&
      (en.contact?.text ?? "").includes("STILL HAVE QUESTIONS?") &&
      (en.contact?.text ?? "").includes("Station Master") &&
      en.cta?.text === "CONTACT US" &&
      (en.cta?.href ?? "").includes("/en/contact"),
    JSON.stringify({ tabs: en.tabs.map((tab) => tab.label), cta: en.cta?.text })
  );
  check("S19 EN questions carry no numeric prefixes", en.questions.every((q) => !/^\d+[.)]\s/.test(q)));

  await page.setViewport({ width: 375, height: 812 });
  await page.goto(`${BASE}/vi/support`, { waitUntil: "networkidle2", timeout: 90000 });
  await dismissPromo(page);
  await sleep(400);
  const mobile = await readPage(page);
  check("S20 375px has no horizontal overflow", mobile.overflowX === false);
  check(
    "S21 375px keeps both tabs + the red CTA",
    mobile.tabs.length === 2 && mobile.cta?.bg === "rgb(179, 21, 27)",
    JSON.stringify({ tabs: mobile.tabs.length, cta: mobile.cta?.bg })
  );

  check("S22 zero page errors", pageErrors.length === 0, JSON.stringify(pageErrors));

  await page.screenshot({ path: "tests/.output/support-faq-tabs.png", fullPage: true });
} catch (error) {
  check("S0 test harness", false, error.message);
} finally {
  if (browser) await closeBrowser(browser);
}

console.log(results.join("\n"));
console.log(
  errors.length === 0 ? "\nall support FAQ checks passed" : `\n${errors.length} FAILED: ${errors.join(", ")}`
);
process.exitCode = errors.length === 0 ? 0 : 1;

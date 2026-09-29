import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });
const vi = JSON.parse(readFileSync(new URL("../../src/messages/vi.json", import.meta.url), "utf8"));
const en = JSON.parse(readFileSync(new URL("../../src/messages/en.json", import.meta.url), "utf8"));

const TOUR_URL = "http://localhost:3000/vi/explore/destinations/hcm";
const REVIEWS_KEY = "vn-reviews:v1";
const CARD = '[data-testid="review-card"]';
const THUMB = '[data-testid="review-image-thumb"]';
const LIGHTBOX = '[data-slot="review-lightbox"]';

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

/** Replace review storage with exactly our 2 records (one photo, one without). */
const seed = (page) =>
  page.evaluate((key) => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#123456";
    ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(80, 60, 480, 360);
    const image = canvas.toDataURL("image/jpeg", 0.7);
    const now = Date.now();
    localStorage.setItem(
      key,
      JSON.stringify([
        {
          reference: "VN-N-LIGHTBOX:hcm",
          tourSlug: "hcm",
          authorName: "N Lightbox",
          authorEmail: "n-lightbox@example.com",
          rating: 4,
          comment: "Review with a photo for the lightbox test.",
          images: [image],
          createdAt: new Date(now).toISOString(),
          bookingReference: "VN-N-LIGHTBOX",
        },
        {
          reference: "VN-N-NOIMAGE:hcm",
          tourSlug: "hcm",
          authorName: "N No Image",
          authorEmail: "n-noimage@example.com",
          rating: 3,
          comment: "Review without any photo.",
          images: [],
          createdAt: new Date(now - 60_000).toISOString(),
          bookingReference: "VN-N-NOIMAGE",
        },
      ])
    );
    return image.length;
  }, REVIEWS_KEY);

const openLightbox = async (page) => {
  await page.click(THUMB);
  await page.waitForSelector(LIGHTBOX, { timeout: 10000 });
};
const closeLightbox = async (page) =>
  page.waitForFunction((sel) => !document.querySelector(sel), { timeout: 5000 }, LIGHTBOX);
const lightboxVisible = (page) => page.evaluate((sel) => Boolean(document.querySelector(sel)), LIGHTBOX);

const cleanupReviews = async (p) => {
  if (!p) return;
  await p
    .evaluate((key) => {
      const list = JSON.parse(localStorage.getItem(key) ?? "[]");
      localStorage.setItem(key, JSON.stringify(list.filter((r) => !String(r.reference ?? "").startsWith("VN-N-"))));
    }, REVIEWS_KEY)
    .catch(() => {});
};

let page;
try {
  const browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 1100 } });
  page = await getPage(browser);
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  const posts = [];
  const postCount = () => posts.filter((r) => r.method() === "POST").length;
  page.on("request", (r) => {
    if (r.url().includes("/api/contact")) posts.push(r);
  });

  // ---------- AC1: review lightbox ----------
  await page.goto(TOUR_URL, { waitUntil: "networkidle2", timeout: 60000 });
  await seed(page);
  await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  await page.waitForSelector(CARD, { timeout: 15000 });

  check("N1 exactly 2 review cards", (await page.$$(CARD)).length === 2, `count=${(await page.$$(CARD)).length}`);
  const thumbs = await page.$$eval(THUMB, (els) =>
    els.map((el) => ({
      tag: el.tagName,
      label: el.getAttribute("aria-label"),
      pressed: el.hasAttribute("aria-pressed"),
      testid: el.getAttribute("data-testid"),
      imgLen: el.querySelector("img")?.getAttribute("src")?.length ?? 0,
    }))
  );
  check("N2 single thumb is a BUTTON with aria-label", thumbs.length === 1 && thumbs[0].tag === "BUTTON" && Boolean(thumbs[0].label), JSON.stringify(thumbs));
  check("N2 thumb has no aria-pressed / foreign testid", thumbs.length === 1 && !thumbs[0].pressed && thumbs[0].testid === "review-image-thumb", JSON.stringify(thumbs[0] ?? null));
  const imgCounts = await page.$$eval(CARD, (cards) => cards.map((c) => c.querySelectorAll("img").length));
  check("N3 card img invariant (1 / 0)", JSON.stringify(imgCounts) === JSON.stringify([1, 0]), JSON.stringify(imgCounts));

  await openLightbox(page);
  check("N4 lightbox dialog visible", await lightboxVisible(page));
  check("N4 role=dialog present", Boolean(await page.$('[role="dialog"]')));
  const viewer = await page.evaluate(() => {
    const img = document.querySelector('[data-slot="review-lightbox"] img');
    const thumbImg = document.querySelector('[data-testid="review-image-thumb"] img');
    return {
      present: Boolean(img),
      outsideCard: img ? img.closest('[data-testid="review-card"]') === null : false,
      sameSrc: img && thumbImg ? img.src === thumbImg.src : false,
      naturalWidth: img ? img.naturalWidth : 0,
      thumbCount: document.querySelectorAll('[data-slot="review-lightbox"] img').length,
    };
  });
  check("N5 lightbox img renders OUTSIDE the card (portal)", viewer.outsideCard, String(viewer.outsideCard));
  check("N5 lightbox src === thumb src, decoded >0", viewer.sameSrc && viewer.naturalWidth > 0, `src match=${viewer.sameSrc} w=${viewer.naturalWidth}`);
  await page.screenshot({ path: `${OUT}/n-lightbox-01-open.png` });

  await page.click('[data-slot="review-lightbox-close"]');
  await closeLightbox(page);
  check("N6 close button dismisses lightbox", !(await lightboxVisible(page)));
  await page.screenshot({ path: `${OUT}/n-lightbox-02-closed.png` });

  await openLightbox(page);
  await page.keyboard.press("Escape");
  await closeLightbox(page);
  check("N7 Escape dismisses lightbox", !(await lightboxVisible(page)));

  await openLightbox(page);
  await page.mouse.click(10, 10);
  await closeLightbox(page).catch(() => {});
  check("N8 backdrop click dismisses lightbox", !(await lightboxVisible(page)));

  // cleanup review storage (test isolation for g/k suites)
  await cleanupReviews(page);

  // ---------- AC2: contact page + form heading ----------
  await page.goto("http://localhost:3000/vi", { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  const cta = await page.$('[data-testid="about-us-section"] a[href="/vi/contact"]');
  check("N10 homepage Contact CTA → /vi/contact", Boolean(cta));
  if (cta) {
    await cta.click();
    await page
      .waitForFunction(() => location.pathname.endsWith("/vi/contact"), { timeout: 15000 })
      .catch(() => {});
    check("N10 lands on /vi/contact", page.url().endsWith("/vi/contact"), page.url());
  }

  const contactPostsBefore = postCount();
  const nodes = await page.$$eval('a[data-testid="contact-node"]', (els) => els.map((a) => a.getAttribute("href")));
  check("N12 5 contact nodes incl tel + mailto", nodes.length === 5 && nodes.some((h) => h.startsWith("tel:")) && nodes.some((h) => h.startsWith("mailto:")), JSON.stringify(nodes));
  const heading = await page.$eval('form[data-testid="contact-form"]', (form) => ({
    firstTag: form.firstElementChild?.tagName ?? "",
    text: (form.firstElementChild?.textContent ?? "").trim(),
    labelledby: form.getAttribute("aria-labelledby"),
    firstId: form.firstElementChild?.id ?? "",
    alertCount: form.querySelectorAll('[role="alert"]').length,
    isButton: form.firstElementChild?.tagName === "BUTTON",
  }));
  check("N13 VI heading = first element, exact copy", heading.firstTag === "H2" && heading.text === vi.contact.formHeading, `${heading.firstTag} "${heading.text}"`);
  check("N13 aria-labelledby resolves to heading", heading.labelledby === heading.firstId && heading.labelledby === "contact-form-heading", `${heading.labelledby}/${heading.firstId}`);
  await (await page.$('form[data-testid="contact-form"]')).screenshot({ path: `${OUT}/n-contact-01-heading-vi.png` });

  // N14 empty submit: 4 alerts, 0 POST
  await page.click('form[data-testid="contact-form"] button[type="submit"]');
  await page
    .waitForFunction(
      () => document.querySelectorAll('[data-testid="contact-form"] [role="alert"]').length === 4,
      { timeout: 5000 }
    )
    .catch(() => {});
  const alerts = await page.$$eval('[data-testid="contact-form"] [role="alert"]', (els) => els.map((e) => e.textContent));
  check("N14 empty submit → 4 required alerts", alerts.length === 4 && alerts.every((x) => x.includes(vi.contact.form.required)), JSON.stringify(alerts));
  check("N14 heading added no extra alert (4 total)", alerts.length === 4 && heading.alertCount === 0, `pre-submit alerts=${heading.alertCount}`);
  check("N14 zero POST", postCount() === contactPostsBefore, `posts=${postCount()}`);

  // N15 valid submit → exactly 1 POST + success + cleared
  const fill = async (sel, text) => {
    await page.focus(sel);
    await page.keyboard.type(text);
  };
  await fill("#contact-name", "Nguyen Van A");
  await fill("#contact-email", "a@example.com");
  await fill("#contact-phone", "+84901234567");
  await fill("#contact-message", "Hello, I would like more info.");
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/contact") && r.request().method() === "POST", { timeout: 20000 }),
    page.click('form[data-testid="contact-form"] button[type="submit"]'),
  ]);
  check("N15 POST 200", response.status() === 200, `status=${response.status()}`);
  check("N15 exactly one POST", postCount() === contactPostsBefore + 1, `posts=${postCount()}`);
  const postReq = posts.filter((r) => r.method() === "POST").at(-1);
  const payloadKeys = Object.keys(JSON.parse(postReq?.postData() ?? "{}")).sort().join(",");
  check("N15 payload keys", payloadKeys === "email,fullName,message,phone", payloadKeys);
  await page.waitForSelector('[data-testid="contact-form-success"]', { timeout: 5000 });
  const cleared = await page.$$eval('[data-testid="contact-form"] input, [data-testid="contact-form"] textarea', (els) => els.every((e) => e.value === ""));
  check("N15 fields cleared", cleared);
  await page.screenshot({ path: `${OUT}/n-contact-03-form-success.png` });

  // N13 EN heading
  await page.goto("http://localhost:3000/en/contact", { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  const enHeading = await page.$eval('form[data-testid="contact-form"]', (form) => ({
    firstTag: form.firstElementChild?.tagName ?? "",
    text: (form.firstElementChild?.textContent ?? "").trim(),
  }));
  check("N13 EN heading = first element, exact copy", enHeading.firstTag === "H2" && enHeading.text === en.contact.formHeading, `${enHeading.firstTag} "${enHeading.text}"`);
  await (await page.$('form[data-testid="contact-form"]')).screenshot({ path: `${OUT}/n-contact-02-heading-en.png` });

  // N11 search index fix
  await page.goto("http://localhost:3000/en/search?q=contact", { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  await page.waitForSelector("main ul li a", { timeout: 15000 }).catch(() => {});
  const searchHrefs = await page.$$eval("main ul li a", (els) => els.map((a) => a.getAttribute("href")));
  check("N11 search results link to /en/contact", searchHrefs.includes("/en/contact"), JSON.stringify(searchHrefs));
  check("N11 no /about/contact results", !searchHrefs.some((h) => h.includes("/about/contact")), JSON.stringify(searchHrefs));

  check("N16 zero pageerrors", pageErrors.length === 0, pageErrors.join("; "));
  await closeBrowser(browser);
} catch (error) {
  errors.push(`fatal: ${error.message}`);
  await cleanupReviews(page);
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

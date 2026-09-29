import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });

const vi = JSON.parse(
  readFileSync(new URL("../../src/messages/vi.json", import.meta.url), "utf8")
);
const home = vi.home;
const contact = vi.contact;

const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(
      new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url)
    )
  ).href
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const errors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};

/** Self-contained env reader (same pattern as p-tours-category.mjs). */
function envValue(key) {
  if (process.env[key]) return process.env[key];
  const file = fileURLToPath(new URL("../../.env.local", import.meta.url));
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : undefined;
}

/** Live homepage About Us media (no fabricated CMS data) — plan 260929-1500. */
async function fetchHomepageMedia() {
  const projectId = envValue("NEXT_PUBLIC_SANITY_PROJECT_ID");
  const dataset = envValue("NEXT_PUBLIC_SANITY_DATASET") || "production";
  if (!projectId) return null;
  const query =
    '*[_type == "homepage"][0]{ "videoFile": aboutUsVideo.asset->url, aboutUsVideoStreamUrl, "posterUrl": aboutUsVideoPoster.asset->url }';
  const url =
    `https://${projectId}.api.sanity.io/v2026-09-25/data/query/${dataset}?query=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return (await res.json()).result ?? null;
  } catch {
    return null;
  }
}

try {
  const browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 900 } });
  const page = await getPage(browser);
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  // --- J1 header: About Us nav item removed (desktop + mobile sheet)
  await page.goto("http://localhost:3000/vi", { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  const links = await page.$$eval("header a", (els) => els.map((el) => el.getAttribute("href")));
  check("J1 header has no /about link", !links.some((h) => h && h.includes("/about")), JSON.stringify(links));
  check("J1 header keeps /deals", links.some((h) => h && h.includes("/deals")), JSON.stringify(links));
  check("J1 header keeps /blog", links.some((h) => h && h.includes("/blog")), JSON.stringify(links));
  await (await page.$("header")).screenshot({ path: `${OUT}/j1-header-desktop.png` });

  await page.setViewport({ width: 375, height: 812 });
  await sleep(300);
  await page.click('button[data-slot="sheet-trigger"]');
  await sleep(600);
  const sheet = await page.$('[role="dialog"]');
  check("J1 mobile sheet opens", Boolean(sheet));
  if (sheet) {
    const sheetLinks = await sheet.evaluate((el) =>
      [...el.querySelectorAll("a")].map((a) => a.getAttribute("href"))
    );
    check("J1 sheet has no /about", !sheetLinks.some((h) => h && h.includes("/about")), JSON.stringify(sheetLinks));
    await sheet.screenshot({ path: `${OUT}/j1-header-mobile-sheet.png` });
  }

  // --- J2 homepage About section: placement, CTA, promo video fallback
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto("http://localhost:3000/vi", { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  const sections = await page.$$('[data-testid="about-us-section"]');
  check("J2 exactly one about section", sections.length === 1, `count=${sections.length}`);
  if (sections.length === 1) {
    const prevText = await sections[0].evaluate((el) =>
      el.previousElementSibling ? el.previousElementSibling.textContent : ""
    );
    check("J2 sits directly after featured destinations", prevText.includes(home.featuredDestinations), prevText.slice(0, 80));
    const cta = await sections[0].$('a[href="/vi/contact"]');
    check("J2 CTA links to /vi/contact", Boolean(cta));
    check("J2 promo video slot present", Boolean(await sections[0].$('[data-testid="about-promo-video"]')));
    // Data-driven media contract (plan 260929-1500): video ⇔ live CMS URL, else poster fallback.
    const media = await fetchHomepageMedia();
    check("J2 live homepage media query succeeds", media !== null, JSON.stringify(media));
    const expectedVideo = media ? media.videoFile ?? media.aboutUsVideoStreamUrl ?? null : null;
    const videoNode = await sections[0].$('[data-testid="about-promo-video"] video');
    const posterImg = await sections[0].$('[data-testid="about-promo-video"] img');
    const play = await sections[0].$('[data-testid="about-promo-play"]');
    check("J2 no click-to-play overlay (background autoplay)", !play, play ? "overlay present" : "");
    if (expectedVideo) {
      const attrs = videoNode
        ? await videoNode.evaluate((v) => ({
            src: v.getAttribute("src") || "",
            autoplay: v.autoplay,
            muted: v.muted,
            loop: v.loop,
            playsInline: v.playsInline,
          }))
        : null;
      check(
        "J2 CMS video rendered with autoPlay/muted/loop/playsInline",
        Boolean(attrs) &&
          (attrs.src === expectedVideo || attrs.src.includes(expectedVideo)) &&
          attrs.autoplay &&
          attrs.muted &&
          attrs.loop &&
          attrs.playsInline,
        JSON.stringify({ attrs, expectedVideo })
      );
    } else {
      const posterBox = posterImg
        ? await posterImg.evaluate((i) => ({ w: i.clientWidth, h: i.clientHeight }))
        : null;
      check(
        "J2 no CMS video → static poster fills slot (grid intact)",
        !videoNode && Boolean(posterImg) && posterBox.w > 0 && posterBox.h > 0,
        JSON.stringify({ video: Boolean(videoNode), posterBox })
      );
    }
    await sections[0].screenshot({ path: `${OUT}/j2-about-section.png` });
  }

  // --- J3 contact page: 5 oversized contact nodes, correct href types
  await page.goto("http://localhost:3000/vi/contact", { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  const nodes = await page.$$('a[data-testid="contact-node"]');
  check("J3 five contact nodes", nodes.length === 5, `count=${nodes.length}`);
  const hrefs = await page.$$eval('a[data-testid="contact-node"]', (els) =>
    els.map((el) => el.getAttribute("href"))
  );
  const expected = ["tel:", "mailto:", "facebook.com", "instagram.com", "tiktok.com"];
  expected.forEach((needle, i) =>
    check(`J3 node ${i} href has ${needle}`, (hrefs[i] || "").includes(needle), hrefs[i] || "missing")
  );
  for (const [i, el] of nodes.entries()) {
    const box = await el.boundingBox();
    check(`J3 node ${i} oversized (>80px wide)`, Boolean(box && box.width > 80), box ? `${Math.round(box.width)}px` : "no box");
  }

  // --- J4 form: empty submit blocks (0 POST), valid submit → 1 POST + success
  const contactPosts = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/contact")) contactPosts.push(r);
  });
  const fill = async (selector, text) => {
    await page.focus(selector);
    await page.keyboard.type(text);
  };
  const clickSubmit = async () => {
    await page.click('form[data-testid="contact-form"] button[type="submit"]');
  };

  await clickSubmit();
  await page
    .waitForFunction(
      () => document.querySelectorAll('[data-testid="contact-form"] [role="alert"]').length === 4,
      { timeout: 5000 }
    )
    .catch(() => {});
  const fieldErrors = await page.$$eval('[data-testid="contact-form"] [role="alert"]', (els) =>
    els.map((el) => el.textContent)
  );
  check(
    "J4 empty submit → 4 required field errors",
    fieldErrors.length === 4 && fieldErrors.every((text) => text.includes(contact.form.required)),
    JSON.stringify(fieldErrors)
  );
  check("J4 empty submit → zero POST", contactPosts.length === 0, `posts=${contactPosts.length}`);

  await fill("#contact-name", "Nguyen Van A");
  await fill("#contact-email", "a@example.com");
  await fill("#contact-phone", "+84901234567");
  await fill("#contact-message", "Hello, I would like more info.");
  const [response] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/contact") && r.request().method() === "POST"
    ),
    clickSubmit(),
  ]);
  check("J4 POST responded 200", response.status() === 200, `status=${response.status()}`);
  const postReq = contactPosts[0];
  const contentType = (postReq && postReq.headers()["content-type"]) || "";
  check("J4 request content-type JSON", contentType.includes("application/json"), contentType);
  const payload = JSON.parse((postReq && postReq.postData()) || "{}");
  const payloadKeys = Object.keys(payload).sort().join(",");
  check("J4 payload keys", payloadKeys === "email,fullName,message,phone", payloadKeys);
  check("J4 exactly one POST", contactPosts.length === 1, `posts=${contactPosts.length}`);
  await page.waitForSelector('[data-testid="contact-form-success"]', { timeout: 5000 });
  const successText = await page.$eval('[data-testid="contact-form-success"]', (el) => el.textContent);
  check("J4 success message shown", successText.includes(contact.form.success.slice(0, 20)), successText.slice(0, 60));
  const cleared = await page.$$eval('[data-testid="contact-form"] input, [data-testid="contact-form"] textarea', (els) =>
    els.every((el) => el.value === "")
  );
  check("J4 fields cleared after success", cleared);
  await page.screenshot({ path: `${OUT}/j4-form-success.png` });

  // --- J5 legacy URL: 308 → /vi/contact; /vi/about untouched
  const res = await fetch("http://localhost:3000/vi/about/contact", { redirect: "manual" });
  check("J5 old URL → 308/307", res.status === 308 || res.status === 307, `status=${res.status}`);
  const location = res.headers.get("location") || "";
  check("J5 location ends with /vi/contact", location.endsWith("/vi/contact"), location);
  const about = await fetch("http://localhost:3000/vi/about");
  check("J5 /vi/about still 200", about.status === 200, `status=${about.status}`);
} catch (e) {
  errors.push(`exception: ${e.message}`);
} finally {
  await closeBrowser();
}

console.log(results.join("\n"));
if (errors.length) console.log("\nERRORS:\n" + errors.join("\n"));
process.exit(errors.length ? 1 : 0);

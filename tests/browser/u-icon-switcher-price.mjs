import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolveTourPricingFixture } from "../helpers/cms-expectations.mjs";
import { dismissPromo } from "../helpers/promo.mjs";
import { revealHomeHeader } from "../helpers/header-reveal.mjs";

/**
 * Plan 260930-1705 — U1..U9 downscale authority (supersedes 1544 thresholds):
 * icons → 83.33% of their upscaled state (nearest Tailwind step) + stroke 1.5,
 * locale switcher compact/slim, chatbot trigger → 60%, contextual prices
 * (cards 60% / detail+checkout 80%), all price weights font-semibold.
 */
const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });

const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url))
  ).href
);

const BASE = "http://localhost:3000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const errors = [];
const skips = [];
const pageErrors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};
/** Loud skip: counted + printed, never a `check(..., true)` placeholder. */
const skip = (name, detail) => {
  const line = `SKIP ${name}${detail ? ` :: ${detail}` : ""}`;
  skips.push(line);
  results.push(line);
  console.warn(`SKIPPED: ${line}`);
};
const near = (v, exp, tol = 1) => typeof v === "number" && Math.abs(v - exp) <= tol;
const fs = (v) => parseFloat(v);
const fw = (v) => Number(v);
const goto = async (page, path) => {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
};
/** Geometry (±1px) + selected computed styles for one element. */
const readStyle = (page, sel, keys = []) =>
  page
    .$eval(sel, (el, ks) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), ...Object.fromEntries(ks.map((k) => [k, cs[k]])) };
    }, keys)
    .catch(() => null);

try {
  const browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 900 } });
  const page = await getPage(browser);
  page.on("pageerror", (e) => pageErrors.push(e.message));
  const readSwitcher = () =>
    page.evaluate(() => {
      const g = document.querySelector('header [role="group"]');
      if (!g) return null;
      return {
        h: g.getBoundingClientRect().height,
        fs: parseFloat(getComputedStyle(g).fontSize),
        buttons: [...g.querySelectorAll("button")].map((b) => {
          const cs = getComputedStyle(b);
          return { text: b.textContent.trim(), current: b.getAttribute("aria-current"), fw: Number(cs.fontWeight), fs: parseFloat(cs.fontSize), opacity: Number(cs.opacity), bg: cs.backgroundColor, color: cs.color, h: b.getBoundingClientRect().height };
        }),
      };
    });

  // --- U1 header icons (desktop /vi)
  await goto(page, "/vi");
  const [u1s, u1t, u1b1, u1b2] = await Promise.all([
    readStyle(page, 'header a[aria-label="Tìm kiếm"] svg', ["strokeWidth"]),
    readStyle(page, 'header a[aria-label="Tài khoản"] svg', ["strokeWidth"]),
    readStyle(page, 'header a[aria-label="Tìm kiếm"]'),
    readStyle(page, 'header a[aria-label="Tài khoản"]'),
  ]);
  check("U1 search icon 24×24 (size-6 beats Button size-4)", u1s && near(u1s.w, 24) && near(u1s.h, 24), JSON.stringify(u1s));
  check("U1 account icon 24×24", u1t && near(u1t.w, 24) && near(u1t.h, 24), JSON.stringify(u1t));
  check("U1 icon buttons stay 36×36", [u1b1, u1b2].every((b) => b && near(b.w, 36) && near(b.h, 36)), JSON.stringify([u1b1, u1b2]));
  check(
    "U1 header icon strokes ≤1.5 (S1)",
    [u1s, u1t].every((s) => s && fs(s.strokeWidth) <= 1.5),
    JSON.stringify([u1s?.strokeWidth, u1t?.strokeWidth])
  );

  // --- U2 hero/search/nav-tile icons
  const u2a = await page.evaluate(() => {
    const svg = [...document.querySelectorAll("main svg.lucide-search")].find((s) => (s.getAttribute("class") || "").includes("absolute"));
    const input = svg?.parentElement?.querySelector("input");
    if (!svg || !input) return null;
    const s = svg.getBoundingClientRect();
    const i = input.getBoundingClientRect();
    return { w: Math.round(s.width), h: Math.round(s.height), left: s.left, right: s.right, inputLeft: i.left, stroke: getComputedStyle(svg).strokeWidth };
  });
  check("U2 hero search adornment 20×20", u2a && near(u2a.w, 20) && near(u2a.h, 20), JSON.stringify(u2a));
  check("U2 hero adornment inside pl-10 content edge", u2a && u2a.left >= 0 && u2a.right <= u2a.inputLeft + 41, `left=${u2a?.left.toFixed(1)} right=${u2a?.right.toFixed(1)} edge=${(u2a.inputLeft + 40).toFixed(1)}`);
  const u2b = await page.$$eval("section.py-8 svg", (els) => els.map((el) => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), stroke: getComputedStyle(el).strokeWidth }; }));
  // The legacy quick-access strip (`section.py-8`) was removed from the
  // homepage; only assert its icon metrics when such a section exists again.
  if (u2b.length === 0) {
    skip("U2 quick-access icons ×2 all 24×24", "no section.py-8 quick-access block on the homepage");
  } else {
    check("U2 quick-access icons ×2 all 24×24", u2b.length === 2 && u2b.every((s) => near(s.w, 24) && near(s.h, 24)), JSON.stringify(u2b));
  }
  check(
    "U2 hero + quick-access strokes ≤1.5 (S2, S3)",
    Boolean(u2a) && fs(u2a.stroke) <= 1.5 && u2b.every((s) => fs(s.stroke) <= 1.5),
    JSON.stringify({ hero: u2a?.stroke, quick: u2b.map((s) => s.stroke) })
  );
  await goto(page, "/vi/search");
  const u2c = await readStyle(page, "main svg.lucide-search.absolute", ["strokeWidth"]);
  check("U2 search-page input adornment 20×20", u2c && near(u2c.w, 20) && near(u2c.h, 20), JSON.stringify(u2c));
  check("U2 search-page adornment stroke ≤1.5", u2c && fs(u2c.strokeWidth) <= 1.5, u2c?.strokeWidth);

  // --- U3 locale switcher active/inactive styles
  await goto(page, "/vi");
  const u3 = await readSwitcher();
  check("U3 group height 28–34 + font ≥12", u3 && u3.h >= 28 && u3.h <= 34 && u3.fs >= 12, JSON.stringify(u3 && { h: u3.h, fs: u3.fs }));
  check("U3 two buttons {en,vi} each 26–32 high", u3 && u3.buttons.length === 2 && u3.buttons.every((b) => b.h >= 26 && b.h <= 32 && ["en", "vi"].includes(b.text)), JSON.stringify(u3?.buttons.map((b) => b.text)));
  const active = u3?.buttons.find((b) => b.current === "true");
  const inactive = u3?.buttons.find((b) => b.text === "en");
  const opaque = (c) => Boolean(c) && c !== "rgba(0, 0, 0, 0)" && c !== "transparent";
  check("U3 active vi: aria-current=true, fw 600–700, opacity=1, bg painted", active && active.text === "vi" && active.fw >= 600 && active.fw <= 700 && active.opacity === 1 && opaque(active.bg), JSON.stringify(active));
  check("U3 inactive en: no aria-current, opacity≤0.65, muted colour", inactive && !inactive.current && inactive.opacity <= 0.65 && inactive.color !== active?.color, JSON.stringify(inactive));
  check("U3 inequality pair (historical bug: both rendered identically)", active && inactive && active.fw > inactive.fw && active.opacity > inactive.opacity, `fw ${active?.fw}>${inactive?.fw} · opacity ${active?.opacity}>${inactive?.opacity}`);

  // --- U4 switcher interaction (state flip + switchLocale regression)
  await page.evaluate(() => {
    const g = document.querySelector('header [role="group"]');
    [...g.querySelectorAll("button")].find((b) => b.textContent.trim() === "en")?.click();
  });
  await page.waitForFunction(() => location.pathname.startsWith("/en"), { timeout: 20000 });
  await page.waitForSelector('header [role="group"] button', { timeout: 20000 });
  await dismissPromo(page);
  const u4 = await readSwitcher();
  const u4a = u4?.buttons.find((b) => b.current === "true");
  const u4v = u4?.buttons.find((b) => b.text === "vi");
  check("U4 click en → /en, en active fw 600–700 opacity=1", u4a && u4a.text === "en" && u4a.fw >= 600 && u4a.fw <= 700 && u4a.opacity === 1, JSON.stringify(u4a));
  check("U4 vi demoted (no aria-current, opacity≤0.65)", u4v && !u4v.current && u4v.opacity <= 0.65, JSON.stringify(u4v));

  // --- U5 chatbot trigger (desktop /vi): brand-red ghost asset, no clipping
  await goto(page, "/vi");
  await revealHomeHeader(page);
  const u5 = await page.evaluate(() => {
    const b = document.querySelector('[data-testid="assistant-trigger"]');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    const solid = b.querySelector('[data-testid="ghost-body"]');
    const outline = b.querySelector('[data-testid="ghost-outline"]');
    const scs = solid ? getComputedStyle(solid) : null;
    const ocs = outline ? getComputedStyle(outline) : null;
    return {
      w: r.width,
      h: r.height,
      right: r.right,
      bottom: r.bottom,
      vw: window.innerWidth,
      vh: window.innerHeight,
      overflow: getComputedStyle(b).overflow,
      aspect: getComputedStyle(b).aspectRatio,
      outlineOverflow: ocs?.overflow ?? null,
      rootOverflow: (() => {
        const root = document.querySelector('[data-testid="assistant-widget"]');
        return root ? getComputedStyle(root).overflow : null;
      })(),
      rootRight: (() => {
        const root = document.querySelector('[data-testid="assistant-widget"]');
        return root ? getComputedStyle(root).right : null;
      })(),
      rootBottom: (() => {
        const root = document.querySelector('[data-testid="assistant-widget"]');
        return root ? getComputedStyle(root).bottom : null;
      })(),
      solidTag: solid?.tagName ?? null,
      solidImage: scs?.backgroundImage ?? "",
      outlineImage: ocs?.backgroundImage ?? "",
      visible: Boolean(b.offsetParent),
      expanded: b.getAttribute("aria-expanded"),
      label: b.getAttribute("aria-label"),
    };
  });
  check("U5 trigger box is a full 64px square", u5 && near(u5.w, 64) && near(u5.h, 64) && u5.aspect === "1 / 1", `w=${u5?.w} h=${u5?.h} aspect=${u5?.aspect}`);
  check(
    "U5 brand-red ghost artwork paints the solid + outline layers (object-contain letterbox)",
    u5 &&
      u5.solidTag === "SPAN" &&
      u5.solidImage.includes("/images/ghost-icon.svg") &&
      u5.outlineImage.includes("/images/ghost-icon-outline.svg"),
    JSON.stringify(u5 && { tag: u5.solidTag, solid: u5.solidImage, outline: u5.outlineImage })
  );
  const u5svg = await page.evaluate(async () => {
    const response = await fetch("/images/ghost-icon.svg");
    return response.ok ? await response.text() : "";
  });
  check(
    "U5 ghost SVG is the arcade silhouette in brand red #8B0000 with 2 eyes + open mouth",
    u5svg.includes('fill="#8B0000"') &&
            u5svg.includes('d="M14 49C13.4 41 13.8 32.8 15.6 25.4') &&
      (u5svg.match(/<ellipse/g) ?? []).length === 3,
    JSON.stringify({ fill8B: u5svg.includes('fill="#8B0000"'), ellipses: (u5svg.match(/<ellipse/g) ?? []).length })
  );
  check(
    "U5 nothing clips the artwork on the FAB chain (root, wrapper, trigger, layers)",
    u5 && u5.overflow === "visible" && u5.rootOverflow === "visible" && u5.outlineOverflow === "visible",
    JSON.stringify(u5 && { root: u5.rootOverflow, trigger: u5.overflow, layer: u5.outlineOverflow })
  );
  check(
    "U5 FAB wrapper uses a snug 20px corner inset (float stays 20–30px from bottom)",
    u5 &&
      u5.rootRight === "20px" &&
      u5.rootBottom === "20px" &&
      u5.vw - u5.right >= 19.5 &&
      u5.vh - u5.bottom >= 19.5 &&
      u5.vh - u5.bottom <= 30.5,
    JSON.stringify(u5 && { rootRight: u5.rootRight, rootBottom: u5.rootBottom, right: u5.vw - u5.right, bottom: u5.vh - u5.bottom })
  );
  check("U5 visible + aria-expanded=false + aria-label", u5 && u5.visible && u5.expanded === "false" && Boolean(u5.label), JSON.stringify(u5));

  // --- U5b symmetry + viewBox-margin proof, measured on the artwork itself:
  // rasterize the served asset, mirror the alpha columns and read the bbox in
  // viewBox units. Asymmetry (the previous asset leaked 3.5 units further on the
  // right than the left and overflowed the 64-unit viewBox) fails both.
  const u5b = await page.evaluate(async () => {
    const response = await fetch("/images/ghost-icon.svg");
    if (!response.ok) return null;
    const xml = await response.text();
    const img = new Image();
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(xml)));
    await img.decode();
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    let minX = size;
    let maxX = -1;
    let minY = size;
    let maxY = -1;
    let worstMirrorDiff = 0;
    let leftMass = 0;
    let rightMass = 0;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const alpha = data[(y * size + x) * 4 + 3];
        if (alpha > 8) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    for (let x = 0; x < size / 2; x += 1) {
      let a = 0;
      let b = 0;
      for (let y = 0; y < size; y += 1) {
        a += data[(y * size + x) * 4 + 3];
        b += data[(y * size + (size - 1 - x)) * 4 + 3];
      }
      leftMass += a;
      rightMass += b;
      worstMirrorDiff = Math.max(worstMirrorDiff, Math.abs(a - b) / 255);
    }
    const unit = size / 64;
    return {
      minX: minX / unit,
      maxX: maxX / unit,
      minY: minY / unit,
      maxY: maxY / unit,
      centerX: (minX + maxX) / 2 / unit,
      worstMirrorDiff,
      massImbalancePct: Math.abs((leftMass - rightMass) / ((leftMass + rightMass) / 2)) * 100,
    };
  });
  const r1 = (v) => (typeof v === "number" ? Math.round(v * 10) / 10 : v);
  check(
    "U5b ghost is horizontally mirror-symmetrical (silhouette + features)",
    u5b && u5b.worstMirrorDiff <= 3 && u5b.massImbalancePct <= 1 && Math.abs(u5b.centerX - 32) <= 0.6,
    JSON.stringify(u5b && { centerX: r1(u5b.centerX), worstMirrorDiff: r1(u5b.worstMirrorDiff), massImbalancePct: r1(u5b.massImbalancePct) })
  );
  check(
    "U5b artwork stays inside the 64-unit viewBox with ≥8 units of margin",
    u5b && u5b.minX >= 8 && u5b.maxX <= 56 && u5b.minY >= 8 && u5b.maxY <= 56,
    JSON.stringify(u5b && { minX: r1(u5b.minX), maxX: r1(u5b.maxX), minY: r1(u5b.minY), maxY: r1(u5b.maxY) })
  );
  // Tight crop on the trigger box so the red artwork + edge insets are visually
  // verifiable (an element screenshot cannot clip the artwork the page clipped).
  const u5shot = await page.$('[data-testid="assistant-trigger"]');
  if (u5shot) await u5shot.screenshot({ path: `${OUT}/u-ghost-01-desktop.png` });

  // --- U6 mobile 375×812
  await page.setViewport({ width: 375, height: 812 });
  await sleep(400);
  const u6ov = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  check("U6 /vi no horizontal overflow @375", u6ov.sw <= u6ov.iw, JSON.stringify(u6ov));
  const u6menu = await readStyle(page, 'button[data-slot="sheet-trigger"] svg', ["strokeWidth"]);
  check("U6 sheet-trigger icon 24×24", u6menu && near(u6menu.w, 24) && near(u6menu.h, 24), JSON.stringify(u6menu));
  check("U6 sheet-trigger stroke ≤1.5 (S5)", u6menu && fs(u6menu.strokeWidth) <= 1.5, u6menu?.strokeWidth);
  await revealHomeHeader(page);
  await page.click('button[data-slot="sheet-trigger"]');
  await sleep(700);
  const u6sheet = await page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    if (!d) return null;
    const read = (cls) => { const s = d.querySelector(`svg.${cls}`); if (!s) return null; const r = s.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), stroke: getComputedStyle(s).strokeWidth }; };
    return { search: read("lucide-search"), account: read("lucide-user-round") };
  });
  check("U6 sheet link icons 20×20", u6sheet && [u6sheet.search, u6sheet.account].every((s) => s && near(s.w, 20) && near(s.h, 20)), JSON.stringify(u6sheet));
  check("U6 sheet link strokes ≤1.5", u6sheet && [u6sheet.search, u6sheet.account].every((s) => s && fs(s.stroke) <= 1.5), JSON.stringify(u6sheet));
  await page.keyboard.press("Escape");
  await sleep(500);
  const u6t = await page.evaluate(() => {
    const b = document.querySelector('[data-testid="assistant-trigger"]');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { w: r.width, h: r.height, right: r.right, bottom: r.bottom, vw: window.innerWidth, vh: window.innerHeight };
  });
  check("U6 trigger 64±1, right≤375, bottom≤viewport", u6t && near(u6t.w, 64) && near(u6t.h, 64) && u6t.right <= u6t.vw && u6t.bottom <= u6t.vh, JSON.stringify(u6t));
  await page.screenshot({ path: `${OUT}/u-icons-01-mobile.png` });

  // --- U7 price prominence, homepage cards
  await page.setViewport({ width: 1280, height: 900 });
  await goto(page, "/vi");
  const u7 = await page.evaluate(() => {
    for (const c of document.querySelectorAll('[data-slot="card"]')) {
      const p = [...c.querySelectorAll("p")].find((el) => el.classList.contains("text-xs"));
      const val = p?.querySelector("span.tabular-nums");
      if (!p || !val) continue;
      const vs = getComputedStyle(val);
      const vr = val.getBoundingClientRect();
      const cr = c.getBoundingClientRect();
      const label = [...p.querySelectorAll("span")].find((s) => s !== val);
      const h3 = c.querySelector("h3");
      return { text: val.textContent.trim(), fs: parseFloat(vs.fontSize), fw: Number(vs.fontWeight), labelFs: label ? parseFloat(getComputedStyle(label).fontSize) : null, h3Fs: h3 ? parseFloat(getComputedStyle(h3).fontSize) : null, inside: vr.left >= cr.left - 1 && vr.right <= cr.right + 1 && vr.top >= cr.top - 1 && vr.bottom <= cr.bottom + 1 };
    }
    return null;
  });
  check("U7 card price value 14–15px + fw 600–700 (60% tier)", u7 && u7.fs >= 14 && u7.fs <= 15 && u7.fw >= 600 && u7.fw <= 700, JSON.stringify(u7));
  check("U7 label ≤13px, value/label ratio ≥1.2", u7 && u7.labelFs !== null && u7.labelFs <= 13 && u7.fs / u7.labelFs >= 1.2, `value=${u7?.fs} label=${u7?.labelFs} ratio=${u7 ? (u7.fs / u7.labelFs).toFixed(3) : "-"}`);
  check("U7 card title regains primacy (value fs < h3 fs)", u7 && u7.h3Fs !== null && u7.fs < u7.h3Fs, `value=${u7?.fs} h3=${u7?.h3Fs}`);
  check("U7 price rect fully inside card (no overflow-hidden clipping)", u7 && u7.inside, JSON.stringify(u7 && { text: u7.text, inside: u7.inside }));

  // --- U8 price prominence, tour detail + checkout (dynamic CMS fixture)
  const U8_ASSERTIONS = 10;
  const fx = await resolveTourPricingFixture().catch((e) => {
    console.warn(`U8 fixture resolver failed: ${e.message}`);
    return null;
  });
  if (!fx || !(fx.doc?.tiers ?? []).length) {
    skip(
      "U8 detail + checkout price hierarchy",
      `${U8_ASSERTIONS} assertions — CMS offers no tour with tiers on a published destination (resolver → ${fx ? `"${fx.slug}"` : "null"})`
    );
  } else {
    await goto(page, `/vi/explore/destinations/${fx.slug}`);
    const u8a = await page.evaluate(() => {
      const sec = document.querySelector('section[aria-labelledby="tour-price-heading"]');
      if (!sec) return null;
      return {
        cells: [...sec.querySelectorAll("tbody td")].map((td) => { const cs = getComputedStyle(td); return { fs: parseFloat(cs.fontSize), fw: Number(cs.fontWeight), text: td.textContent.trim() }; }),
        ths: [...sec.querySelectorAll("thead th")].map((th) => parseFloat(getComputedStyle(th).fontSize)),
      };
    });
    check("U8 detail price cells 22–23px + fw 600–700 (80% tier)", u8a && u8a.cells.length >= 2 && u8a.cells.every((c) => c.fs >= 22 && c.fs <= 23 && c.fw >= 600 && c.fw <= 700), JSON.stringify(u8a?.cells));
    check("U8 detail thead labels unchanged ≤13px", u8a && u8a.ths.length > 0 && u8a.ths.every((t) => t <= 13), JSON.stringify(u8a?.ths));
    await page.screenshot({ path: `${OUT}/u-price-01-detail.png` });
    await page.setViewport({ width: 375, height: 812 });
    await sleep(400);
    const u8ov = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    check("U8 detail no page overflow @375 (table scrolls in region)", u8ov.sw <= u8ov.iw, JSON.stringify(u8ov));

    await page.setViewport({ width: 1280, height: 1400 });
    await goto(page, `/vi/booking/checkout?tour=${fx.slug}`);
    const setInput = async (selector, value) => {
      await page.$eval(selector, (el, v) => {
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(el, v);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }, value);
      await sleep(80);
    };
    await setInput("#booking-guests", "2");
    await setInput("#booking-full-name", "Nguyen Van A");
    await setInput("#booking-email", "lena@example.com");
    await setInput("#booking-phone", "0912345678");
    // BookingForm unmounts the whole form (incl. pricing section) once
    // `confirmed` flips — the live pricing total only exists BEFORE submit.
    const u8total = await readStyle(page, 'section[aria-labelledby="booking-pricing-heading"] [data-testid="price-payable"]', ["fontSize", "fontWeight"]);
    check("U8 checkout pricing total 28–29px + fw 600–700", u8total && fs(u8total.fontSize) >= 28 && fs(u8total.fontSize) <= 29 && fw(u8total.fontWeight) >= 600 && fw(u8total.fontWeight) <= 700, JSON.stringify(u8total));
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const iso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
    const dayPicked = await page.evaluate((target) => {
      const tds = [...document.querySelectorAll("td[data-day]")];
      const td = tds.find((t) => t.getAttribute("data-day") === target) ?? tds.find((t) => t.getAttribute("data-disabled") !== "true");
      const btn = td?.querySelector("button");
      if (!btn) return null;
      btn.click();
      return td.getAttribute("data-day");
    }, iso);
    check("U8 travel date cell picked", Boolean(dayPicked), `target=${iso} picked=${dayPicked}`);
    await page.click('[data-difficulty="Medium"]');
    await page.click('button[type="submit"]');
    await sleep(600);
    check("U8 checkout summary rendered", Boolean(await page.$("#booking-summary-heading")));
    const u8rows = await page.evaluate(() => {
      const read = (dt) => { const dd = dt?.parentElement?.querySelector("dd"); if (!dd) return null; const cs = getComputedStyle(dd); return { cls: dd.className, fs: parseFloat(cs.fontSize), fw: Number(cs.fontWeight), color: cs.color, text: dd.textContent.trim() }; };
      const dts = [...document.querySelectorAll("dl dt")];
      return { total: read(dts.find((d) => d.textContent.trim() === "Tổng cộng")), date: read(dts.find((d) => d.textContent.trim() === "Ngày khởi hành")) };
    });
    check("U8 summary 'Tổng cộng' dd 22–23px + fw 600–700 + text-link", u8rows.total && u8rows.total.fs >= 22 && u8rows.total.fs <= 23 && u8rows.total.fw >= 600 && u8rows.total.fw <= 700 && u8rows.total.cls.includes("text-link"), JSON.stringify(u8rows.total));
    check("U8 travel-date dd keeps font-semibold + text-link (F7 guard)", u8rows.date && u8rows.date.cls.includes("font-semibold") && u8rows.date.cls.includes("text-link"), JSON.stringify(u8rows.date));

    await page.click('input[name="payment-method"][value="momo"]');
    await page.waitForSelector('img[alt="Mã QR thanh toán"]', { timeout: 8000 });
    const u8pay = await page.evaluate(() => {
      const p = [...document.querySelectorAll("p")].find((x) => x.textContent.trim() === "Số tiền cần thanh toán");
      const n = p?.nextElementSibling;
      if (!n) return null;
      const cs = getComputedStyle(n);
      return { fs: parseFloat(cs.fontSize), fw: Number(cs.fontWeight), text: n.textContent.trim() };
    });
    check("U8 payable amount 32–33px + fw 600–700", u8pay && u8pay.fs >= 32 && u8pay.fs <= 33 && u8pay.fw >= 600 && u8pay.fw <= 700, JSON.stringify(u8pay));
    await page.screenshot({ path: `${OUT}/u-price-02-checkout.png`, fullPage: true });
    await page.setViewport({ width: 375, height: 812 });
    await sleep(400);
    const u8co = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
    check("U8 checkout no page overflow @375", u8co.sw <= u8co.iw, JSON.stringify(u8co));
  }

  // --- U9 zero pageerrors
  check("U9 zero pageerrors", pageErrors.length === 0, pageErrors.join("; "));
} catch (e) {
  errors.push(`exception: ${e.message}`);
} finally {
  await closeBrowser();
}

console.log(results.join("\n"));
if (skips.length) console.log(`\nSKIPPED: ${skips.length} check group(s) did not run (see SKIP lines above)`);
if (errors.length) console.log("\nERRORS:\n" + errors.join("\n"));
process.exit(errors.length ? 1 : 0);

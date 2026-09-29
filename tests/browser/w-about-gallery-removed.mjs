import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

/**
 * Plan 260929-2135 — permanent purge of the About Us team gallery.
 * Asserts the 3-image grid never returns to the homepage DOM and that the
 * remaining band (h2 + narrative + CTA | video) flows cleanly with no
 * orphaned whitespace (section bottom padding stays py-16 = 64px).
 */

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";

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
  const browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 900 } });
  const page = await getPage(browser);
  page.on("pageerror", (e) => pageErrors.push(e.message));

  for (const locale of ["vi", "en"]) {
    for (const vp of [
      { name: "desktop", width: 1280, height: 900 },
      { name: "mobile", width: 375, height: 812 },
    ]) {
      await page.setViewport({ width: vp.width, height: vp.height });
      const st = (await page.goto(`${BASE}/${locale}`, { waitUntil: "networkidle2", timeout: 60000 }))?.status();
      await dismissPromo(page);
      check(`W0 /${locale} ${vp.name} → 200`, st === 200, `status=${st}`);

      const dom = await page.evaluate(() => {
        const sections = document.querySelectorAll('[data-testid="about-us-section"]');
        const section = sections[0] ?? null;
        const container = section?.querySelector(":scope > div") ?? null;
        const gallery = document.querySelector('[data-testid="team-gallery"]');
        return {
          sectionCount: sections.length,
          hasGallery: Boolean(gallery),
          h2: (section?.querySelector("h2")?.textContent ?? "").trim(),
          cta: Boolean(section?.querySelector('a[href$="/contact"], a[href*="/contact"]')),
          video: Boolean(section?.querySelector('[data-testid="about-promo-video"]')),
          containerChildren: container ? container.children.length : -1,
          paddingBottom: section ? getComputedStyle(section).paddingBottom : "",
          nextSiblingTag: section?.nextElementSibling?.tagName ?? null,
          nextSiblingHeight: section?.nextElementSibling?.getBoundingClientRect().height ?? 0,
          galleryRefs: document.body.innerHTML.includes("team-gallery"),
        };
      });

      check(
        `W1 /${locale} ${vp.name} gallery absent from DOM`,
        dom.hasGallery === false && dom.galleryRefs === false,
        JSON.stringify(dom)
      );
      check(
        `W2 /${locale} ${vp.name} band intact (1 section, h2, CTA, video)`,
        dom.sectionCount === 1 && dom.h2.length > 0 && dom.cta && dom.video,
        JSON.stringify({ n: dom.sectionCount, h2: dom.h2, cta: dom.cta, video: dom.video })
      );
      check(
        `W3 /${locale} ${vp.name} container = grid only (no orphan gallery wrapper)`,
        dom.containerChildren === 1,
        `children=${dom.containerChildren}`
      );
      check(
        `W4 /${locale} ${vp.name} section pb stays py-16 (64px, no dead gap)`,
        dom.paddingBottom === "64px",
        `pb=${dom.paddingBottom}`
      );
      check(
        `W5 /${locale} ${vp.name} next section flows directly after`,
        dom.nextSiblingTag !== null && dom.nextSiblingHeight > 0,
        JSON.stringify({ tag: dom.nextSiblingTag, h: Math.round(dom.nextSiblingHeight) })
      );

      if (vp.name === "desktop") {
        await page.evaluate(() =>
          document.querySelector('[data-testid="about-us-section"]')?.scrollIntoView({ block: "center" })
        );
        await page.screenshot({ path: `${OUT}/w-about-clean-${locale}-${vp.name}.png` });
      } else {
        await page.evaluate(() =>
          document.querySelector('[data-testid="about-us-section"]')?.scrollIntoView({ block: "center" })
        );
        await page.screenshot({ path: `${OUT}/w-about-clean-${locale}-${vp.name}.png` });
      }
    }
  }

  check("W6 zero pageerrors", pageErrors.length === 0, pageErrors.join("; "));
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

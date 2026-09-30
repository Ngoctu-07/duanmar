import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

/**
 * Plan 260929-2151 — homepage DOM pruning.
 * The 5 removed sections must stay gone (headings absent from rendered
 * text in both locales); Featured + About remain; Stories & Inspiration
 * renders only when live CMS articles exist (data-driven).
 */

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";

const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url))
  ).href
);

/** Headings of the 5 permanently pruned sections (historical copy, no longer rendered). */
const FORBIDDEN = {
  vi: [
    "Loại hình trải nghiệm",
    "Hành trình gợi ý",
    "Sự kiện & lễ hội",
    "Đối tác & Truyền thông",
    "Stay Updated",
  ],
  en: [
    "Experience Categories",
    "Suggested Itineraries",
    "Events & Festivals",
    "Travel Trade & Media",
    "Stay Updated",
  ],
};

function envValue(key) {
  if (process.env[key]) return process.env[key];
  try {
    const line = readFileSync(fileURLToPath(new URL("../../.env.local", import.meta.url)), "utf8")
      .split(/\r?\n/)
      .find((l) => l.startsWith(`${key}=`));
    return line ? line.slice(key.length + 1).trim() : undefined;
  } catch {
    return undefined;
  }
}

async function liveArticleCount() {
  const projectId = envValue("NEXT_PUBLIC_SANITY_PROJECT_ID");
  const dataset = envValue("NEXT_PUBLIC_SANITY_DATASET") || "production";
  if (!projectId) return null;
  const query = '*[_type == "article" && publishedAt <= now()]';
  const url = `https://${projectId}.api.sanity.io/v2026-09-25/data/query/${dataset}?query=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return ((await res.json()).result ?? []).length;
  } catch {
    return null;
  }
}

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

  const articleCount = await liveArticleCount();

  for (const locale of ["vi", "en"]) {
    const messages = JSON.parse(
      readFileSync(fileURLToPath(new URL(`../../src/messages/${locale}.json`, import.meta.url)), "utf8")
    );
    const st = (await page.goto(`${BASE}/${locale}`, { waitUntil: "networkidle2", timeout: 60000 }))?.status();
    await dismissPromo(page);
    check(`Y0 /${locale} → 200`, st === 200, `status=${st}`);

    const dom = await page.evaluate(() => ({
      text: document.body.innerText,
      featured: [...document.querySelectorAll("h2")].some(
        (h) => h.textContent?.trim().length > 0
      ),
      about: Boolean(document.querySelector('[data-testid="about-us-section"]')),
      storiesH2: [...document.querySelectorAll("h2")].map((h) => h.textContent?.trim() ?? ""),
      pageerrors: 0,
    }));

    for (const heading of FORBIDDEN[locale]) {
      check(`Y1 /${locale} pruned heading absent: "${heading}"`, !dom.text.includes(heading));
    }

    check(`Y2 /${locale} About band intact`, dom.about === true);
    check(`Y3 /${locale} Featured section present`, dom.storiesH2.includes(messages.home.featuredDestinations),
      JSON.stringify(dom.storiesH2.slice(0, 6)));

    const wantsStories = articleCount !== null && articleCount > 0;
    const hasStories = dom.storiesH2.includes(messages.blog.title);
    if (wantsStories) {
      check(`Y4 /${locale} Stories section renders (${articleCount} live articles)`, hasStories);
    } else if (articleCount === 0) {
      check(`Y4 /${locale} Stories hidden at 0 articles (graceful)`, !hasStories);
    } else {
      check(`Y4 /${locale} Stories data-driven check skipped (CMS unreachable)`, true);
    }

    await page.screenshot({ path: `${OUT}/y-homepage-prune-${locale}.png` });
  }

  check("Y5 zero pageerrors", pageErrors.length === 0, pageErrors.join("; "));
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

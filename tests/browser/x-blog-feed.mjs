import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

/**
 * Plan 260929-2254 — unified /blog social-style feed.
 * Data-driven against live CMS articles: vertical stream of
 * FeedArticleBlocks — oversized title (4xl/5xl), full-width image,
 * single-column max-w-4xl body (NO newspaper columns), reaction bar
 * (like button) per block, dividers, NO ordinals (EN+VI), /news
 * redirects, /blog/<slug> detail renders the same block as h1.
 */

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";

const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url))
  ).href
);

function envValue(key) {
  if (process.env[key]) return process.env[key];
  const file = fileURLToPath(new URL("../../.env.local", import.meta.url));
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, "utf8").split(/\r?\n/).find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : undefined;
}

async function fetchArticles() {
  const projectId = envValue("NEXT_PUBLIC_SANITY_PROJECT_ID");
  const dataset = envValue("NEXT_PUBLIC_SANITY_DATASET") || "production";
  const query =
    '*[_type == "article" && publishedAt <= now()] | order(publishedAt desc)[0...12]{ "slug": slug.current, title_en, title_vi, excerpt_en, excerpt_vi, content_en, content_vi }';
  const url = `https://${projectId}.api.sanity.io/v2026-09-25/data/query/${dataset}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`CMS query failed: ${res.status}`);
  return (await res.json()).result ?? [];
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

  const articles = await fetchArticles();
  const expectCount = Math.min(articles.length, 12);
  check("X0 live article query succeeds", Array.isArray(articles), `count=${articles.length}`);

  for (const locale of ["vi", "en"]) {
    const messages = JSON.parse(
      readFileSync(fileURLToPath(new URL(`../../src/messages/${locale}.json`, import.meta.url)), "utf8")
    );
    const st = (await page.goto(`${BASE}/${locale}/blog`, { waitUntil: "networkidle2", timeout: 60000 }))?.status();
    await dismissPromo(page);
    check(`X1 /${locale}/blog → 200`, st === 200, `status=${st}`);

    const dom = await page.evaluate(() => {
      const blocks = [...document.querySelectorAll('[data-testid="feed-article-block"]')];
      const first = blocks[0] ?? null;
      const links = blocks.map((b) => b.querySelector("h2 a")?.getAttribute("href") ?? "");
      return {
        h1: (document.querySelector("h1")?.textContent ?? "").trim(),
        blockCount: blocks.length,
        bodyText: document.body.innerText,
        firstH2Class: first?.querySelector("h2")?.className ?? "",
        firstHrefs: links.filter(Boolean),
        hasTime: first ? Boolean(first.querySelector("time[datetime]")) : null,
        hasExcerpt: first ? Boolean(first.querySelector("p.italic")) : null,
        rules: blocks.filter((b) => b.className.includes("border-t")).length,
        likeButtons: blocks.filter((b) => b.querySelector('[data-testid="like-button"]')).length,
        columnWrappers: blocks.filter((b) =>
          [...b.querySelectorAll("div")].some((d) => d.className.includes("columns-2"))
        ).length,
        readingWrappers: blocks.filter((b) =>
          [...b.querySelectorAll("div")].some((d) => d.className.includes("max-w-4xl"))
        ).length,
        hasEmptyState: Boolean(document.querySelector("p.mx-auto.max-w-3xl.text-center")),
        sepia: document.body.innerHTML.match(/sepia|grayscale/i)?.[0] ?? null,
      };
    });

    check(`X2 /${locale} h1 = blog.title (L4 contract)`, dom.h1 === messages.blog.title,
      `got="${dom.h1}" want="${messages.blog.title}"`);
    check(`X3 /${locale} block count matches live CMS`, dom.blockCount === expectCount,
      `blocks=${dom.blockCount} want=${expectCount}`);

    if (expectCount === 0) {
      check(`X4 /${locale} empty state, no blocks`, dom.blockCount === 0, JSON.stringify(dom));
    } else {
      check(`X5 /${locale} no ordinals ("Article N" or "Bài N")`,
        !/Article\s*\d+/i.test(dom.bodyText) && !/Bài\s*\d+/.test(dom.bodyText));
      check(`X6 /${locale} oversized headline (text-4xl|5xl)`, /text-(4xl|5xl)/.test(dom.firstH2Class),
        dom.firstH2Class.slice(0, 80));
      check(`X7 /${locale} divider rule lines on blocks`, dom.rules === dom.blockCount,
        `rules=${dom.rules}/${dom.blockCount}`);
      check(`X8 /${locale} links point to /blog/<slug>`,
        dom.firstHrefs.length > 0 && dom.firstHrefs.every((h) => h.startsWith("/blog/") || h.startsWith(`/${locale}/blog/`)),
        JSON.stringify(dom.firstHrefs.slice(0, 2)));
      const a0 = articles[0];
      const hasExcerpt = (locale === "vi" ? a0.excerpt_vi ?? a0.excerpt_en : a0.excerpt_en ?? a0.excerpt_vi) ?? "";
      if (hasExcerpt) {
        check(`X9 /${locale} excerpt lead present`, dom.hasExcerpt === true);
      }
      check(`X10 /${locale} single-column body (no columns-2, has max-w-4xl wrapper)`,
        dom.columnWrappers === 0 && dom.readingWrappers === dom.blockCount,
        JSON.stringify({ noColumns: dom.columnWrappers, wrappers: dom.readingWrappers, blocks: dom.blockCount }));
      check(`X10b /${locale} reaction bar (like button) per block`, dom.likeButtons === dom.blockCount,
        `buttons=${dom.likeButtons}/${dom.blockCount}`);
      await page.screenshot({ path: `${OUT}/x-blog-feed-${locale}.png`, fullPage: false });
    }

    // /news permanent redirect → /blog (plan 2254)
    const newsSt = (await page.goto(`${BASE}/${locale}/news`, { waitUntil: "networkidle2", timeout: 60000 }))?.status();
    const newsUrl = page.url();
    check(`X12 /${locale}/news redirects to /${locale}/blog`,
      newsSt === 200 && newsUrl.includes(`/${locale}/blog`),
      `status=${newsSt} url=${newsUrl}`);

    // detail route: same unified block (or 404 for unknown slug at 0 articles)
    if (expectCount > 0) {
      const slug = articles[0].slug;
      const detailSt = (await page.goto(`${BASE}/${locale}/blog/${slug}`, { waitUntil: "networkidle2", timeout: 60000 }))?.status();
      await dismissPromo(page);
      const detail = await page.evaluate(() => {
        const backEl = [...document.querySelectorAll("main a")].find((a) =>
          (a.getAttribute("href") ?? "").endsWith("/blog")
        );
        return {
          h1: (document.querySelector("h1")?.textContent ?? "").trim(),
          hasBlock: Boolean(document.querySelector('[data-testid="feed-article-block"]')),
          hasLike: Boolean(document.querySelector('[data-testid="like-button"]')),
          backHref: backEl?.getAttribute("href") ?? null,
        };
      });
      check(`X13 /${locale}/blog/<slug> → 200, unified block, h1 title`,
        detailSt === 200 && detail.hasBlock && detail.hasLike && detail.h1.length > 0,
        JSON.stringify({ detailSt, ...detail }));
      check(`X14 /${locale} detail back-link → /blog`, (detail.backHref ?? "").includes("/blog"),
        String(detail.backHref));
    } else {
      const missingSt = (await page.goto(`${BASE}/${locale}/blog/no-such-article-xyz`, { waitUntil: "networkidle2", timeout: 60000 }))?.status();
      check(`X13 /${locale}/blog/<missing> → 404`, missingSt === 404, `status=${missingSt}`);
    }
  }

  check("X11 zero pageerrors", pageErrors.length === 0, pageErrors.join("; "));
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

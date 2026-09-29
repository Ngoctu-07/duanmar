import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

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
  const line = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : undefined;
}

/** Live homepage Portable Text narrative blocks (no fabricated content). */
async function fetchStories() {
  const projectId = envValue("NEXT_PUBLIC_SANITY_PROJECT_ID");
  const dataset = envValue("NEXT_PUBLIC_SANITY_DATASET") || "production";
  if (!projectId) throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID missing");
  const query =
    '*[_type == "homepage"][0]{ "en": narrativeStory_en, "vi": narrativeStory_vi }';
  const url =
    `https://${projectId}.api.sanity.io/v2026-09-25/data/query/${dataset}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`CMS query failed: ${res.status}`);
  const json = await res.json();
  return { en: json.result?.en ?? null, vi: json.result?.vi ?? null };
}

/** Same chain as AboutNarrative: locale → other locale → null. */
const pick = (stories, locale) =>
  (locale === "vi" ? stories.vi : stories.en) ??
  (locale === "vi" ? stories.en : stories.vi) ??
  null;

const countStrongMarks = (blocks) =>
  blocks.reduce(
    (n, b) => n + (b.children ?? []).filter((c) => (c.marks ?? []).includes("strong")).length,
    0
  );

const blockPlainText = (b) =>
  (b.children ?? []).map((c) => c.text ?? "").join("");

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

  const stories = await fetchStories();
  check(
    "V0 live homepage query succeeds",
    "en" in stories && "vi" in stories,
    JSON.stringify({ en: stories.en?.length ?? 0, vi: stories.vi?.length ?? 0 })
  );

  for (const locale of ["vi", "en"]) {
    const expected = pick(stories, locale);
    const hasContent = Array.isArray(expected) && expected.length > 0;
    const st = (await page.goto(`${BASE}/${locale}`, { waitUntil: "networkidle2", timeout: 60000 }))?.status();
    await dismissPromo(page);
    check(`V1 /${locale} → 200`, st === 200, `status=${st}`);

    const dom = await page.evaluate(() => {
      const section = document.querySelector('[data-testid="about-us-section"]');
      const narr = section?.querySelector('[data-testid="about-narrative"]') ?? null;
      return {
        section: Boolean(section),
        hasNarrative: Boolean(narr),
        title: (section?.querySelector("h2")?.textContent ?? "").trim(),
        cta: Boolean(section?.querySelector('a[href*="/contact"]')),
        ps: narr ? narr.querySelectorAll("p.leading-relaxed").length : 0,
        strongs: narr ? narr.querySelectorAll("strong.font-semibold").length : 0,
        lists: narr ? narr.querySelectorAll("ul, ol").length : 0,
        text: narr ? narr.innerText.trim().slice(0, 120) : "",
      };
    });

    check(`V2 /${locale} band intact (title + contact CTA)`, dom.section && dom.title.length > 0 && dom.cta, JSON.stringify({ title: dom.title, cta: dom.cta }));

    if (!hasContent) {
      check(
        `V3 /${locale} empty CMS → narrative absent (placeholder copy removed)`,
        dom.hasNarrative === false,
        JSON.stringify(dom)
      );
    } else {
      const normalBlocks = expected.filter((b) => (b.style ?? "normal") === "normal").length;
      const hasList = expected.some((b) => b.listItem);
      const wantStrong = countStrongMarks(expected);
      check(
        `V3 /${locale} narrative renders from CMS`,
        dom.hasNarrative === true,
        JSON.stringify(dom)
      );
      if (dom.hasNarrative) {
        check(
          `V4 /${locale} one styled <p> per normal block`,
          dom.ps === normalBlocks,
          `ps=${dom.ps} want=${normalBlocks}`
        );
        check(
          `V5 /${locale} strong marks → font-semibold <strong>`,
          dom.strongs === wantStrong,
          `strongs=${dom.strongs} want=${wantStrong}`
        );
        check(
          `V6 /${locale} list blocks → ul/ol present`,
          hasList ? dom.lists > 0 : dom.lists === 0,
          `lists=${dom.lists} hasList=${hasList}`
        );
        const firstText = blockPlainText(expected.find((b) => (b.style ?? "normal") === "normal") ?? expected[0]).slice(0, 30);
        check(
          `V7 /${locale} first block text present`,
          firstText.length === 0 || dom.text.includes(firstText.slice(0, 30)),
          `want≈"${firstText}" got="${dom.text.slice(0, 60)}"`
        );
      }
      if (locale === "en") {
        await page.screenshot({ path: `${OUT}/v-about-narrative-en.png` });
      }
    }
  }

  check("V8 zero pageerrors", pageErrors.length === 0, pageErrors.join("; "));
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

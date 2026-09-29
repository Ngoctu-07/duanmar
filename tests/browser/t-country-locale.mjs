import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";
const msg = {
  vi: JSON.parse(readFileSync(new URL("../../src/messages/vi.json", import.meta.url), "utf8")),
  en: JSON.parse(readFileSync(new URL("../../src/messages/en.json", import.meta.url), "utf8")),
};

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

/** Live destinations with country/category/region (no fabricated CMS data). */
async function fetchDocs() {
  const projectId = envValue("NEXT_PUBLIC_SANITY_PROJECT_ID");
  const dataset = envValue("NEXT_PUBLIC_SANITY_DATASET") || "production";
  if (!projectId) throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID missing");
  const query =
    '*[_type == "destination"]{ "slug": slug.current, name, category, region, country->{ "vi": name.vi, "en": name.en } }';
  const url =
    `https://${projectId}.api.sanity.io/v2026-09-25/data/query/${dataset}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`CMS query failed: ${res.status}`);
  return (await res.json()).result ?? [];
}

/**
 * Expected label per contract: assigned country doc → localized name;
 * unassigned domestic → destinations.vietnam; unassigned international →
 * legacy region (chip localizes it via i18n, card shows raw region as today).
 */
function expectedLabel(doc, locale, surface) {
  if (doc.country) return doc.country[locale];
  if (doc.category === "domestic") return msg[locale].destinations.vietnam;
  if (doc.region && surface === "chip") return msg[locale].destinations[doc.region] ?? doc.region;
  return doc.region ?? "";
}

const norm = (s) => (s ?? "").trim().toLowerCase();

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

  const docs = await fetchDocs();
  check("T0 live destination query succeeds", docs.length > 0, JSON.stringify(docs.map((d) => d.slug)));
  const assigned = docs.filter((d) => d.country).length;
  console.log(`note: ${assigned}/${docs.length} docs have country assigned (fallback branch until Studio assignment)`);
  const chips = { vi: {}, en: {} };

  const readCardLabels = (page) =>
    page.evaluate(() =>
      [...document.querySelectorAll('[data-slot="card"]')].map((card) => {
        const link = card.querySelector('a[href*="/explore/destinations/"]')?.getAttribute("href") ?? "";
        const slug = link.split("/").pop() ?? "";
        const span = card.querySelector("div.flex.items-center.space-x-2 > svg + span");
        return { slug, label: (span?.textContent ?? "").trim() };
      })
    );

  const goto = async (path) => {
    const r = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle2", timeout: 60000 });
    await dismissPromo(page);
    return r?.status() ?? 0;
  };

  for (const locale of ["vi", "en"]) {
    // --- listing cards
    const st = await goto(`/${locale}/explore/destinations`);
    check(`T1 /${locale} listing → 200`, st === 200, `status=${st}`);
    const cards = await readCardLabels(page);
    for (const doc of docs) {
      const card = cards.find((c) => c.slug === doc.slug);
      const want = expectedLabel(doc, locale, "card");
      check(
        `T1 ${locale} card[${doc.slug}] label`,
        card !== undefined && norm(card.label) === norm(want),
        `got="${card?.label}" want="${want}"`
      );
    }

    // --- detail chip
    for (const doc of docs) {
      const dst = await goto(`/${locale}/explore/destinations/${doc.slug}`);
      check(`T2 /${locale}/dest/${doc.slug} → 200`, dst === 200, `status=${dst}`);
      const chip = await page.evaluate(() => {
        const row = [...document.querySelectorAll("div.mt-8 div.mb-3")][0];
        return (row?.querySelector("span")?.textContent ?? "").trim();
      });
      const want = expectedLabel(doc, locale, "chip");
      chips[locale][doc.slug] = norm(chip);
      check(
        `T2 ${locale} chip[${doc.slug}] label`,
        norm(chip) === norm(want),
        `got="${chip}" want="${want}"`
      );
    }

    if (locale === "vi") {
      await goto(`/${locale}/explore/destinations`);
      await page.screenshot({ path: `${OUT}/t-country-01-card-vi.png` });
    }
  }

  // --- T3 locale parity: rendered vi ≠ en exactly when expected labels differ
  for (const doc of docs) {
    const wantVi = norm(expectedLabel(doc, "vi", "chip"));
    const wantEn = norm(expectedLabel(doc, "en", "chip"));
    const gotVi = chips.vi[doc.slug];
    const gotEn = chips.en[doc.slug];
    const shouldDiffer = wantVi !== wantEn;
    const didDiffer = gotVi !== gotEn;
    check(
      `T3 parity[${doc.slug}] vi/en ${shouldDiffer ? "distinct" : "identical"}`,
      gotVi === wantVi && gotEn === wantEn && didDiffer === shouldDiffer,
      `got vi="${gotVi}" en="${gotEn}" want vi="${wantVi}" en="${wantEn}"`
    );
  }
  await goto(`/en/explore/destinations/${docs[0].slug}`);
  await page.screenshot({ path: `${OUT}/t-country-02-detail-en.png` });

  check("T4 zero pageerrors", pageErrors.length === 0, pageErrors.join("; "));
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

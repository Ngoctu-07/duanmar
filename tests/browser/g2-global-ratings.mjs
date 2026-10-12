import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";
import {
  cleanupReviewRefs,
  deleteReviewRef,
  getRatings,
  listSlugReviews,
  apiRequest,
} from "../helpers/reviews-api.mjs";

/**
 * Plan 261007-2145 phase 05 — global ratings are server-computed: three
 * distinct visitors seed ratings 3/4/5, a cookieless fourth session reads
 * AVG=4 COUNT=3, and two fresh browser profiles render the byte-identical
 * "4.0" badge. All seeded rows are deleted in `finally` so reruns start at 0.
 * The tour slug is discovered from the destinations list (first non-`hcm`
 * slug, else `hcm`) so g/k assertions on `hcm` stay undisturbed.
 */

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });
const ORIGIN = "http://localhost:3000";

const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url))
  ).href
);

const SEEDS = [
  { booking: "VN-G2-A", rating: 3, visitor: "d0000000-0000-4000-8000-000000000001" },
  { booking: "VN-G2-B", rating: 4, visitor: "d0000000-0000-4000-8000-000000000002" },
  { booking: "VN-G2-C", rating: 5, visitor: "d0000000-0000-4000-8000-000000000003" },
];
const BADGE = '[data-testid="tour-rating-badge"]';

const results = [];
const errors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};

const seedBody = (slug, seed) => ({
  reference: `${seed.booking}:${slug}`,
  tourSlug: slug,
  bookingReference: seed.booking,
  authorName: `G2 Seed ${seed.booking.slice(-1)}`,
  authorEmail: `${seed.booking.toLowerCase()}@example.com`,
  rating: seed.rating,
  comment: `Global aggregate probe ${seed.rating} stars.`,
  images: [],
});

async function discoverSlug() {
  try {
    const response = await fetch(`${ORIGIN}/vi/explore/destinations`);
    if (!response.ok) return "hcm";
    const html = await response.text();
    const slugs = [
      ...new Set(
        [...html.matchAll(/\/(?:vi|en)\/explore\/destinations\/([a-z0-9-]+)/g)].map((m) => m[1])
      ),
    ];
    return slugs.find((slug) => slug !== "hcm") ?? slugs[0] ?? "hcm";
  } catch {
    return "hcm";
  }
}

async function readBadge(session) {
  let browser = null;
  try {
    browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 1100 } });
    const page = await getPage(browser);
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    await page.goto(session.url, { waitUntil: "networkidle2", timeout: 60000 });
    await dismissPromo(page);
    await page.waitForSelector(BADGE, { timeout: 15000 });
    const text = ((await page.$eval(BADGE, (el) => el.textContent ?? "")).trim());
    await page.screenshot({ path: `${OUT}/g2-badge-${session.tag}.png` });
    return text;
  } finally {
    try {
      await closeBrowser();
    } catch {
      /* best-effort session teardown */
    }
  }
}

let slug = "hcm";
try {
  slug = await discoverSlug();
  check("G0 discovered a destination slug", typeof slug === "string" && slug.length > 0, slug);
  const refs = SEEDS.map((seed) => `${seed.booking}:${slug}`);

  // Pre-clean (same fixed cookies ⇒ crashed-run rows are deletable).
  for (const seed of SEEDS) await deleteReviewRef(ORIGIN, `${seed.booking}:${slug}`, seed.visitor);
  const pre = await listSlugReviews(ORIGIN, slug, SEEDS[0].visitor);
  const preLeft = Array.isArray(pre.json?.reviews)
    ? pre.json.reviews.filter((row) => refs.includes(row?.reference))
    : null;
  check("G1 pre-clean: 0 seed rows present", preLeft !== null && preLeft.length === 0,
    JSON.stringify(preLeft?.map((row) => row.reference)));

  // Three distinct visitors seed ratings 3/4/5.
  for (const seed of SEEDS) {
    const seeded = await apiRequest(ORIGIN, "/api/reviews", {
      method: "POST",
      cookie: seed.visitor,
      body: seedBody(slug, seed),
    });
    check(`G2 seed ${seed.booking} → 201 rating ${seed.rating}`,
      seeded.status === 201 && seeded.json?.review?.reference === `${seed.booking}:${slug}`,
      `status=${seeded.status} ${JSON.stringify(seeded.json?.review?.reference)}`);
  }

  // Fourth (cookieless) session reads the true average.
  const ratings = await getRatings(ORIGIN, [slug]);
  const aggregate = ratings.json?.aggregates?.[slug];
  check("G3 GET /api/ratings → {avg:4,count:3}",
    ratings.status === 200 && aggregate?.avg === 4 && aggregate?.count === 3,
    JSON.stringify({ status: ratings.status, aggregate }));
  check("G3b average renders as 4.0", typeof aggregate?.avg === "number" && aggregate.avg.toFixed(1) === "4.0",
    String(aggregate?.avg));

  // No PII in list rows; ownership is per visitor cookie.
  const listed = await listSlugReviews(ORIGIN, slug, SEEDS[0].visitor);
  const rows = Array.isArray(listed.json?.reviews)
    ? listed.json.reviews.filter((row) => refs.includes(row?.reference))
    : null;
  check("G4 all 3 seed rows listed", rows !== null && rows.length === 3,
    JSON.stringify(rows?.map((row) => row.reference)));
  check("G4b rows carry no authorEmail / visitor identity",
    rows !== null && rows.every((row) => !("authorEmail" in row) && !("visitor" in row)),
    JSON.stringify(rows?.map((row) => Object.keys(row).sort())));
  check("G4c ownership is per-visitor (own true, others false)",
    rows !== null && rows.find((row) => row.reference === refs[0])?.owned === true &&
    rows.filter((row) => row.reference !== refs[0]).every((row) => row.owned === false),
    JSON.stringify(rows?.map((row) => [row.reference, row.owned])));

  // Two fresh profiles render the identical badge.
  const url = `${ORIGIN}/vi/explore/destinations/${slug}`;
  const first = await readBadge({ url, tag: "session1" });
  check("G5 session 1 badge shows 4.0", first.startsWith("4.0"), first);
  const second = await readBadge({ url, tag: "session2" });
  check("G6 session 2 badge identical to session 1", second === first, `${first} vs ${second}`);
} catch (error) {
  errors.push(`fatal: ${error.message}`);
} finally {
  // Hermetic reruns: delete every seeded row, then prove 0 remain.
  const refs = SEEDS.map((seed) => `${seed.booking}:${slug}`);
  for (const seed of SEEDS) await deleteReviewRef(ORIGIN, `${seed.booking}:${slug}`, seed.visitor);
  const belt = await cleanupReviewRefs(ORIGIN, refs, SEEDS[0].visitor);
  const verify = await listSlugReviews(ORIGIN, slug, SEEDS[0].visitor);
  const left = Array.isArray(verify.json?.reviews)
    ? verify.json.reviews.filter((row) => refs.includes(row?.reference))
    : null;
  const ratingsAfter = await getRatings(ORIGIN, [slug]);
  check("G7 cleanup: 0 seed rows + aggregate gone",
    belt.length === 0 && left !== null && left.length === 0 &&
    !(slug in (ratingsAfter.json?.aggregates ?? {})),
    JSON.stringify({ belt, left: left?.map((row) => row.reference), aggregates: ratingsAfter.json?.aggregates }));
}

console.log(results.join("\n"));
if (errors.length > 0) {
  console.error(`\n${errors.length} problem(s):`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}
console.log(`\nall ${results.length} checks passed`);

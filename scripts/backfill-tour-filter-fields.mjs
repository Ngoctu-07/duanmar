#!/usr/bin/env node
/**
 * One-off migration for the tour filtering refactor (plan 260929-1348).
 *
 * 1. featured -> isFeatured (schema field rename): copies the boolean, then drops `featured`.
 * 2. category backfill: sets `category` on destination docs missing it (default: domestic).
 *
 * Dry-run by default (no token needed). Writes only with --apply + a write token.
 *
 * Usage:
 *   node scripts/backfill-tour-filter-fields.mjs
 *   node scripts/backfill-tour-filter-fields.mjs --set nyc=international
 *   SANITY_WRITE_TOKEN=... node scripts/backfill-tour-filter-fields.mjs --apply
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const VALID = ["domestic", "international"];
const API_VERSION = "2026-09-25";

function parseArgs(argv) {
  const opts = { apply: false, defaultCategory: "domestic", overrides: {}, token: null };
  for (const arg of argv) {
    if (arg === "--apply") opts.apply = true;
    else if (arg.startsWith("--default=")) opts.defaultCategory = arg.slice(10);
    else if (arg.startsWith("--token=")) opts.token = arg.slice(8);
    else if (arg.startsWith("--set=")) {
      const [slug, category] = arg.slice(6).split("=");
      if (!slug || !VALID.includes(category)) fail(`bad --set "${arg}" (want --set slug=domestic|international)`);
      opts.overrides[slug] = category;
    } else fail(`unknown arg "${arg}"`);
  }
  if (!VALID.includes(opts.defaultCategory)) fail(`--default must be one of ${VALID.join("|")}`);
  return opts;
}

function envValue(key) {
  if (process.env[key]) return process.env[key];
  const file = fileURLToPath(new URL("../.env.local", import.meta.url));
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : undefined;
}

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

/** Planned ops for one raw doc: { set: {...}, unset: [...], label: string }. */
function planDoc(doc, opts) {
  const set = {};
  const unset = [];
  const notes = [];

  if (Object.prototype.hasOwnProperty.call(doc, "featured")) {
    const desired = doc.featured === true;
    if (doc.isFeatured !== desired) set.isFeatured = desired;
    unset.push("featured");
    notes.push(`featured=${doc.featured} -> isFeatured=${desired}, drop featured`);
  }

  if (doc.category == null) {
    const category = opts.overrides[doc.slug] ?? opts.defaultCategory;
    set.category = category;
    notes.push(`category missing -> "${category}"`);
  } else if (!VALID.includes(doc.category)) {
    notes.push(`INVALID category "${doc.category}" -- fix manually in Studio`);
  }

  return { set, unset, notes, hasOps: Object.keys(set).length > 0 || unset.length > 0 };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const projectId = envValue("NEXT_PUBLIC_SANITY_PROJECT_ID");
  const dataset = envValue("NEXT_PUBLIC_SANITY_DATASET") || "production";
  if (!projectId) fail("NEXT_PUBLIC_SANITY_PROJECT_ID missing (env or .env.local)");
  const base = `https://${projectId}.api.sanity.io/v${API_VERSION}`;

  const query =
    '*[_type == "destination"]{_id, "slug": slug.current, category, isFeatured, featured}';
  const res = await fetch(
    `${base}/data/query/${dataset}?query=${encodeURIComponent(query)}`,
    { headers: { "Sanity-Perspective": "raw" }, signal: AbortSignal.timeout(20000) }
  );
  if (!res.ok) fail(`query failed: HTTP ${res.status} ${await res.text()}`);
  const docs = (await res.json()).result ?? [];

  const mutations = [];
  let pending = 0;
  console.log(`dataset=${dataset} docs=${docs.length} mode=${opts.apply ? "APPLY" : "dry-run"}`);
  for (const doc of docs) {
    const { set, unset, notes, hasOps } = planDoc(doc, opts);
    const kind = doc._id.startsWith("drafts-") ? "draft" : "pub";
    if (!hasOps) {
      console.log(`  ok       ${doc.slug ?? doc._id} [${kind}] up-to-date`);
      continue;
    }
    pending += 1;
    console.log(`  ${opts.apply ? "patch" : "PENDING"} ${doc.slug ?? doc._id} [${kind}] ${notes.join("; ")}`);
    const patch = { id: doc._id };
    if (Object.keys(set).length) patch.set = set;
    if (unset.length) patch.unset = unset;
    mutations.push({ patch });
  }

  if (pending === 0) {
    console.log("nothing to migrate");
    return;
  }
  if (!opts.apply) {
    console.log(`\ndry-run: ${pending} doc(s) pending. Review, then re-run with --apply (add --set slug=category for overrides).`);
    return;
  }

  const token = opts.token || envValue("SANITY_WRITE_TOKEN");
  if (!token) fail("write token required for --apply: set SANITY_WRITE_TOKEN or pass --token=");
  const mutRes = await fetch(`${base}/data/mutate/${dataset}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ mutations }),
    signal: AbortSignal.timeout(30000),
  });
  if (!mutRes.ok) fail(`mutate failed: HTTP ${mutRes.status} ${await mutRes.text()}`);
  const { transactionId, results } = await mutRes.json();
  console.log(`\napplied: ${results.length} doc(s) patched, transaction=${transactionId}`);
}

main().catch((error) => fail(error.message));

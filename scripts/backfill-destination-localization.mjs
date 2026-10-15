#!/usr/bin/env node
/**
 * One-off migration for the bilingual tour schema (plan 261015-0930).
 *
 * Wraps legacy single-language editorial strings into `{ vi }` objects so
 * existing destination docs satisfy the localized schema without Studio edits:
 *   name / description / itinerary[].dayTitle / itinerary[].meals (string → {vi})
 *   itinerary[].details (blocks[] → {vi: blocks})
 *
 * English stays empty (frontend falls back to `vi`). Editors add `en` in Studio.
 * New highlights / inclusions / exclusions fields are left untouched.
 *
 * Dry-run by default (no token needed). Writes only with --apply + a write token.
 *
 * Usage:
 *   node scripts/backfill-destination-localization.mjs
 *   SANITY_WRITE_TOKEN=... node scripts/backfill-destination-localization.mjs --apply
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const API_VERSION = "2026-09-25";

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

const wrapString = (value) =>
  typeof value === "string" && value.trim() !== "" ? { vi: value } : null;

/** Planned ops for one raw doc: { set: {...}, notes: string[] }. */
function planDoc(doc) {
  const notes = [];
  const set = {};

  const nameOp = wrapString(doc.name);
  if (nameOp) {
    set.name = { ...nameOp, _type: "object" };
    notes.push("name → {vi}");
  }
  const descOp = wrapString(doc.description);
  if (descOp) {
    set.description = { ...descOp, _type: "object" };
    notes.push("description → {vi}");
  }
  if (Array.isArray(doc.itinerary)) {
    let days = 0;
    const itinerary = doc.itinerary.map((day) => {
      if (!day || typeof day !== "object") return day;
      const next = { ...day };
      const titleOp = wrapString(day.dayTitle);
      if (titleOp) {
        next.dayTitle = { ...titleOp, _type: "object" };
        days += 1;
      }
      const mealsOp = wrapString(day.meals);
      if (mealsOp) {
        next.meals = { ...mealsOp, _type: "object" };
        days += 1;
      }
      if (Array.isArray(day.details)) {
        next.details = { _type: "object", vi: day.details };
        days += 1;
      }
      return next;
    });
    if (days > 0) {
      set.itinerary = itinerary;
      notes.push(`itinerary: ${days} subfield(s) → {vi}`);
    }
  }

  return { set, hasOps: Object.keys(set).length > 0, notes };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const projectId = envValue("NEXT_PUBLIC_SANITY_PROJECT_ID");
  const dataset = envValue("NEXT_PUBLIC_SANITY_DATASET") || "production";
  if (!projectId) fail("NEXT_PUBLIC_SANITY_PROJECT_ID missing (env or .env.local)");
  const base = `https://${projectId}.api.sanity.io/v${API_VERSION}`;

  const query =
    '*[_type == "destination"]{_id, "slug": slug.current, name, description, itinerary}';
  const res = await fetch(
    `${base}/data/query/${dataset}?query=${encodeURIComponent(query)}`,
    { headers: { "Sanity-Perspective": "raw" }, signal: AbortSignal.timeout(20000) }
  );
  if (!res.ok) fail(`query failed: HTTP ${res.status} ${await res.text()}`);
  const docs = (await res.json()).result ?? [];

  const mutations = [];
  let pending = 0;
  console.log(`dataset=${dataset} docs=${docs.length} mode=${apply ? "APPLY" : "dry-run"}`);
  for (const doc of docs) {
    const { set, notes, hasOps } = planDoc(doc);
    const kind = doc._id.startsWith("drafts-") ? "draft" : "pub";
    if (!hasOps) {
      console.log(`  ok       ${doc.slug ?? doc._id} [${kind}] already localized`);
      continue;
    }
    pending += 1;
    console.log(`  ${apply ? "patch" : "PENDING"} ${doc.slug ?? doc._id} [${kind}] ${notes.join("; ")}`);
    mutations.push({ patch: { id: doc._id, set } });
  }

  if (pending === 0) {
    console.log("nothing to migrate");
    return;
  }
  if (!apply) {
    console.log(`\ndry-run: ${pending} doc(s) pending. Review, then re-run with --apply.`);
    return;
  }

  const token = envValue("SANITY_WRITE_TOKEN");
  if (!token) fail("write token required for --apply: set SANITY_WRITE_TOKEN");
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

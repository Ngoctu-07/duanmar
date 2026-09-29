#!/usr/bin/env node
/**
 * One-off migration for the tour hero carousel feature (plan 260929-1537).
 *
 * Copies the legacy single `image` field into `galleryImages[0]` for
 * destination docs whose gallery is empty, so listing cards and the detail
 * carousel have a source before Studio edits land. Editors still add 2 more
 * images per doc to satisfy the schema min-3 rule.
 *
 * Dry-run by default (no token needed). Writes only with --apply + a write token.
 *
 * Usage:
 *   node scripts/backfill-destination-gallery.mjs
 *   SANITY_WRITE_TOKEN=... node scripts/backfill-destination-gallery.mjs --apply
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

/** Planned ops for one raw doc: { set: {...}, notes: string[] }. */
function planDoc(doc) {
  const notes = [];
  const set = {};
  const hasGallery = Array.isArray(doc.galleryImages) && doc.galleryImages.length > 0;

  if (hasGallery) return { set, notes, hasOps: false };
  if (doc.image?.asset?._ref || doc.image?.asset?.url) {
    set.galleryImages = [{ ...doc.image, _type: "image", _key: "gallery-0" }];
    notes.push(`image -> galleryImages[0] (legacy copy; add 2 more in Studio)`);
  } else {
    notes.push("no source image -- upload >=3 in Studio");
  }
  return { set, hasOps: Object.keys(set).length > 0, notes };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const projectId = envValue("NEXT_PUBLIC_SANITY_PROJECT_ID");
  const dataset = envValue("NEXT_PUBLIC_SANITY_DATASET") || "production";
  if (!projectId) fail("NEXT_PUBLIC_SANITY_PROJECT_ID missing (env or .env.local)");
  const base = `https://${projectId}.api.sanity.io/v${API_VERSION}`;

  const query = '*[_type == "destination"]{_id, "slug": slug.current, image, galleryImages}';
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
      console.log(`  ${Array.isArray(doc.galleryImages) && doc.galleryImages.length ? "ok " : "SKIP"}       ${doc.slug ?? doc._id} [${kind}] ${notes[0] ?? "gallery present"}`);
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

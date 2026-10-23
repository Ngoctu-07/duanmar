#!/usr/bin/env node
/**
 * One-off migration: legacy gallery array -> single Studio `posterImage`.
 *
 * The destination schema now exposes exactly one image (`posterImage`); the
 * `galleryImages[]` array and the carousel are gone. This script copies the
 * first gallery asset (falling back to the legacy single `image`) into
 * `posterImage` for docs that have no poster yet, so existing tour art is not
 * lost when the schema change deploys.
 *
 * Dry-run by default (no token needed). Writes only with --apply + a write token.
 *
 * Usage:
 *   node scripts/backfill-destination-poster.mjs
 *   SANITY_WRITE_TOKEN=... node scripts/backfill-destination-poster.mjs --apply
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

const hasAsset = (image) => Boolean(image?.asset?._ref || image?.asset?.url);

/** Planned ops for one raw doc: { set: {...}, notes: string[] }. */
function planDoc(doc) {
  if (hasAsset(doc.posterImage)) {
    return { set: {}, notes: ["posterImage present"], hasOps: false };
  }

  const gallery = Array.isArray(doc.galleryImages)
    ? doc.galleryImages.find((image) => hasAsset(image))
    : null;
  const source = gallery ?? (hasAsset(doc.image) ? doc.image : null);
  if (!source) {
    return { set: {}, notes: ["no source image — upload a poster in Studio"], hasOps: false };
  }

  // Strip array keys: `posterImage` is a single image object, not a member.
  const poster = { ...source };
  delete poster._key;
  return {
    set: { posterImage: { ...poster, _type: "image" } },
    notes: [gallery ? "galleryImages[0] -> posterImage" : "legacy image -> posterImage"],
    hasOps: true,
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const projectId = envValue("NEXT_PUBLIC_SANITY_PROJECT_ID");
  const dataset = envValue("NEXT_PUBLIC_SANITY_DATASET") || "production";
  if (!projectId) fail("NEXT_PUBLIC_SANITY_PROJECT_ID missing (env or .env.local)");
  const base = `https://${projectId}.api.sanity.io/v${API_VERSION}`;

  const query =
    '*[_type == "destination"]{_id, "slug": slug.current, image, galleryImages, posterImage}';
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
      console.log(`  ${hasAsset(doc.posterImage) ? "ok " : "SKIP"}       ${doc.slug ?? doc._id} [${kind}] ${notes[0]}`);
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

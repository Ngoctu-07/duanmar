#!/usr/bin/env node
/**
 * Purge the deprecated `teamGallery` array from the `homepage` doc
 * (plan 260929-2135, About Us gallery removal).
 *
 * The field definition is already deleted from the Studio schema; this
 * script removes the orphaned image entries (3 uploaded photos) from the
 * document data so no dead payload remains.
 *
 * Dry-run by default (no token needed). Writes only with --apply + a write token.
 *
 * Usage:
 *   node scripts/purge-team-gallery.mjs
 *   node scripts/purge-team-gallery.mjs --apply
 *   SANITY_WRITE_TOKEN=... node scripts/purge-team-gallery.mjs --apply
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const API_VERSION = "2026-09-25";

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
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

async function main() {
  const apply = process.argv.includes("--apply");
  const projectId = envValue("NEXT_PUBLIC_SANITY_PROJECT_ID");
  const dataset = envValue("NEXT_PUBLIC_SANITY_DATASET") || "production";
  if (!projectId) fail("NEXT_PUBLIC_SANITY_PROJECT_ID missing (env or .env.local)");
  const base = `https://${projectId}.api.sanity.io/v${API_VERSION}`;

  const query = '*[_type == "homepage"][0]{ _id, teamGallery }';
  const res = await fetch(
    `${base}/data/query/${dataset}?query=${encodeURIComponent(query)}`,
    { signal: AbortSignal.timeout(20000) }
  );
  if (!res.ok) fail(`query failed: HTTP ${res.status} ${await res.text()}`);
  const doc = (await res.json()).result;
  if (!doc) fail("homepage doc not found");

  const gallery = doc.teamGallery ?? [];
  console.log(`dataset=${dataset} doc=${doc._id} mode=${apply ? "APPLY" : "dry-run"}`);
  if (gallery.length === 0) {
    console.log("nothing to purge: teamGallery already absent");
    return;
  }
  for (const [i, img] of gallery.entries()) {
    console.log(`  ${apply ? "unset" : "PENDING"} slot ${i + 1}/${gallery.length} key=${img._key ?? "?"} asset=${img.asset?._ref ?? "?"}`);
  }

  if (!apply) {
    console.log(`\ndry-run: ${gallery.length} teamGallery entr(ies) pending. Review, then re-run with --apply.`);
    return;
  }

  const token = envValue("SANITY_WRITE_TOKEN");
  if (!token) fail("write token required for --apply: set SANITY_WRITE_TOKEN in .env.local");
  const mutRes = await fetch(`${base}/data/mutate/${dataset}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ mutations: [{ patch: { id: doc._id, unset: ["teamGallery"] } }] }),
    signal: AbortSignal.timeout(30000),
  });
  if (!mutRes.ok) fail(`mutate failed: HTTP ${mutRes.status} ${await mutRes.text()}`);
  const { transactionId } = await mutRes.json();
  console.log(`\napplied: teamGallery unset on ${doc._id}, transaction=${transactionId}`);
}

main().catch((error) => fail(error.message));

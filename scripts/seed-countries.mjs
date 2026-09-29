#!/usr/bin/env node
/**
 * Seed the `country` collection (plan 260929-1805, CMS country taxonomy).
 *
 * Creates missing country docs with bilingual { vi, en } names and
 * deterministic ids (country-vn, country-kr, ...). Existing docs are
 * NEVER overwritten (admin edits in Studio win).
 *
 * Dry-run by default (no token needed). Writes only with --apply + a write token.
 *
 * Usage:
 *   node scripts/seed-countries.mjs
 *   node scripts/seed-countries.mjs --apply
 *   SANITY_WRITE_TOKEN=... node scripts/seed-countries.mjs --apply
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const API_VERSION = "2026-09-25";

/** ISO 3166-1 alpha-2 core set with localized names (vi, en). */
const COUNTRIES = [
  { code: "VN", vi: "Việt Nam", en: "Vietnam" },
  { code: "KR", vi: "Hàn Quốc", en: "South Korea" },
  { code: "JP", vi: "Nhật Bản", en: "Japan" },
  { code: "TW", vi: "Đài Loan", en: "Taiwan" },
  { code: "TH", vi: "Thái Lan", en: "Thailand" },
  { code: "SG", vi: "Singapore", en: "Singapore" },
  { code: "MY", vi: "Malaysia", en: "Malaysia" },
  { code: "ID", vi: "Indonesia", en: "Indonesia" },
  { code: "IN", vi: "Ấn Độ", en: "India" },
  { code: "US", vi: "Hoa Kỳ", en: "United States" },
  { code: "FR", vi: "Pháp", en: "France" },
  { code: "DE", vi: "Đức", en: "Germany" },
  { code: "IT", vi: "Ý", en: "Italy" },
  { code: "AU", vi: "Úc", en: "Australia" },
  { code: "AE", vi: "Các Tiểu vương quốc Ả Rập Thống nhất", en: "United Arab Emirates" },
];

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

  const query = '*[_type == "country"]{ _id, code }';
  const res = await fetch(
    `${base}/data/query/${dataset}?query=${encodeURIComponent(query)}`,
    { headers: { "Sanity-Perspective": "raw" }, signal: AbortSignal.timeout(20000) }
  );
  if (!res.ok) fail(`query failed: HTTP ${res.status} ${await res.text()}`);
  const existing = (await res.json()).result ?? [];
  const byCode = new Map(existing.map((d) => [d.code, d._id]));

  const mutations = [];
  let pending = 0;
  console.log(`dataset=${dataset} existing=${existing.length} mode=${apply ? "APPLY" : "dry-run"}`);
  for (const c of COUNTRIES) {
    const foundId = byCode.get(c.code);
    if (foundId) {
      console.log(`  ok       ${c.code} exists as ${foundId}`);
      continue;
    }
    pending += 1;
    console.log(
      `  ${apply ? "create" : "PENDING"} country-${c.code.toLowerCase()} ${c.code} vi="${c.vi}" en="${c.en}"`
    );
    mutations.push({
      create: {
        _id: `country-${c.code.toLowerCase()}`,
        _type: "country",
        code: c.code,
        name: { vi: c.vi, en: c.en },
      },
    });
  }

  if (pending === 0) {
    console.log("nothing to seed");
    return;
  }
  if (!apply) {
    console.log(`\ndry-run: ${pending} country doc(s) pending. Review, then re-run with --apply.`);
    return;
  }

  const token = envValue("SANITY_WRITE_TOKEN");
  if (!token) fail("write token required for --apply: set SANITY_WRITE_TOKEN in .env.local");
  const mutRes = await fetch(`${base}/data/mutate/${dataset}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ mutations }),
    signal: AbortSignal.timeout(30000),
  });
  if (!mutRes.ok) fail(`mutate failed: HTTP ${mutRes.status} ${await mutRes.text()}`);
  const { transactionId, results } = await mutRes.json();
  console.log(`\napplied: ${results.length} country doc(s) created, transaction=${transactionId}`);
}

main().catch((error) => fail(error.message));

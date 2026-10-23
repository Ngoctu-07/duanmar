import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Account profile header typography contract: the user's display name renders
 * in the clean Barlow Semi Condensed body face (font-sans) — not the
 * decorative Gypsy Curse display face — with neutral tracking and a tight
 * leading so it sits close to the email address below it.
 */

const root = fileURLToPath(new URL("../../", import.meta.url));
const read = (relative: string) => readFileSync(`${root}${relative}`, "utf8");

let passed = 0;
let failed = 0;
const check = (name: string, fn: () => void) => {
  try {
    fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name} :: ${(error as Error).message}`);
  }
};

const dashboard = read("src/components/account/account-dashboard.tsx");
const layout = read("src/app/layout.tsx");

check("account identity name uses font-sans (Barlow Semi Condensed), not font-gypsy", () => {
  const match = dashboard.match(/<p className="([^"]+)">\s*\{user\.name/);
  assert.ok(match, "identity name paragraph not found");
  const classes = match[1];
  assert.match(classes, /\bfont-sans\b/);
  assert.doesNotMatch(classes, /\bfont-gypsy\b/);
});

check("account identity name keeps truncation + slightly enlarged size classes", () => {
  const match = dashboard.match(/<p className="([^"]+)">\s*\{user\.name/);
  assert.ok(match, "identity name paragraph not found");
  const classes = match[1];
  assert.match(classes, /\btruncate\b/);
  // ~5% up from text-3xl (30px) / md:text-4xl (36px): 32px / 38px.
  assert.match(classes, /(?:^|\s)text-\[2rem\](?:\s|$)/);
  assert.match(classes, /(?:^|\s)md:text-\[2\.375rem\](?:\s|$)/);
  assert.match(classes, /\bfont-semibold\b/);
  assert.match(classes, /\btext-white\b/);
});

check("account identity name uses neutral tracking + tight leading", () => {
  const match = dashboard.match(/<p className="([^"]+)">\s*\{user\.name/);
  assert.ok(match, "identity name paragraph not found");
  assert.match(match[1], /\btracking-normal\b/);
  assert.doesNotMatch(match[1], /\btracking-widest\b/);
  assert.match(match[1], /\bleading-tight\b/);
});

check("--font-sans resolves to Barlow Semi Condensed", () => {
  assert.match(layout, /Barlow_Semi_Condensed/);
  assert.match(layout, /variable:\s*"--font-sans"/);
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exitCode = 1;

/**
 * Browser test runner: verifies the dev server answers on :3000, then executes
 * every tests/browser/*.mjs with plain `node`, printing ok/FAIL + a summary.
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DEV_URL = "http://localhost:3000/";
const here = dirname(fileURLToPath(import.meta.url));
const browserDir = join(here, "browser");

try {
  const response = await fetch(DEV_URL, { signal: AbortSignal.timeout(5000), redirect: "follow" });
  console.log(`dev server reachable: ${DEV_URL} → ${response.status}`);
} catch (error) {
  console.error(`dev server not reachable at ${DEV_URL} (${error.message})`);
  console.error("start `npm run dev` first");
  process.exit(1);
}

const files = readdirSync(browserDir)
  .filter((file) => file.endsWith(".mjs"))
  .sort();

if (files.length === 0) {
  console.error(`no browser test files found in ${browserDir}`);
  process.exit(1);
}

let passed = 0;
const failures = [];

for (const file of files) {
  const result = spawnSync("node", [join(browserDir, file)], { stdio: "inherit" });
  const ok = result.status === 0;
  if (ok) passed += 1;
  else failures.push(file);
  console.log(`${ok ? "ok  " : "FAIL"} ${file}`);
  console.log("");
}

console.log(`${passed}/${files.length} files passed`);
if (failures.length) console.log(`failed: ${failures.join(", ")}`);
process.exit(passed === files.length ? 0 : 1);

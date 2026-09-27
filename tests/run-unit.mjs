/**
 * Unit test runner: executes every tests/unit/*.test.{ts,mts} with `npx tsx`,
 * prints a per-file ok/FAIL line and an aggregate summary, exits 1 on failure.
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const unitDir = join(here, "unit");
const cssStub = join(here, "helpers", "css-require-stub.cjs");

// h6 renders TravelDateField which imports react-day-picker/style.css → needs the CJS css stub
const needsCssStub = (file) => file.startsWith("h6-render-capacity");

const files = readdirSync(unitDir)
  .filter((file) => file.endsWith(".test.ts") || file.endsWith(".test.mts"))
  .sort();

if (files.length === 0) {
  console.error(`no unit test files found in ${unitDir}`);
  process.exit(1);
}

let passed = 0;
const failures = [];

for (const file of files) {
  const args = ["tsx"];
  if (needsCssStub(file)) args.push("--require", cssStub);
  args.push(join(unitDir, file));

  const result = spawnSync("npx", args, { stdio: "inherit", shell: true });
  const ok = result.status === 0;
  if (ok) passed += 1;
  else failures.push(file);
  console.log(`${ok ? "ok  " : "FAIL"} ${file}`);
  console.log("");
}

console.log(`${passed}/${files.length} files passed`);
if (failures.length) console.log(`failed: ${failures.join(", ")}`);
process.exit(passed === files.length ? 0 : 1);

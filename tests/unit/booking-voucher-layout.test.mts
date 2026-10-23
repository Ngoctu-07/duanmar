import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Checkout voucher layout contract:
 * - the outer "Apply offer / Choose voucher" step is a full-width sibling of
 *   every other checkout card (never the old 75% centred module);
 * - the individual voucher cards stay compact and collapsible.
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

const section = read("src/components/booking/booking-voucher-section.tsx");
const card = read("src/components/booking/booking-voucher-card.tsx");

check("voucher section span is full width, not the old 75% module", () => {
  assert.match(section, /data-testid="voucher-section"/);
  const match = section.match(/data-testid="voucher-section"\s+className="([^"]+)"/);
  assert.ok(match, "voucher section className not found");
  const classes = match[1];
  assert.match(classes, /(?:^|\s)w-full(?:\s|$)/);
  assert.doesNotMatch(classes, /w-\[75%\]/);
  assert.doesNotMatch(classes, /max-w-\[75%\]/);
  assert.doesNotMatch(classes, /(?:^|\s)mx-auto(?:\s|$)/);
});

check("voucher section keeps compact inner padding", () => {
  const match = section.match(/data-testid="voucher-section"\s+className="([^"]+)"/);
  assert.ok(match, "voucher section className not found");
  assert.match(match[1], /(?:^|\s)p-4(?:\s|$)/);
});

check("individual voucher cards remain collapsible", () => {
  assert.match(card, /data-testid="voucher-card"/);
  assert.match(card, /aria-expanded=/);
  assert.match(card, /aria-controls=/);
  assert.match(card, /hidden=\{!open\}/);
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exitCode = 1;

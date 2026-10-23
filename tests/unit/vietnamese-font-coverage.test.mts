import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { woff2Codepoints } from "../helpers/woff2-cmap.mjs";

/**
 * Vietnamese coverage contract for the self-hosted Gypsy Curse file.
 *
 * The 2005 original maps accented Latin-1 codepoints to watermark placeholder
 * glyphs and has no Vietnamese Extended characters at all, which is why VI
 * headings used to fall back to Oswald mid-word. The localized build must
 * expose every precomposed Vietnamese letter.
 */

const font = readFileSync(
  new URL("../../src/app/fonts/gypsy-curse.woff2", import.meta.url),
);
const codepoints = woff2Codepoints(font);

const expected = [];
for (const stem of "aăâeêioôơuưy") {
  for (const tone of ["", "\u0301", "\u0300", "\u0309", "\u0303", "\u0323"]) {
    const letter = (stem + tone).normalize("NFC");
    expected.push(letter, letter.toUpperCase());
  }
}
expected.push("đ", "Đ");

const required = [...new Set(expected)];
const missing = required.filter((letter) => !codepoints.has(letter.codePointAt(0)));

let passed = 0;
let failed = 0;
const check = (name, fn) => {
  try {
    fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name} :: ${error.message}`);
  }
};

check("WOFF2 exposes the full Vietnamese alphabet (146 letters)", () => {
  assert.equal(required.length, 146);
  assert.deepEqual(missing, [], `missing: ${missing.join("")}`);
});

check("basic Latin letters survive the localization pass", () => {
  const latin = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const absent = [...latin].filter((letter) => !codepoints.has(letter.codePointAt(0)));
  assert.deepEqual(absent, [], `missing Latin: ${absent.join("")}`);
});

check("Vietnamese-specific letters are distinct from the ASCII base", () => {
  for (const letter of "ĐđĂăÂâÊêÔôƠơƯư") {
    assert.ok(codepoints.has(letter.codePointAt(0)), `missing ${letter}`);
  }
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);

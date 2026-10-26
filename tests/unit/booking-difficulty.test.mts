import assert from "node:assert/strict";
import {
  BOOKING_DIFFICULTIES,
  bookingDifficultyKey,
  isBookingDifficulty,
  normalizeBookingDifficulty,
} from "../../src/lib/booking-difficulty.ts";

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

check("D1 exactly three booking tiers, capitalized contract", () => {
  assert.deepEqual([...BOOKING_DIFFICULTIES], ["Easy", "Medium", "Hard"]);
});

check("D1 only the capitalized values narrow", () => {
  for (const value of BOOKING_DIFFICULTIES) {
    assert.equal(isBookingDifficulty(value), true);
  }
  for (const value of ["", "easy", "EASY", "Trung bình", null, undefined, 2]) {
    assert.equal(isBookingDifficulty(value), false, String(value));
  }
});

check("D1 normalizer accepts new + legacy values case-insensitively", () => {
  assert.equal(normalizeBookingDifficulty("Easy"), "Easy");
  assert.equal(normalizeBookingDifficulty(" easy "), "Easy");
  assert.equal(normalizeBookingDifficulty("MEDIUM"), "Medium");
  assert.equal(normalizeBookingDifficulty("hard"), "Hard");
  assert.equal(normalizeBookingDifficulty("extreme"), null);
  assert.equal(normalizeBookingDifficulty(""), null);
  assert.equal(normalizeBookingDifficulty(null), null);
  assert.equal(normalizeBookingDifficulty(123), null);
});

check("D1 i18n keys stay lowercase for the booking namespace", () => {
  assert.equal(bookingDifficultyKey("Easy"), "easy");
  assert.equal(bookingDifficultyKey("medium"), "medium");
  assert.equal(bookingDifficultyKey("Hard"), "hard");
  assert.equal(bookingDifficultyKey("extreme"), null);
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);

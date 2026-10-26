/**
 * Pick a value from checkout Step 4's base-ui Select. The options render in a
 * portal, so the trigger must be opened before the option can be clicked.
 */
export async function selectDifficulty(page, value = "Medium") {
  await page.click("#booking-difficulty");
  await page.waitForSelector(
    `[data-slot="select-item"][data-difficulty="${value}"]`,
    { timeout: 5000 }
  );
  await page.click(
    `[data-slot="select-item"][data-difficulty="${value}"]`
  );
  await new Promise((resolve) => setTimeout(resolve, 150));
}

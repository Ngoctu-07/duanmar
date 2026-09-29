export async function dismissPromo(page) {
  try {
    await page.waitForSelector('[data-slot="promo-modal"]', { timeout: 2000 });
  } catch {
    return;
  }
  await page.click('[data-slot="promo-modal-close"]').catch(async () => {
    await page.keyboard.press("Escape").catch(() => {});
  });
  const promoGone = () =>
    !document.querySelector('[data-slot="promo-modal"]') &&
    !document.querySelector('[data-slot="dialog-overlay"]');
  try {
    await page.waitForFunction(promoGone, { timeout: 5000 });
  } catch {
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForFunction(promoGone, { timeout: 5000 }).catch(() => {});
  }
}

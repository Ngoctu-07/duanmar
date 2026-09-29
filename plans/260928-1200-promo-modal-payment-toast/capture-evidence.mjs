import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const OUT = `${HERE}evidence`;
mkdirSync(OUT, { recursive: true });

const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(
      new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url)
    )
  ).href
);

const BASE = "http://localhost:3000";
const browser = await getBrowser();
const page = await getPage(browser);
try {
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto(`${BASE}/vi`, { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForSelector('[data-slot="promo-modal"]', { timeout: 10000 });
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: `${OUT}/promo-modal-vi.png` });
  console.log("ok promo-modal-vi.png");
  await page.click('[data-slot="promo-modal-close"]');
  await page.waitForFunction(
    () => !document.querySelector('[data-slot="promo-modal"]'),
    { timeout: 5000 }
  );

  await page.goto(`${BASE}/vi/booking/checkout?tour=hcm`, {
    waitUntil: "networkidle2",
    timeout: 60000,
  });
  await page.waitForSelector('[data-slot="promo-modal"]', { timeout: 10000 });
  await page.click('[data-slot="promo-modal-close"]');
  await page.waitForFunction(
    () => !document.querySelector('[data-slot="promo-modal"]'),
    { timeout: 5000 }
  );
  const setInput = async (selector, value) => {
    await page.$eval(
      selector,
      (el, v) => {
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        ).set;
        setter.call(el, v);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      },
      value
    );
    await new Promise((r) => setTimeout(r, 80));
  };

  await setInput("#booking-guests", "2");
  await setInput("#booking-full-name", "Nguyen Van A");
  await setInput("#booking-email", "lena@example.com");
  await setInput("#booking-phone", "0912345678");
  await page.click("#booking-difficulty");
  await new Promise((r) => setTimeout(r, 300));
  const option = await page.evaluateHandle(() =>
    [...document.querySelectorAll('[role="option"], li')].find((el) =>
      el.textContent.includes("Dễ")
    )
  );
  if (option.asElement()) await option.asElement().click();
  await new Promise((r) => setTimeout(r, 200));
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const hasCell = await page.$(`td[data-day="${iso}"] button`);
  console.log("state before submit: url=", page.url(), "dateCell=", Boolean(hasCell), "difficultyOpt=", Boolean(option.asElement()));
  if (hasCell) {
    await page.$eval(`td[data-day="${iso}"] button`, (el) => el.click());
  }
  await new Promise((r) => setTimeout(r, 200));
  const submitBtn = await page.$('button[type="submit"]');
  console.log("submit btn present:", Boolean(submitBtn), "url=", page.url());
  if (!submitBtn) {
    await page.screenshot({ path: `${OUT}/debug-submit-failed.png`, fullPage: true });
    throw new Error(`form submit missing at ${page.url()}`);
  }
  await submitBtn.click();
  await new Promise((r) => setTimeout(r, 800));
  const radios = await page.$$("input[name=payment-method]");
  console.log("radios after submit:", radios.length);
  if (radios.length === 0) {
    await page.screenshot({ path: `${OUT}/debug-submit-failed.png`, fullPage: true });
    throw new Error("form submit did not render payment section");
  }
  await page.click('input[name="payment-method"][value="momo"]');
  await new Promise((r) => setTimeout(r, 3400));
  const toastVisible = await page.evaluate(
    () => !!document.querySelector('[role="status"]')
  );
  console.log("toast visible:", toastVisible);
  await page.screenshot({ path: `${OUT}/payment-success-toast.png` });
  console.log("ok payment-success-toast.png");
  await new Promise((r) => setTimeout(r, 2200));
  const toastGone = await page.evaluate(
    () => !document.querySelector('[role="status"]')
  );
  console.log("toast auto-dismissed after 5s:", toastGone);
} finally {
  await closeBrowser();
}

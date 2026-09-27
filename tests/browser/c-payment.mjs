import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expectedBreakdown, fetchTourPricing } from "../helpers/cms-expectations.mjs";

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });

const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(
      new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url)
    )
  ).href
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const errors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};
const norm = (s) => s.replace(/ /g, " ");

try {
  const browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 1400 } });
  const page = await getPage(browser);
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

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
    await sleep(80);
  };

  await page.goto("http://localhost:3000/vi/booking/checkout?tour=hcm", { waitUntil: "networkidle2", timeout: 60000 });

  // --- D6: tiered pricing live on the checkout form — totals derived from the
  // published CMS doc (freshness contract; plan 260927-1645)
  const cmsDoc = await fetchTourPricing("hcm");
  const pricing = async () => norm(await page.$eval("#booking-pricing-heading", (el) => el.closest("section").textContent));
  await setInput("#booking-guests", "1");
  let text = await pricing();
  const bd1 = expectedBreakdown(cmsDoc, 1);
  check(`D6 1 guest → ${bd1.totalText}`, text.includes(bd1.totalText), text.slice(-90));
  await setInput("#booking-guests", "2");
  text = await pricing();
  const bd2 = expectedBreakdown(cmsDoc, 2);
  check(`D6 2 guests → ${bd2.totalText}`, text.includes(bd2.totalText), text.slice(-90));
  await setInput("#booking-guests", "99");
  text = await pricing();
  const bd99 = expectedBreakdown(cmsDoc, 99);
  check(`D6 99 guests → ${bd99.totalText}`, text.includes(bd99.totalText), text.slice(-90));
  const noQuote = (await page.content()).includes("Liên hệ để nhận báo giá");
  check("D5 no 'Liên hệ để nhận báo giá' on checkout", !noQuote);

  // --- submit valid form
  await setInput("#booking-guests", "2");
  await setInput("#booking-full-name", "Nguyen Van A");
  await setInput("#booking-email", "lena@example.com");
  await setInput("#booking-phone", "0912345678");
  await page.click("#booking-difficulty");
  await sleep(300);
  const option = await page.evaluateHandle(() =>
    [...document.querySelectorAll('[role="option"], li')].find((el) => el.textContent.includes("Dễ"))
  );
  if (option.asElement()) await option.asElement().click();
  await sleep(200);
  const t1 = new Date();
  t1.setDate(t1.getDate() + 1);
  const iso1 = `${t1.getFullYear()}-${String(t1.getMonth() + 1).padStart(2, "0")}-${String(t1.getDate()).padStart(2, "0")}`;
  await page.click(`td[data-day="${iso1}"] button`);
  await sleep(200);
  await page.click('button[type="submit"]');
  await sleep(500);

  // --- D5/D8: summary + payment section
  const summary = await page.$("#booking-summary-heading");
  check("summary rendered", Boolean(summary));
  const html = await page.content();
  check("D5 no placeholder on summary", !html.includes("Liên hệ để nhận báo giá"));
  const totalRow = await page.evaluate(() => {
    const dts = [...document.querySelectorAll("dl dt")];
    const row = dts.find((dt) => dt.textContent.trim() === "Tổng cộng");
    return row ? row.parentElement.textContent : null;
  });
  check("D5 summary shows numeric total", Boolean(totalRow) && norm(totalRow).includes(bd2.totalText), norm(totalRow ?? ""));

  const radios = await page.$$('input[name="payment-method"]');
  check("D7 two payment methods", radios.length === 2, `count=${radios.length}`);
  check("D7 QR hidden before selection", !(await page.$('img[alt="Mã QR thanh toán"]')));

  // --- MoMo
  await page.click('input[name="payment-method"][value="momo"]');
  const img = await page.waitForSelector('img[alt="Mã QR thanh toán"]', { timeout: 8000 }).catch(() => null);
  check("D7 QR rendered after selecting MoMo", Boolean(img));
  const payable = norm(await page.evaluate(() => {
    const el = [...document.querySelectorAll("p")].find((p) => p.textContent.trim() === "Số tiền cần thanh toán");
    return el ? el.nextElementSibling.textContent : "";
  }));
  check(`D7 total payable shown = ${bd2.totalText}`, payable.includes(bd2.totalText), payable);

  const statusEl = await page.$('p[aria-live="polite"]');
  let status = statusEl ? (await statusEl.evaluate((el) => el.textContent.trim())) : "";
  let cls = statusEl ? (await statusEl.evaluate((el) => el.className)) : "";
  check("D7 initial status Pending + muted", status === "Đang chờ thanh toán" && cls.includes("text-muted-foreground") && !cls.includes("text-green-700"), `${status} | ${cls}`);
  const paymentBlock = await page.$('section:has(#booking-payment-heading)');
  if (paymentBlock) await paymentBlock.screenshot({ path: `${OUT}/d7-payment-pending.png` });

  await sleep(3400);
  status = await page.$eval('p[aria-live="polite"]', (el) => el.textContent.trim());
  cls = await page.$eval('p[aria-live="polite"]', (el) => el.className);
  check("D7 status → Payment successful (bold green)", status === "Thanh toán thành công" && cls.includes("font-bold") && cls.includes("text-green-700"), `${status} | ${cls}`);
  if (paymentBlock) await paymentBlock.screenshot({ path: `${OUT}/d7-payment-success.png` });

  // --- switch to Bank: payload changes, status restarts
  const momoSrc = await page.$eval('img[alt="Mã QR thanh toán"]', (el) => el.getAttribute("src"));
  await page.click('input[name="payment-method"][value="bank"]');
  await sleep(600);
  const bankSrc = await page.$eval('img[alt="Mã QR thanh toán"]', (el) => el.getAttribute("src"));
  check("D7 Bank QR payload differs from MoMo", momoSrc !== bankSrc);
  const restarted = await page.$eval('p[aria-live="polite"]', (el) => el.textContent.trim());
  check("D7 switching method resets to pending", restarted === "Đang chờ thanh toán", restarted);

  await page.screenshot({ path: `${OUT}/d10-summary-payment.png`, fullPage: true });
} catch (e) {
  errors.push(`exception: ${e.message}`);
} finally {
  await closeBrowser();
}

console.log(results.join("\n"));
if (errors.length) console.log("\nERRORS:\n" + errors.join("\n"));
process.exit(errors.length ? 1 : 0);

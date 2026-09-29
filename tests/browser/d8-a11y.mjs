import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(
      new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url)
    )
  ).href
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const results = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};

const srgb = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const luminance = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
const parseRgb = (s) => s.match(/[\d.]+/g).slice(0, 3).map(Number);
const contrast = (fg, bg) => {
  const [l1, l2] = [luminance(parseRgb(fg)), luminance(parseRgb(bg))].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
};

try {
  const browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 1400 } });
  const page = await getPage(browser);
  await page.goto("http://localhost:3000/vi/booking/checkout?tour=hcm", { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);

  const setInput = async (selector, value) => {
    await page.$eval(selector, (el, v) => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, value);
    await sleep(80);
  };
  await setInput("#booking-guests", "2");
  await setInput("#booking-full-name", "Nguyen Van A");
  await setInput("#booking-email", "lena@example.com");
  await setInput("#booking-phone", "0912345678");
  // Difficulty select only renders on special tours — skip on standard tours.
  if (await page.$("#booking-difficulty")) {
    await page.click("#booking-difficulty"); await sleep(300);
    const opt = await page.evaluateHandle(() => [...document.querySelectorAll('[role="option"], li')].find((el) => el.textContent.includes("Dễ")));
    if (opt.asElement()) await opt.asElement().click();
  }
  const td = new Date();
  td.setDate(td.getDate() + 1);
  const isoT = `${td.getFullYear()}-${String(td.getMonth() + 1).padStart(2, "0")}-${String(td.getDate()).padStart(2, "0")}`;
  await page.click(`td[data-day="${isoT}"] button`);
  await sleep(200);
  await page.click('button[type="submit"]'); await sleep(500);

  // D8 radios: label association + checked state
  const radios = await page.$$eval('input[name="payment-method"]', (els) =>
    els.map((el) => ({
      checked: el.checked,
      labelled: Boolean(el.closest("label")) && el.closest("label").textContent.trim().length > 0,
      type: el.type,
    }))
  );
  check("D8 both radios typed + labelled", radios.length === 2 && radios.every((r) => r.labelled && r.type === "radio"), JSON.stringify(radios));
  await page.click('input[name="payment-method"][value="momo"]');
  await page.waitForSelector('img[alt="Mã QR thanh toán"]', { timeout: 8000 });
  const checkedState = await page.$$eval('input[name="payment-method"]', (els) => els.filter((el) => el.checked).map((el) => el.value));
  check("D8 checked state reflects selection", checkedState.length === 1 && checkedState[0] === "momo", JSON.stringify(checkedState));

  const live = await page.$eval('p[aria-live="polite"]', (el) => el.getAttribute("aria-live"));
  check("D8 status aria-live=polite", live === "polite");

  // contrast: pending (muted) then success (green) against composited effective bg
  const measure = async (label) => {
    const m = await page.$eval('p[aria-live="polite"]', (el) => {
      const ctx = document.createElement("canvas").getContext("2d");
      const read = (css, base) => {
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, 1, 1);
        ctx.fillStyle = css;
        ctx.fillRect(0, 0, 1, 1);
        return [...ctx.getImageData(0, 0, 1, 1).data];
      };
      const fg = read(getComputedStyle(el).color, "rgba(0,0,0,0)");
      const layers = [];
      let n = el;
      while (n) {
        const c = getComputedStyle(n).backgroundColor;
        if (c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent") layers.push(c);
        n = n.parentElement;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 1, 1);
      for (const c of layers.reverse()) {
        ctx.fillStyle = c;
        ctx.fillRect(0, 0, 1, 1);
      }
      const [r, g, b] = [...ctx.getImageData(0, 0, 1, 1).data];
      return { fg: fg.slice(0, 3), bg: [r, g, b], alpha: fg[3] };
    });
    const ratio = contrast(
      `rgb(${m.fg.join(",")})`,
      `rgb(${m.bg.join(",")})`
    );
    check(
      `D8 contrast ${label} ≥ 4.5`,
      m.alpha === 255 && ratio >= 4.5,
      `${ratio.toFixed(2)}:1 fg=${m.fg} bg=${m.bg} alpha=${m.alpha}`
    );
  };
  await measure("pending");
  await sleep(3400);
  await measure("success");
} catch (e) {
  errors.push(`exception: ${e.message}`);
} finally {
  await closeBrowser();
}

console.log(results.join("\n"));
if (errors.length) console.log("\nERRORS:\n" + errors.join("\n"));
process.exit(errors.length ? 1 : 0);

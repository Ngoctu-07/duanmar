import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

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

const isoOf = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const shifted = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return isoOf(d);
};
const tomorrow = shifted(1);
const todayIso = shifted(0);
const yesterday = shifted(-1);
const inWindow = shifted(7);
const outWindow = shifted(8);

try {
  const browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 1400 } });
  const page = await getPage(browser);
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  const fill = async (selector, value) => {
    await page.$eval(selector, (el, v) => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set.call(el, v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, value);
    await sleep(60);
  };

  // --- F10-adjacent: header icon + empty state
  await page.goto("http://localhost:3000/vi", { waitUntil: "networkidle2", timeout: 60000 });
  const headerIcon = await page.$('a[href="/vi/my-trips"], button[aria-label="Chuyến đi của tôi"]');
  check("header My Trips entry exists", Boolean(headerIcon));

  await page.goto("http://localhost:3000/vi/my-trips", { waitUntil: "networkidle2", timeout: 60000 });
  await page.evaluate(() => window.localStorage.clear());
  await page.reload({ waitUntil: "networkidle2" });
  const emptyText = await page.$eval("body", (el) => el.textContent);
  check("empty state before any booking", emptyText.includes("Chưa có chuyến đi nào"), "");
  await page.screenshot({ path: `${OUT}/f11-mytrips-empty.png`, fullPage: true });

  // --- F5: rolling 7-day calendar window
  await page.goto("http://localhost:3000/vi/booking/checkout?tour=hcm", { waitUntil: "networkidle2", timeout: 60000 });
  const cal = await page.$("#booking-travel-date");
  check("calendar renders", Boolean(cal));

  const dayInfo = async (iso) =>
    page.$eval(`td[data-day="${iso}"]`, (td) => {
      const btn = td.querySelector("button");
      return {
        exists: true,
        disabled: btn ? btn.disabled : null,
        color: btn ? getComputedStyle(btn).color : null,
        selected: td.hasAttribute("data-selected"),
      };
    }).catch(() => ({ exists: false }));

  const past = await dayInfo(yesterday);
  const today = await dayInfo(todayIso);
  const next = await dayInfo(tomorrow);
  check("F5 past date visible", past.exists, JSON.stringify(past));
  check("F5 past date disabled", past.disabled === true, JSON.stringify(past));
  check("F5 today disabled (window starts tomorrow)", today.disabled === true, JSON.stringify(today));
  check("F5 tomorrow enabled", next.exists && next.disabled === false, JSON.stringify(next));
  check("F5 disabled dates grayed (color differs)", past.color !== next.color, `${past.color} vs ${next.color}`);

  // clicking a disabled day must not select it
  await page.click(`td[data-day="${yesterday}"] button`, { force: true }).catch(() => undefined);
  await sleep(200);
  const afterDisabledClick = await page.$("td[data-selected]");
  check("F5 disabled date unclickable", !afterDisabledClick);

  // month navigation: next month reachable, day +8 visible but disabled
  await page.click(".rdp-button_next");
  await sleep(400);
  const far = await dayInfo(outWindow);
  const edge = await dayInfo(inWindow);
  check("F5 beyond-window date visible in next month", far.exists, JSON.stringify(far));
  check("F5 beyond-window date disabled", far.disabled === true, JSON.stringify(far));
  check("F5 last allowed date (today+7) enabled", edge.exists && edge.disabled === false, JSON.stringify(edge));
  await page.click("#booking-travel-date", { force: true }).catch(() => undefined);
  await (await page.$("#booking-travel-date")).screenshot({ path: `${OUT}/f5-calendar-window.png` });

  // --- F6: submit without date → required error, then pick tomorrow
  await fill("#booking-guests", "2");
  await fill("#booking-full-name", "Nguyen Van A");
  await fill("#booking-email", "lena@example.com");
  await fill("#booking-phone", "0912345678");
  await page.click("#booking-difficulty");
  await sleep(300);
  const opt = await page.evaluateHandle(() => [...document.querySelectorAll('[role="option"], li')].find((el) => el.textContent.includes("Dễ")));
  if (opt.asElement()) await opt.asElement().click();
  await sleep(200);
  await page.click('button[type="submit"]');
  await sleep(300);
  const dateError = await page.$("#booking-travel-date-error");
  check("F6 missing date blocks submit", Boolean(dateError));
  const errText = dateError ? await dateError.evaluate((el) => el.textContent) : "";
  check("F6 date error message", errText.includes("Vui lòng chọn ngày khởi hành"), errText);
  check("F6 summary not shown yet", !(await page.$("#booking-summary-heading")));

  await page.click(`td[data-day="${tomorrow}"] button`);
  await sleep(200);
  check("F6 date error cleared on pick", !(await page.$("#booking-travel-date-error")));
  const picked = await page.$eval("td[data-selected]", (td) => td.getAttribute("data-day")).catch(() => null);
  check("F6 tomorrow selected", picked === tomorrow, String(picked));

  await page.click('button[type="submit"]');
  await sleep(400);
  check("F6 valid submit → summary", Boolean(await page.$("#booking-summary-heading")));

  // --- F7: travel date prominent on ticket + capture rows for F9
  const rows = await page.$$eval("dl dt", (dts) =>
    dts.map((dt) => ({ label: dt.textContent.trim(), value: dt.parentElement.querySelector("dd")?.textContent.trim() }))
  );
  const dateRow = rows.find((r) => r.label === "Ngày khởi hành");
  check("F7 travel date row on ticket", Boolean(dateRow) && /\d{2}\/\d{2}\/2026/.test(dateRow.value || ""), JSON.stringify(dateRow));
  const dateRowStyle = await page.$$eval("dl dt", (dts) => {
    const dt = dts.find((el) => el.textContent.trim() === "Ngày khởi hành");
    const dd = dt?.parentElement?.querySelector("dd");
    return dd ? dd.className : "";
  });
  check("F7 travel date prominent (destructive bold)", dateRowStyle.includes("font-semibold") && dateRowStyle.includes("text-destructive"), dateRowStyle);
  check("F7 other rows intact (reference/tour/total)", rows.some((r) => r.value?.startsWith("VN-")) && rows.some((r) => r.value === "HCM") && rows.some((r) => r.label === "Tổng cộng"));
  const reference = rows.find((r) => r.label === "Mã yêu cầu")?.value;
  check("F7 reference captured", Boolean(reference), String(reference));

  const summarySection = await page.$("section:has(#booking-summary-heading)");
  await summarySection.screenshot({ path: `${OUT}/f7-ticket-summary.png` });

  // --- F8: save after payment success, upsert on method switch
  await page.click('input[name="payment-method"][value="momo"]');
  await page.waitForSelector('img[alt="Mã QR thanh toán"]', { timeout: 8000 });
  await sleep(3400);
  let status = await page.$eval('p[aria-live="polite"]', (el) => el.textContent.trim());
  check("F8 payment success", status === "Thanh toán thành công", status);

  const readStore = () => page.evaluate(() => JSON.parse(window.localStorage.getItem("vn-my-trips:v1") || "[]"));
  let store = await readStore();
  check("F8 exactly 1 record after success", store.length === 1, `len=${store.length}`);
  const rec = store[0] || {};
  check("F8 record complete", rec.reference === reference && rec.travelDate === tomorrow && rec.guests === 2 && rec.total === 300000 && rec.tourName === "HCM" && rec.currency === "VND" && Boolean(rec.paidAt), JSON.stringify(rec));

  const paidLink = await page.$('a[href="/vi/my-trips"]');
  check("F8 'view my trips' link after success", Boolean(paidLink));

  await page.click('input[name="payment-method"][value="bank"]');
  await sleep(3600);
  store = await readStore();
  check("F8 switch method → still 1 record (upsert)", store.length === 1, `len=${store.length}`);

  // --- F9: master list → detail matches checkout ticket
  await page.goto("http://localhost:3000/vi/my-trips", { waitUntil: "networkidle2", timeout: 60000 });
  const cardText = await page.$eval("main ul li a, ul li a", (el) => el.textContent.trim()).catch(() => "");
  check("F9 list card shows tour + date", cardText.includes("HCM"), cardText);
  check("F9 list date human readable", /2[0-9]\/0[0-9]\/2026/.test(cardText) || cardText.includes("2026"), cardText);
  await (await page.$("ul")).screenshot({ path: `${OUT}/f9-mytrips-list.png` }).catch(async () => {
    await page.screenshot({ path: `${OUT}/f9-mytrips-list.png`, fullPage: true });
  });

  await page.click("ul li a");
  await page.waitForSelector("#trip-detail-heading", { timeout: 8000 });
  check("F9 navigated to detail route", page.url().includes(`/my-trips/${reference}`), page.url());
  const badge = await page.$eval("#trip-detail-heading", (el) => el.parentElement.textContent);
  check("F9 paid badge", badge.includes("Đã thanh toán"), badge);
  const detailRows = await page.$$eval("dl dt", (dts) =>
    dts.map((dt) => ({ label: dt.textContent.trim(), value: dt.parentElement.querySelector("dd")?.textContent.trim() }))
  );
  const same = JSON.stringify(detailRows) === JSON.stringify(rows);
  check("F9 detail rows identical to checkout ticket", same, same ? "" : `checkout=${JSON.stringify(rows)} detail=${JSON.stringify(detailRows)}`);
  const detailSection = await page.$("section:has(#trip-detail-heading)");
  if (detailSection) await detailSection.screenshot({ path: `${OUT}/f9-mytrips-detail.png` });

  // --- F10 EN locale smoke
  await page.goto("http://localhost:3000/en/my-trips", { waitUntil: "networkidle2", timeout: 60000 });
  const enText = await page.$eval("h1", (el) => el.textContent);
  check("F10 EN my-trips localized", enText.trim() === "My Trips", enText);
  // --- F12: delete-all control clears device PII (review m13, user-approved)
  await page.goto("http://localhost:3000/vi/my-trips", { waitUntil: "networkidle2", timeout: 60000 });
  const buttonTexts = await page.$$eval("button", (els) => els.map((e) => e.textContent.trim()));
  check("F12 delete-all button present", buttonTexts.includes("Xóa tất cả chuyến đi"), JSON.stringify(buttonTexts));
  const deleteHandle = await page.evaluateHandle(() =>
    [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Xóa tất cả chuyến đi"))
  );
  page.once("dialog", (d) => d.accept());
  await deleteHandle.asElement().click();
  await page.waitForFunction(() => !window.localStorage.getItem("vn-my-trips:v1"), { timeout: 5000 });
  const emptyAfterDelete = await page.$eval("main", (el) => el.textContent).catch(() => "");
  check("F12 empty state after delete", emptyAfterDelete.includes("Chưa có chuyến đi nào"), emptyAfterDelete.slice(0, 120));

  // --- F13: a `storage` event from another tab refreshes the list in place
  await page.evaluate(() => {
    window.localStorage.setItem(
      "vn-my-trips:v1",
      JSON.stringify([{
        reference: "VN-SEED", slug: "hcm", tourName: "HCM", travelDate: "2026-10-01",
        fullName: "A", email: "a@b.c", phone: "0900000000", notes: "", guests: 2,
        difficulty: "easy", pricePerGuest: 150000, total: 300000, currency: "VND",
        locale: "vi", paidAt: "2026-09-27T00:00:00.000Z",
      }])
    );
    window.dispatchEvent(new StorageEvent("storage", { key: "vn-my-trips:v1" }));
  });
  await page.waitForSelector("ul li a", { timeout: 5000 }).catch(() => null);
  const seededCard = await page.$eval("ul li a", (el) => el.textContent.trim()).catch(() => "");
  check("F13 storage event adds the other tab's booking", seededCard.includes("HCM"), seededCard);
} catch (e) {
  errors.push(`exception: ${e.message}`);
} finally {
  await closeBrowser();
}

console.log(results.join("\n"));
if (errors.length) console.log("\nERRORS:\n" + errors.join("\n"));
process.exit(errors.length ? 1 : 0);

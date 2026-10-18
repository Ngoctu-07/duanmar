import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

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

const SLUG = "bi-an-ha-noi";
const WALLET = "0x1111111111111111111111111111111111111111";
const TOKEN = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";
const TX_HASH = "0x" + "a".repeat(64);

/** Deterministic EIP-1193 provider — records calls, never touches a real chain. */
const PROVIDER_SOURCE = `
  window.__cryptoCalls = [];
  window.ethereum = {
    isMetaMask: true,
    request: async ({ method, params }) => {
      window.__cryptoCalls.push({ method, params });
      if (method === "eth_requestAccounts") return ["${WALLET}"];
      if (method === "eth_chainId") return "0x89";
      if (method === "wallet_switchEthereumChain") return null;
      if (method === "eth_sendTransaction") return "${TX_HASH}";
      return null;
    },
    on: () => {},
    removeListener: () => {},
  };
`;

const setInput = async (page, selector, value) => {
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
  await sleep(60);
};

const isoTomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const fillAndSubmit = async (page) => {
  await setInput(page, "#booking-full-name", "Nguyen Van A");
  await setInput(page, "#booking-email", "crypto@example.com");
  await setInput(page, "#booking-phone", "0912345678");
  const iso = isoTomorrow();
  await page.click(`td[data-day="${iso}"] button`);
  await sleep(200);
  await page.click('button[type="submit"]');
  await sleep(600);
};

let browser = null;
try {
  browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 1400 } });
  const page = await getPage(browser);
  await page.evaluateOnNewDocument(PROVIDER_SOURCE);
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  await page.goto(`http://localhost:3000/vi/booking/checkout?tour=${SLUG}`, {
    waitUntil: "networkidle2",
    timeout: 60000,
  });
  await dismissPromo(page);
  await fillAndSubmit(page);

  // --- three rails
  const radios = await page.$$eval('input[name="payment-method"]', (els) =>
    els.map((el) => el.value)
  );
  check(
    "O1 three payment rails",
    radios.length === 3 && radios.includes("crypto_metamask"),
    JSON.stringify(radios)
  );

  // --- select crypto: formatted deposit panel (universal fallback)
  await page.click('input[name="payment-method"][value="crypto_metamask"]');
  await page.waitForSelector('[data-testid="crypto-payment-panel"]', { timeout: 8000 });
  check("O2 crypto panel shown", Boolean(await page.$('[data-testid="crypto-payment-panel"]')));
  const qr = await page.waitForSelector('[data-testid="crypto-qr"]', { timeout: 8000 }).catch(() => null);
  check("O3 deposit QR generated", Boolean(qr));
  const address = await page.$eval('[data-testid="crypto-address"]', (el) => el.textContent.trim());
  check("O4 deposit address = business wallet", address === WALLET, address);
  const network = await page.$eval('[data-testid="crypto-network"]', (el) => el.textContent.trim());
  check("O5 network hint = Polygon Mainnet", network === "Polygon Mainnet", network);
  const tokens = await page.$eval('[data-testid="crypto-tokens"]', (el) => el.textContent.trim());
  check("O6 accepted tokens USDT / USDC", tokens === "USDT / USDC", tokens);
  const amount = await page.$eval('[data-testid="crypto-amount"]', (el) => el.textContent.trim());
  check("O7 crypto amount quoted in USDT", /USDT$/.test(amount), amount);
  check("O8 copy-address button present", Boolean(await page.$('[data-testid="crypto-copy"]')));
  await (await page.$('[data-testid="crypto-payment-panel"]')).screenshot({ path: `${OUT}/o1-crypto-panel.png` });

  // --- MetaMask flow: connect → send → txHash
  check("O9 wallet detected (no fallback notice)", !(await page.$('[data-testid="crypto-no-wallet"]')));
  await page.click('[data-testid="crypto-pay"]');
  const txEl = await page.waitForSelector('[data-testid="crypto-txhash"]', { timeout: 10000 }).catch(() => null);
  check("O10 transaction hash captured", Boolean(txEl));
  const txText = txEl ? await txEl.evaluate((el) => el.textContent.trim()) : "";
  check("O11 hash = broadcast hash", txText === TX_HASH, txText.slice(0, 20));
  const status = await page.$eval('[data-testid="crypto-status"]', (el) => el.textContent.trim());
  check("O12 status success copy", status.length > 0 && !/chờ|pending/i.test(status), status);

  const calls = await page.evaluate(() => window.__cryptoCalls || []);
  const methods = calls.map((c) => c.method);
  check("O13 wallet RPC sequence", methods.includes("eth_requestAccounts") && methods.includes("wallet_switchEthereumChain") && methods.includes("eth_sendTransaction"), JSON.stringify(methods));
  const sent = calls.find((c) => c.method === "eth_sendTransaction");
  const tx = sent ? sent.params[0] : null;
  check(
    "O14 ERC-20 transfer to token contract w/ transfer selector",
    Boolean(tx) && tx.to.toLowerCase() === TOKEN.toLowerCase() && String(tx.data).startsWith("0xa9059cbb"),
    JSON.stringify(tx)
  );

  // --- order persisted with method + txHash
  const stored = await page.evaluate(() => {
    const raw = window.localStorage.getItem("vn-my-trips:v1");
    return raw ? JSON.parse(raw) : [];
  });
  const record = Array.isArray(stored) ? stored[0] : null;
  check(
    "O15 order saved with paymentMethod + txHash",
    Boolean(record) &&
      record.paymentMethod === "crypto_metamask" &&
      record.txHash === TX_HASH,
    JSON.stringify(record && { m: record.paymentMethod, h: record.txHash })
  );
  await page.screenshot({ path: `${OUT}/o2-crypto-success.png`, fullPage: true });

  // --- universal fallback: no wallet injected → QR-only
  const page2 = await browser.newPage();
  await page2.setViewport({ width: 390, height: 844 });
  page2.on("pageerror", (e) => errors.push(`pageerror2: ${e.message}`));
  await page2.goto(`http://localhost:3000/vi/booking/checkout?tour=${SLUG}`, {
    waitUntil: "networkidle2",
    timeout: 60000,
  });
  await dismissPromo(page2);
  await fillAndSubmit(page2);
  const radios2 = await page2.$$eval('input[name="payment-method"]', (els) =>
    els.map((el) => el.value)
  );
  check("O16a fallback page has rails", radios2.includes("crypto_metamask"), JSON.stringify(radios2));
  await page2.$eval('input[name="payment-method"][value="crypto_metamask"]', (el) => el.click());
  const panel2 = await page2
    .waitForSelector('[data-testid="crypto-payment-panel"], [data-testid="crypto-unconfigured"]', {
      timeout: 8000,
    })
    .catch(() => null);
  const panelHtml = panel2 ? await panel2.evaluate((el) => el.outerHTML.slice(0, 120)) : "none";
  check("O16b crypto UI rendered on fallback page", Boolean(panel2), panelHtml);
  const noWallet = await page2
    .waitForSelector('[data-testid="crypto-no-wallet"]', { timeout: 8000 })
    .catch(() => null);
  check("O16 no provider → fallback notice", Boolean(noWallet));
  check("O17 no provider → no pay button", !(await page2.$('[data-testid="crypto-pay"]')));
  check("O18 no provider → QR still offered", Boolean(await page2.$('[data-testid="crypto-qr"]')));
  const shot = await page2.$('[data-testid="crypto-payment-panel"]');
  if (shot) await shot.screenshot({ path: `${OUT}/o3-crypto-fallback.png` });
} catch (e) {
  errors.push(`exception: ${e.message}`);
} finally {
  await closeBrowser();
}

console.log(results.join("\n"));
if (errors.length) console.log("\nERRORS:\n" + errors.join("\n"));
process.exit(errors.length ? 1 : 0);

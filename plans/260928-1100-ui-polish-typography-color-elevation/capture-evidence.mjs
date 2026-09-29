import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const OUT = `${HERE}evidence`;
mkdirSync(OUT, { recursive: true });

const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(
      new URL(
        "../../.claude/skills/chrome-devtools/scripts/lib/browser.js",
        import.meta.url
      )
    )
  ).href
);

const BASE = "http://localhost:3000";
const shots = [
  { url: `${BASE}/vi`, name: "home-vi.png" },
  { url: `${BASE}/en`, name: "home-en.png" },
  { url: `${BASE}/vi/booking/checkout?tour=hcm`, name: "checkout.png" },
];

const browser = await getBrowser();
const page = await getPage(browser);
try {
  await page.setViewport({ width: 1440, height: 900 });
  for (const s of shots) {
    await page.goto(s.url, { waitUntil: "networkidle2", timeout: 60000 });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 800));
    await page.screenshot({ path: `${OUT}/${s.name}`, fullPage: true });
    console.log(`ok ${s.name}`);
  }
} finally {
  await closeBrowser();
}

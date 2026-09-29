import { fileURLToPath, pathToFileURL } from "node:url";

const { getBrowser, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(
      new URL(
        "../../.claude/skills/chrome-devtools/scripts/lib/browser.js",
        import.meta.url
      )
    )
  ).href
);

const html = pathToFileURL(
  fileURLToPath(new URL("./promo-banner.html", import.meta.url))
).href;
const out = fileURLToPath(
  new URL("../../public/images/promo-modal.png", import.meta.url)
);

const browser = await getBrowser({ headless: true });
try {
  const page = (await browser.pages())[0] || (await browser.newPage());
  await page.setViewport({ width: 1200, height: 800 });
  await page.goto(html, { waitUntil: "networkidle0" });
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1200, height: 800 } });
  console.log("wrote", out);
} finally {
  await closeBrowser();
}

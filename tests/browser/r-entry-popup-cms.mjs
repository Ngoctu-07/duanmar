import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });
const msg = {
  vi: JSON.parse(readFileSync(new URL("../../src/messages/vi.json", import.meta.url), "utf8")),
  en: JSON.parse(readFileSync(new URL("../../src/messages/en.json", import.meta.url), "utf8")),
};
const BASE = "http://localhost:3000";

const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url))
  ).href
);

/** Self-contained env reader (copied from tests/helpers/cms-expectations.mjs). */
function envValue(key) {
  if (process.env[key]) return process.env[key];
  const file = fileURLToPath(new URL("../../.env.local", import.meta.url));
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : undefined;
}

/** Live published siteConfiguration doc (no fabricated data). */
async function fetchSiteConfig() {
  const projectId = envValue("NEXT_PUBLIC_SANITY_PROJECT_ID");
  const dataset = envValue("NEXT_PUBLIC_SANITY_DATASET") || "production";
  if (!projectId) throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID missing");
  const query =
    '*[_type == "siteConfiguration"][0]{ _updatedAt, enableEntryPopup, entryPopupImage{ asset->{ url, metadata{ dimensions{ width, height } } } }, popupImage_vi{ asset->{ url, metadata{ dimensions{ width, height } } } }, popupImage_en{ asset->{ url, metadata{ dimensions{ width, height } } } } }';
  const url =
    `https://${projectId}.api.sanity.io/v2026-09-25/data/query/${dataset}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`CMS query failed: ${res.status}`);
  const json = await res.json();
  return json.result ?? null;
}

const results = [];
const errors = [];
const pageErrors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};

let browser = null;
try {
  // ---------- R1 live CMS read → derive mode (never hardcoded) ----------
  let doc = null;
  try {
    doc = await fetchSiteConfig();
  } catch (err) {
    check("R1 live siteConfiguration query succeeds (env projectId + .env.local fallback)", false, err.message);
    throw err;
  }
  // D2 fallback chain mirrored from layout.tsx (plan 260929-1617):
  // active locale → legacy shared asset → other locale.
  const pickAsset = (d, locale) =>
    d?.[`popupImage_${locale}`] ??
    d?.entryPopupImage ??
    d?.[locale === "vi" ? "popupImage_en" : "popupImage_vi"] ??
    null;
  const viAsset = pickAsset(doc, "vi");
  const enAsset = pickAsset(doc, "en");
  const assetUrl = viAsset?.asset?.url ?? null;
  const enabled = !!doc && doc.enableEntryPopup !== false && !!assetUrl;
  const mode = enabled ? "enabled" : "disabled";
  console.log(`mode=${mode} _updatedAt=${doc?._updatedAt ?? "(no doc)"}`);
  check(
    "R1 live siteConfiguration query succeeds (env projectId + .env.local fallback)",
    doc === null || typeof doc === "object",
    `mode=${mode} updatedAt=${doc?._updatedAt ?? "(none)"}`
  );

  const dims = viAsset?.asset?.metadata?.dimensions ?? null;
  const expectW = dims?.width ?? 1200;
  const expectH = dims?.height ?? 800;

  browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 900 } });
  const page = await getPage(browser);
  page.on("pageerror", (e) => pageErrors.push(e.message));
  await page.setCookie({ name: "NEXT_LOCALE", value: "vi", url: BASE });
  await page.goto(`${BASE}/vi`, { waitUntil: "networkidle2", timeout: 60000 });
  // No-reload sentinel: survives SPA locale switches, reset by a full document load.
  await page.evaluate(() => {
    window.__promoI18nNoReload = 1;
  });

  if (enabled) {
    // ---------- enabled branch ----------
    let promo = null;
    try {
      promo = await page.waitForSelector('[data-slot="promo-modal"]', { timeout: 10000 });
    } catch {
      promo = null;
    }
    const promoCount = await page.$$eval('[data-slot="promo-modal"]', (n) => n.length);
    check(
      "R2 modal [data-slot=\"promo-modal\"] appears after load",
      !!promo && promoCount === 1,
      `node=${!!promo} count=${promoCount}`
    );

    // R2 hygiene (plan 260930-1740): a stale reused tab may inherit hasSeenPopup=true
    // via browser.js ws-session reconnect → suppresses the first load. Clear + reload
    // (reload branch) restores a true first-show proof. Clean path: zero behavior change.
    const flaggedAtStart = await page.evaluate(
      () => sessionStorage.getItem("hasSeenPopup") === "true"
    );
    if (!promo && flaggedAtStart) {
      await page.evaluate(() => sessionStorage.removeItem("hasSeenPopup"));
      await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
      promo = await page
        .waitForSelector('[data-slot="promo-modal"]', { timeout: 10000 })
        .catch(() => null);
      const retriedCount = await page.$$eval('[data-slot="promo-modal"]', (n) => n.length);
      check(
        "R2 hygiene: cleared inherited hasSeenPopup + reload restores first-show",
        !!promo && retriedCount === 1,
        `node=${!!promo} count=${retriedCount}`
      );
    }

    // R17 sessionStorage flag written exactly when the modal first shows.
    const flagAfterShow = await page.evaluate(() => sessionStorage.getItem("hasSeenPopup"));
    check(
      'R17 sessionStorage hasSeenPopup === "true" after first show',
      flagAfterShow === "true",
      `flag=${flagAfterShow}`
    );

    const imgSrc = promo
      ? await page.evaluate(() => {
          const img = document.querySelector('[data-slot="promo-modal"] img');
          return img ? { raw: img.getAttribute("src"), loaded: img.naturalWidth > 0, w: img.getAttribute("width"), h: img.getAttribute("height"), alt: img.getAttribute("alt") } : null;
        })
      : null;
    // R4 asserts a loaded image — bounded wait for the CDN fetch instead of racing it
    if (promo) {
      await page
        .waitForFunction(
          () => {
            const img = document.querySelector('[data-slot="promo-modal"] img');
            return img && img.complete && img.naturalWidth > 0;
          },
          { timeout: 10000 }
        )
        .catch(() => {});
      imgSrc.loaded = await page.evaluate(() => {
        const img = document.querySelector('[data-slot="promo-modal"] img');
        return img ? img.naturalWidth > 0 : false;
      });
    }
    const decoded = imgSrc ? decodeURIComponent(imgSrc.raw) : "";
    check(
      "R3 modal img decodes to live CMS asset.url (cdn.sanity.io) — never /images/promo-modal.png",
      !!imgSrc && decoded.includes(assetUrl) && !decoded.includes("images/promo-modal.png"),
      `decoded=${decoded.slice(0, 140)} expected=${assetUrl}`
    );
    check(
      "R4 img loaded (naturalWidth>0) + width/height attrs == CMS metadata dimensions",
      !!imgSrc && imgSrc.loaded && imgSrc.w === String(expectW) && imgSrc.h === String(expectH),
      `loaded=${imgSrc?.loaded} attrs=${imgSrc?.w}x${imgSrc?.h} cms=${expectW}x${expectH}`
    );
    check(
      "R5 img alt == vi promo.imageAlt",
      !!imgSrc && imgSrc.alt === msg.vi.promo.imageAlt,
      `alt=${imgSrc?.alt}`
    );

    // --- R12–R14 frameless + 50.4rem sizing + overlay close chip (plan 260929-1440)
    const geo = await page.evaluate(() => {
      const box = document.querySelector('[data-slot="promo-modal"]');
      const img = box?.querySelector("img");
      const close = document.querySelector('[data-slot="promo-modal-close"]');
      if (!box || !img || !close) return null;
      const cs = getComputedStyle(box);
      const b = box.getBoundingClientRect();
      const ib = img.getBoundingClientRect();
      const cb = close.getBoundingClientRect();
      const ccs = getComputedStyle(close);
      const alphaMatch =
        ccs.backgroundColor.match(/\/\s*([\d.]+)\s*\)/) ||
        ccs.backgroundColor.match(/,\s*([\d.]+)\s*\)$/);
      return {
        padding: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft],
        bg: cs.backgroundColor,
        borderTopWidth: cs.borderTopWidth,
        width: b.width,
        viewport: window.innerWidth,
        closeVisible: cb.width > 0 && cb.height > 0,
        closeInsideImage:
          cb.top >= ib.top - 1 &&
          cb.bottom <= ib.bottom + 1 &&
          cb.left >= ib.left - 1 &&
          cb.right <= ib.right + 1,
        closeRightHalf: cb.left > ib.left + ib.width / 2,
        closeBgAlpha: alphaMatch ? Number(alphaMatch[1]) : 1,
        closeColor: ccs.color,
      };
    });
    check(
      "R12 frameless: padding 0, bg transparent, border 0",
      !!geo && geo.padding.every((p) => p === "0px") && geo.bg === "rgba(0, 0, 0, 0)" && geo.borderTopWidth === "0px",
      JSON.stringify(geo && { padding: geo.padding, bg: geo.bg, border: geo.borderTopWidth })
    );
    check(
      "R13 width = min(90vw, 50.4rem) → 806.4px @1280, never over 90vw",
      !!geo &&
        Math.abs(geo.width - 50.4 * 16) <= 2 &&
        geo.width <= geo.viewport * 0.9 + 1,
      JSON.stringify(geo && { width: geo.width, viewport: geo.viewport })
    );
    check(
      "R14 close chip overlays image top-right, dark bg (alpha≥0.5) + white icon",
      !!geo &&
        geo.closeVisible &&
        geo.closeInsideImage &&
        geo.closeRightHalf &&
        geo.closeBgAlpha >= 0.5 &&
        geo.closeColor === "rgb(255, 255, 255)",
      JSON.stringify(
        geo && {
          visible: geo.closeVisible,
          inside: geo.closeInsideImage,
          rightHalf: geo.closeRightHalf,
          alpha: geo.closeBgAlpha,
          color: geo.closeColor,
        }
      )
    );

    await page.screenshot({ path: `${OUT}/r-entry-popup-01-enabled.png` });
    await page.screenshot({ path: `${OUT}/r-entry-popup-02-frameless.png` });

    await page.click('[data-slot="promo-modal-close"]').catch(async () => {
      await page.keyboard.press("Escape").catch(() => {});
    });
    const promoGone = () =>
      !document.querySelector('[data-slot="promo-modal"]') &&
      !document.querySelector('[data-slot="dialog-overlay"]');
    await page.waitForFunction(promoGone, { timeout: 5000 }).catch(() => {});
    const gone = await page.evaluate(promoGone);
    check("R6 close button dismisses modal + overlay", gone, `gone=${gone}`);

    const navOk = await page
      .click('header a[href="/vi/tours/domestic"]')
      .then(() => page.waitForFunction(() => location.pathname === "/vi/tours/domestic", { timeout: 15000 }))
      .then(() => true)
      .catch(() => false);
    check("R7 page interactive after dismiss", navOk, `path=${await page.evaluate(() => location.pathname)}`);

    // ---------- R15/R16 locale-toggle suppression + hard reload (plan 260930-1740) ----------
    const clickHeaderLocale = (locale) =>
      page.evaluate((lc) => {
        const btn = [...document.querySelectorAll("header button")].find(
          (b) => b.textContent.trim() === lc && b.offsetParent !== null
        );
        if (!btn) return false;
        btn.click();
        return true;
      }, locale);

    const readModalState = () =>
      page.evaluate(() => {
        const img = document.querySelector('[data-slot="promo-modal"] img');
        const nav = performance.getEntriesByType("navigation")[0];
        return {
          path: location.pathname,
          count: document.querySelectorAll('[data-slot="promo-modal"]').length,
          src: img ? decodeURIComponent(img.getAttribute("src") || "") : null,
          alt: img ? img.getAttribute("alt") : null,
          marker: window.__promoI18nNoReload ?? null,
          navType: nav ? nav.type : null,
          flag: sessionStorage.getItem("hasSeenPopup"),
        };
      });

    const clickedEn = await clickHeaderLocale("en");
    await page.waitForFunction(() => location.pathname.startsWith("/en/"), { timeout: 8000 }).catch(() => {});
    // Reuse the historical 8s reopen window: a bug (re-open) resolves this fast, count 1 → FAIL.
    await page
      .waitForFunction(
        () => document.querySelectorAll('[data-slot="promo-modal"]').length === 1,
        { timeout: 8000 }
      )
      .catch(() => {});
    const enState = await readModalState();
    check(
      "R15 EN soft toggle does NOT reopen modal (path /en, soft nav: marker 1, navType navigate, flag set)",
      clickedEn &&
        enState.path.startsWith("/en/") &&
        enState.count === 0 &&
        enState.marker === 1 &&
        enState.navType === "navigate" &&
        enState.flag === "true",
      JSON.stringify({ clickedEn, ...enState })
    );

    const enExpected = enAsset?.asset?.url ?? null;
    await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
    await page
      .waitForFunction(
        () => document.querySelectorAll('[data-slot="promo-modal"]').length === 1,
        { timeout: 10000 }
      )
      .catch(() => {});
    const reState = await readModalState();
    check(
      "R16 hard reload DOES reopen modal on /en (navType reload, EN asset chain D2, marker reset, flag set)",
      reState.path.startsWith("/en/") &&
        reState.count === 1 &&
        !!enExpected &&
        reState.src !== null &&
        reState.src.includes(enExpected) &&
        reState.alt === msg.en.promo.imageAlt &&
        reState.navType === "reload" &&
        reState.marker === null &&
        reState.flag === "true",
      JSON.stringify({ ...reState, enExpected })
    );
    await page.screenshot({ path: `${OUT}/r-entry-popup-03-locale-en.png` });

    // Modal present here → safe to dismiss. Guard the click: a failed R16 must not
    // fall into puppeteer's 30s wait on an absent selector (check() failures don't halt).
    if (reState.count === 1) {
      await page.click('[data-slot="promo-modal-close"]').catch(async () => {
        await page.keyboard.press("Escape").catch(() => {});
      });
      const goneAfterReload = await page
        .waitForFunction(
          () =>
            !document.querySelector('[data-slot="promo-modal"]') &&
            !document.querySelector('[data-slot="dialog-overlay"]'),
          { timeout: 5000 }
        )
        .then(() => true)
        .catch(() => false);
      check("R16b close chip dismisses reopened modal + overlay", goneAfterReload, `gone=${goneAfterReload}`);
    } else {
      check("R16b close chip dismisses reopened modal + overlay", false, "skipped: modal absent after R16");
    }

    // R19: on a RELOAD-loaded document the flag gate is intentionally bypassed
    // (navType stays "reload" for the document's lifetime) — the module marker must
    // still block a locale-segment REMOUNT from re-opening the dialog mid-document.
    const clickedVi = await clickHeaderLocale("vi");
    await page.waitForFunction(() => location.pathname.startsWith("/vi/"), { timeout: 8000 }).catch(() => {});
    await page
      .waitForFunction(
        () => document.querySelectorAll('[data-slot="promo-modal"]').length === 1,
        { timeout: 8000 }
      )
      .catch(() => {});
    const remountState = await readModalState();
    check(
      "R19 locale remount on reload doc does NOT reopen (navType reload stays, path /vi, flag set)",
      clickedVi &&
        remountState.path.startsWith("/vi/") &&
        remountState.count === 0 &&
        remountState.navType === "reload" &&
        remountState.flag === "true",
      JSON.stringify({ clickedVi, ...remountState })
    );

    // R18: same-tab second full document load (navType "navigate") suppressed by the flag.
    await page.goto(`${BASE}/en`, { waitUntil: "networkidle2", timeout: 60000 });
    const secondNavType = await page.evaluate(
      () => performance.getEntriesByType("navigation")[0]?.type ?? null
    );
    await page
      .waitForFunction(
        () => document.querySelectorAll('[data-slot="promo-modal"]').length === 1,
        { timeout: 8000 }
      )
      .catch(() => {});
    const second = await page.evaluate(() => ({
      count: document.querySelectorAll('[data-slot="promo-modal"]').length,
      flag: sessionStorage.getItem("hasSeenPopup"),
      marker: window.__promoI18nNoReload ?? null,
    }));
    check(
      "R18 second full load same tab (navType navigate) suppressed by hasSeenPopup flag",
      secondNavType === "navigate" &&
        second.marker === null &&
        second.count === 0 &&
        second.flag === "true",
      JSON.stringify({ secondNavType, ...second })
    );
  } else {
    // ---------- disabled/absent branch ----------
    await page.waitForSelector('[data-slot="promo-modal"]', { timeout: 3000 }).catch(() => null);
    const promoCount = await page.$$eval('[data-slot="promo-modal"]', (n) => n.length);
    check(
      "R8 zero [data-slot=\"promo-modal\"] after 3s hydration window",
      promoCount === 0,
      `count=${promoCount} mode=${mode}`
    );
    const overlayCount = await page.$$eval('[data-slot="dialog-overlay"]', (n) => n.length);
    check(
      "R9 zero [data-slot=\"dialog-overlay\"] after 3s hydration window",
      overlayCount === 0,
      `count=${overlayCount}`
    );

    await page.screenshot({ path: `${OUT}/r-entry-popup-01-disabled.png` });

    const navOk = await page
      .click('header a[href="/vi/tours/domestic"]')
      .then(() => page.waitForFunction(() => location.pathname === "/vi/tours/domestic", { timeout: 15000 }))
      .then(() => true)
      .catch(() => false);
    check("R10 page interactive with popup suppressed", navOk, `path=${await page.evaluate(() => location.pathname)}`);
  }

  // ---------- R11 zero uncaught page errors across the session
  check("R11 zero uncaught pageerrors", pageErrors.length === 0, JSON.stringify(pageErrors.slice(0, 3)));
  await closeBrowser(browser);
  browser = null;
} catch (error) {
  errors.push(`fatal: ${error.message}`);
} finally {
  if (browser) await closeBrowser(browser).catch(() => {});
}

console.log(results.join("\n"));
if (errors.length > 0) {
  console.error(`\n${errors.length} problem(s):`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}
console.log(`\nall ${results.length} checks passed`);

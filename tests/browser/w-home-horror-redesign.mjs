import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dismissPromo } from "../helpers/promo.mjs";

/**
 * W — homepage horror/escape-room redesign.
 *
 * Verifies the rendered geometry/typography rather than class strings:
 * 100vh ambient hero with a media-only 7% brightness grade plus a static 10%
 * grain overlay, a borderless promo film capped at 50vw that breaks out 60%
 * inside / 40% below,
 * no static wordmark, strict hero → search → featured order, a halved
 * search→featured gap, Gypsy Curse display headings, and open 16/9 card thumbnails
 * with condensed uppercase titles and blood-red CTAs.
 */

const OUT = fileURLToPath(new URL("../.output", import.meta.url));
mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";

const { getBrowser, getPage, closeBrowser } = await import(
  pathToFileURL(
    fileURLToPath(
      new URL("../../.claude/skills/chrome-devtools/scripts/lib/browser.js", import.meta.url)
    )
  ).href
);

const results = [];
const errors = [];
const check = (name, ok, detail = "") => {
  results.push(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
  if (!ok) errors.push(name);
};
const near = (a, b, tol = 3) => typeof a === "number" && Math.abs(a - b) <= tol;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let browser = null;
try {
  browser = await getBrowser({ headless: true, viewport: { width: 1280, height: 900 } });
  const page = await getPage(browser);
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  await page.goto(`${BASE}/en`, { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);

  const layout = await page.evaluate(() => {
    const hero = document.getElementById("home-hero");
    const search = document.querySelector('[data-testid="home-search"]');
    const featured = document.querySelector('[data-testid="featured-destinations"]');
    const canvas = document.querySelector(".horror-canvas");
    const frame = document.querySelector('[data-testid="hero-video-frame"]');
    const video = document.querySelector('[data-testid="hero-video"]');
    const ambient = document.querySelector('[data-testid="hero-ambient"]');
    const bgMedia = document.querySelector('[data-testid="hero-background-media"]');
    const bgVideo = document.querySelector('[data-testid="hero-background-video"]');
    const h1 = hero?.querySelector("h1");
    const heading = featured?.querySelector("h2");
    const fog = ambient?.querySelector(".horror-fog-a");
    const crtLayer = ambient?.querySelector('[data-testid="hero-crt"]');
    const scanlines = crtLayer?.querySelector(".crt-scanlines");
    const rgb = crtLayer?.querySelector(".crt-rgb");
    const band = crtLayer?.querySelector(".crt-band");
    const glitch = crtLayer?.querySelector(".crt-glitch");
    const scrim = hero
      ? [...hero.children].find((el) => {
          if (el.tagName !== "DIV") return false;
          const probe = document.createElement("canvas");
          probe.width = probe.height = 1;
          const ctx = probe.getContext("2d");
          if (!ctx) return false;
          ctx.fillStyle = getComputedStyle(el).backgroundColor;
          ctx.fillRect(0, 0, 1, 1);
          const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
          return r === 0 && g === 0 && b === 0 && Math.abs(a / 255 - 0.07) < 0.01;
        })
      : null;
    const heavyVignette = ambient
      ? [...ambient.querySelectorAll("div")].some((el) =>
          /rgba\(0, 0, 0, 0\.85\)/.test(getComputedStyle(el).backgroundImage)
        )
      : false;
    const rect = (el) => (el ? el.getBoundingClientRect().toJSON() : null);
    const heroRect = rect(hero);
    const frameRect = rect(frame);
    const inputRect = search?.querySelector("input")?.getBoundingClientRect();
    const featuredHeaderRect = featured?.querySelector("header")?.getBoundingClientRect();
    return {
      hero: rect(hero),
      viewport: { w: window.innerWidth, h: window.innerHeight },
      searchTestid: hero?.nextElementSibling?.getAttribute("data-testid") ?? null,
      featuredTestid: search?.nextElementSibling?.getAttribute("data-testid") ?? null,
      canvasBg: canvas ? getComputedStyle(canvas).backgroundColor : null,
      frame: frameRect,
      frameCenter: frameRect
        ? { x: frameRect.left + frameRect.width / 2, y: frameRect.top + frameRect.height / 2 }
        : null,
      frameOverlap:
        frameRect && heroRect
          ? (heroRect.bottom - frameRect.top) / frameRect.height
          : null,
      frameOutside:
        frameRect && heroRect
          ? (frameRect.bottom - heroRect.bottom) / frameRect.height
          : null,
      gap: inputRect && featuredHeaderRect ? featuredHeaderRect.top - inputRect.bottom : null,
      hasVideo: Boolean(video),
      videoAttrs: video
        ? {
            autoplay: video.autoplay,
            muted: video.muted,
            loop: video.loop,
            playsInline: video.playsInline,
            volume: video.volume,
            paused: video.paused,
          }
        : null,
      ambient: Boolean(ambient),
      fogAnimation: fog ? getComputedStyle(fog).animationName : null,
      scrim: Boolean(scrim),
      heavyVignette,
      bgMediaFilter: bgMedia ? getComputedStyle(bgMedia).filter : null,
      bgMediaOpacity: bgMedia ? getComputedStyle(bgMedia).opacity : null,
      crtRect: rect(crtLayer),
      crtLayers: ambient
        ? ambient.querySelectorAll(".crt-scanlines, .crt-rgb, .crt-band, .crt-glitch").length
        : 0,
      crtOverflow: crtLayer ? getComputedStyle(crtLayer).overflow : null,
      crtPointerEvents: crtLayer ? getComputedStyle(crtLayer).pointerEvents : null,
      crtOpacity: crtLayer ? getComputedStyle(crtLayer).opacity : null,
      scanBlend: scanlines ? getComputedStyle(scanlines).mixBlendMode : null,
      scanBackground: scanlines ? getComputedStyle(scanlines).backgroundImage : null,
      rgbBlend: rgb ? getComputedStyle(rgb).mixBlendMode : null,
      rgbAnimation: rgb ? getComputedStyle(rgb).animationName : null,
      rgbBackground: rgb ? getComputedStyle(rgb).backgroundImage : null,
      bandAnimation: band ? getComputedStyle(band).animationName : null,
      glitchAnimation: glitch ? getComputedStyle(glitch).animationName : null,
      promoFilter: video ? getComputedStyle(video).filter : null,
      promoOpacity: video ? getComputedStyle(video).opacity : null,
      heroText: h1?.textContent?.trim() ?? null,
      h1SrOnly: Boolean(h1 && h1.className.includes("sr-only")),
      hasWordmark: Boolean(document.querySelector('[data-testid="hero-display"]')),
      heroTextHasWordmark: (hero?.textContent ?? "").includes("DECODE TRAVEL"),
      headingFont: heading ? getComputedStyle(heading).fontFamily : null,
      headingColor: heading ? getComputedStyle(heading).color : null,
      bgMediaType: bgMedia?.getAttribute("data-media-type") ?? null,
      bgVideoAttrs: bgVideo
        ? { autoplay: bgVideo.autoplay, muted: bgVideo.muted, loop: bgVideo.loop, playsInline: bgVideo.playsInline }
        : null,
    };
  });

  check("W1 hero renders", Boolean(layout.hero), JSON.stringify(layout.hero));
  check(
    "W2 hero fills the viewport and starts at the top",
    layout.hero && near(layout.hero.height, layout.viewport.h, 2) && near(layout.hero.top, 0, 2),
    JSON.stringify({ h: layout.hero?.height, top: layout.hero?.top, vh: layout.viewport.h })
  );
  check("W3 dark canvas is #121212", layout.canvasBg === "rgb(18, 18, 18)", layout.canvasBg);
  check(
    "W4 media stays perfectly clear (no CRT/noise) at 88% brightness; promo sharp",
    layout.scrim === false &&
      layout.heavyVignette === false &&
      layout.bgMediaOpacity === "1" &&
      layout.bgMediaFilter === "brightness(0.88)" &&
      !layout.bgMediaFilter.includes("blur(") &&
      !layout.bgMediaFilter.includes("sepia(") &&
      !layout.bgMediaFilter.includes("contrast(") &&
      layout.crtLayers === 0 &&
      layout.crtRect === null &&
      layout.promoFilter === "none" &&
      layout.promoOpacity === "1",
    JSON.stringify({
      scrim: layout.scrim,
      vignette: layout.heavyVignette,
      bgFilter: layout.bgMediaFilter,
      bgOpacity: layout.bgMediaOpacity,
      crtLayers: layout.crtLayers,
      crtRect: layout.crtRect,
      promoFilter: layout.promoFilter,
      promoOpacity: layout.promoOpacity,
    })
  );
  check(
    "W5 ambient backdrop + drifting fog present",
    layout.ambient && layout.fogAnimation && layout.fogAnimation !== "none",
    JSON.stringify({ ambient: layout.ambient, animation: layout.fogAnimation })
  );
  check(
    "W6 foreground promo film is 50vw (capped at 768px) and breaks out 60/40",
    layout.hasVideo
      ? layout.frame &&
          near(layout.frame.width, Math.min(layout.viewport.w * 0.5, 768), 3) &&
          near(layout.frameCenter.x, layout.viewport.w / 2) &&
          near(layout.frameOverlap, 0.6, 0.01) &&
          near(layout.frameOutside, 0.4, 0.01)
      : true,
    JSON.stringify({
      frame: layout.frame?.width,
      expected: Math.min(layout.viewport.w * 0.5, 768),
      centerX: layout.frameCenter?.x,
      overlap: layout.frameOverlap,
      outside: layout.frameOutside,
      viewport: layout.viewport,
    })
  );
  if (layout.hasVideo) {
    check(
      "W6b promo film is unmuted, looping, inline and capped at 85% volume",
      layout.videoAttrs?.autoplay &&
        layout.videoAttrs?.muted === false &&
        layout.videoAttrs?.loop &&
        layout.videoAttrs?.playsInline &&
        near(layout.videoAttrs?.volume, 0.85, 0.001),
      JSON.stringify(layout.videoAttrs)
    );

    // Unmuted autoplay can be policy-blocked (headless Chrome defaults to it):
    // the hook must arm a gesture unlock instead of throwing NotAllowedError.
    if (layout.videoAttrs?.paused) {
      await page.mouse.click(24, 860);
      await sleep(900);
    }
    const audio = await page.$eval('[data-testid="hero-video"]', (v) => ({
      paused: v.paused,
      muted: v.muted,
      volume: v.volume,
    }));
    check(
      "W6b2 promo audio plays at 85% (autoplay allowed or first-gesture unlock)",
      !audio.paused && audio.muted === false && near(audio.volume, 0.85, 0.001),
      JSON.stringify(audio)
    );
  }
  if (layout.bgMediaType === "video") {
    check(
      "W6c CMS background video autoplays muted, looping, inline",
      layout.bgVideoAttrs?.autoplay &&
        layout.bgVideoAttrs?.muted &&
        layout.bgVideoAttrs?.loop &&
        layout.bgVideoAttrs?.playsInline,
      JSON.stringify(layout.bgVideoAttrs)
    );
  }
  check("W7 search sits immediately below the hero", layout.searchTestid === "home-search", layout.searchTestid);
  check(
    "W8 featured destinations sit immediately below the search",
    layout.featuredTestid === "featured-destinations",
    layout.featuredTestid
  );
  check(
    "W8b search → featured gap is halved (~104px @1280, was ~208px)",
    near(layout.gap, 104, 6),
    JSON.stringify({ gap: layout.gap, expected: 104 })
  );
  check(
    "W9 no static display wordmark; only an sr-only CMS H1",
    !layout.hasWordmark &&
      !layout.heroTextHasWordmark &&
      layout.h1SrOnly &&
      (layout.heroText?.length ?? 0) > 0,
    JSON.stringify({
      display: layout.hasWordmark,
      text: layout.heroTextHasWordmark,
      h1: layout.heroText,
      srOnly: layout.h1SrOnly,
    })
  );

  const card = await page.evaluate(() => {
    const featured = document.querySelector('[data-testid="featured-destinations"]');
    const c = featured?.querySelector('[data-slot="card"]');
    const h2 = featured?.querySelector("h2");
    if (!c) return null;
    const img = c.querySelector("img");
    const thumb = img?.parentElement;
    const h3 = c.querySelector("h3");
    const cta = [...c.querySelectorAll("span")].find(
      (s) => s.className.includes("inline-flex") && s.className.includes("rounded-none")
    );
    const read = (el) => (el ? getComputedStyle(el) : null);
    // Tailwind v4's `shadow-none` compiles to fully transparent shadow layers
    // rather than the literal `none`, so treat zero-alpha shadows as absent.
    const shadowVisible = (value) => {
      if (!value || value === "none") return false;
      const colors = value.match(/rgba?\([^)]*\)/g) ?? [];
      return colors.some((color) => {
        const parts = (color.match(/rgba?\(([^)]+)\)/)?.[1] ?? "")
          .split(",")
          .map((part) => Number.parseFloat(part.trim()));
        const alpha = parts.length === 4 ? parts[3] : 1;
        return alpha > 0;
      });
    };
    const shadow = read(c)?.boxShadow ?? "none";
    const thumbRect = thumb?.getBoundingClientRect();
    return {
      bg: read(c)?.backgroundColor,
      shadow: shadowVisible(shadow) ? shadow : "none",
      border: read(c)?.borderTopWidth,
      radius: thumb ? parseFloat(read(thumb).borderTopLeftRadius) : null,
      ratio: thumbRect ? thumbRect.width / thumbRect.height : null,
      titleFont: h3 ? read(h3).fontFamily : null,
      titleTransform: h3 ? read(h3).textTransform : null,
      titleSize: h3 ? parseFloat(read(h3).fontSize) : null,
      titleColor: h3 ? read(h3).color : null,
      headingFont: h2 ? read(h2).fontFamily : null,
      ctaBg: cta ? read(cta).backgroundColor : null,
      ctaRadius: cta ? Number.parseFloat(read(cta).borderTopLeftRadius) : null,
      cardCount: featured.querySelectorAll('[data-slot="card"]').length,
    };
  });

  check("W10 featured cards render", Boolean(card) && card.cardCount > 0, JSON.stringify(card?.cardCount));
  check("W11 card box is transparent with no border/shadow", card && card.bg === "rgba(0, 0, 0, 0)" && card.border === "0px" && card.shadow === "none", JSON.stringify(card && { bg: card.bg, border: card.border, shadow: card.shadow }));
  check("W12 thumbnail is a 16/9 landscape frame with strict 90-degree corners", card && card.ratio >= 1.7 && card.ratio <= 1.85 && card.radius === 0, JSON.stringify({ ratio: card?.ratio?.toFixed(3), radius: card?.radius }));
  check("W13 tour titles use localized Gypsy in white at the original size", card && /gypsy.?curse/i.test(card.titleFont) && card.titleTransform === "uppercase" && card.titleSize >= 24 && card.titleSize <= 40 && card.titleColor === "rgb(255, 255, 255)", JSON.stringify({ font: card?.titleFont, transform: card?.titleTransform, size: card?.titleSize, color: card?.titleColor }));
  check("W14 featured heading uses localized Gypsy in white", card && /gypsy.?curse/i.test(card.headingFont) && layout.headingColor === "rgb(255, 255, 255)", JSON.stringify({ font: card?.headingFont, color: layout.headingColor }));
  check("W15 CTA is blood red (#b3151b)", card && card.ctaBg === "rgb(179, 21, 27)", card?.ctaBg);
  check(
    "W15a CTA corners stay strictly sharp (0px)",
    card && card.ctaRadius === 0,
    JSON.stringify({ radius: card?.ctaRadius })
  );

  // ---------- VI typography guard: Oswald diacritics + localized Gypsy editorial ----------
  await page.goto(`${BASE}/vi`, { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  const viType = await page.evaluate(() => {
    const h2 = document.querySelector('[data-testid="featured-destinations"] h2');
    const h3 = document.querySelector('[data-testid="featured-destinations"] [data-slot="card"] h3');
    const aboutH2 = document.querySelector('[data-testid="about-us-section"] h2');
    const read = (el) => (el ? getComputedStyle(el).fontFamily : null);
    return h2
      ? {
          headingFont: read(h2),
          titleFont: read(h3),
          aboutFont: read(aboutH2),
          text: h2.textContent.trim(),
          titleText: h3?.textContent.trim() ?? "",
          aboutText: aboutH2?.textContent.trim() ?? "",
          lang: document.querySelector(".horror-canvas")?.getAttribute("lang"),
        }
      : null;
  });
  check(
    "W15b VI featured/tour titles and editorial heading use localized Gypsy",
    viType &&
      /gypsy.?curse/i.test(viType.headingFont) &&
      /gypsy.?curse/i.test(viType.titleFont) &&
      /gypsy.?curse/i.test(viType.aboutFont) &&
      viType.text.length > 0 &&
      viType.titleText.length > 0 &&
      viType.aboutText.length > 0 &&
      viType.lang === "vi",
    JSON.stringify(viType)
  );

  // Homepage blog cards: larger white Gypsy titles that turn brand red when the
  // whole card is hovered (parent `group` + `group-hover:text-link`).
  const blogCards = await page.evaluate(() => {
    const section = document.querySelector('[data-testid="stories-section"]');
    const heading = section?.querySelector("h2");
    const card = section?.querySelector("a.group");
    const title = card?.querySelector("h2");
    const read = (el) => (el ? getComputedStyle(el) : null);
    return section && title
      ? {
          headingFont: read(heading)?.fontFamily,
          headingSize: heading ? parseFloat(read(heading).fontSize) : null,
          headingColor: read(heading)?.color,
          titleFont: read(title)?.fontFamily,
          titleSize: parseFloat(read(title).fontSize),
          titleColor: read(title)?.color,
          titleText: title.textContent.trim(),
        }
      : null;
  });
  check(
    "W15c homepage blog cards use a 24-30px white Gypsy title",
    blogCards &&
      /gypsy.?curse/i.test(blogCards.titleFont) &&
      /gypsy.?curse/i.test(blogCards.headingFont) &&
      blogCards.titleSize >= 24 &&
      blogCards.titleSize <= 30 &&
      blogCards.titleColor === "rgb(255, 255, 255)" &&
      blogCards.headingSize >= 60 &&
      blogCards.headingSize <= 76,
    JSON.stringify(blogCards)
  );
  let hoverColor = null;
  if (blogCards) {
    await page.hover('[data-testid="stories-section"] a.group');
    await new Promise((resolve) => setTimeout(resolve, 250));
    hoverColor = await page.$eval(
      '[data-testid="stories-section"] a.group h2',
      (el) => getComputedStyle(el).color
    );
  }
  check(
    "W15d hovering a blog card turns its title brand red",
    hoverColor === "rgb(229, 72, 77)",
    String(hoverColor)
  );

  await page.setViewport({ width: 375, height: 812 });
  await page.reload({ waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  const mobile = await page.evaluate(() => {
    const hero = document.getElementById("home-hero");
    const search = document.querySelector('[data-testid="home-search"]');
    const input = search?.querySelector("input");
    const featured = document.querySelector('[data-testid="featured-destinations"]');
    const iRect = input?.getBoundingClientRect();
    const fRect = featured?.querySelector("header")?.getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      heroH: hero?.getBoundingClientRect().height ?? null,
      vh: window.innerHeight,
      gap: iRect && fRect ? fRect.top - iRect.bottom : null,
    };
  });
  check("W16 no horizontal overflow @375", mobile.overflow <= 0, JSON.stringify(mobile));
  check("W17 hero still 100vh @375", near(mobile.heroH, mobile.vh, 2), JSON.stringify(mobile));
  check("W17b search → featured gap halved on mobile (~72px)", near(mobile.gap, 72, 6), JSON.stringify({ gap: mobile.gap }));

  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`${BASE}/en`, { waitUntil: "networkidle2", timeout: 60000 });
  await dismissPromo(page);
  await page.screenshot({ path: `${OUT}/w-home-horror.png` });
  check("W18 zero pageerrors", pageErrors.length === 0, pageErrors.join("; "));

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

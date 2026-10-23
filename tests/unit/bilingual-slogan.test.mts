import { readFileSync } from "node:fs";

import { pickBilingual } from "../../src/lib/bilingual-string.ts";
import { HOMEPAGE_QUERY } from "../../src/sanity/queries/homepage.ts";
import { SITE_CONFIGURATION_QUERY } from "../../src/sanity/queries/site-configuration.ts";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

const layoutSource = read("src/app/[locale]/layout.tsx");
const homePageSource = read("src/app/[locale]/page.tsx");
const footerSource = read("src/components/layout/footer.tsx");
const heroSource = read("src/components/homepage/hero-section.tsx");
const siteConfigSchema = read("src/sanity/schemaTypes/site-configuration.ts");
const homepageSchema = read("src/sanity/schemaTypes/homepage.ts");
const messagesVi = JSON.parse(read("src/messages/vi.json"));
const messagesEn = JSON.parse(read("src/messages/en.json"));

let passed = 0;
let failed = 0;
const check = (name: string, fn: () => void) => {
  try {
    fn();
    passed += 1;
    console.log(`ok   ${name}`);
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${name} :: ${(error as Error).message}`);
  }
};

/* --- pickBilingual resolution --- */

check("active locale wins when present", () => {
  const out = pickBilingual({ vi: "Tiếng Việt", en: "English" }, "vi");
  if (out !== "Tiếng Việt") throw new Error(String(out));
});

check("en locale picks the en branch", () => {
  const out = pickBilingual({ vi: "Tiếng Việt", en: "English" }, "en");
  if (out !== "English") throw new Error(String(out));
});

check("empty active locale falls back to the other language", () => {
  const out = pickBilingual({ vi: "", en: "English" }, "vi");
  if (out !== "English") throw new Error(String(out));
});

check("whitespace-only active locale counts as empty", () => {
  const out = pickBilingual({ vi: "   ", en: "English" }, "vi");
  if (out !== "English") throw new Error(String(out));
});

check("result is trimmed", () => {
  const out = pickBilingual({ vi: "  Slogan  ", en: "x" }, "vi");
  if (out !== "Slogan") throw new Error(String(out));
});

check("both languages blank → null (caller falls back to i18n)", () => {
  const out = pickBilingual({ vi: "", en: " " }, "vi");
  if (out !== null) throw new Error(String(out));
});

check("null payload → null", () => {
  if (pickBilingual(null, "vi") !== null) throw new Error("expected null");
});

check("unknown locale falls back to the secondary branch", () => {
  const out = pickBilingual({ vi: "Tiếng Việt", en: "English" }, "de");
  if (out !== "English") throw new Error(String(out));
});

/* --- schema contracts (Studio) --- */

check("siteConfiguration defines bilingual footerSlogan object", () => {
  if (!siteConfigSchema.includes('name: "footerSlogan"')) throw new Error("footerSlogan field missing");
  if (!siteConfigSchema.includes('name: "footerSlogan"') || !/footerSlogan[\s\S]{0,400}type: "object"/.test(siteConfigSchema))
    throw new Error("footerSlogan is not an object field");
  const block = siteConfigSchema.slice(siteConfigSchema.indexOf('name: "footerSlogan"'));
  if (!block.includes('name: "vi"') || !block.includes('name: "en"')) throw new Error("footerSlogan needs vi+en keys");
});

check("homepage defines bilingual heroSlogan object", () => {
  if (!homepageSchema.includes('name: "heroSlogan"')) throw new Error("heroSlogan field missing");
  const block = homepageSchema.slice(homepageSchema.indexOf('name: "heroSlogan"'));
  if (!/type: "object"/.test(block.slice(0, 300))) throw new Error("heroSlogan is not an object field");
  if (!block.includes('name: "vi"') || !block.includes('name: "en"')) throw new Error("heroSlogan needs vi+en keys");
});

check("legacy heroSubtitle field kept for back-compat", () => {
  if (!homepageSchema.includes('name: "heroSubtitle"')) throw new Error("heroSubtitle field missing");
});

check("homepage defines heroBackgroundMedia + heroPromoVideo file fields", () => {
  const bg = homepageSchema.slice(homepageSchema.indexOf('name: "heroBackgroundMedia"'));
  if (!/type: "file"/.test(bg.slice(0, 400))) throw new Error("heroBackgroundMedia must be a file asset");
  if (!bg.slice(0, 400).includes("image/gif")) throw new Error("heroBackgroundMedia must accept GIFs");
  const promo = homepageSchema.slice(homepageSchema.indexOf('name: "heroPromoVideo"'));
  if (!/type: "file"/.test(promo.slice(0, 400))) throw new Error("heroPromoVideo must be a file asset");
});

/* --- query contracts --- */

check("HOMEPAGE_QUERY selects heroSlogan {vi, en}", () => {
  if (!HOMEPAGE_QUERY.includes("heroSlogan{ vi, en }")) throw new Error(HOMEPAGE_QUERY);
  if (!HOMEPAGE_QUERY.includes("heroSubtitle")) throw new Error("legacy heroSubtitle dropped");
});

check("SITE_CONFIGURATION_QUERY selects footerSlogan {vi, en}", () => {
  if (!SITE_CONFIGURATION_QUERY.includes("footerSlogan{ vi, en }")) throw new Error(SITE_CONFIGURATION_QUERY);
});

check("HOMEPAGE_QUERY selects hero background + centered promo assets", () => {
  if (!HOMEPAGE_QUERY.includes("heroBackgroundMedia { asset->{url, mimeType} }"))
    throw new Error("heroBackgroundMedia not selected");
  if (!HOMEPAGE_QUERY.includes("heroPromoVideo { asset->{url, mimeType} }"))
    throw new Error("heroPromoVideo not selected");
});

/* --- frontend binding (no hardcoded slogan strings) --- */

check("layout resolves footerSlogan for the active locale and passes it down", () => {
  if (!layoutSource.includes("pickBilingual(siteConfig?.footerSlogan, locale)")) throw new Error("resolution missing");
  if (!/<Footer[^>]*slogan=\{footerSlogan\}/.test(layoutSource)) throw new Error("slogan prop not wired");
});

check("homepage no longer resolves/passes the bilingual hero slogan", () => {
  if (homePageSource.includes("heroSlogan")) throw new Error("heroSlogan still resolved in page.tsx");
  if (/\bslogan=\{/.test(homePageSource)) throw new Error("slogan prop still passed to HeroSection");
});

check("footer renders the slogan prop with i18n fallback + testid", () => {
  if (!footerSource.includes('data-testid="footer-slogan"')) throw new Error("testid missing");
  if (!footerSource.includes("slogan ?? tf(\"tagline\")")) throw new Error("fallback missing");
  if (footerSource.includes("Khám phá vẻ đẹp")) throw new Error("hardcoded VI slogan still in footer");
  if (footerSource.includes("Discover the beauty")) throw new Error("hardcoded EN slogan still in footer");
});

check("hero paints no static display wordmark and binds CMS media", () => {
  if (heroSource.includes('data-testid="hero-display"')) throw new Error("static display wordmark still present");
  if (heroSource.includes('data-testid="hero-slogan"')) throw new Error("hero subtitle element still present");
  if (heroSource.includes("DECODE TRAVEL")) throw new Error("hardcoded wordmark copy still in hero");
  if (!heroSource.includes("backgroundMedia")) throw new Error("hero background media prop missing");
  if (!heroSource.includes("hero-video")) throw new Error("centered promo video missing");
  if (!heroSource.includes("autoPlay") || !heroSource.includes("playsInline"))
    throw new Error("hero media autoplay/playsInline attributes missing");
});

check("homepage maps heroBackgroundMedia + heroPromoVideo from the CMS", () => {
  if (!homePageSource.includes("heroBackgroundMedia")) throw new Error("heroBackgroundMedia not mapped");
  if (!homePageSource.includes("heroPromoVideo")) throw new Error("heroPromoVideo not mapped");
  if (!/backgroundMedia=\{heroBackgroundMedia\}/.test(homePageSource))
    throw new Error("background media not passed to HeroSection");
});

check("i18n hero + fallback strings present in both locales", () => {
  if (!messagesVi.footer.tagline || !messagesEn.footer.tagline) throw new Error("footer.tagline missing");
  if (!messagesVi.home.heroSubtitle || !messagesEn.home.heroSubtitle) throw new Error("home.heroSubtitle missing");
  if (!messagesVi.home.heroTitle || !messagesEn.home.heroTitle) throw new Error("home.heroTitle missing");
  if (messagesVi.home.heroDisplay || messagesEn.home.heroDisplay)
    throw new Error("home.heroDisplay must be removed with the static wordmark");
});

console.log(`${passed}/${passed + failed} assertions passed`);
process.exit(failed === 0 ? 0 : 1);

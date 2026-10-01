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

/* --- query contracts --- */

check("HOMEPAGE_QUERY selects heroSlogan {vi, en}", () => {
  if (!HOMEPAGE_QUERY.includes("heroSlogan{ vi, en }")) throw new Error(HOMEPAGE_QUERY);
  if (!HOMEPAGE_QUERY.includes("heroSubtitle")) throw new Error("legacy heroSubtitle dropped");
});

check("SITE_CONFIGURATION_QUERY selects footerSlogan {vi, en}", () => {
  if (!SITE_CONFIGURATION_QUERY.includes("footerSlogan{ vi, en }")) throw new Error(SITE_CONFIGURATION_QUERY);
});

/* --- frontend binding (no hardcoded slogan strings) --- */

check("layout resolves footerSlogan for the active locale and passes it down", () => {
  if (!layoutSource.includes("pickBilingual(siteConfig?.footerSlogan, locale)")) throw new Error("resolution missing");
  if (!/<Footer[^>]*slogan=\{footerSlogan\}/.test(layoutSource)) throw new Error("slogan prop not wired");
});

check("homepage resolves heroSlogan (CMS → legacy → i18n) and passes it down", () => {
  if (!homePageSource.includes("pickBilingual(homepageData?.heroSlogan, locale)")) throw new Error("resolution missing");
  if (!/<HeroSection hero=\{homepageData\} slogan=\{heroSlogan\}/.test(homePageSource)) throw new Error("slogan prop not wired");
});

check("footer renders the slogan prop with i18n fallback + testid", () => {
  if (!footerSource.includes('data-testid="footer-slogan"')) throw new Error("testid missing");
  if (!footerSource.includes("slogan ?? tf(\"tagline\")")) throw new Error("fallback missing");
  if (footerSource.includes("Khám phá vẻ đẹp")) throw new Error("hardcoded VI slogan still in footer");
  if (footerSource.includes("Discover the beauty")) throw new Error("hardcoded EN slogan still in footer");
});

check("hero renders the slogan prop with i18n fallback + testid", () => {
  if (!heroSource.includes('data-testid="hero-slogan"')) throw new Error("testid missing");
  if (!heroSource.includes("slogan ?? t(\"heroSubtitle\")")) throw new Error("fallback missing");
  if (heroSource.includes("Trải nghiệm vẻ đẹp")) throw new Error("hardcoded VI slogan still in hero");
  if (heroSource.includes("Experience the beauty")) throw new Error("hardcoded EN slogan still in hero");
});

check("i18n fallback strings still present in both locales", () => {
  if (!messagesVi.footer.tagline || !messagesEn.footer.tagline) throw new Error("footer.tagline missing");
  if (!messagesVi.home.heroSubtitle || !messagesEn.home.heroSubtitle) throw new Error("home.heroSubtitle missing");
});

console.log(`${passed}/${passed + failed} assertions passed`);
process.exit(failed === 0 ? 0 : 1);

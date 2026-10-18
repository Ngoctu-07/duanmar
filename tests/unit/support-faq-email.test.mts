import { readFileSync } from "node:fs";

import { toMailtoHref } from "../../src/lib/contact-channels.ts";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

const supportSource = read("src/app/[locale]/support/page.tsx");
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

const DEFAULT_EMAIL = "Duanmartravel@gmail.com";

/* --- FAQ #5 email pill is bound to the Studio CMS contact email --- */

check("support page reads siteConfiguration.contactSettings.email", () => {
  if (!supportSource.includes("SITE_CONFIGURATION_QUERY"))
    throw new Error("SITE_CONFIGURATION_QUERY not imported/used");
  if (!/contactSettings\??\.\??email/.test(supportSource))
    throw new Error("contactSettings.email not read");
});

check("empty CMS email defaults to Duanmartravel@gmail.com", () => {
  if (!supportSource.includes(`DEFAULT_SUPPORT_EMAIL = "${DEFAULT_EMAIL}"`))
    throw new Error("default support email constant missing/mismatched");
  if (!/DEFAULT_SUPPORT_EMAIL/.test(supportSource))
    throw new Error("default not used as fallback");
});

check("legacy hardcoded hcmussh email removed", () => {
  if (supportSource.includes("hcmussh")) throw new Error("legacy email still present");
});

check("mailto href is sanitized from the resolved email", () => {
  if (!supportSource.includes("toMailtoHref"))
    throw new Error("toMailtoHref not used for href");
  if (!supportSource.includes("{supportEmail}"))
    throw new Error("pill does not render the dynamic email value");
});

check("toMailtoHref(default) resolves to a correct mailto link", () => {
  const href = toMailtoHref(DEFAULT_EMAIL);
  if (href !== `mailto:${DEFAULT_EMAIL}`) throw new Error(String(href));
});

check("FAQ #5 (index 4) is the support-channels question in both locales", () => {
  const vi = messagesVi.bookingSteps.faq[4]?.q ?? "";
  const en = messagesEn.bookingSteps.faq[4]?.q ?? "";
  if (!/kênh/i.test(vi)) throw new Error(`vi FAQ #5 unexpected: ${vi}`);
  if (!/channels/i.test(en)) throw new Error(`en FAQ #5 unexpected: ${en}`);
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exitCode = 1;

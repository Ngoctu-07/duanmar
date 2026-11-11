import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * /support refactor contract:
 * - subtitle + contact copy come from the new approved strings in both locales;
 * - category tabs (standard body font, brand-red active state) replace the old
 *   oversized "Hướng dẫn đặt tour" display heading;
 * - FAQ questions carry no numeric prefixes and filter by the active tab;
 * - accordions animate with `transition-all duration-300` + chevron rotate;
 * - the bottom contact box renders the red rectangular CTA.
 */

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");

const page = read("src/app/[locale]/support/page.tsx");
const section = read("src/components/support/support-faq-section.tsx");
const item = read("src/components/support/support-accordion-item.tsx");
const en = JSON.parse(read("src/messages/en.json"));
const vi = JSON.parse(read("src/messages/vi.json"));

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
const has = (source: string, tokens: string[]) => {
  for (const token of tokens) assert.ok(source.includes(token), `missing token: ${token}`);
};

check("support subtitle uses the approved copy in both locales", () => {
  assert.equal(
    vi.support.subtitle,
    "Mọi thông tin bạn cần trước và sau khi bước vào hành trình giải mã"
  );
  assert.equal(
    en.support.subtitle,
    "All the information you need before and after embarking on your decoding journey"
  );
});

check("category tabs are localized and live under the hero", () => {
  assert.equal(vi.support.tabs.booking, "Hướng dẫn đặt tour");
  assert.equal(vi.support.tabs.health, "Sức khỏe");
  assert.equal(en.support.tabs.booking, "Tour Booking Guide");
  assert.equal(en.support.tabs.health, "Health & Safety");
  assert.ok(page.includes('t("tabs.booking")') && page.includes('t("tabs.health")'));
  assert.ok(
    page.indexOf('className="display-title mb-3"') < page.indexOf("<SupportFaqSection"),
    "tabs must render after the hero title"
  );
});

check("giant how-to-book heading is gone (one display title only)", () => {
  assert.ok(!page.includes('{tb("title")}'), "h2 title render must be removed");
  assert.equal(
    page.match(/display-title/g)?.length,
    1,
    "only the page h1 keeps the display scale"
  );
  assert.ok(!section.includes("display-title"), "tabs/accordions must not use the display face");
});

check("tab labels use the standard body face and brand-red active state", () => {
  has(section, [
    "font-sans text-sm font-medium",
    "border-b-2",
    "border-[#b3151b]",
    "text-[#b3151b]",
    "border-transparent",
    'role="tab"',
    'role="tablist"',
    "aria-selected={selected}",
  ]);
  assert.ok(!section.includes("font-display"), "no horror face on the tabs");
});

check("accordion filters by active category", () => {
  has(section, [
    "useState<SupportCategory>",
    "items.filter((item) => item.category === active)",
    "setActive(id)",
    "<SupportAccordionItem",
  ]);
  assert.ok(page.includes('extras: "steps"'), "booking tab keeps the 5-step grid");
  assert.ok(page.includes('category: "health"'), "health tab needs its own item");
});

check("both tabs start fully collapsed and reset collapsed on tab change", () => {
  has(section, [
    // `openId` starts null so no answer is expanded on first paint…
    "useState<string | null>(null)",
    // …and every tab switch collapses the target list again.
    "setActive(id);\n    setOpenId(null);",
  ]);
  assert.ok(
    !section.includes("items.find((item) => item.category === id)"),
    "tab changes must not auto-expand an item"
  );
  // A single shared item component drives both categories — no static panel.
  assert.equal(
    section.match(/<SupportAccordionItem/g)?.length,
    1,
    "health and booking lists must render the same accordion item"
  );
  assert.ok(
    !section.includes("SupportFaqAnswer"),
    "answer markup belongs to the shared accordion item only"
  );
});

check("FAQ questions ship without numeric prefixes", () => {
  for (const messages of [vi, en]) {
    for (const faq of messages.bookingSteps.faq) {
      assert.ok(!/^\s*\d+[.)]\s/.test(faq.q), `numbered question: ${faq.q}`);
    }
  }
});

check("accordions animate height and rotate the chevron", () => {
  has(item, [
    "transition-all duration-300",
    "grid-rows-[1fr]",
    "grid-rows-[0fr]",
    'aria-expanded={open}',
    "aria-controls={`support-faq-panel-${item.id}`}",
    "rotate-180",
    "inert={!open}",
    'data-testid="support-faq-item"',
    'data-testid="support-faq-question"',
  ]);
});

check("bottom contact box mirrors the approved copy + red CTA", () => {
  assert.equal(vi.support.contactTitle, "VẪN CÒN THẮC MẮC?");
  assert.equal(
    vi.support.contactText,
    "Đội ngũ Trạm Trưởng luôn túc trực 24/7 để hỗ trợ bạn chuẩn bị cho chuyến đi."
  );
  assert.equal(vi.support.contactCta, "LIÊN HỆ CHÚNG TÔI");
  assert.equal(en.support.contactTitle, "STILL HAVE QUESTIONS?");
  assert.equal(
    en.support.contactText,
    "Our Station Master team is available 24/7 to assist with your journey preparations."
  );
  assert.equal(en.support.contactCta, "CONTACT US");
  has(page, [
    'id="contact"',
    "border border-white/10 bg-card",
    // ~5% tighter footprint: 48rem → 45.6rem, 2rem → 1.9rem, 2.5rem → 2.375rem.
    "max-w-[45.6rem]",
    "p-[1.9rem]",
    "sm:p-[2.375rem]",
    "bg-[#b3151b]",
    "hover:bg-[#cc3d3d]",
    "rounded-sm",
    "px-8 py-3",
    "font-bold",
    "uppercase",
    "tracking-wider",
    "mt-6",
    "cursor-pointer",
    'href="/contact"',
  ]);
});

check("en/vi carry the same support keys", () => {
  const keys = (obj: Record<string, unknown>): string[] =>
    Object.keys(obj).flatMap((key) => {
      const value = obj[key];
      return value && typeof value === "object" && !Array.isArray(value)
        ? keys(value as Record<string, unknown>).map((child) => `${key}.${child}`)
        : [key];
    });
  assert.deepEqual(keys(en.support).sort(), keys(vi.support).sort());
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exitCode = failed > 0 ? 1 : 0;

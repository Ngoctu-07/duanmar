import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { BookingPaymentSection } from "../../src/components/booking/booking-payment-section.tsx";

// The .tsx graph is compiled to CJS by tsx, so its `next-intl`/`react` instances
// come from require(). Load them the same way to share React contexts.
const req = createRequire(new URL("../../package.json", import.meta.url));
const React = req("react") as typeof import("react");
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
const { NextIntlClientProvider } = req("next-intl") as typeof import("next-intl");

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

const readMessages = (locale: string) =>
  JSON.parse(readFileSync(new URL(`../../src/messages/${locale}.json`, import.meta.url), "utf8")) as Record<
    string,
    unknown
  >;

function render(total: number | null, locale = "vi") {
  return renderToStaticMarkup(
    React.createElement(
      NextIntlClientProvider,
      { locale, timeZone: "Asia/Ho_Chi_Minh", messages: readMessages(locale) },
      React.createElement(BookingPaymentSection, {
        total,
        locale,
        currency: "VND",
        reference: "VN-TEST",
        onPaid: () => undefined,
      })
    )
  );
}

check("N1 no price → honest note, no payment methods (review M2)", () => {
  const html = render(null, "vi");
  assert.ok(
    html.includes("Chưa có giá tour"),
    `VI note missing: ${html.slice(0, 200)}`
  );
  assert.ok(!html.includes("payment-method"), "payment radios must not render");
  assert.ok(!html.includes("booking-payment-heading"), "payment section must not render");
});

check("N2 no price → EN note present", () => {
  assert.ok(render(null, "en").includes("Tour price is unavailable"));
});

check("N3 priced tour still renders the payment section", () => {
  const html = render(300000, "vi");
  assert.ok(html.includes("booking-payment-heading"), "heading missing");
  assert.ok(html.includes("payment-method"), "payment radios missing");
  assert.ok(!html.includes("Chưa có giá tour"), "note must not render when priced");
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { TravelDateField } from "../../src/components/booking/travel-date-field.tsx";
import { mapTourCapacity, mergeDeviceBookings } from "../../src/lib/tour-capacity.ts";

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

interface FieldProps {
  capacity?: ReturnType<typeof mapTourCapacity>;
  guestCount?: number;
  locale?: string;
}

function render({ capacity, guestCount = 1, locale = "vi" }: FieldProps) {
  return renderToStaticMarkup(
    React.createElement(
      NextIntlClientProvider,
      { locale, timeZone: "Asia/Ho_Chi_Minh", messages: readMessages(locale) },
      React.createElement(TravelDateField, {
        value: "",
        onChange: () => undefined,
        locale,
        // Fixed clock → window = 2026-10-02 .. 2026-10-08
        today: new Date(2026, 9, 1),
        capacity,
        guestCount,
      })
    )
  );
}

const cell = (html: string, iso: string) => {
  const match = new RegExp(
    `<td[^>]*data-day="${iso}"[^>]*>[\\s\\S]*?<\\/td>`
  ).exec(html);
  assert.ok(match, `no cell for ${iso}`);
  return match[0];
};

// Capacity as the app computes it: global max minus successful device bookings.
const bookedOn = (date: string, guests: number) => ({
  reference: `VN-${date}`,
  slug: "hcm",
  tourName: "Saigon",
  travelDate: date,
  fullName: "A",
  email: "a@b.c",
  phone: "0900000000",
  notes: "",
  guests,
  difficulty: "easy",
  pricePerGuest: 100,
  total: guests * 100,
  currency: "VND",
  locale: "vi",
  paidAt: "2026-10-01T00:00:00.000Z",
});

const capacity = mergeDeviceBookings(
  mapTourCapacity({ maxCapacity: 10 }),
  "hcm",
  [
    bookedOn("2026-10-02", 9), // 1 spot left
    bookedOn("2026-10-03", 10), // sold out
    bookedOn("2026-10-05", 4), // 6 spots left
    bookedOn("2026-10-10", 10), // outside the window → must stay silent
  ]
);

check("H6 no capacity → no badge at all (P4)", () => {
  const html = render({ capacity: null });
  assert.equal(html.includes('data-testid="capacity-badge"'), false);
  assert.equal(html.includes("chỗ trống"), false);
});

check("H6 capacity → spots-left badge under in-window days", () => {
  const html = render({ capacity });
  assert.equal(html.includes('data-testid="capacity-badge"'), true);
  assert.equal(html.includes("1 chỗ trống"), true);
  assert.equal(html.includes("6 chỗ trống"), true);
});

check("H6 capacity grows the cell (46×56), no-capacity keeps rdp defaults", () => {
  assert.match(render({ capacity }), /--rdp-day-width:\s*46px/);
  assert.match(render({ capacity }), /--rdp-day-height:\s*56px/);
  assert.equal(/--rdp-day-width/.test(render({ capacity: null })), false);
});

check("H6 sold-out day shows 'Hết chỗ'", () => {
  assert.ok(render({ capacity }).includes("Hết chỗ"));
});

check("H6 out-of-window day renders no badge even when sold out", () => {
  const html = render({ capacity });
  assert.equal(cell(html, "2026-10-10").includes("capacity-badge"), false);
  assert.equal(cell(html, "2026-10-10").includes("Hết chỗ"), false);
});

check("H6 guestCount=1 → partially-booked day stays enabled", () => {
  const html = render({ capacity, guestCount: 1 });
  assert.equal(cell(html, "2026-10-02").includes('data-disabled="true"'), false);
});

check("H6 guestCount=2 → same day disabled (reactive)", () => {
  const html = render({ capacity, guestCount: 2 });
  assert.equal(cell(html, "2026-10-02").includes('data-disabled="true"'), true);
  // a day with plenty of room stays bookable
  assert.equal(cell(html, "2026-10-05").includes('data-disabled="true"'), false);
});

check("H6 sold-out day disabled even for 1 guest", () => {
  const html = render({ capacity, guestCount: 1 });
  assert.equal(cell(html, "2026-10-03").includes('data-disabled="true"'), true);
});

check("H6 window rule survives: today + past day disabled, no badge on past day", () => {
  const html = render({ capacity, guestCount: 1 });
  assert.equal(cell(html, "2026-10-01").includes('data-disabled="true"'), true);
  assert.equal(cell(html, "2026-09-30").includes('data-disabled="true"'), true);
  assert.equal(cell(html, "2026-09-30").includes("capacity-badge"), false);
});

check("H6 day aria-label announces spots left", () => {
  assert.match(render({ capacity, guestCount: 1 }), /aria-label="[^"]*chỗ trống"/);
});

check("H6 english locale renders EN badge text", () => {
  const html = render({ capacity, guestCount: 1, locale: "en" });
  assert.equal(html.includes("1 spot left"), true);
  assert.equal(html.includes("Sold out"), true);
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

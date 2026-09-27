import { mapPricingTiers, formatPrice } from "../../src/lib/pricing.ts";

let fails = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name} -> ${JSON.stringify(got)}${ok ? "" : " want " + JSON.stringify(want)}`);
};
const norm = (s: string) => s.replace(/\s/g, " ");

eq("sorts ascending", mapPricingTiers({ tiers: [
  { minGuests: 5, maxGuests: 7, pricePerGuestVnd: 1450000, pricePerGuestUsd: 58, groupTotalVnd: 7250000, groupTotalUsd: 290 },
  { minGuests: 2, maxGuests: 2, pricePerGuestVnd: 1850000, pricePerGuestUsd: 75, groupTotalVnd: 3700000, groupTotalUsd: 150 },
  { minGuests: 8, maxGuests: null, pricePerGuestVnd: 1290000, pricePerGuestUsd: 52, groupTotalVnd: 10320000, groupTotalUsd: 416 },
]}, "en").map(t => t.minGuests), [2,5,8]);
eq("vi picks VND", mapPricingTiers({ tiers: [{ minGuests: 2, maxGuests: 2, pricePerGuestVnd: 1850000, pricePerGuestUsd: 75, groupTotalVnd: 3700000, groupTotalUsd: 150 }] }, "vi")[0].pricePerGuest, 1850000);
eq("en picks USD", mapPricingTiers({ tiers: [{ minGuests: 2, maxGuests: 2, pricePerGuestVnd: 1850000, pricePerGuestUsd: 75, groupTotalVnd: 3700000, groupTotalUsd: 150 }] }, "en")[0].pricePerGuest, 75);
eq("null doc -> []", mapPricingTiers(null, "en"), []);
eq("undefined tiers -> []", mapPricingTiers({}, "en"), []);
eq("drops null price", mapPricingTiers({ tiers: [{ minGuests: 2, maxGuests: 2, pricePerGuestVnd: null, pricePerGuestUsd: null, groupTotalVnd: 1, groupTotalUsd: 1 }] }, "en"), []);
eq("drops NaN total", mapPricingTiers({ tiers: [{ minGuests: 2, maxGuests: 2, pricePerGuestVnd: 10, pricePerGuestUsd: 10, groupTotalVnd: Number.NaN, groupTotalUsd: Number.NaN }] }, "en"), []);
eq("drops minGuests 0", mapPricingTiers({ tiers: [{ minGuests: 0, maxGuests: 2, pricePerGuestVnd: 10, pricePerGuestUsd: 10, groupTotalVnd: 20, groupTotalUsd: 20 }] }, "en"), []);
eq("drops inverted range 5-3", mapPricingTiers({ tiers: [{ minGuests: 5, maxGuests: 3, pricePerGuestVnd: 10, pricePerGuestUsd: 10, groupTotalVnd: 50, groupTotalUsd: 50 }] }, "en"), []);
eq("drops authored zero price (not sellable)", mapPricingTiers({ tiers: [{ minGuests: 2, maxGuests: 2, pricePerGuestVnd: 0, pricePerGuestUsd: 0, groupTotalVnd: 0, groupTotalUsd: 0 }] }, "en").length, 0);
eq("keeps valid, drops broken neighbour", mapPricingTiers({ tiers: [
  { minGuests: 2, maxGuests: 2, pricePerGuestVnd: 10, pricePerGuestUsd: 10, groupTotalVnd: 20, groupTotalUsd: 20 },
  { minGuests: 3, maxGuests: 4, pricePerGuestVnd: null, pricePerGuestUsd: null, groupTotalVnd: 1, groupTotalUsd: 1 },
]}, "en").length, 1);

eq("VI integer fmt", norm(formatPrice(1850000, "vi", "VND")), "1.850.000 ₫");
eq("EN integer fmt", norm(formatPrice(75, "en", "USD")), "$75");
eq("EN fractional fmt", norm(formatPrice(74.5, "en", "USD")), "$74.50");
eq("EN zero fmt", norm(formatPrice(0, "en", "USD")), "$0");

console.log(fails === 0 ? "ALL PASS" : `${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);

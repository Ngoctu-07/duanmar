import type { Destination } from "../../src/components/explore/destination-card.ts";
import {
  buildToursHref,
  filterDestinations,
} from "../../src/lib/tour-search.ts";

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

const dest = (
  name: string,
  extra: Partial<Destination> = {}
): Destination => ({
  _id: `id-${name}`,
  name,
  slug: { current: name.toLowerCase().replace(/\s+/g, "-") },
  region: "north",
  ...extra,
});

const DESTINATIONS: Destination[] = [
  dest("Hà Nội", { description: "Capital city with temples" }),
  dest("Đà Lạt", { region: "central", country: { vi: "Việt Nam", en: "Vietnam" } }),
  dest("Hạ Long", { description: "Bay with limestone islands" }),
  dest("Phú Quốc", { region: "south", country: { vi: "Việt Nam", en: "Vietnam" } }),
];

check("empty query → /tours", () => {
  if (buildToursHref("") !== "/tours") throw new Error(buildToursHref(""));
});

check("whitespace-only query → /tours", () => {
  if (buildToursHref("   ") !== "/tours") throw new Error(buildToursHref("   "));
});

check("trims surrounding whitespace", () => {
  const href = buildToursHref("  ha long  ");
  if (href !== "/tours?search=ha%20long") throw new Error(href);
});

check("encodes reserved URL characters", () => {
  const href = buildToursHref("a&b=c#d e");
  if (href !== "/tours?search=a%26b%3Dc%23d%20e") throw new Error(href);
});

check("empty query returns destinations unchanged (same reference)", () => {
  const result = filterDestinations(DESTINATIONS, "");
  if (result !== DESTINATIONS) throw new Error("expected identical array");
});

check("accent-insensitive: 'ha noi' matches 'Hà Nội'", () => {
  const result = filterDestinations(DESTINATIONS, "ha noi");
  if (result.length !== 1 || result[0].name !== "Hà Nội") throw new Error(JSON.stringify(result.map((d) => d.name)));
});

check("accent-insensitive: 'da lat' matches 'Đà Lạt'", () => {
  const result = filterDestinations(DESTINATIONS, "da lat");
  if (result.length !== 1 || result[0].name !== "Đà Lạt") throw new Error(JSON.stringify(result.map((d) => d.name)));
});

check("case-insensitive: 'HA NOI'", () => {
  const result = filterDestinations(DESTINATIONS, "HA NOI");
  if (result.length !== 1 || result[0].name !== "Hà Nội") throw new Error(JSON.stringify(result.map((d) => d.name)));
});

check("token AND: name token + description token → Hạ Long", () => {
  const result = filterDestinations(DESTINATIONS, "long limestone");
  if (result.length !== 1 || result[0].name !== "Hạ Long") throw new Error(JSON.stringify(result.map((d) => d.name)));
});

check("token AND: one unknown token → no match", () => {
  const result = filterDestinations(DESTINATIONS, "ha templo");
  if (result.length !== 0) throw new Error(JSON.stringify(result.map((d) => d.name)));
});

check("matches description field", () => {
  const result = filterDestinations(DESTINATIONS, "temples");
  if (result.length !== 1 || result[0].name !== "Hà Nội") throw new Error(JSON.stringify(result.map((d) => d.name)));
});

check("matches country + region fields", () => {
  const byCountry = filterDestinations(DESTINATIONS, "vietnam");
  const byRegion = filterDestinations(DESTINATIONS, "south");
  if (byCountry.length !== 2) throw new Error(`country hits ${byCountry.length}`);
  if (byRegion.length !== 1 || byRegion[0].name !== "Phú Quốc") throw new Error(JSON.stringify(byRegion.map((d) => d.name)));
});

check("no match → empty array", () => {
  const result = filterDestinations(DESTINATIONS, "zzzzz");
  if (result.length !== 0) throw new Error(String(result.length));
});

console.log(`${passed}/${passed + failed} assertions passed`);
process.exit(failed === 0 ? 0 : 1);

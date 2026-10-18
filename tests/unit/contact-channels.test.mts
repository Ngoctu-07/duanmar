import assert from "node:assert/strict";

const {
  buildContactChannels,
  CONTACT_CHANNELS,
  socialDomain,
  toMailtoHref,
  toTelHref,
} = await import("../../src/lib/contact-channels.ts");

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

check("toTelHref keeps digits + leading + and dials", () => {
  assert.equal(toTelHref("+84 28 3822 0000"), "tel:+842838220000");
  assert.equal(toTelHref("(028) 3822-0000"), "tel:02838220000");
  assert.equal(toTelHref(""), null);
  assert.equal(toTelHref("call us"), null);
});

check("toMailtoHref only accepts plain addresses", () => {
  assert.equal(toMailtoHref("info@vietnam-tourism.com"), "mailto:info@vietnam-tourism.com");
  assert.equal(toMailtoHref("not-an-email"), null);
  assert.equal(toMailtoHref("spaced @mail.com"), null);
});

check("socialDomain returns host only (www stripped), '' for non-URLs", () => {
  assert.equal(socialDomain("https://www.instagram.com/duanmar.travel?exln=abc"), "instagram.com");
  assert.equal(socialDomain("http://tiktok.com/@x"), "tiktok.com");
  assert.equal(socialDomain("javascript:alert(1)"), "");
  assert.equal(socialDomain("facebook.com/x"), "");
});

check("CONTACT_CHANNELS is the 7-channel order contract", () => {
  assert.deepEqual(
    CONTACT_CHANNELS.map((c) => c.key),
    ["phone", "email", "facebook", "tiktok", "instagram", "threads", "youtube"]
  );
});

const FALLBACKS = {
  phone: { label: "Điện thoại", href: "tel:+842838220000", value: "+84 28 3822 0000" },
  email: { label: "Email", href: "mailto:info@vietnam-tourism.com", value: "info@vietnam-tourism.com" },
  facebook: { label: "Facebook", href: "https://www.facebook.com/vietnamtourism", value: "facebook.com/vietnamtourism" },
};

check("CMS values win and produce protocol-correct hrefs", () => {
  const out = buildContactChannels(
    {
      phone: "+1 202 555 0100",
      email: "hello@duanmar.com",
      facebookUrl: "https://facebook.com/duanmar",
      threadsUrl: "https://www.threads.net/@duanmar",
    },
    FALLBACKS
  );
  assert.deepEqual(out.map((c) => c.key), ["phone", "email", "facebook", "threads"]);
  assert.equal(out[0].href, "tel:+12025550100");
  assert.equal(out[0].label, "Điện thoại");
  assert.equal(out[1].href, "mailto:hello@duanmar.com");
  assert.equal(out[2].href, "https://facebook.com/duanmar");
  assert.equal(out[2].value, "facebook.com", "no handle → sanitized domain, not raw URL");
  assert.equal(out[3].href, "https://www.threads.net/@duanmar");
  assert.equal(out[3].value, "threads.net");
  assert.equal(out[3].label, "Threads", "no fallback label → brand title");
});

check("explicit handle wins; empty handle → sanitized domain → platform name", () => {
  const out = buildContactChannels(
    {
      instagramUrl: "https://www.instagram.com/duanmar.travel?exln=abc",
      instagramHandle: "  @duanmar.travel  ",
      facebookUrl: "https://www.facebook.com/share/1CVqmiSFjS/",
      threadsUrl: "not-a-url",
    },
    {}
  );
  const ig = out.find((c) => c.key === "instagram");
  const fb = out.find((c) => c.key === "facebook");
  const th = out.find((c) => c.key === "threads");
  assert.ok(ig && fb && th);
  assert.equal(ig.value, "@duanmar.travel", "trimmed handle is the visible label");
  assert.equal(ig.href, "https://www.instagram.com/duanmar.travel?exln=abc", "full URL stays the href");
  assert.equal(fb.value, "facebook.com", "empty handle → sanitized domain host");
  assert.equal(fb.href, "https://www.facebook.com/share/1CVqmiSFjS/");
  assert.equal(th.value, "Threads", "non-URL → platform name");
  assert.equal(th.href, null, "non-URL → no link");
});

check("handle never leaks into `label` (Footer keeps platform labels)", () => {
  const out = buildContactChannels(
    { instagramUrl: "https://instagram.com/x", instagramHandle: "@x" },
    { instagram: { label: "Instagram", value: "legacy", href: "https://instagram.com/x" } }
  );
  const ig = out.find((c) => c.key === "instagram");
  assert.ok(ig);
  assert.equal(ig.label, "Instagram", "label = platform name (what the Footer renders)");
  assert.equal(ig.value, "@x", "value = handle (Contact page only)");
});

check("empty CMS falls back to i18n and omits unfilled channels", () => {
  const out = buildContactChannels({}, FALLBACKS);
  assert.deepEqual(out.map((c) => c.key), ["phone", "email", "facebook"]);
  assert.equal(out[0].href, "tel:+842838220000");
  assert.equal(out[1].href, "mailto:info@vietnam-tourism.com");
  assert.equal(out[2].value, "facebook.com/vietnamtourism");
  assert.ok(!out.some((c) => c.key === "threads"), "empty threads must be omitted");
});

check("all 7 CMS channels render in the canonical order", () => {
  const out = buildContactChannels(
    {
      phone: "+84 28 3822 0000",
      email: "info@vietnam-tourism.com",
      facebookUrl: "https://facebook.com/duanmar",
      tiktokUrl: "https://tiktok.com/@duanmar",
      instagramUrl: "https://instagram.com/duanmar",
      threadsUrl: "https://threads.net/@duanmar",
      youtubeUrl: "https://youtube.com/@duanmar",
    },
    {}
  );
  assert.deepEqual(
    out.map((c) => c.key),
    ["phone", "email", "facebook", "tiktok", "instagram", "threads", "youtube"]
  );
});

check("unsafe social URL → platform-name text, no dead link", () => {
  const out = buildContactChannels({ facebookUrl: "javascript:alert(1)" }, {});
  const fb = out.find((c) => c.key === "facebook");
  assert.ok(fb);
  assert.equal(fb.href, null);
  assert.equal(fb.value, "Facebook", "never echo the raw/unsafe URL as visible text");
});

check("null/undefined settings are tolerated (fallback-only render)", () => {
  for (const settings of [null, undefined, "junk", 42]) {
    const out = buildContactChannels(settings, FALLBACKS);
    assert.deepEqual(out.map((c) => c.key), ["phone", "email", "facebook"]);
  }
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);

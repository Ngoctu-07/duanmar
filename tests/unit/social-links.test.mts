import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { SITE_CONFIGURATION_QUERY } = await import(
  "../../src/sanity/queries/site-configuration.ts"
);
const { classifyHref, platformTitle } = await import(
  "../../src/lib/social-links.ts"
);
const { parse } = await import("groq-js");

const schema = readFileSync(
  new URL("../../src/sanity/schemaTypes/site-configuration.ts", import.meta.url),
  "utf8"
);
const schemaIndex = readFileSync(
  new URL("../../src/sanity/schemaTypes/index.ts", import.meta.url),
  "utf8"
);
const footerSource = readFileSync(
  new URL("../../src/components/layout/footer.tsx", import.meta.url),
  "utf8"
);
const contactSource = readFileSync(
  new URL("../../src/app/[locale]/contact/page.tsx", import.meta.url),
  "utf8"
);
const layoutSource = readFileSync(
  new URL("../../src/app/[locale]/layout.tsx", import.meta.url),
  "utf8"
);

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

/* --- schema --- */

check("siteConfiguration declares nested contactSettings object", () => {
  assert.ok(schema.includes('name: "contactSettings"'));
  assert.ok(schema.includes('type: "object"'));
  assert.ok(schema.includes("contactUrlField"));
});

check("contactSettings holds the 7 explicit channel subfields", () => {
  for (const field of [
    '"phone"',
    '"email"',
    '"facebookUrl"',
    '"tiktokUrl"',
    '"instagramUrl"',
    '"threadsUrl"',
    '"youtubeUrl"',
  ]) {
    assert.ok(schema.includes(field), `missing ${field}`);
  }
});

check("legacy socialLinks array is fully removed from the schema", () => {
  assert.ok(!schema.includes("socialLinks"), "socialLinks must be deleted");
  assert.ok(!schema.includes("defineArrayMember"), "array member import must be gone");
  assert.ok(!schema.includes("footerSocial"), "legacy footer fieldset must be gone");
});

check("contact URL subfields stay optional + http(s)-only", () => {
  assert.ok(schema.includes('scheme: ["https", "http"]'));
  assert.ok(schema.includes("allowRelative: false"));
  assert.ok(
    !schema.includes("rule.required()"),
    "every channel stays optional so empty ones are omitted"
  );
});

check("schema stays registered in schemaTypes index", () => {
  assert.ok(schemaIndex.includes("siteConfiguration"));
});

/* --- query --- */

check("site config query projects the nested contactSettings block", () => {
  assert.equal(typeof SITE_CONFIGURATION_QUERY, "string");
  parse(SITE_CONFIGURATION_QUERY);
  assert.ok(SITE_CONFIGURATION_QUERY.includes("contactSettings {"), SITE_CONFIGURATION_QUERY);
  for (const field of [
    "phone",
    "email",
    "facebookUrl",
    "tiktokUrl",
    "instagramUrl",
    "threadsUrl",
    "youtubeUrl",
  ]) {
    assert.ok(SITE_CONFIGURATION_QUERY.includes(field), `query missing ${field}`);
  }
  assert.ok(!SITE_CONFIGURATION_QUERY.includes("socialLinks"), "query must drop socialLinks");
  assert.ok(SITE_CONFIGURATION_QUERY.includes('_type == "siteConfiguration"'));
});

check("query stays param-free (cache key = query string)", () => {
  assert.ok(!SITE_CONFIGURATION_QUERY.includes("$"));
  assert.ok(!SITE_CONFIGURATION_QUERY.includes("?"));
});

/* --- classifyHref --- */

check("absolute http(s) URLs are external links, byte-exact", () => {
  const url = "https://www.tiktok.com/@duanmar.official?x=1";
  assert.deepEqual(classifyHref(url), { href: url, external: true });
  assert.deepEqual(classifyHref("  http://fb.com/x  "), {
    href: "http://fb.com/x",
    external: true,
  });
});

check("tel:/mailto:/site-relative stay same-tab", () => {
  assert.deepEqual(classifyHref("tel:+842838220000"), {
    href: "tel:+842838220000",
    external: false,
  });
  assert.deepEqual(classifyHref("mailto:a@b.com"), {
    href: "mailto:a@b.com",
    external: false,
  });
  assert.deepEqual(classifyHref("/contact"), { href: "/contact", external: false });
});

check("empty/unsafe/garbage hrefs classify as null (no dead #)", () => {
  for (const bad of [
    "",
    "   ",
    "#",
    "javascript:alert(1)",
    "JAVASCRIPT:alert(1)",
    "data:text/html,<script>x</script>",
    "//evil.example.com",
    "ftp://example.com",
    null,
    undefined,
    42,
  ]) {
    assert.equal(classifyHref(bad as never), null, `should reject ${String(bad)}`);
  }
});

/* --- platformTitle --- */

check("platformTitle maps brands and title-cases unknowns", () => {
  assert.equal(platformTitle("tiktok"), "TikTok");
  assert.equal(platformTitle("threads"), "Threads");
  assert.equal(platformTitle("youtube"), "YouTube");
  assert.equal(platformTitle("  github "), "Github");
  assert.equal(platformTitle(""), "");
  assert.equal(platformTitle(null), "");
});

/* --- SocialAnchor render --- */

const { createRequire } = await import("node:module");
const req = createRequire(import.meta.url);
const React = req("react") as typeof import("react");
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
const { SocialAnchor } = await import("../../src/components/contact/social-anchor.tsx");

check("linked handle renders <a> with target=_blank + noopener noreferrer", () => {
  const html = renderToStaticMarkup(
    React.createElement(SocialAnchor as never, {
      displayText: "@duanmar.official",
      targetUrl: "https://www.tiktok.com/@duanmar.official",
    })
  );
  assert.ok(html.startsWith("<a "), html);
  assert.ok(html.includes('href="https://www.tiktok.com/@duanmar.official"'), html);
  assert.ok(html.includes('target="_blank"'), html);
  assert.ok(html.includes('rel="noopener noreferrer"'), html);
  assert.ok(html.includes("hover:underline"), html);
  assert.ok(html.includes("@duanmar.official"), html);
});

check("empty targetUrl renders displayText as plain text (no href, no #)", () => {
  const html = renderToStaticMarkup(
    React.createElement(SocialAnchor as never, {
      displayText: "DuanMar",
      targetUrl: "",
      className: "text-lg",
    })
  );
  assert.ok(html.startsWith("<span "), html);
  assert.ok(!html.includes("href"), html);
  assert.ok(!html.includes("#"), html);
  assert.ok(html.includes(">DuanMar</span>"), html);
});

check("unsafe targetUrl renders plain text too", () => {
  const html = renderToStaticMarkup(
    React.createElement(SocialAnchor as never, {
      displayText: "Evil",
      targetUrl: "javascript:alert(1)",
    })
  );
  assert.ok(html.startsWith("<span "), html);
  assert.ok(!html.includes("javascript"), html);
});

check("tel:/mailto: links stay same-tab (no target attr)", () => {
  const html = renderToStaticMarkup(
    React.createElement(SocialAnchor as never, {
      displayText: "Phone",
      targetUrl: "tel:+842838220000",
    })
  );
  assert.ok(html.startsWith("<a "), html);
  assert.ok(html.includes('href="tel:+842838220000"'), html);
  assert.ok(!html.includes("target="), html);
  assert.ok(!html.includes("noopener"), html);
});

check("children (contact card content) render inside the anchor", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      SocialAnchor as never,
      { targetUrl: "https://www.facebook.com/vietnamtourism", className: "card" },
      React.createElement("span", { className: "value" }, "facebook.com/vietnamtourism")
    )
  );
  assert.ok(html.startsWith("<a "), html);
  assert.ok(html.includes('target="_blank"'), html);
  assert.ok(html.includes('class="value"'), html);
});

/* --- surface contracts --- */

check("Footer takes contactSettings prop and renders via the shared builder", () => {
  assert.ok(footerSource.includes("contactSettings?: unknown"), "prop missing");
  assert.ok(footerSource.includes("buildContactChannels("), "shared builder missing");
  assert.ok(footerSource.includes("<SocialAnchor"), "anchor missing");
  assert.ok(
    !footerSource.includes("resolveSocialLinks"),
    "legacy resolver must be gone"
  );
  assert.ok(
    !footerSource.includes('href: "#"'),
    "footer must not emit dead # hrefs anymore"
  );
});

check("layout passes contactSettings into the Footer", () => {
  assert.ok(layoutSource.includes("contactSettings={siteConfig?.contactSettings"));
  assert.ok(!layoutSource.includes("socialLinks"));
});

check("contact page uses the shared primary-title scale", () => {
  assert.ok(
    contactSource.includes('className="display-title mb-3"'),
    "contact h1 must opt into .display-title like the tour category pages"
  );
  assert.ok(
    !contactSource.includes("text-4xl font-bold"),
    "old ad-hoc contact heading size remains"
  );
});

check("contact page renders the CMS-backed 7-channel grid via the shared builder", () => {
  assert.ok(contactSource.includes("SITE_CONFIGURATION_QUERY"));
  assert.ok(contactSource.includes('tags: ["sanity:siteconfig"]'));
  assert.ok(contactSource.includes("buildContactChannels("));
  assert.ok(contactSource.includes("CONTACT_CHANNELS"));
  assert.ok(!contactSource.includes("SOCIAL_CHANNEL_FIELDS"));
  assert.ok(contactSource.includes("<SocialAnchor"));
  assert.ok(contactSource.includes('data-testid="contact-node"'));
  assert.ok(contactSource.includes("<ContactChannelIcon"));
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);

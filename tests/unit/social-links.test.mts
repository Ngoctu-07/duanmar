import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { SITE_CONFIGURATION_QUERY } = await import(
  "../../src/sanity/queries/site-configuration.ts"
);
const {
  classifyHref,
  normalizeSocialLinks,
  resolveSocialLinks,
  platformTitle,
} = await import("../../src/lib/social-links.ts");
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

check("siteConfiguration schema defines socialLinks array of objects", () => {
  assert.ok(schema.includes('name: "socialLinks"'));
  assert.ok(schema.includes('name: "socialLink"'));
  assert.ok(schema.includes("defineArrayMember"));
  assert.ok(schema.includes('type: "array"'));
});

check("each platform entry has displayText + targetUrl + platform", () => {
  assert.ok(schema.includes('name: "displayText"'));
  assert.ok(schema.includes('name: "targetUrl"'));
  assert.ok(schema.includes('name: "platform"'));
  assert.ok(schema.includes('type: "url"'));
  assert.ok(schema.includes('value: "facebook"'));
  assert.ok(schema.includes('value: "tiktok"'));
  assert.ok(schema.includes('value: "youtube"'));
});

check("targetUrl is optional and restricted to http(s)", () => {
  const block = schema.slice(schema.indexOf('name: "targetUrl"'));
  assert.ok(
    !block.slice(0, 400).includes("rule.required()"),
    "targetUrl must stay optional so empty renders plain text"
  );
  assert.ok(block.includes('scheme: ["https", "http"]'));
  assert.ok(block.includes("allowRelative: false"));
});

check("schema stays registered in schemaTypes index", () => {
  assert.ok(schemaIndex.includes("siteConfiguration"));
});

/* --- query --- */

check("site config query projects socialLinks and parses with groq-js", () => {
  assert.equal(typeof SITE_CONFIGURATION_QUERY, "string");
  parse(SITE_CONFIGURATION_QUERY);
  assert.ok(
    SITE_CONFIGURATION_QUERY.includes(
      "socialLinks[]{ _key, platform, displayText, targetUrl }"
    ),
    SITE_CONFIGURATION_QUERY
  );
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

/* --- normalize / resolve --- */

check("normalize drops malformed rows and trims/normalizes fields", () => {
  assert.deepEqual(normalizeSocialLinks(null), []);
  assert.deepEqual(normalizeSocialLinks("nope"), []);
  const out = normalizeSocialLinks([
    { platform: "TikTok", displayText: "  @duanmar.official ", targetUrl: " https://www.tiktok.com/@duanmar " },
    { platform: "youtube", displayText: "DuanMar", targetUrl: "" },
    { displayText: "no-platform" },
    { platform: "facebook", displayText: "   " },
    "junk",
    null,
  ]);
  assert.equal(out.length, 3);
  assert.deepEqual(out[0], {
    _key: undefined,
    platform: "tiktok",
    displayText: "@duanmar.official",
    targetUrl: "https://www.tiktok.com/@duanmar",
  });
  assert.equal(out[1].targetUrl, null, "empty targetUrl → null (unlinked)");
  assert.equal(out[1].platform, "youtube");
  assert.equal(out[2].platform, "other", "missing platform defaults to other");
});

check("resolveSocialLinks: CMS wins, empty/junk CMS falls back", () => {
  const fallback = [
    { platform: "facebook", displayText: "Facebook", targetUrl: "https://fb.com/x" },
  ];
  const cms = [{ platform: "x", displayText: "DuanMar", targetUrl: "https://x.com/d" }];
  assert.deepEqual(resolveSocialLinks(cms, fallback), resolveSocialLinks(cms, fallback));
  assert.equal(resolveSocialLinks(cms, fallback)[0].displayText, "DuanMar");
  assert.deepEqual(resolveSocialLinks([], fallback), fallback);
  assert.deepEqual(resolveSocialLinks(null, fallback), fallback);
  assert.deepEqual(resolveSocialLinks([{}, { displayText: " " }], fallback), fallback);
});

check("platformTitle maps brands and title-cases unknowns", () => {
  assert.equal(platformTitle("tiktok"), "TikTok");
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

check("Footer takes socialLinks prop and renders via SocialAnchor", () => {
  assert.ok(footerSource.includes("socialLinks?: unknown"), "prop missing");
  assert.ok(footerSource.includes("resolveSocialLinks("), "fallback helper missing");
  assert.ok(footerSource.includes("<SocialAnchor"), "anchor missing");
  assert.ok(
    !footerSource.includes('href: "#"'),
    "footer must not emit dead # hrefs anymore"
  );
});

check("contact page fetches siteSettings and renders CMS-backed nodes", () => {
  assert.ok(contactSource.includes("SITE_CONFIGURATION_QUERY"));
  assert.ok(contactSource.includes('tags: ["sanity:siteconfig"]'));
  assert.ok(contactSource.includes("resolveSocialLinks("));
  assert.ok(contactSource.includes("<SocialAnchor"));
  assert.ok(contactSource.includes('data-testid="contact-node"'));
  assert.ok(contactSource.includes("platformTitle("));
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);

import assert from "node:assert/strict";

const { createRequire } = await import("node:module");
const req = createRequire(import.meta.url);
const React = req("react") as typeof import("react");
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
const { ContactChannelIcon } = await import(
  "../../src/components/contact/contact-channel-icons.tsx"
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

const render = (channelKey: string) =>
  renderToStaticMarkup(
    React.createElement(ContactChannelIcon as never, { channelKey, className: "size-6" })
  );

const KEYS = ["phone", "email", "facebook", "tiktok", "instagram", "threads", "youtube"];

check("every channel key renders a valid 24×24 svg", () => {
  for (const key of KEYS) {
    const html = render(key);
    assert.ok(html.startsWith("<svg "), `${key}: ${html.slice(0, 40)}`);
    assert.ok(html.includes('viewBox="0 0 24 24"'), `${key} missing viewBox`);
    assert.ok(html.includes('aria-hidden="true"'), `${key} should be aria-hidden`);
  }
});

check("line-art glyphs inherit currentColor + stay unlinked", () => {
  for (const key of ["phone", "email", "facebook", "tiktok", "instagram", "youtube"]) {
    const html = render(key);
    assert.ok(html.includes('stroke="currentColor"'), `${key} should stroke currentColor`);
    assert.ok(html.includes('fill="none"'), `${key} should be line-art`);
  }
});

check("TikTok glyph is optically scaled via a centred transform group", () => {
  const html = render("tiktok");
  assert.ok(/transform="translate\(12 12\) scale\(1\.1\d\)/.test(html), html);
});

check("Threads uses the filled canonical brand mark (not line-art)", () => {
  const html = render("threads");
  assert.ok(html.includes('fill="currentColor"'), html.slice(0, 60));
  assert.ok(!html.includes('fill="none"'), "Threads must be a solid glyph");
  assert.ok(
    html.includes("M18.263 11.097"),
    "Threads should carry the canonical Simple Icons path"
  );
});

check("unknown channel key renders nothing", () => {
  assert.equal(render("bogus"), "");
});

console.log(`\n${passed}/${passed + failed} checks passed`);
if (failed > 0) process.exit(1);

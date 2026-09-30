import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const publicFile = (name: string) =>
  readFileSync(new URL(`../../public/${name}`, import.meta.url));

const readPngIhdr = (png: Buffer) => {
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(png.toString("ascii", 12, 16), "IHDR");
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
    bitDepth: png[24],
    colorType: png[25],
  };
};

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

const FILES = [
  "favicon.ico",
  "icon.svg",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
];

for (const file of FILES) {
  check(`${file} exists`, () =>
    assert.ok(existsSync(new URL(`../../public/${file}`, import.meta.url)))
  );
}

check("apple-touch-icon 180x180 RGB (alpha flattened for iOS)", () => {
  const ihdr = readPngIhdr(publicFile("apple-touch-icon.png"));
  assert.deepEqual(
    [ihdr.width, ihdr.height, ihdr.bitDepth, ihdr.colorType],
    [180, 180, 8, 2]
  );
});

for (const [file, size] of [
  ["icon-192.png", 192],
  ["icon-512.png", 512],
] as const) {
  check(`${file} ${size}x${size} RGBA (alpha kept)`, () => {
    const ihdr = readPngIhdr(publicFile(file));
    assert.deepEqual(
      [ihdr.width, ihdr.height, ihdr.bitDepth, ihdr.colorType],
      [size, size, 8, 6]
    );
  });
}

check("favicon.ico is PNG-in-ICO with 16x16 + 32x32 entries", () => {
  const ico = publicFile("favicon.ico");
  assert.equal(ico.readUInt16LE(0), 0, "reserved must be 0");
  assert.equal(ico.readUInt16LE(2), 1, "type must be icon");
  assert.equal(ico.readUInt16LE(4), 2, "image count must be 2");

  const headerSize = 6;
  const entrySize = 16;
  const sizes: number[] = [];
  for (let i = 0; i < 2; i += 1) {
    const entry = headerSize + i * entrySize;
    const width = ico[entry] || 256;
    const height = ico[entry + 1] || 256;
    const offset = ico.readUInt32LE(entry + 12);
    const length = ico.readUInt32LE(entry + 8);
    assert.ok(offset + length <= ico.length, "payload must stay inside the file");
    assert.equal(width, height, "entry must be square");
    assert.equal(ico.readUInt16LE(entry + 6), 32, "entry bit depth must be 32");
    const payload = ico.subarray(offset, offset + length);
    const ihdr = readPngIhdr(payload as unknown as Buffer);
    assert.equal(ihdr.width, width, "IHDR width must match ICONDIRENTRY");
    sizes.push(width);
  }
  assert.deepEqual(sizes.sort((a, b) => a - b), [16, 32]);
  assert.ok(
    headerSize + entrySize * 2 <= ico.readUInt32LE(headerSize + 12),
    "first payload offset must sit after header+entries"
  );
});

check("icon.svg is a standalone 512 viewBox with no script/remote asset", () => {
  const svg = publicFile("icon.svg").toString("utf8");
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /viewBox="0 0 512 512"/);
  const lower = svg.toLowerCase();
  for (const banned of ["<script", "javascript:", "onload=", "<!doctype", "<!entity"]) {
    assert.ok(!lower.includes(banned), `must not contain ${banned}`);
  }
  assert.ok(!/href="https?:/.test(svg), "must not reference remote assets");
  const hrefs = [...svg.matchAll(/href="([^"]*)"/g)].map(([, href]) => href);
  assert.equal(hrefs.length, 1, "exactly one embedded image");
  assert.match(hrefs[0], /^data:image\/png;base64,/);
});

check("icon.svg embeds byte-identical icon-512.png", () => {
  const svg = publicFile("icon.svg").toString("utf8");
  const base64 = svg.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/)?.[1];
  assert.ok(base64, "embedded base64 payload missing");
  const embedded = Buffer.from(base64, "base64");
  const sha = (buffer: Buffer) => createHash("sha256").update(buffer).digest("hex");
  assert.equal(sha(embedded), sha(publicFile("icon-512.png")));
});

console.log(`${passed}/${passed + failed} assertions passed`);
process.exit(failed === 0 ? 0 : 1);

/**
 * Minimal WOFF2 → cmap reader (no dependencies).
 * Parses the WOFF2 table directory, Brotli-decompresses the table stream and
 * returns the set of codepoints exposed by the Unicode cmap subtables.
 */
import { brotliDecompressSync } from "node:zlib";

// WOFF2 known table tags, index-addressed by the table directory flags byte.
const KNOWN_TAGS = [
  "cmap", "head", "hhea", "hmtx", "maxp", "name", "OS/2", "post", "cvt ",
  "fpgm", "glyf", "loca", "prep", "CFF ", "VORG", "EBDT", "EBLC", "gasp",
  "hdmx", "kern", "LTSH", "PCLT", "VDMX", "vhea", "vmtx", "BASE", "GDEF",
  "GPOS", "GSUB", "EBSC", "JSTF", "MATH", "CBDT", "CBLC", "COLR", "CPAL",
  "SVG ", "sbix", "acnt", "avar", "bdat", "bloc", "bsln", "cvar", "fdsc",
  "feat", "fmtx", "fvar", "gvar", "hsty", "just", "lcar", "mort", "morx",
  "opbd", "prop", "trak", "Zapf", "Silf", "Glat", "Gloc", "Feat", "Sill",
];

const readBase128 = (buffer, state) => {
  let value = 0;
  for (let i = 0; i < 5; i += 1) {
    const byte = buffer[state.offset];
    state.offset += 1;
    value = (value << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) return value;
  }
  throw new Error("invalid WOFF2 UIntBase128");
};

const woff2Tables = (buffer) => {
  if (buffer.toString("ascii", 0, 4) !== "wOF2") throw new Error("not a WOFF2 file");
  const numTables = buffer.readUInt16BE(12);
  const compressedSize = buffer.readUInt32BE(20);
  const state = { offset: 48 };
  const tables = [];
  for (let i = 0; i < numTables; i += 1) {
    const flags = buffer[state.offset];
    state.offset += 1;
    const tagIndex = flags & 0x3f;
    const transform = flags >> 6;
    const tag = tagIndex === 63
      ? buffer.toString("ascii", state.offset, (state.offset += 4))
      : KNOWN_TAGS[tagIndex];
    const origLength = readBase128(buffer, state);
    const isGlyfLike = tag === "glyf" || tag === "loca";
    const transformed = isGlyfLike ? transform === 0 : transform !== 0;
    tables.push({ tag, length: transformed ? readBase128(buffer, state) : origLength });
  }
  const data = brotliDecompressSync(
    buffer.subarray(state.offset, state.offset + compressedSize),
  );
  let offset = 0;
  return tables.map((table) => {
    const bytes = data.subarray(offset, offset + table.length);
    offset += table.length;
    return { tag: table.tag, bytes };
  });
};

const addFormat4 = (cmap, offset, codepoints) => {
  const segCount = cmap.readUInt16BE(offset + 6) / 2;
  const ends = offset + 14;
  const starts = ends + segCount * 2 + 2;
  const deltas = starts + segCount * 2;
  const ranges = deltas + segCount * 2;
  for (let s = 0; s < segCount; s += 1) {
    const end = cmap.readUInt16BE(ends + s * 2);
    const start = cmap.readUInt16BE(starts + s * 2);
    const delta = cmap.readInt16BE(deltas + s * 2);
    const rangeOffset = cmap.readUInt16BE(ranges + s * 2);
    for (let cp = start; cp <= end && cp !== 0xffff; cp += 1) {
      let glyph = (cp + delta) & 0xffff;
      if (rangeOffset !== 0) {
        const at = ranges + s * 2 + rangeOffset + (cp - start) * 2;
        if (at + 1 >= cmap.length) continue;
        glyph = cmap.readUInt16BE(at);
        if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
      }
      if (glyph !== 0) codepoints.add(cp);
    }
  }
};

const addFormat12 = (cmap, offset, codepoints) => {
  const groups = cmap.readUInt32BE(offset + 12);
  for (let g = 0; g < groups; g += 1) {
    const base = offset + 16 + g * 12;
    const start = cmap.readUInt32BE(base);
    const end = cmap.readUInt32BE(base + 4);
    for (let cp = start; cp <= end; cp += 1) codepoints.add(cp);
  }
};

export const woff2Codepoints = (buffer) => {
  const cmap = woff2Tables(buffer).find((table) => table.tag === "cmap")?.bytes;
  if (!cmap) throw new Error("WOFF2 has no cmap");
  const codepoints = new Set();
  const numTables = cmap.readUInt16BE(2);
  for (let i = 0; i < numTables; i += 1) {
    const platform = cmap.readUInt16BE(4 + i * 8);
    const encoding = cmap.readUInt16BE(6 + i * 8);
    const offset = cmap.readUInt32BE(8 + i * 8);
    const isUnicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
    if (!isUnicode) continue;
    const format = cmap.readUInt16BE(offset);
    if (format === 4) addFormat4(cmap, offset, codepoints);
    if (format === 12) addFormat12(cmap, offset, codepoints);
  }
  return codepoints;
};

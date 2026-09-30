/**
 * PNG-in-ICO container writer (zero dependency).
 *
 * ICO files can carry PNG-compressed payloads (supported by every evergreen
 * browser + Windows Vista+), which lets us skip BMP encoding entirely.
 * Layout: ICONDIR (6 B) + ICONDIRENTRY * n (16 B each) + concatenated PNGs.
 */
import { isDeepStrictEqual } from "node:util";

/** Read square dimensions straight from a PNG's IHDR chunk (bytes 16..24). */
function readPngSize(buffer) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buffer.length < 24 || !isDeepStrictEqual([...buffer.subarray(0, 8)], signature)) {
    throw new Error("png-in-ico-writer: payload is not a PNG buffer");
  }
  if (buffer.toString("ascii", 12, 16) !== "IHDR") {
    throw new Error("png-in-ico-writer: PNG is missing IHDR chunk");
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

const HEADER_SIZE = 6;
const ENTRY_SIZE = 16;

/**
 * @param {Buffer[]} pngBuffers 16x16 / 32x32 (or larger) PNG payloads, any order
 * @returns {Buffer} complete .ico file
 */
export function buildIco(pngBuffers) {
  if (!Array.isArray(pngBuffers) || pngBuffers.length === 0 || pngBuffers.length > 255) {
    throw new Error("png-in-ico-writer: expected 1..255 PNG buffers");
  }

  const sizes = pngBuffers.map(readPngSize);
  for (const { width, height } of sizes) {
    if (width > 256 || height > 256 || width !== height) {
      throw new Error(
        `png-in-ico-writer: ICO needs a square image ≤256px, got ${width}x${height}`
      );
    }
  }
  let offset = HEADER_SIZE + ENTRY_SIZE * pngBuffers.length;

  const entries = pngBuffers.map((png, index) => {
    const { width, height } = sizes[index];
    const entry = Buffer.alloc(ENTRY_SIZE);
    entry.writeUInt8(width >= 256 ? 0 : width, 0); // width byte (0 == 256)
    entry.writeUInt8(height >= 256 ? 0 : height, 1); // height byte
    entry.writeUInt8(0, 2); // palette colors (unspecified)
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8); // payload byte length
    entry.writeUInt32LE(offset, 12); // payload offset
    offset += png.length;
    return entry;
  });

  const header = Buffer.alloc(HEADER_SIZE);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngBuffers.length, 4); // image count

  return Buffer.concat([header, ...entries, ...pngBuffers], offset);
}

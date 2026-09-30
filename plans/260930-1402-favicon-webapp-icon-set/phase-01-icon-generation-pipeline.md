# Phase 01 — Icon Generation Pipeline

**Status**: Pending · **Priority**: P2 · **Plan**: [plan.md](./plan.md)

## Overview
One-shot, re-runnable ESM script that renders every favicon asset from the real brand logo via `sharp`, plus a zero-dep PNG-in-ICO writer. Outputs committed to `public/` (no build-time generation).

## Context Links
- Source: `public/images/logo-duanmar.png` — 512×512 RGBA transparent (verified)
- Script convention: `scripts/*.mjs` invoked via npm script (`package.json:12-16`)
- `sharp@0.35.4` currently transitive via `next` only (`npm ls sharp`)

## Related Code Files
**Create**
1. `scripts/lib/png-in-ico-writer.mjs` (~50 lines) — `export function buildIco(pngBuffers)`:
   - ICONDIR: `00 00 01 00` + LE16 count
   - Per image ICONDIRENTRY (16 B): width byte (256→0, else size), height byte, colors=0, reserved=0, planes=1 (LE16), bitCount=32 (LE16), bytesInRes (LE32), imageOffset (LE32)
   - Width/height read from each PNG's IHDR (`readUInt32BE(16)`/`(20)`) — no extra params
   - Payloads concatenated after header; offsets precomputed (KISS: assumes PNG payloads, i.e. PNG-in-ICO)
2. `scripts/generate-favicon-set.mjs` (<200 lines, ESM):
   - `SRC = public/images/logo-duanmar.png`; `render(size, { flatten })` → `sharp(SRC).resize(size, size)` + optional `.flatten({ background: "#ffffff" })` + `.png({ compressionLevel: 9, adaptiveFiltering: true })` → Buffer
   - Writes: `public/icon-512.png` (512, alpha), `public/icon-192.png` (192, alpha), `public/apple-touch-icon.png` (180, **flattened white** → colorType 2, iOS discards alpha)
   - `public/favicon.ico` = `buildIco([render(16), render(32)])` (alpha kept, colorType 6)
   - `public/icon.svg` = template with `xmlns`, `viewBox="0 0 512 512"`, `width/height="512"`, single `<image href="data:image/png;base64,{icon-512 bytes}">` — embed the just-written `icon-512.png` file bytes (DRY: one source of truth)
   - Logs name + byte size per output; any failure → throw → exit 1

**Modify**
3. `package.json` — add devDependency `"sharp": "^0.35.4"` (`npm i -D sharp` dedupes with next's copy) and script `"icons:generate": "node scripts/generate-favicon-set.mjs"`

**Delete**: none. No `favicon.svg` duplicate (plan decision 2).

## Implementation Steps
1. `npm i -D sharp@^0.35.4`
2. Write `scripts/lib/png-in-ico-writer.mjs` (pure Buffer math, no deps)
3. Write `scripts/generate-favicon-set.mjs` (imports node:fs + sharp + writer)
4. Add npm script to `package.json`
5. Run `npm run icons:generate` → 5 files land in `public/`
6. Re-run → `git status`/hash check proves deterministic (no timestamp metadata in sharp PNG output)

## Success Criteria / Acceptance
- [ ] `npm run icons:generate` exits 0, prints 5 outputs with sizes
- [ ] `public/favicon.ico` parses: magic `00 00 01 00`, count=2, entries 16×16 & 32×32, payload offsets valid
- [ ] `apple-touch-icon.png` 180×180, colorType 2 (no alpha); `icon-192/512` square, colorType 6 (alpha)
- [ ] `icon.svg` well-formed, embeds byte-identical `icon-512.png` base64
- [ ] Re-run is byte-identical (deterministic); `npm run lint` clean

## Risk / Security
- `sharp` native binary availability on fresh clones → explicit devDep; CI/local both install via npm
- Writer bug → unit test in Phase 3 parses ICO deeply (entry widths + IHDR inside payloads)
- No network, no secrets, local reads only

## Next Steps
Phase 2 consumes the 5 assets: [phase-02-head-metadata-integration.md](./phase-02-head-metadata-integration.md)

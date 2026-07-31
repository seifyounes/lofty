// Builds the .ico for the desktop shortcut from the brand balloon art.
//
//   node tools/wallpaper-sync/make-icon.mjs [outPath]
//
// A balloon, not the wordmark: "lofty-logo.png" is 1568x735, which is illegible
// mush at the 16-32px sizes Windows actually draws a shortcut at. The balloon
// still reads as Lofty at 16px.
//
// ICO is a tiny container: a 6-byte header, one 16-byte directory entry per
// size, then the image payloads. Vista+ accepts whole PNGs as the payload, so
// the existing encoder is all we need -- no BMP/AND-mask encoding.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { decodePNG, encodePNG, downscale } from "./png.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const SOURCE = join(REPO, "public", "balloons", "galaxy-purple.png");
const SIZES = [256, 128, 64, 48, 32, 16];

/** Fit `src` inside a transparent size x size canvas, centred. */
function square(src, sw, sh, size) {
  const scale = Math.min(size / sw, size / sh);
  const dw = Math.max(1, Math.round(sw * scale));
  const dh = Math.max(1, Math.round(sh * scale));
  const small = downscale(src, sw, sh, dw, dh);

  const out = Buffer.alloc(size * size * 4); // zeroed = fully transparent
  const ox = Math.floor((size - dw) / 2);
  const oy = Math.floor((size - dh) / 2);
  for (let y = 0; y < dh; y++) {
    small.copy(out, ((y + oy) * size + ox) * 4, y * dw * 4, (y + 1) * dw * 4);
  }
  return out;
}

function buildIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(pngs.length, 4);

  const dir = Buffer.alloc(16 * pngs.length);
  let offset = header.length + dir.length;

  pngs.forEach(({ size, data }, i) => {
    const p = i * 16;
    dir[p] = size >= 256 ? 0 : size; // 0 means 256
    dir[p + 1] = size >= 256 ? 0 : size;
    dir[p + 2] = 0; // palette size
    dir[p + 3] = 0; // reserved
    dir.writeUInt16LE(1, p + 4); // colour planes
    dir.writeUInt16LE(32, p + 6); // bits per pixel
    dir.writeUInt32LE(data.length, p + 8);
    dir.writeUInt32LE(offset, p + 12);
    offset += data.length;
  });

  return Buffer.concat([header, dir, ...pngs.map((p) => p.data)]);
}

const out = resolve(process.argv[2] || join(HERE, "lofty.ico"));
const { W, H, rgba } = decodePNG(SOURCE);

const pngs = SIZES.map((size) => ({
  size,
  data: encodePNG(size, size, square(rgba, W, H, size)),
}));

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, buildIco(pngs));

const kb = (readFileSync(out).length / 1024).toFixed(1);
console.log(`wrote ${out} (${SIZES.join(", ")} px, ${kb} KB) from ${SOURCE}`);

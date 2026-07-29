// Minimal dependency-free PNG codec + box-filter downscaler.
// Lifted verbatim from the wallpaper build script, which took it from
// scripts/process-balloons.js. Node only (needs fs + zlib).
//
// Why it exists: the brand art is 1032x1251 but is never drawn wider than a few
// hundred px. A wallpaper stays resident forever, so serving full-size art would
// hold tens of MB of decoded RGBA for no visible gain.

import { readFileSync } from "node:fs";
import zlib from "node:zlib";

/** Decode an 8-bit PNG (RGBA ct=6 or RGB ct=2) to a straight RGBA buffer. */
export function decodePNG(file) {
  const b = readFileSync(file);
  let p = 8, W = 0, H = 0, ct = 0;
  const idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p);
    const type = b.slice(p + 4, p + 8).toString();
    const data = b.slice(p + 8, p + 8 + len);
    if (type === "IHDR") { W = data.readUInt32BE(0); H = data.readUInt32BE(4); ct = data[9]; }
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    p += 12 + len;
  }
  if (ct !== 6 && ct !== 2) throw new Error(`unsupported colour type ${ct} for ${file}`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = ct === 6 ? 4 : 3, stride = W * bpp;
  const out = Buffer.alloc(W * H * bpp);
  const cur = Buffer.alloc(stride), prev = Buffer.alloc(stride);
  let q = 0;
  const paeth = (a, bb, c) => {
    const pp = a + bb - c, pa = Math.abs(pp - a), pb = Math.abs(pp - bb), pc = Math.abs(pp - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? bb : c;
  };
  for (let y = 0; y < H; y++) {
    const f = raw[q++];
    for (let i = 0; i < stride; i++) {
      const x = raw[q++], a = i >= bpp ? cur[i - bpp] : 0, bn = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      cur[i] = (f === 0 ? x : f === 1 ? x + a : f === 2 ? x + bn : f === 3 ? x + ((a + bn) >> 1) : x + paeth(a, bn, c)) & 255;
    }
    cur.copy(out, y * stride);
    cur.copy(prev);
  }
  if (bpp === 4) return { W, H, rgba: out };
  const rgba = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    rgba[i * 4] = out[i * 3]; rgba[i * 4 + 1] = out[i * 3 + 1];
    rgba[i * 4 + 2] = out[i * 3 + 2]; rgba[i * 4 + 3] = 255;
  }
  return { W, H, rgba };
}

const CRCT = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();

const crc32 = (buf) => {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRCT[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
};

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

export function encodePNG(W, H, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
  const stride = W * 4;
  const rawi = Buffer.alloc((stride + 1) * H);
  for (let y = 0; y < H; y++) {
    rawi[y * (stride + 1)] = 0;
    rgba.copy(rawi, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(rawi, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Box-filter downscale. Alpha is premultiplied first so transparent edges
 *  don't drag dark fringes into the glow. */
export function downscale(src, sw, sh, dw, dh) {
  const out = Buffer.alloc(dw * dh * 4);
  const xr = sw / dw, yr = sh / dh;
  for (let dy = 0; dy < dh; dy++) {
    const y0 = Math.floor(dy * yr), y1 = Math.min(sh, Math.max(y0 + 1, Math.ceil((dy + 1) * yr)));
    for (let dx = 0; dx < dw; dx++) {
      const x0 = Math.floor(dx * xr), x1 = Math.min(sw, Math.max(x0 + 1, Math.ceil((dx + 1) * xr)));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * sw + x) * 4, al = src[i + 3];
          r += src[i] * al; g += src[i + 1] * al; b += src[i + 2] * al; a += al; n++;
        }
      }
      const o = (dy * dw + dx) * 4;
      if (a > 0) { out[o] = Math.round(r / a); out[o + 1] = Math.round(g / a); out[o + 2] = Math.round(b / a); }
      out[o + 3] = Math.round(a / n);
    }
  }
  return out;
}

/** Decode `from`, scale to `width`, encode. Returns a PNG buffer. */
export function resizeToWidth(from, width) {
  const { W: sw, H: sh, rgba } = decodePNG(from);
  const dw = Math.max(1, Math.min(sw, Math.round(width)));
  const dh = Math.max(1, Math.round((dw / sw) * sh));
  return encodePNG(dw, dh, downscale(rgba, sw, sh, dw, dh));
}

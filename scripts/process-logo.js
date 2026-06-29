// Trim the brand wordmark (`brand designs/logo/logo alone.png`, transparent RGBA)
// to its alpha bounding box -> `public/lofty-logo.png`.
//
//   node scripts/process-logo.js
const fs = require("fs");
const zlib = require("zlib");
const path = require("path");

const SRC = path.join(__dirname, "..", "brand designs", "logo", "logo alone.png");
const DEST = path.join(__dirname, "..", "public", "lofty-logo.png");

// Decode an 8-bit PNG (RGBA ct=6 or RGB ct=2) to a straight RGBA buffer.
function decode(file) {
  const b = fs.readFileSync(file);
  let p = 8, W = 0, H = 0, ct = 0, idat = [];
  while (p < b.length) { const len = b.readUInt32BE(p); const t = b.slice(p + 4, p + 8).toString(); const d = b.slice(p + 8, p + 8 + len); if (t === "IHDR") { W = d.readUInt32BE(0); H = d.readUInt32BE(4); ct = d[9]; } else if (t === "IDAT") idat.push(d); else if (t === "IEND") break; p += 12 + len; }
  if (ct !== 6 && ct !== 2) throw new Error("unsupported colour type " + ct);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = ct === 6 ? 4 : 3, stride = W * bpp, cur = Buffer.alloc(stride), prev = Buffer.alloc(stride), out = Buffer.alloc(W * H * bpp); let q = 0;
  const pa = (a, b, c) => { const p = a + b - c, x = Math.abs(p - a), y = Math.abs(p - b), z = Math.abs(p - c); return x <= y && x <= z ? a : y <= z ? b : c; };
  for (let y = 0; y < H; y++) { const f = raw[q++]; for (let i = 0; i < stride; i++) { const x = raw[q++], A = i >= bpp ? cur[i - bpp] : 0, B = prev[i], C = i >= bpp ? prev[i - bpp] : 0; let v; if (f === 0) v = x; else if (f === 1) v = x + A; else if (f === 2) v = x + B; else if (f === 3) v = x + ((A + B) >> 1); else v = x + pa(A, B, C); cur[i] = v & 255; } cur.copy(out, y * stride); cur.copy(prev); }
  if (bpp === 4) return { W, H, rgba: out };
  const rgba = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) { rgba[i * 4] = out[i * 3]; rgba[i * 4 + 1] = out[i * 3 + 1]; rgba[i * 4 + 2] = out[i * 3 + 2]; rgba[i * 4 + 3] = 255; }
  return { W, H, rgba };
}
const CRCT = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRCT[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const t = Buffer.from(type); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, crc]); }
function encode(W, H, rgba) { const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6; const stride = W * 4; const rawi = Buffer.alloc((stride + 1) * H); for (let y = 0; y < H; y++) { rawi[y * (stride + 1)] = 0; rgba.copy(rawi, y * (stride + 1) + 1, y * stride, y * stride + stride); } return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(rawi, { level: 9 })), chunk("IEND", Buffer.alloc(0))]); }

const { W, H, rgba } = decode(SRC);
const N = W * H;
let minX = W, minY = H, maxX = 0, maxY = 0;
for (let i = 0; i < N; i++) {
  if (rgba[i * 4 + 3] <= 16) continue;
  const x = i % W, y = (i / W) | 0;
  if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
}
const pad = Math.round((maxX - minX) * 0.02);
minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad); maxX = Math.min(W - 1, maxX + pad); maxY = Math.min(H - 1, maxY + pad);
const cw = maxX - minX + 1, ch = maxY - minY + 1;
const crop = Buffer.alloc(cw * ch * 4);
for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const si = ((y + minY) * W + (x + minX)) * 4, di = (y * cw + x) * 4; crop[di] = rgba[si]; crop[di + 1] = rgba[si + 1]; crop[di + 2] = rgba[si + 2]; crop[di + 3] = rgba[si + 3]; }
fs.mkdirSync(path.dirname(DEST), { recursive: true });
fs.writeFileSync(DEST, encode(cw, ch, crop));
console.log("wrote", DEST, cw + "x" + ch);

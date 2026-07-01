// Crop the brand balloon art (transparent RGBA, in `brand designs/balloons/`)
// into uniformly-sized PNGs in `public/balloons/`.
//
//   node scripts/process-balloons.js
//
// The source art is already transparent, so this just:
//   1. Removes stray specks (keeps the largest connected component).
//   2. Crops every colour to one canonical UNION box, so no balloon is clipped
//      and they all render at the same visual size.
const fs = require("fs");
const zlib = require("zlib");
const path = require("path");

// Source art: the no-cloud balloons (cloud removed so the priority number + idea
// name can be drawn legibly in the balloon's centre).
const SRC = path.join(__dirname, "..", "brand designs", "balloons with no cloud insiide");
const DEST = path.join(__dirname, "..", "public", "balloons");

// original filename (without .png) -> output id
const MAP = {
  "Hot pink": "hot-pink",
  "Royal blue": "royal-blue",
  "galaxy purple": "galaxy-purple",
  "Teal blue": "teal-blue",
  "Hot orange": "hot-orange",
  "Earthy green": "earthy-green",
  "Lilac": "lilac",
  "Red cherry": "red-cherry",
  "Sunny yellow": "sunny-yellow",
  "Pearly white": "pearly-white",
  "Gray": "gray",
  "silver": "silver",
  "yahaf": "yahaf",
  // Galaxy set
  "Andromeda Galaxy": "andromeda-galaxy",
  "Black Eye Galaxy": "black-eye-galaxy",
  "Bodes Galaxy": "bodes-galaxy",
  "Cartwheel Galaxy": "cartwheel-galaxy",
  "Cigar Galaxy": "cigar-galaxy",
  "Hoags Object": "hoags-object",
  "Pinwheel Galaxy": "pinwheel-galaxy",
  "Sombrero Galaxy": "sombrero-galaxy",
  "Sunflower Galaxy": "sunflower-galaxy",
  "Tadpole Galaxy": "tadpole-galaxy",
  "Triangulum Galaxy": "triangulum-galaxy",
  "Whirlpool Galaxy": "whirlpool-galaxy",
};

// Representative glow colour for a balloon: a brightness/saturation-weighted
// average of its visible pixels, then lifted so the glow reads vividly.
function swatchOf(buf, w, h) {
  let R = 0, G = 0, B = 0, wsum = 0;
  for (let i = 0; i < w * h; i++) {
    const a = buf[i * 4 + 3];
    if (a < 200) continue;
    const r = buf[i * 4], g = buf[i * 4 + 1], b = buf[i * 4 + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const v = mx / 255, s = mx === 0 ? 0 : (mx - mn) / mx;
    const wt = Math.pow(s, 1.4) * v + 0.015;
    R += r * wt; G += g * wt; B += b * wt; wsum += wt;
  }
  if (wsum === 0) return "#ffffff";
  let r = R / wsum, g = G / wsum, b = B / wsum;
  // lift toward a punchy brightness so the drop-shadow glow shows
  const mx = Math.max(r, g, b, 1), lift = Math.min(1.7, 235 / mx);
  const hx = (x) => Math.max(0, Math.min(255, Math.round(x * lift))).toString(16).padStart(2, "0");
  return "#" + hx(r) + hx(g) + hx(b);
}

// Decode an 8-bit PNG (RGBA ct=6 or RGB ct=2) to a straight RGBA buffer.
function decode(file) {
  const b = fs.readFileSync(file);
  let p = 8, W = 0, H = 0, ct = 0, idat = [];
  while (p < b.length) {
    const len = b.readUInt32BE(p);
    const type = b.slice(p + 4, p + 8).toString();
    const data = b.slice(p + 8, p + 8 + len);
    if (type === "IHDR") { W = data.readUInt32BE(0); H = data.readUInt32BE(4); ct = data[9]; }
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    p += 12 + len;
  }
  if (ct !== 6 && ct !== 2) throw new Error("unsupported colour type " + ct + " for " + file);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = ct === 6 ? 4 : 3, stride = W * bpp;
  const out = Buffer.alloc(W * H * bpp);
  const cur = Buffer.alloc(stride), prev = Buffer.alloc(stride);
  let q = 0;
  const paeth = (a, bb, c) => { const pp = a + bb - c, pa = Math.abs(pp - a), pb = Math.abs(pp - bb), pc = Math.abs(pp - c); return pa <= pb && pa <= pc ? a : pb <= pc ? bb : c; };
  for (let y = 0; y < H; y++) {
    const f = raw[q++];
    for (let i = 0; i < stride; i++) {
      const x = raw[q++], a = i >= bpp ? cur[i - bpp] : 0, bn = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v;
      if (f === 0) v = x; else if (f === 1) v = x + a; else if (f === 2) v = x + bn; else if (f === 3) v = x + ((a + bn) >> 1); else v = x + paeth(a, bn, c);
      cur[i] = v & 255;
    }
    cur.copy(out, y * stride);
    cur.copy(prev);
  }
  if (bpp === 4) return { W, H, rgba: out };
  const rgba = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) { rgba[i * 4] = out[i * 3]; rgba[i * 4 + 1] = out[i * 3 + 1]; rgba[i * 4 + 2] = out[i * 3 + 2]; rgba[i * 4 + 3] = 255; }
  return { W, H, rgba };
}

const CRCT = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRCT[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const t = Buffer.from(type); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, crc]); }
function encode(W, H, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
  const stride = W * 4;
  const rawi = Buffer.alloc((stride + 1) * H);
  for (let y = 0; y < H; y++) { rawi[y * (stride + 1)] = 0; rgba.copy(rawi, y * (stride + 1) + 1, y * stride, y * stride + stride); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(rawi, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

function analyze(file) {
  const { W, H, rgba } = decode(file);
  const N = W * H;
  const alpha = new Uint8Array(N);
  for (let i = 0; i < N; i++) alpha[i] = rgba[i * 4 + 3];

  // Remove stray specks: keep only the largest connected component of visible pixels.
  const lab = new Int32Array(N);
  let cur = 0; const sizes = [0]; const st = [];
  for (let s = 0; s < N; s++) {
    if (lab[s] !== 0 || alpha[s] <= 8) continue;
    cur++; st.length = 0; st.push(s); lab[s] = cur; let size = 0;
    while (st.length) {
      const i = st.pop(); size++;
      const x = i % W, y = (i / W) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1])
        if (j >= 0 && lab[j] === 0 && alpha[j] > 8) { lab[j] = cur; st.push(j); }
    }
    sizes[cur] = size;
  }
  let maxId = 1;
  for (let k = 2; k < sizes.length; k++) if (sizes[k] > sizes[maxId]) maxId = k;
  for (let i = 0; i < N; i++) if (lab[i] !== maxId) { alpha[i] = 0; rgba[i * 4 + 3] = 0; }

  // bbox of the solid balloon (alpha >= 90) -> consistent sizing
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let i = 0; i < N; i++) {
    if (alpha[i] < 90) continue;
    const x = i % W, y = (i / W) | 0;
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return { W, H, rgba, bbox: { minX, minY, maxX, maxY } };
}

fs.mkdirSync(DEST, { recursive: true });
const items = Object.entries(MAP).map(([orig, id]) => ({ id, ...analyze(path.join(SRC, orig + ".png")) }));
const W = items[0].W, H = items[0].H;
items.forEach((i) => console.log(i.id.padEnd(14), "bbox", JSON.stringify(i.bbox).replace(/"/g, "")));
// Canonical box = the UNION of every balloon's bbox, so no colour is ever clipped.
let minX = Math.min(...items.map((i) => i.bbox.minX));
let minY = Math.min(...items.map((i) => i.bbox.minY));
let maxX = Math.max(...items.map((i) => i.bbox.maxX));
let maxY = Math.max(...items.map((i) => i.bbox.maxY));
const mgX = Math.round((maxX - minX) * 0.05), mgY = Math.round((maxY - minY) * 0.05);
minX = Math.max(0, minX - mgX); maxX = Math.min(W - 1, maxX + mgX);
minY = Math.max(0, minY - mgY); maxY = Math.min(H - 1, maxY + mgY);
const cw = maxX - minX + 1, ch = maxY - minY + 1;
console.log("canonical crop", cw + "x" + ch, "aspect(h/w)", (ch / cw).toFixed(4));
const swatches = {};
for (const it of items) {
  const crop = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const si = ((y + minY) * W + (x + minX)) * 4, di = (y * cw + x) * 4;
    crop[di] = it.rgba[si]; crop[di + 1] = it.rgba[si + 1]; crop[di + 2] = it.rgba[si + 2]; crop[di + 3] = it.rgba[si + 3];
  }
  fs.writeFileSync(path.join(DEST, it.id + ".png"), encode(cw, ch, crop));
  swatches[it.id] = swatchOf(crop, cw, ch);
  console.log("wrote", it.id.padEnd(18), "swatch", swatches[it.id]);
}
console.log("\nswatches JSON:\n" + JSON.stringify(swatches, null, 2));

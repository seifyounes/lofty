// Pure geometry/format helpers shared by the wallpaper service (Node) and the
// wallpaper page (browser). Lifted verbatim from the original build script so
// there is exactly ONE definition of the layout maths.
//
// IMPORTANT: this file is also inlined into index.html by build-shell.mjs, which
// strips the leading `export ` from each declaration. Keep every export on its
// own line starting with `export `, and never import anything here.

export const W = 1920;
export const H = 1080;
export const ASPECT = 1251 / 1032; // matches BalloonField / Balloon

/** 0..100 "how big" -> balloon diameter in px (design: 70 + big/100*200). */
export const bigToPx = (big) => Math.round(70 + (Math.max(0, Math.min(100, big)) / 100) * 200);

/** progress 0..1 -> width fraction. Single source of truth, same as format.ts. */
export const deflateScale = (p) => 1 - Math.max(0, Math.min(1, p)) * 0.8;

/** A promoted layer clips drop-shadow unless padded — the BalloonField lesson. */
export const padFor = (size) => Math.max(20, size * 0.38);

export function alpha(hex, a) {
  const c = String(hex || "#A06BFF").replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Art is cached at these widths so a size change reuses a file instead of
 *  overwriting one (WebView2 caches by path, so overwriting serves stale art). */
export const BUCKETS = [128, 192, 288, 432, 640, 896];

export function bucketFor(width) {
  for (const b of BUCKETS) if (width <= b) return b;
  return BUCKETS[BUCKETS.length - 1];
}

/** Stable 32-bit hash — used to derive bob phase from an idea id so a reorder
 *  never makes an existing balloon jump to a different animation offset. */
export function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Place N balloons across the 1920x1080 box, whatever N is. Rows are balanced,
 * then one uniform scale is chosen so the widest row and the stack of rows both
 * fit with margins — three ideas fill the screen instead of huddling in the
 * middle, and a dozen still fit without collisions.
 *
 * `items` need `{ w, h }` (design px at scale 1); everything else is carried
 * through untouched. Returns copies with final `w`, `h`, `cx`, `cy`.
 */
export function layout(items) {
  const N = items.length;
  if (!N) return [];
  const PAD_X = 120, PAD_Y = 95, GAP_X = 95, GAP_Y = 70;
  const rows = N <= 3 ? 1 : N <= 8 ? 2 : N <= 15 ? 3 : 4;

  // Balanced split, biggest rows first.
  const counts = [];
  let left = N;
  for (let r = rows; r > 0; r--) {
    const c = Math.ceil(left / r);
    counts.push(c);
    left -= c;
  }

  // Slice items into rows in priority order.
  const grid = [];
  let k = 0;
  for (const c of counts) grid.push(items.slice(k, k += c));

  // One scale that satisfies both axes.
  const rowBaseW = grid.map((row) => row.reduce((s, it) => s + it.w, 0) + GAP_X * (row.length - 1));
  const rowBaseH = grid.map((row) => Math.max(...row.map((it) => it.h)));
  const sx = (W - 2 * PAD_X) / Math.max(...rowBaseW);
  const sy = (H - 2 * PAD_Y - GAP_Y * (rows - 1)) / rowBaseH.reduce((a, b) => a + b, 0);
  const scale = Math.min(sx, sy, 2.2);

  const totalH = rowBaseH.reduce((a, b) => a + b, 0) * scale + GAP_Y * (rows - 1);
  let y = (H - totalH) / 2;
  const out = [];
  grid.forEach((row, ri) => {
    const rowH = rowBaseH[ri] * scale;
    const rowW = row.reduce((s, it) => s + it.w * scale, 0) + GAP_X * (row.length - 1);
    let x = (W - rowW) / 2;
    row.forEach((it, ci) => {
      const w = it.w * scale, h = it.h * scale;
      // gentle alternating lift so it doesn't read as a spreadsheet
      const stagger = (ci % 2 ? -1 : 1) * Math.min(26, rowH * 0.05);
      out.push({ ...it, w, h, cx: x + w / 2, cy: y + rowH / 2 + stagger });
      x += w + GAP_X;
    });
    y += rowH + GAP_Y;
  });
  return out;
}

/** Turn wire rows into laid-out balloons. One call, both sides. */
export function placeRows(rows) {
  return layout(
    rows.map(([id, priority, big, balloon, progress, name]) => {
      const w = bigToPx(big) * deflateScale(progress);
      return { id, priority, big, balloon, progress, name, w, h: w * ASPECT };
    }),
  );
}

/** Advisory self-check — the wallpaper must still render if this complains. */
export function checkPlacement(placed) {
  const problems = [];
  const box = (p) => ({ l: p.cx - p.w / 2, r: p.cx + p.w / 2, t: p.cy - p.h / 2, b: p.cy + p.h / 2 });
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = box(placed[i]), b = box(placed[j]);
      if (a.l < b.r && b.l < a.r && a.t - 8 < b.b + 8 && b.t - 8 < a.b + 8) {
        problems.push(`overlap: #${placed[i].priority} vs #${placed[j].priority}`);
      }
    }
  }
  for (const p of placed) {
    const b = box(p);
    if (b.l < 0 || b.t < 0 || b.r > W || b.b > H) problems.push(`off-screen: #${p.priority}`);
  }
  return problems;
}

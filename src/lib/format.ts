// Size and date helpers. Mapping mirrors the original design math so the
// rendered balloons land at the same pixel sizes as the mockups.

export const DAY = 86_400_000;
/** Same base date the design used for its "days from now" copy. */
export const BASE_DATE = new Date(2026, 5, 29); // 2026-06-29

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** 0..100 "how big" → balloon diameter in px (design: 70 + big/100*200). */
export function bigToPx(big: number): number {
  const b = Math.max(0, Math.min(100, big));
  return Math.round(70 + (b / 100) * 200);
}

/** Inverse of bigToPx — used to seed `big` from the design's px sizes. */
export function pxToBig(px: number): number {
  return Math.max(0, Math.min(100, Math.round((px - 70) / 2)));
}

/** Whole days until a deadline (>= rounds up so "today" still reads 0/1). */
export function daysLeft(deadline: number, now: number = Date.now()): number {
  return Math.ceil((deadline - now) / DAY);
}

/** "Jul 12" style label. */
export function formatDue(deadline: number): string {
  const d = new Date(deadline);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Slider/preview label by bigness. */
export function bigLabel(big: number): string {
  return big < 33 ? "Small idea" : big < 66 ? "Big idea" : "Huge idea";
}

/** List-row tag, keyed off the resolved px size (design thresholds 140 / 110). */
export function sizeTag(big: number): string {
  const px = bigToPx(big);
  return px > 140 ? "Huge idea" : px > 110 ? "Big idea" : "Medium idea";
}

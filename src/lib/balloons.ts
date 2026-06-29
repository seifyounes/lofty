// The brand balloon set. Each idea picks one by name; `src` is served from
// /public, `swatch` is a representative colour used for small UI accents.

export type BalloonColor = {
  id: string;
  name: string;
  src: string;
  swatch: string;
};

export const BALLOONS: BalloonColor[] = [
  { id: "galaxy-purple", name: "Galaxy purple", src: "/balloons/galaxy-purple.png", swatch: "#A06BFF" },
  { id: "hot-pink", name: "Hot pink", src: "/balloons/hot-pink.png", swatch: "#FF3DA5" },
  { id: "royal-blue", name: "Royal blue", src: "/balloons/royal-blue.png", swatch: "#3B57FF" },
  { id: "teal-blue", name: "Teal blue", src: "/balloons/teal-blue.png", swatch: "#2ED9E6" },
  { id: "earthy-green", name: "Earthy green", src: "/balloons/earthy-green.png", swatch: "#46C66B" },
  { id: "sunny-yellow", name: "Sunny yellow", src: "/balloons/sunny-yellow.png", swatch: "#FFC83D" },
  { id: "hot-orange", name: "Hot orange", src: "/balloons/hot-orange.png", swatch: "#FF8A2E" },
  { id: "red-cherry", name: "Red cherry", src: "/balloons/red-cherry.png", swatch: "#FF3B57" },
  { id: "lilac", name: "Lilac", src: "/balloons/lilac.png", swatch: "#C7A6FF" },
  { id: "pearly-white", name: "Pearly white", src: "/balloons/pearly-white.png", swatch: "#E7E6FF" },
  { id: "silver", name: "Silver", src: "/balloons/silver.png", swatch: "#C9CEDC" },
  { id: "gray", name: "Gray", src: "/balloons/gray.png", swatch: "#9AA0B5" },
  { id: "yahaf", name: "Yahaf", src: "/balloons/yahaf.png", swatch: "#FFB3D1" },
];

export const DEFAULT_BALLOON = "galaxy-purple";

const BY_ID: Record<string, BalloonColor> = Object.fromEntries(BALLOONS.map((b) => [b.id, b]));

export function getBalloon(id: string | undefined | null): BalloonColor {
  return (id && BY_ID[id]) || BY_ID[DEFAULT_BALLOON];
}

// Map legacy hex colours (pre-brand-assets) to the nearest brand balloon.
const HEX_TO_ID: Record<string, string> = {
  "#A06BFF": "galaxy-purple",
  "#FF5FA2": "hot-pink",
  "#46E0FF": "teal-blue",
  "#8BFF6B": "earthy-green",
  "#FFC24B": "sunny-yellow",
  "#FF6B5F": "hot-orange",
};

export function balloonIdFromLegacy(color: string | undefined): string {
  if (!color) return DEFAULT_BALLOON;
  if (BY_ID[color]) return color; // already an id
  return HEX_TO_ID[color.toUpperCase()] || DEFAULT_BALLOON;
}

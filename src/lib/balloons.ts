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
  { id: "baby-pink", name: "Baby pink", src: "/balloons/baby-pink.png", swatch: "#FFB3D1" },
  // Galaxy set — swatches auto-derived from the art (scripts/process-balloons.js).
  { id: "andromeda-galaxy", name: "Andromeda", src: "/balloons/andromeda-galaxy.png", swatch: "#7066EB" },
  { id: "black-eye-galaxy", name: "Black Eye", src: "/balloons/black-eye-galaxy.png", swatch: "#EBB98C" },
  { id: "bodes-galaxy", name: "Bode's", src: "/balloons/bodes-galaxy.png", swatch: "#D7C0B3" },
  { id: "cartwheel-galaxy", name: "Cartwheel", src: "/balloons/cartwheel-galaxy.png", swatch: "#465DEB" },
  { id: "cigar-galaxy", name: "Cigar", src: "/balloons/cigar-galaxy.png", swatch: "#EB682F" },
  { id: "hoags-object", name: "Hoag's Object", src: "/balloons/hoags-object.png", swatch: "#4C92EB" },
  { id: "pinwheel-galaxy", name: "Pinwheel", src: "/balloons/pinwheel-galaxy.png", swatch: "#3370EB" },
  { id: "sombrero-galaxy", name: "Sombrero", src: "/balloons/sombrero-galaxy.png", swatch: "#EBB97C" },
  { id: "sunflower-galaxy", name: "Sunflower", src: "/balloons/sunflower-galaxy.png", swatch: "#EBA63C" },
  { id: "tadpole-galaxy", name: "Tadpole", src: "/balloons/tadpole-galaxy.png", swatch: "#2EA9EB" },
  { id: "triangulum-galaxy", name: "Triangulum", src: "/balloons/triangulum-galaxy.png", swatch: "#84A9EB" },
  { id: "whirlpool-galaxy", name: "Whirlpool", src: "/balloons/whirlpool-galaxy.png", swatch: "#1E73EB" },
  // Planet set — our solar system. Swatches auto-derived from the art.
  { id: "mercury", name: "Mercury", src: "/balloons/mercury.png", swatch: "#E3DAD3" },
  { id: "venus", name: "Venus", src: "/balloons/venus.png", swatch: "#EBAB36" },
  { id: "earth", name: "Earth", src: "/balloons/earth.png", swatch: "#2D89EB" },
  { id: "mars", name: "Mars", src: "/balloons/mars.png", swatch: "#EB6321" },
  { id: "jupiter", name: "Jupiter", src: "/balloons/jupiter.png", swatch: "#EB914B" },
  { id: "saturn", name: "Saturn", src: "/balloons/saturn.png", swatch: "#EBC076" },
  { id: "uranus", name: "Uranus", src: "/balloons/uranus.png", swatch: "#65E3EB" },
  { id: "neptune", name: "Neptune", src: "/balloons/neptune.png", swatch: "#0F59EB" },
  { id: "pluto", name: "Pluto", src: "/balloons/pluto.png", swatch: "#EBC3A7" },
  // Planet set — exoplanets.
  { id: "proxima-centauri-b", name: "Proxima b", src: "/balloons/proxima-centauri-b.png", swatch: "#EB6C7A" },
  { id: "trappist-1e", name: "TRAPPIST-1e", src: "/balloons/trappist-1e.png", swatch: "#B58C8A" },
  { id: "kepler-22b", name: "Kepler-22b", src: "/balloons/kepler-22b.png", swatch: "#42E5EB" },
  { id: "kepler-452b", name: "Kepler-452b", src: "/balloons/kepler-452b.png", swatch: "#74A5A2" },
  { id: "kepler-16b", name: "Kepler-16b", src: "/balloons/kepler-16b.png", swatch: "#EB8149" },
  { id: "51-pegasi-b", name: "51 Pegasi b", src: "/balloons/51-pegasi-b.png", swatch: "#EB8A19" },
  { id: "hd-209458-b", name: "Osiris", src: "/balloons/hd-209458-b.png", swatch: "#4649EB" },
  { id: "hd-189733-b", name: "HD 189733 b", src: "/balloons/hd-189733-b.png", swatch: "#105DEB" },
  { id: "wasp-12b", name: "WASP-12b", src: "/balloons/wasp-12b.png", swatch: "#EB4039" },
  { id: "wasp-76b", name: "WASP-76b", src: "/balloons/wasp-76b.png", swatch: "#EB7217" },
  { id: "k2-18b", name: "K2-18b", src: "/balloons/k2-18b.png", swatch: "#47CDEB" },
  { id: "gj-1214-b", name: "GJ 1214 b", src: "/balloons/gj-1214-b.png", swatch: "#90C4EB" },
  { id: "55-cancri-e", name: "55 Cancri e", src: "/balloons/55-cancri-e.png", swatch: "#EB3F22" },
  { id: "toi-700-d", name: "TOI-700 d", src: "/balloons/toi-700-d.png", swatch: "#B2B89A" },
  { id: "lhs-1140-b", name: "LHS 1140 b", src: "/balloons/lhs-1140-b.png", swatch: "#848CAE" },
  { id: "hr-8799-e", name: "HR 8799 e", src: "/balloons/hr-8799-e.png", swatch: "#EB4960" },
];

export const DEFAULT_BALLOON = "galaxy-purple";

const BY_ID: Record<string, BalloonColor> = Object.fromEntries(BALLOONS.map((b) => [b.id, b]));

/**
 * Balloons that changed id. Saved ideas keep the old one, so resolve it here (and
 * migrate it on load) instead of silently falling back to the default colour.
 */
const RENAMED: Record<string, string> = {
  yahaf: "baby-pink",
};

/** The current id for a stored one, following any rename. */
export function resolveBalloonId(id: string | undefined | null): string {
  if (!id) return DEFAULT_BALLOON;
  if (BY_ID[id]) return id;
  return RENAMED[id] || DEFAULT_BALLOON;
}

export function getBalloon(id: string | undefined | null): BalloonColor {
  return BY_ID[resolveBalloonId(id)];
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
  if (RENAMED[color]) return RENAMED[color];
  return HEX_TO_ID[color.toUpperCase()] || DEFAULT_BALLOON;
}

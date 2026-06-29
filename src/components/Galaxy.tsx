// Faithful port of Galaxy.dc.html — animated nebula + deterministic starfield.
// Keyframes live in globals.css. Stars use the design's seeded LCG so server
// and client render identically (no hydration mismatch).
import type { CSSProperties } from "react";

type Star = {
  x: string;
  y: string;
  sz: string;
  o: string;
  glow: string;
  dur: string;
  delay: string;
};

function buildStars(): Star[] {
  let seed = 9;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const stars: Star[] = [];
  for (let i = 0; i < 66; i++) {
    stars.push({
      x: (rnd() * 100).toFixed(2),
      y: (rnd() * 100).toFixed(2),
      sz: (rnd() * 2 + 1).toFixed(1),
      o: (rnd() * 0.6 + 0.3).toFixed(2),
      glow: (rnd() * 4 + 1).toFixed(1),
      dur: (rnd() * 4 + 2.5).toFixed(1),
      delay: (rnd() * 6).toFixed(1),
    });
  }
  return stars;
}

const STARS = buildStars();

const root: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  overflow: "hidden",
  background:
    "radial-gradient(120% 100% at 50% 28%, #221a55 0%, #170f3f 38%, #0c0826 72%, #060418 100%)",
};

const blob1: CSSProperties = {
  position: "absolute",
  width: "62%",
  height: "56%",
  left: "4%",
  top: "6%",
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(196,90,255,0.50), rgba(196,90,255,0) 62%)",
  filter: "blur(50px)",
  animation: "lofty-drift1 42s ease-in-out infinite",
};
const blob2: CSSProperties = {
  position: "absolute",
  width: "56%",
  height: "52%",
  right: "1%",
  top: "28%",
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(70,140,255,0.46), rgba(70,140,255,0) 62%)",
  filter: "blur(56px)",
  animation: "lofty-drift2 55s ease-in-out infinite",
};
const blob3: CSSProperties = {
  position: "absolute",
  width: "52%",
  height: "46%",
  left: "24%",
  bottom: "-6%",
  borderRadius: "50%",
  background: "radial-gradient(circle, rgba(255,90,170,0.34), rgba(255,90,170,0) 64%)",
  filter: "blur(60px)",
  animation: "lofty-drift3 68s ease-in-out infinite",
};

export default function Galaxy() {
  return (
    <div style={root}>
      <div style={blob1} />
      <div style={blob2} />
      <div style={blob3} />
      <div style={{ position: "absolute", inset: "-50px", animation: "lofty-starfield 60s linear infinite" }}>
        {STARS.map((s, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: s.x + "%",
              top: s.y + "%",
              width: s.sz + "px",
              height: s.sz + "px",
              borderRadius: "50%",
              background: "#ffffff",
              boxShadow: `0 0 ${s.glow}px rgba(255,255,255,0.85)`,
              opacity: Number(s.o),
              animation: `lofty-tw ${s.dur}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          left: "8%",
          top: "14%",
          width: "130px",
          height: "2px",
          borderRadius: "2px",
          background: "linear-gradient(90deg, rgba(255,255,255,0), #ffffff)",
          opacity: 0,
          animation: "lofty-shoot 15s ease-in 4s infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "42%",
          top: "7%",
          width: "96px",
          height: "2px",
          borderRadius: "2px",
          background: "linear-gradient(90deg, rgba(255,255,255,0), #cfe3ff)",
          opacity: 0,
          animation: "lofty-shoot 21s ease-in 12s infinite",
        }}
      />
    </div>
  );
}

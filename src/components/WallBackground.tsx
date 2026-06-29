"use client";

// Animated, 3D-feeling wall background: the nebula image slowly zooms/pans
// (Ken Burns), drifting coloured light + a twinkling starfield + shooting stars
// move on top, and the whole stack reacts to the mouse with layered parallax so
// nearer layers shift more than the nebula behind them.
import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

type Star = { x: string; y: string; sz: string; o: number; glow: string; dur: string; delay: string };

function buildStars(): Star[] {
  let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const stars: Star[] = [];
  for (let i = 0; i < 60; i++) {
    stars.push({
      x: (rnd() * 100).toFixed(2),
      y: (rnd() * 100).toFixed(2),
      sz: (rnd() * 2 + 1).toFixed(1),
      o: rnd() * 0.6 + 0.3,
      glow: (rnd() * 4 + 1).toFixed(1),
      dur: (rnd() * 4 + 2.5).toFixed(1),
      delay: (rnd() * 6).toFixed(1),
    });
  }
  return stars;
}

const STARS = buildStars();

const blob = (s: CSSProperties): CSSProperties => ({ position: "absolute", borderRadius: "50%", mixBlendMode: "screen", ...s });

export default function WallBackground({ src }: { src: string }) {
  const imgRef = useRef<HTMLDivElement>(null);
  const midRef = useRef<HTMLDivElement>(null);
  const starRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const tick = () => {
      cx += (tx - cx) * 0.07;
      cy += (ty - cy) * 0.07;
      if (imgRef.current) imgRef.current.style.transform = `translate(${cx * -18}px, ${cy * -14}px)`;
      if (midRef.current) midRef.current.style.transform = `translate(${cx * -34}px, ${cy * -28}px)`;
      if (starRef.current) starRef.current.style.transform = `translate(${cx * -52}px, ${cy * -42}px)`;
      raf = Math.abs(tx - cx) > 0.0005 || Math.abs(ty - cy) > 0.0005 ? requestAnimationFrame(tick) : 0;
    };
    const onMove = (e: MouseEvent) => {
      tx = e.clientX / window.innerWidth - 0.5;
      ty = e.clientY / window.innerHeight - 0.5;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => { window.removeEventListener("mousemove", onMove); if (raf) cancelAnimationFrame(raf); };
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* nebula image — slow zoom/pan + farthest parallax */}
      <div ref={imgRef} style={{ position: "absolute", inset: "-9%", willChange: "transform" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${src})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            animation: "lofty-kenburns 60s ease-in-out infinite alternate",
          }}
        />
      </div>

      {/* drifting coloured light */}
      <div ref={midRef} style={{ position: "absolute", inset: "-14%", willChange: "transform", pointerEvents: "none" }}>
        <div style={blob({ width: "52%", height: "48%", left: "4%", top: "8%", background: "radial-gradient(circle, rgba(160,107,255,0.38), rgba(160,107,255,0) 60%)", filter: "blur(46px)", animation: "lofty-drift1 46s ease-in-out infinite" })} />
        <div style={blob({ width: "48%", height: "44%", right: "2%", top: "26%", background: "radial-gradient(circle, rgba(70,140,255,0.34), rgba(70,140,255,0) 62%)", filter: "blur(52px)", animation: "lofty-drift2 58s ease-in-out infinite" })} />
        <div style={blob({ width: "46%", height: "42%", left: "24%", bottom: "-6%", background: "radial-gradient(circle, rgba(255,95,170,0.30), rgba(255,95,170,0) 64%)", filter: "blur(56px)", animation: "lofty-drift3 70s ease-in-out infinite" })} />
      </div>

      {/* twinkling starfield + shooting stars — nearest parallax */}
      <div ref={starRef} style={{ position: "absolute", inset: "-14%", willChange: "transform", pointerEvents: "none" }}>
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
                opacity: s.o,
                animation: `lofty-tw ${s.dur}s ease-in-out ${s.delay}s infinite`,
              }}
            />
          ))}
        </div>
        <div style={{ position: "absolute", left: "10%", top: "16%", width: "130px", height: "2px", borderRadius: "2px", background: "linear-gradient(90deg, rgba(255,255,255,0), #ffffff)", opacity: 0, animation: "lofty-shoot 15s ease-in 4s infinite" }} />
        <div style={{ position: "absolute", left: "46%", top: "9%", width: "96px", height: "2px", borderRadius: "2px", background: "linear-gradient(90deg, rgba(255,255,255,0), #cfe3ff)", opacity: 0, animation: "lofty-shoot 21s ease-in 12s infinite" }} />
      </div>
    </div>
  );
}

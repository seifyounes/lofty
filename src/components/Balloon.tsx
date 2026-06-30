/* eslint-disable @next/next/no-img-element */
// Image-based balloon: renders a brand balloon PNG (chosen by id) with the
// priority number overlaid and an optional name caption. Deflate scales it down
// inside a faded full-size "ghost" of the original.
import type { CSSProperties } from "react";
import { getBalloon } from "@/lib/balloons";
import { deflateScale } from "@/lib/format";

const FREDOKA = "var(--font-fredoka), sans-serif";
const ASPECT = 1251 / 1032; // height / width of the cropped balloon art (no-cloud)

function alpha(hex: string, a: number): string {
  let c = (hex || "#000").replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export type BalloonProps = {
  size: number;
  balloon: string;
  priority?: number | string | null;
  label?: string;
  deflate?: number;
  ghost?: boolean;
  /** Overlay the priority number on the balloon. Default true. */
  showNumber?: boolean;
  /** Caption the idea name beneath the balloon. Default false. */
  showLabel?: boolean;
};

export default function Balloon({
  size,
  balloon,
  priority = null,
  label = "",
  deflate = 0,
  ghost = false,
  showNumber = true,
  showLabel = false,
}: BalloonProps) {
  const b = getBalloon(balloon);
  const W = Math.max(20, Number(size) || 150);
  const defl = Math.max(0, Math.min(1, Number(deflate) || 0));
  const w = Math.max(12, W * deflateScale(defl));
  const h = w * ASPECT;
  const fullH = W * ASPECT;
  const hasPrio = priority != null && priority !== "" && showNumber;
  const numSize = showLabel ? w * 0.3 : w * 0.36;

  const wrap: CSSProperties = {
    position: "relative",
    width: W,
    height: fullH,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div style={wrap}>
      {ghost && (
        <img
          src={b.src}
          alt=""
          style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: W, height: "auto", opacity: 0.16, pointerEvents: "none" }}
        />
      )}

      <div
        style={{
          position: "relative",
          width: w,
          height: h,
          filter: `drop-shadow(0 0 ${Math.max(4, w * 0.09)}px ${alpha(b.swatch, 0.65)})`,
        }}
      >
        <img src={b.src} alt={label ? `${label} balloon` : "idea balloon"} style={{ display: "block", width: w, height: "auto" }} />

        {(hasPrio || (showLabel && label)) && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: h * 0.43,
              width: "100%",
              transform: "translateY(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            {hasPrio && (
              <span
                style={{
                  fontFamily: FREDOKA,
                  fontWeight: 700,
                  fontSize: numSize,
                  color: "#fff",
                  lineHeight: 1,
                  letterSpacing: "-1px",
                  textShadow: "0 2px 10px rgba(18,8,38,0.7), 0 0 22px rgba(18,8,38,0.55), 0 1px 2px rgba(0,0,0,0.55)",
                }}
              >
                {String(priority)}
              </span>
            )}
            {showLabel && label && (
              <span
                style={{
                  marginTop: hasPrio ? w * 0.03 : 0,
                  maxWidth: w * 0.82,
                  fontFamily: FREDOKA,
                  fontWeight: 600,
                  fontSize: Math.max(10, w * 0.092),
                  color: "rgba(255,255,255,0.96)",
                  lineHeight: 1.12,
                  textShadow: "0 1px 6px rgba(0,0,0,0.7)",
                }}
              >
                {label}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

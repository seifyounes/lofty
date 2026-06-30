"use client";

import AppShell from "@/components/AppShell";
import BalloonField from "@/components/BalloonField";
import NewIdeaButton from "@/components/NewIdeaButton";
import { useIdeas } from "@/lib/useIdeas";

const FREDOKA = "var(--font-fredoka), sans-serif";
const NUNITO = "var(--font-nunito), sans-serif";

export default function WallPage() {
  const { ideas, hydrated } = useIdeas();
  const ordered = [...ideas].sort((a, b) => a.priority - b.priority);

  return (
    <AppShell bgImage="/wall-bg.png">
      <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 32,
            zIndex: 3,
            pointerEvents: "none",
            fontFamily: NUNITO,
            fontWeight: 600,
            fontSize: 13,
            color: "rgba(255,255,255,0.65)",
            textShadow: "0 1px 6px rgba(0,0,0,0.5)",
          }}
        >
          Drag a balloon to move it &middot; bump them together &middot; size = how big the idea is &middot; click to focus
        </div>

        {hydrated && ordered.length === 0 ? <EmptyState /> : hydrated ? <BalloonField ideas={ordered} /> : null}
      </div>
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        minHeight: 420,
        textAlign: "center",
      }}
    >
      <div style={{ fontFamily: FREDOKA, fontWeight: 700, fontSize: 24, color: "#fff" }}>
        Your galaxy is empty
      </div>
      <div style={{ fontFamily: NUNITO, fontSize: 14, color: "rgba(255,255,255,0.6)" }}>
        Float your first idea onto the wall.
      </div>
      <div style={{ marginTop: 6 }}>
        <NewIdeaButton large />
      </div>
    </div>
  );
}

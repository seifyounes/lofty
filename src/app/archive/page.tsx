"use client";

import Link from "next/link";
import AppShell from "@/components/AppShell";
import Balloon from "@/components/Balloon";
import { useIdeas } from "@/lib/useIdeas";
import { formatDue, sizeTag, DAY } from "@/lib/format";
import { getBalloon } from "@/lib/balloons";
import type { ArchivedIdea } from "@/lib/types";
import type { CSSProperties } from "react";

const FREDOKA = "var(--font-fredoka), sans-serif";
const NUNITO = "var(--font-nunito), sans-serif";

export default function ArchivePage() {
  const { archived, hydrated, restoreIdea, deleteArchived } = useIdeas();
  const rows = [...archived].sort((a, b) => b.finishedAt - a.finishedAt);

  return (
    <AppShell>
      <div style={{ maxWidth: 1200, width: "100%", margin: "0 auto", padding: "16px 40px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontFamily: FREDOKA, fontWeight: 700, fontSize: 20, color: "#fff" }}>
              Quiet Sky &mdash; finished ideas
            </div>
            <div style={{ fontFamily: NUNITO, fontWeight: 600, fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>
              Every balloon you popped lands here. Restore one to put it back on the wall.
            </div>
          </div>
          {hydrated && (
            <div
              className="lofty-glass"
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                padding: "10px 22px",
                borderRadius: 18,
              }}
            >
              <span style={{ fontFamily: FREDOKA, fontWeight: 700, fontSize: 34, lineHeight: 1, background: "linear-gradient(160deg, #ff67d8, #8d45ff 55%, #4d6dff)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                {rows.length}
              </span>
              <span style={{ fontFamily: NUNITO, fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                {rows.length === 1 ? "idea finished" : "ideas finished"} 🎉
              </span>
            </div>
          )}
        </div>

        <div style={{ marginTop: 18 }}>
          {hydrated && rows.length === 0 && (
            <div style={{ fontFamily: NUNITO, color: "rgba(255,255,255,0.6)", padding: "40px 0", textAlign: "center" }}>
              Nothing finished yet. Pick your{" "}
              <Link href="/deadlines" style={{ color: "#FF8FB4" }}>next deadline</Link>{" "}
              and pop your first balloon!
            </div>
          )}
          {hydrated && rows.map((it) => (
            <Row
              key={it.id}
              idea={it}
              onRestore={() => restoreIdea(it.id)}
              onDelete={() => deleteArchived(it.id)}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function Row({
  idea,
  onRestore,
  onDelete,
}: {
  idea: ArchivedIdea;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const swatch = getBalloon(idea.balloon).swatch;
  const tookDays = Math.max(1, Math.round((idea.finishedAt - idea.createdAt) / DAY));
  return (
    <div
      className="lofty-card3d"
      style={{
        ["--accent" as string]: swatch,
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "9px 20px 9px 24px",
        marginBottom: 12,
      } as CSSProperties}
    >
      <div style={{ width: 74, display: "flex", justifyContent: "center" }}>
        <Balloon balloon={idea.balloon} size={46} showNumber={false} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FREDOKA, fontWeight: 600, fontSize: 18, color: "#fff" }}>
          {idea.name}
        </div>
        <div style={{ fontFamily: NUNITO, fontWeight: 700, fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 5 }}>
          {sizeTag(idea.big)} &middot; took {tookDays} {tookDays === 1 ? "day" : "days"}
        </div>
      </div>
      <div
        style={{
          fontFamily: FREDOKA,
          fontWeight: 700,
          fontSize: 13,
          color: "#fff",
          background: `${swatch}2e`,
          border: `1px solid ${swatch}99`,
          boxShadow: `0 0 12px ${swatch}44, inset 0 1px 0 rgba(255,255,255,0.18)`,
          padding: "4px 12px",
          borderRadius: 999,
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        ✓ Finished {formatDue(idea.finishedAt)}
      </div>
      <button
        onClick={onRestore}
        title="Restore to the wall"
        className="lofty-press"
        style={{
          padding: "6px 14px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.2)",
          background: "rgba(255,255,255,0.07)",
          color: "rgba(255,255,255,0.85)",
          cursor: "pointer",
          fontFamily: NUNITO,
          fontWeight: 700,
          fontSize: 12,
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        ↺ Restore
      </button>
      <button
        onClick={onDelete}
        title="Delete forever"
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.04)",
          color: "rgba(255,255,255,0.5)",
          cursor: "pointer",
          fontSize: 14,
          lineHeight: 1,
        }}
      >
        &times;
      </button>
    </div>
  );
}

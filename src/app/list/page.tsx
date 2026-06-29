"use client";

import Link from "next/link";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import Balloon from "@/components/Balloon";
import { useIdeas } from "@/lib/useIdeas";
import { bigToPx, daysLeft, formatDue, sizeTag } from "@/lib/format";
import type { Idea } from "@/lib/types";

const FREDOKA = "var(--font-fredoka), sans-serif";
const NUNITO = "var(--font-nunito), sans-serif";

type SortMode = "size" | "priority";

export default function ListPage() {
  const { ideas, hydrated, deleteIdea } = useIdeas();
  const [sort, setSort] = useState<SortMode>("size");

  const rows = [...ideas].sort((a, b) =>
    sort === "priority" ? a.priority - b.priority : bigToPx(b.big) - bigToPx(a.big),
  );
  const sizes = rows.map((r) => bigToPx(r.big));
  const maxS = Math.max(1, ...sizes);
  const minS = Math.min(...(sizes.length ? sizes : [0]));

  return (
    <AppShell>
      <div style={{ maxWidth: 1200, width: "100%", margin: "0 auto", padding: "16px 40px 40px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontFamily: FREDOKA, fontWeight: 700, fontSize: 20, color: "#fff" }}>
              All ideas &mdash; {sort === "size" ? "biggest first" : "by priority"}
            </div>
            <div style={{ fontFamily: NUNITO, fontWeight: 600, fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>
              Size shows how big the idea is. Priority to finish &amp; deadline sit on the right.
            </div>
          </div>
          <div style={{ display: "flex", background: "rgba(255,255,255,0.08)", borderRadius: 999, padding: 4 }}>
            <SortBtn active={sort === "size"} onClick={() => setSort("size")}>Biggest</SortBtn>
            <SortBtn active={sort === "priority"} onClick={() => setSort("priority")}>Priority</SortBtn>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          {hydrated && rows.length === 0 && (
            <div style={{ fontFamily: NUNITO, color: "rgba(255,255,255,0.6)", padding: "40px 0", textAlign: "center" }}>
              No ideas yet. <Link href="/new" style={{ color: "#FF8FB4" }}>Add your first one.</Link>
            </div>
          )}
          {hydrated &&
            rows.map((it, i) => {
              const px = bigToPx(it.big);
              const t = (px - minS) / Math.max(1, maxS - minS);
              const disp = Math.round(38 + t * 24);
              const barPct = Math.round(24 + t * 76);
              const left = daysLeft(it.deadline);
              const urgent = left <= 2;
              return <Row key={it.id} idea={it} rank={i + 1} disp={disp} barPct={barPct} left={left} urgent={urgent} onDelete={() => deleteIdea(it.id)} />;
            })}
        </div>
      </div>
    </AppShell>
  );
}

function SortBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 15px",
        borderRadius: 999,
        border: "none",
        cursor: "pointer",
        fontFamily: FREDOKA,
        fontWeight: active ? 600 : 500,
        fontSize: 14,
        color: active ? "#fff" : "rgba(255,255,255,0.6)",
        background: active ? "rgba(255,255,255,0.16)" : "transparent",
      }}
    >
      {children}
    </button>
  );
}

function Row({
  idea,
  rank,
  disp,
  barPct,
  left,
  urgent,
  onDelete,
}: {
  idea: Idea;
  rank: number;
  disp: number;
  barPct: number;
  left: number;
  urgent: boolean;
  onDelete: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "9px 20px",
        borderRadius: 15,
        background: "rgba(18,14,44,0.55)",
        border: "1px solid rgba(255,255,255,0.09)",
        marginBottom: 10,
      }}
    >
      <div style={{ width: 34, textAlign: "center", fontFamily: FREDOKA, fontWeight: 700, fontSize: 22, color: "rgba(255,255,255,0.28)" }}>
        {rank}
      </div>
      <div style={{ width: 74, display: "flex", justifyContent: "center" }}>
        <Balloon balloon={idea.balloon} size={disp} showNumber={false} />
      </div>
      <Link href={`/new?edit=${idea.id}`} style={{ flex: 1, minWidth: 0, textDecoration: "none" }}>
        <div style={{ fontFamily: FREDOKA, fontWeight: 600, fontSize: 18, color: "#fff" }}>{idea.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 7 }}>
          <div style={{ width: 130, height: 6, borderRadius: 6, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${barPct}%`, borderRadius: 6, background: "linear-gradient(90deg,#46E0FF,#A06BFF)" }} />
          </div>
          <div style={{ fontFamily: NUNITO, fontWeight: 700, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{sizeTag(idea.big)}</div>
        </div>
      </Link>
      <div style={{ textAlign: "right" }}>
        <div
          style={{
            fontFamily: FREDOKA,
            fontWeight: 700,
            fontSize: 13,
            color: "#fff",
            background: "rgba(160,107,255,0.22)",
            border: "1px solid rgba(160,107,255,0.5)",
            padding: "4px 12px",
            borderRadius: 999,
            display: "inline-block",
          }}
        >
          Priority&nbsp;#{idea.priority}
        </div>
        <div style={{ fontFamily: NUNITO, fontWeight: 700, fontSize: 12, color: urgent ? "#FF6B86" : "rgba(207,210,255,0.85)", marginTop: 7 }}>
          Due {formatDue(idea.deadline)} &middot; {Math.max(0, left)}d left
        </div>
      </div>
      <button
        onClick={onDelete}
        title="Delete idea"
        style={{
          marginLeft: 4,
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

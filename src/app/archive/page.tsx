"use client";

import Link from "next/link";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import Balloon from "@/components/Balloon";
import { PROMPTS } from "@/components/IdeaBreakdown";
import { useIdeas } from "@/lib/useIdeas";
import { useIsMobile } from "@/lib/useMediaQuery";
import { formatDue, sizeTag, DAY } from "@/lib/format";
import { getBalloon } from "@/lib/balloons";
import type { ArchivedIdea } from "@/lib/types";
import type { CSSProperties, KeyboardEvent } from "react";

const FREDOKA = "var(--font-fredoka), sans-serif";
const NUNITO = "var(--font-nunito), sans-serif";

const eyebrow: CSSProperties = {
  fontFamily: NUNITO,
  fontWeight: 800,
  fontSize: 10.5,
  letterSpacing: 1.5,
  color: "rgba(255,255,255,0.45)",
  textTransform: "uppercase",
};

/** A finished idea keeps its breakdown; this says whether there is anything to show. */
function hasNotes(idea: ArchivedIdea): boolean {
  return (
    PROMPTS.some((p) => (idea.plan?.[p.key] ?? "").trim().length > 0) ||
    (idea.steps?.length ?? 0) > 0
  );
}

export default function ArchivePage() {
  const { archived, hydrated, restoreIdea, deleteArchived } = useIdeas();
  const rows = [...archived].sort((a, b) => b.finishedAt - a.finishedAt);
  const isMobile = useIsMobile();

  return (
    <AppShell>
      <div
        style={{
          maxWidth: 1200,
          width: "100%",
          margin: "0 auto",
          padding: isMobile ? "10px 14px 28px" : "16px 40px 40px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: isMobile ? "flex-start" : "center",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            gap: isMobile ? 12 : 16,
          }}
        >
          <div>
            <div style={{ fontFamily: FREDOKA, fontWeight: 700, fontSize: isMobile ? 18 : 20, color: "#fff" }}>
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
  const isMobile = useIsMobile();
  // Read-only: the breakdown is a record of how the idea got done, not a
  // place to keep working it. Only rows that actually have notes open.
  const notes = hasNotes(idea);
  const [open, setOpen] = useState(false);
  const toggle = () => {
    if (notes) setOpen((o) => !o);
  };

  // The balloon + name are the "identity" of the row; that is what you click.
  const identity: CSSProperties = {
    display: "flex",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    cursor: notes ? "pointer" : "default",
  };
  const identityProps = notes
    ? {
        role: "button" as const,
        tabIndex: 0,
        title: open ? "Hide notes" : "Show notes",
        onClick: toggle,
        onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        },
      }
    : {};
  const notesHint = notes && (
    <span style={{ color: "rgba(255,255,255,0.7)" }}>
      {" "}&middot; Notes {open ? "\u25B4" : "\u25BE"}
    </span>
  );

  if (isMobile) {
    return (
      <div
        className="lofty-card3d"
        style={{
          ["--accent" as string]: swatch,
          padding: "10px 10px 10px 16px",
          marginBottom: 10,
        } as CSSProperties}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div {...identityProps} style={{ ...identity, gap: 10 }}>
            <div style={{ width: 46, flexShrink: 0, display: "flex", justifyContent: "center" }}>
              <Balloon balloon={idea.balloon} size={40} showNumber={false} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: FREDOKA,
                  fontWeight: 600,
                  fontSize: 15,
                  color: "#fff",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {idea.name}
              </div>
              <div style={{ fontFamily: NUNITO, fontWeight: 700, fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 5 }}>
                {sizeTag(idea.big)} &middot; took {tookDays}d{notesHint}
              </div>
              <div style={{ fontFamily: NUNITO, fontWeight: 700, fontSize: 11, color: swatch, marginTop: 4 }}>
                ✓ Finished {formatDue(idea.finishedAt)}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
            <button
              onClick={onRestore}
              title="Restore to the wall"
              className="lofty-press"
              style={{
                padding: "7px 12px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.07)",
                color: "rgba(255,255,255,0.85)",
                cursor: "pointer",
                fontFamily: NUNITO,
                fontWeight: 700,
                fontSize: 11.5,
                whiteSpace: "nowrap",
              }}
            >
              ↺ Restore
            </button>
            <button
              onClick={onDelete}
              title="Delete forever"
              style={{
                padding: "7px 12px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.5)",
                cursor: "pointer",
                fontFamily: NUNITO,
                fontWeight: 700,
                fontSize: 11.5,
              }}
            >
              Delete
            </button>
          </div>
        </div>
        {open && <FinishedNotes idea={idea} swatch={swatch} mobile />}
      </div>
    );
  }

  return (
    <div
      className="lofty-card3d"
      style={{
        ["--accent" as string]: swatch,
        padding: "9px 20px 9px 24px",
        marginBottom: 12,
      } as CSSProperties}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div {...identityProps} style={{ ...identity, gap: 18 }}>
          <div style={{ width: 74, display: "flex", justifyContent: "center" }}>
            <Balloon balloon={idea.balloon} size={46} showNumber={false} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FREDOKA, fontWeight: 600, fontSize: 18, color: "#fff" }}>
              {idea.name}
            </div>
            <div style={{ fontFamily: NUNITO, fontWeight: 700, fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 5 }}>
              {sizeTag(idea.big)} &middot; took {tookDays} {tookDays === 1 ? "day" : "days"}{notesHint}
            </div>
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
      {open && <FinishedNotes idea={idea} swatch={swatch} />}
    </div>
  );
}

/** The breakdown a finished idea was carrying, shown as it was — nothing editable. */
function FinishedNotes({
  idea,
  swatch,
  mobile = false,
}: {
  idea: ArchivedIdea;
  swatch: string;
  mobile?: boolean;
}) {
  const fields = PROMPTS.map((p) => ({ label: p.label, text: (idea.plan?.[p.key] ?? "").trim() }))
    .filter((f) => f.text.length > 0);
  const steps = idea.steps ?? [];
  const done = steps.filter((s) => s.done).length;
  const body: CSSProperties = {
    fontFamily: NUNITO,
    fontWeight: 600,
    fontSize: mobile ? 14 : 13.5,
    lineHeight: 1.55,
    color: "rgba(255,255,255,0.85)",
    overflowWrap: "anywhere",
  };

  return (
    <div
      style={{
        marginTop: 12,
        paddingTop: 12,
        // Indent past the balloon so the notes read as belonging to the name.
        paddingLeft: mobile ? 0 : 92,
        borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "grid",
        gap: 12,
      }}
    >
      {fields.map((f) => (
        <div key={f.label}>
          <div style={eyebrow}>{f.label}</div>
          <div style={{ ...body, whiteSpace: "pre-wrap", marginTop: 3 }}>{f.text}</div>
        </div>
      ))}
      {steps.length > 0 && (
        <div>
          <div style={eyebrow}>Steps &middot; {done} of {steps.length} done</div>
          {steps.map((s) => (
            <div
              key={s.id}
              style={{
                ...body,
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
                marginTop: 5,
                color: s.done ? "rgba(255,255,255,0.5)" : body.color,
                textDecoration: s.done ? "line-through" : "none",
              }}
            >
              <span style={{ flex: "0 0 auto", color: s.done ? swatch : "rgba(255,255,255,0.35)" }}>
                {s.done ? "✓" : "○"}
              </span>
              <span>{s.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

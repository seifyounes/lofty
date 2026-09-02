"use client";

// The "break it down" panel on the Focus screen: guided prompts + free notes
// ("Plan" tab) and a checklist whose checked count drives the balloon's deflate
// ("Steps" tab). Shared by the desktop Stage slot and the mobile card — the
// desktop slot is a fixed ~370x360 box, hence the tabs and internal scroll.
import { useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { useIdeas } from "@/lib/useIdeas";
import { PLAN_FIELD_MAX, STEP_TEXT_MAX } from "@/lib/types";
import type { Idea, IdeaPlan } from "@/lib/types";

const FREDOKA = "var(--font-fredoka), sans-serif";
const NUNITO = "var(--font-nunito), sans-serif";

const eyebrow: CSSProperties = {
  fontFamily: NUNITO,
  fontWeight: 800,
  fontSize: 11,
  letterSpacing: 1.5,
  color: "rgba(255,255,255,0.45)",
  textTransform: "uppercase",
};

/** The guided prompts, in display order. Exported so Quiet Sky can show a
    finished idea's answers under the same labels. */
export const PROMPTS: { key: keyof IdeaPlan; label: string; placeholder: string; rows: number }[] = [
  { key: "outcome", label: "Done looks like", placeholder: "What does done look like?", rows: 2 },
  { key: "first", label: "First physical action", placeholder: "First physical action?", rows: 2 },
  { key: "blocker", label: "What's blocking it", placeholder: "What's blocking it?", rows: 2 },
  { key: "notes", label: "Notes", placeholder: "Anything else — links, thoughts, brain-dump…", rows: 4 },
];

export default function IdeaBreakdown({ idea, mobile = false }: { idea: Idea; mobile?: boolean }) {
  const { updatePlan, addStep, toggleStep, deleteStep } = useIdeas();
  // Ideas already broken down open on their checklist; fresh ones on the prompts.
  const [tab, setTab] = useState<"plan" | "steps">(() =>
    idea.steps?.length ? "steps" : "plan",
  );
  const [draft, setDraft] = useState("");

  const steps = idea.steps ?? [];
  const doneCount = steps.filter((s) => s.done).length;
  // 16px on mobile stops iOS from zooming the page on focus.
  const fieldFont = mobile ? 16 : 13.5;

  const field: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    color: "#fff",
    fontFamily: NUNITO,
    fontWeight: 600,
    fontSize: fieldFont,
    lineHeight: 1.5,
    padding: "9px 11px",
    outline: "none",
    resize: "none",
  };

  function commitDraft() {
    if (!draft.trim()) return;
    addStep(idea.id, draft);
    setDraft("");
  }
  function onDraftKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") commitDraft();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: mobile ? undefined : 1 }}>
      {/* header: eyebrow + tab switch */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={eyebrow}>Break it down</div>
        <div className="lofty-tabs" style={{ padding: 3 }}>
          {(["plan", "steps"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`lofty-tab${tab === t ? " lofty-tab--active" : ""}`}
              style={{ padding: "5px 13px", fontSize: 12.5 }}
            >
              {t === "plan" ? "Plan" : `Steps${steps.length ? ` ${doneCount}/${steps.length}` : ""}`}
            </button>
          ))}
        </div>
      </div>

      <div
        style={
          mobile
            ? { marginTop: 12 }
            : { marginTop: 12, flex: 1, minHeight: 0, overflowY: "auto", paddingRight: 4 }
        }
      >
        {tab === "plan" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {PROMPTS.map((p) => (
              <div key={p.key}>
                <div style={{ ...eyebrow, fontSize: 10.5, marginBottom: 5 }}>{p.label}</div>
                <textarea
                  value={idea.plan?.[p.key] ?? ""}
                  onChange={(e) => updatePlan(idea.id, { [p.key]: e.target.value })}
                  placeholder={p.placeholder}
                  rows={p.key === "notes" && mobile ? 5 : p.rows}
                  maxLength={PLAN_FIELD_MAX}
                  style={field}
                />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ ...eyebrow, fontSize: 10.5 }}>
              {steps.length ? `${doneCount} of ${steps.length} done` : "No steps yet"}
            </div>

            {steps.length === 0 && (
              <div style={{ fontFamily: NUNITO, fontWeight: 600, fontSize: fieldFont, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, marginTop: 8 }}>
                Break it into small physical steps &mdash; each one you check deflates the balloon.
              </div>
            )}

            {steps.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleStep(idea.id, s.id)}
                className="lofty-press"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  boxSizing: "border-box",
                  textAlign: "left",
                  marginTop: 6,
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.05)",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    flex: "0 0 auto",
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    color: "#fff",
                    border: s.done ? "none" : "1px solid rgba(255,255,255,0.3)",
                    background: s.done
                      ? "linear-gradient(160deg,#ff67d8,#8d45ff 55%,#4d6dff)"
                      : "transparent",
                  }}
                >
                  {s.done ? "✓" : ""}
                </span>
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontFamily: NUNITO,
                    fontWeight: 600,
                    fontSize: mobile ? 15 : 13.5,
                    lineHeight: 1.4,
                    color: "#fff",
                    textDecoration: s.done ? "line-through" : "none",
                    opacity: s.done ? 0.55 : 1,
                    overflowWrap: "anywhere",
                  }}
                >
                  {s.text}
                </span>
                {/* Not a <button>: nesting one inside the row button is invalid HTML. */}
                <span
                  role="button"
                  aria-label={`Delete step: ${s.text}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteStep(idea.id, s.id);
                  }}
                  style={{
                    flex: "0 0 auto",
                    fontFamily: NUNITO,
                    fontWeight: 700,
                    fontSize: 14,
                    color: "rgba(255,255,255,0.45)",
                    padding: "0 3px",
                    lineHeight: 1,
                  }}
                >
                  &times;
                </span>
              </button>
            ))}

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onDraftKey}
                placeholder="Add a step…"
                maxLength={STEP_TEXT_MAX}
                style={{ ...field, flex: 1, padding: "8px 11px" }}
              />
              <button
                type="button"
                onClick={commitDraft}
                className="lofty-press"
                style={{
                  flex: "0 0 auto",
                  padding: "0 16px",
                  borderRadius: 10,
                  border: "1px solid rgba(70,224,255,0.55)",
                  background: "linear-gradient(160deg, rgba(70,224,255,0.32), rgba(70,224,255,0.1))",
                  color: "#fff",
                  fontFamily: FREDOKA,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

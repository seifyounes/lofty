"use client";
/* eslint-disable @next/next/no-img-element */

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CSSProperties } from "react";
import AppShell from "@/components/AppShell";
import Balloon from "@/components/Balloon";
import { useIdeas } from "@/lib/useIdeas";
import { bigToPx, bigLabel, formatDue, DAY } from "@/lib/format";
import type { Idea, IdeaInput } from "@/lib/types";
import { BALLOONS, DEFAULT_BALLOON, getBalloon } from "@/lib/balloons";

const FREDOKA = "var(--font-fredoka), sans-serif";
const NUNITO = "var(--font-nunito), sans-serif";

const PRESETS = [
  { lbl: "3 days", v: 3 },
  { lbl: "1 week", v: 7 },
  { lbl: "2 weeks", v: 14 },
  { lbl: "1 month", v: 30 },
];

const labelCaps: CSSProperties = {
  fontFamily: NUNITO,
  fontWeight: 800,
  fontSize: 11,
  letterSpacing: 1.5,
  color: "rgba(255,255,255,0.5)",
};

export default function NewIdeaPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <NewIdea />
      </Suspense>
    </AppShell>
  );
}

function NewIdea() {
  const { ideas, hydrated, addIdea, updateIdea } = useIdeas();
  const params = useSearchParams();
  const router = useRouter();
  const editId = params.get("edit");

  // Wait for the store to hydrate so the form's state initializes from real
  // data — both the priority default and edit prefill depend on the idea list.
  if (!hydrated) return <div style={{ flex: 1 }} />;

  const editing = editId ? ideas.find((i) => i.id === editId) : undefined;
  return (
    <Form
      key={editId ?? "new"}
      ideas={ideas}
      editing={editing}
      addIdea={addIdea}
      updateIdea={updateIdea}
      onDone={(path) => router.push(path)}
    />
  );
}

function Form({
  ideas,
  editing,
  addIdea,
  updateIdea,
  onDone,
}: {
  ideas: Idea[];
  editing: Idea | undefined;
  addIdea: (input: IdeaInput) => unknown;
  updateIdea: (id: string, patch: Partial<Idea>) => void;
  onDone: (path: string) => void;
}) {
  const prioMax = Math.max(1, editing ? ideas.length : ideas.length + 1);

  const [name, setName] = useState(editing ? editing.name : "Launch referral program");
  const [big, setBig] = useState(editing ? editing.big : 64);
  const [prio, setPrio] = useState(editing ? editing.priority : Math.min(3, prioMax));
  const [dl, setDl] = useState(14);
  const [balloon, setBalloon] = useState(editing ? editing.balloon : DEFAULT_BALLOON);
  const [focused, setFocused] = useState(false);

  const previewSize = bigToPx(big);
  const bigPct = big;
  const prioPct = prioMax > 1 ? ((prio - 1) / (prioMax - 1)) * 100 : 0;
  const accent = getBalloon(balloon).swatch;
  const cta = `linear-gradient(135deg,#FF5FA2,${accent})`;

  const dueDate = Date.now() + dl * DAY;
  const dueStr = formatDue(dueDate);
  const dueYear = new Date(dueDate).getFullYear();

  // Priority markers: existing ideas placed by their rank. Labels only when few.
  const markers = useMemo(() => {
    const others = ideas.filter((i) => i.id !== editing?.id).sort((a, b) => a.priority - b.priority);
    const showLabels = ideas.length <= 6;
    return others.map((it, idx) => ({
      label: showLabels ? it.name.split(" ")[0] : "",
      pct: prioMax > 1 ? (Math.min(it.priority, prioMax) - 1) / (prioMax - 1) * 100 : 0,
      key: it.id,
      idx,
    }));
  }, [ideas, editing, prioMax]);

  function submit() {
    if (editing) {
      updateIdea(editing.id, { name, big, priority: prio, balloon, deadline: dueDate });
      onDone("/list");
    } else {
      addIdea({ name, big, priority: prio, balloon, deadlineDays: dl });
      onDone("/wall");
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: 1180, margin: "0 auto", padding: "12px 40px 40px", display: "flex", gap: 40, alignItems: "flex-start", flexWrap: "wrap" }}>
      {/* form card */}
      <div
        style={{
          flex: "1 1 600px",
          maxWidth: 600,
          padding: "26px 32px 28px",
          borderRadius: 22,
          background: "rgba(16,12,40,0.66)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
        }}
      >
        <div style={{ fontFamily: FREDOKA, fontWeight: 700, fontSize: 24, color: "#fff" }}>{editing ? "Edit idea" : "New idea"}</div>

        <div style={{ ...labelCaps, marginTop: 20 }}>IDEA NAME</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            marginTop: 8,
            background: "rgba(255,255,255,0.06)",
            border: `1px solid ${focused ? "#A06BFF" : "rgba(255,255,255,0.14)"}`,
            borderRadius: 12,
            padding: "13px 16px",
            color: "#fff",
            fontFamily: FREDOKA,
            fontWeight: 500,
            fontSize: 17,
            outline: "none",
          }}
        />

        {/* balloon colour picker */}
        <div style={{ ...labelCaps, marginTop: 20 }}>
          BALLOON COLOR &mdash; <span style={{ color: "rgba(255,255,255,0.85)" }}>{getBalloon(balloon).name}</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {BALLOONS.map((b) => {
            const sel = b.id === balloon;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => setBalloon(b.id)}
                title={b.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "4px 12px 4px 5px",
                  borderRadius: 999,
                  cursor: "pointer",
                  background: sel ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${sel ? b.swatch : "rgba(255,255,255,0.12)"}`,
                  boxShadow: sel ? `0 0 14px ${b.swatch}66` : "none",
                }}
              >
                <img src={b.src} alt="" style={{ width: 22, height: "auto", display: "block" }} />
                <span style={{ fontFamily: FREDOKA, fontWeight: 600, fontSize: 12.5, color: sel ? "#fff" : "rgba(255,255,255,0.72)" }}>{b.name}</span>
              </button>
            );
          })}
        </div>

        {/* big slider */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20 }}>
          <div style={labelCaps}>HOW BIG IS THIS IDEA?</div>
          <div style={{ fontFamily: FREDOKA, fontWeight: 600, fontSize: 13, color: "#fff", background: "rgba(160,107,255,0.22)", border: "1px solid rgba(160,107,255,0.5)", padding: "3px 12px", borderRadius: 999 }}>
            {bigLabel(big)}
          </div>
        </div>
        <div style={{ position: "relative", height: 34, marginTop: 10 }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 14, height: 6, borderRadius: 6, background: "rgba(255,255,255,0.14)" }} />
          <div style={{ position: "absolute", left: 0, top: 14, height: 6, borderRadius: 6, width: `${bigPct}%`, background: "linear-gradient(90deg,#46E0FF,#A06BFF,#FF5FA2)" }} />
          <div style={{ position: "absolute", top: 6, left: `${bigPct}%`, transform: "translateX(-50%)", width: 22, height: 22, borderRadius: "50%", background: "#fff", border: "3px solid #A06BFF", boxShadow: "0 0 14px rgba(160,107,255,0.9)" }} />
          <input type="range" min={0} max={100} value={big} onChange={(e) => setBig(+e.target.value)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", margin: 0, opacity: 0, cursor: "pointer" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: NUNITO, fontWeight: 600, fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
          <span>Small</span><span>Big</span><span>Huge</span>
        </div>

        {/* priority slider */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20 }}>
          <div style={labelCaps}>PRIORITY &mdash; WHERE DOES IT RANK?</div>
          <div style={{ fontFamily: FREDOKA, fontWeight: 700, fontSize: 14, color: "#FF8FB4" }}>Priority&nbsp;#{prio}</div>
        </div>
        <div style={{ position: "relative", height: 30, marginTop: 12 }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 13, height: 5, borderRadius: 5, background: "rgba(255,255,255,0.14)" }} />
          <div style={{ position: "absolute", left: 0, top: 13, height: 5, borderRadius: 5, width: `${prioPct}%`, background: "linear-gradient(90deg,#FF5FA2,#FFC24B)" }} />
          {markers.map((m) => (
            <div key={m.key} style={{ position: "absolute", top: 9, left: `${m.pct}%`, transform: "translateX(-50%)", width: 9, height: 9, borderRadius: "50%", background: "rgba(255,255,255,0.32)", border: "1px solid rgba(255,255,255,0.5)" }} />
          ))}
          <div style={{ position: "absolute", top: 4, left: `${prioPct}%`, transform: "translateX(-50%)", width: 20, height: 20, borderRadius: "50%", background: "#fff", border: "3px solid #FF5FA2", boxShadow: "0 0 14px rgba(255,95,162,0.9)", zIndex: 2 }} />
          <input type="range" min={1} max={prioMax} step={1} value={prio} onChange={(e) => setPrio(+e.target.value)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", margin: 0, opacity: 0, cursor: "pointer", zIndex: 3 }} />
        </div>
        <div style={{ position: "relative", height: 26, marginTop: 4 }}>
          {markers.map((m) => (
            <div key={m.key} style={{ position: "absolute", left: `${m.pct}%`, transform: "translateX(-50%)", fontFamily: NUNITO, fontWeight: 600, fontSize: 10.5, color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap" }}>
              {m.label}
            </div>
          ))}
        </div>

        {/* deadline */}
        <div style={{ ...labelCaps, marginTop: 14 }}>DEADLINE</div>
        <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
          {PRESETS.map((p) => {
            const active = p.v === dl;
            return (
              <div
                key={p.v}
                onClick={() => setDl(p.v)}
                style={{
                  position: "relative",
                  flex: 1,
                  textAlign: "center",
                  padding: "10px 0",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.86)",
                  fontFamily: FREDOKA,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {p.lbl}
                {active && (
                  <div style={{ position: "absolute", inset: 0, borderRadius: 12, border: "1.5px solid #46E0FF", background: "rgba(70,224,255,0.16)", boxShadow: "0 0 16px rgba(70,224,255,0.45)" }} />
                )}
              </div>
            );
          })}
        </div>
        <div style={{ fontFamily: NUNITO, fontWeight: 600, fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 10 }}>
          Due {dueStr}, {dueYear} &middot; {dl} days from now
        </div>

        <div
          onClick={submit}
          style={{ marginTop: 22, textAlign: "center", padding: 14, borderRadius: 14, background: cta, color: "#fff", fontFamily: FREDOKA, fontWeight: 600, fontSize: 16, cursor: "pointer", boxShadow: "0 10px 26px rgba(160,107,255,0.45)" }}
        >
          &#10022;&nbsp;&nbsp;{editing ? "Save changes" : "Float it onto the wall"}
        </div>
      </div>

      {/* live preview */}
      <div style={{ flex: "1 1 360px", maxWidth: 438, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 8 }}>
        <div style={{ fontFamily: NUNITO, fontWeight: 800, fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.45)" }}>LIVE PREVIEW</div>
        <div style={{ height: 372, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 6 }}>
          <Balloon balloon={balloon} priority={prio} size={previewSize} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
          {[bigLabel(big), `Priority #${prio}`, `Due ${dueStr}`].map((chip) => (
            <div key={chip} style={{ fontFamily: FREDOKA, fontWeight: 600, fontSize: 12, color: "#fff", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", padding: "6px 13px", borderRadius: 999 }}>
              {chip}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import Balloon from "@/components/Balloon";
import NewIdeaButton from "@/components/NewIdeaButton";
import Stage from "@/components/Stage";
import { useIdeas } from "@/lib/useIdeas";
import { daysLeft, formatDue, DAY } from "@/lib/format";
import type { Idea } from "@/lib/types";

const FREDOKA = "var(--font-fredoka), sans-serif";
const NUNITO = "var(--font-nunito), sans-serif";

const STAGE_W = 1200;
const STAGE_H = 600;
const NAV = 72;

// Timeline track spans the design box; ticks are computed per-idea from the
// real number of days left so the roadmap reflects the actual deadline.
const TL0 = 140;
const TL1 = 1060;

export default function DeadlinesPage() {
  return (
    <AppShell>
      <Suspense fallback={null}>
        <Focus />
      </Suspense>
    </AppShell>
  );
}

function Focus() {
  const { ideas, hydrated, bumpProgress, markDone } = useIdeas();
  const params = useSearchParams();
  const router = useRouter();
  const [popping, setPopping] = useState(false);

  const focusId = params.get("focus");
  const active = ideas.filter((i) => !i.done).sort((a, b) => a.priority - b.priority);
  const idea: Idea | undefined = (focusId && active.find((i) => i.id === focusId)) || active[0];

  if (!hydrated) return <div style={{ flex: 1 }} />;

  if (!idea) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 420 }}>
        <div style={{ fontFamily: FREDOKA, fontWeight: 700, fontSize: 24 }}>Nothing to focus on</div>
        <div style={{ fontFamily: NUNITO, fontSize: 14, color: "rgba(255,255,255,0.6)" }}>Every balloon has popped. Add a new idea to keep going.</div>
        <div style={{ marginTop: 6 }}>
          <NewIdeaButton large />
        </div>
      </div>
    );
  }

  const left = Math.max(0, daysLeft(idea.deadline));

  // Real countdown ruler: Today (left) → the actual deadline (right). Ticks are
  // spaced one-per-day for short horizons, thinning out for longer ones, and
  // labelled with real dates so the roadmap matches "{left} days left".
  const span = TL1 - TL0;
  const totalDays = Math.max(1, left);
  const tickStep = totalDays <= 12 ? 1 : Math.ceil(totalDays / 9);
  const dayMarks: number[] = [];
  for (let d = 0; d <= totalDays; d += tickStep) dayMarks.push(d);
  if (dayMarks[dayMarks.length - 1] !== totalDays) dayMarks.push(totalDays);
  const xOfDay = (d: number) => TL0 + span * (d / totalDays);
  const now = Date.now();

  function progress() {
    if (!idea) return;
    bumpProgress(idea.id, 0.15);
  }
  function done() {
    if (!idea || popping) return;
    setPopping(true);
    const id = idea.id;
    setTimeout(() => {
      markDone(id);
      setPopping(false);
      router.replace("/deadlines");
    }, 440);
  }

  return (
    <div style={{ position: "relative", flex: 1, padding: "8px 24px 24px" }}>
      <Stage width={STAGE_W} height={STAGE_H}>
        {/* left text + controls */}
        <div style={{ position: "absolute", left: 64, top: 150 - NAV, width: 360 }}>
          <div style={{ fontFamily: NUNITO, fontWeight: 800, fontSize: 12, letterSpacing: 2, color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>
            Priority #{idea.priority} &middot; {idea.name}
          </div>
          <div style={{ fontFamily: FREDOKA, fontWeight: 700, fontSize: 58, color: "#fff", lineHeight: 1, marginTop: 10 }}>
            {left}
            <span style={{ fontSize: 24, fontWeight: 600, marginLeft: 8 }}>days left</span>
          </div>
          <div style={{ fontFamily: NUNITO, fontWeight: 600, fontSize: 14, color: "rgba(255,255,255,0.62)", marginTop: 16, lineHeight: 1.55 }}>
            Started big. The balloon deflates a little every day you make progress &mdash; and pops the moment it&rsquo;s done.
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <button
              onClick={progress}
              style={{
                padding: "11px 18px",
                borderRadius: 12,
                border: "1px solid rgba(70,224,255,0.5)",
                background: "rgba(70,224,255,0.16)",
                color: "#fff",
                fontFamily: FREDOKA,
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                boxShadow: "0 0 16px rgba(70,224,255,0.25)",
              }}
            >
              Made progress
            </button>
            <button
              onClick={done}
              style={{
                padding: "11px 18px",
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(135deg,#FF5FA2,#A06BFF)",
                color: "#fff",
                fontFamily: FREDOKA,
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                boxShadow: "0 8px 22px rgba(160,107,255,0.45)",
              }}
            >
              Mark done
            </button>
          </div>
          <div style={{ fontFamily: NUNITO, fontWeight: 600, fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 10 }}>
            Deflated {Math.round(idea.progress * 100)}%
          </div>
        </div>

        {/* center balloon */}
        <div className={popping ? "lofty-pop" : undefined} style={{ position: "absolute", left: 470, top: 150 - NAV, zIndex: 5 }}>
          <Balloon balloon={idea.balloon} priority={idea.priority} size={280} deflate={idea.progress} ghost />
        </div>

        {/* countdown timeline: Today (left) → actual deadline (right) */}
        <div style={{ position: "absolute", left: 60, top: 553 - NAV, fontFamily: NUNITO, fontSize: 11, fontWeight: 800, letterSpacing: 1, color: "rgba(255,255,255,0.4)", zIndex: 5 }}>
          DATE
        </div>
        <div style={{ position: "absolute", left: TL0, top: 560 - NAV, width: span, height: 3, borderRadius: 2, background: "linear-gradient(90deg, rgba(70,224,255,0.55), rgba(255,59,87,0.6))", zIndex: 4 }} />

        {dayMarks.map((d) => {
          const isToday = d === 0;
          const isDeadline = d === totalDays;
          return (
            <div key={d} style={{ position: "absolute", left: xOfDay(d), top: 551 - NAV, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", zIndex: 5 }}>
              <div style={{ width: 2, height: isToday || isDeadline ? 16 : 11, background: isToday || isDeadline ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.28)" }} />
              <div style={{ marginTop: 6, fontFamily: NUNITO, fontSize: 11, fontWeight: isToday || isDeadline ? 700 : 500, color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap" }}>
                {formatDue(now + d * DAY)}
              </div>
            </div>
          );
        })}

        {/* Today marker (left end) */}
        <div style={{ position: "absolute", left: TL0, top: 521 - NAV, transform: "translateX(-50%)", fontFamily: FREDOKA, fontWeight: 700, fontSize: 13, color: "#ff8095", zIndex: 6, whiteSpace: "nowrap" }}>Today</div>
        <div style={{ position: "absolute", left: TL0, top: 560 - NAV, width: 14, height: 14, borderRadius: "50%", background: "#FF3B57", boxShadow: "0 0 12px rgba(255,59,87,0.9)", transform: "translate(-50%, -50%)", zIndex: 6 }} />

        {/* Deadline marker (right end) */}
        <div style={{ position: "absolute", left: TL1, top: 500 - NAV, width: 3, height: 78, background: "#FF3B57", transform: "translateX(-50%)", boxShadow: "0 0 14px rgba(255,59,87,0.7)", zIndex: 6 }} />
        <div style={{ position: "absolute", left: TL1, top: 500 - NAV, transform: "translate(-50%, -120%)", fontFamily: FREDOKA, fontWeight: 700, fontSize: 12, color: "#fff", background: "#FF3B57", padding: "5px 10px", borderRadius: 7, zIndex: 7, whiteSpace: "nowrap" }}>
          Deadline · {formatDue(idea.deadline)} · {left}d
        </div>
      </Stage>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { CSSProperties } from "react";
import AppShell from "@/components/AppShell";
import Balloon from "@/components/Balloon";
import IdeaBreakdown from "@/components/IdeaBreakdown";
import NewIdeaButton from "@/components/NewIdeaButton";
import Stage from "@/components/Stage";
import { useIdeas } from "@/lib/useIdeas";
import { useIsMobile } from "@/lib/useMediaQuery";
import { daysLeft, formatDue, DAY } from "@/lib/format";
import { getBalloon } from "@/lib/balloons";
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
        <Deadlines />
      </Suspense>
    </AppShell>
  );
}

// `/deadlines` shows the whole list (soonest first); `?focus=<id>` drills into
// one idea's countdown.
function Deadlines() {
  const { ideas, hydrated } = useIdeas();
  const params = useSearchParams();
  const focusId = params.get("focus");

  if (!hydrated) return <div style={{ flex: 1 }} />;

  const active = ideas.filter((i) => !i.done);
  if (active.length === 0) return <EmptyState />;

  const focusIdea = focusId ? active.find((i) => i.id === focusId) : undefined;
  if (focusIdea) return <FocusView idea={focusIdea} />;

  const byDeadline = [...active].sort((a, b) => a.deadline - b.deadline);
  return <DeadlineList ideas={byDeadline} />;
}

function EmptyState() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 420 }}>
      <div style={{ fontFamily: FREDOKA, fontWeight: 700, fontSize: 24 }}>No deadlines yet</div>
      <div style={{ fontFamily: NUNITO, fontSize: 14, color: "rgba(255,255,255,0.6)" }}>Add an idea and it&rsquo;ll show up here, counting down.</div>
      <div style={{ marginTop: 6 }}>
        <NewIdeaButton large />
      </div>
    </div>
  );
}

// Days-left → label + colour, most urgent (overdue) reddest.
function urgency(left: number): { label: string; color: string } {
  if (left < 0) return { label: `Overdue ${Math.abs(left)}d`, color: "#FF5B6E" };
  if (left === 0) return { label: "Due today", color: "#FF8A5B" };
  if (left <= 2) return { label: `${left} day${left === 1 ? "" : "s"} left`, color: "#FF6B86" };
  if (left <= 7) return { label: `${left} days left`, color: "#FFC24B" };
  return { label: `${left} days left`, color: "rgba(207,210,255,0.9)" };
}

function DeadlineList({ ideas }: { ideas: Idea[] }) {
  const isMobile = useIsMobile();
  return (
    <div
      style={{
        maxWidth: 900,
        width: "100%",
        margin: "0 auto",
        padding: isMobile ? "10px 14px 28px" : "16px 40px 40px",
      }}
    >
      <div style={{ fontFamily: FREDOKA, fontWeight: 700, fontSize: isMobile ? 18 : 20, color: "#fff" }}>
        Deadlines &mdash; soonest first
      </div>
      <div style={{ fontFamily: NUNITO, fontWeight: 600, fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>
        Every idea by how soon it&rsquo;s due. Tap one to focus and count it down.
      </div>

      <div style={{ marginTop: isMobile ? 14 : 18, display: "flex", flexDirection: "column", gap: isMobile ? 10 : 12 }}>
        {ideas.map((idea) => {
          const left = daysLeft(idea.deadline);
          const u = urgency(left);
          const swatch = getBalloon(idea.balloon).swatch;
          return (
            <Link
              key={idea.id}
              href={`/deadlines?focus=${idea.id}`}
              className="lofty-card3d"
              style={{
                ["--accent" as string]: swatch,
                display: "flex",
                alignItems: "center",
                gap: isMobile ? 10 : 18,
                padding: isMobile ? "10px 12px 10px 16px" : "12px 20px 12px 24px",
                textDecoration: "none",
              } as CSSProperties}
            >
              <div style={{ width: isMobile ? 42 : 60, flexShrink: 0, display: "flex", justifyContent: "center" }}>
                <Balloon balloon={idea.balloon} size={isMobile ? 38 : 46} priority={idea.priority} showNumber />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: FREDOKA,
                    fontWeight: 600,
                    fontSize: isMobile ? 15 : 18,
                    color: "#fff",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {idea.name}
                </div>
                <div style={{ fontFamily: NUNITO, fontWeight: 600, fontSize: isMobile ? 11.5 : 12.5, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>
                  {isMobile ? `#${idea.priority} · ` : `Priority #${idea.priority} · `}
                  {formatDue(idea.deadline)}
                </div>
              </div>
              <div style={{ textAlign: "right", whiteSpace: "nowrap", flexShrink: 0 }}>
                <div style={{ fontFamily: FREDOKA, fontWeight: 700, fontSize: isMobile ? 13 : 15, color: u.color }}>{u.label}</div>
                <div style={{ fontFamily: NUNITO, fontWeight: 700, fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>Focus &rarr;</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** Shared "made progress" / "mark done" behaviour for both focus layouts. */
function useFocusActions(idea: Idea) {
  const { bumpProgress, markDone } = useIdeas();
  const router = useRouter();
  const [popping, setPopping] = useState(false);

  function progress() {
    bumpProgress(idea.id, 0.15);
  }
  function done() {
    if (popping) return;
    setPopping(true);
    const id = idea.id;
    setTimeout(() => {
      markDone(id);
      setPopping(false);
      router.replace("/deadlines");
    }, 440);
  }
  return { popping, progress, done };
}

function FocusView({ idea }: { idea: Idea }) {
  const isMobile = useIsMobile();
  return isMobile ? <MobileFocus idea={idea} /> : <DesktopFocus idea={idea} />;
}

// Phone focus: a plain vertical column — no fixed design coords, since scaling
// the 1200px desktop stage down to a phone makes it unreadable.
function MobileFocus({ idea }: { idea: Idea }) {
  const { popping, progress, done } = useFocusActions(idea);
  const left = Math.max(0, daysLeft(idea.deadline));
  const u = urgency(daysLeft(idea.deadline));
  const swatch = getBalloon(idea.balloon).swatch;
  const stepsTotal = idea.steps?.length ?? 0;
  const stepsDone = idea.steps?.filter((s) => s.done).length ?? 0;

  return (
    <div style={{ padding: "8px 14px 32px", display: "flex", flexDirection: "column", gap: 14 }}>
      <Link
        href="/deadlines"
        style={{
          alignSelf: "flex-start",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: FREDOKA,
          fontWeight: 600,
          fontSize: 13,
          color: "rgba(255,255,255,0.8)",
          textDecoration: "none",
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 999,
          padding: "7px 14px",
        }}
      >
        &larr;&nbsp;All deadlines
      </Link>

      <div className={popping ? "lofty-pop" : undefined} style={{ display: "flex", justifyContent: "center" }}>
        <Balloon balloon={idea.balloon} priority={idea.priority} size={170} deflate={idea.progress} ghost />
      </div>

      <div className="lofty-glass" style={{ padding: "18px 18px 20px" }}>
        <div style={{ fontFamily: NUNITO, fontWeight: 800, fontSize: 11, letterSpacing: 1.6, color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>
          Priority #{idea.priority}
        </div>
        <div style={{ fontFamily: FREDOKA, fontWeight: 600, fontSize: 19, color: "#fff", marginTop: 4 }}>{idea.name}</div>

        <div style={{ fontFamily: FREDOKA, fontWeight: 700, fontSize: 46, color: "#fff", lineHeight: 1, marginTop: 12 }}>
          {left}
          <span style={{ fontSize: 19, fontWeight: 600, marginLeft: 8 }}>days left</span>
        </div>

        {/* Countdown track: today → the real deadline. */}
        <div style={{ marginTop: 18 }}>
          <div style={{ height: 5, borderRadius: 5, background: "linear-gradient(90deg, rgba(70,224,255,0.55), rgba(255,59,87,0.75))" }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7 }}>
            <div style={{ fontFamily: NUNITO, fontWeight: 700, fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
              Today · {formatDue(Date.now())}
            </div>
            <div style={{ fontFamily: NUNITO, fontWeight: 700, fontSize: 11, color: u.color }}>
              Deadline · {formatDue(idea.deadline)}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          {stepsTotal === 0 && (
            <button
              onClick={progress}
              className="lofty-press"
              style={{
                flex: 1,
                padding: "14px 10px",
                borderRadius: 12,
                border: "1px solid rgba(70,224,255,0.6)",
                background: "linear-gradient(160deg, rgba(70,224,255,0.36), rgba(70,224,255,0.12))",
                color: "#fff",
                fontFamily: FREDOKA,
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.32), 0 6px 16px rgba(70,224,255,0.35)",
              }}
            >
              Made progress
            </button>
          )}
          <button
            onClick={done}
            className="lofty-press"
            style={{
              flex: 1,
              padding: "14px 10px",
              borderRadius: 12,
              border: "none",
              background: `linear-gradient(135deg,#FF5FA2,${swatch})`,
              color: "#fff",
              fontFamily: FREDOKA,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              boxShadow: "inset 0 1.5px 1px rgba(255,255,255,0.42), 0 8px 22px rgba(160,107,255,0.5)",
            }}
          >
            Mark done
          </button>
        </div>
        <div style={{ fontFamily: NUNITO, fontWeight: 600, fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 10 }}>
          {stepsTotal > 0 && `${stepsDone} of ${stepsTotal} steps · `}
          Deflated {Math.round(idea.progress * 100)}%
        </div>
      </div>

      <div className="lofty-glass" style={{ padding: "16px 16px 18px" }}>
        <IdeaBreakdown idea={idea} mobile />
      </div>
    </div>
  );
}

function DesktopFocus({ idea }: { idea: Idea }) {
  const { popping, progress, done } = useFocusActions(idea);

  const left = Math.max(0, daysLeft(idea.deadline));
  const stepsTotal = idea.steps?.length ?? 0;
  const stepsDone = idea.steps?.filter((s) => s.done).length ?? 0;

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

  return (
    <div style={{ position: "relative", flex: 1, padding: "8px 24px 24px" }}>
      <Link
        href="/deadlines"
        style={{
          position: "absolute",
          left: 24,
          top: 6,
          zIndex: 10,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontFamily: FREDOKA,
          fontWeight: 600,
          fontSize: 13,
          color: "rgba(255,255,255,0.8)",
          textDecoration: "none",
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 999,
          padding: "6px 14px",
        }}
      >
        &larr;&nbsp;All deadlines
      </Link>

      <Stage width={STAGE_W} height={STAGE_H}>
        {/* left text + controls */}
        <div className="lofty-glass" style={{ position: "absolute", left: 64, top: 150 - NAV, width: 360, padding: "22px 24px 20px" }}>
          <div style={{ fontFamily: NUNITO, fontWeight: 800, fontSize: 12, letterSpacing: 2, color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>
            Priority #{idea.priority} &middot; {idea.name}
          </div>
          <div style={{ fontFamily: FREDOKA, fontWeight: 700, fontSize: 58, color: "#fff", lineHeight: 1, marginTop: 10 }}>
            {left}
            <span style={{ fontSize: 24, fontWeight: 600, marginLeft: 8 }}>days left</span>
          </div>
          <div style={{ fontFamily: NUNITO, fontWeight: 600, fontSize: 14, color: "rgba(255,255,255,0.62)", marginTop: 16, lineHeight: 1.55 }}>
            {stepsTotal > 0
              ? "Each step you check lets a little air out — it pops the moment it's done."
              : "Started big. The balloon deflates a little every day you make progress — and pops the moment it's done."}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            {stepsTotal === 0 && (
              <button
                onClick={progress}
                className="lofty-press"
                style={{
                  padding: "11px 18px",
                  borderRadius: 12,
                  border: "1px solid rgba(70,224,255,0.6)",
                  background: "linear-gradient(160deg, rgba(70,224,255,0.36), rgba(70,224,255,0.12))",
                  color: "#fff",
                  fontFamily: FREDOKA,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.32), 0 6px 16px rgba(70,224,255,0.35)",
                }}
              >
                Made progress
              </button>
            )}
            <button
              onClick={done}
              className="lofty-press"
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
                boxShadow: "inset 0 1.5px 1px rgba(255,255,255,0.42), inset 0 -3px 6px rgba(60,0,90,0.4), 0 8px 22px rgba(160,107,255,0.5)",
              }}
            >
              Mark done
            </button>
          </div>
          <div style={{ fontFamily: NUNITO, fontWeight: 600, fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 10 }}>
            {stepsTotal > 0 && `${stepsDone} of ${stepsTotal} steps · `}
            Deflated {Math.round(idea.progress * 100)}%
          </div>
        </div>

        {/* center balloon */}
        <div className={popping ? "lofty-pop" : undefined} style={{ position: "absolute", left: 470, top: 150 - NAV, zIndex: 5 }}>
          <Balloon balloon={idea.balloon} priority={idea.priority} size={280} deflate={idea.progress} ghost />
        </div>

        {/* break-it-down panel — the otherwise-unused right region */}
        <div
          className="lofty-glass"
          style={{
            position: "absolute",
            left: 770,
            top: 100 - NAV,
            width: 370,
            height: 360,
            padding: "16px 18px 18px",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            zIndex: 5,
          }}
        >
          <IdeaBreakdown idea={idea} />
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

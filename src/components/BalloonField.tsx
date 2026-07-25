"use client";

// The living wall (matter-js). Balloons hover in place in an organized layout
// (zero gravity + a small visual bob, so they don't wander off). You can grab one
// and drag it anywhere — it STAYS where you drop it (no spring-back) — and you can
// knock balloons into each other (they collide). A click without a drag opens that
// idea's focus screen. The priority number and idea name are drawn inside the
// balloon (the no-cloud art leaves the centre clear for them).
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bodies, Body, Composite, Engine, Events, Mouse, MouseConstraint } from "matter-js";
import Balloon from "./Balloon";
import { bigToPx, deflateScale } from "@/lib/format";
import type { Idea } from "@/lib/types";

const DESIGN_W = 1200;
const DESIGN_H = 680;
const ASPECT = 1251 / 1032;
const ANCHOR = 0.44; // vertical position of the balloon's visual centre within its frame
const RADIUS_FACTOR = 0.43; // physics radius relative to display size

// At or below this container width the landscape design box can't fit — switch
// to the portrait phone layout instead of shrinking the desktop one into a
// corner. Matches MOBILE_QUERY / the `max-width: 720px` CSS breakpoint.
const NARROW = 720;

// Curated cluster (top-left of each balloon, in the 1200×680 wall design box).
const CURATED: [number, number][] = [
  [420, 143], [225, 58], [625, 68], [650, 273], [165, 283], [470, 398],
  [820, 213], [870, 383], [800, 68], [330, 398], [990, 163],
  [150, 488], [995, 488], [575, 513], [780, 513], [375, 528],
];
function curated(i: number): [number, number] {
  if (i < CURATED.length) return CURATED[i];
  const k = i - CURATED.length;
  return [120 + (k % 6) * 185, 540 + Math.floor(k / 6) * 140];
}

// Portrait phone layout: two columns packed from the balloons' real sizes, in a
// box that grows with the idea count so nothing overlaps or falls off screen.
const M_PAD = 14;
const M_GAP_X = 10;
const M_GAP_Y = 14;

/**
 * The design box + balloon placement for the current container size.
 * `sizes` are the balloons' design-space widths (already deflated).
 */
function designFor(containerW: number, sizes: number[]) {
  if (containerW > NARROW) {
    return { w: DESIGN_W, h: DESIGN_H, minScale: 0.45, pos: curated };
  }

  const colW = Math.max(70, ...sizes);
  const w = M_PAD * 2 + colW * 2 + M_GAP_X;

  // Row heights come from the tallest balloon in each pair.
  const rowCount = Math.max(1, Math.ceil(sizes.length / 2));
  const rowH: number[] = [];
  const rowTop: number[] = [];
  let y = M_PAD;
  for (let r = 0; r < rowCount; r++) {
    const a = sizes[r * 2] ?? 0;
    const b = sizes[r * 2 + 1] ?? 0;
    rowH[r] = Math.max(a, b) * ASPECT;
    rowTop[r] = y;
    y += rowH[r] + M_GAP_Y;
  }

  return {
    w,
    h: y - M_GAP_Y + M_PAD,
    minScale: 0.2,
    // Each balloon is centred in its column and in its row, so mixed sizes stay tidy.
    pos: (i: number): [number, number] => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const size = sizes[i] ?? 70;
      const cx = M_PAD + colW / 2 + col * (colW + M_GAP_X);
      return [cx - size / 2, rowTop[row] + (rowH[row] - size * ASPECT) / 2];
    },
  };
}

/** Design-space (pre-scale) display widths, shrunk by each idea's progress. */
function sizesOf(ideas: Idea[]): number[] {
  return ideas.map((i) => bigToPx(i.big) * deflateScale(i.progress));
}

function fitScale(w: number, h: number, d: { w: number; h: number; minScale: number }) {
  return Math.max(d.minScale, Math.min(1.05, Math.min(w / d.w, h / d.h)));
}

export default function BalloonField({ ideas }: { ideas: Idea[] }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const domRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [grabbing, setGrabbing] = useState(false);
  const down = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    // Backstop for phone rotation, where the observer can be throttled. Measure
    // straight away, then again shortly after — iOS reports its final viewport
    // size a moment after the rotation animation finishes.
    let t = 0;
    const settle = () => {
      update();
      clearTimeout(t);
      t = window.setTimeout(update, 150);
    };
    window.addEventListener("resize", settle);
    window.addEventListener("orientationchange", settle);
    return () => {
      ro.disconnect();
      clearTimeout(t);
      window.removeEventListener("resize", settle);
      window.removeEventListener("orientationchange", settle);
    };
  }, []);

  const idsKey = ideas.map((i) => i.id).join(",");

  useEffect(() => {
    const el = containerRef.current;
    const { w, h } = size;
    if (!el || w === 0 || h === 0 || ideas.length === 0) return;

    const d = designFor(w, sizesOf(ideas));
    const scale = fitScale(w, h, d);
    const offX = (w - d.w * scale) / 2;
    const offY = (h - d.h * scale) / 2;

    const engine = Engine.create();
    engine.gravity.x = 0;
    engine.gravity.y = 0;

    const t = 400;
    const walls = [
      Bodies.rectangle(w / 2, -t / 2, w + 2 * t, t, { isStatic: true, restitution: 0.6 }),
      Bodies.rectangle(w / 2, h + t / 2, w + 2 * t, t, { isStatic: true, restitution: 0.6 }),
      Bodies.rectangle(-t / 2, h / 2, t, h + 2 * t, { isStatic: true, restitution: 0.6 }),
      Bodies.rectangle(w + t / 2, h / 2, t, h + 2 * t, { isStatic: true, restitution: 0.6 }),
    ];
    Composite.add(engine.world, walls);

    const bodies = ideas.map((idea, i) => {
      // Balloons shrink as their idea makes progress (same deflate as Focus), so
      // the physics body, the rendered art and the hit-test all use this size.
      const dsize = bigToPx(idea.big) * deflateScale(idea.progress) * scale;
      const [tlx, tly] = d.pos(i);
      const cx = (tlx + bigToPx(idea.big) / 2) * scale + offX;
      const cy = (tly + bigToPx(idea.big) * ASPECT * ANCHOR) * scale + offY;
      const r = Math.max(14, dsize * RADIUS_FACTOR);
      const b = Bodies.circle(cx, cy, r, {
        label: idea.id,
        restitution: 0.5,
        frictionAir: 0.08, // settles quickly -> stays where you drop it
        friction: 0,
        inertia: Infinity, // no spin -> upright
      });
      (b as Body & { dsize: number; phase: number }).dsize = dsize;
      (b as Body & { dsize: number; phase: number }).phase = i * 1.7;
      return b;
    });
    Composite.add(engine.world, bodies);

    const mouse = Mouse.create(el);
    const mc = MouseConstraint.create(engine, { mouse, constraint: { stiffness: 0.2, damping: 0.1, render: { visible: false } } });
    Composite.add(engine.world, mc);
    const m = mouse as unknown as Record<string, EventListener>;
    el.removeEventListener("wheel", m.mousewheel);
    el.removeEventListener("mousewheel", m.mousewheel);
    el.removeEventListener("DOMMouseScroll", m.mousewheel);
    Events.on(mc, "startdrag", () => setGrabbing(true));
    Events.on(mc, "enddrag", () => setGrabbing(false));

    const bobX = 4 * scale, bobY = 9 * scale;
    const sync = (tt: number) => {
      for (const b of bodies) {
        const node = domRefs.current.get(b.label);
        if (!node) continue;
        const bb = b as Body & { dsize: number; phase: number };
        const ds = bb.dsize;
        // visual-only bob so balloons "fly in place" without drifting
        const ox = Math.sin(tt * 0.7 + bb.phase) * bobX;
        const oy = Math.sin(tt * 0.95 + bb.phase * 1.3) * bobY;
        const tilt = Math.max(-12, Math.min(12, b.velocity.x * 1.4));
        node.style.transform = `translate(${b.position.x + ox - ds / 2}px, ${b.position.y + oy - ds * ASPECT * ANCHOR}px) rotate(${tilt}deg)`;
      }
    };
    sync(performance.now() / 1000); // place balloons immediately, don't wait for the first frame

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(32, now - last);
      last = now;
      Engine.update(engine, dt);
      sync(now / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      Events.off(mc, "startdrag");
      Events.off(mc, "enddrag");
      el.removeEventListener("mousedown", m.mousedown);
      el.removeEventListener("mousemove", m.mousemove);
      el.removeEventListener("mouseup", m.mouseup);
      el.removeEventListener("touchstart", m.mousedown);
      el.removeEventListener("touchmove", m.mousemove);
      el.removeEventListener("touchend", m.mouseup);
      Composite.clear(engine.world, false);
      Engine.clear(engine);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w, size.h, idsKey]);

  function onPointerDown(e: React.PointerEvent) {
    down.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  }
  function onPointerUp(e: React.PointerEvent) {
    const d = down.current;
    down.current = null;
    if (!d) return;
    // Fingers wobble more than a mouse, so allow a little more slop on touch.
    const slop = e.pointerType === "touch" ? 12 : 6;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > slop || Date.now() - d.t > 500) return; // was a drag
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scale = fitScale(rect.width, rect.height, designFor(rect.width, sizesOf(ideas)));
    const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    let best: { id: string; d: number } | null = null;
    for (const idea of ideas) {
      const node = domRefs.current.get(idea.id);
      if (!node) continue;
      const ds = bigToPx(idea.big) * deflateScale(idea.progress) * scale;
      const mm = /translate\(([-0-9.]+)px,\s*([-0-9.]+)px\)/.exec(node.style.transform);
      if (!mm) continue;
      const cx = parseFloat(mm[1]) + ds / 2;
      const cy = parseFloat(mm[2]) + ds * ASPECT * ANCHOR;
      const dist = Math.hypot(pt.x - cx, pt.y - cy);
      if (dist <= ds * RADIUS_FACTOR + slop && (!best || dist < best.d)) best = { id: idea.id, d: dist };
    }
    if (best) router.push(`/deadlines?focus=${best.id}`);
  }

  const w = size.w || DESIGN_W;
  const scale = fitScale(w, size.h || DESIGN_H, designFor(w, sizesOf(ideas)));

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      style={{ position: "absolute", inset: 0, cursor: grabbing ? "grabbing" : "grab", touchAction: "none", userSelect: "none" }}
    >
      {ideas.map((idea) => {
        const ds = bigToPx(idea.big) * deflateScale(idea.progress) * scale;
        return (
          <div
            key={idea.id}
            ref={(node) => {
              if (node) domRefs.current.set(idea.id, node);
              else domRefs.current.delete(idea.id);
            }}
            title={`${idea.name} — priority #${idea.priority}`}
            style={{ position: "absolute", top: 0, left: 0, width: ds, willChange: "transform", pointerEvents: "none" }}
          >
            <Balloon balloon={idea.balloon} size={ds} priority={idea.priority} label={idea.name} showNumber showLabel />
          </div>
        );
      })}
    </div>
  );
}

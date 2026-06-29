# CLAUDE.md — Lofty (Galaxy of Ideas)

Project-specific rules. Inherits the global standards in `../CLAUDE.md`.

## What this is
Personal idea tracker. Deflating-balloon metaphor: **size = how big the idea
is**, **number = priority to finish**. Goal: capture every idea in one place and
work them in priority order, one focus at a time — not all at once.

Built from the Claude Design handoff `Ideas as deflating balloons-handoff1.zip`
(kept at repo root). The original design medium was HTML/CSS/JS prototypes; this
is the real Next.js implementation.

## Stack
Next.js (App Router) + TypeScript + Tailwind. Client-only, `localStorage`
persistence — no backend, no accounts. Desktop-first.

## Conventions
- 2-space indent, double quotes, ~100-char lines (global standard).
- The **Balloon** is image-based: it renders a brand PNG from `public/balloons/`
  (chosen by id, see `src/lib/balloons.ts`) with the priority number + optional
  name overlaid, a `drop-shadow` glow, and deflate via scaling. Each idea stores
  a `balloon` id; the New-idea form picks one **by colour name**.
- The **Galaxy** animated background is ported 1:1 from the design's JS; it's
  used on `/list`, `/deadlines`, `/new`. `/wall` uses `WallBackground` — the
  brand nebula image with a slow Ken Burns zoom/pan, drifting glow, a twinkling
  starfield, and mouse parallax (layers move at different depths for a 3D feel).
  Pass it via `AppShell`'s `bgImage` prop. The nav logo is `public/lofty-logo.png`.
- `/wall` is a **physics field** (`src/components/BalloonField.tsx`, matter-js).
  Balloons hover **in place** in an organized curated layout (zero gravity + a
  visual sine bob, so they don't wander), you can **grab and reposition** one and
  it **stays where you drop it** (no spring-back; high `frictionAir` settles it),
  and they **collide** when knocked together. matter-js owns physics; React owns
  the DOM (body position → CSS transform per frame, set once synchronously on
  setup so balloons are placed even before the first frame). The **priority
  number and idea name are drawn inside the balloon** (the no-cloud art leaves the
  centre clear) — no rope, no caption below.
  Click without dragging opens that idea's focus screen. Curated coords live in a
  1200×680 design box scaled to fit the measured area (no `<Stage>`, so the mouse
  maps 1:1). Motion is intentional — not disabled under `prefers-reduced-motion`.
- `/deadlines` renders inside `<Stage>` so it scales to fit (design coords minus
  the 72px fake-nav band; the real nav lives in `AppShell`). The bottom timeline
  is a **real countdown** computed per idea: Today (left) → the actual deadline
  (right), ticks one-per-day (thinning for long horizons) labelled with real
  dates, so it always matches the "{N} days left" headline.
- All idea mutations go through `useIdeas`; priorities are renumbered to a
  contiguous `1..N` on every change.

## Brand assets
Source art is in `brand designs/` (transparent RGBA). Balloons use the
**no-cloud** set in `brand designs/balloons with no cloud insiide/` (cloud removed
so the number + name read clearly in the centre). The uniformly-cropped versions
in `public/` are generated (speck-removed, cropped to one shared union box) —
re-run after changing source art or adding a balloon:
```
node scripts/process-balloons.js   # no-cloud balloons -> public/balloons/*
node scripts/process-logo.js       # logo alone.png    -> public/lofty-logo.png
```
`public/wall-bg.png` is a direct copy of `brand designs/main page background.png`.
To add a balloon: drop the art in `brand designs/balloons with no cloud insiide/`,
add it to the `MAP` in `process-balloons.js` and to `BALLOONS` in
`src/lib/balloons.ts`, then re-run. (The old cloud versions are kept at
`brand designs/balloons/` and a backup of the previous crops at
`./balloons-backup-cloud/`.)

## Reference
Design source + screenshots live in the handoff zip
(`ideas-as-deflating-balloons/project/` and `exports/`). Match `exports/01-04.png`.

## Definition of done
`npm run build`, `npm run lint`, `npm run typecheck` all clean. Each route checked
against its export screenshot. Add → wall/list → reload persists. Focus deflate +
done flow works.

## Out of scope (for now)
Auth, cloud sync, mobile-optimized layouts, real notifications.

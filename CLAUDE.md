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
persistence — no backend, no accounts. Desktop-first, with real phone layouts.

## Mobile
Breakpoint is **720px**, in two matching halves: `useIsMobile()`
(`src/lib/useMediaQuery.ts`) for structural/layout branches in TSX, and
`@media (max-width: 720px)` in `globals.css` for the shared chrome. Keep the two
in sync — `BalloonField`'s `NARROW` uses `containerW > 720` so it agrees.
- Nav becomes two rows (logo + New idea, then the full-width tab strip).
- `/wall` swaps its fixed 1200×680 landscape box for a **portrait two-column
  layout packed from the balloons' real sizes** (`designFor`/`sizesOf`), so
  nothing overlaps or leaves the screen at any idea count. Hit-testing uses a
  larger slop for touch.
- `/deadlines?focus=` renders `MobileFocus` — a plain vertical column, **not**
  `<Stage>` (scaling 1200px design coords onto a phone is unreadable).
- List/Quiet-Sky rows drop their desktop columns for a compact stacked row.
- Hover lifts are disabled under `@media (hover: none)` so taps don't stick.

## Conventions
- 2-space indent, double quotes, ~100-char lines (global standard).
- The **Balloon** is image-based: it renders a brand PNG from `public/balloons/`
  (chosen by id, see `src/lib/balloons.ts`) with the priority number + optional
  name overlaid, a layered `drop-shadow` glow (dark contact shadow + colour glow
  + soft halo), and deflate via scaling. Each idea stores a `balloon` id; the
  New-idea form's **Choose color** grid lists free colours first (used ones badged
  "IN USE") and badges each tile with a **lifetime use count** (`N×`, active +
  archived, renamed ids resolved because the archive skips `normalize`); no badge
  means never used. That count is picker-only — deliberately not on the wall,
  list or focus screen.
- **The New-idea form opens blank.** No example name, no pre-selected colour —
  the name field is empty with a placeholder hint, and the picker reads "No color
  yet" until the user chooses. A pre-filled value reads as a decision the app
  already made for you. Consequences to keep in step: `balloon` state is
  `string | null` (only `null` before a pick, never on edit), the live preview
  falls back to a dashed size-only outline, `accent` falls back to
  `NEUTRAL_ACCENT`, and submit is blocked until name **and** colour are set —
  it names what's missing instead of saving a half-blank idea.
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
  Each balloon's wrapper **must keep `will-change: transform` _and_ its `padFor()`
  padding**: without the hint the wall drops to ~30fps, and without the padding
  the promoted layer clips the balloon's glow into a visible rectangle. The
  padding offsets the content, so `sync()`'s transform and the click hit-test both
  account for it — keep them in step.
- `/deadlines` is a **list of every active idea sorted by soonest deadline**
  (colour-coded `.lofty-card3d` rows with the priority balloon + urgency-coloured
  days-left). Tap a row → that idea's countdown at `?focus=<id>`, which has a
  "← All deadlines" back link (wall clicks + `?focus=` links still open focus
  directly). The focus sub-view renders inside `<Stage>` (design coords minus the
  72px fake-nav band; real nav lives in `AppShell`); its bottom timeline is a
  **real countdown** per idea: Today (left) → the actual deadline (right), ticks
  one-per-day (thinning for long horizons) labelled with real dates, so it always
  matches the "{N} days left" headline.
- Balloons **shrink with progress**: `format.deflateScale(progress)` is the single
  source of truth (0 → full, 1 → 20%); Focus and the wall both use it, so an idea
  deflates identically on both.
- The focus screen carries the **breakdown panel** (`IdeaBreakdown`, "Plan" tab =
  guided prompts + notes, "Steps" tab = checklist). **When `steps` is non-empty,
  `progress` is derived as doneCount/total** — the invariant lives only in
  `withSteps()` in `useIdeas`; every steps write goes through it. Empty checklist
  freezes progress and brings the manual "Made progress" button back. `restoreIdea`
  unchecks all steps to match its `progress: 0`. `plan`/`steps` are optional on
  `Idea` (absent until first edit — blank-form policy), guarded in `normalize`,
  and never reach the wallpaper wire (positional tuple).
- Shared 3D/colour chrome in `globals.css`: `.lofty-tabs`/`.lofty-tab`(+`--active`)
  for segmented toggles (nav + list sort); `.lofty-card3d` (raised card — set
  `--accent` to the idea's balloon swatch for a colour stripe + hover glow);
  `.lofty-press` (hover-lift/press); `.lofty-glass` (frosted panel). The animated
  brand button is `NewIdeaButton` (flowing gradient + glossy 3D pill; nav + empty
  states).
- All idea mutations go through `useIdeas`; priorities are renumbered to a
  contiguous `1..N` on every change.
- **A new visitor starts with an empty sky.** `useIdeas` seeds `[]` when
  `localStorage` is empty; the 11-idea demo set in `src/lib/seed.ts` is only
  reachable on purpose via `resetToDemo`. Never re-seed on first load.

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
The set is **50 balloons**: 13 colours + 12 **galaxies** (Andromeda, Black Eye,
Bode's, Cartwheel, Cigar, Hoag's Object, Pinwheel, Sombrero, Sunflower, Tadpole,
Triangulum, Whirlpool) + 25 **planets** (Mercury→Pluto, plus 16 exoplanets:
Proxima b, TRAPPIST-1e, Kepler-22b/-452b/-16b, 51 Pegasi b, Osiris, HD 189733 b,
WASP-12b/-76b, K2-18b, GJ 1214 b, 55 Cancri e, TOI-700 d, LHS 1140 b, HR 8799 e).
`process-balloons.js` also **auto-derives each balloon's `swatch`** (glow colour)
from its art and prints a `swatches JSON` block — paste those into `BALLOONS`. To
add a balloon: drop the art in `brand designs/balloons with no cloud insiide/`,
add it to the `MAP` in `process-balloons.js` and to `BALLOONS` in
`src/lib/balloons.ts`, then re-run.
**Renaming a balloon id** (e.g. `yahaf` → `baby-pink`): add the old id to
`RENAMED` in `balloons.ts`. Saved ideas store the id, so without that entry every
idea using it silently falls back to the default colour. `getBalloon` resolves it
on read and `normalize` rewrites it on load.
The source art is heavy (~2 MB per crop, ~100 MB total), so the colour picker
lazy-loads its thumbnails. Serving WebP via `next/image` is the real fix if the
weight ever bites. (Old cloud versions kept at
`brand designs/balloons/`; a backup of the previous crops at `./balloons-backup-cloud/`.)

## Reference
Design source + screenshots live in the handoff zip (`Ideas as deflating
balloons-handoff1.zip` at repo root — extract it to reach `project/` and `exports/`;
the extracted folder is not kept in the repo). Match `exports/01-04.png`.

## Definition of done
`npm run build`, `npm run lint`, `npm run typecheck` all clean. Each route checked
against its export screenshot **and at phone width (375–390px)**. Add → wall/list →
reload persists. Focus deflate + done flow works.
**Stop the dev server before `next build`** — building while it runs overwrites
`.next` underneath it and the running server then dies with `Cannot find module
'./<chunk>.js'`. Recovery: stop it, delete `.next`, restart.

## Desktop wallpaper sync
`tools/wallpaper-sync/` mirrors the wall onto the Windows desktop (Lively
Wallpaper). One effect in `useIdeas` pushes state to a local service
(`127.0.0.1:47821`) — gated on `localStorage["lofty.sync.enabled"]` **before**
the dynamic import, so other visitors never load the chunk. Opt-in per
browser+origin at `/settings` (token from `%USERPROFILE%\.lofty-sync\config.json`;
installer `install.ps1`, health `status.ps1`). The wallpaper document is a local
file in the Lively package; the service only feeds it data (SSE + `state.js`),
so it renders even with the service down and Lively never restarts. Invariants:
`/v1/events` always answers 200 + `text/event-stream` (even bad token); Node
server timeouts zeroed for SSE; wire `balloon` ids allowlisted against
`balloons.ts` before touching the filesystem; service config lives outside
AppData (packaged-app virtualization splits it otherwise). Rebuild the page
shell only after code changes: `node tools/wallpaper-sync/build-shell.mjs` —
then `repair.ps1`, since the running WebView2 keeps serving the old page.
**The shell's CSS is desktop-wide UI, not page styling**: `cursor: none` there
hid the mouse pointer across the entire desktop. Never hide the cursor, and
weigh any body-level rule as a change to Windows itself.
A healthy service does **not** mean a visible wallpaper: if Explorer restarts,
Lively's player keeps running and keeps consuming updates while parented to
nothing. The desktop-layer probe (`Progman`/`WorkerW` children) lives once in
`lib-desktop.ps1` as `Get-LoftyDesktopState`; `status.ps1` and `repair.ps1` both
dot-source it, and `status.ps1` prints `desktop: painting` or `ORPHANED` — never
trust `wallpaper attached` alone. Fix is a full Lively restart; `setwp` does
**not** re-parent it (no `Livelycu.exe` in this install, so it is silently
ignored). `repair.ps1` is that fix, one click from the **Fix Lofty Wallpaper**
desktop icon (`install-shortcut.ps1`, icon generated by `make-icon.mjs` from the
galaxy-purple balloon — the wordmark is unreadable at 16px). It is idempotent:
on a healthy system it changes nothing and says so.

## Repo & deploy
Private GitHub repo `github.com/seifyounes/lofty` (branch `main`; git identity Seif
Younes). Commit early; **push only when Seif approves** — he tries changes locally
first. Never commit `.claude/launch.json` (shared/mutated by other sessions,
machine-specific paths; carries `autoPort: true` so the preview grabs a free port).
Vercel auto-deploys from `main` when connected — always test on the **stable
production URL**, never per-deploy preview URLs (each is a new origin with empty
`localStorage`, which is why data can look "reset to zero").

## Out of scope (for now)
Auth + cloud sync are **planned next** (Supabase magic-link — see `MEMORY.md`).
Still out: real notifications.

See `MEMORY.md` for running history, decisions, gotchas, and next steps.

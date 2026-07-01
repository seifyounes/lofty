# MEMORY.md — Lofty running record

History, decisions, gotchas, and next steps. Stable rules live in `CLAUDE.md`.
_Last updated 2026-07-02._

## Where things stand
- Live, working Next.js app (client-only, `localStorage`). Four screens: `/wall`
  (matter-js physics field), `/list`, `/deadlines` (list → focus), `/new`.
- 25 balloons (13 colours + 12 galaxies). Balloons glow 3D and shrink with progress.
- Private repo `github.com/seifyounes/lofty`, branch `main`, in sync. `gh` CLI
  installed (v2.95.0, `C:\Program Files\GitHub CLI\gh.exe`), authed as `seifyounes`.

## Decisions
- **Stack**: Next.js App Router + TS + Tailwind, client-only, `localStorage`, desktop-first.
- **Balloons shrink with progress** on the wall too (not just Focus) — via `deflateScale`.
- **New-idea colour picker**: grid, free colours first, "IN USE" badges, auto-picks a free colour.
- **Deadlines** reworked (2026-07-02): default view is the full list sorted by
  soonest deadline; tapping opens `?focus=<id>`. Sort is by deadline, *not* priority.
- **3D + colour pass**: shared `globals.css` classes (`.lofty-tabs/.lofty-card3d/
  .lofty-press/.lofty-glass`) + animated `NewIdeaButton`.
- **Backend = Supabase, DECIDED but NOT built yet** (see next steps).

## Gotchas / learnings
- **Preview tab often goes `visibilityState:"hidden"`** → `preview_screenshot`
  times out and hydration is throttled (form/list render blank). Not a bug —
  verify via `preview_eval` computed styles / DOM reads instead, or wait for the
  tab to be focused. Screenshots only work while the tab is visible.
- **`preview_eval` + React `.click()` is flaky**: state may not flush before a
  synchronous read, and stray navigations to `/wall` happen. Click in one eval,
  read in a *separate* eval; to test a view, navigate to its URL directly.
- **"Data resets to zero"** = `localStorage` is per-origin. Vercel gives each
  deploy a unique preview URL (new origin → empty store → demo seed). Fix: use the
  stable production domain. Code changes never wipe `lofty.ideas` (schema/key stable).
- **PowerShell `git push`** prints red stderr / exit 255 but succeeds — cosmetic
  (`2>&1` wrapping). Check the `..` ref line + `git status -sb`.
- **White line in header** (reported 2026-07-02): investigated, not reproducible —
  not in `wall-bg.png`, only SVG on the page is the 13px button plus; wall renders
  clean at all widths. Likely stale deploy/cache, a browser extension, or a drawn
  annotation. Parked pending a hard-refresh repro from Seif.
- Balloon swatches are **auto-derived** by `process-balloons.js` (prints `swatches
  JSON`); keep the hand-tuned originals for the 13 colours, use derived for galaxies.

## Open questions / next steps
- **Supabase cross-device sync (biggest next task).** Chosen: a **new, free
  ($0/mo) project named `lofty`** in org **`elite`** (org id
  `tmuexwmnmgnfldmwoazh`), region eu-west-2, with **magic-link email** auth. Not
  started. Plan: create project → `ideas` table (mirror the `Idea` type) + RLS
  per-user → `@supabase/supabase-js` client with `NEXT_PUBLIC_SUPABASE_URL` /
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` (gitignored) → rework `useIdeas`
  to sync when signed-in with `localStorage` as offline fallback → migrate existing
  local ideas up on first login → login UI. Keep logged-out (local-only) working.
- **Confirm Vercel is connected** to the repo and that Seif uses the stable prod URL.
- Watch: 8+ near-identical galaxy swatches are blueish — fine (accent/glow only).

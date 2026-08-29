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
- **New-idea colour picker**: grid, free colours first, "IN USE" badges.
- **Blank new-idea form (2026-07-30)**: the name field used to be pre-filled with
  the literal string `"Launch referral program"` and the picker auto-selected the
  first free colour. Seif read both as the app having already decided for him, so
  both defaults are gone. The cost of removing them is that a new idea can now be
  incomplete, so `submit()` gained a guard (name + colour required, picker opens
  and a red hint names the gap). `useIdeas.addIdea` still falls back to
  `DEFAULT_BALLOON` for an empty id, so the store can't be corrupted either way.
- **Deadlines** reworked (2026-07-02): default view is the full list sorted by
  soonest deadline; tapping opens `?focus=<id>`. Sort is by deadline, *not* priority.
- **3D + colour pass**: shared `globals.css` classes (`.lofty-tabs/.lofty-card3d/
  .lofty-press/.lofty-glass`) + animated `NewIdeaButton`.
- **Backend = Supabase, DECIDED but NOT built yet** (see next steps).
- **Empty first run (2026-07-25)**: new visitors must land on an empty wall, so
  the 11-idea demo seed no longer runs on first load. Seif's own saved ideas were
  untouched — the change only affects a browser with no `lofty.ideas` key.
- **Phone layouts (2026-07-25)**: 720px breakpoint, `useIsMobile()` + a matching
  CSS media block. The wall got a portrait two-column packed layout and the
  deadlines focus screen a non-`<Stage>` mobile view. See `CLAUDE.md` → Mobile.

## Gotchas / learnings
- **The wall wrapper needs BOTH `will-change: transform` and padding**
  (2026-07-25). The promoted layer clips the balloon's `drop-shadow` glow to its
  box — a hard-edged rectangle of light around every balloon. `/new` never showed
  it (no promoted ancestor); that contrast isolated the cause. But simply dropping
  the hint **halved the frame rate** — measured on Seif's machine, 8 balloons:
  30fps / 33.4ms median / 50ms p95 without it, 60fps / 16.7ms median with it.
  The fix is `padFor()`: keep the promotion, pad the layer past the glow's reach
  (~0.38 × balloon size). Padding shifts the content box, so the transform in
  `sync()` **and** the click hit-test both subtract/add that pad — change one and
  clicks land on the wrong balloon.
- **Screenshots need a *visible* tab**: the in-app preview pane doesn't composite
  when hidden, and the Chrome MCP times out on a backgrounded tab. Workaround
  that works: `browser_batch` with `navigate` immediately followed by
  `screenshot`, since navigating focuses the tab. `requestAnimationFrame` still
  won't run, so FPS probes are impossible while hidden.
- **Never run `next build` while the dev server is up** (hit twice on 2026-07-25):
  the build rewrites `.next` under the running server, which then throws
  `Cannot find module './948.js'` in the browser. Stop preview → build →
  `rm -rf .next` → restart preview.
- **The preview tab freezes `requestAnimationFrame`** when the Browser pane isn't
  displayed — no frames, so rAF callbacks never run and `ResizeObserver` is
  throttled. Consequences: screenshots time out, live resizes don't propagate
  (reload instead), and rAF-deferred code is untestable there. Prefer
  `setTimeout` over `requestAnimationFrame` for resize settling — it works in
  both, and it's the better fit for iOS anyway (the viewport size finalises a
  moment after the rotation animation).
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

- **Desktop wallpaper live-sync shipped** (2026-07-29). `tools/wallpaper-sync/`
  service (port 47821, loopback-only, token in `%USERPROFILE%\.lofty-sync\config.json`,
  autostarts via Task Scheduler task `LoftyWallpaperSync`) + a gated push effect in
  `useIdeas` + `/settings` opt-in page. The wallpaper doc stays a **local file** in
  the Lively package; HTTP is data-only (SSE + state.js poll fallback), so the
  desktop never blanks when the service is down and Lively is never restarted.
  Four traps encoded in the code — do not undo them: (1) `/v1/events` must return
  **200 + text/event-stream even for a bad token** (an error status makes
  EventSource give up forever = silently frozen wallpaper); (2) Node's default
  `requestTimeout` (300s) kills SSE — zeroed explicitly; (3) the `balloon` id from
  the wire becomes a file path — hard-allowlisted against `balloons.ts`; (4) config
  must NOT live under `%LOCALAPPDATA%`: Windows virtualizes AppData for packaged
  apps, so two processes read two different config files with two different tokens
  ("bad token" that no amount of copying fixes). Verified on this machine: HTTPS
  `lofty-two.vercel.app` → `http://127.0.0.1` works in Chrome 122 (PNA warning-only;
  headers already sent for future enforcement).
- **An Explorer restart orphans the wallpaper, and every health check still says
  "ok"** (hit 2026-07-31). Explorer restarting destroys and recreates the desktop
  window (`Progman`/`WorkerW`) that Lively parents its player into. The player
  *process* survives, keeps its SSE connection, and keeps applying updates — to a
  window attached to nothing. So `status.ps1` reports "wallpaper attached: True",
  the log keeps accepting generations, and the desktop shows the plain Windows
  wallpaper. Symptom: "the wallpaper is not running" with a totally healthy
  service. Diagnose by comparing process start times (`explorer` newer than
  `Lively.Player.WebView2` = orphaned), and confirm by enumerating `Progman`'s
  child windows for the player's PID — a healthy wallpaper is a visible
  1536×864 `Chrome_WidgetWin_0` child. `Lively.exe setwp --file ...` does NOT fix
  it (this install has no `Livelycu.exe` CLI; the command is silently ignored).
  Fix: stop all `Lively*` processes and relaunch `C:\Program Files\Lively
  Wallpaper\Lively.exe` — it restores from `WallpaperLayout.json`. The sync log
  proves the handoff: `sse disconnect (clients=0)` then `sse connect (clients=1)`.
- **"Fix Lofty Wallpaper" desktop icon (2026-07-31)**: Seif asked for a one-click
  way to re-link the wallpaper when it breaks. `repair.ps1` starts the sync
  service if it is down, restarts Lively if the wallpaper is orphaned or missing,
  then reports via a MessageBox; `install-shortcut.ps1` creates the desktop `.lnk`
  (target `wscript.exe repair-hidden.vbs`, so no console ever flashes) and
  generates `%USERPROFILE%\.lofty-sync\lofty.ico`. Verified: no-op on a healthy
  system (same player PID, exit 0), and a real repair after killing the player.
  Gotcha while testing — filtering `Win32_Process` for `CommandLine -like
  "*repair.ps1*"` **matches the PowerShell tool process running the filter**,
  because the pattern is in its own command line; it looks like a runaway
  process with a new PID every check. Exclude `$PID`.
- **`cursor: none` in the wallpaper CSS hides the mouse pointer on the whole
  desktop** (2026-08-09). The shell had `cursor: none` on `html, body` — harmless
  in a normal page, but this page *is* the desktop surface, so the pointer
  vanished everywhere outside an app window and the desktop became
  un-navigable. Any CSS in `build-shell.mjs` that would be merely cosmetic in a
  browser tab is a system-wide UI change here. Fixed to `cursor: default`.
  Note a rebuilt shell does **not** reach the screen on its own — the running
  WebView2 keeps the old page; run `repair.ps1` (or restart Lively) after
  `build-shell.mjs`.
- **Lively's WebView2 viewport is 1536×864 @ dpr 1.25**, not 1920×1080 — anything
  fixed-pixel gets cropped. The shell scales a 1920×1080 design box to fit
  (`fit()`), same idea as BalloonField's `fitScale`.
- **Vercel deploys but does NOT register GitHub deployments** (2026-07-30). The
  `gh api .../deployments` list is stale (nothing since 2026-07-25) even though
  pushes go live. Don't use it to check whether a deploy landed — poll the site
  itself (e.g. `curl https://lofty-two.vercel.app/settings`). Deploys take ~1-2 min.
- **Sync opt-in is per browser profile AND per origin.** Enabled on
  `lofty-two.vercel.app` in Seif's Chrome on 2026-07-30. Clearing site data turns
  it off silently — the only place that surfaces it is `/settings`. Watch for a
  future Chrome that enforces Local Network Access: the loopback fetch would then
  need a one-time Allow prompt (which is why the probe fires from a click).
- **Seif's real wall lives on `lofty-two.vercel.app`** — NOT `lofty-seifo11`
  (SSO-gated, empty) and NOT localhost (stale copy: 9 old ideas). localStorage is
  per-origin; always confirm the origin before reading "his" ideas.

- **Idea breakdown shipped (2026-08-09)**: focus screen gained `IdeaBreakdown` —
  guided prompts (outcome / first action / blocker — field is `outcome`, NOT
  `done`, because `Idea.done` already means finished) + free notes + a steps
  checklist. Checking steps drives `progress` (write-time sync in `withSteps`),
  so the balloon deflates on focus, wall, and wallpaper with zero changes to
  those consumers. "Made progress" renders only when the checklist is empty.
  Decisions: guided template chosen by Seif over plain notes+checklist; steps
  drive progress. Verified end-to-end on localhost including delete-all-freeze,
  re-inflate on new step, and restore-unchecks-steps.

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

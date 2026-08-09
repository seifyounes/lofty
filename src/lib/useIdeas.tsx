"use client";

// localStorage-backed idea store. Everything client-side; structured so a real
// backend could later drop in behind the same context API.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ArchivedIdea,
  Idea,
  IdeaInput,
  IdeaPlan,
  Step,
  PLAN_FIELD_MAX,
  STEP_TEXT_MAX,
} from "./types";
import { DAY } from "./format";
import { makeSeed } from "./seed";
import { balloonIdFromLegacy, resolveBalloonId, DEFAULT_BALLOON } from "./balloons";

const KEY = "lofty.ideas";
const ARCHIVE_KEY = "lofty.archive";

type IdeasContextValue = {
  /** Always sorted by priority ascending (1 first). */
  ideas: Idea[];
  /** Finished ideas, most recently finished first. */
  archived: ArchivedIdea[];
  hydrated: boolean;
  addIdea: (input: IdeaInput) => Idea;
  updateIdea: (id: string, patch: Partial<Idea>) => void;
  deleteIdea: (id: string) => void;
  setProgress: (id: string, progress: number) => void;
  bumpProgress: (id: string, delta: number) => void;
  markDone: (id: string) => void;
  /** Move a finished idea back to the active wall (lowest priority). */
  restoreIdea: (id: string) => void;
  /** Remove a finished idea from the archive for good. */
  deleteArchived: (id: string) => void;
  resetToDemo: () => void;
  /** Merge guided-breakdown / notes fields (created lazily on first edit). */
  updatePlan: (id: string, patch: Partial<IdeaPlan>) => void;
  addStep: (id: string, text: string) => void;
  toggleStep: (id: string, stepId: string) => void;
  deleteStep: (id: string, stepId: string) => void;
};

const IdeasContext = createContext<IdeasContextValue | null>(null);

/** Sort by priority then renumber to a contiguous 1..N. */
function renumber(list: Idea[]): Idea[] {
  return [...list]
    .sort((a, b) => a.priority - b.priority)
    .map((idea, i) => ({ ...idea, priority: i + 1 }));
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

/**
 * Apply a steps array and, when non-empty, derive progress from it — THE single
 * place the steps→progress invariant lives. An empty array freezes progress at
 * its last value, and the manual "Made progress" button takes over again.
 */
function withSteps(it: Idea, steps: Step[]): Idea {
  const next = { ...it, steps };
  if (steps.length > 0) next.progress = steps.filter((s) => s.done).length / steps.length;
  return next;
}

/**
 * Guard the optional breakdown fields against corrupt/hand-edited storage —
 * they get `.map`-ed and rendered, so a wrong shape must never reach React.
 * Progress is deliberately NOT recomputed here; the invariant re-establishes on
 * the next step mutation.
 */
function normalizeExtras(it: Idea): Idea {
  let out = it;
  if (it.steps !== undefined) {
    if (!Array.isArray(it.steps)) {
      const { steps: _steps, ...rest } = it;
      out = rest;
    } else {
      const clean = it.steps
        .filter((s): s is Step => !!s && typeof s === "object" && typeof s.text === "string")
        .map((s) => ({
          id: typeof s.id === "string" ? s.id : newId(),
          text: s.text.slice(0, STEP_TEXT_MAX),
          done: s.done === true,
        }));
      out = { ...out, steps: clean };
    }
  }
  if (out.plan !== undefined) {
    const p = out.plan as unknown;
    if (!p || typeof p !== "object") {
      const { plan: _plan, ...rest } = out;
      out = rest;
    } else {
      const str = (v: unknown) => (typeof v === "string" ? v.slice(0, PLAN_FIELD_MAX) : "");
      const raw = p as Record<string, unknown>;
      out = {
        ...out,
        plan: {
          outcome: str(raw.outcome),
          first: str(raw.first),
          blocker: str(raw.blocker),
          notes: str(raw.notes),
        },
      };
    }
  }
  return out;
}

/**
 * Ensure each idea has a valid `balloon` — migrating legacy `color` hex data and
 * following any balloon that has since been renamed (e.g. yahaf -> baby-pink) —
 * and a well-formed breakdown (plan/steps).
 */
function normalize(list: Idea[]): Idea[] {
  return list.map((raw) => {
    const it = normalizeExtras(raw);
    if (!it.balloon) {
      const legacy = (it as unknown as { color?: string }).color;
      return { ...it, balloon: balloonIdFromLegacy(legacy) };
    }
    const current = resolveBalloonId(it.balloon);
    return current === it.balloon ? it : { ...it, balloon: current };
  });
}

export function IdeasProvider({ children }: { children: ReactNode }) {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [archived, setArchived] = useState<ArchivedIdea[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load (or seed) once on mount — keeps SSR output stable, no hydration flash.
  useEffect(() => {
    let initial: Idea[];
    try {
      const raw = localStorage.getItem(KEY);
      // A brand-new visitor starts with an EMPTY sky — the demo set is only
      // reachable on purpose via `resetToDemo`. Existing saved ideas load as-is.
      initial = raw ? normalize(JSON.parse(raw) as Idea[]) : [];
    } catch {
      initial = [];
    }
    try {
      const raw = localStorage.getItem(ARCHIVE_KEY);
      if (raw) setArchived(JSON.parse(raw) as ArchivedIdea[]);
    } catch {
      /* corrupt archive — start empty, never touch active ideas */
    }
    setIdeas(renumber(initial));
    setHydrated(true);
  }, []);

  // Persist after hydration.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(ideas));
    } catch {
      /* ignore quota / private-mode errors */
    }
  }, [ideas, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archived));
    } catch {
      /* ignore quota / private-mode errors */
    }
  }, [archived, hydrated]);

  // Mirror the wall to the desktop-wallpaper service, when this browser has
  // opted in. Deliberately a separate effect from the two above so a sync
  // problem can never interfere with persistence, and a single combined one so
  // markDone/restoreIdea — which write both slices in one batch — push once.
  //
  // The opt-in is checked BEFORE the dynamic import, so for anyone who has not
  // enabled it the chunk is never even fetched.
  useEffect(() => {
    if (!hydrated) return;
    let live = true;
    const t = window.setTimeout(() => {
      if (!live) return;
      let on = false;
      try {
        on = localStorage.getItem("lofty.sync.enabled") === "1";
      } catch {
        /* private mode — stay off */
      }
      if (!on) return;
      import("./wallSync")
        .then((m) => m.push(ideas, archived))
        .catch(() => {
          /* the wallpaper is optional; never surface this in the app */
        });
    }, 400);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [ideas, archived, hydrated]);

  const addIdea = useCallback((input: IdeaInput): Idea => {
    const idea: Idea = {
      id: newId(),
      name: input.name.trim() || "Untitled idea",
      big: Math.max(0, Math.min(100, input.big)),
      priority: input.priority,
      balloon: input.balloon || DEFAULT_BALLOON,
      createdAt: Date.now(),
      deadline: Date.now() + input.deadlineDays * DAY,
      progress: 0,
      done: false,
    };
    setIdeas((prev) => {
      const rank = Math.max(1, Math.min(prev.length + 1, input.priority));
      // Open a slot at `rank`, then renumber to stay contiguous.
      const shifted = prev.map((it) =>
        it.priority >= rank ? { ...it, priority: it.priority + 1 } : it,
      );
      return renumber([...shifted, { ...idea, priority: rank }]);
    });
    return idea;
  }, []);

  const updateIdea = useCallback((id: string, patch: Partial<Idea>) => {
    setIdeas((prev) =>
      renumber(prev.map((it) => (it.id === id ? { ...it, ...patch } : it))),
    );
  }, []);

  const deleteIdea = useCallback((id: string) => {
    setIdeas((prev) => renumber(prev.filter((it) => it.id !== id)));
  }, []);

  const setProgress = useCallback((id: string, progress: number) => {
    const p = Math.max(0, Math.min(1, progress));
    setIdeas((prev) => prev.map((it) => (it.id === id ? { ...it, progress: p } : it)));
  }, []);

  // Functional bump so rapid clicks accumulate (don't read a stale value).
  const bumpProgress = useCallback((id: string, delta: number) => {
    setIdeas((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, progress: Math.max(0, Math.min(1, it.progress + delta)) } : it,
      ),
    );
  }, []);

  const markDone = useCallback(
    (id: string) => {
      // "Pops the moment it's done" — the balloon leaves the wall but the win is
      // kept in the archive; the next priority takes focus.
      const idea = ideas.find((it) => it.id === id);
      if (idea) {
        setArchived((arc) => [
          { ...idea, progress: 1, done: true, finishedAt: Date.now() },
          ...arc.filter((a) => a.id !== id),
        ]);
      }
      setIdeas((prev) => renumber(prev.filter((it) => it.id !== id)));
    },
    [ideas],
  );

  const restoreIdea = useCallback(
    (id: string) => {
      const found = archived.find((a) => a.id === id);
      if (!found) return;
      const { finishedAt: _finishedAt, ...idea } = found;
      setArchived((arc) => arc.filter((a) => a.id !== id));
      // Back on the wall = fresh start: progress resets, so step flags must
      // reset with it or the checklist would disagree with the balloon.
      setIdeas((prev) =>
        renumber([
          ...prev,
          {
            ...idea,
            done: false,
            progress: 0,
            steps: idea.steps?.map((s) => ({ ...s, done: false })),
            priority: prev.length + 1,
          },
        ]),
      );
    },
    [archived],
  );

  const deleteArchived = useCallback((id: string) => {
    setArchived((arc) => arc.filter((a) => a.id !== id));
  }, []);

  // Breakdown mutations. None of them touch priority, so no renumber — the same
  // pattern as bumpProgress. Progress stays consistent because every write to
  // `steps` goes through withSteps.
  const updatePlan = useCallback((id: string, patch: Partial<IdeaPlan>) => {
    setIdeas((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const base: IdeaPlan = it.plan ?? { outcome: "", first: "", blocker: "", notes: "" };
        const next = { ...base };
        (Object.keys(patch) as (keyof IdeaPlan)[]).forEach((k) => {
          const v = patch[k];
          if (typeof v === "string") next[k] = v.slice(0, PLAN_FIELD_MAX);
        });
        return { ...it, plan: next };
      }),
    );
  }, []);

  const addStep = useCallback((id: string, text: string) => {
    const t = text.trim().slice(0, STEP_TEXT_MAX);
    if (!t) return;
    setIdeas((prev) =>
      prev.map((it) =>
        it.id === id
          ? withSteps(it, [...(it.steps ?? []), { id: newId(), text: t, done: false }])
          : it,
      ),
    );
  }, []);

  const toggleStep = useCallback((id: string, stepId: string) => {
    setIdeas((prev) =>
      prev.map((it) =>
        it.id === id
          ? withSteps(
              it,
              (it.steps ?? []).map((s) => (s.id === stepId ? { ...s, done: !s.done } : s)),
            )
          : it,
      ),
    );
  }, []);

  const deleteStep = useCallback((id: string, stepId: string) => {
    setIdeas((prev) =>
      prev.map((it) =>
        it.id === id ? withSteps(it, (it.steps ?? []).filter((s) => s.id !== stepId)) : it,
      ),
    );
  }, []);

  const resetToDemo = useCallback(() => {
    setIdeas(renumber(makeSeed()));
  }, []);

  const value = useMemo<IdeasContextValue>(
    () => ({
      ideas,
      archived,
      hydrated,
      addIdea,
      updateIdea,
      deleteIdea,
      setProgress,
      bumpProgress,
      markDone,
      restoreIdea,
      deleteArchived,
      resetToDemo,
      updatePlan,
      addStep,
      toggleStep,
      deleteStep,
    }),
    [ideas, archived, hydrated, addIdea, updateIdea, deleteIdea, setProgress, bumpProgress, markDone, restoreIdea, deleteArchived, resetToDemo, updatePlan, addStep, toggleStep, deleteStep],
  );

  return <IdeasContext.Provider value={value}>{children}</IdeasContext.Provider>;
}

export function useIdeas(): IdeasContextValue {
  const ctx = useContext(IdeasContext);
  if (!ctx) throw new Error("useIdeas must be used inside <IdeasProvider>");
  return ctx;
}

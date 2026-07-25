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
import { ArchivedIdea, Idea, IdeaInput } from "./types";
import { DAY } from "./format";
import { makeSeed } from "./seed";
import { balloonIdFromLegacy, DEFAULT_BALLOON } from "./balloons";

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
};

const IdeasContext = createContext<IdeasContextValue | null>(null);

/** Sort by priority then renumber to a contiguous 1..N. */
function renumber(list: Idea[]): Idea[] {
  return [...list]
    .sort((a, b) => a.priority - b.priority)
    .map((idea, i) => ({ ...idea, priority: i + 1 }));
}

/** Ensure each idea has a valid `balloon` (migrate legacy `color` hex data). */
function normalize(list: Idea[]): Idea[] {
  return list.map((it) => {
    if (it.balloon) return it;
    const legacy = (it as unknown as { color?: string }).color;
    return { ...it, balloon: balloonIdFromLegacy(legacy) };
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

  const addIdea = useCallback((input: IdeaInput): Idea => {
    const idea: Idea = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `id-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
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
      setIdeas((prev) =>
        renumber([...prev, { ...idea, done: false, progress: 0, priority: prev.length + 1 }]),
      );
    },
    [archived],
  );

  const deleteArchived = useCallback((id: string) => {
    setArchived((arc) => arc.filter((a) => a.id !== id));
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
    }),
    [ideas, archived, hydrated, addIdea, updateIdea, deleteIdea, setProgress, bumpProgress, markDone, restoreIdea, deleteArchived, resetToDemo],
  );

  return <IdeasContext.Provider value={value}>{children}</IdeasContext.Provider>;
}

export function useIdeas(): IdeasContextValue {
  const ctx = useContext(IdeasContext);
  if (!ctx) throw new Error("useIdeas must be used inside <IdeasProvider>");
  return ctx;
}

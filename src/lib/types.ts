// Core domain types for Lofty.

/** One checklist step; checking steps drives `Idea.progress` (doneCount/total). */
export type Step = {
  id: string;
  text: string;
  done: boolean;
};

/** Guided-breakdown answers + free notes. Every field defaults to "". */
export type IdeaPlan = {
  /** "What does done look like?" — not named `done`: Idea.done already means finished. */
  outcome: string;
  /** "First physical action?" */
  first: string;
  /** "What's blocking it?" */
  blocker: string;
  /** Free-form notes. */
  notes: string;
};

/** Shared by store clamping and UI maxLength, so they can never disagree. */
export const STEP_TEXT_MAX = 140;
export const PLAN_FIELD_MAX = 2000;

export type Idea = {
  id: string;
  name: string;
  /** 0..100 "how big is this idea" — drives balloon size everywhere. */
  big: number;
  /** Contiguous rank, 1 = top priority. Renumbered on every mutation. */
  priority: number;
  /** Brand balloon id (see lib/balloons.ts), chosen by name on create. */
  balloon: string;
  createdAt: number;
  /** Epoch ms the idea is due. */
  deadline: number;
  /** 0..1 deflate amount used on the Focus screen. */
  progress: number;
  done: boolean;
  /** Guided breakdown + notes; absent until first edited on the Focus screen. */
  plan?: IdeaPlan;
  /** Checklist; when non-empty, progress is derived as doneCount/length. */
  steps?: Step[];
};

/** A finished idea, kept in the archive so wins are never lost. */
export type ArchivedIdea = Idea & {
  /** Epoch ms the idea was marked done. */
  finishedAt: number;
};

/** What the "New idea" form hands to addIdea. */
export type IdeaInput = {
  name: string;
  big: number;
  priority: number;
  /** Brand balloon id the user picked. */
  balloon: string;
  /** Days from now until the deadline. */
  deadlineDays: number;
};

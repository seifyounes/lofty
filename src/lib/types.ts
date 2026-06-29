// Core domain types for Lofty.

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

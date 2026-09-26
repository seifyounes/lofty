// The 11 demo ideas from the original design, so a fresh install opens looking
// like the mockups. `big` is derived from the design's px sizes; deadlines are
// the design's "days from base" offsets.
import { Idea } from "./types";
import { BASE_DATE, DAY, pxToBig } from "./format";

type Seed = {
  name: string;
  px: number;
  balloon: string;
  priority: number;
  days: number;
};

const SEEDS: Seed[] = [
  { name: "Launching waitlist website", px: 176, balloon: "teal-blue", priority: 1, days: 9 },
  { name: "Discipline capacity feature", px: 150, balloon: "hot-pink", priority: 2, days: 5 },
  { name: "Recap feature", px: 132, balloon: "galaxy-purple", priority: 3, days: 2 },
  { name: "Onboarding questions", px: 122, balloon: "sunny-yellow", priority: 4, days: 14 },
  { name: "Referral loop", px: 98, balloon: "earthy-green", priority: 5, days: 19 },
  { name: "Weekly digest", px: 92, balloon: "hot-orange", priority: 6, days: 25 },
  { name: "Dark mode", px: 86, balloon: "royal-blue", priority: 7, days: 30 },
  { name: "Pricing page", px: 112, balloon: "lilac", priority: 8, days: 33 },
  { name: "Search filters", px: 82, balloon: "red-cherry", priority: 9, days: 37 },
  { name: "Team metrics", px: 80, balloon: "earthy-green", priority: 10, days: 40 },
  { name: "Notifications", px: 92, balloon: "sunny-yellow", priority: 11, days: 44 },
];

/** `base` anchors createdAt and the deadlines; the demo link passes today so no deadline is overdue. */
export function makeSeed(base: number = BASE_DATE.getTime()): Idea[] {
  return SEEDS.map((s, i) => ({
    id: `seed-${i + 1}`,
    name: s.name,
    big: pxToBig(s.px),
    priority: s.priority,
    balloon: s.balloon,
    createdAt: base,
    deadline: base + s.days * DAY,
    progress: 0,
    done: false,
  }));
}

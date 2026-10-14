import { lightFor, MIN_REPLY_SAMPLE } from "./encode";
import type { CityRepo } from "./types";

/**
 * A lens changes what window light means. Height is always activity; the lens
 * decides which measured figure lights the windows and how the legend reads it.
 * Every lens uses a figure Contributable publishes, and shows "not enough data"
 * as its own muted colour rather than as a low value.
 */
export type LensId = "replies" | "activity" | "issues" | "merged" | "evidence";

export interface LensReading {
  /** Share of windows lit, 0..1. */
  share: number;
  /** Window colour, hex. */
  colour: string;
  /** Whether the figure rests on enough data. */
  known: boolean;
}

export interface Lens {
  id: LensId;
  label: string;
  /** The question the lens answers. */
  question: string;
  /** Legend, brightest first. */
  legend: { colour: string; label: string }[];
  read: (repo: CityRepo) => LensReading;
  /** One line for a building under this lens. */
  describe: (repo: CityRepo) => string;
}

const WARM = "#f2c57c";
const WARM_DIM = "#a88454";
const MUTED = "#5f7390";
const GREEN = "#8fe3b0";
const TEAL = "#7fd9d0";
const ROSE = "#e08c9a";
const BLUE = "#8db4ff";

const pct = (x: number) => `${Math.round(x * 100)}%`;

export const LENSES: Lens[] = [
  {
    id: "replies",
    label: "Replies",
    question: "Who answers outside pull requests within 48 hours?",
    legend: [
      { colour: WARM, label: "Lit: most newcomers get a reply within 48 h" },
      { colour: WARM_DIM, label: "Dim: some do" },
      { colour: "#4b5a8a", label: "Dark: hardly any" },
      { colour: MUTED, label: "Blue: fewer than 5 outside PRs, not enough data" },
    ],
    read: (repo) => {
      const { share, kind } = lightFor(repo);
      const colour = kind === "lit" ? WARM : kind === "dim" ? WARM_DIM : kind === "unknown" ? MUTED : "#4b5a8a";
      return { share, colour, known: kind !== "unknown" };
    },
    describe: (repo) =>
      repo.within48h == null || repo.replyN < MIN_REPLY_SAMPLE
        ? `${repo.replyN} outside PRs, not enough to judge`
        : `${pct(repo.within48h)} of ${repo.replyN} outside PRs answered within 48 h`,
  },
  {
    id: "activity",
    label: "Activity",
    question: "Where is the work happening right now?",
    legend: [
      { colour: TEAL, label: "Lit: hundreds of commits in 90 days" },
      { colour: "#4f8f8a", label: "Dim: a few commits a week" },
      { colour: MUTED, label: "Dark: quiet for a quarter" },
    ],
    read: (repo) => {
      const commits = repo.commits90d ?? 0;
      const share = Math.min(1, Math.log1p(commits) / Math.log1p(400));
      return { share: 0.05 + share * 0.95, colour: commits === 0 ? MUTED : TEAL, known: true };
    },
    describe: (repo) => `${repo.commits90d ?? 0} commits in 90 days, ${repo.prsYear} outside PRs in a year`,
  },
  {
    id: "issues",
    label: "Free issues",
    question: "Where can a newcomer pick something up today?",
    legend: [
      { colour: GREEN, label: "Lit: several unclaimed beginner issues" },
      { colour: "#5c9a74", label: "Dim: one or two" },
      { colour: MUTED, label: "Dark: none free right now" },
    ],
    read: (repo) => {
      const n = repo.available;
      if (n === 0) return { share: 0.04, colour: MUTED, known: true };
      return { share: Math.min(1, 0.3 + n * 0.18), colour: GREEN, known: true };
    },
    describe: (repo) =>
      repo.available === 0
        ? "no unclaimed beginner issues right now"
        : `${repo.available} unclaimed beginner ${repo.available === 1 ? "issue" : "issues"}${repo.helpWanted ? `, ${repo.helpWanted} help wanted` : ""}`,
  },
  {
    id: "merged",
    label: "Merged",
    question: "Where does outside work actually get merged?",
    legend: [
      { colour: BLUE, label: "Lit: most decided outside PRs were merged" },
      { colour: "#5a76b3", label: "Dim: about half" },
      { colour: ROSE, label: "Rose: most were closed unmerged" },
      { colour: MUTED, label: "Blue-grey: fewer than 5 decided, not enough data" },
    ],
    read: (repo) => {
      if (repo.mergeRate == null || repo.decided < MIN_REPLY_SAMPLE) return { share: 0.08, colour: MUTED, known: false };
      const r = repo.mergeRate;
      if (r < 0.35) return { share: 0.35, colour: ROSE, known: true };
      return { share: 0.2 + r * 0.8, colour: BLUE, known: true };
    },
    describe: (repo) =>
      repo.mergeRate == null || repo.decided < MIN_REPLY_SAMPLE
        ? `${repo.decided} decided outside PRs, not enough to judge`
        : `${pct(repo.mergeRate)} of ${repo.decided} decided outside PRs merged`,
  },
  {
    id: "evidence",
    label: "Evidence",
    question: "Which projects have enough outside pull requests to be judged at all?",
    legend: [
      { colour: TEAL, label: "Lit: 20 or more outside PRs measured" },
      { colour: "#4f8f8a", label: "Dim: 5 to 19" },
      { colour: MUTED, label: "Dark: under 5, every reply figure withheld" },
    ],
    read: (repo) => {
      const n = repo.replyN;
      if (n < MIN_REPLY_SAMPLE) return { share: 0.06, colour: MUTED, known: false };
      return { share: Math.min(1, 0.3 + n / 30), colour: TEAL, known: true };
    },
    describe: (repo) => `${repo.replyN} outside PRs measured${repo.replyN < MIN_REPLY_SAMPLE ? ", reply figures withheld" : ""}`,
  },
];

export const DEFAULT_LENS: LensId = "replies";

export function lensById(id: string | null | undefined): Lens {
  return LENSES.find((l) => l.id === id) ?? LENSES[0];
}

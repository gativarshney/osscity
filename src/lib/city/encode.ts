import type { CityRepo } from "./types";

/**
 * How a repository becomes a building.
 *
 * Height is activity: commits in the last 90 days and outside pull requests over the
 * last year, on a log scale so a handful of giants do not flatten everyone else.
 * Window light is the share of outside pull requests that got a human reply within
 * 48 hours. Dark towers rarely answer. Contributable withholds reply figures under
 * five pull requests, and those buildings are drawn as "not enough data".
 */

export const MIN_HEIGHT = 0.6;
export const MAX_HEIGHT = 16;

/** Reply figures Contributable publishes always rest on at least this many pull requests. */
export const MIN_REPLY_SAMPLE = 5;

/** Activity on a 0..1 scale. */
export function activityScore(repo: Pick<CityRepo, "commits90d" | "prsYear">): number {
  const commits = Math.max(0, repo.commits90d ?? 0);
  const prs = Math.max(0, repo.prsYear);
  // A commit every day for a quarter plus a few pull requests a week is a full-size tower.
  const raw = Math.log1p(commits + prs * 1.5) / Math.log1p(600);
  return Math.min(1, raw);
}

export function heightFor(repo: Pick<CityRepo, "commits90d" | "prsYear">): number {
  const a = activityScore(repo);
  // Ease so that most buildings read as mid-rise and only the busy ones become towers.
  return MIN_HEIGHT + (MAX_HEIGHT - MIN_HEIGHT) * a * a;
}

export type LightKind = "lit" | "dim" | "dark" | "unknown";

/**
 * Share of windows that are lit, 0..1, and what kind of building this is.
 * "unknown" means Contributable has fewer than five outside pull requests to judge by.
 */
export function lightFor(
  repo: Pick<CityRepo, "within48h" | "within7d" | "replyN">,
): { share: number; kind: LightKind } {
  if (repo.within48h == null || repo.replyN < MIN_REPLY_SAMPLE) {
    return { share: 0.08, kind: "unknown" };
  }
  const share = Math.max(0, Math.min(1, repo.within48h));
  if (share >= 0.5) return { share: 0.35 + share * 0.65, kind: "lit" };
  if (share >= 0.2) return { share: 0.15 + share * 0.5, kind: "dim" };
  return { share: 0.04 + share * 0.3, kind: "dark" };
}

/** Popular, with enough pull requests to judge, and most newcomers wait more than a week. */
export function isGhostTown(repo: Pick<CityRepo, "stars" | "within7d" | "replyN">): boolean {
  return (
    repo.stars >= 100 &&
    repo.replyN >= MIN_REPLY_SAMPLE &&
    repo.within7d != null &&
    repo.within7d <= 0.34
  );
}

/**
 * How welcoming a project is to a newcomer, 0..1, or null when Contributable does not
 * have enough pull requests to say. Fast replies matter most, then whether outside
 * work is merged, then whether there is something free to pick up.
 */
export function friendliness(
  repo: Pick<CityRepo, "within48h" | "within7d" | "mergeRate" | "available" | "replyN" | "noPulls">,
): number | null {
  if (repo.noPulls) return null;
  if (repo.within48h == null || repo.replyN < MIN_REPLY_SAMPLE) return null;
  const fast = repo.within48h * 0.7 + (repo.within7d ?? repo.within48h) * 0.3;
  const merged = repo.mergeRate ?? 0.5;
  const free = Math.min(repo.available, 5) / 5;
  return fast * 0.6 + merged * 0.25 + free * 0.15;
}

/** The friendliest repositories, most welcoming first. */
export function friendliest(repos: CityRepo[], count = 10): CityRepo[] {
  return repos
    .map((repo) => ({ repo, score: friendliness(repo) }))
    .filter((x): x is { repo: CityRepo; score: number } => x.score != null)
    .sort((a, b) => b.score - a.score || b.repo.replyN - a.repo.replyN)
    .slice(0, count)
    .map((x) => x.repo);
}

/** Ghost towns, quietest first. */
export function ghostTowns(repos: CityRepo[], count = 30): CityRepo[] {
  return repos
    .filter(isGhostTown)
    .sort((a, b) => (a.within7d ?? 0) - (b.within7d ?? 0) || b.stars - a.stars)
    .slice(0, count);
}

/** Hex colours used both in WebGL and in the flat map. */
export const COLOURS = {
  window: "#f2c57c",
  windowDim: "#a88454",
  unknown: "#53667a",
  facade: "#141a2b",
  facadeDark: "#0d1120",
  accent: "#7fd9d0",
  ghost: "#4b5a8a",
} as const;

/** Window colour for a light kind. */
export function windowColour(kind: LightKind): string {
  if (kind === "lit") return COLOURS.window;
  if (kind === "dim") return COLOURS.windowDim;
  if (kind === "unknown") return COLOURS.unknown;
  return COLOURS.ghost;
}

/** Facade colour. Dark towers are a shade darker. */
export function facadeColour(kind: LightKind): string {
  return kind === "dark" ? COLOURS.facadeDark : COLOURS.facade;
}

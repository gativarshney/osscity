import type { CityRepo } from "./types";

/**
 * "Awake now": projects whose core members usually reply at this hour.
 * Contributable publishes replies by hour of day in UTC, scaled 0 to 9 per project.
 * A project counts as awake when the current hour is at least this much of its peak.
 */
export const AWAKE_THRESHOLD = 5;

/** The UTC hour for a moment. */
export function utcHour(at = new Date()): number {
  return at.getUTCHours();
}

/** How active a project usually is at a UTC hour, 0 to 9, or null when withheld. */
export function activityAt(repo: Pick<CityRepo, "hours">, hour: number): number | null {
  if (!repo.hours || repo.hours.length !== 24) return null;
  return repo.hours[((hour % 24) + 24) % 24] ?? 0;
}

export function isAwake(repo: Pick<CityRepo, "hours">, hour: number): boolean {
  const a = activityAt(repo, hour);
  return a != null && a >= AWAKE_THRESHOLD;
}

/** Indices of projects awake at a UTC hour. */
export function awakeAt(repos: CityRepo[], hour: number): number[] {
  const out: number[] = [];
  repos.forEach((r, i) => {
    if (isAwake(r, hour)) out.push(i);
  });
  return out;
}

/** The hours (UTC) at which the most projects are awake, best first. */
export function busiestHours(repos: CityRepo[]): number[] {
  const counts = Array.from({ length: 24 }, (_, h) => awakeAt(repos, h).length);
  return counts
    .map((n, h) => ({ n, h }))
    .sort((a, b) => b.n - a.n || a.h - b.h)
    .map((x) => x.h);
}

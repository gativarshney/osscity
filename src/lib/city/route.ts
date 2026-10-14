import { friendliness } from "./encode";
import type { CityRepo } from "./types";

/**
 * "Your route": a short path through a stack, from the easiest first project to a
 * bigger one. Stops are the friendliest matches, ordered by activity so the route
 * climbs from a small welcoming project towards a busy one.
 */
export interface RouteStop {
  index: number;
  /** One line on why this is the next step. */
  why: string;
}

export const ROUTE_LENGTH = 4;

export function planRoute(repos: CityRepo[], indices: number[], length = ROUTE_LENGTH): RouteStop[] {
  const scored = indices
    .map((index) => ({ index, repo: repos[index], score: friendliness(repos[index]) }))
    .filter((x): x is { index: number; repo: CityRepo; score: number } => x.repo != null && x.score != null)
    .sort((a, b) => b.score - a.score || b.repo.available - a.repo.available);
  // Prefer a project with something free to pick up as the first stop.
  const pool = scored.slice(0, Math.max(length * 2, 6));
  const first = pool.find((x) => x.repo.available > 0) ?? pool[0];
  if (!first) return [];
  const rest = pool
    .filter((x) => x !== first)
    .slice(0, length - 1)
    .sort((a, b) => (a.repo.commits90d ?? 0) - (b.repo.commits90d ?? 0));
  const ordered = [first, ...rest].sort((a, b) => {
    if (a === first) return -1;
    if (b === first) return 1;
    return (a.repo.commits90d ?? 0) - (b.repo.commits90d ?? 0);
  });
  return ordered.map((x, n) => ({ index: x.index, why: whyStop(x.repo, n, ordered.length) }));
}

function whyStop(repo: CityRepo, n: number, total: number): string {
  const bits: string[] = [];
  if (n === 0) bits.push("Start here");
  else if (n === total - 1) bits.push("Then aim here");
  else bits.push("Next");
  if (repo.available > 0) bits.push(`${repo.available} free first ${repo.available === 1 ? "issue" : "issues"}`);
  if (repo.replyHours != null) bits.push(`replies in about ${Math.round(repo.replyHours)} h`);
  if (repo.commits90d != null) bits.push(`${repo.commits90d} commits in 90 days`);
  return bits.join(", ") + ".";
}

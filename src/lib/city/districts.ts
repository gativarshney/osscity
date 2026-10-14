import { friendliness, isGhostTown, MIN_REPLY_SAMPLE } from "./encode";
import type { CityPlan } from "./layout";
import type { CityRepo } from "./types";

/**
 * District figures: the ecosystem view. Each figure is aggregated from numbers
 * Contributable publishes per repository, and each carries the sample it rests on.
 */
export interface DistrictStats {
  name: string;
  count: number;
  /** Repositories with at least five outside pull requests. */
  withEvidence: number;
  /** Median first reply hours across repositories with evidence, or null. */
  medianReplyHours: number | null;
  /** Mean share of outside PRs answered within 7 days, over repositories with evidence. */
  within7d: number | null;
  /** Mean share answered within 48 hours, over repositories with evidence. */
  within48h: number | null;
  /** Mean outside merge rate over repositories with 5 or more decided PRs. */
  mergeRate: number | null;
  mergeN: number;
  /** Unclaimed beginner issues across the district. */
  freeIssues: number;
  /** Repositories with at least one free issue. */
  withFreeIssues: number;
  commits90d: number;
  stars: number;
  ghosts: number;
  /** Indices of the friendliest repositories, best first. */
  friendliest: number[];
  /** Indices of the most starred ghost towns. */
  ghostList: number[];
}

const median = (xs: number[]): number | null => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function districtStats(name: string, repos: CityRepo[], indices: number[]): DistrictStats {
  const rows = indices.map((i) => ({ i, r: repos[i] })).filter((x) => x.r);
  const evidence = rows.filter((x) => x.r.replyN >= MIN_REPLY_SAMPLE && x.r.within7d != null);
  const merge = rows.filter((x) => x.r.mergeRate != null && x.r.decided >= MIN_REPLY_SAMPLE);
  const friendliestRows = rows
    .map((x) => ({ ...x, score: friendliness(x.r) }))
    .filter((x): x is typeof x & { score: number } => x.score != null)
    .sort((a, b) => b.score - a.score);
  const ghostRows = rows.filter((x) => isGhostTown(x.r)).sort((a, b) => b.r.stars - a.r.stars);
  return {
    name,
    count: rows.length,
    withEvidence: evidence.length,
    medianReplyHours: median(evidence.map((x) => x.r.replyHours).filter((h): h is number => h != null)),
    within7d: mean(evidence.map((x) => x.r.within7d as number)),
    within48h: mean(evidence.map((x) => x.r.within48h ?? 0)),
    mergeRate: mean(merge.map((x) => x.r.mergeRate as number)),
    mergeN: merge.length,
    freeIssues: rows.reduce((a, x) => a + x.r.available, 0),
    withFreeIssues: rows.filter((x) => x.r.available > 0).length,
    commits90d: rows.reduce((a, x) => a + (x.r.commits90d ?? 0), 0),
    stars: rows.reduce((a, x) => a + x.r.stars, 0),
    ghosts: ghostRows.length,
    friendliest: friendliestRows.slice(0, 5).map((x) => x.i),
    ghostList: ghostRows.slice(0, 3).map((x) => x.i),
  };
}

/** Stats for every district of a plan, biggest first. */
export function allDistrictStats(repos: CityRepo[], plan: CityPlan): DistrictStats[] {
  const groups = new Map<string, number[]>();
  for (const b of plan.buildings) {
    const list = groups.get(b.district) ?? [];
    list.push(b.index);
    groups.set(b.district, list);
  }
  return [...groups.entries()].map(([name, indices]) => districtStats(name, repos, indices)).sort((a, b) => b.count - a.count);
}

export type DistrictSort = "within7d" | "medianReplyHours" | "freeIssues" | "mergeRate" | "count";

/** Rank districts by a figure, ignoring districts with too little evidence. */
export function rankDistricts(stats: DistrictStats[], by: DistrictSort, minEvidence = 5): DistrictStats[] {
  const usable = stats.filter((s) => (by === "count" || by === "freeIssues" ? s.count > 0 : s.withEvidence >= minEvidence));
  return [...usable].sort((a, b) => {
    switch (by) {
      case "within7d":
        return (b.within7d ?? -1) - (a.within7d ?? -1);
      case "medianReplyHours":
        return (a.medianReplyHours ?? Infinity) - (b.medianReplyHours ?? Infinity);
      case "mergeRate":
        return (b.mergeRate ?? -1) - (a.mergeRate ?? -1);
      case "freeIssues":
        return b.freeIssues - a.freeIssues;
      case "count":
        return b.count - a.count;
    }
  });
}

import { MIN_REPLY_SAMPLE } from "./encode";
import type { CityFeed } from "./types";

export interface CityStats {
  projects: number;
  /** Outside pull requests answered within seven days, averaged over projects with enough data. */
  within7dShare: number | null;
  within7dProjects: number;
  freeIssues: number;
}

/** The three live numbers on the first screen. */
export function cityStats(feed: Pick<CityFeed, "repos">): CityStats {
  const withData = feed.repos.filter((r) => r.within7d != null && r.replyN >= MIN_REPLY_SAMPLE);
  const within7dShare =
    withData.length > 0
      ? withData.reduce((a, r) => a + (r.within7d ?? 0), 0) / withData.length
      : null;
  return {
    projects: feed.repos.length,
    within7dShare,
    within7dProjects: withData.length,
    freeIssues: feed.repos.reduce((a, r) => a + r.available, 0),
  };
}

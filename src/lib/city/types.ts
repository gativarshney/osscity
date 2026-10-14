/**
 * The city feed: one row per repository, shaped from Contributable's published index.
 * Every field here is one Contributable already publishes. Nothing is recomputed.
 */
export interface CityRepo {
  /** owner/name, as Contributable spells it */
  id: string;
  /** Description, one line. */
  d: string;
  stars: number;
  /** Languages by share of code, largest first, at most three. */
  lang: string[];
  fw: string[];
  topics: string[];
  /** Google Summer of Code organisation slug, and the years it took part. */
  gsoc: string | null;
  years: number[];
  /** Outside pull requests: share merged of those decided, and how many were decided. */
  mergeRate: number | null;
  decided: number;
  /** First human reply to outside pull requests: median hours and shares within 48 h / 7 d. */
  replyHours: number | null;
  within48h: number | null;
  within7d: number | null;
  /** Outside pull requests the reply figures are based on. */
  replyN: number;
  /** Beginner issues nobody has claimed and that are not stale. */
  available: number;
  helpWanted: number;
  commits90d: number | null;
  maintainers: number;
  pushedAt: string | null;
  /** Outside pull requests opened in the last year. */
  prsYear: number;
  trend: string;
  /** Core replies by hour of day in UTC, scaled 0 to 9; null when withheld. */
  hours: number[] | null;
  /** True when the project says it does not take pull requests. */
  noPulls?: boolean;
}

export interface CityFeed {
  v: 1;
  /** When Contributable generated the index this feed was shaped from. */
  generatedAt: string;
  /** Organisation slug to display name. */
  orgs: Record<string, string>;
  repos: CityRepo[];
}

/** Contributable's index row (version 2), as published on its data branch. */
export interface ContributableIndexRow {
  id: string;
  d: string;
  stars: number;
  lang: string[];
  fw: string[];
  topics: string[];
  gsoc: string | null;
  years: number[];
  updatedAt: string;
  mergeRate: number | null;
  decided: number;
  firstTimerRate: number | null;
  replyHours: number | null;
  within48h: number | null;
  within7d: number | null;
  replyN: number;
  mergeHours: number | null;
  issueReplyHours: number | null;
  available: number;
  helpWanted: number;
  commits90d: number | null;
  maintainers: number;
  pushedAt: string | null;
  cla: string;
  channels: string[];
  guide: boolean;
  noPulls?: boolean;
  trend: string;
  spark: number[];
  hours: number[] | null;
}

export interface ContributableIndex {
  v: number;
  generatedAt: string;
  rows: ContributableIndexRow[];
}

import "server-only";

import type {
  CityFeed,
  CityRepo,
  ContributableIndex,
  ContributableIndexRow,
} from "./types";

/**
 * Contributable publishes its index on the "data" branch of its repository and the
 * organisation list through its public API. OSS City reads both and never computes
 * a metric of its own.
 */
const DATA_BASE =
  process.env.CONTRIBUTABLE_DATA_URL?.trim() ||
  "https://raw.githubusercontent.com/gativarshney/contributable/data";
const API_BASE =
  process.env.CONTRIBUTABLE_API_URL?.trim() || "https://contributable.vercel.app/api/v1";

/** The published index format this code understands. */
const INDEX_VERSION = 2;

/** How long a copy may be served before checking for a newer snapshot. */
export const REVALIDATE_SECONDS = 900;

export function toCityRepo(row: ContributableIndexRow): CityRepo {
  const repo: CityRepo = {
    id: row.id,
    d: row.d,
    stars: row.stars,
    lang: row.lang,
    fw: row.fw,
    topics: row.topics,
    gsoc: row.gsoc,
    years: row.years,
    mergeRate: row.mergeRate,
    decided: row.decided,
    replyHours: row.replyHours,
    within48h: row.within48h,
    within7d: row.within7d,
    replyN: row.replyN,
    available: row.available,
    helpWanted: row.helpWanted,
    commits90d: row.commits90d,
    maintainers: row.maintainers,
    pushedAt: row.pushedAt,
    prsYear: row.spark.reduce((a, b) => a + b, 0),
    trend: row.trend,
    hours: row.hours,
  };
  if (row.noPulls) repo.noPulls = true;
  return repo;
}

async function readIndex(): Promise<ContributableIndex | null> {
  try {
    const response = await fetch(`${DATA_BASE}/index.json`, {
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as ContributableIndex;
    return body.v === INDEX_VERSION && Array.isArray(body.rows) ? body : null;
  } catch {
    return null;
  }
}

async function readOrgs(): Promise<Record<string, string>> {
  try {
    const response = await fetch(`${API_BASE}/orgs`, {
      next: { revalidate: REVALIDATE_SECONDS * 4 },
    });
    if (!response.ok) return {};
    const body = (await response.json()) as [name: string, slug: string][];
    return Object.fromEntries(body.map(([name, slug]) => [slug, name]));
  } catch {
    return {};
  }
}

/** The city feed, or null while Contributable's index is unavailable. */
export async function getCityFeed(): Promise<CityFeed | null> {
  const [index, orgs] = await Promise.all([readIndex(), readOrgs()]);
  if (!index) return null;
  return {
    v: 1,
    generatedAt: index.generatedAt,
    orgs,
    repos: index.rows.map(toCityRepo),
  };
}

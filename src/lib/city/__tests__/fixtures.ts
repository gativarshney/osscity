import type { CityRepo } from "../types";

export function repo(overrides: Partial<CityRepo> = {}): CityRepo {
  return {
    id: "example/project",
    d: "A project",
    stars: 120,
    lang: ["Python"],
    fw: ["Django"],
    topics: ["web"],
    gsoc: "example-org",
    years: [2025, 2026],
    mergeRate: 0.6,
    decided: 10,
    replyHours: 12,
    within48h: 0.7,
    within7d: 0.9,
    replyN: 12,
    available: 3,
    helpWanted: 1,
    commits90d: 80,
    maintainers: 4,
    pushedAt: "2026-10-01T00:00:00Z",
    prsYear: 40,
    trend: "steady",
    hours: null,
    ...overrides,
  };
}

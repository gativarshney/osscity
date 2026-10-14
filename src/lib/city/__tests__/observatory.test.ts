import { describe, expect, it } from "vitest";
import { allDistrictStats, districtStats, rankDistricts } from "../districts";
import { OTHER_ORGS, planCity } from "../layout";
import { DEFAULT_LENS, LENSES, lensById } from "../lens";
import { repo } from "./fixtures";

describe("lenses", () => {
  it("every lens reads every repository to a share between 0 and 1 and a colour", () => {
    const samples = [
      repo(),
      repo({ within48h: null, replyN: 0, mergeRate: null, decided: 0, available: 0, commits90d: 0 }),
      repo({ within48h: 0.1, replyN: 40, mergeRate: 0.1, decided: 30, available: 9, commits90d: 5000 }),
    ];
    for (const lens of LENSES) {
      for (const r of samples) {
        const reading = lens.read(r);
        expect(reading.share).toBeGreaterThanOrEqual(0);
        expect(reading.share).toBeLessThanOrEqual(1);
        expect(reading.colour).toMatch(/^#[0-9a-f]{6}$/i);
        expect(typeof lens.describe(r)).toBe("string");
      }
    }
  });
  it("marks withheld figures as not known", () => {
    const none = repo({ within48h: null, replyN: 2, mergeRate: null, decided: 1 });
    expect(lensById("replies").read(none).known).toBe(false);
    expect(lensById("merged").read(none).known).toBe(false);
    expect(lensById("evidence").read(none).known).toBe(false);
    expect(lensById("issues").read(none).known).toBe(true);
  });
  it("falls back to the default lens", () => {
    expect(lensById("nope").id).toBe(DEFAULT_LENS);
    expect(lensById(undefined).id).toBe(DEFAULT_LENS);
  });
});

describe("district stats", () => {
  const repos = [
    repo({ id: "a/a", replyHours: 2, within7d: 1, within48h: 0.9, replyN: 10, mergeRate: 0.8, decided: 10, available: 2, commits90d: 100, stars: 500 }),
    repo({ id: "b/b", replyHours: 10, within7d: 0.5, within48h: 0.3, replyN: 8, mergeRate: 0.4, decided: 6, available: 0, commits90d: 50, stars: 300 }),
    repo({ id: "c/c", replyHours: null, within7d: null, within48h: null, replyN: 1, mergeRate: null, decided: 0, available: 1, commits90d: 0, stars: 10 }),
    repo({ id: "d/d", replyHours: 300, within7d: 0.1, within48h: 0, replyN: 12, mergeRate: 0.2, decided: 8, available: 0, commits90d: 20, stars: 2000 }),
  ];
  it("aggregates only over repositories with evidence and keeps the sample", () => {
    const s = districtStats("Python", repos, [0, 1, 2, 3]);
    expect(s.count).toBe(4);
    expect(s.withEvidence).toBe(3);
    expect(s.medianReplyHours).toBe(10);
    expect(s.within7d).toBeCloseTo((1 + 0.5 + 0.1) / 3);
    expect(s.mergeN).toBe(3);
    expect(s.freeIssues).toBe(3);
    expect(s.withFreeIssues).toBe(2);
    expect(s.ghosts).toBe(1);
    expect(s.friendliest[0]).toBe(0);
    expect(s.ghostList).toEqual([3]);
  });
  it("has null figures without evidence", () => {
    const s = districtStats("Empty", repos, [2]);
    expect(s.medianReplyHours).toBeNull();
    expect(s.within7d).toBeNull();
    expect(s.mergeRate).toBeNull();
  });
  it("ranks districts and skips those without enough evidence", () => {
    const many = Array.from({ length: 6 }, (_, i) => repo({ id: `x/${i}`, within7d: 0.9, replyN: 10 }));
    const plan = planCity([...repos.map((r) => ({ ...r, lang: ["Go"] })), ...many.map((r) => ({ ...r, lang: ["Rust"] }))]);
    const stats = allDistrictStats([...repos.map((r) => ({ ...r, lang: ["Go"] })), ...many.map((r) => ({ ...r, lang: ["Rust"] }))], plan);
    const ranked = rankDistricts(stats, "within7d", 5);
    expect(ranked.map((s) => s.name)).toEqual(["Other languages"]);
    expect(rankDistricts(stats, "count", 5).length).toBeGreaterThan(0);
  });
});

describe("grouping by organisation", () => {
  it("names districts after organisations and pools the small ones", () => {
    const repos = [
      ...Array.from({ length: 9 }, (_, i) => repo({ id: `a/${i}`, gsoc: "org-a" })),
      ...Array.from({ length: 2 }, (_, i) => repo({ id: `b/${i}`, gsoc: "org-b" })),
      repo({ id: "c/0", gsoc: null }),
    ];
    const plan = planCity(repos, { groupBy: "org", orgNames: { "org-a": "Org A" } });
    const names = plan.districts.map((d) => d.name).sort();
    expect(names).toEqual(["Org A", OTHER_ORGS]);
    expect(plan.districts.find((d) => d.name === OTHER_ORGS)?.count).toBe(3);
  });
});

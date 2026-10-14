import { describe, expect, it } from "vitest";
import { activityAt, awakeAt, busiestHours, isAwake } from "../awake";
import { planRoute } from "../route";
import { repo } from "./fixtures";

const profile = (peaks: number[]) => {
  const h = new Array<number>(24).fill(0);
  for (const p of peaks) h[p] = 9;
  return h;
};

describe("awake now", () => {
  it("reads the profile at a UTC hour and wraps", () => {
    const r = repo({ hours: profile([9, 10]) });
    expect(activityAt(r, 9)).toBe(9);
    expect(activityAt(r, 33)).toBe(9);
    expect(activityAt(r, 3)).toBe(0);
    expect(activityAt(repo({ hours: null }), 9)).toBeNull();
  });
  it("counts a project as awake near its peak only", () => {
    const r = repo({ hours: profile([14]) });
    expect(isAwake(r, 14)).toBe(true);
    expect(isAwake(r, 2)).toBe(false);
    expect(isAwake(repo({ hours: null }), 14)).toBe(false);
  });
  it("lists who is awake and the busiest hours", () => {
    const repos = [repo({ hours: profile([9]) }), repo({ hours: profile([9, 21]) }), repo({ hours: null })];
    expect(awakeAt(repos, 9)).toEqual([0, 1]);
    expect(awakeAt(repos, 21)).toEqual([1]);
    expect(busiestHours(repos)[0]).toBe(9);
  });
});

describe("your route", () => {
  const repos = [
    repo({ id: "a/big", within48h: 0.9, within7d: 1, mergeRate: 0.8, available: 0, commits90d: 900, replyN: 20 }),
    repo({ id: "b/small", within48h: 0.8, within7d: 0.9, mergeRate: 0.7, available: 3, commits90d: 20, replyN: 10 }),
    repo({ id: "c/mid", within48h: 0.7, within7d: 0.9, mergeRate: 0.6, available: 1, commits90d: 200, replyN: 10 }),
    repo({ id: "d/nodata", within48h: null, replyN: 0 }),
    repo({ id: "e/slow", within48h: 0.1, within7d: 0.2, mergeRate: 0.2, available: 0, commits90d: 50, replyN: 10 }),
  ];
  it("starts with a friendly project that has free issues and climbs by activity", () => {
    const route = planRoute(repos, [0, 1, 2, 3, 4]);
    expect(route.map((s) => repos[s.index].id)).toEqual(["b/small", "e/slow", "c/mid", "a/big"]);
    expect(route[0].why).toMatch(/^Start here/);
    expect(route[route.length - 1].why).toMatch(/^Then aim here/);
  });
  it("skips projects without enough data and handles an empty stack", () => {
    expect(planRoute(repos, [3])).toEqual([]);
    expect(planRoute(repos, [])).toEqual([]);
  });
});

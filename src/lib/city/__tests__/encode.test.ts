import { describe, expect, it } from "vitest";
import {
  activityScore,
  facadeColour,
  friendliest,
  friendliness,
  ghostTowns,
  heightFor,
  isGhostTown,
  lightFor,
  MAX_HEIGHT,
  MIN_HEIGHT,
  windowColour,
} from "../encode";
import { repo } from "./fixtures";

describe("height", () => {
  it("is the minimum for a project with no activity", () => {
    expect(heightFor(repo({ commits90d: 0, prsYear: 0 }))).toBe(MIN_HEIGHT);
    expect(heightFor(repo({ commits90d: null, prsYear: 0 }))).toBe(MIN_HEIGHT);
  });
  it("grows with activity and never passes the maximum", () => {
    const quiet = heightFor(repo({ commits90d: 5, prsYear: 2 }));
    const busy = heightFor(repo({ commits90d: 300, prsYear: 150 }));
    const huge = heightFor(repo({ commits90d: 9000, prsYear: 5000 }));
    expect(quiet).toBeGreaterThan(MIN_HEIGHT);
    expect(busy).toBeGreaterThan(quiet);
    expect(huge).toBe(MAX_HEIGHT);
  });
  it("saturates activity at one", () => {
    expect(activityScore({ commits90d: 100000, prsYear: 0 })).toBe(1);
  });
});

describe("light", () => {
  it("is unknown without enough pull requests", () => {
    expect(lightFor(repo({ within48h: null, replyN: 0 })).kind).toBe("unknown");
    expect(lightFor(repo({ within48h: 0.9, replyN: 3 })).kind).toBe("unknown");
  });
  it("is lit when most pull requests get a reply within two days", () => {
    const { kind, share } = lightFor(repo({ within48h: 0.8, replyN: 10 }));
    expect(kind).toBe("lit");
    expect(share).toBeGreaterThan(0.8);
  });
  it("is dark when almost none do", () => {
    const { kind, share } = lightFor(repo({ within48h: 0.05, replyN: 10 }));
    expect(kind).toBe("dark");
    expect(share).toBeLessThan(0.1);
  });
  it("maps kinds to colours", () => {
    expect(windowColour("lit")).toMatch(/^#/);
    expect(windowColour("unknown")).not.toBe(windowColour("lit"));
    expect(facadeColour("dark")).not.toBe(facadeColour("lit"));
  });
});

describe("ghost towns", () => {
  it("are popular projects that rarely answer", () => {
    expect(isGhostTown(repo({ stars: 500, within7d: 0.1, replyN: 8 }))).toBe(true);
  });
  it("exclude small projects and projects without enough data", () => {
    expect(isGhostTown(repo({ stars: 20, within7d: 0.1, replyN: 8 }))).toBe(false);
    expect(isGhostTown(repo({ stars: 500, within7d: null, replyN: 0 }))).toBe(false);
    expect(isGhostTown(repo({ stars: 500, within7d: 0.1, replyN: 2 }))).toBe(false);
  });
  it("lists the quietest first", () => {
    const list = ghostTowns([
      repo({ id: "a/a", stars: 500, within7d: 0.3, replyN: 8 }),
      repo({ id: "b/b", stars: 300, within7d: 0.0, replyN: 8 }),
      repo({ id: "c/c", stars: 300, within7d: 0.9, replyN: 8 }),
    ]);
    expect(list.map((r) => r.id)).toEqual(["b/b", "a/a"]);
  });
});

describe("friendliness", () => {
  it("is null without enough data or when pull requests are not taken", () => {
    expect(friendliness(repo({ within48h: null, replyN: 0 }))).toBeNull();
    expect(friendliness(repo({ noPulls: true }))).toBeNull();
  });
  it("prefers fast replies, merged work and free issues", () => {
    const fast = friendliness(
      repo({ within48h: 0.9, within7d: 1, mergeRate: 0.8, available: 5 }),
    ) as number;
    const slow = friendliness(
      repo({ within48h: 0.2, within7d: 0.4, mergeRate: 0.2, available: 0 }),
    ) as number;
    expect(fast).toBeGreaterThan(slow);
    expect(fast).toBeLessThanOrEqual(1);
  });
  it("picks the ten friendliest", () => {
    const repos = Array.from({ length: 30 }, (_, i) =>
      repo({ id: `r/${i}`, within48h: i / 30, within7d: i / 30, replyN: 10 }),
    );
    const top = friendliest(repos);
    expect(top).toHaveLength(10);
    expect(top[0].id).toBe("r/29");
  });
});

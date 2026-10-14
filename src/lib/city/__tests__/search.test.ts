import { describe, expect, it } from "vitest";
import { busiestRange, shiftHours, zoneOffsetHours } from "../hours";
import { parseTerms, searchRepos } from "../search";
import { cityStats } from "../stats";
import { repo } from "./fixtures";

describe("search", () => {
  const repos = [
    repo({ id: "a/django-app", lang: ["Python"], fw: ["Django"], topics: [] }),
    repo({ id: "b/site", lang: ["TypeScript"], fw: ["Next.js"], topics: ["web"] }),
    repo({ id: "c/tool", lang: ["Rust"], fw: [], topics: [] }),
  ];
  it("splits on commas and spaces", () => {
    expect(parseTerms("python, django  rust")).toEqual(["python", "django", "rust"]);
    expect(parseTerms("  ")).toEqual([]);
  });
  it("matches language, framework, topic and name", () => {
    expect([...searchRepos(repos, "python")]).toEqual([0]);
    expect([...searchRepos(repos, "next")]).toEqual([1]);
    expect([...searchRepos(repos, "web, rust")]).toEqual([1, 2]);
    expect([...searchRepos(repos, "tool")]).toEqual([2]);
    expect(searchRepos(repos, "").size).toBe(0);
  });
  it("matches short terms as whole words only", () => {
    const list = [
      repo({ id: "x/django-app", lang: ["Python"], fw: ["Django"], topics: ["google"] }),
      repo({ id: "y/server", lang: ["Go"], fw: [], topics: [] }),
    ];
    expect([...searchRepos(list, "go")]).toEqual([1]);
    expect([...searchRepos(list, "goo")]).toEqual([0]);
    expect([...searchRepos(list, "c++")]).toEqual([]);
  });
});

describe("stats", () => {
  it("counts projects, free issues and the seven day share over projects with data", () => {
    const s = cityStats({
      repos: [
        repo({ within7d: 1, replyN: 10, available: 2 }),
        repo({ within7d: 0.5, replyN: 10, available: 3 }),
        repo({ within7d: null, replyN: 0, available: 0 }),
      ],
    });
    expect(s.projects).toBe(3);
    expect(s.freeIssues).toBe(5);
    expect(s.within7dProjects).toBe(2);
    expect(s.within7dShare).toBeCloseTo(0.75);
  });
  it("has no share when nobody has data", () => {
    expect(cityStats({ repos: [repo({ within7d: null, replyN: 0 })] }).within7dShare).toBeNull();
  });
});

describe("hours", () => {
  it("shifts a UTC profile into India Standard Time", () => {
    const utc = new Array<number>(24).fill(0);
    utc[9] = 9;
    const offset = zoneOffsetHours("Asia/Kolkata", new Date("2026-01-15T00:00:00Z"));
    expect(offset).toBe(6); // 5.5 hours rounds to 6
    expect(shiftHours(utc, offset).indexOf(9)).toBe(15);
  });
  it("names the busiest run of hours", () => {
    const p = new Array<number>(24).fill(0);
    p[14] = 9;
    p[15] = 8;
    p[16] = 7;
    expect(busiestRange(p)).toBe("14:00 to 17:00");
    expect(busiestRange(new Array<number>(24).fill(0))).toBeNull();
  });
  it("wraps past midnight", () => {
    const p = new Array<number>(24).fill(0);
    p[23] = 9;
    p[0] = 9;
    expect(busiestRange(p)).toBe("23:00 to 01:00");
  });
});

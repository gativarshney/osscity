import { describe, expect, it } from "vitest";
import { districtOf, OTHER_DISTRICT, planCity, PLOT, spiralCells } from "../layout";
import { repo } from "./fixtures";

const sample = [
  ...Array.from({ length: 20 }, (_, i) =>
    repo({ id: `py/${i}`, lang: ["Python"], commits90d: i * 10 }),
  ),
  ...Array.from({ length: 9 }, (_, i) => repo({ id: `ts/${i}`, lang: ["TypeScript"] })),
  ...Array.from({ length: 3 }, (_, i) => repo({ id: `hs/${i}`, lang: ["Haskell"] })),
  repo({ id: "none/0", lang: [] }),
];

describe("planCity", () => {
  const plan = planCity(sample);

  it("places every repository exactly once, in input order", () => {
    expect(plan.buildings).toHaveLength(sample.length);
    expect(plan.buildings.map((b) => b.index)).toEqual(sample.map((_, i) => i));
  });

  it("groups small languages into one district", () => {
    const names = plan.districts.map((d) => d.name).sort();
    expect(names).toEqual([OTHER_DISTRICT, "Python", "TypeScript"]);
    expect(plan.districts.find((d) => d.name === OTHER_DISTRICT)?.count).toBe(4);
  });

  it("never puts two buildings on the same plot", () => {
    const seen = new Set(plan.buildings.map((b) => `${b.x.toFixed(3)}:${b.z.toFixed(3)}`));
    expect(seen.size).toBe(plan.buildings.length);
  });

  it("keeps every building inside its district", () => {
    for (const b of plan.buildings) {
      const d = plan.districts.find((d) => d.name === b.district);
      expect(d).toBeDefined();
      if (!d) continue;
      expect(Math.abs(b.x - d.x)).toBeLessThanOrEqual(d.width / 2);
      expect(Math.abs(b.z - d.z)).toBeLessThanOrEqual(d.depth / 2);
    }
  });

  it("is centred on the origin", () => {
    const xs = plan.buildings.map((b) => b.x);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(-plan.halfWidth - PLOT);
    expect(Math.max(...xs)).toBeLessThanOrEqual(plan.halfWidth + PLOT);
  });

  it("is deterministic", () => {
    expect(planCity(sample)).toEqual(plan);
  });

  it("puts the tallest Python building nearest the district centre", () => {
    const python = plan.districts.find((d) => d.name === "Python");
    if (!python) throw new Error("no Python district");
    const inDistrict = plan.buildings.filter((b) => b.district === "Python");
    const tallest = [...inDistrict].sort((a, b) => b.height - a.height)[0];
    const nearest = Math.min(...inDistrict.map((b) => Math.hypot(b.x - python.x, b.z - python.z)));
    expect(Math.hypot(tallest.x - python.x, tallest.z - python.z)).toBeLessThanOrEqual(
      nearest + 1e-9,
    );
  });

  it("handles an empty city", () => {
    const empty = planCity([]);
    expect(empty.buildings).toEqual([]);
    expect(empty.districts).toEqual([]);
  });
});

describe("helpers", () => {
  it("spiralCells covers the grid once", () => {
    const cells = spiralCells(3, 2);
    expect(cells).toHaveLength(6);
    expect(new Set(cells.map((c) => c.join(","))).size).toBe(6);
  });
  it("districtOf falls back to the shared district", () => {
    const counts = new Map([["Go", 2]]);
    expect(districtOf({ lang: ["Go"] }, counts)).toBe(OTHER_DISTRICT);
    expect(districtOf({ lang: [] }, counts)).toBe(OTHER_DISTRICT);
  });
});

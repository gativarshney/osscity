import { heightFor } from "./encode";
import type { CityRepo } from "./types";

/**
 * The city plan. One building per repository, grouped into districts by main
 * language. Districts are rectangles separated by streets, packed row by row from
 * the biggest down, and the plan is deterministic so the same data always builds
 * the same city.
 */

export const PLOT = 1.6;
export const STREET = 3.2;
export const OTHER_DISTRICT = "Other languages";
/** Languages with fewer repositories than this share a district. */
export const MIN_DISTRICT_SIZE = 8;

export interface Building {
  index: number;
  id: string;
  x: number;
  z: number;
  height: number;
  /** Footprint, both axes. */
  size: number;
  district: string;
}

export interface District {
  name: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  count: number;
}

export interface CityPlan {
  buildings: Building[];
  districts: District[];
  /** Half extents of the whole city. */
  halfWidth: number;
  halfDepth: number;
}

/** Districts can group by main language or by Google Summer of Code organisation. */
export type GroupBy = "language" | "org";
export const OTHER_ORGS = "Other organisations";

export interface PlanOptions {
  groupBy?: GroupBy;
  /** Organisation slug to display name, for org districts. */
  orgNames?: Record<string, string>;
}

export function districtOf(repo: Pick<CityRepo, "lang">, counts: Map<string, number>): string {
  const main = repo.lang[0];
  if (!main) return OTHER_DISTRICT;
  return (counts.get(main) ?? 0) >= MIN_DISTRICT_SIZE ? main : OTHER_DISTRICT;
}

/** The key a repository groups under, or null when it has none. */
function groupKey(repo: CityRepo, groupBy: GroupBy): string | null {
  return groupBy === "org" ? repo.gsoc : (repo.lang[0] ?? null);
}

function groupByDistrict(repos: CityRepo[], options: PlanOptions): Map<string, number[]> {
  const groupBy = options.groupBy ?? "language";
  const other = groupBy === "org" ? OTHER_ORGS : OTHER_DISTRICT;
  const counts = new Map<string, number>();
  for (const repo of repos) {
    const key = groupKey(repo, groupBy);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const groups = new Map<string, number[]>();
  repos.forEach((repo, index) => {
    const key = groupKey(repo, groupBy);
    let name = other;
    if (key && (counts.get(key) ?? 0) >= MIN_DISTRICT_SIZE) {
      name = groupBy === "org" ? (options.orgNames?.[key] ?? key) : key;
    }
    const list = groups.get(name) ?? [];
    list.push(index);
    groups.set(name, list);
  });
  return groups;
}

/** Footprint grows gently with stars, so popular projects read as bigger blocks. */
export function footprintFor(repo: Pick<CityRepo, "stars">): number {
  const s = Math.log10(Math.max(1, repo.stars));
  return 0.7 + Math.min(0.5, s * 0.12);
}

interface Block {
  name: string;
  indices: number[];
  cols: number;
  rows: number;
  width: number;
  depth: number;
}

export function planCity(repos: CityRepo[], options: PlanOptions = {}): CityPlan {
  const groups = [...groupByDistrict(repos, options).entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
  );

  // Each district is a near-square grid of plots. Tall buildings sit in the middle.
  const blocks: Block[] = groups.map(([name, indices]) => {
    const sorted = [...indices].sort((a, b) => heightFor(repos[b]) - heightFor(repos[a]));
    const cols = Math.max(1, Math.ceil(Math.sqrt(sorted.length * 1.15)));
    const rows = Math.ceil(sorted.length / cols);
    return { name, indices: sorted, cols, rows, width: cols * PLOT, depth: rows * PLOT };
  });

  const totalArea = blocks.reduce((a, b) => a + (b.width + STREET) * (b.depth + STREET), 0);
  const targetWidth = Math.sqrt(totalArea) * 1.25;

  // Shelf packing: fill a row until it would overflow the target width, then start another.
  const placed: { block: Block; x: number; z: number }[] = [];
  let cursorX = 0;
  let cursorZ = 0;
  let rowDepth = 0;
  for (const block of blocks) {
    if (cursorX > 0 && cursorX + block.width > targetWidth) {
      cursorX = 0;
      cursorZ += rowDepth + STREET;
      rowDepth = 0;
    }
    placed.push({ block, x: cursorX, z: cursorZ });
    cursorX += block.width + STREET;
    rowDepth = Math.max(rowDepth, block.depth);
  }

  const maxX = placed.length ? Math.max(...placed.map((p) => p.x + p.block.width)) : 0;
  const maxZ = placed.length ? Math.max(...placed.map((p) => p.z + p.block.depth)) : 0;
  const offsetX = maxX / 2;
  const offsetZ = maxZ / 2;

  const buildings: Building[] = [];
  const districts: District[] = [];
  for (const { block, x, z } of placed) {
    districts.push({
      name: block.name,
      x: x + block.width / 2 - offsetX,
      z: z + block.depth / 2 - offsetZ,
      width: block.width,
      depth: block.depth,
      count: block.indices.length,
    });
    // Cells ordered from the centre outwards, so the tallest buildings are in the middle.
    const cells = spiralCells(block.cols, block.rows);
    block.indices.forEach((index, i) => {
      const [c, r] = cells[i];
      const repo = repos[index];
      buildings.push({
        index,
        id: repo.id,
        x: x + c * PLOT + PLOT / 2 - offsetX,
        z: z + r * PLOT + PLOT / 2 - offsetZ,
        height: heightFor(repo),
        size: footprintFor(repo),
        district: block.name,
      });
    });
  }
  buildings.sort((a, b) => a.index - b.index);

  return { buildings, districts, halfWidth: maxX / 2, halfDepth: maxZ / 2 };
}

/** Grid cells ordered by distance from the centre, nearest first. */
export function spiralCells(cols: number, rows: number): [number, number][] {
  const cells: [number, number][] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push([c, r]);
  const cx = (cols - 1) / 2;
  const cz = (rows - 1) / 2;
  return cells.sort((a, b) => {
    const da = (a[0] - cx) ** 2 + (a[1] - cz) ** 2;
    const db = (b[0] - cx) ** 2 + (b[1] - cz) ** 2;
    return da - db || a[1] - b[1] || a[0] - b[0];
  });
}

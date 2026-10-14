import { create } from "zustand";
import { awakeAt, utcHour } from "./city/awake";
import { friendliest, ghostTowns } from "./city/encode";
import { planRoute, type RouteStop } from "./city/route";
import { planCity, type CityPlan } from "./city/layout";
import { searchRepos } from "./city/search";
import type { CityFeed, CityRepo } from "./city/types";

export type Mode = "explore" | "tour" | "ghosts" | "compare" | "awake";
export type View = "3d" | "2d";

/** A place the camera is asked to go. */
export interface CameraGoal {
  /** Point to look at. */
  target: [number, number, number];
  /** Distance and angle from the target. */
  distance: number;
  /** Azimuth in radians. */
  azimuth: number;
  /** Elevation in radians above the ground plane. */
  elevation: number;
  /** Seconds the flight should take. */
  seconds: number;
  /** Serial, so the same goal can be requested twice. */
  serial: number;
}

/** A camera instruction from the view controls. */
export type CameraCommand =
  | { kind: "overview" }
  | { kind: "top" }
  | { kind: "street" }
  | { kind: "rotate"; by: number }
  | { kind: "tilt"; by: number }
  | { kind: "zoom"; factor: number }
  | { kind: "frame"; indices: number[]; seconds?: number };

/** How long the tour rests at each stop before moving on, in milliseconds. */
export const TOUR_DWELL_MS = 4500;

interface CityState {
  feed: CityFeed | null;
  plan: CityPlan | null;
  loadError: boolean;
  setFeed: (feed: CityFeed) => void;
  setLoadError: () => void;

  view: View;
  setView: (view: View) => void;
  /** True once the opening flight has ended or been skipped. */
  introDone: boolean;
  finishIntro: () => void;
  /** True once the WebGL scene has drawn its first frame. */
  sceneReady: boolean;
  setSceneReady: () => void;

  query: string;
  matches: Set<number> | null;
  setQuery: (query: string) => void;

  hovered: number | null;
  setHovered: (index: number | null) => void;
  selected: number | null;
  select: (index: number | null) => void;

  mode: Mode;
  setMode: (mode: Mode) => void;
  /** Indices of the ten friendliest. */
  friendliest: number[];
  /** The stops of the current tour: the friendliest ten, or a route through a stack. */
  tour: number[];
  /** What the current tour is called. */
  tourTitle: string;
  /** Why each stop is on the tour, when it is a route. */
  tourWhy: string[];
  /** Start a tour through these buildings. */
  startTour: (indices: number[], title: string, why?: string[]) => void;
  /** The route through the current search, or empty. */
  route: RouteStop[];
  /** The UTC hour "Awake now" looks at, and who is awake then. */
  awakeHour: number;
  awake: number[];
  setAwakeHour: (hour: number) => void;
  /** Current stop. Equal to tour.length once the tour has finished. */
  tourStep: number;
  /** Whether the tour moves on by itself. */
  tourPlaying: boolean;
  setTourStep: (step: number) => void;
  setTourPlaying: (playing: boolean) => void;
  nextStop: () => void;
  previousStop: () => void;
  /** Indices of the ghost towns. */
  ghosts: number[];
  /** Up to two picks for the comparison. */
  compare: number[];
  togglePick: (index: number) => void;
  clearPicks: () => void;

  goal: CameraGoal | null;
  flyTo: (goal: Omit<CameraGoal, "serial">) => void;
  command: (CameraCommand & { serial: number }) | null;
  sendCommand: (command: CameraCommand) => void;
  /** Fly so that these buildings fill the view. */
  frame: (indices: number[], seconds?: number) => void;
  resetSerial: number;
  resetView: () => void;
}

let serial = 0;

export const useCity = create<CityState>((set, get) => ({
  feed: null,
  plan: null,
  loadError: false,
  setFeed: (feed) => {
    const plan = planCity(feed.repos);
    const byId = new Map(feed.repos.map((r, i) => [r.id, i]));
    const top = friendliest(feed.repos, 10).map((r) => byId.get(r.id) as number);
    const ghosts = ghostTowns(feed.repos, 40).map((r) => byId.get(r.id) as number);
    const awakeHour = utcHour();
    set({
      feed,
      plan,
      friendliest: top,
      tour: top,
      tourTitle: "The ten friendliest",
      tourWhy: [],
      ghosts,
      awakeHour,
      awake: awakeAt(feed.repos, awakeHour),
      loadError: false,
    });
  },
  setLoadError: () => set({ loadError: true }),

  view: "3d",
  setView: (view) => set({ view }),
  introDone: false,
  finishIntro: () => set({ introDone: true }),
  sceneReady: false,
  setSceneReady: () => set({ sceneReady: true }),

  query: "",
  matches: null,
  setQuery: (query) => {
    const feed = get().feed;
    const matches = feed && query.trim() ? searchRepos(feed.repos, query) : null;
    const route = feed && matches ? planRoute(feed.repos, [...matches]) : [];
    set({ query, matches, route });
  },

  hovered: null,
  setHovered: (hovered) => {
    if (get().hovered !== hovered) set({ hovered });
  },
  selected: null,
  select: (selected) => set({ selected }),

  mode: "explore",
  setMode: (mode) => {
    const changes: Partial<CityState> = { mode, tourStep: 0, tourPlaying: mode === "tour" };
    if (mode !== "compare") changes.compare = [];
    if (mode === "tour") {
      // Plain "tour" means the friendliest ten; routes start through startTour.
      changes.tour = get().friendliest;
      changes.tourTitle = "The ten friendliest";
      changes.tourWhy = [];
      changes.selected = null;
      changes.introDone = true;
    }
    if (mode === "awake") {
      const feed = get().feed;
      const awakeHour = utcHour();
      changes.awakeHour = awakeHour;
      changes.awake = feed ? awakeAt(feed.repos, awakeHour) : [];
      changes.selected = null;
      changes.introDone = true;
    }
    set(changes);
  },
  friendliest: [],
  tour: [],
  tourTitle: "The ten friendliest",
  tourWhy: [],
  startTour: (indices, title, why = []) => {
    if (indices.length === 0) return;
    set({ mode: "tour", tour: indices, tourTitle: title, tourWhy: why, tourStep: 0, tourPlaying: true, selected: null, compare: [], introDone: true });
  },
  route: [],
  awakeHour: 0,
  awake: [],
  setAwakeHour: (hour) => {
    const feed = get().feed;
    const h = ((hour % 24) + 24) % 24;
    set({ awakeHour: h, awake: feed ? awakeAt(feed.repos, h) : [] });
  },
  tourStep: 0,
  tourPlaying: false,
  setTourStep: (tourStep) => set({ tourStep }),
  setTourPlaying: (tourPlaying) => set({ tourPlaying }),
  nextStop: () => {
    const { tourStep, tour } = get();
    set({ tourStep: Math.min(tour.length, tourStep + 1) });
  },
  previousStop: () => {
    const { tourStep } = get();
    set({ tourStep: Math.max(0, tourStep - 1), tourPlaying: false });
  },
  ghosts: [],
  compare: [],
  togglePick: (index) => {
    const picks = get().compare;
    if (picks.includes(index)) set({ compare: picks.filter((p) => p !== index) });
    else set({ compare: [...picks.slice(-1), index] });
  },
  clearPicks: () => set({ compare: [] }),

  goal: null,
  flyTo: (goal) => set({ goal: { ...goal, serial: ++serial } }),
  command: null,
  sendCommand: (command) => set({ command: { ...command, serial: ++serial } }),
  frame: (indices, seconds = 1.3) => {
    const plan = get().plan;
    if (!plan || indices.length === 0) return;
    set({ goal: { ...frameGoal(plan, indices, seconds), serial: ++serial } });
  },
  resetSerial: 0,
  resetView: () => set({ resetSerial: ++serial, selected: null, goal: null }),
}));

/** The repository at an index, or null. */
export function repoAt(feed: CityFeed | null, index: number | null): CityRepo | null {
  if (!feed || index == null) return null;
  return feed.repos[index] ?? null;
}

/** A camera goal that frames one building nicely. */
export function buildingGoal(
  b: { x: number; z: number; height: number },
  azimuth = Math.PI / 5,
  seconds = 1.2,
): Omit<CameraGoal, "serial"> {
  return {
    target: [b.x, b.height * 0.45, b.z],
    distance: 14 + b.height * 1.4,
    azimuth,
    elevation: 0.48,
    seconds,
  };
}

/** A goal that frames a set of buildings: look at their centre from far enough to see them all. */
export function frameGoal(plan: CityPlan, indices: number[], seconds = 1.3): Omit<CameraGoal, "serial"> {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let maxH = 0;
  for (const i of indices) {
    const b = plan.buildings[i];
    if (!b) continue;
    minX = Math.min(minX, b.x);
    maxX = Math.max(maxX, b.x);
    minZ = Math.min(minZ, b.z);
    maxZ = Math.max(maxZ, b.z);
    maxH = Math.max(maxH, b.height);
  }
  const span = Math.max(maxX - minX, maxZ - minZ, 6);
  return {
    target: [(minX + maxX) / 2, Math.min(maxH * 0.3, 4), (minZ + maxZ) / 2],
    distance: Math.max(16, span * 1.35 + maxH),
    azimuth: -0.55,
    elevation: 0.62,
    seconds,
  };
}

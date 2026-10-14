import { create } from "zustand";
import { friendliest, ghostTowns } from "./city/encode";
import { planCity, type CityPlan } from "./city/layout";
import { searchRepos } from "./city/search";
import type { CityFeed, CityRepo } from "./city/types";

export type Mode = "explore" | "tour" | "ghosts" | "compare";
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
  /** Indices of the ten friendliest, in tour order. */
  tour: number[];
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
    const tour = friendliest(feed.repos, 10).map((r) => byId.get(r.id) as number);
    const ghosts = ghostTowns(feed.repos, 40).map((r) => byId.get(r.id) as number);
    set({ feed, plan, tour, ghosts, loadError: false });
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
    set({ query, matches });
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
      changes.selected = null;
      changes.introDone = true;
    }
    set(changes);
  },
  tour: [],
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

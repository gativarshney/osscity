/** Which version of the city a visitor should get first. */

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function hasWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    return gl != null;
  } catch {
    return false;
  }
}

export function isPhone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 640px)").matches || navigator.maxTouchPoints > 1;
}

/** A rough reading of how much the device can take. */
export function isWeakDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return true;
  if (nav.deviceMemory != null && nav.deviceMemory <= 2) return true;
  if (navigator.hardwareConcurrency != null && navigator.hardwareConcurrency <= 2) return true;
  return false;
}

export type ViewChoice = { view: "3d" | "2d"; reason: string | null };

export function chooseView(): ViewChoice {
  if (!hasWebGL()) return { view: "2d", reason: "This browser cannot draw 3D, so here is the map." };
  if (prefersReducedMotion()) return { view: "2d", reason: "Reduced motion is on, so here is the map." };
  if (isWeakDevice()) return { view: "2d", reason: "This device is better served by the map." };
  return { view: "3d", reason: null };
}

/** Whether post-processing and the full window shader should run. */
export function highQuality(): boolean {
  return !isPhone() && !isWeakDevice();
}

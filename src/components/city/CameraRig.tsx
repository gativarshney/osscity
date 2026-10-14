"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { CityPlan } from "@/lib/city/layout";
import { buildingGoal, useCity, type CameraGoal } from "@/lib/store";

/** Where the camera sits: a point on the ground it looks at, and a spherical offset. */
interface Pose {
  target: THREE.Vector3;
  distance: number;
  azimuth: number;
  elevation: number;
}

interface Flight {
  from: Pose;
  to: Pose;
  start: number;
  seconds: number;
  /** Called once when the flight lands. */
  onDone?: () => void;
}

const MIN_ELEVATION = 0.12;
const MAX_ELEVATION = 1.45;

export function overviewPose(
  plan: CityPlan,
  wide = typeof window !== "undefined" && window.innerWidth >= 900,
): Pose {
  const azimuth = -0.55;
  // On wide screens the title sits on the left, so the city is framed to the right.
  const shift = wide ? Math.max(plan.halfWidth, plan.halfDepth) * 0.3 : 0;
  return {
    target: new THREE.Vector3(-Math.cos(azimuth) * shift, 0, Math.sin(azimuth) * shift),
    distance: Math.max(plan.halfWidth * 2.0, plan.halfDepth * 2.8),
    azimuth,
    elevation: 0.58,
  };
}

function introPose(plan: CityPlan): Pose {
  const span = Math.max(plan.halfWidth, plan.halfDepth);
  return {
    target: new THREE.Vector3(span * 0.4, 0, span * 0.6),
    distance: span * 1.1,
    azimuth: -1.9,
    elevation: 0.22,
  };
}

function clonePose(p: Pose): Pose {
  return { ...p, target: p.target.clone() };
}

const ease = (t: number) => {
  const c = Math.min(1, Math.max(0, t));
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};

function apply(camera: THREE.Camera, pose: Pose) {
  const { target, distance, azimuth, elevation } = pose;
  const y = Math.sin(elevation) * distance;
  const r = Math.cos(elevation) * distance;
  camera.position.set(
    target.x + Math.sin(azimuth) * r,
    target.y + y,
    target.z + Math.cos(azimuth) * r,
  );
  camera.lookAt(target);
}

interface Props {
  plan: CityPlan;
  /** Skip the opening flight entirely. */
  skipIntro: boolean;
}

export function CameraRig({ plan, skipIntro }: Props) {
  const { camera, gl } = useThree();
  const pose = useRef<Pose>(skipIntro ? overviewPose(plan) : introPose(plan));
  const flight = useRef<Flight | null>(null);
  const lastInput = useRef(0);
  const span = Math.max(plan.halfWidth, plan.halfDepth);

  const finishIntro = useCity((s) => s.finishIntro);
  const introDone = useCity((s) => s.introDone);

  const fly = (to: Pose, seconds: number, onDone?: () => void) => {
    flight.current = {
      from: clonePose(pose.current),
      to: clonePose(to),
      start: performance.now() / 1000,
      seconds,
      onDone,
    };
  };

  // Opening flight: glide over the skyline and settle on the overview.
  useEffect(() => {
    if (skipIntro) {
      finishIntro();
      return;
    }
    fly(overviewPose(plan), 3.4, finishIntro);
    // Frames pause in background tabs, so the overlay must not wait on the flight.
    const timer = setTimeout(finishIntro, 4200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, skipIntro]);

  // If the visitor skips, land quickly.
  useEffect(() => {
    if (introDone && flight.current && flight.current.seconds > 3) {
      const f = flight.current;
      flight.current = { ...f, from: clonePose(pose.current), start: performance.now() / 1000, seconds: 0.6, onDone: undefined };
    }
  }, [introDone]);

  // Goals requested from elsewhere (double-click, card, tour).
  const goal = useCity((s) => s.goal);
  useEffect(() => {
    if (!goal) return;
    fly(toPose(goal), goal.seconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal?.serial]);

  const resetSerial = useCity((s) => s.resetSerial);
  useEffect(() => {
    if (resetSerial) fly(overviewPose(plan), 1.4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSerial]);

  // The tour: fly to each stop; the caption decides when to move on.
  const mode = useCity((s) => s.mode);
  const tour = useCity((s) => s.tour);
  const tourStep = useCity((s) => s.tourStep);
  useEffect(() => {
    if (mode !== "tour" || tour.length === 0) return;
    if (tourStep >= tour.length) {
      fly(overviewPose(plan, false), 1.6);
      return;
    }
    const b = plan.buildings[tour[tourStep]];
    if (!b) return;
    fly(toPose({ ...buildingGoal(b, -0.9 + tourStep * 0.55, 1.1), serial: 0 }), 1.1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, tour, tourStep]);

  // Pointer and keyboard input.
  useEffect(() => {
    const el = gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    let moved = false;

    const interact = () => {
      lastInput.current = performance.now() / 1000;
      const s = useCity.getState();
      if (!s.introDone) s.finishIntro();
      flight.current = null;
    };

    const onDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      moved = false;
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };
    const onMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (Math.abs(dx) + Math.abs(dy) < 1) return;
      if (!moved && Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      if (!moved) return;
      interact();
      const p = pose.current;
      if (pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0) p.distance = clampDistance(p.distance * (pinch / d), span);
        pinch = d;
        p.azimuth -= dx * 0.004;
        return;
      }
      const rotate = e.buttons === 2 || e.shiftKey || e.ctrlKey || e.metaKey;
      if (rotate) {
        p.azimuth -= dx * 0.005;
        p.elevation = THREE.MathUtils.clamp(p.elevation + dy * 0.004, MIN_ELEVATION, MAX_ELEVATION);
      } else {
        // Drag to fly: move the look-at point along the ground, in camera-relative directions.
        const scale = (p.distance / el.clientHeight) * 1.6;
        const sin = Math.sin(p.azimuth);
        const cos = Math.cos(p.azimuth);
        const fx = -sin * dy * scale;
        const fz = -cos * dy * scale;
        const rx = -cos * dx * scale;
        const rz = sin * dx * scale;
        p.target.x = THREE.MathUtils.clamp(p.target.x + fx + rx, -span * 1.3, span * 1.3);
        p.target.z = THREE.MathUtils.clamp(p.target.z + fz + rz, -span * 1.3, span * 1.3);
      }
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = 0;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      interact();
      const p = pose.current;
      const factor = Math.exp(e.deltaY * 0.0012);
      p.distance = clampDistance(p.distance * factor, span);
    };
    const onContext = (e: Event) => e.preventDefault();

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("pointerleave", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("contextmenu", onContext);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("pointerleave", onUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("contextmenu", onContext);
    };
  }, [gl, span]);

  // Keys held down move the camera smoothly.
  const keys = useRef(new Set<string>());
  useEffect(() => {
    const isTyping = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
    };
    const onDown = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", "q", "e", "+", "-", "=", "_"].includes(k)) {
        e.preventDefault();
        keys.current.add(k);
        lastInput.current = performance.now() / 1000;
        flight.current = null;
        const s = useCity.getState();
        if (!s.introDone) s.finishIntro();
      }
    };
    const onUp = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  useFrame((_, delta) => {
    const now = performance.now() / 1000;
    const p = pose.current;
    const f = flight.current;
    if (f) {
      const t = ease((now - f.start) / f.seconds);
      p.target.lerpVectors(f.from.target, f.to.target, t);
      p.distance = THREE.MathUtils.lerp(f.from.distance, f.to.distance, t);
      p.azimuth = THREE.MathUtils.lerp(f.from.azimuth, f.to.azimuth, t);
      p.elevation = THREE.MathUtils.lerp(f.from.elevation, f.to.elevation, t);
      if (t >= 1) {
        flight.current = null;
        f.onDone?.();
      }
    } else {
      const k = keys.current;
      const step = p.distance * delta * 0.9;
      const sin = Math.sin(p.azimuth);
      const cos = Math.cos(p.azimuth);
      let fwd = 0;
      let side = 0;
      if (k.has("arrowup") || k.has("w")) fwd += 1;
      if (k.has("arrowdown") || k.has("s")) fwd -= 1;
      if (k.has("arrowleft") || k.has("a")) side -= 1;
      if (k.has("arrowright") || k.has("d")) side += 1;
      if (fwd || side) {
        p.target.x = THREE.MathUtils.clamp(p.target.x - sin * fwd * step + cos * side * step, -span * 1.3, span * 1.3);
        p.target.z = THREE.MathUtils.clamp(p.target.z - cos * fwd * step - sin * side * step, -span * 1.3, span * 1.3);
      }
      if (k.has("q")) p.azimuth += delta * 1.2;
      if (k.has("e")) p.azimuth -= delta * 1.2;
      if (k.has("+") || k.has("=")) p.distance = clampDistance(p.distance * (1 - delta * 1.4), span);
      if (k.has("-") || k.has("_")) p.distance = clampDistance(p.distance * (1 + delta * 1.4), span);

      // Gentle drift when nobody has touched the city for a while.
      const s = useCity.getState();
      if (s.introDone && s.mode === "explore" && s.selected == null && now - lastInput.current > 8) {
        p.azimuth += delta * 0.012;
      }
    }
    apply(camera, p);
  });

  return null;
}

function clampDistance(d: number, span: number): number {
  return THREE.MathUtils.clamp(d, 4, span * 4);
}

function toPose(goal: CameraGoal): Pose {
  return {
    target: new THREE.Vector3(...goal.target),
    distance: goal.distance,
    azimuth: goal.azimuth,
    elevation: goal.elevation,
  };
}

"use client";

import { Line } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { COLOURS } from "@/lib/city/encode";
import type { CityPlan } from "@/lib/city/layout";
import { useCity } from "@/lib/store";

/** A glowing path on the ground through the stops of a route tour. */
export function Route({ plan }: { plan: CityPlan }) {
  const mode = useCity((s) => s.mode);
  const tour = useCity((s) => s.tour);
  const why = useCity((s) => s.tourWhy);
  const step = useCity((s) => s.tourStep);
  const active = mode === "tour" && why.length > 0 && tour.length > 1;

  const points = useMemo(() => {
    if (!active) return [];
    const pts: THREE.Vector3[] = [];
    const stops = tour.map((i) => plan.buildings[i]).filter(Boolean);
    for (let i = 0; i < stops.length; i++) {
      const a = stops[i];
      pts.push(new THREE.Vector3(a.x, 0.08, a.z));
      const b = stops[i + 1];
      if (!b) break;
      // Walk along the streets: an L-shaped leg with a soft corner.
      const midX = b.x;
      pts.push(new THREE.Vector3(midX, 0.08, a.z));
    }
    return pts;
  }, [active, tour, plan]);

  if (!active || points.length < 2) return null;
  const done = points.slice(0, Math.min(points.length, step * 2 + 1));
  return (
    <group>
      <Line points={points} color={COLOURS.accent} lineWidth={1.5} transparent opacity={0.35} />
      {done.length >= 2 ? <Line points={done} color={COLOURS.accent} lineWidth={3} transparent opacity={0.95} /> : null}
      {tour.map((i, n) => {
        const b = plan.buildings[i];
        if (!b) return null;
        return (
          <mesh key={i} position={[b.x, 0.05, b.z]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[b.size * 0.9, b.size * 0.9 + 0.25, 32]} />
            <meshBasicMaterial color={COLOURS.accent} transparent opacity={n <= step ? 0.9 : 0.35} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}

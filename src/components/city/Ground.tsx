"use client";

import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { COLOURS } from "@/lib/city/encode";
import type { CityPlan } from "@/lib/city/layout";
import { useCity } from "@/lib/store";
import { plateFragment, plateVertex } from "./shaders";

const GROUND = "#070a14";
const PLATE = "#0b0f1d";

/** The ground, one lit plate per district, and painted district names. */
export function Ground({ plan }: { plan: CityPlan }) {
  const extent = Math.max(plan.halfWidth, plan.halfDepth) * 8 + 200;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow={false}>
        <planeGeometry args={[extent, extent]} />
        <meshBasicMaterial color={GROUND} fog />
      </mesh>
      {plan.districts.map((d) => (
        <Plate key={d.name} x={d.x} z={d.z} width={d.width} depth={d.depth} name={d.name} />
      ))}
    </group>
  );
}

function Plate({
  x,
  z,
  width,
  depth,
  name,
}: {
  x: number;
  z: number;
  width: number;
  depth: number;
  name: string;
}) {
  const pad = 1.2;
  const w = width + pad;
  const d = depth + pad;
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: plateVertex,
        fragmentShader: plateFragment,
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          {
            uSize: { value: new THREE.Vector2(w, d) },
            uColour: { value: new THREE.Color(PLATE) },
            uEdge: { value: new THREE.Color(COLOURS.accent) },
            uGlow: { value: 1 },
            uTime: { value: 0 },
          },
        ]),
        fog: true,
      }),
    [w, d],
  );

  // Districts that match the search glow brighter; the rest fade.
  const matches = useCity((s) => s.matches);
  const feed = useCity((s) => s.feed);
  const plan = useCity((s) => s.plan);
  const glow = useMemo(() => {
    if (!matches || !feed || !plan) return 1;
    const hit = plan.buildings.some((b) => b.district === name && matches.has(b.index));
    return hit ? 2.2 : 0.25;
  }, [matches, feed, plan, name]);

  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    const u = material.uniforms.uGlow;
    u.value += (glow - u.value) * 0.08;
  });

  return (
    <group position={[x, 0, z]}>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} material={material}>
        <planeGeometry args={[w, d]} />
      </mesh>
      <Text
        position={[0, 0.02, d / 2 + 1.1]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={Math.min(2.2, Math.max(0.9, w / 9))}
        color={COLOURS.accent}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.12}
        fillOpacity={0.8}
      >
        {name.toUpperCase()}
      </Text>
    </group>
  );
}

"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { COLOURS, facadeColour, lightFor } from "@/lib/city/encode";
import { lensById } from "@/lib/city/lens";
import type { CityPlan } from "@/lib/city/layout";
import type { CityFeed } from "@/lib/city/types";
import { useCity } from "@/lib/store";
import { buildingFragment, buildingVertex } from "./shaders";

interface Props {
  feed: CityFeed;
  plan: CityPlan;
  interactive: boolean;
}

/** Visual state per building: 0 normal, 1 dimmed, 2 highlighted, 3 selected. */
function stateOf(
  index: number,
  s: {
    matches: Set<number> | null;
    mode: string;
    tour: number[];
    tourStep: number;
    ghosts: number[];
    awake: number[];
    compare: number[];
    selected: number | null;
  },
): number {
  if (s.selected === index) return 3;
  if (s.mode === "compare") {
    if (s.compare.includes(index)) return 3;
    if (s.matches) return s.matches.has(index) ? 2 : 1;
    return 0;
  }
  if (s.mode === "tour") {
    if (s.tourStep >= s.tour.length) return s.tour.includes(index) ? 3 : 1;
    if (s.tour[s.tourStep] === index) return 3;
    return s.tour.includes(index) ? 2 : 1;
  }
  if (s.mode === "ghosts") return s.ghosts.includes(index) ? 2 : 1;
  if (s.mode === "awake") return s.awake.includes(index) ? 2 : 1;
  if (s.matches) return s.matches.has(index) ? 2 : 1;
  return 0;
}

export function Buildings({ feed, plan, interactive }: Props) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = plan.buildings.length;

  const geometry = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1);
    g.translate(0, 0.5, 0);
    return g;
  }, []);

  const material = useMemo(() => {
    const m = new THREE.ShaderMaterial({
      vertexShader: buildingVertex,
      fragmentShader: buildingFragment,
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uAccent: { value: new THREE.Color(COLOURS.accent) },
          uCamera: { value: new THREE.Vector3() },
          uDetail: { value: 1 },
        },
      ]),
      fog: true,
    });
    return m;
  }, []);

  // Per-instance data: seeds and state once; light shares and window colours per lens.
  const { stateAttr, lightAttr, windowAttr } = useMemo(() => {
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) seed[i] = ((i * 2654435761) % 1000) / 1000;
    geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seed, 1));
    const lightAttr = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
    lightAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aLight", lightAttr);
    const windowAttr = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
    windowAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aWindow", windowAttr);
    const stateAttr = new THREE.InstancedBufferAttribute(new Float32Array(count), 1);
    stateAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("aState", stateAttr);
    return { stateAttr, lightAttr, windowAttr };
  }, [count, geometry]);

  const lensId = useCity((s) => s.lens);
  useEffect(() => {
    const lens = lensById(lensId);
    const light = lightAttr.array as Float32Array;
    const window = windowAttr.array as Float32Array;
    const colour = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const repo = feed.repos[i];
      const reading = lens.read(repo);
      light[i] = reading.share;
      colour.set(reading.colour);
      window[i * 3] = colour.r;
      window[i * 3 + 1] = colour.g;
      window[i * 3 + 2] = colour.b;
    }
    lightAttr.needsUpdate = true;
    windowAttr.needsUpdate = true;
  }, [lensId, feed, count, lightAttr, windowAttr]);

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const matrix = new THREE.Matrix4();
    const colour = new THREE.Color();
    for (const b of plan.buildings) {
      const repo = feed.repos[b.index];
      matrix.makeScale(b.size, b.height, b.size);
      matrix.setPosition(b.x, 0, b.z);
      m.setMatrixAt(b.index, matrix);
      colour.set(facadeColour(lightFor(repo).kind));
      // A little variation between facades.
      colour.offsetHSL(0, 0, ((b.index * 37) % 7) * 0.004);
      m.setColorAt(b.index, colour);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [feed, plan]);

  // Visual state follows search, mode and selection.
  const matches = useCity((s) => s.matches);
  const mode = useCity((s) => s.mode);
  const tour = useCity((s) => s.tour);
  const tourStep = useCity((s) => s.tourStep);
  const ghosts = useCity((s) => s.ghosts);
  const awake = useCity((s) => s.awake);
  const compare = useCity((s) => s.compare);
  const selected = useCity((s) => s.selected);
  useEffect(() => {
    const s = { matches, mode, tour, tourStep, ghosts, awake, compare, selected };
    const arr = stateAttr.array as Float32Array;
    for (let i = 0; i < count; i++) arr[i] = stateOf(i, s);
    stateAttr.needsUpdate = true;
  }, [matches, mode, tour, tourStep, ghosts, awake, compare, selected, stateAttr, count]);

  useFrame(({ clock, camera }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uCamera.value.copy(camera.position);
  });

  const setHovered = useCity((s) => s.setHovered);
  const select = useCity((s) => s.select);
  const togglePick = useCity((s) => s.togglePick);
  const flyTo = useCity((s) => s.flyTo);

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive) return;
    e.stopPropagation();
    setHovered(e.instanceId ?? null);
  };
  const onOut = () => setHovered(null);
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!interactive || e.instanceId == null) return;
    e.stopPropagation();
    if (e.delta > 4) return;
    const state = useCity.getState();
    if (state.mode === "compare") togglePick(e.instanceId);
    else select(e.instanceId);
  };
  const onDouble = (e: ThreeEvent<MouseEvent>) => {
    if (!interactive || e.instanceId == null) return;
    e.stopPropagation();
    const b = plan.buildings[e.instanceId];
    flyTo({
      target: [b.x, b.height * 0.5, b.z],
      distance: 10 + b.height * 1.2,
      azimuth: Math.PI / 5,
      elevation: 0.5,
      seconds: 1.2,
    });
    select(e.instanceId);
  };

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, count]}
      frustumCulled={false}
      onPointerMove={onMove}
      onPointerOut={onOut}
      onClick={onClick}
      onDoubleClick={onDouble}
    />
  );
}

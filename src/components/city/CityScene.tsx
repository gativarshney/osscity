"use client";

import { Html } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { CityPlan } from "@/lib/city/layout";
import type { CityFeed } from "@/lib/city/types";
import { useCity } from "@/lib/store";
import { Buildings } from "./Buildings";
import { CameraRig } from "./CameraRig";
import { Ground } from "./Ground";
import { Sky } from "./Sky";

interface Props {
  feed: CityFeed;
  plan: CityPlan;
  /** Post-processing and full detail. Off on phones. */
  quality: "high" | "low";
  skipIntro: boolean;
}

/** The WebGL city. */
export function CityScene({ feed, plan, quality, skipIntro }: Props) {
  const span = Math.max(plan.halfWidth, plan.halfDepth);
  const dpr = useMemo<[number, number]>(() => (quality === "high" ? [1, 2] : [1, 1.5]), [quality]);
  return (
    <Canvas
      dpr={dpr}
      camera={{ fov: 42, near: 0.5, far: span * 12, position: [0, span, span] }}
      gl={{
        antialias: quality === "high",
        powerPreference: "high-performance",
        preserveDrawingBuffer: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      style={{ position: "absolute", inset: 0, touchAction: "none" }}
      aria-hidden="true"
    >
      <Ready />
      <Sky radius={span * 2.6} />
      <Ground plan={plan} />
      <Buildings feed={feed} plan={plan} interactive />
      <CameraRig plan={plan} skipIntro={skipIntro} />
      <HoverLabel feed={feed} plan={plan} />
      <Marker plan={plan} />
      {quality === "high" ? (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.7} luminanceThreshold={0.68} luminanceSmoothing={0.35} mipmapBlur />
          <Vignette eskil={false} offset={0.2} darkness={0.75} />
        </EffectComposer>
      ) : null}
    </Canvas>
  );
}

/** Marks the scene as drawn after the first frame, so the poster can fade out. */
function Ready() {
  const setSceneReady = useCity((s) => s.setSceneReady);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setSceneReady()));
    return () => cancelAnimationFrame(id);
  }, [gl, setSceneReady]);
  return null;
}

/** The repository name above the building under the pointer. */
function HoverLabel({ feed, plan }: { feed: CityFeed; plan: CityPlan }) {
  const hovered = useCity((s) => s.hovered);
  const selected = useCity((s) => s.selected);
  if (hovered == null || hovered === selected) return null;
  const b = plan.buildings[hovered];
  const repo = feed.repos[hovered];
  if (!b || !repo) return null;
  return (
    <Html
      position={[b.x, b.height + 0.9, b.z]}
      center
      zIndexRange={[20, 0]}
      style={{ pointerEvents: "none" }}
    >
      <div className="glass-strong rise flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium whitespace-nowrap text-ink">
        {repo.id}
        <span className="num text-[12px] font-normal text-ink-3">{hoverNote(repo)}</span>
      </div>
    </Html>
  );
}

/** A soft ring on the ground under the selected building or the current tour stop. */
function Marker({ plan }: { plan: CityPlan }) {
  const selected = useCity((s) => s.selected);
  const mode = useCity((s) => s.mode);
  const tour = useCity((s) => s.tour);
  const tourStep = useCity((s) => s.tourStep);
  const ref = useRef<THREE.Mesh>(null);
  const index = mode === "tour" && tourStep < tour.length ? tour[tourStep] : selected;
  const b = index != null ? plan.buildings[index] : null;
  useFrame(({ clock }) => {
    const m = ref.current;
    if (!m) return;
    const t = clock.elapsedTime;
    const s = 1 + 0.12 * Math.sin(t * 2.2);
    m.scale.set(s, s, 1);
    (m.material as THREE.MeshBasicMaterial).opacity = 0.55 + 0.25 * Math.sin(t * 2.2);
  });
  if (!b) return null;
  const r = b.size * 1.1;
  return (
    <mesh ref={ref} position={[b.x, 0.03, b.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[r, r + 0.35, 48]} />
      <meshBasicMaterial color="#7fd9d0" transparent opacity={0.7} depthWrite={false} />
    </mesh>
  );
}

/** One figure next to the name: the 48 hour reply share, or the sample size when withheld. */
function hoverNote(repo: CityFeed["repos"][number]): string {
  if (repo.within48h == null) return repo.replyN === 0 ? "no outside PRs yet" : `${repo.replyN} outside PRs, not enough data`;
  return `${Math.round(repo.within48h * 100)}% replied within 48 h`;
}

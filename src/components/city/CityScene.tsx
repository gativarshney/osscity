"use client";

import { Html } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useEffect, useMemo } from "react";
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
      {quality === "high" ? (
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.55} luminanceThreshold={0.72} luminanceSmoothing={0.3} mipmapBlur />
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
      <div className="glass-strong rise rounded-full px-3 py-1.5 text-[13px] font-medium whitespace-nowrap text-ink">
        {repo.id}
      </div>
    </Html>
  );
}

"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { skyFragment, skyVertex } from "./shaders";

export const SKY_TOP = "#070913";
export const SKY_HORIZON = "#1a2742";
export const FOG = "#121a2e";

/** A night sky dome, fog that matches it, and a few drifting stars. */
export function Sky({ radius }: { radius: number }) {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    scene.fog = new THREE.Fog(FOG, radius * 0.35, radius * 1.6);
    scene.background = new THREE.Color(SKY_TOP);
    return () => {
      scene.fog = null;
    };
  }, [scene, radius]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uTop: { value: new THREE.Color(SKY_TOP) },
          uHorizon: { value: new THREE.Color(SKY_HORIZON) },
          uGlow: { value: new THREE.Color("#2a4a66") },
        },
      }),
    [],
  );

  return (
    <>
      <mesh material={material} renderOrder={-10}>
        <sphereGeometry args={[radius * 2.5, 32, 16]} />
      </mesh>
      <Stars radius={radius * 2.2} />
    </>
  );
}

function Stars({ radius }: { radius: number }) {
  const ref = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const n = 900;
    const positions = new Float32Array(n * 3);
    const sizes = new Float32Array(n);
    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < n; i++) {
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(0.15 + rand() * 0.85);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      sizes[i] = 0.6 + rand() * 1.4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    return g;
  }, [radius]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */ `
          attribute float size;
          uniform float uTime;
          varying float vTwinkle;
          void main() {
            vTwinkle = 0.55 + 0.45 * sin(uTime * 0.8 + position.x * 0.05 + position.z * 0.07);
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * 1.6;
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: /* glsl */ `
          varying float vTwinkle;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.1, d) * vTwinkle * 0.7;
            gl_FragColor = vec4(0.85, 0.9, 1.0, a);
          }
        `,
      }),
    [],
  );

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime;
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.004;
  });

  return <points ref={ref} geometry={geometry} material={material} renderOrder={-9} />;
}

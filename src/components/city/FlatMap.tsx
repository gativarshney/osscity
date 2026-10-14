"use client";

import { useEffect, useRef, useState } from "react";
import { COLOURS, lightFor, windowColour } from "@/lib/city/encode";
import type { CityPlan } from "@/lib/city/layout";
import type { CityFeed } from "@/lib/city/types";
import { useCity } from "@/lib/store";

interface Props {
  feed: CityFeed;
  plan: CityPlan;
}

/**
 * The flat city: the same plan drawn on a 2D canvas. Fast on any device, works
 * without WebGL, and respects reduced motion by not animating at all.
 */
export function FlatMap({ feed, plan }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const view = useRef({ x: 0, y: 0, scale: 1 });
  const [, bump] = useState(0);
  const redraw = () => bump((n) => n + 1);

  const matches = useCity((s) => s.matches);
  const mode = useCity((s) => s.mode);
  const tour = useCity((s) => s.tour);
  const tourStep = useCity((s) => s.tourStep);
  const ghosts = useCity((s) => s.ghosts);
  const compare = useCity((s) => s.compare);
  const selected = useCity((s) => s.selected);
  const hovered = useCity((s) => s.hovered);
  const setHovered = useCity((s) => s.setHovered);
  const select = useCity((s) => s.select);
  const togglePick = useCity((s) => s.togglePick);
  const setSceneReady = useCity((s) => s.setSceneReady);
  const finishIntro = useCity((s) => s.finishIntro);
  const resetSerial = useCity((s) => s.resetSerial);
  const goal = useCity((s) => s.goal);

  useEffect(() => {
    finishIntro();
    setSceneReady();
  }, [finishIntro, setSceneReady]);

  // Fit the whole city on first layout and on reset.
  const fit = () => {
    const el = canvas.current?.parentElement;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    const scale = Math.min(w / (plan.halfWidth * 2 + 12), h / (plan.halfDepth * 2 + 12));
    view.current = { x: w / 2, y: h / 2, scale };
    setSize({ w, h });
  };
  useEffect(() => {
    fit();
    const ro = new ResizeObserver(fit);
    if (canvas.current?.parentElement) ro.observe(canvas.current.parentElement);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);
  useEffect(() => {
    if (resetSerial) fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSerial]);
  useEffect(() => {
    if (!goal) return;
    const el = canvas.current?.parentElement;
    if (!el) return;
    const scale = Math.max(view.current.scale, 14);
    view.current = {
      x: el.clientWidth / 2 - goal.target[0] * scale,
      y: el.clientHeight / 2 - goal.target[2] * scale,
      scale,
    };
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal?.serial]);
  useEffect(() => {
    if (mode !== "tour" || tour.length === 0) return;
    const b = plan.buildings[tour[tourStep]];
    const el = canvas.current?.parentElement;
    if (!b || !el) return;
    const scale = 16;
    view.current = { x: el.clientWidth / 2 - b.x * scale, y: el.clientHeight / 2 - b.z * scale, scale };
    redraw();
    const timer = setTimeout(() => {
      const s = useCity.getState();
      if (s.mode !== "tour") return;
      if (tourStep + 1 < tour.length) s.setTourStep(tourStep + 1);
      else {
        s.setMode("explore");
        s.resetView();
      }
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, tour, tourStep]);

  // Draw.
  useEffect(() => {
    const c = canvas.current;
    if (!c || size.w === 0) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = size.w * dpr;
    c.height = size.h * dpr;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const { x: ox, y: oy, scale } = view.current;
    const sx = (x: number) => ox + x * scale;
    const sy = (z: number) => oy + z * scale;

    ctx.fillStyle = "#070a14";
    ctx.fillRect(0, 0, size.w, size.h);

    // District plates and names.
    for (const d of plan.districts) {
      const hit = matches ? plan.buildings.some((b) => b.district === d.name && matches.has(b.index)) : true;
      const pad = 0.6;
      ctx.fillStyle = hit ? "#0d1222" : "#090d19";
      ctx.strokeStyle = hit ? "rgba(127,217,208,0.45)" : "rgba(127,217,208,0.12)";
      ctx.lineWidth = 1;
      const x = sx(d.x - d.width / 2 - pad);
      const y = sy(d.z - d.depth / 2 - pad);
      const w = (d.width + pad * 2) * scale;
      const h = (d.depth + pad * 2) * scale;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 4);
      ctx.fill();
      ctx.stroke();
      if (w > 60) {
        ctx.fillStyle = hit ? "rgba(127,217,208,0.85)" : "rgba(127,217,208,0.35)";
        ctx.font = `600 ${Math.max(10, Math.min(13, w / 12))}px ${getComputedStyle(c).fontFamily}`;
        ctx.textBaseline = "top";
        ctx.fillText(d.name.toUpperCase(), x + 6, y + h + 4);
      }
    }

    // Buildings: footprint sized by stars, colour by light, brightness by height.
    for (const b of plan.buildings) {
      const repo = feed.repos[b.index];
      const { kind, share } = lightFor(repo);
      let state = 0;
      if (selected === b.index || (mode === "compare" && compare.includes(b.index))) state = 3;
      else if (mode === "tour") state = tour[tourStep] === b.index ? 3 : tour.includes(b.index) ? 2 : 1;
      else if (mode === "ghosts") state = ghosts.includes(b.index) ? 2 : 1;
      else if (matches) state = matches.has(b.index) ? 2 : 1;
      const s = Math.max(2, b.size * scale * 0.9);
      const x = sx(b.x) - s / 2;
      const y = sy(b.z) - s / 2;
      const alpha = state === 1 ? 0.18 : 0.35 + 0.65 * Math.min(1, b.height / 12);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = kind === "unknown" ? "#1a2233" : kind === "dark" ? "#141a30" : mixColour(windowColour(kind), share);
      ctx.fillRect(x, y, s, s);
      if (state >= 2) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = COLOURS.accent;
        ctx.lineWidth = state === 3 ? 2 : 1;
        ctx.strokeRect(x - 1, y - 1, s + 2, s + 2);
      }
      if (hovered === b.index) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 2, y - 2, s + 4, s + 4);
      }
    }
    ctx.globalAlpha = 1;
  });

  // Input: drag to pan, wheel to zoom, click to select, hover to name.
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    let dragging = false;
    let moved = false;
    let last = { x: 0, y: 0 };
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch = 0;

    const pick = (clientX: number, clientY: number) => {
      const rect = c.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      const { x: ox, y: oy, scale } = view.current;
      const wx = (px - ox) / scale;
      const wz = (py - oy) / scale;
      let best: number | null = null;
      let bestD = 0.9;
      for (const b of plan.buildings) {
        const d = Math.max(Math.abs(b.x - wx), Math.abs(b.z - wz));
        if (d < bestD) {
          bestD = d;
          best = b.index;
        }
      }
      return best;
    };

    const onDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      dragging = true;
      moved = false;
      last = { x: e.clientX, y: e.clientY };
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (dragging && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / pinch);
        pinch = d;
        moved = true;
        return;
      }
      if (dragging) {
        const dx = e.clientX - last.x;
        const dy = e.clientY - last.y;
        if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
        if (moved) {
          view.current.x += dx;
          view.current.y += dy;
          last = { x: e.clientX, y: e.clientY };
          redraw();
        }
        return;
      }
      setHovered(pick(e.clientX, e.clientY));
    };
    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 0) dragging = false;
      if (pointers.size < 2) pinch = 0;
      if (!moved && e.type === "pointerup") {
        const hit = pick(e.clientX, e.clientY);
        if (hit != null) {
          if (useCity.getState().mode === "compare") togglePick(hit);
          else select(hit);
        }
      }
    };
    const zoomAt = (cx: number, cy: number, factor: number) => {
      const rect = c.getBoundingClientRect();
      const px = cx - rect.left;
      const py = cy - rect.top;
      const v = view.current;
      const next = Math.min(60, Math.max(0.5, v.scale * factor));
      const k = next / v.scale;
      v.x = px - (px - v.x) * k;
      v.y = py - (py - v.y) * k;
      v.scale = next;
      redraw();
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015));
    };
    const onDouble = (e: MouseEvent) => {
      const hit = pick(e.clientX, e.clientY);
      if (hit != null) {
        const b = plan.buildings[hit];
        useCity.getState().flyTo({ target: [b.x, 0, b.z], distance: 10, azimuth: 0, elevation: 0.5, seconds: 0.4 });
        select(hit);
      }
    };
    c.addEventListener("pointerdown", onDown);
    c.addEventListener("pointermove", onMove);
    c.addEventListener("pointerup", onUp);
    c.addEventListener("pointercancel", onUp);
    c.addEventListener("pointerleave", () => setHovered(null));
    c.addEventListener("wheel", onWheel, { passive: false });
    c.addEventListener("dblclick", onDouble);
    return () => {
      c.removeEventListener("pointerdown", onDown);
      c.removeEventListener("pointermove", onMove);
      c.removeEventListener("pointerup", onUp);
      c.removeEventListener("pointercancel", onUp);
      c.removeEventListener("wheel", onWheel);
      c.removeEventListener("dblclick", onDouble);
    };
  }, [plan, select, setHovered, togglePick]);

  const hoveredRepo = hovered != null ? feed.repos[hovered] : null;
  const hb = hovered != null ? plan.buildings[hovered] : null;

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <canvas ref={canvas} className="h-full w-full touch-none" style={{ width: size.w, height: size.h }} />
      {hoveredRepo && hb ? (
        <div
          className="glass-strong pointer-events-none absolute rounded-full px-3 py-1.5 text-[13px] font-medium whitespace-nowrap"
          style={{
            left: view.current.x + hb.x * view.current.scale,
            top: view.current.y + hb.z * view.current.scale - 28,
            transform: "translateX(-50%)",
          }}
        >
          {hoveredRepo.id}
        </div>
      ) : null}
    </div>
  );
}

/** Window colour, pulled towards the facade for low light shares. */
function mixColour(hex: string, share: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const t = 0.25 + 0.75 * share;
  const mix = (c: number, base: number) => Math.round(base + (c - base) * t);
  return `rgb(${mix(r, 20)}, ${mix(g, 26)}, ${mix(b, 43)})`;
}

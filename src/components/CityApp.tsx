"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { CityStats } from "@/lib/city/stats";
import type { CityFeed } from "@/lib/city/types";
import { chooseView, highQuality, prefersReducedMotion } from "@/lib/device";
import { useCity } from "@/lib/store";
import { FlatMap } from "./city/FlatMap";
import { Overlay } from "./ui/Overlay";

const CityScene = dynamic(() => import("./city/CityScene").then((m) => m.CityScene), {
  ssr: false,
});

interface Props {
  stats: CityStats | null;
  generatedAt: string | null;
}

/**
 * Loads the feed, picks the 3D city or the flat map for this device, and lays the
 * overlay on top. The poster frame shows until the scene has drawn.
 */
export function CityApp({ stats, generatedAt }: Props) {
  const feed = useCity((s) => s.feed);
  const plan = useCity((s) => s.plan);
  const setFeed = useCity((s) => s.setFeed);
  const setLoadError = useCity((s) => s.setLoadError);
  const loadError = useCity((s) => s.loadError);
  const view = useCity((s) => s.view);
  const setView = useCity((s) => s.setView);
  const sceneReady = useCity((s) => s.sceneReady);
  const [reason, setReason] = useState<string | null>(null);
  const [quality, setQuality] = useState<"high" | "low">("high");
  const [skipIntro, setSkipIntro] = useState(false);

  useEffect(() => {
    const choice = chooseView();
    setView(choice.view);
    setReason(choice.reason);
    setQuality(highQuality() ? "high" : "low");
    setSkipIntro(prefersReducedMotion());
  }, [setView]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/city")
      .then((r) => (r.ok ? (r.json() as Promise<CityFeed>) : Promise.reject(new Error(String(r.status)))))
      .then((f) => {
        if (!cancelled) setFeed(f);
      })
      .catch(() => {
        if (!cancelled) setLoadError();
      });
    return () => {
      cancelled = true;
    };
  }, [setFeed, setLoadError]);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg">
      <Poster visible={!sceneReady} />
      {feed && plan ? (
        view === "3d" ? (
          <CityScene feed={feed} plan={plan} quality={quality} skipIntro={skipIntro} />
        ) : (
          <FlatMap feed={feed} plan={plan} />
        )
      ) : null}
      <Overlay
        stats={stats}
        generatedAt={generatedAt ?? feed?.generatedAt ?? null}
        loadError={loadError}
        viewReason={reason}
      />
    </div>
  );
}

/** A still of the skyline, shown first, then faded out once the live city has drawn. */
function Poster({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-1000 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        backgroundImage: "url(/poster.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#070913",
      }}
    />
  );
}

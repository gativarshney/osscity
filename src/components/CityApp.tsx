"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { CityStats } from "@/lib/city/stats";
import type { CityFeed } from "@/lib/city/types";
import { chooseView, highQuality, prefersReducedMotion } from "@/lib/device";
import { lensById } from "@/lib/city/lens";
import { useCity } from "@/lib/store";
import { FlatMap } from "./city/FlatMap";
import { ComparePanel } from "./ui/ComparePanel";
import { DistrictPanel, RankingPanel } from "./ui/DistrictPanels";
import { LensBar } from "./ui/LensBar";
import { ModeBar } from "./ui/ModeBar";
import { AwakePanel, GhostsPanel, TourCaption } from "./ui/ModePanels";
import { Overlay } from "./ui/Overlay";
import { RepoCard } from "./ui/RepoCard";
import { ViewControls } from "./ui/ViewControls";

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
    // A shared search link goes straight to the stack instead of the opening flight.
    setSkipIntro(prefersReducedMotion() || new URLSearchParams(window.location.search).has("q"));
  }, [setView]);

  // A search can be shared as a link: /?q=python,django
  const query = useCity((s) => s.query);
  const setQuery = useCity((s) => s.setQuery);
  const lens = useCity((s) => s.lens);
  const groupBy = useCity((s) => s.groupBy);
  const district = useCity((s) => s.district);
  useEffect(() => {
    if (!feed) return;
    const params = new URLSearchParams(window.location.search);
    const s = useCity.getState();
    const q = params.get("q");
    if (q && !s.query) setQuery(q);
    const l = params.get("lens");
    if (l && l !== s.lens) s.setLens(lensById(l).id);
    const g = params.get("group");
    if ((g === "org" || g === "language") && g !== s.groupBy) s.setGroupBy(g);
    const d = params.get("district");
    if (d) s.openDistrict(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed]);
  useEffect(() => {
    if (!feed) return;
    const timer = setTimeout(() => {
      const url = new URL(window.location.href);
      const put = (key: string, value: string | null) => {
        if (value) url.searchParams.set(key, value);
        else url.searchParams.delete(key);
      };
      put("q", query.trim() || null);
      put("lens", lens === "replies" ? null : lens);
      put("group", groupBy === "language" ? null : groupBy);
      put("district", district);
      window.history.replaceState(null, "", url);
    }, 400);
    return () => clearTimeout(timer);
  }, [query, lens, groupBy, district, feed]);

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
      <ModeBar generatedAt={generatedAt ?? feed?.generatedAt ?? null} />
      <LensBar />
      <ViewControls />
      <DistrictPanel />
      <RankingPanel />
      <RepoCard />
      <ComparePanel />
      <GhostsPanel />
      <AwakePanel />
      <TourCaption />
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

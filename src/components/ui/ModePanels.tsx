"use client";

import { useEffect } from "react";
import { lightFor } from "@/lib/city/encode";
import type { CityRepo } from "@/lib/city/types";
import { count, hours, percent } from "@/lib/format";
import { busiestHours } from "@/lib/city/awake";
import { friendliness } from "@/lib/city/encode";
import { buildingGoal, TOUR_DWELL_MS, useCity } from "@/lib/store";
import { CONTRIBUTABLE, contributableUrl } from "./RepoCard";

/** One plain sentence on why a project is friendly. */
export function whyFriendly(repo: CityRepo): string {
  const parts: string[] = [];
  if (repo.replyHours != null) parts.push(`a first reply in ${hours(repo.replyHours)} on average`);
  if (repo.within48h != null) parts.push(`${percent(repo.within48h)} of outside pull requests answered within 48 hours`);
  if (repo.mergeRate != null) parts.push(`${percent(repo.mergeRate)} of decided outside pull requests merged`);
  if (repo.available > 0) parts.push(`${count(repo.available)} free first ${repo.available === 1 ? "issue" : "issues"} right now`);
  if (parts.length === 0) return "Contributable has enough data to call this project welcoming.";
  const last = parts.pop();
  return (parts.length ? `${parts.join(", ")} and ${last}` : last ?? "") + ".";
}

/**
 * The tour of the ten friendliest projects: a caption at each stop with controls, then
 * a summary with every stop linked, so a newcomer can pick one and go.
 */
export function TourCaption() {
  const feed = useCity((s) => s.feed);
  const mode = useCity((s) => s.mode);
  const tour = useCity((s) => s.tour);
  const step = useCity((s) => s.tourStep);
  const playing = useCity((s) => s.tourPlaying);
  const setPlaying = useCity((s) => s.setTourPlaying);
  const nextStop = useCity((s) => s.nextStop);
  const previousStop = useCity((s) => s.previousStop);
  const setMode = useCity((s) => s.setMode);
  const resetView = useCity((s) => s.resetView);
  const setTourStep = useCity((s) => s.setTourStep);
  const title = useCity((s) => s.tourTitle);
  const why = useCity((s) => s.tourWhy);

  const active = mode === "tour" && !!feed && tour.length > 0;
  const finished = active && step >= tour.length;

  // Auto-advance while playing. The flight takes about a second; the rest is reading time.
  useEffect(() => {
    if (!active || finished || !playing) return;
    const timer = setTimeout(nextStop, TOUR_DWELL_MS);
    return () => clearTimeout(timer);
  }, [active, finished, playing, step, nextStop]);

  // Keyboard: left and right move between stops, space pauses.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextStop();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        previousStop();
      } else if (e.key === " ") {
        e.preventDefault();
        setPlaying(!playing);
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [active, playing, nextStop, previousStop, setPlaying]);

  if (!active || !feed) return null;

  const stop = () => {
    setMode("explore");
    resetView();
  };

  if (finished) {
    return (
      <div className="pointer-events-none absolute inset-0 z-30 flex items-end justify-center p-4 pb-20 sm:items-center sm:pb-4">
        <section
          aria-label="Tour summary"
          className="glass-strong rise pointer-events-auto w-full max-w-lg rounded-3xl p-5 sm:p-6"
        >
          <p className="text-[12px] tracking-wide text-ink-3 uppercase">{title}</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">Pick one and open it in Contributable</h2>
          <p className="mt-1.5 text-[13.5px] text-ink-2">
            Each page shows the full report: who replies, how fast, what is free to pick up and how to get started.
          </p>
          <ol className="mt-4 max-h-[40dvh] divide-y divide-hair overflow-y-auto">
            {tour.map((i, n) => {
              const r = feed.repos[i];
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPlaying(false);
                      setTourStep(n);
                    }}
                    className="flex min-w-0 items-center gap-3 text-left hover:text-accent"
                  >
                    <span className="num w-5 shrink-0 text-[12px] text-ink-3">{n + 1}</span>
                    <span className="truncate text-[13.5px] text-ink">{r.id}</span>
                  </button>
                  <a
                    href={contributableUrl(r.id)}
                    target="_blank"
                    rel="noopener"
                    className="num shrink-0 rounded-full border border-hair-strong px-2.5 py-1 text-[12px] text-ink-2 hover:border-accent hover:text-accent"
                  >
                    {hours(r.replyHours)} reply
                  </a>
                </li>
              );
            })}
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={CONTRIBUTABLE}
              target="_blank"
              rel="noopener"
              className="inline-flex flex-1 items-center justify-center rounded-2xl bg-accent px-4 py-2.5 text-[14px] font-medium text-accent-ink hover:scale-[1.02]"
            >
              Visit Contributable
            </a>
            <button
              type="button"
              onClick={() => {
                setTourStep(0);
                setPlaying(true);
              }}
              className="rounded-2xl border border-hair-strong px-4 py-2.5 text-[14px] text-ink-2 hover:text-ink"
            >
              Replay
            </button>
            <button type="button" onClick={stop} className="rounded-2xl px-4 py-2.5 text-[14px] text-ink-2 hover:text-ink">
              Back to the city
            </button>
          </div>
        </section>
      </div>
    );
  }

  const repo = feed.repos[tour[step]];
  if (!repo) return null;
  const org = repo.gsoc ? (feed.orgs[repo.gsoc] ?? repo.gsoc) : null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-14 z-30 flex justify-center px-3 sm:top-20" aria-live="polite">
      <section
        key={repo.id}
        aria-label={`Tour stop ${step + 1} of ${tour.length}`}
        className="glass-strong rise pointer-events-auto w-full max-w-xl overflow-hidden rounded-3xl"
      >
        <div className="h-0.5 w-full bg-hair" aria-hidden="true">
          <div
            key={`${step}-${playing}`}
            className="h-full bg-accent"
            style={{
              width: playing ? "100%" : "0%",
              transition: playing ? `width ${TOUR_DWELL_MS}ms linear` : "none",
            }}
          />
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] text-ink-3">
                {title}: stop {step + 1} of {tour.length}
                {org ? ` from ${org}` : ""}
              </p>
              <h2 className="truncate text-[18px] font-semibold tracking-tight text-ink">{repo.id}</h2>
            </div>
            <a
              href={contributableUrl(repo.id)}
              target="_blank"
              rel="noopener"
              className="shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-[12.5px] font-medium text-accent-ink hover:scale-[1.03]"
            >
              Open in Contributable
            </a>
          </div>
          <p className="mt-2 text-[13.5px] leading-snug text-ink-2">
            {why[step] ? why[step] : `Why it is friendly: ${whyFriendly(repo)}`}
          </p>
          <div className="mt-3 flex items-center gap-1.5">
            <Control label="Previous stop" onClick={previousStop} disabled={step === 0}>
              <path d="M12 4 6 10l6 6" />
            </Control>
            <Control label={playing ? "Pause" : "Play"} onClick={() => setPlaying(!playing)}>
              {playing ? <path d="M7 4v12M13 4v12" /> : <path d="M6 4l10 6-10 6z" />}
            </Control>
            <Control label="Next stop" onClick={nextStop}>
              <path d="m8 4 6 6-6 6" />
            </Control>
            <span className="ml-1 hidden text-[12px] text-ink-3 sm:inline">Arrow keys move, space pauses.</span>
            <button
              type="button"
              onClick={stop}
              className="ml-auto rounded-full border border-hair-strong px-3 py-1.5 text-[12px] text-ink-2 hover:text-ink"
            >
              Stop tour
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Control({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="rounded-full border border-hair-strong p-2 text-ink-2 hover:bg-hair hover:text-ink disabled:opacity-40"
    >
      <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}

/** The list of ghost towns while that mode is on. */
export function GhostsPanel() {
  const feed = useCity((s) => s.feed);
  const plan = useCity((s) => s.plan);
  const mode = useCity((s) => s.mode);
  const ghosts = useCity((s) => s.ghosts);
  const select = useCity((s) => s.select);
  const flyTo = useCity((s) => s.flyTo);
  const setMode = useCity((s) => s.setMode);
  if (mode !== "ghosts" || !feed || !plan) return null;
  return (
    <section
      aria-label="Ghost towns"
      className="glass-strong rise pointer-events-auto absolute inset-x-0 bottom-16 z-30 mx-3 max-h-[55dvh] overflow-y-auto rounded-3xl p-4 sm:inset-x-auto sm:right-6 sm:bottom-24 sm:mx-0 sm:w-[380px] sm:p-5"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold tracking-tight text-ink">Ghost towns</h2>
          <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">
            {count(ghosts.length)} projects with 100 stars or more where at most a third of outside pull requests get a reply within a week.
          </p>
        </div>
        <button type="button" onClick={() => setMode("explore")} className="rounded-full p-1.5 text-ink-3 hover:bg-hair hover:text-ink" aria-label="Close ghost towns">
          <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="m5 5 10 10M15 5 5 15" />
          </svg>
        </button>
      </header>
      <ol className="mt-3 divide-y divide-hair">
        {ghosts.map((i) => {
          const r = feed.repos[i];
          const b = plan.buildings[i];
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  select(i);
                  flyTo(buildingGoal(b));
                }}
                className="flex w-full items-center justify-between gap-3 py-2 text-left hover:text-accent"
              >
                <span className="truncate text-[13.5px] text-ink">{r.id}</span>
                <span className="num shrink-0 text-[12px] text-ink-3">
                  {percent(r.within7d)} in 7 d, {count(r.stars)} stars
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Screen reader summary of what is lit. */
export function ModeHint() {
  const feed = useCity((s) => s.feed);
  const tour = useCity((s) => s.tour);
  if (!feed) return null;
  const lit = feed.repos.filter((r) => lightFor(r).kind === "lit").length;
  return (
    <span className="sr-only">
      {count(lit)} buildings have lit windows. {count(tour.length)} are on the tour.
    </span>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The local hour label for a UTC hour, in the visitor's zone. */
function localLabel(utcHour: number): string {
  const d = new Date();
  d.setUTCHours(utcHour, 0, 0, 0);
  try {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return `${pad(utcHour)}:00 UTC`;
  }
}

/**
 * Awake now: who usually replies at this hour. A newcomer who opens a pull request
 * while maintainers are around gets a first reply sooner.
 */
export function AwakePanel() {
  const feed = useCity((s) => s.feed);
  const plan = useCity((s) => s.plan);
  const mode = useCity((s) => s.mode);
  const hour = useCity((s) => s.awakeHour);
  const awake = useCity((s) => s.awake);
  const setHour = useCity((s) => s.setAwakeHour);
  const select = useCity((s) => s.select);
  const flyTo = useCity((s) => s.flyTo);
  const setMode = useCity((s) => s.setMode);
  const startTour = useCity((s) => s.startTour);
  const matches = useCity((s) => s.matches);
  if (mode !== "awake" || !feed || !plan) return null;

  const pool = matches ? awake.filter((i) => matches.has(i)) : awake;
  const best = [...pool]
    .map((i) => ({ i, score: friendliness(feed.repos[i]) ?? -1 }))
    .sort((a, b) => b.score - a.score || feed.repos[b.i].stars - feed.repos[a.i].stars)
    .slice(0, 8);
  const peak = busiestHours(feed.repos)[0];
  const now = new Date().getUTCHours();

  return (
    <section
      aria-label="Awake now"
      className="glass-strong rise pointer-events-auto absolute inset-x-0 bottom-16 z-30 mx-3 max-h-[60dvh] overflow-y-auto rounded-3xl p-4 sm:inset-x-auto sm:right-6 sm:bottom-24 sm:mx-0 sm:w-[400px] sm:p-5"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold tracking-tight text-ink">Awake now</h2>
          <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">
            Lit buildings usually reply at this hour. Open your pull request while someone is there.
          </p>
        </div>
        <button type="button" onClick={() => setMode("explore")} className="rounded-full p-1.5 text-ink-3 hover:bg-hair hover:text-ink" aria-label="Close awake now">
          <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="m5 5 10 10M15 5 5 15" />
          </svg>
        </button>
      </header>

      <div className="mt-3 flex items-center gap-2">
        <button type="button" onClick={() => setHour(hour - 1)} aria-label="One hour earlier" className="rounded-full border border-hair-strong px-2.5 py-1 text-[13px] text-ink-2 hover:text-ink">
          -1 h
        </button>
        <p className="num flex-1 text-center text-[14px] text-ink">
          {localLabel(hour)}{" "}
          <span className="text-ink-3">{hour === now ? "(now)" : ""}</span>
        </p>
        <button type="button" onClick={() => setHour(hour + 1)} aria-label="One hour later" className="rounded-full border border-hair-strong px-2.5 py-1 text-[13px] text-ink-2 hover:text-ink">
          +1 h
        </button>
      </div>
      <p className="num mt-2 text-[13px] text-ink-2">
        <span className="text-ink">{count(pool.length)}</span> projects{matches ? " in your stack" : ""} are usually replying at this hour.
        {peak != null ? ` Busiest hour overall: ${localLabel(peak)}.` : ""}
      </p>

      <ol className="mt-3 divide-y divide-hair">
        {best.map(({ i }) => {
          const r = feed.repos[i];
          const b = plan.buildings[i];
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  select(i);
                  flyTo(buildingGoal(b));
                }}
                className="flex w-full items-center justify-between gap-3 py-2 text-left hover:text-accent"
              >
                <span className="truncate text-[13.5px] text-ink">{r.id}</span>
                <span className="num shrink-0 text-[12px] text-ink-3">
                  {hours(r.replyHours)} reply, {count(r.available)} free
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {best.length > 1 ? (
        <button
          type="button"
          onClick={() => startTour(best.slice(0, 6).map((x) => x.i), "Awake now")}
          className="mt-3 w-full rounded-2xl bg-accent px-4 py-2.5 text-[13.5px] font-medium text-accent-ink hover:scale-[1.02]"
        >
          Fly past the ones awake now
        </button>
      ) : null}
    </section>
  );
}

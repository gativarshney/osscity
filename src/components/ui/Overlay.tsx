"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { friendliness } from "@/lib/city/encode";
import type { CityStats } from "@/lib/city/stats";
import { compactDate, count, hours } from "@/lib/format";
import { buildingGoal, useCity } from "@/lib/store";

interface Props {
  stats: CityStats | null;
  generatedAt: string | null;
  loadError: boolean;
  viewReason: string | null;
}

export const TAGLINE =
  "Every open source project from Google Summer of Code organisations, built as a city. Lit windows reply to newcomers fast.";

/** Everything laid over the city on the first screen. */
export function Overlay({ stats, generatedAt, loadError, viewReason }: Props) {
  const feed = useCity((s) => s.feed);
  const introDone = useCity((s) => s.introDone);
  const finishIntro = useCity((s) => s.finishIntro);
  const selected = useCity((s) => s.selected);
  const mode = useCity((s) => s.mode);
  const preparing = !feed && !loadError;
  const quiet = selected != null || mode !== "explore";

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col">
      <header className="flex items-start justify-between gap-4 p-4 sm:p-6">
        <Link
          href="/"
          className="pointer-events-auto flex items-center gap-2.5 text-ink"
          aria-label="OSS City home"
        >
          <Mark />
          <span className="text-[15px] font-semibold tracking-tight">OSS City</span>
        </Link>
        <a
          href="https://contributable.vercel.app"
          className="glass pointer-events-auto flex items-center gap-2 rounded-full py-1.5 pr-3.5 pl-2.5 text-[12.5px] text-ink-2 transition-colors hover:text-ink"
          target="_blank"
          rel="noopener"
        >
          <span className="inline-block size-2 rounded-full bg-accent shadow-[0_0_12px_var(--accent)]" />
          Powered by Contributable
        </a>
      </header>

      <div
        className={`flex min-h-0 flex-1 flex-col justify-center px-4 pb-24 transition-opacity duration-500 sm:px-6 sm:pb-20 ${
          quiet ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <div className="pointer-events-auto max-h-full w-full max-w-xl overflow-y-auto pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <p className="text-[12.5px] tracking-wide text-ink-3 uppercase">
            {stats ? `${count(stats.projects)} open source projects, measured by Contributable` : "Open source projects, measured by Contributable"}
          </p>
          <h1 className="mt-2 text-[clamp(1.9rem,4.2vw,3rem)] leading-[1.02] font-semibold tracking-[-0.025em] text-ink">
            Find a project that answers your first pull request.
          </h1>
          <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-ink-2">
            Each building is a repository from a Google Summer of Code organisation. Tall means busy.
            Lit windows mean newcomers get a reply within 48 hours. Dark towers ignore them.
          </p>
          <SearchBox disabled={preparing} />
          <Friendliest />
          <Actions disabled={preparing} />
          <Stats stats={stats} preparing={preparing} loadError={loadError} />
          <p className="mt-3 text-[12px] text-ink-3">
            By{" "}
            <a href="https://gativarshney.github.io/" className="text-ink-2 hover:text-ink" target="_blank" rel="noopener">
              Gati Varshney
            </a>
            .{" "}
            {generatedAt
              ? `Data from Contributable, updated ${compactDate(generatedAt)}.`
              : "Data from Contributable."}
            {viewReason ? ` ${viewReason}` : ""}
          </p>
        </div>
      </div>

      {selected == null && mode === "explore" ? <Legend /> : null}
      {introDone && !preparing && mode === "explore" ? <Hint /> : null}

      {!introDone && !preparing ? (
        <button
          type="button"
          onClick={finishIntro}
          className="glass pointer-events-auto absolute right-4 bottom-4 rounded-full px-4 py-2 text-[13px] text-ink-2 hover:text-ink sm:right-6 sm:bottom-6"
        >
          Skip the flight
        </button>
      ) : null}
    </div>
  );
}

function Mark() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
      <rect x="3" y="11" width="4" height="10" rx="0.8" fill="currentColor" opacity="0.55" />
      <rect x="9" y="4" width="5" height="17" rx="0.8" fill="currentColor" />
      <rect x="16" y="8" width="5" height="13" rx="0.8" fill="currentColor" opacity="0.75" />
      <rect x="10.5" y="7" width="2" height="2" fill="var(--window)" />
      <rect x="10.5" y="11" width="2" height="2" fill="var(--window)" />
      <rect x="17.5" y="11" width="2" height="2" fill="var(--window)" />
    </svg>
  );
}

function SearchBox({ disabled }: { disabled: boolean }) {
  const query = useCity((s) => s.query);
  const setQuery = useCity((s) => s.setQuery);
  const matches = useCity((s) => s.matches);
  const feed = useCity((s) => s.feed);
  const plan = useCity((s) => s.plan);
  const frame = useCity((s) => s.frame);
  const select = useCity((s) => s.select);
  const flyTo = useCity((s) => s.flyTo);
  const route = useCity((s) => s.route);
  const startTour = useCity((s) => s.startTour);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  // "/" focuses the search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA");
      if (e.key === "/" && !typing) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Fly to whatever matches, a moment after typing stops.
  useEffect(() => {
    if (!matches || matches.size === 0) return;
    const timer = setTimeout(() => frame([...matches]), 350);
    return () => clearTimeout(timer);
  }, [matches, frame]);

  // The best matches, friendliest first, then the most starred.
  const results = useMemo(() => {
    if (!feed || !matches || matches.size === 0) return [];
    return [...matches]
      .map((i) => ({ i, repo: feed.repos[i], score: friendliness(feed.repos[i]) }))
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || b.repo.stars - a.repo.stars)
      .slice(0, 6);
  }, [feed, matches]);

  const districts = useMemo(() => {
    if (!plan || !matches || matches.size === 0) return [];
    const counts = new Map<string, number>();
    for (const b of plan.buildings) {
      if (matches.has(b.index)) counts.set(b.district, (counts.get(b.district) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [plan, matches]);

  const go = (i: number) => {
    const b = plan?.buildings[i];
    if (!b) return;
    select(i);
    flyTo(buildingGoal(b));
    setOpen(false);
  };

  return (
    <div className="pointer-events-auto mt-4 max-w-md">
      <form
        role="search"
        className="relative flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (results[0]) go(results[0].i);
        }}
      >
        <label className="glass-strong flex flex-1 items-center gap-2.5 rounded-2xl px-4 py-3 focus-within:border-accent/60">
          <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-ink-3" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m20 20-4.3-4.3" strokeLinecap="round" />
          </svg>
          <span className="sr-only">Light up your stack</span>
          <input
            ref={input}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Light up your stack: python, django"
            disabled={disabled}
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
          />
          {query ? (
            <span className="num shrink-0 text-[12px] text-accent" aria-live="polite">
              {matches ? `${count(matches.size)} ${matches.size === 1 ? "match" : "matches"}` : ""}
            </span>
          ) : (
            <kbd className="hidden rounded-md border border-hair px-1.5 py-0.5 text-[11px] text-ink-3 sm:inline">/</kbd>
          )}
        </label>
        {open && query && matches ? (
          <div id="search-results" className="glass-strong rise absolute inset-x-0 top-full z-30 mt-2 rounded-2xl p-2">
          {matches.size === 0 ? (
            <p className="px-2 py-1.5 text-[13px] text-ink-3">No building matches that. Try a language, framework or topic.</p>
          ) : (
            <>
              <p className="px-2 pb-1 text-[11.5px] text-ink-3">
                Lit in {districts.map(([name, n]) => `${name} (${n})`).join(", ")}. Friendliest first:
              </p>
              <ul>
                {results.map(({ i, repo }) => (
                  <li key={repo.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => go(i)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-hair"
                    >
                      <span className="truncate text-[13.5px] text-ink">{repo.id}</span>
                      <span className="num shrink-0 text-[12px] text-ink-3">
                        {repo.replyHours == null ? "no reply data" : `replies in ${hours(repo.replyHours)}`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          </div>
        ) : null}
      </form>
      <DistrictChips />
      {!open && query.trim() && route.length > 1 && feed ? (
        <div className="glass mt-3 rounded-2xl p-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[12px] tracking-wide text-ink-3 uppercase">Your route through {query.trim()}</h2>
            <button
              type="button"
              onClick={() => startTour(route.map((s) => s.index), `Your route through ${query.trim()}`, route.map((s) => s.why))}
              className="shrink-0 rounded-full bg-accent px-3 py-1 text-[12px] font-medium text-accent-ink hover:scale-[1.03]"
            >
              Fly the route
            </button>
          </div>
          <ol className="mt-1.5 space-y-1">
            {route.map((stop, n) => (
              <li key={stop.index}>
                <button type="button" onClick={() => go(stop.index)} className="flex w-full items-start gap-2 text-left hover:text-accent">
                  <span className="num mt-0.5 w-4 shrink-0 text-[11px] text-ink-3">{n + 1}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] text-ink">{feed.repos[stop.index].id}</span>
                    <span className="block text-[11.5px] leading-snug text-ink-3">{stop.why}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

/** One chip per big district, so a newcomer can jump straight to a language. */
function DistrictChips() {
  const plan = useCity((s) => s.plan);
  const setQuery = useCity((s) => s.setQuery);
  const query = useCity((s) => s.query);
  const sendCommand = useCity((s) => s.sendCommand);
  if (!plan) return null;
  const top = [...plan.districts]
    .filter((d) => d.name !== "Other languages")
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5" aria-label="Jump to a district">
      {top.map((d) => {
        const active = query.trim().toLowerCase() === d.name.toLowerCase();
        return (
          <button
            key={d.name}
            type="button"
            aria-pressed={active}
            onClick={() => {
              if (active) {
                setQuery("");
                sendCommand({ kind: "overview" });
              } else setQuery(d.name);
            }}
            className={`rounded-full border px-2.5 py-1 text-[12px] transition-colors ${
              active ? "border-accent bg-accent text-accent-ink" : "border-hair-strong text-ink-2 hover:border-accent hover:text-ink"
            }`}
          >
            {d.name} <span className="num opacity-70">{d.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function Stats({ stats, preparing, loadError }: { stats: CityStats | null; preparing: boolean; loadError: boolean }) {
  if (loadError && !stats) {
    return (
      <p className="mt-4 text-[13px] text-ink-2" role="status">
        Contributable&apos;s data could not be loaded right now. Try again in a few minutes.
      </p>
    );
  }
  if (!stats) {
    return (
      <p className="mt-4 text-[13px] text-ink-2" role="status">
        {preparing ? "Preparing the city. Contributable is publishing its first index." : ""}
      </p>
    );
  }
  return (
    <p className="num mt-4 text-[13px] text-ink-2">
      <span className="text-ink">{stats.within7dShare == null ? "No data" : `${Math.round(stats.within7dShare * 100)}%`}</span> of outside
      pull requests get a reply within 7 days, across {count(stats.within7dProjects)} projects with enough data.{" "}
      <span className="text-ink">{count(stats.freeIssues)}</span> free first issues right now.
    </p>
  );
}

/** The five friendliest projects, right on the first screen, each one click away. */
function Friendliest() {
  const feed = useCity((s) => s.feed);
  const plan = useCity((s) => s.plan);
  const tour = useCity((s) => s.tour);
  const query = useCity((s) => s.query);
  const select = useCity((s) => s.select);
  const flyTo = useCity((s) => s.flyTo);
  const setMode = useCity((s) => s.setMode);
  if (!feed || !plan || tour.length === 0 || query.trim()) return null;
  return (
    <div className="pointer-events-auto mt-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[12px] tracking-wide text-ink-3 uppercase">Friendliest right now</h2>
        <button type="button" onClick={() => setMode("tour")} className="text-[12.5px] text-accent hover:underline">
          Tour all ten
        </button>
      </div>
      <ol className="mt-1.5 divide-y divide-hair">
        {tour.slice(0, 5).map((i, n) => {
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
                className="flex w-full items-center gap-3 py-1.5 text-left hover:text-accent"
              >
                <span className="num w-4 shrink-0 text-[11px] text-ink-3">{n + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">{r.id}</span>
                <span className="num shrink-0 text-[12px] text-ink-3">
                  {hours(r.replyHours)} reply, {r.available} free {r.available === 1 ? "issue" : "issues"}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Legend() {
  return (
    <aside
      aria-label="How to read the city"
      className="glass pointer-events-auto absolute top-16 right-4 hidden w-56 rounded-2xl p-3.5 text-[12.5px] leading-snug text-ink-2 sm:top-20 sm:right-6 md:block"
    >
      <ul className="space-y-2.5">
        <li className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-5 w-4 items-end justify-center gap-px" aria-hidden="true">
            <span className="h-2 w-1 bg-ink-3" />
            <span className="h-5 w-1 bg-ink-2" />
            <span className="h-3 w-1 bg-ink-3" />
          </span>
          <span><span className="text-ink">Height</span> is how active a project is.</span>
        </li>
        <li className="flex items-start gap-2.5">
          <span className="mt-0.5 size-4 rounded-sm bg-window shadow-[0_0_10px_var(--window)]" aria-hidden="true" />
          <span><span className="text-ink">Lit windows</span> reply to outside pull requests within 48 hours.</span>
        </li>
        <li className="flex items-start gap-2.5">
          <span className="mt-0.5 size-4 rounded-sm border border-hair-strong bg-[#0d1120]" aria-hidden="true" />
          <span><span className="text-ink">Dark towers</span> rarely answer newcomers.</span>
        </li>
      </ul>
    </aside>
  );
}

/** The two things a newcomer most likely wants: the guided tour, and Contributable itself. */
function Actions({ disabled }: { disabled: boolean }) {
  const setMode = useCity((s) => s.setMode);
  return (
    <div className="pointer-events-auto mt-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setMode("tour")}
        className="inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-[14px] font-medium text-accent-ink transition-transform hover:scale-[1.02] active:scale-[0.99] disabled:opacity-50"
      >
        <svg viewBox="0 0 20 20" className="size-3.5" fill="currentColor" aria-hidden="true">
          <path d="M6 4l10 6-10 6z" />
        </svg>
        Take the tour
      </button>
      <a
        href="https://contributable.vercel.app"
        target="_blank"
        rel="noopener"
        className="inline-flex items-center gap-2 rounded-2xl border border-hair-strong px-4 py-2.5 text-[14px] text-ink-2 transition-colors hover:border-accent hover:text-ink"
      >
        Visit Contributable
        <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 13 13 7M8 7h5v5" />
        </svg>
      </a>
    </div>
  );
}

/** A one-line reminder of the controls, shown once the opening flight has landed. */
function Hint() {
  const [shown, setShown] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShown(false), 9000);
    return () => clearTimeout(timer);
  }, []);
  if (!shown) return null;
  return (
    <p className="glass rise pointer-events-auto absolute bottom-20 left-1/2 hidden -translate-x-1/2 rounded-full px-4 py-2 text-[12.5px] whitespace-nowrap text-ink-2 sm:bottom-24 md:block">
      Drag to orbit, right-drag to slide, scroll to zoom, click a building for its card.
      <button type="button" onClick={() => setShown(false)} className="ml-2 text-ink-3 hover:text-ink" aria-label="Dismiss">
        x
      </button>
    </p>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CityStats } from "@/lib/city/stats";
import { compactDate, count } from "@/lib/format";
import { useCity } from "@/lib/store";

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
        className={`flex flex-1 flex-col justify-center px-4 pb-28 transition-opacity duration-500 sm:px-6 sm:pb-20 ${
          quiet ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="max-w-xl">
          <h1 className="text-[clamp(2.4rem,7vw,4.6rem)] leading-[0.95] font-semibold tracking-[-0.03em] text-ink">
            OSS City
          </h1>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-2 sm:text-base">{TAGLINE}</p>
          <SearchBox disabled={preparing} />
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
  const input = useRef<HTMLInputElement>(null);

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

  return (
    <form
      role="search"
      className="pointer-events-auto mt-5 flex max-w-md items-center gap-2"
      onSubmit={(e) => e.preventDefault()}
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
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Light up your stack"
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
    </form>
  );
}

function Stats({ stats, preparing, loadError }: { stats: CityStats | null; preparing: boolean; loadError: boolean }) {
  if (loadError && !stats) {
    return (
      <p className="mt-6 text-[13px] text-ink-2" role="status">
        Contributable&apos;s data could not be loaded right now. Try again in a few minutes.
      </p>
    );
  }
  if (!stats) {
    return (
      <p className="mt-6 text-[13px] text-ink-2" role="status">
        {preparing ? "Preparing the city. Contributable is publishing its first index." : ""}
      </p>
    );
  }
  const items: [string, string][] = [
    [count(stats.projects), "projects in the city"],
    [
      stats.within7dShare == null ? "No data" : `${Math.round(stats.within7dShare * 100)}%`,
      `of outside PRs answered within 7 days, across ${count(stats.within7dProjects)} projects`,
    ],
    [count(stats.freeIssues), "free first issues right now"],
  ];
  return (
    <dl className="mt-5 grid max-w-lg grid-cols-3 gap-2 sm:mt-6 sm:gap-3">
      {items.map(([value, label]) => (
        <div key={label} className="glass rounded-2xl px-2.5 py-2.5 sm:px-3.5 sm:py-3">
          <dd className="num text-[clamp(1.3rem,3.2vw,1.9rem)] leading-none font-semibold tracking-tight text-ink">
            {value}
          </dd>
          <dt className="mt-1 text-[10.5px] leading-snug text-ink-3 sm:mt-1.5 sm:text-[11.5px]">{label}</dt>
        </div>
      ))}
    </dl>
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
    <div className="pointer-events-auto mt-3 flex flex-wrap items-center gap-2">
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
    <p className="glass rise pointer-events-auto absolute right-4 bottom-20 hidden rounded-full px-4 py-2 text-[12.5px] text-ink-2 sm:bottom-24 sm:right-6 md:block">
      Drag to fly, scroll to zoom, click a building for its card, double-click to focus.
      <button type="button" onClick={() => setShown(false)} className="ml-2 text-ink-3 hover:text-ink" aria-label="Dismiss">
        x
      </button>
    </p>
  );
}

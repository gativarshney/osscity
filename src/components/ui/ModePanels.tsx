"use client";

import { lightFor } from "@/lib/city/encode";
import { count, hours, percent } from "@/lib/format";
import { useCity } from "@/lib/store";

/** The caption shown at each stop of the tour. */
export function TourCaption() {
  const feed = useCity((s) => s.feed);
  const mode = useCity((s) => s.mode);
  const tour = useCity((s) => s.tour);
  const step = useCity((s) => s.tourStep);
  const setMode = useCity((s) => s.setMode);
  const resetView = useCity((s) => s.resetView);
  if (mode !== "tour" || !feed) return null;
  const repo = feed.repos[tour[step]];
  if (!repo) return null;
  const org = repo.gsoc ? (feed.orgs[repo.gsoc] ?? repo.gsoc) : null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-20 z-30 flex justify-center px-4 sm:bottom-10" aria-live="polite">
      <div key={repo.id} className="glass-strong rise pointer-events-auto flex max-w-xl items-center gap-4 rounded-3xl px-5 py-4">
        <span className="num shrink-0 text-[12px] text-ink-3">
          {step + 1} of {tour.length}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold tracking-tight text-ink">{repo.id}</p>
          <p className="text-[13px] text-ink-2">
            First reply in {hours(repo.replyHours)}, {percent(repo.within48h)} within 48 h, {count(repo.available)} free first{" "}
            {repo.available === 1 ? "issue" : "issues"}
            {org ? `. ${org}.` : "."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setMode("explore");
            resetView();
          }}
          className="shrink-0 rounded-full border border-hair-strong px-3 py-1.5 text-[12px] text-ink-2 hover:text-ink"
        >
          Stop
        </button>
      </div>
    </div>
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
      className="glass-strong rise pointer-events-auto absolute inset-x-0 bottom-16 z-30 mx-3 max-h-[55dvh] overflow-y-auto rounded-3xl p-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:mx-0 sm:w-[380px] sm:p-5"
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
                  flyTo({ target: [b.x, b.height * 0.5, b.z], distance: 10 + b.height * 1.2, azimuth: Math.PI / 5, elevation: 0.5, seconds: 1.2 });
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

/** A short line under the search box describing what is lit in the current mode. */
export function ModeHint() {
  const mode = useCity((s) => s.mode);
  const feed = useCity((s) => s.feed);
  const tour = useCity((s) => s.tour);
  if (!feed) return null;
  if (mode === "tour") return null;
  if (mode === "ghosts") return null;
  if (mode === "compare") return null;
  const lit = feed.repos.filter((r) => lightFor(r).kind === "lit").length;
  return (
    <span className="sr-only">
      {count(lit)} buildings have lit windows. {count(tour.length)} are on the tour.
    </span>
  );
}

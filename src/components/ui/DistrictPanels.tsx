"use client";

import { useMemo, useState } from "react";
import { rankDistricts, type DistrictSort, type DistrictStats } from "@/lib/city/districts";
import { count, hours, percent } from "@/lib/format";
import { buildingGoal, useCity } from "@/lib/store";
import { contributableUrl } from "./RepoCard";

const CLOSE = (
  <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="m5 5 10 10M15 5 5 15" />
  </svg>
);

/** One district: its figures with their samples, its friendliest projects and its ghost towns. */
export function DistrictPanel() {
  const feed = useCity((s) => s.feed);
  const plan = useCity((s) => s.plan);
  const districts = useCity((s) => s.districts);
  const name = useCity((s) => s.district);
  const open = useCity((s) => s.openDistrict);
  const select = useCity((s) => s.select);
  const flyTo = useCity((s) => s.flyTo);
  const frame = useCity((s) => s.frame);
  const setQuery = useCity((s) => s.setQuery);
  const startTour = useCity((s) => s.startTour);
  const stats = districts.find((d) => d.name === name);
  if (!feed || !plan || !stats) return null;
  const all = districts.filter((d) => d.withEvidence >= 5);
  const rankOf = (by: DistrictSort) => rankDistricts(districts, by).findIndex((d) => d.name === stats.name) + 1;
  const indices = plan.buildings.filter((b) => b.district === stats.name).map((b) => b.index);

  return (
    <section
      aria-label={`District: ${stats.name}`}
      className="glass-strong rise pointer-events-auto absolute inset-x-0 bottom-16 z-30 mx-3 max-h-[70dvh] overflow-y-auto rounded-3xl p-4 sm:inset-x-auto sm:top-20 sm:right-6 sm:bottom-auto sm:mx-0 sm:max-h-[calc(100dvh-8rem)] sm:w-[400px] sm:p-5"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] tracking-wide text-ink-3 uppercase">District</p>
          <h2 className="truncate text-xl font-semibold tracking-tight text-ink">{stats.name}</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-3">
            {count(stats.count)} repositories, {count(stats.withEvidence)} with enough outside PRs to judge
          </p>
        </div>
        <button type="button" onClick={() => open(null)} className="rounded-full p-1.5 text-ink-3 hover:bg-hair hover:text-ink" aria-label="Close district">
          {CLOSE}
        </button>
      </header>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        <Figure
          label="Answered within 7 days"
          value={stats.within7d == null ? "Not enough data" : percent(stats.within7d)}
          note={stats.within7d == null ? `under 5 projects with evidence` : `mean over ${count(stats.withEvidence)} projects, rank ${rankOf("within7d")} of ${all.length}`}
        />
        <Figure
          label="Typical first reply"
          value={hours(stats.medianReplyHours)}
          note={stats.medianReplyHours == null ? "" : `median project, rank ${rankOf("medianReplyHours")} of ${all.length}`}
        />
        <Figure
          label="Outside PRs merged"
          value={stats.mergeRate == null ? "Not enough data" : percent(stats.mergeRate)}
          note={stats.mergeRate == null ? "" : `mean over ${count(stats.mergeN)} projects`}
        />
        <Figure
          label="Free first issues"
          value={count(stats.freeIssues)}
          note={`in ${count(stats.withFreeIssues)} ${stats.withFreeIssues === 1 ? "project" : "projects"}`}
        />
        <Figure label="Commits, 90 days" value={count(stats.commits90d)} note={`${count(stats.stars)} stars in all`} />
        <Figure label="Ghost towns" value={count(stats.ghosts)} note="popular, rarely answer" />
      </dl>

      {stats.friendliest.length ? (
        <div className="mt-4">
          <h3 className="text-[11.5px] tracking-wide text-ink-3 uppercase">Friendliest here</h3>
          <ol className="mt-1 divide-y divide-hair">
            {stats.friendliest.map((i) => {
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
                    className="flex w-full items-center justify-between gap-3 py-1.5 text-left hover:text-accent"
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
        </div>
      ) : (
        <p className="mt-4 text-[13px] text-ink-3">No project here has enough outside pull requests to be called friendly yet.</p>
      )}

      {stats.ghostList.length ? (
        <div className="mt-4">
          <h3 className="text-[11.5px] tracking-wide text-ink-3 uppercase">Ghost towns here</h3>
          <ul className="mt-1 divide-y divide-hair">
            {stats.ghostList.map((i) => {
              const r = feed.repos[i];
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 py-1.5">
                  <a href={contributableUrl(r.id)} target="_blank" rel="noopener" className="truncate text-[13.5px] text-ink hover:text-accent">
                    {r.id}
                  </a>
                  <span className="num shrink-0 text-[12px] text-ink-3">
                    {percent(r.within7d)} in 7 d, {count(r.stars)} stars
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => frame(indices)} className="rounded-2xl border border-hair-strong px-3.5 py-2 text-[13px] text-ink-2 hover:text-ink">
          Fly over it
        </button>
        {stats.friendliest.length > 1 ? (
          <button
            type="button"
            onClick={() => startTour(stats.friendliest, `Friendliest in ${stats.name}`)}
            className="rounded-2xl border border-hair-strong px-3.5 py-2 text-[13px] text-ink-2 hover:text-ink"
          >
            Tour the friendliest
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setQuery(stats.name === "Other languages" || stats.name === "Other organisations" ? "" : stats.name);
            open(null);
          }}
          className="rounded-2xl border border-hair-strong px-3.5 py-2 text-[13px] text-ink-2 hover:text-ink"
        >
          Light it up
        </button>
      </div>
    </section>
  );
}

function Figure({ label, value, note }: { label: string; value: string; note: string }) {
  const small = value === "Not enough data";
  return (
    <div>
      <dt className="text-[11px] tracking-wide text-ink-3 uppercase">{label}</dt>
      <dd className={`num mt-0.5 font-semibold tracking-tight text-ink ${small ? "text-[13px]" : "text-[20px]"}`}>{value}</dd>
      {note ? <dd className="text-[11.5px] text-ink-3">{note}</dd> : null}
    </div>
  );
}

const SORTS: { by: DistrictSort; label: string; question: string }[] = [
  { by: "within7d", label: "Reply within 7 days", question: "Which districts answer newcomers?" },
  { by: "medianReplyHours", label: "Typical first reply", question: "Where is the first reply fastest?" },
  { by: "mergeRate", label: "Outside PRs merged", question: "Where does outside work get merged?" },
  { by: "freeIssues", label: "Free first issues", question: "Where is there most to pick up?" },
  { by: "count", label: "Size", question: "Which districts are biggest?" },
];

/** Every district ranked by one figure: the ecosystem at a glance. */
export function RankingPanel() {
  const districts = useCity((s) => s.districts);
  const ranking = useCity((s) => s.ranking);
  const setRanking = useCity((s) => s.setRanking);
  const open = useCity((s) => s.openDistrict);
  const groupBy = useCity((s) => s.groupBy);
  const [by, setBy] = useState<DistrictSort>("within7d");
  const rows = useMemo(() => rankDistricts(districts, by), [districts, by]);
  if (!ranking || districts.length === 0) return null;
  const sort = SORTS.find((s) => s.by === by) ?? SORTS[0];
  const max = Math.max(1, ...rows.map((r) => bar(r, by)));

  return (
    <section
      aria-label="District ranking"
      className="glass-strong rise pointer-events-auto absolute inset-x-0 bottom-16 z-30 mx-3 max-h-[70dvh] overflow-y-auto rounded-3xl p-4 sm:inset-x-auto sm:top-20 sm:right-6 sm:bottom-auto sm:mx-0 sm:max-h-[calc(100dvh-8rem)] sm:w-[440px] sm:p-5"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] tracking-wide text-ink-3 uppercase">{groupBy === "language" ? "Languages" : "Organisations"}</p>
          <h2 className="text-xl font-semibold tracking-tight text-ink">{sort.question}</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-3">
            Districts with at least five projects that have enough outside pull requests. Means over those projects.
          </p>
        </div>
        <button type="button" onClick={() => setRanking(false)} className="rounded-full p-1.5 text-ink-3 hover:bg-hair hover:text-ink" aria-label="Close ranking">
          {CLOSE}
        </button>
      </header>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {SORTS.map((s) => (
          <button
            key={s.by}
            type="button"
            aria-pressed={by === s.by}
            onClick={() => setBy(s.by)}
            className={`rounded-full border px-2.5 py-1 text-[12px] ${
              by === s.by ? "border-accent bg-accent text-accent-ink" : "border-hair-strong text-ink-2 hover:text-ink"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <ol className="mt-3 space-y-1.5">
        {rows.map((d, n) => (
          <li key={d.name}>
            <button type="button" onClick={() => open(d.name)} className="group w-full text-left">
              <span className="flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="num w-5 shrink-0 text-[11px] text-ink-3">{n + 1}</span>
                  <span className="truncate text-[13.5px] text-ink group-hover:text-accent">{d.name}</span>
                  <span className="num shrink-0 text-[11px] text-ink-3">{count(d.withEvidence)} judged</span>
                </span>
                <span className="num shrink-0 text-[13px] text-ink">{value(d, by)}</span>
              </span>
              <span className="mt-1 block h-1 w-full rounded-full bg-hair" aria-hidden="true">
                <span className="block h-full rounded-full bg-accent" style={{ width: `${(bar(d, by) / max) * 100}%` }} />
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

function value(d: DistrictStats, by: DistrictSort): string {
  switch (by) {
    case "within7d":
      return percent(d.within7d);
    case "medianReplyHours":
      return hours(d.medianReplyHours);
    case "mergeRate":
      return percent(d.mergeRate);
    case "freeIssues":
      return count(d.freeIssues);
    case "count":
      return count(d.count);
  }
}

function bar(d: DistrictStats, by: DistrictSort): number {
  switch (by) {
    case "within7d":
      return d.within7d ?? 0;
    case "medianReplyHours":
      return d.medianReplyHours == null ? 0 : 1 / (1 + d.medianReplyHours / 24);
    case "mergeRate":
      return d.mergeRate ?? 0;
    case "freeIssues":
      return d.freeIssues;
    case "count":
      return d.count;
  }
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { lightFor, MIN_REPLY_SAMPLE } from "@/lib/city/encode";
import { busiestRange, DEFAULT_TIME_ZONE, shiftHours, zoneOffsetHours } from "@/lib/city/hours";
import type { CityRepo } from "@/lib/city/types";
import { count, hours, percent, yearsRange } from "@/lib/format";
import { useCity } from "@/lib/store";

export const CONTRIBUTABLE = "https://contributable.vercel.app";

export function contributableUrl(id: string): string {
  return `${CONTRIBUTABLE}/repo/${id}`;
}

/** The card for the selected building. A panel on wide screens, a bottom sheet on phones. */
export function RepoCard() {
  const feed = useCity((s) => s.feed);
  const plan = useCity((s) => s.plan);
  const selected = useCity((s) => s.selected);
  const select = useCity((s) => s.select);
  const flyTo = useCity((s) => s.flyTo);
  const closeButton = useRef<HTMLButtonElement>(null);

  const repo = feed && selected != null ? feed.repos[selected] : null;

  useEffect(() => {
    if (!repo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") select(null);
    };
    window.addEventListener("keydown", onKey);
    closeButton.current?.focus({ preventScroll: true });
    return () => window.removeEventListener("keydown", onKey);
  }, [repo, select]);

  if (!repo || !feed || selected == null) return null;
  const building = plan?.buildings[selected];
  const orgName = repo.gsoc ? (feed.orgs[repo.gsoc] ?? repo.gsoc) : null;

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="repo-card-title"
      className="glass-strong rise pointer-events-auto absolute inset-x-0 bottom-0 z-30 max-h-[78dvh] overflow-y-auto rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:top-20 sm:right-6 sm:bottom-auto sm:max-h-[calc(100dvh-7rem)] sm:w-[380px] sm:rounded-3xl sm:p-6"
    >
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-hair-strong sm:hidden" aria-hidden="true" />
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[12px] text-ink-3">{repo.id.split("/")[0]}</p>
          <h2 id="repo-card-title" className="truncate text-xl font-semibold tracking-tight text-ink">
            {repo.id.split("/")[1]}
          </h2>
        </div>
        <button
          ref={closeButton}
          type="button"
          onClick={() => select(null)}
          aria-label="Close"
          className="shrink-0 rounded-full p-2 text-ink-3 hover:bg-hair hover:text-ink"
        >
          <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="m5 5 10 10M15 5 5 15" />
          </svg>
        </button>
      </header>
      {repo.d ? <p className="mt-2 line-clamp-2 text-[13.5px] leading-snug text-ink-2">{repo.d}</p> : null}

      <Badges repo={repo} />

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
        <Metric label="First reply" value={hours(repo.replyHours)} note={replyNote(repo)} />
        <Metric
          label="Outside PRs merged"
          value={repo.mergeRate == null ? "Not enough data" : percent(repo.mergeRate)}
          note={repo.decided > 0 ? `of ${count(repo.decided)} decided` : "no decisions yet"}
        />
        <Metric
          label="Free first issues"
          value={count(repo.available)}
          note={repo.helpWanted > 0 ? `${count(repo.helpWanted)} help wanted` : "beginner labelled, unclaimed"}
        />
        <Metric
          label="Activity"
          value={`${count(repo.commits90d)} commits`}
          note={`90 days, ${count(repo.prsYear)} outside PRs a year`}
        />
      </dl>

      <ReplyHours profile={repo.hours} />

      {orgName ? (
        <p className="mt-5 text-[13px] text-ink-2">
          <span className="text-ink-3">Google Summer of Code</span> {orgName}
          {repo.years.length ? <span className="text-ink-3">, {yearsRange(repo.years)}</span> : null}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <a
          href={contributableUrl(repo.id)}
          target="_blank"
          rel="noopener"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-[14px] font-medium text-accent-ink transition-transform hover:scale-[1.02] active:scale-[0.99]"
        >
          Open in Contributable
          <svg viewBox="0 0 20 20" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7 13 13 7M8 7h5v5" />
          </svg>
        </a>
        {building ? (
          <button
            type="button"
            onClick={() =>
              flyTo({
                target: [building.x, building.height * 0.5, building.z],
                distance: 10 + building.height * 1.2,
                azimuth: Math.PI / 5,
                elevation: 0.5,
                seconds: 1.2,
              })
            }
            className="rounded-2xl border border-hair-strong px-4 py-2.5 text-[14px] text-ink-2 hover:text-ink"
          >
            Fly here
          </button>
        ) : null}
      </div>
    </section>
  );
}

function replyNote(repo: CityRepo): string {
  if (repo.noPulls) return "does not take pull requests";
  if (repo.replyN < MIN_REPLY_SAMPLE) return `${count(repo.replyN)} outside PRs, under ${MIN_REPLY_SAMPLE}`;
  return `${percent(repo.within48h)} within 48 h, ${count(repo.replyN)} PRs`;
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  const small = value === "Not enough data";
  return (
    <div>
      <dt className="text-[11.5px] tracking-wide text-ink-3 uppercase">{label}</dt>
      <dd className={`num mt-0.5 font-semibold tracking-tight text-ink ${small ? "text-[14px]" : "text-[22px]"}`}>
        {value}
      </dd>
      <dd className="text-[12px] text-ink-3">{note}</dd>
    </div>
  );
}

function Badges({ repo }: { repo: CityRepo }) {
  const { kind } = lightFor(repo);
  const label =
    kind === "lit"
      ? "Lit windows"
      : kind === "dim"
        ? "Some lights on"
        : kind === "dark"
          ? "Dark tower"
          : "Not enough data";
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5 text-[12px]">
      <li className="rounded-full border border-hair-strong px-2.5 py-1 text-ink-2">{label}</li>
      {repo.lang.slice(0, 2).map((l) => (
        <li key={l} className="rounded-full bg-hair px-2.5 py-1 text-ink-2">
          {l}
        </li>
      ))}
      <li className="num rounded-full bg-hair px-2.5 py-1 text-ink-2">{count(repo.stars)} stars</li>
    </ul>
  );
}

/** Busiest reply hours, in the visitor's time zone. */
function ReplyHours({ profile }: { profile: number[] | null }) {
  // This card only renders on the client, after a click, so the zone can be read at once.
  const [zone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIME_ZONE;
    } catch {
      return DEFAULT_TIME_ZONE;
    }
  });
  const local = useMemo(() => (profile ? shiftHours(profile, zoneOffsetHours(zone)) : null), [profile, zone]);
  const zoneLabel = zone === DEFAULT_TIME_ZONE || zone === "Asia/Calcutta" ? "IST" : zone.replace(/_/g, " ");
  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between">
        <p className="text-[11.5px] tracking-wide text-ink-3 uppercase">Busiest reply hours</p>
        <p className="text-[12px] text-ink-3">{zoneLabel}</p>
      </div>
      {local ? (
        <>
          <p className="num mt-0.5 text-[15px] font-medium text-ink">{busiestRange(local) ?? "Not enough data"}</p>
          <div className="mt-2 flex h-8 items-end gap-px" aria-hidden="true">
            {local.map((v, h) => (
              <span
                key={h}
                className="flex-1 rounded-sm bg-accent"
                style={{ height: `${Math.max(6, (v / 9) * 100)}%`, opacity: 0.25 + (v / 9) * 0.75 }}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-ink-3" aria-hidden="true">
            <span>00</span>
            <span>06</span>
            <span>12</span>
            <span>18</span>
            <span>24</span>
          </div>
        </>
      ) : (
        <p className="mt-0.5 text-[14px] text-ink-2">Not enough data</p>
      )}
    </div>
  );
}

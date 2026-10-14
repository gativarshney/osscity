"use client";

import { lightFor } from "@/lib/city/encode";
import type { CityRepo } from "@/lib/city/types";
import { count, hours, percent } from "@/lib/format";
import { useCity } from "@/lib/store";
import { contributableUrl } from "./RepoCard";

/** Two buildings side by side. */
export function ComparePanel() {
  const feed = useCity((s) => s.feed);
  const mode = useCity((s) => s.mode);
  const picks = useCity((s) => s.compare);
  const togglePick = useCity((s) => s.togglePick);
  const setMode = useCity((s) => s.setMode);
  if (mode !== "compare" || !feed) return null;
  const repos = picks.map((i) => feed.repos[i]).filter(Boolean) as CityRepo[];

  return (
    <section
      aria-label="Compare two projects"
      className="glass-strong rise pointer-events-auto absolute inset-x-0 bottom-16 z-30 mx-3 rounded-3xl p-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:mx-0 sm:w-[520px] sm:p-5"
    >
      <header className="flex items-center justify-between">
        <h2 className="text-[13px] font-medium text-ink-2">
          {repos.length < 2 ? `Pick ${2 - repos.length} ${repos.length === 1 ? "more building" : "buildings"} to compare` : "Side by side"}
        </h2>
        <button type="button" onClick={() => setMode("explore")} className="rounded-full p-1.5 text-ink-3 hover:bg-hair hover:text-ink" aria-label="Close compare">
          <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="m5 5 10 10M15 5 5 15" />
          </svg>
        </button>
      </header>
      {repos.length === 0 ? (
        <p className="mt-2 text-[13px] text-ink-3">Click a building, then another. The two glow while the rest dim.</p>
      ) : (
        <table className="num mt-3 w-full text-[13px]">
          <thead>
            <tr className="text-left text-[12px] text-ink-3">
              <th scope="col" className="w-1/3 py-1 font-normal">Metric</th>
              {repos.map((r) => (
                <th key={r.id} scope="col" className="py-1 pl-3 font-medium text-ink">
                  <span className="flex items-center justify-between gap-2">
                    <a href={contributableUrl(r.id)} target="_blank" rel="noopener" className="truncate font-sans hover:text-accent">
                      {r.id.split("/")[1]}
                    </a>
                    <button
                      type="button"
                      onClick={() => togglePick(feed.repos.indexOf(r))}
                      className="rounded-full px-1.5 text-ink-3 hover:text-ink"
                      aria-label={`Remove ${r.id}`}
                    >
                      x
                    </button>
                  </span>
                </th>
              ))}
              {repos.length === 1 ? <th className="py-1 pl-3 font-normal text-ink-3">pick another</th> : null}
            </tr>
          </thead>
          <tbody className="text-ink-2">
            <Row label="Windows" cells={repos.map((r) => kindLabel(r))} />
            <Row label="First reply" cells={repos.map((r) => hours(r.replyHours))} />
            <Row label="Within 48 h" cells={repos.map((r) => withN(r.within48h, r.replyN))} />
            <Row label="Within 7 d" cells={repos.map((r) => withN(r.within7d, r.replyN))} />
            <Row label="Outside PRs merged" cells={repos.map((r) => withN(r.mergeRate, r.decided))} />
            <Row label="Free first issues" cells={repos.map((r) => count(r.available))} />
            <Row label="Commits, 90 days" cells={repos.map((r) => count(r.commits90d))} />
            <Row label="Stars" cells={repos.map((r) => count(r.stars))} />
            <Row label="Language" cells={repos.map((r) => r.lang[0] ?? "none")} sans />
          </tbody>
        </table>
      )}
    </section>
  );
}

function withN(share: number | null, n: number): string {
  return share == null ? "Not enough data" : `${percent(share)} of ${count(n)}`;
}

function kindLabel(r: CityRepo): string {
  const k = lightFor(r).kind;
  return k === "lit" ? "Lit" : k === "dim" ? "Some" : k === "dark" ? "Dark" : "No data";
}

function Row({ label, cells, sans }: { label: string; cells: string[]; sans?: boolean }) {
  return (
    <tr className="border-t border-hair">
      <th scope="row" className="py-1.5 pr-2 text-left font-sans font-normal text-ink-3">
        {label}
      </th>
      {cells.map((c, i) => (
        <td key={i} className={`py-1.5 pl-3 ${sans ? "font-sans" : ""} ${c === "Not enough data" ? "text-ink-3" : "text-ink"}`}>
          {c}
        </td>
      ))}
    </tr>
  );
}

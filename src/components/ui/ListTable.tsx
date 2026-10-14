"use client";

import { useMemo, useState } from "react";
import { heightFor, lightFor } from "@/lib/city/encode";
import { searchRepos } from "@/lib/city/search";
import type { CityRepo } from "@/lib/city/types";
import { count, hours, percent } from "@/lib/format";
import { contributableUrl } from "./RepoCard";

type Key = "id" | "activity" | "reply" | "within48h" | "merge" | "issues" | "stars";

const COLUMNS: { key: Key; label: string; numeric: boolean }[] = [
  { key: "id", label: "Repository", numeric: false },
  { key: "activity", label: "Activity", numeric: true },
  { key: "reply", label: "First reply", numeric: true },
  { key: "within48h", label: "Within 48 h", numeric: true },
  { key: "merge", label: "Outside PRs merged", numeric: true },
  { key: "issues", label: "Free issues", numeric: true },
  { key: "stars", label: "Stars", numeric: true },
];

function value(repo: CityRepo, key: Key): number | string {
  switch (key) {
    case "id":
      return repo.id.toLowerCase();
    case "activity":
      return heightFor(repo);
    case "reply":
      return repo.replyHours ?? Number.POSITIVE_INFINITY;
    case "within48h":
      return repo.within48h ?? -1;
    case "merge":
      return repo.mergeRate ?? -1;
    case "issues":
      return repo.available;
    case "stars":
      return repo.stars;
  }
}

const PAGE = 100;

/** An accessible, sortable table of every repository. */
export function ListTable({ repos }: { repos: CityRepo[] }) {
  const [sortKey, setSortKey] = useState<Key>("within48h");
  const [desc, setDesc] = useState(true);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const rows = useMemo(() => {
    const matched = query.trim() ? searchRepos(repos, query) : null;
    const list = repos
      .map((repo, index) => ({ repo, index }))
      .filter((r) => !matched || matched.has(r.index));
    list.sort((a, b) => {
      const va = value(a.repo, sortKey);
      const vb = value(b.repo, sortKey);
      const cmp = typeof va === "string" && typeof vb === "string" ? va.localeCompare(vb) : Number(va) - Number(vb);
      return (desc ? -cmp : cmp) || a.repo.id.localeCompare(b.repo.id);
    });
    return list.map((r) => r.repo);
  }, [repos, sortKey, desc, query]);

  const sortBy = (key: Key) => {
    if (key === sortKey) setDesc((d) => !d);
    else {
      setSortKey(key);
      setDesc(key !== "id" && key !== "reply");
    }
    setLimit(PAGE);
  };

  return (
    <div className="mt-6">
      <label className="glass flex max-w-md items-center gap-2 rounded-2xl px-4 py-2.5">
        <span className="sr-only">Filter by language, framework, topic or name</span>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(PAGE);
          }}
          placeholder="Filter: python, django"
          className="min-w-0 flex-1 bg-transparent text-[14.5px] text-ink outline-none placeholder:text-ink-3"
        />
        <span className="num text-[12px] text-ink-3" aria-live="polite">
          {count(rows.length)} of {count(repos.length)}
        </span>
      </label>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-hair">
        <table className="w-full min-w-[760px] text-[13.5px]">
          <caption className="sr-only">Every repository in the city, sorted by {COLUMNS.find((c) => c.key === sortKey)?.label}</caption>
          <thead className="bg-bg-2 text-[12px] text-ink-3">
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={sortKey === c.key ? (desc ? "descending" : "ascending") : "none"}
                  className={`px-3 py-2.5 font-medium ${c.numeric ? "text-right" : "text-left"}`}
                >
                  <button
                    type="button"
                    onClick={() => sortBy(c.key)}
                    className="inline-flex items-center gap-1 rounded hover:text-ink"
                  >
                    {c.label}
                    {sortKey === c.key ? <span aria-hidden="true">{desc ? "v" : "^"}</span> : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((r) => {
              const light = lightFor(r);
              return (
                <tr key={r.id} className="border-t border-hair hover:bg-bg-2">
                  <th scope="row" className="px-3 py-2 text-left font-normal">
                    <a href={contributableUrl(r.id)} className="text-ink hover:text-accent" target="_blank" rel="noopener">
                      {r.id}
                    </a>
                    <span className="ml-2 text-[12px] text-ink-3">{r.lang[0] ?? ""}</span>
                  </th>
                  <td className="num px-3 py-2 text-right text-ink-2">
                    {count(r.commits90d)} <span className="text-ink-3">commits</span>
                  </td>
                  <td className={`num px-3 py-2 text-right ${r.replyHours == null ? "text-ink-3" : "text-ink-2"}`}>
                    {hours(r.replyHours)}
                  </td>
                  <td className={`num px-3 py-2 text-right ${light.kind === "unknown" ? "text-ink-3" : "text-ink-2"}`}>
                    {r.within48h == null ? "Not enough data" : `${percent(r.within48h)} of ${count(r.replyN)}`}
                  </td>
                  <td className={`num px-3 py-2 text-right ${r.mergeRate == null ? "text-ink-3" : "text-ink-2"}`}>
                    {r.mergeRate == null ? "Not enough data" : `${percent(r.mergeRate)} of ${count(r.decided)}`}
                  </td>
                  <td className="num px-3 py-2 text-right text-ink-2">{count(r.available)}</td>
                  <td className="num px-3 py-2 text-right text-ink-2">{count(r.stars)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length > limit ? (
        <button
          type="button"
          onClick={() => setLimit((l) => l + PAGE)}
          className="mt-4 rounded-full border border-hair-strong px-4 py-2 text-[13.5px] text-ink-2 hover:text-ink"
        >
          Show {count(Math.min(PAGE, rows.length - limit))} more
        </button>
      ) : null}
    </div>
  );
}

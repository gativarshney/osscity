"use client";

import { LENSES } from "@/lib/city/lens";
import { useCity } from "@/lib/store";

/** What the city reveals: the lens, the grouping, and the ranking. Top centre. */
export function LensBar() {
  const feed = useCity((s) => s.feed);
  const lens = useCity((s) => s.lens);
  const setLens = useCity((s) => s.setLens);
  const groupBy = useCity((s) => s.groupBy);
  const setGroupBy = useCity((s) => s.setGroupBy);
  const ranking = useCity((s) => s.ranking);
  const setRanking = useCity((s) => s.setRanking);
  const mode = useCity((s) => s.mode);
  if (!feed || mode === "tour") return null;
  const current = LENSES.find((l) => l.id === lens) ?? LENSES[0];

  return (
    <div className="pointer-events-none absolute inset-x-0 top-14 z-20 flex flex-col items-center gap-1.5 px-3 sm:top-5">
      <div
        role="group"
        aria-label="What the city reveals"
        className="glass-strong pointer-events-auto flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full p-1"
      >
        {LENSES.map((l) => (
          <button
            key={l.id}
            type="button"
            aria-pressed={lens === l.id}
            title={l.question}
            onClick={() => setLens(l.id)}
            className={`rounded-full px-3 py-1.5 text-[12.5px] whitespace-nowrap transition-colors ${
              lens === l.id ? "bg-ink text-bg" : "text-ink-2 hover:bg-hair hover:text-ink"
            }`}
          >
            {l.label}
          </button>
        ))}
        <span className="mx-0.5 h-4 w-px bg-hair" aria-hidden="true" />
        <button
          type="button"
          onClick={() => setGroupBy(groupBy === "language" ? "org" : "language")}
          title="Group districts by language or by Google Summer of Code organisation"
          className="rounded-full px-3 py-1.5 text-[12.5px] whitespace-nowrap text-ink-2 hover:bg-hair hover:text-ink"
        >
          {groupBy === "language" ? "By language" : "By organisation"}
        </button>
        <button
          type="button"
          aria-pressed={ranking}
          onClick={() => setRanking(!ranking)}
          title="Rank districts: which parts of open source answer newcomers?"
          className={`rounded-full px-3 py-1.5 text-[12.5px] whitespace-nowrap transition-colors ${
            ranking ? "bg-accent text-accent-ink" : "text-ink-2 hover:bg-hair hover:text-ink"
          }`}
        >
          Rank districts
        </button>
      </div>
      <p className="pointer-events-none hidden text-[12px] text-ink-3 sm:block" aria-live="polite">
        {current.question}
      </p>
    </div>
  );
}

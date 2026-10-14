"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { compactDate } from "@/lib/format";
import { downloadCanvas, renderPostcard } from "@/lib/postcard";
import { useCity, type Mode } from "@/lib/store";

interface Props {
  generatedAt: string | null;
}

const MODES: { mode: Mode; label: string; key: string; hint: string }[] = [
  { mode: "tour", label: "Tour the 10 friendliest", key: "t", hint: "Fly past the ten most welcoming projects" },
  { mode: "ghosts", label: "Ghost towns", key: "g", hint: "Popular projects that rarely answer newcomers" },
  { mode: "compare", label: "Compare", key: "c", hint: "Pick two buildings to see them side by side" },
];

/** Modes, view switches, reset and the postcard. Keyboard: T, G, C, M, R, P, Esc. */
export function ModeBar({ generatedAt }: Props) {
  const mode = useCity((s) => s.mode);
  const setMode = useCity((s) => s.setMode);
  const view = useCity((s) => s.view);
  const setView = useCity((s) => s.setView);
  const resetView = useCity((s) => s.resetView);
  const feed = useCity((s) => s.feed);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const toggle = (m: Mode) => setMode(mode === m ? "explore" : m);

  const postcard = async () => {
    const source = document.querySelector<HTMLCanvasElement>("canvas");
    if (!source || saving) return;
    setSaving(true);
    try {
      // Let the current frame finish drawing before reading the buffer.
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const caption = feed
        ? `${feed.repos.length.toLocaleString("en-GB")} open source projects from Google Summer of Code organisations`
        : "Open source projects from Google Summer of Code organisations";
      const out = renderPostcard({
        source,
        caption,
        updated: compactDate(generatedAt ?? feed?.generatedAt ?? null),
      });
      downloadCanvas(out, `osscity-${new Date().toISOString().slice(0, 10)}.png`);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const m = MODES.find((x) => x.key === k);
      if (m) toggle(m.mode);
      else if (k === "m") setView(view === "3d" ? "2d" : "3d");
      else if (k === "r") resetView();
      else if (k === "p") void postcard();
      else if (k === "escape") {
        if (useCity.getState().selected == null) setMode("explore");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, view, feed, generatedAt]);

  const disabled = !feed;

  return (
    <nav
      aria-label="Modes"
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5"
    >
      <div className="glass-strong flex max-w-full items-center gap-1 overflow-x-auto rounded-full p-1">
        {MODES.map((m) => (
          <button
            key={m.mode}
            type="button"
            disabled={disabled}
            aria-pressed={mode === m.mode}
            title={`${m.hint} (${m.key.toUpperCase()})`}
            onClick={() => toggle(m.mode)}
            className={`rounded-full px-3.5 py-2 text-[13px] whitespace-nowrap transition-colors ${
              mode === m.mode ? "bg-accent text-accent-ink" : "text-ink-2 hover:bg-hair hover:text-ink"
            } disabled:opacity-50`}
          >
            {m.label}
          </button>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-hair sm:block" aria-hidden="true" />
        <button
          type="button"
          onClick={() => setView(view === "3d" ? "2d" : "3d")}
          aria-pressed={view === "2d"}
          title="Switch between the 3D city and the flat map (M)"
          className={`rounded-full px-3.5 py-2 text-[13px] whitespace-nowrap transition-colors ${
            view === "2d" ? "bg-hair text-ink" : "text-ink-2 hover:bg-hair hover:text-ink"
          }`}
        >
          {view === "2d" ? "3D city" : "2D map"}
        </button>
        <Link
          href="/list"
          className="rounded-full px-3.5 py-2 text-[13px] whitespace-nowrap text-ink-2 transition-colors hover:bg-hair hover:text-ink"
        >
          List view
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="rounded-full px-3.5 py-2 text-[13px] whitespace-nowrap text-ink-2 hover:bg-hair hover:text-ink sm:hidden"
        >
          More
        </button>
        <div className={`${open ? "flex" : "hidden"} items-center gap-1 sm:flex`}>
          <button
            type="button"
            onClick={resetView}
            title="Reset the view (R)"
            className="rounded-full px-3.5 py-2 text-[13px] whitespace-nowrap text-ink-2 hover:bg-hair hover:text-ink"
          >
            Reset view
          </button>
          <button
            type="button"
            onClick={() => void postcard()}
            disabled={disabled || saving}
            title="Save this view as an image (P)"
            className="rounded-full px-3.5 py-2 text-[13px] whitespace-nowrap text-ink-2 hover:bg-hair hover:text-ink disabled:opacity-50"
          >
            {saving ? "Saving" : "Postcard"}
          </button>
        </div>
      </div>
    </nav>
  );
}

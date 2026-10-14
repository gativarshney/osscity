"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { compactDate } from "@/lib/format";
import { downloadCanvas, renderPostcard } from "@/lib/postcard";
import { useCity, type Mode } from "@/lib/store";

interface Props {
  generatedAt: string | null;
}

const MODES: { mode: Mode; label: string; key: string; hint: string }[] = [
  { mode: "tour", label: "Friendliest projects", key: "t", hint: "Fly past the ten projects most welcoming to newcomers" },
  { mode: "awake", label: "Awake now", key: "a", hint: "Projects whose maintainers usually reply at this hour" },
  { mode: "ghosts", label: "Who ignores newcomers", key: "g", hint: "Popular projects that rarely answer outside pull requests" },
  { mode: "compare", label: "Compare two", key: "c", hint: "Pick two buildings and see their numbers side by side" },
];

/** The three ways in, plus a menu of everything else. Keys: T, G, C, M, R, P, Esc. */
export function ModeBar({ generatedAt }: Props) {
  const mode = useCity((s) => s.mode);
  const setMode = useCity((s) => s.setMode);
  const view = useCity((s) => s.view);
  const setView = useCity((s) => s.setView);
  const resetView = useCity((s) => s.resetView);
  const feed = useCity((s) => s.feed);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  const toggle = (m: Mode) => setMode(mode === m ? "explore" : m);

  const postcard = async () => {
    const source = document.querySelector<HTMLCanvasElement>("canvas");
    if (!source || saving) return;
    setSaving(true);
    try {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const caption = feed
        ? `${feed.repos.length.toLocaleString("en-GB")} open source projects from Google Summer of Code organisations`
        : "Open source projects from Google Summer of Code organisations";
      const out = renderPostcard({ source, caption, updated: compactDate(generatedAt ?? feed?.generatedAt ?? null) });
      downloadCanvas(out, `osscity-${new Date().toISOString().slice(0, 10)}.png`);
    } finally {
      setSaving(false);
      setOpen(false);
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
        setOpen(false);
        if (useCity.getState().selected == null) setMode("explore");
      }
    };
    const onClick = (e: MouseEvent) => {
      if (menu.current && !menu.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, view, feed, generatedAt]);

  const disabled = !feed;

  return (
    <nav
      aria-label="Modes"
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5"
    >
      <div ref={menu} className="glass-strong relative flex max-w-full items-center gap-1 overflow-visible rounded-full p-1">
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
        <span className="mx-0.5 h-5 w-px bg-hair" aria-hidden="true" />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="rounded-full px-3.5 py-2 text-[13px] whitespace-nowrap text-ink-2 hover:bg-hair hover:text-ink"
        >
          More
        </button>
        {open ? (
          <div
            role="menu"
            className="glass-strong rise absolute right-0 bottom-full mb-2 flex min-w-[220px] flex-col rounded-2xl p-1.5"
          >
            <MenuItem onClick={() => { setView(view === "3d" ? "2d" : "3d"); setOpen(false); }} hint="M">
              {view === "2d" ? "Back to the 3D city" : "Flat map (faster, no WebGL)"}
            </MenuItem>
            <Link
              href="/list"
              role="menuitem"
              className="flex items-center justify-between rounded-xl px-3 py-2 text-[13px] text-ink-2 hover:bg-hair hover:text-ink"
            >
              Every project as a table
            </Link>
            <MenuItem onClick={() => { resetView(); setOpen(false); }} hint="R">
              Reset the view
            </MenuItem>
            <MenuItem onClick={() => void postcard()} hint="P" disabled={disabled || saving}>
              {saving ? "Saving the postcard" : "Save a postcard image"}
            </MenuItem>
            <p className="px-3 pt-2 pb-1 text-[11px] leading-snug text-ink-3">
              Drag to orbit, right-drag to slide, scroll to zoom. Arrow keys fly, Q and E turn.
            </p>
          </div>
        ) : null}
      </div>
    </nav>
  );
}

function MenuItem({
  onClick,
  hint,
  disabled,
  children,
}: {
  onClick: () => void;
  hint: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-between gap-4 rounded-xl px-3 py-2 text-left text-[13px] text-ink-2 hover:bg-hair hover:text-ink disabled:opacity-50"
    >
      {children}
      <kbd className="rounded-md border border-hair px-1.5 py-0.5 text-[10.5px] text-ink-3">{hint}</kbd>
    </button>
  );
}

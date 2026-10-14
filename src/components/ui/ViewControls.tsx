"use client";

import { useCity } from "@/lib/store";

/** Camera presets and nudges, always within reach at the bottom right. */
export function ViewControls() {
  const send = useCity((s) => s.sendCommand);
  const feed = useCity((s) => s.feed);
  const mode = useCity((s) => s.mode);
  const view = useCity((s) => s.view);
  if (!feed || mode === "tour") return null;
  const flat = view === "2d";

  return (
    <div
      role="group"
      aria-label="View controls"
      className="glass-strong pointer-events-auto absolute right-4 bottom-20 z-20 flex flex-col gap-1 rounded-2xl p-1.5 sm:right-6 sm:bottom-24"
    >
      <div className="flex gap-1">
        <Preset label="Overview" onClick={() => send({ kind: "overview" })} />
        {!flat ? <Preset label="Top" onClick={() => send({ kind: "top" })} /> : null}
        {!flat ? <Preset label="Street" onClick={() => send({ kind: "street" })} /> : null}
      </div>
      {!flat ? (
        <div className="grid grid-cols-3 gap-1">
          <Nudge label="Tilt up" onClick={() => send({ kind: "tilt", by: 0.22 })} className="col-start-2">
            <path d="m5 12 5-5 5 5" />
          </Nudge>
          <Nudge label="Turn left" onClick={() => send({ kind: "rotate", by: Math.PI / 5 })} className="col-start-1">
            <path d="m12 5-5 5 5 5" />
          </Nudge>
          <Nudge label="Tilt down" onClick={() => send({ kind: "tilt", by: -0.22 })}>
            <path d="m5 8 5 5 5-5" />
          </Nudge>
          <Nudge label="Turn right" onClick={() => send({ kind: "rotate", by: -Math.PI / 5 })}>
            <path d="m8 5 5 5-5 5" />
          </Nudge>
        </div>
      ) : null}
      <div className="flex gap-1">
        <Nudge label="Zoom in" onClick={() => send({ kind: "zoom", factor: 0.7 })} className="flex-1">
          <path d="M10 5v10M5 10h10" />
        </Nudge>
        <Nudge label="Zoom out" onClick={() => send({ kind: "zoom", factor: 1.4 })} className="flex-1">
          <path d="M5 10h10" />
        </Nudge>
      </div>
    </div>
  );
}

function Preset({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl px-2.5 py-1.5 text-[12px] text-ink-2 hover:bg-hair hover:text-ink"
    >
      {label}
    </button>
  );
}

function Nudge({
  label,
  onClick,
  className = "",
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex items-center justify-center rounded-xl border border-hair p-1.5 text-ink-2 hover:bg-hair hover:text-ink ${className}`}
    >
      <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}

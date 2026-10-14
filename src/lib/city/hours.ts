/**
 * Contributable publishes core replies by hour of day in UTC, scaled 0 to 9.
 * The card shows them in the visitor's time zone, India Standard Time by default.
 */
export const DEFAULT_TIME_ZONE = "Asia/Kolkata";

/** Offset from UTC in whole hours for a zone, at a moment. Half-hour zones round up. */
export function zoneOffsetHours(timeZone: string, at = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      hour: "numeric",
      minute: "numeric",
      day: "numeric",
      month: "numeric",
      year: "numeric",
    }).formatToParts(at);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const local = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
    return Math.round((local - at.getTime()) / 3_600_000);
  } catch {
    return 0;
  }
}

/** Shift a 24-bucket UTC profile into a zone. */
export function shiftHours(utc: number[], offsetHours: number): number[] {
  const out = new Array<number>(24).fill(0);
  for (let h = 0; h < 24; h++) {
    out[(((h + offsetHours) % 24) + 24) % 24] = utc[h] ?? 0;
  }
  return out;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The busiest hours as a readable range, like "14:00 to 17:00". */
export function busiestRange(profile: number[]): string | null {
  const max = Math.max(...profile);
  if (max <= 0) return null;
  const busy = profile.map((v) => v >= max * 0.6);
  if (busy.every(Boolean)) return "all day";
  // Longest run of busy hours, allowed to wrap past midnight.
  let best: [start: number, length: number] | null = null;
  for (let start = 0; start < 24; start++) {
    if (!busy[start] || busy[(start + 23) % 24]) continue;
    let len = 0;
    while (len < 24 && busy[(start + len) % 24]) len++;
    if (!best || len > best[1]) best = [start, len];
  }
  if (!best) return `${pad(profile.indexOf(max))}:00`;
  const [start, len] = best;
  return `${pad(start)}:00 to ${pad((start + len) % 24)}:00`;
}

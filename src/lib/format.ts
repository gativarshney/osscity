/** Plain, specific numbers. */

export function percent(share: number | null | undefined, digits = 0): string {
  if (share == null) return "Not enough data";
  return `${(share * 100).toFixed(digits)}%`;
}

export function hours(h: number | null | undefined): string {
  if (h == null) return "Not enough data";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} d`;
}

export function count(n: number | null | undefined): string {
  if (n == null) return "0";
  if (n >= 10_000) return `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}k`;
  return n.toLocaleString("en-GB");
}

export function compactDate(iso: string | null | undefined): string {
  if (!iso) return "unknown";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function yearsRange(years: number[]): string {
  if (years.length === 0) return "";
  const sorted = [...years].sort((a, b) => a - b);
  if (sorted.length === 1) return String(sorted[0]);
  const runs: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (const y of sorted.slice(1)) {
    if (y === prev + 1) {
      prev = y;
      continue;
    }
    runs.push(start === prev ? String(start) : `${start} to ${prev}`);
    start = y;
    prev = y;
  }
  runs.push(start === prev ? String(start) : `${start} to ${prev}`);
  return runs.join(", ");
}

/** "n of m" with the sample shown, so a share is never read without its size. */
export function withSample(share: number | null, n: number): string {
  if (share == null) return "Not enough data";
  return `${percent(share)} of ${n}`;
}

import { aggregate, type Agg, type Column } from "./analyze";
import type { TimeUnit } from "./format";

export interface TimeSeries {
  unit: TimeUnit;
  points: [number, number][];
}

/** Group a measure (or a row count when `measure` is null) by day, month or year of a date column. */
export function groupByTime(date: Column, measure: Column | null, kind: Agg): TimeSeries {
  const span = ((date.max ?? 0) - (date.min ?? 0)) / 864e5;
  const unit: TimeUnit = span > 1100 ? "year" : span > 92 ? "month" : "day";
  const keyOf = (t: number) => {
    const d = new Date(t);
    if (unit === "year") return Date.UTC(d.getUTCFullYear(), 0, 1);
    if (unit === "month") return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  };
  const g = new Map<number, number[]>();
  for (let i = 0; i < date.values.length; i++) {
    const t = date.values[i];
    if (typeof t !== "number") continue;
    const v = measure ? measure.values[i] : 1;
    if (typeof v !== "number") continue;
    const k = keyOf(t);
    if (!g.has(k)) g.set(k, []);
    g.get(k)!.push(v);
  }
  const points = Array.from(g)
    .sort((a, b) => a[0] - b[0])
    .map(([k, arr]) => [k, measure ? aggregate(arr, kind) : arr.length] as [number, number]);
  return { unit, points };
}

export interface Ranked {
  items: [string, number][];
  note: string;
}

/** Group a measure (or a row count) by category, largest first. Extra groups fold into "Other" when that still adds up. */
export function groupByCategory(cat: Column, measure: Column | null, kind: Agg, limit = 12): Ranked {
  const g = new Map<string, number[]>();
  for (let i = 0; i < cat.values.length; i++) {
    const k = cat.values[i];
    if (k == null) continue;
    const v = measure ? measure.values[i] : 1;
    if (typeof v !== "number") continue;
    const key = String(k);
    if (!g.has(key)) g.set(key, []);
    g.get(key)!.push(v);
  }
  let items = Array.from(g)
    .map(([k, arr]) => [k, measure ? aggregate(arr, kind) : arr.length] as [string, number])
    .sort((a, b) => b[1] - a[1]);
  let note = "";
  if (items.length > limit) {
    const rest = items.slice(limit);
    items = items.slice(0, limit);
    if (!measure || kind === "sum") items.push([`Other (${rest.length} more)`, rest.reduce((a, e) => a + e[1], 0)]);
    else note = ` Showing the top ${limit} of ${limit + rest.length}.`;
  }
  return { items, note };
}

export interface Histogram {
  bins: { from: number; to: number; count: number }[];
}

export function histogram(col: Column, maxBins = 24): Histogram {
  const s = col.sorted ?? [];
  const k = Math.min(maxBins, Math.max(6, Math.ceil(Math.log2(s.length || 1)) + 1));
  const lo = col.min ?? 0;
  const hi = col.max === col.min ? lo + 1 : col.max ?? 1;
  const w = (hi - lo) / k;
  const bins = Array.from({ length: k }, (_, i) => ({ from: lo + i * w, to: lo + (i + 1) * w, count: 0 }));
  for (const v of s) bins[Math.min(k - 1, Math.floor((v - lo) / w))].count++;
  return { bins };
}

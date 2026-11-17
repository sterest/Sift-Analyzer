"use client";

import { useMemo } from "react";
import { analyze, measureCols, pearson, pickMeasure, type Column, type Dataset } from "@/lib/analyze";
import { groupByCategory, groupByTime } from "@/lib/aggregate";
import { fmt, MONTHS, pct } from "@/lib/format";
import { BarList, HistogramChart, LineChart, ScatterChart } from "./charts";

export type DashAgg = "sum" | "mean" | "median";

/** A dashboard view, stored by column name so it survives re-uploads of the same file. */
export interface DashConfig {
  measure: string | null;
  agg: DashAgg;
  filters: Record<string, string>;
  /** Only keep the last N days of data; 0 keeps everything. */
  range: number;
}

const AGG_WORD: Record<DashAgg, string> = { sum: "Total", mean: "Average", median: "Median" };

export function filterColumns(cols: Column[]) {
  return cols
    .map((c, i) => (c.type === "text" && c.categorical && c.unique >= 2 && c.unique <= 30 ? i : -1))
    .filter((i) => i >= 0)
    .slice(0, 3);
}

export function defaultConfig(ds: Dataset): DashConfig {
  const m = pickMeasure(ds.cols, measureCols(ds.cols));
  return { measure: m == null ? null : ds.cols[m].name, agg: "sum", filters: {}, range: 0 };
}

const monthKey = (t: number) => {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
};
const monthName = (t: number) => MONTHS[new Date(t).getUTCMonth()] + " " + new Date(t).getUTCFullYear();

export function Dashboard({ ds, config, onChange }: { ds: Dataset; config: DashConfig; onChange: (c: DashConfig) => void }) {
  const { cols, rows, headers } = ds;
  const nums = useMemo(() => measureCols(cols), [cols]);
  const cats = useMemo(() => filterColumns(cols), [cols]);
  const dateIdx = useMemo(() => cols.findIndex((c) => c.type === "date" && c.count > 0), [cols]);
  const measureIdx = config.measure == null ? -1 : cols.findIndex((c) => c.name === config.measure);
  const set = (patch: Partial<DashConfig>) => onChange({ ...config, ...patch });

  // Rows that pass the filters, re-profiled so every figure below reflects them.
  const sub = useMemo(() => {
    const dcol = dateIdx >= 0 ? cols[dateIdx] : null;
    const from = config.range && dcol ? dcol.max! - config.range * 864e5 : -Infinity;
    const active = Object.entries(config.filters).filter(([, v]) => v !== "");
    const keepIdx: number[] = [];
    for (let i = 0; i < rows.length; i++) {
      if (active.some(([name, v]) => rows[i][name]?.trim() !== v)) continue;
      if (config.range && dcol) {
        const t = dcol.values[i];
        if (typeof t !== "number" || t <= from) continue;
      }
      keepIdx.push(i);
    }
    const subRows = keepIdx.map((i) => rows[i]);
    return { n: subRows.length, cols: analyze(headers, subRows, cols.map((c) => c.type), cols) };
  }, [rows, headers, cols, config.filters, config.range, dateIdx]);

  const m = measureIdx >= 0 ? sub.cols[measureIdx] : null;
  const sd = dateIdx >= 0 ? sub.cols[dateIdx] : null;
  const hasM = !!m && m.count > 0;
  const what = m ? `${AGG_WORD[config.agg]} ${m.name}` : "Number of rows";

  // Latest month against the one before it.
  let delta: { text: string; up: boolean | null } | null = null;
  if (sd && sd.count) {
    const g = new Map<number, number>();
    for (let i = 0; i < sd.values.length; i++) {
      const t = sd.values[i];
      const v = m ? m.values[i] : 1;
      if (typeof t !== "number" || typeof v !== "number") continue;
      g.set(monthKey(t), (g.get(monthKey(t)) ?? 0) + v);
    }
    const ms = Array.from(g).sort((a, b) => a[0] - b[0]);
    if (ms.length >= 2) {
      const [a, b] = [ms[ms.length - 1], ms[ms.length - 2]];
      const last = new Date(sd.max!);
      const daysInMonth = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth() + 1, 0)).getUTCDate();
      const partial = last.getUTCDate() < daysInMonth;
      const change = b[1] ? (a[1] - b[1]) / Math.abs(b[1]) : null;
      delta = {
        text: `${monthName(a[0])}${partial ? " (to day " + last.getUTCDate() + ")" : ""}: ${fmt(a[1])}` +
          (change == null ? "" : `, ${change >= 0 ? "▲" : "▼"} ${pct(Math.abs(change))} vs ${monthName(b[0])}`),
        up: change == null ? null : change >= 0,
      };
    }
  }

  const tiles: { k: string; v: string; s: string }[] = [
    { k: "Rows", v: fmt(sub.n), s: sub.n < rows.length ? `of ${fmt(rows.length)} in the file` : "the whole file" },
  ];
  if (hasM) {
    tiles.push(
      { k: `Total ${m!.name}`, v: fmt(m!.mean! * m!.count), s: delta?.text ?? `across ${fmt(m!.count)} rows` },
      { k: `Average ${m!.name}`, v: fmt(m!.mean), s: "per row with a value" },
      { k: `Median ${m!.name}`, v: fmt(m!.median), s: "half of the rows are below this" },
    );
  } else {
    if (delta) tiles[0].s += ". " + delta.text;
    for (const ci of cats) if (sub.cols[ci].count) tiles.push({ k: `Distinct ${sub.cols[ci].name}`, v: fmt(sub.cols[ci].unique), s: `most common: ${sub.cols[ci].top![0][0]}` });
  }

  const cards: { key: string; title: string; node: React.ReactNode }[] = [];
  if (sub.n) {
    if (sd && sd.count) {
      const t = `${what} over time`;
      cards.push({ key: "trend", title: t, node: <LineChart series={groupByTime(sd, m, config.agg)} label={t} height={240} /> });
    }
    cats.filter((ci) => !config.filters[cols[ci].name]).slice(0, sd ? 2 : 3).forEach((ci) => {
      const t = `${what} by ${sub.cols[ci].name}`;
      cards.push({ key: "cat-" + ci, title: t, node: <BarList items={groupByCategory(sub.cols[ci], m, config.agg, 6).items} label={t} /> });
    });
    if (hasM && m!.unique > 1) {
      cards.push({ key: "hist", title: `How ${m!.name} is spread (rows per range)`, node: <HistogramChart col={m!} height={220} /> });
      let best: { c: Column; r: number } | null = null;
      for (const i of nums) {
        if (i === measureIdx || sub.cols[i].unique < 2) continue;
        const r = pearson(sub.cols[i].values, m!.values);
        if (Number.isFinite(r) && Math.abs(r) >= 0.4 && (!best || Math.abs(r) > Math.abs(best.r))) best = { c: sub.cols[i], r };
      }
      if (best) cards.push({ key: "scatter", title: `${m!.name} against ${best.c.name} (r = ${best.r.toFixed(2)})`, node: <ScatterChart xCol={best.c} yCol={m!} height={220} /> });
    }
  }

  const anyFilter = Object.values(config.filters).some((v) => v) || config.range > 0;

  return (
    <div className="stack">
      <div className="controls">
        <label>Measure
          <select value={config.measure ?? ""} onChange={(e) => set({ measure: e.target.value || null })}>
            {nums.map((i) => <option key={i} value={cols[i].name}>{cols[i].name}</option>)}
            <option value="">Number of rows</option>
          </select>
        </label>
        {m && (
          <label>Summarize as
            <select value={config.agg} onChange={(e) => set({ agg: e.target.value as DashAgg })}>
              {(Object.keys(AGG_WORD) as DashAgg[]).map((k) => <option key={k} value={k}>{AGG_WORD[k]}</option>)}
            </select>
          </label>
        )}
        {cats.map((ci) => {
          const c = cols[ci];
          return (
            <label key={c.name}>{c.name}
              <select value={config.filters[c.name] ?? ""} onChange={(e) => set({ filters: { ...config.filters, [c.name]: e.target.value } })}>
                <option value="">All</option>
                {c.top!.map(([v]) => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
          );
        })}
        {dateIdx >= 0 && (
          <label>Period
            <select value={config.range} onChange={(e) => set({ range: +e.target.value })}>
              <option value={0}>All dates</option>
              <option value={30}>Last 30 days of data</option>
              <option value={90}>Last 90 days of data</option>
              <option value={365}>Last 12 months of data</option>
            </select>
          </label>
        )}
        <button type="button" className="btn btn-quiet" disabled={!anyFilter} onClick={() => set({ filters: {}, range: 0 })}>Clear filters</button>
      </div>

      {sub.n === 0 ? (
        <p className="emptymsg">No rows match these filters. Set one of them back to All.</p>
      ) : (
        <>
          <div className="tiles">
            {tiles.map((t) => (
              <div key={t.k} className="panel tile">
                <span className="k">{t.k}</span>
                <span className="v">{t.v}</span>
                <span className="s">{t.s}</span>
              </div>
            ))}
          </div>
          <div className="dgrid">
            {cards.map((c, i) => (
              <article key={c.key} className={"panel dcard" + (cards.length % 2 && i === 0 ? " wide" : "")}>
                <h3>{c.title}</h3>
                {c.node}
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

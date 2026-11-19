"use client";

import { useMemo, useRef } from "react";
import { analyze, measureCols, pearson, pickMeasure, type Column, type Dataset } from "@/lib/analyze";
import { groupByCategory, groupByTime } from "@/lib/aggregate";
import { fmt, MONTHS, pct } from "@/lib/format";
import { AreaChart, BarList, DataTable, DonutChart, GaugeChart, HistogramChart, KpiCard, LineChart, ScatterChart, StackedBarChart, TreemapChart } from "./charts";

export type DashAgg = "sum" | "mean" | "median";
export type ChartStyle = "bar" | "donut" | "treemap";

/** A dashboard view, stored by column name so it survives re-uploads of the same file. */
export type DashTheme = "navy" | "light" | "midnight" | "emerald" | "sunset" | "rose";

/** A dashboard view, stored by column name so it survives re-uploads of the same file. */
export interface DashConfig {
  measure: string | null;
  agg: DashAgg;
  filters: Record<string, string>;
  /** Only keep the last N days of data; 0 keeps everything. */
  range: number;
  chartStyle?: ChartStyle;
  theme?: DashTheme;
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
  const dashRef = useRef<HTMLDivElement>(null);

  // Cross-filter: clicking a chart element toggles that category filter
  const handleCrossFilter = (colIdx: number, value: string) => {
    const name = cols[colIdx].name;
    set({ filters: { ...config.filters, [name]: config.filters[name] === value ? "" : value } });
  };

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

  // Monthly series for sparklines + delta
  let delta: { text: string; up: boolean | null } | null = null;
  let monthlySeries: number[] = [];
  if (sd && sd.count) {
    const g = new Map<number, number>();
    for (let i = 0; i < sd.values.length; i++) {
      const t = sd.values[i];
      const v = m ? m.values[i] : 1;
      if (typeof t !== "number" || typeof v !== "number") continue;
      g.set(monthKey(t), (g.get(monthKey(t)) ?? 0) + v);
    }
    const ms = Array.from(g).sort((a, b) => a[0] - b[0]);
    monthlySeries = ms.map(([, v]) => v);
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

  const chartStyle = config.chartStyle ?? "bar";
  const theme = config.theme ?? "navy";

  const kpis: { title: string; value: string; subtitle?: string; trend?: { pct: number; up: boolean }; spark?: number[] }[] = [
    { title: "Rows", value: fmt(sub.n), subtitle: sub.n < rows.length ? `of ${fmt(rows.length)} total` : "the whole file" },
  ];
  if (hasM) {
    const totalVal = m!.mean! * m!.count;
    kpis.push(
      { title: `Total ${m!.name}`, value: fmt(totalVal), subtitle: delta?.text ?? `across ${fmt(m!.count)} rows`,
        spark: monthlySeries.length > 1 ? monthlySeries : undefined,
        ...(delta?.up != null ? { trend: { pct: parseFloat(delta.text.match(/([0-9.]+)%/)?.[1] ?? "0"), up: delta.up } } : {}) },
      { title: `Average ${m!.name}`, value: fmt(m!.mean), subtitle: "per row" },
      { title: `Median ${m!.name}`, value: fmt(m!.median), subtitle: "midpoint" },
    );
  } else {
    if (delta) kpis[0].subtitle = (kpis[0].subtitle ?? "") + ". " + delta.text;
    for (const ci of cats) if (sub.cols[ci].count) kpis.push({ title: `Distinct ${sub.cols[ci].name}`, value: fmt(sub.cols[ci].unique), subtitle: `most common: ${sub.cols[ci].top![0][0]}` });
  }

  const cards: { key: string; title: string; node: React.ReactNode }[] = [];
  if (sub.n) {
    if (sd && sd.count) {
      const t = `${what} over time`;
      cards.push({ key: "trend", title: t, node: <AreaChart series={groupByTime(sd, m, config.agg)} label={t} height={240} /> });
    }
    const filteredCats = cats.filter((ci) => !config.filters[cols[ci].name]).slice(0, sd ? 2 : 3);
    filteredCats.forEach((ci) => {
      const catData = groupByCategory(sub.cols[ci], m, config.agg, chartStyle === "treemap" ? 12 : 6);
      const t = `${what} by ${sub.cols[ci].name}`;
      if (chartStyle === "donut") {
        cards.push({ key: "cat-" + ci, title: t, node: <DonutChart items={catData.items} label={t} onSelect={(v) => handleCrossFilter(ci, v)} /> });
      } else if (chartStyle === "treemap") {
        cards.push({ key: "cat-" + ci, title: t, node: <TreemapChart items={catData.items} label={t} onSelect={(v) => handleCrossFilter(ci, v)} /> });
      } else {
        cards.push({ key: "cat-" + ci, title: t, node: <BarList items={catData.items} label={t} onSelect={(v) => handleCrossFilter(ci, v)} /> });
      }
    });

    // Gauge for average measure
    if (hasM && m!.min != null && m!.max != null) {
      const gTitle = `Average ${m!.name}`;
      cards.push({ key: "gauge", title: gTitle, node: <GaugeChart value={m!.mean!} min={m!.min!} max={m!.max!} label={gTitle} /> });
    }

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

    // Stacked bar + cross-tab when two category columns are visible
    const freeCats = cats.filter((ci) => !config.filters[cols[ci].name]);
    if (freeCats.length >= 2) {
      const c1 = sub.cols[freeCats[0]], c2 = sub.cols[freeCats[1]];
      const rowVals = c1.top!.slice(0, 8).map((t) => t[0]);
      const colVals = c2.top!.slice(0, 6).map((t) => t[0]);
      const grid: Record<string, Record<string, number>> = {};
      for (const rv of rowVals) { grid[rv] = {}; for (const cv of colVals) grid[rv][cv] = 0; }
      for (let i = 0; i < c1.values.length; i++) {
        const r = c1.values[i], c = c2.values[i], v = m ? m.values[i] : 1;
        if (typeof r !== "string" || typeof c !== "string" || typeof v !== "number") continue;
        if (r in grid && c in grid[r]) grid[r][c] += v;
      }

      // Stacked bar
      const stackSeries = colVals.map((cv) => ({ name: cv, values: rowVals.map((rv) => grid[rv][cv]) }));
      const sTitle = `${what} by ${c1.name}, by ${c2.name}`;
      cards.push({ key: "stacked", title: sTitle, node: <StackedBarChart groups={rowVals} series={stackSeries} label={sTitle} onSelect={(g) => handleCrossFilter(freeCats[0], g)} /> });

      // Cross-tab data table
      const tbl = rowVals.map((rv) => ({ label: rv, values: colVals.map((cv) => grid[rv][cv]), total: colVals.reduce((s, cv) => s + grid[rv][cv], 0) }));
      const tTitle = `${what} by ${c1.name} & ${c2.name}`;
      cards.push({ key: "pivot", title: tTitle, node: <DataTable data={tbl} rowHeader={c1.name} colHeaders={colVals} label={tTitle} /> });
    }
  }

  const anyFilter = Object.values(config.filters).some((v) => v) || config.range > 0;

  const handleExport = () => {
    const el = dashRef.current;
    if (!el) return;
    el.classList.add("dash-printing");
    requestAnimationFrame(() => {
      window.print();
      el.classList.remove("dash-printing");
    });
  };

  return (
    <div className={`dash-page theme-${theme}`} ref={dashRef}>
      <header className="dash-head">
        <svg width="28" height="28" viewBox="0 0 512 512" aria-hidden="true">
          <rect width="512" height="512" rx="112" fill="currentColor"/>
          <rect x="102" y="78" width="205" height="36" rx="18" fill="#fff" opacity=".95"/>
          <rect x="154" y="148" width="256" height="36" rx="18" fill="#fff" opacity=".85"/>
          <rect x="205" y="218" width="205" height="36" rx="18" fill="#fff" opacity=".75"/>
          <rect x="154" y="288" width="256" height="36" rx="18" fill="#fff" opacity=".65"/>
          <rect x="102" y="358" width="205" height="36" rx="18" fill="#fff" opacity=".55"/>
          <rect x="205" y="428" width="205" height="36" rx="18" fill="#fff" opacity=".45"/>
        </svg>
        <h2>{ds.name}</h2>
        <button type="button" className="btn dash-export-btn" onClick={handleExport}>Export PDF</button>
      </header>
      <div className="dash-body">
        <aside className="dash-sidebar">
          <div className="dash-filter-group">
            <span className="dash-filter-label">Measure</span>
            <select value={config.measure ?? ""} onChange={(e) => set({ measure: e.target.value || null })}>
              {nums.map((i) => <option key={i} value={cols[i].name}>{cols[i].name}</option>)}
              <option value="">Number of rows</option>
            </select>
          </div>
          {m && (
            <div className="dash-filter-group">
              <span className="dash-filter-label">Summarize as</span>
              <select value={config.agg} onChange={(e) => set({ agg: e.target.value as DashAgg })}>
                {(Object.keys(AGG_WORD) as DashAgg[]).map((k) => <option key={k} value={k}>{AGG_WORD[k]}</option>)}
              </select>
            </div>
          )}
          {cats.map((ci) => {
            const c = cols[ci];
            return (
              <div key={c.name} className="dash-filter-group">
                <span className="dash-filter-label">{c.name}</span>
                <select value={config.filters[c.name] ?? ""} onChange={(e) => set({ filters: { ...config.filters, [c.name]: e.target.value } })}>
                  <option value="">All</option>
                  {c.top!.map(([v]) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            );
          })}
          {dateIdx >= 0 && (
            <div className="dash-filter-group">
              <span className="dash-filter-label">Period</span>
              <select value={config.range} onChange={(e) => set({ range: +e.target.value })}>
                <option value={0}>All dates</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last 12 months</option>
              </select>
            </div>
          )}
          {cats.length > 0 && (
            <div className="dash-filter-group">
              <span className="dash-filter-label">Chart style</span>
              <select value={chartStyle} onChange={(e) => set({ chartStyle: e.target.value as ChartStyle })}>
                <option value="bar">Bars</option>
                <option value="donut">Donut</option>
                <option value="treemap">Treemap</option>
              </select>
            </div>
          )}
          <div className="dash-filter-group">
            <span className="dash-filter-label">Theme</span>
            <select value={theme} onChange={(e) => set({ theme: e.target.value as DashTheme })}>
              <option value="navy">Navy</option>
              <option value="light">Light</option>
              <option value="midnight">Midnight</option>
              <option value="emerald">Emerald</option>
              <option value="sunset">Sunset</option>
              <option value="rose">Rose</option>
            </select>
          </div>
          <button type="button" className="btn dash-clear-btn" disabled={!anyFilter} onClick={() => set({ filters: {}, range: 0 })}>
            Clear filters
          </button>
        </aside>
        <main className="dash-main">
          {sub.n === 0 ? (
            <p className="emptymsg">No rows match these filters.</p>
          ) : (
            <>
              <div className="kpi-row">
                {kpis.map((k) => (
                  <KpiCard key={k.title} title={k.title} value={k.value} subtitle={k.subtitle} trend={k.trend} spark={k.spark} />
                ))}
              </div>
              <div className="dgrid">
                {cards.map((c, i) => (
                  <article key={c.key} className={"dash-card" + (cards.length % 2 && i === 0 ? " wide" : "")}>
                    <h3>{c.title}</h3>
                    {c.node}
                  </article>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

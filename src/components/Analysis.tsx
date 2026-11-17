"use client";

import { useMemo, useState } from "react";
import { findings, isBlank, measureCols, pearson, pickMeasure, type Agg, type Column, type Dataset } from "@/lib/analyze";
import { groupByCategory, groupByTime, histogram } from "@/lib/aggregate";
import { fmt, fmtDate, pct, timeLabel } from "@/lib/format";
import { BarList, HistogramChart, LineChart, ScatterChart } from "./charts";

const AGG_WORD: Record<Agg, string> = { sum: "Total", mean: "Average", median: "Median", min: "Minimum", max: "Maximum" };

function defaultExplore(cols: Column[]) {
  const dx = cols.findIndex((c) => c.type === "date");
  const cxi = cols.findIndex((c) => c.type === "text" && c.categorical);
  const nxi = cols.findIndex((c) => c.type === "number" && !c.idLike);
  const xi = dx >= 0 ? dx : cxi >= 0 ? cxi : nxi >= 0 ? nxi : 0;
  const nums = measureCols(cols).filter((i) => i !== xi);
  const yi = pickMeasure(cols, nums);
  return { x: xi, y: yi != null && xi !== nxi ? yi : null };
}

export function Analysis({ ds }: { ds: Dataset }) {
  const { cols, rows } = ds;
  const init = useMemo(() => defaultExplore(cols), [cols]);
  const [x, setX] = useState(init.x);
  const [y, setY] = useState<number | null>(init.y);
  const [agg, setAgg] = useState<Agg>("sum");
  const notes = useMemo(() => findings(ds), [ds]);

  const cx = cols[x];
  const cy = y == null ? null : cols[y];
  let chart: React.ReactNode = null;
  let title = "";
  let note = "";
  if (cx) {
    if (cx.type === "number" && (!cy || cy === cx)) {
      title = `How ${cx.name} is spread (rows per range)`;
      chart = <HistogramChart col={cx} />;
      note = `Half of the values fall between ${fmt(cx.q1)} and ${fmt(cx.q3)}. Median ${fmt(cx.median)}, average ${fmt(cx.mean)}.`;
    } else if (cx.type === "number" && cy) {
      title = `${cy.name} against ${cx.name}`;
      chart = <ScatterChart xCol={cx} yCol={cy} />;
      const r = pearson(cx.values, cy.values);
      const a = Math.abs(r);
      const word = a >= 0.8 ? "strong" : a >= 0.5 ? "moderate" : a >= 0.3 ? "weak" : "little or no";
      note = Number.isFinite(r)
        ? `r = ${r.toFixed(2)}: ${word} straight-line link. The dashed line is the best fit. Horizontal: ${cx.name}. Vertical: ${cy.name}.`
        : "Not enough paired values to measure a link.";
    } else if (cx.type === "date") {
      title = `${cy ? AGG_WORD[agg] + " " + cy.name : "Number of rows"} over time`;
      const s = groupByTime(cx, cy, agg);
      chart = <LineChart series={s} label={title} />;
      if (s.points.length) {
        const hi = s.points.reduce((m, p) => (p[1] > m[1] ? p : m));
        const lo = s.points.reduce((m, p) => (p[1] < m[1] ? p : m));
        note = `Grouped by ${s.unit}. Highest: ${timeLabel(hi[0], s.unit)} (${fmt(hi[1])}). Lowest: ${timeLabel(lo[0], s.unit)} (${fmt(lo[1])}).`;
      }
    } else {
      title = `${cy ? AGG_WORD[agg] + " " + cy.name : "Number of rows"} by ${cx.name}`;
      const g = groupByCategory(cx, cy, agg);
      chart = <BarList items={g.items} label={title} />;
      if (g.items.length) {
        const total = g.items.reduce((a, e) => a + e[1], 0);
        const first = g.items[0], last = g.items[g.items.length - 1];
        note = ((!cy || agg === "sum") && total > 0
          ? `${first[0]} leads with ${pct(first[1] / total)} of the total.`
          : `${first[0]} is highest at ${fmt(first[1])}; ${last[0]} is lowest at ${fmt(last[1])}.`) + g.note;
      }
    }
  }

  return (
    <div className="stack-lg">
      <section className="stack" aria-labelledby="h-find">
        <div className="sechead"><h2 id="h-find">Findings</h2><p>Written from the numbers below. Check anything you plan to act on.</p></div>
        <div className="panel">
          <ul className="findings">
            {notes.map((f, i) => (
              <li key={i}>
                <span className="kind">{f.kind}</span>
                <span>{f.parts.map((p, j) => (typeof p === "string" ? p : <b key={j}>{p.strong}</b>))}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="stack" aria-labelledby="h-exp">
        <div className="sechead"><h2 id="h-exp">Explore</h2><p>Pick what to compare. The chart type follows the column types.</p></div>
        <div className="panel stack">
          <div className="controls">
            <label>Look at
              <select value={x} onChange={(e) => setX(+e.target.value)}>
                {cols.map((c, i) => (c.idLike ? null : <option key={i} value={i}>{c.name}</option>))}
              </select>
            </label>
            <label>Measure
              <select value={y ?? ""} onChange={(e) => setY(e.target.value === "" ? null : +e.target.value)}>
                <option value="">Number of rows</option>
                {measureCols(cols).map((i) => <option key={i} value={i}>{cols[i].name}</option>)}
              </select>
            </label>
            {cx && cx.type !== "number" && cy && (
              <label>Summarize as
                <select value={agg} onChange={(e) => setAgg(e.target.value as Agg)}>
                  {(Object.keys(AGG_WORD) as Agg[]).map((k) => <option key={k} value={k}>{AGG_WORD[k]}</option>)}
                </select>
              </label>
            )}
          </div>
          <h3>{title}</h3>
          {chart}
          {note && <p className="note">{note}</p>}
        </div>
      </section>

      <section className="stack" aria-labelledby="h-cols">
        <div className="sechead"><h2 id="h-cols">Columns</h2><p>Type, completeness and spread of each column.</p></div>
        <div className="cols">{cols.map((c) => <Profile key={c.name} c={c} n={rows.length} />)}</div>
      </section>

      <Correlations cols={cols} />
      <RowsTable ds={ds} />
    </div>
  );
}

function Profile({ c, n }: { c: Column; n: number }) {
  let body: React.ReactNode = null;
  if (c.type === "number" && c.count) {
    const { bins } = histogram(c, 14);
    const mx = Math.max(...bins.map((b) => b.count)) || 1;
    body = (
      <div>
        <div className="spark">{bins.map((b, i) => <i key={i} style={{ height: `${(b.count / mx) * 100}%` }} title={`${fmt(b.from)} to ${fmt(b.to)}: ${fmt(b.count)} rows`} />)}</div>
        <div className="sparkrange"><span>{fmt(c.min)}</span><span>{fmt(c.max)}</span></div>
      </div>
    );
  } else if (c.type === "text" && c.count) {
    const top = c.top!.slice(0, 4), mx = top[0][1];
    body = c.idLike ? <p className="note">Different on every row.</p> : (
      <div className="tops">
        {top.map(([k, v]) => (
          <div key={k} className="tops-row">
            <span title={k}>{k}</span>
            <span className="t"><i style={{ width: `${(v / mx) * 100}%` }} /></span>
            <span className="n">{fmt(v)}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <article className="panel col">
      <header><h3>{c.name}</h3><span className="chip">{c.idLike ? "identifier" : c.type}</span></header>
      <dl>
        <dt>Filled</dt><dd>{fmt(c.count)} of {fmt(n)}</dd>
        <dt>Distinct</dt><dd>{fmt(c.unique)}</dd>
        {c.type === "number" && c.count > 0 && (<>
          <dt>Average</dt><dd>{fmt(c.mean)}</dd>
          <dt>Median</dt><dd>{fmt(c.median)}</dd>
          <dt>Std. deviation</dt><dd>{fmt(c.sd)}</dd>
        </>)}
        {c.type === "date" && c.count > 0 && (<>
          <dt>Earliest</dt><dd>{fmtDate(c.min!)}</dd>
          <dt>Latest</dt><dd>{fmtDate(c.max!)}</dd>
        </>)}
      </dl>
      {body}
    </article>
  );
}

function Correlations({ cols }: { cols: Column[] }) {
  const nums = measureCols(cols).slice(0, 12).map((i) => cols[i]);
  if (nums.length < 2) return null;
  return (
    <section className="stack" aria-labelledby="h-corr">
      <div className="sechead"><h2 id="h-corr">Correlations</h2><p>Pearson r between numeric columns. Near 0 means no straight-line link.</p></div>
      <div className="panel">
        <div className="scroll">
          <table className="corr">
            <thead><tr><th />{nums.map((c) => <th key={c.name} title={c.name}>{c.name}</th>)}</tr></thead>
            <tbody>
              {nums.map((a, i) => (
                <tr key={a.name}>
                  <th scope="row" title={a.name}>{a.name}</th>
                  {nums.map((b, j) => {
                    const r = i === j ? 1 : pearson(a.values, b.values);
                    const ok = Number.isFinite(r);
                    const m = ok ? Math.round(Math.min(1, Math.abs(r)) * 88) : 0;
                    return (
                      <td key={b.name} className={m >= 57 ? "strong" : undefined} title={`${a.name} × ${b.name}: r = ${ok ? r.toFixed(3) : "n/a"}`}
                        style={{ background: `color-mix(in srgb, var(${r < 0 ? "--neg" : "--pos"}) ${m}%, var(--mid))` }}>
                        {ok ? r.toFixed(2) : "–"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="legend"><span>−1 opposite</span><span className="ramp" /><span>+1 together</span></div>
      </div>
    </section>
  );
}

function RowsTable({ ds }: { ds: Dataset }) {
  const { cols, rows, headers } = ds;
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 } | null>(null);
  const idx = useMemo(() => {
    let out = rows.map((_, i) => i);
    const needle = q.trim().toLowerCase();
    if (needle) out = out.filter((i) => headers.some((h) => String(rows[i][h] ?? "").toLowerCase().includes(needle)));
    if (sort) {
      const v = cols[sort.col].values;
      out.sort((a, b) => {
        const x = v[a], y = v[b];
        if (x == null) return y == null ? 0 : 1;
        if (y == null) return -1;
        return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
      });
    }
    return out;
  }, [rows, headers, cols, q, sort]);
  const SHOW = 200;
  const toggle = (i: number) => setSort((s) => (s && s.col === i ? (s.dir > 0 ? { col: i, dir: -1 } : null) : { col: i, dir: 1 }));
  return (
    <section className="stack" aria-labelledby="h-rows">
      <div className="sechead">
        <h2 id="h-rows">Rows</h2>
        <p>{q ? `${fmt(idx.length)} of ${fmt(rows.length)} rows match` : `${fmt(rows.length)} rows`}{idx.length > SHOW ? `, first ${SHOW} shown` : ""}</p>
      </div>
      <div className="panel">
        <div className="tablebar">
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter rows by any text" aria-label="Filter rows" />
          <span className="note">Click a column name to sort.</span>
        </div>
        <div className="scroll">
          <table className="rows">
            <thead>
              <tr>
                {cols.map((c, i) => (
                  <th key={c.name} aria-sort={sort?.col === i ? (sort.dir > 0 ? "ascending" : "descending") : undefined}>
                    <button type="button" onClick={() => toggle(i)}>{c.name}{sort?.col === i ? (sort.dir > 0 ? " ↑" : " ↓") : ""}</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {idx.slice(0, SHOW).map((i) => (
                <tr key={i}>
                  {cols.map((c) => {
                    const raw = rows[i][c.name];
                    return isBlank(raw)
                      ? <td key={c.name} className="empty">empty</td>
                      : <td key={c.name} className={c.type === "number" ? "n" : undefined}>{raw}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

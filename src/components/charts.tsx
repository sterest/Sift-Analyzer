"use client";

import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import type { Column } from "@/lib/analyze";
import { histogram, type TimeSeries } from "@/lib/aggregate";
import { fmt, timeLabel } from "@/lib/format";

/* ---------- shared pieces ---------- */

type ShowTip = (e: RPointerEvent, lines: string[]) => void;

function niceTicks(minIn: number, maxIn: number, count: number): number[] {
  let min = minIn, max = maxIn;
  if (min === max) { min -= 1; max += 1; }
  const raw = (max - min) / Math.max(1, count);
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p;
  const t: number[] = [];
  for (let v = Math.floor(min / step) * step; v <= max + step * 0.999; v += step) {
    t.push(Math.abs(v) < step * 1e-9 ? 0 : +v.toPrecision(12));
  }
  return t;
}

const scale = (d0: number, d1: number, r0: number, r1: number) => (v: number) => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0);

function barPath(x: number, y: number, w: number, h: number, rIn: number) {
  const r = Math.min(rIn, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** A measured, tooltip-capable box. Children render once the width is known. */
function ChartBox({ label, className, children }: { label: string; className?: string; children: (width: number, show: ShowTip, hide: () => void) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [tip, setTip] = useState<{ x: number; y: number; lines: string[] } | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const show: ShowTip = (e, lines) => {
    const frame = (e.currentTarget as Element).closest(".chart");
    if (!frame) return;
    const r = frame.getBoundingClientRect();
    setTip({ x: e.clientX - r.left, y: e.clientY - r.top, lines });
  };
  const hide = () => setTip(null);
  return (
    <div ref={ref} className={"chart " + (className ?? "")} role="img" aria-label={label} onPointerLeave={hide}>
      {width > 0 && children(width, show, hide)}
      {tip && (
        <div className="tip" style={{ left: tip.x + 190 > width ? Math.max(0, tip.x - 190) : tip.x + 14, top: tip.y + 14 }}>
          {tip.lines.map((l, i) => (
            <div key={i} className={i ? undefined : "tip-h"}>{l}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function YAxis({ ticks, y, left, right }: { ticks: number[]; y: (v: number) => number; left: number; right: number }) {
  return (
    <>
      {ticks.map((t, i) => (
        <g key={t}>
          <line className={i === 0 ? "base" : "grid"} x1={left} x2={right} y1={y(t)} y2={y(t)} />
          <text x={left - 6} y={y(t) + 4} textAnchor="end">{fmt(t)}</text>
        </g>
      ))}
    </>
  );
}

function box(width: number, yTicks: number[], tall?: number) {
  const H = tall ?? (width < 480 ? 240 : 300);
  const l = Math.max(34, Math.max(...yTicks.map((t) => fmt(t).length)) * 7 + 12);
  return { W: Math.max(260, width), H, l, r: 14, t: 10, b: 30 };
}

/* ---------- histogram ---------- */

export function HistogramChart({ col, height }: { col: Column; height?: number }) {
  const { bins } = histogram(col);
  const lo = bins[0]?.from ?? 0, hi = bins[bins.length - 1]?.to ?? 1;
  return (
    <ChartBox label={`How ${col.name} is spread`}>
      {(width, show, hide) => {
        const yT = niceTicks(0, Math.max(...bins.map((b) => b.count)), 4);
        const bx = box(width, yT, height);
        const x = scale(lo, hi, bx.l, bx.W - bx.r);
        const y = scale(yT[0], yT[yT.length - 1], bx.H - bx.b, bx.t);
        const xT = niceTicks(lo, hi, bx.W < 480 ? 3 : 6).filter((t) => t >= lo && t <= hi);
        return (
          <svg viewBox={`0 0 ${bx.W} ${bx.H}`}>
            <YAxis ticks={yT} y={y} left={bx.l} right={bx.W - bx.r} />
            {bins.map((b, i) =>
              b.count ? (
                <path key={i} className="mark" d={barPath(x(b.from) + 1, y(b.count), Math.max(1, x(b.to) - x(b.from) - 2), y(0) - y(b.count), 4)}
                  onPointerMove={(e) => show(e, [`${fmt(b.from)} to ${fmt(b.to)}`, `${fmt(b.count)} rows`])} onPointerLeave={hide} />
              ) : null,
            )}
            {xT.map((t) => (
              <text key={t} x={x(t)} y={bx.H - 10} textAnchor="middle">{fmt(t)}</text>
            ))}
          </svg>
        );
      }}
    </ChartBox>
  );
}

/* ---------- scatter ---------- */

export function ScatterChart({ xCol, yCol, height }: { xCol: Column; yCol: Column; height?: number }) {
  let pts: [number, number][] = [];
  for (let i = 0; i < xCol.values.length; i++) {
    const a = xCol.values[i], b = yCol.values[i];
    if (typeof a === "number" && typeof b === "number") pts.push([a, b]);
  }
  const total = pts.length;
  const mx = pts.reduce((s, p) => s + p[0], 0) / (total || 1);
  const my = pts.reduce((s, p) => s + p[1], 0) / (total || 1);
  let sxy = 0, sxx = 0;
  for (const p of pts) { sxy += (p[0] - mx) * (p[1] - my); sxx += (p[0] - mx) ** 2; }
  const slope = sxx ? sxy / sxx : 0, icpt = my - slope * mx;
  if (pts.length > 1500) { const step = pts.length / 1500; pts = Array.from({ length: 1500 }, (_, i) => pts[Math.floor(i * step)]); }
  return (
    <ChartBox label={`${yCol.name} against ${xCol.name}`}>
      {(width, show, hide) => {
        const yT = niceTicks(yCol.min ?? 0, yCol.max ?? 1, 5);
        const bx = box(width, yT, height);
        const xT = niceTicks(xCol.min ?? 0, xCol.max ?? 1, bx.W < 480 ? 3 : 6);
        const x = scale(xT[0], xT[xT.length - 1], bx.l, bx.W - bx.r);
        const y = scale(yT[0], yT[yT.length - 1], bx.H - bx.b, bx.t);
        const clampY = (v: number) => Math.max(yT[0], Math.min(yT[yT.length - 1], v));
        return (
          <svg viewBox={`0 0 ${bx.W} ${bx.H}`}>
            <YAxis ticks={yT} y={y} left={bx.l} right={bx.W - bx.r} />
            {xT.map((t) => (
              <text key={t} x={x(t)} y={bx.H - 10} textAnchor="middle">{fmt(t)}</text>
            ))}
            {pts.map((p, i) => (
              <circle key={i} className="dot" cx={x(p[0])} cy={y(p[1])} r={4}
                onPointerMove={(e) => show(e, [`${xCol.name}: ${fmt(p[0])}`, `${yCol.name}: ${fmt(p[1])}`])} onPointerLeave={hide} />
            ))}
            {total > 2 && (
              <line className="trend" x1={x(xCol.min!)} y1={y(clampY(icpt + slope * xCol.min!))} x2={x(xCol.max!)} y2={y(clampY(icpt + slope * xCol.max!))} />
            )}
          </svg>
        );
      }}
    </ChartBox>
  );
}

/* ---------- time series ---------- */

export function LineChart({ series, label, height }: { series: TimeSeries; label: string; height?: number }) {
  const { points, unit } = series;
  if (!points.length) return <p className="note">No rows have both values.</p>;
  return (
    <ChartBox label={label}>
      {(width, show, hide) => {
        const vals = points.map((p) => p[1]);
        const yT = niceTicks(Math.min(0, ...vals), Math.max(...vals), 5);
        const bx = box(width, yT, height);
        const x = scale(points[0][0], points[points.length - 1][0], bx.l + 6, bx.W - bx.r - 6);
        const y = scale(yT[0], yT[yT.length - 1], bx.H - bx.b, bx.t);
        const X = (p: [number, number]) => (points.length === 1 ? (bx.l + bx.W - bx.r) / 2 : x(p[0]));
        const path = points.map((p, i) => `${i ? "L" : "M"}${X(p).toFixed(1)},${y(p[1]).toFixed(1)}`).join("");
        const every = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor((bx.W - bx.l) / 84))));
        const band = points.length > 1 ? (bx.W - bx.l - bx.r) / (points.length - 1) : bx.W - bx.l - bx.r;
        return (
          <svg viewBox={`0 0 ${bx.W} ${bx.H}`}>
            <YAxis ticks={yT} y={y} left={bx.l} right={bx.W - bx.r} />
            {points.length > 1 && (
              <>
                <path className="area" d={`${path}L${X(points[points.length - 1])},${y(yT[0])}L${X(points[0])},${y(yT[0])}Z`} />
                <path className="lineseries" d={path} />
              </>
            )}
            {points.map((p, i) => (
              <g key={p[0]} className="pt" onPointerMove={(e) => show(e, [timeLabel(p[0], unit), fmt(p[1])])} onPointerLeave={hide}>
                {i % every === 0 && (
                  <text x={X(p)} y={bx.H - 10} textAnchor={i === 0 ? "start" : "middle"}>{timeLabel(p[0], unit)}</text>
                )}
                <rect className="hit" x={X(p) - band / 2} y={bx.t} width={band} height={bx.H - bx.b - bx.t} />
                <line x1={X(p)} x2={X(p)} y1={bx.t} y2={bx.H - bx.b} />
                <circle cx={X(p)} cy={y(p[1])} r={points.length === 1 ? 5 : 4.5} style={points.length === 1 ? { opacity: 1 } : undefined} />
              </g>
            ))}
          </svg>
        );
      }}
    </ChartBox>
  );
}

/* ---------- ranked bars ---------- */

/* ---------- donut ---------- */

const DONUT_COLORS = [
  "var(--accent)", "#e34948", "#2ea87e", "#e89a3c", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

export function DonutChart({ items, label, format: fmtFn = fmt }: { items: [string, number][]; label: string; format?: (v: number) => string }) {
  if (!items.length) return <p className="note">No data.</p>;
  const total = items.reduce((s, e) => s + Math.abs(e[1]), 0) || 1;
  return (
    <ChartBox label={label} className="chart-donut">
      {(width, show, hide) => {
        const size = Math.min(width, 280);
        const cx = size / 2, cy = size / 2, R = size * 0.42, r = size * 0.26;
        let angle = -Math.PI / 2;
        const arcs = items.map(([k, v], i) => {
          const frac = Math.abs(v) / total;
          const a0 = angle;
          angle += frac * Math.PI * 2;
          const a1 = angle;
          const large = frac > 0.5 ? 1 : 0;
          const d = [
            `M${cx + R * Math.cos(a0)} ${cy + R * Math.sin(a0)}`,
            `A${R} ${R} 0 ${large} 1 ${cx + R * Math.cos(a1)} ${cy + R * Math.sin(a1)}`,
            `L${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)}`,
            `A${r} ${r} 0 ${large} 0 ${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)}`,
            "Z",
          ].join(" ");
          return { k, v, d, color: DONUT_COLORS[i % DONUT_COLORS.length], pct: frac };
        });
        return (
          <div className="donut-wrap">
            <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size, maxWidth: "100%" }}>
              {arcs.map((a, i) => (
                <path key={i} d={a.d} fill={a.color} stroke="var(--surface)" strokeWidth="2"
                  onPointerMove={(e) => show(e, [a.k, `${fmtFn(a.v)} (${(a.pct * 100).toFixed(1)}%)`])} onPointerLeave={hide} style={{ cursor: "default" }} />
              ))}
              <text x={cx} y={cy - 6} textAnchor="middle" style={{ fill: "var(--ink)", fontSize: 18, fontWeight: 600, fontFamily: "var(--sans)" }}>{fmtFn(total)}</text>
              <text x={cx} y={cy + 12} textAnchor="middle" style={{ fill: "var(--muted)", fontSize: 11 }}>total</text>
            </svg>
            <div className="donut-legend">
              {arcs.map((a, i) => (
                <div key={i} className="donut-leg-row">
                  <span className="donut-swatch" style={{ background: a.color }} />
                  <span className="donut-lbl">{a.k}</span>
                  <span className="donut-val">{(a.pct * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        );
      }}
    </ChartBox>
  );
}

/* ---------- area chart ---------- */

export function AreaChart({ series, label, height }: { series: TimeSeries; label: string; height?: number }) {
  const { points, unit } = series;
  if (!points.length) return <p className="note">No rows have both values.</p>;
  return (
    <ChartBox label={label}>
      {(width, show, hide) => {
        const vals = points.map((p) => p[1]);
        const yT = niceTicks(Math.min(0, ...vals), Math.max(...vals), 5);
        const bx = box(width, yT, height);
        const x = scale(points[0][0], points[points.length - 1][0], bx.l + 6, bx.W - bx.r - 6);
        const y = scale(yT[0], yT[yT.length - 1], bx.H - bx.b, bx.t);
        const X = (p: [number, number]) => (points.length === 1 ? (bx.l + bx.W - bx.r) / 2 : x(p[0]));
        const path = points.map((p, i) => `${i ? "L" : "M"}${X(p).toFixed(1)},${y(p[1]).toFixed(1)}`).join("");
        const areaPath = `${path}L${X(points[points.length - 1])},${y(yT[0])}L${X(points[0])},${y(yT[0])}Z`;
        const every = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor((bx.W - bx.l) / 84))));
        const band = points.length > 1 ? (bx.W - bx.l - bx.r) / (points.length - 1) : bx.W - bx.l - bx.r;
        return (
          <svg viewBox={`0 0 ${bx.W} ${bx.H}`}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.03" />
              </linearGradient>
            </defs>
            <YAxis ticks={yT} y={y} left={bx.l} right={bx.W - bx.r} />
            <path d={areaPath} fill="url(#areaGrad)" />
            <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {points.map((p, i) => (
              <g key={p[0]} className="pt" onPointerMove={(e) => show(e, [timeLabel(p[0], unit), fmt(p[1])])} onPointerLeave={hide}>
                {i % every === 0 && (
                  <text x={X(p)} y={bx.H - 10} textAnchor={i === 0 ? "start" : "middle"}>{timeLabel(p[0], unit)}</text>
                )}
                <rect className="hit" x={X(p) - band / 2} y={bx.t} width={band} height={bx.H - bx.b - bx.t} />
                <line x1={X(p)} x2={X(p)} y1={bx.t} y2={bx.H - bx.b} />
                <circle cx={X(p)} cy={y(p[1])} r={4.5} />
              </g>
            ))}
          </svg>
        );
      }}
    </ChartBox>
  );
}

/* ---------- KPI card ---------- */

export function KpiCard({ title, value, subtitle, trend }: { title: string; value: string; subtitle?: string; trend?: { pct: number; up: boolean } }) {
  return (
    <div className="kpi-card">
      <span className="kpi-title">{title}</span>
      <span className="kpi-value">{value}</span>
      {trend && (
        <span className={`kpi-trend ${trend.up ? "kpi-up" : "kpi-down"}`}>
          {trend.up ? "▲" : "▼"} {Math.abs(trend.pct).toFixed(1)}%
        </span>
      )}
      {subtitle && <span className="kpi-sub">{subtitle}</span>}
    </div>
  );
}

/* ---------- treemap ---------- */

export function TreemapChart({ items, label, format: fmtFn = fmt }: { items: [string, number][]; label: string; format?: (v: number) => string }) {
  if (!items.length) return <p className="note">No data.</p>;
  const total = items.reduce((s, e) => s + Math.abs(e[1]), 0) || 1;
  const sorted = [...items].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  return (
    <ChartBox label={label} className="chart-treemap">
      {(width, show, hide) => {
        const H = Math.min(width * 0.6, 320);
        const rects = squarify(sorted.map(([k, v]) => ({ k, v: Math.abs(v), frac: Math.abs(v) / total })), width, H);
        return (
          <svg viewBox={`0 0 ${width} ${H}`} style={{ width: "100%", height: "auto" }}>
            {rects.map((r, i) => {
              const color = DONUT_COLORS[i % DONUT_COLORS.length];
              const minDim = Math.min(r.w, r.h);
              return (
                <g key={i} onPointerMove={(e) => show(e, [r.k, `${fmtFn(r.v)} (${(r.frac * 100).toFixed(1)}%)`])} onPointerLeave={hide} style={{ cursor: "default" }}>
                  <rect x={r.x + 1} y={r.y + 1} width={Math.max(0, r.w - 2)} height={Math.max(0, r.h - 2)} rx="4" fill={color} opacity="0.85" />
                  {minDim > 36 && (
                    <text x={r.x + r.w / 2} y={r.y + r.h / 2 - (minDim > 50 ? 4 : 0)} textAnchor="middle" dominantBaseline="central"
                      style={{ fill: "#fff", fontSize: Math.min(13, minDim / 5), fontFamily: "var(--sans)", fontWeight: 500 }}>
                      {r.k.length > r.w / 8 ? r.k.slice(0, Math.floor(r.w / 8)) + "…" : r.k}
                    </text>
                  )}
                  {minDim > 50 && (
                    <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 14} textAnchor="middle" dominantBaseline="central"
                      style={{ fill: "#fff", fontSize: 10, opacity: 0.8 }}>
                      {(r.frac * 100).toFixed(1)}%
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        );
      }}
    </ChartBox>
  );
}

function squarify(data: { k: string; v: number; frac: number }[], W: number, H: number) {
  const rects: { x: number; y: number; w: number; h: number; k: string; v: number; frac: number }[] = [];
  let x = 0, y = 0, w = W, h = H;
  const remaining = [...data];
  while (remaining.length) {
    const totalVal = remaining.reduce((s, d) => s + d.v, 0) || 1;
    const isWide = w >= h;
    const side = isWide ? h : w;
    let row: typeof remaining = [];
    let rowVal = 0;
    let bestRatio = Infinity;
    for (const item of remaining) {
      const test = [...row, item];
      const testVal = rowVal + item.v;
      const rowLen = (testVal / totalVal) * (isWide ? w : h);
      const worst = Math.max(...test.map((d) => {
        const s = (d.v / testVal) * side;
        return Math.max(rowLen / s, s / rowLen);
      }));
      if (worst <= bestRatio) {
        bestRatio = worst;
        row = test;
        rowVal = testVal;
      } else break;
    }
    const rowLen = (rowVal / totalVal) * (isWide ? w : h);
    let pos = 0;
    for (const item of row) {
      const s = (item.v / rowVal) * side;
      if (isWide) rects.push({ x: x + pos * 0, y: y + pos, w: rowLen, h: s, ...item });
      else rects.push({ x: x + pos, y, w: s, h: rowLen, ...item });
      pos += s;
    }
    if (isWide) { x += rowLen; w -= rowLen; } else { y += rowLen; h -= rowLen; }
    remaining.splice(0, row.length);
  }
  return rects;
}

/* ---------- ranked bars ---------- */

export function BarList({ items, label, format = fmt }: { items: [string, number][]; label: string; format?: (v: number) => string }) {
  if (!items.length) return <p className="note">No rows have both values.</p>;
  const max = Math.max(...items.map((e) => Math.abs(e[1]))) || 1;
  return (
    <ChartBox label={label} className="chart-bars">
      {(_w, show, hide) => (
        <div className="hbars">
          {items.map(([k, v]) => (
            <div key={k} className="hbar-row" onPointerMove={(e) => show(e, [k, format(v)])} onPointerLeave={hide}>
              <span className="lab" title={k}>{k}</span>
              <span className="track"><span className="fill" style={{ width: `${(Math.abs(v) / max) * 100}%` }} /></span>
              <span className="val">{format(v)}</span>
            </div>
          ))}
        </div>
      )}
    </ChartBox>
  );
}

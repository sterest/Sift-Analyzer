import { fmt, fmtDate, pct } from "./format";

export type RawRow = Record<string, string>;
export type ColType = "number" | "date" | "text";
export type Agg = "sum" | "mean" | "median" | "min" | "max";

export interface Column {
  name: string;
  type: ColType;
  /** Parsed values: numbers (also epoch ms for dates), trimmed strings, or null when blank. */
  values: (number | string | null)[];
  n: number;
  count: number;
  missing: number;
  unique: number;
  idLike: boolean;
  categorical: boolean;
  sorted?: number[];
  min?: number;
  max?: number;
  q1?: number;
  median?: number;
  q3?: number;
  mean?: number;
  sd?: number;
  hiFence?: number;
  loFence?: number;
  outHi?: number;
  outLo?: number;
  skew?: number;
  top?: [string, number][];
}

export interface Dataset {
  name: string;
  headers: string[];
  rows: RawRow[];
  cols: Column[];
  dupes: number;
}

export type FindingPart = string | { strong: string };
export interface Finding {
  kind: "Quality" | "Relationship" | "Groups" | "Distribution" | "Coverage";
  parts: FindingPart[];
}

const BLANK = new Set(["", "na", "n/a", "nan", "null", "none", "undefined", "-", "#n/a"]);
export const isBlank = (v: unknown) => v == null || BLANK.has(String(v).trim().toLowerCase());

export function parseNum(s: unknown): number {
  const t = String(s).trim().replace(/^[$€£¥₦]/, "").replace(/,/g, "").replace(/%$/, "");
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return NaN;
  return Number(t);
}

export function parseDate(s: unknown): number {
  const t = String(s).trim();
  const looksLikeDate =
    /^\d{4}-\d{1,2}(-\d{1,2})?([T ].*)?$/.test(t) ||
    /^\d{1,2}[/.]\d{1,2}[/.]\d{2,4}/.test(t) ||
    /^[A-Za-z]{3,9}\.? \d{1,2},? \d{4}$/.test(t) ||
    /^\d{1,2} [A-Za-z]{3,9} \d{4}$/.test(t);
  if (!looksLikeDate) return NaN;
  // Date-only ISO strings are read as UTC midnight so every timezone sees the same day.
  if (/^\d{4}-\d{1,2}(-\d{1,2})?$/.test(t)) return Date.parse(t + (t.length <= 7 ? "-01" : "") + "T00:00:00Z");
  return Date.parse(t);
}

export function quantile(sorted: number[], p: number): number {
  if (!sorted.length) return NaN;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

export function aggregate(arr: number[], kind: Agg): number {
  if (!arr.length) return NaN;
  switch (kind) {
    case "sum":
      return arr.reduce((a, b) => a + b, 0);
    case "mean":
      return arr.reduce((a, b) => a + b, 0) / arr.length;
    case "min":
      return Math.min(...arr);
    case "max":
      return Math.max(...arr);
    default:
      return quantile(arr.slice().sort((a, b) => a - b), 0.5);
  }
}

export function pearson(a: (number | string | null)[], b: (number | string | null)[]): number {
  let n = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (typeof x !== "number" || typeof y !== "number") continue;
    n++; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y;
  }
  if (n < 3) return NaN;
  const d = Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
  return d ? (n * sxy - sx * sy) / d : NaN;
}

/** Profile every column. Pass `types` to keep the types of a parent dataset (used when filtering). */
export function analyze(headers: string[], rows: RawRow[], types?: ColType[], parent?: Column[]): Column[] {
  const n = rows.length;
  return headers.map((h, hi) => {
    const raw = rows.map((r) => r[h]);
    const present = raw.filter((v) => !isBlank(v));
    const m = present.length;
    let type: ColType = "text";
    if (types) type = types[hi];
    else if (m) {
      let nNum = 0, nDate = 0;
      for (const v of present) {
        if (!Number.isNaN(parseNum(v))) nNum++;
        else if (!Number.isNaN(parseDate(v))) nDate++;
      }
      if (nNum / m >= 0.9) type = "number";
      else if (nDate / m >= 0.9) type = "date";
    }
    const values = raw.map((v) => {
      if (isBlank(v)) return null;
      if (type === "number") { const x = parseNum(v); return Number.isNaN(x) ? null : x; }
      if (type === "date") { const x = parseDate(v); return Number.isNaN(x) ? null : x; }
      return String(v).trim();
    });
    const ok = values.filter((v): v is number | string => v != null);
    const col: Column = {
      name: h, type, values, n, count: ok.length, missing: n - ok.length,
      unique: new Set(ok).size, idLike: false, categorical: false,
    };
    if (type === "number" || type === "date") {
      const s = (ok as number[]).slice().sort((a, b) => a - b);
      col.sorted = s; col.min = s[0]; col.max = s[s.length - 1];
      col.q1 = quantile(s, 0.25); col.median = quantile(s, 0.5); col.q3 = quantile(s, 0.75);
    }
    if (type === "number") {
      const s = col.sorted!;
      const mean = s.reduce((a, b) => a + b, 0) / (s.length || 1);
      const sd = Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, s.length - 1));
      const iqr = col.q3! - col.q1!;
      col.mean = mean; col.sd = sd;
      col.hiFence = col.q3! + 1.5 * iqr; col.loFence = col.q1! - 1.5 * iqr;
      col.outHi = iqr > 0 ? s.filter((v) => v > col.hiFence!).length : 0;
      col.outLo = iqr > 0 ? s.filter((v) => v < col.loFence!).length : 0;
      col.skew = sd ? s.reduce((a, b) => a + ((b - mean) / sd) ** 3, 0) / s.length : 0;
      col.idLike = s.every(Number.isInteger) && col.unique === col.count && col.count > 10 &&
        /(^|[_\s-])(id|no|num|number|index|key)$|^id|^#$/i.test(h.trim());
    } else if (type === "text") {
      const counts = new Map<string, number>();
      for (const v of ok as string[]) counts.set(v, (counts.get(v) || 0) + 1);
      col.top = Array.from(counts).sort((a, b) => b[1] - a[1]);
      col.idLike = col.unique === col.count && col.count > 10;
      col.categorical = !col.idLike && col.unique <= Math.max(30, n * 0.2);
    }
    if (parent) { col.idLike = parent[hi].idLike; col.categorical = parent[hi].categorical; }
    return col;
  });
}

export function buildDataset(name: string, headersIn: string[], rows: RawRow[]): Dataset {
  const headers = headersIn.filter((h) => h != null && String(h).trim() !== "");
  if (!headers.length || !rows.length) {
    throw new Error("No rows found. The first row should hold column names, with data underneath.");
  }
  const cols = analyze(headers, rows);
  const seen = new Set<string>();
  let dupes = 0;
  for (const r of rows) {
    const k = headers.map((h) => r[h]).join("\u0001");
    if (seen.has(k)) dupes++; else seen.add(k);
  }
  return { name, headers, rows, cols, dupes };
}

/** Numeric columns worth analysing (not identifiers, not constant). */
export const measureCols = (cols: Column[]) =>
  cols.map((c, i) => (c.type === "number" && !c.idLike && c.unique > 1 ? i : -1)).filter((i) => i >= 0);

/** Prefer money-like columns as the default measure. */
export function pickMeasure(cols: Column[], idxs: number[]): number | undefined {
  for (const re of [/revenue|sales/i, /amount|total|profit/i, /value|cost|price/i]) {
    const i = idxs.find((j) => re.test(cols[j].name));
    if (i != null) return i;
  }
  return idxs[0];
}

export function findings(ds: Dataset): Finding[] {
  const { cols, rows } = ds;
  const n = rows.length;
  const out: Finding[] = [];
  const b = (s: string) => ({ strong: s });
  const list = (cs: Column[]) => cs.flatMap((c, i) => (i ? [", ", b(c.name)] : [b(c.name)]));

  const cells = n * cols.length;
  const miss = cols.reduce((a, c) => a + c.missing, 0);
  if (miss === 0) out.push({ kind: "Quality", parts: ["Every cell is filled in. No missing values."] });
  else {
    const worst = cols.filter((c) => c.missing).sort((x, y) => y.missing - x.missing).slice(0, 2);
    const parts: FindingPart[] = [pct(miss / cells) + " of cells are empty. Most of the gaps are in "];
    worst.forEach((c, i) => {
      if (i) parts.push(" and ");
      parts.push(b(c.name), ` (${fmt(c.missing)}, ${pct(c.missing / n)} of rows)`);
    });
    parts.push(".");
    out.push({ kind: "Quality", parts });
  }
  if (ds.dupes) out.push({ kind: "Quality", parts: [`${fmt(ds.dupes)} row${ds.dupes > 1 ? "s are exact copies" : " is an exact copy"} of an earlier row. Remove them before totalling anything.`] });
  const ids = cols.filter((c) => c.idLike);
  if (ids.length) out.push({ kind: "Quality", parts: [...list(ids), ids.length > 1 ? " are different on every row, so they look like identifiers and are left out of the statistics." : " is different on every row, so it looks like an identifier and is left out of the statistics."] });
  const constant = cols.filter((c) => c.unique === 1 && n > 1);
  if (constant.length) out.push({ kind: "Quality", parts: [...list(constant), constant.length > 1 ? " hold the same value on every row and cannot explain anything." : " holds the same value on every row and cannot explain anything."] });

  const nums = cols.filter((c) => c.type === "number" && !c.idLike && c.unique > 1);
  const pairs: { a: Column; b: Column; r: number }[] = [];
  for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) {
    const r = pearson(nums[i].values, nums[j].values);
    if (Number.isFinite(r)) pairs.push({ a: nums[i], b: nums[j], r });
  }
  pairs.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
  const strong = pairs.filter((p) => Math.abs(p.r) >= 0.5).slice(0, 3);
  for (const p of strong) out.push({ kind: "Relationship", parts: [b(p.a.name), " and ", b(p.b.name), `${p.r > 0 ? " rise together" : " move in opposite directions"} (r = ${p.r.toFixed(2)}, ${Math.abs(p.r) >= 0.8 ? "a strong link" : "a moderate link"}).`] });
  if (nums.length > 1 && !strong.length) out.push({ kind: "Relationship", parts: [`No two numeric columns move together strongly. The largest correlation is ${pairs[0] ? pairs[0].r.toFixed(2) : "0"}.`] });

  // Which category separates which measure the most (eta squared).
  let best: { c: Column; m: Column; eta: number; means: [string, number][] } | null = null;
  for (const c of cols.filter((c) => c.type === "text" && c.categorical && c.unique >= 2 && c.unique <= 12)) for (const m of nums) {
    const g = new Map<string, number[]>();
    let tot = 0, cnt = 0;
    for (let i = 0; i < n; i++) {
      const k = c.values[i], v = m.values[i];
      if (k == null || typeof v !== "number") continue;
      const key = String(k);
      if (!g.has(key)) g.set(key, []);
      g.get(key)!.push(v); tot += v; cnt++;
    }
    if (cnt < 10) continue;
    const gm = tot / cnt;
    let ssb = 0, sst = 0;
    const means: [string, number][] = [];
    for (const [k, arr] of g) {
      const mu = arr.reduce((a, x) => a + x, 0) / arr.length;
      ssb += arr.length * (mu - gm) ** 2;
      for (const x of arr) sst += (x - gm) ** 2;
      if (arr.length >= 3) means.push([k, mu]);
    }
    const eta = sst ? ssb / sst : 0;
    if (means.length >= 2 && (!best || eta > best.eta)) best = { c, m, eta, means: means.sort((a, x) => x[1] - a[1]) };
  }
  if (best && best.eta >= 0.08) {
    const hi = best.means[0], lo = best.means[best.means.length - 1];
    out.push({ kind: "Groups", parts: [b(best.m.name), " differs most by ", b(best.c.name), `: ${hi[0]} averages ${fmt(hi[1])}, ${lo[0]} averages ${fmt(lo[1])}. `, b(best.c.name), ` accounts for ${pct(best.eta)} of the variation.`] });
  }
  for (const c of cols.filter((c) => c.type === "text" && c.categorical && c.unique >= 2).slice(0, 8)) {
    const share = c.top![0][1] / c.count;
    if (share >= 0.5) out.push({ kind: "Groups", parts: ["In ", b(c.name), ", ", b(c.top![0][0]), ` makes up ${pct(share)} of rows.`] });
  }
  const outs = nums.filter((c) => c.outHi! + c.outLo! > 0 && c.unique > 8)
    .sort((x, y) => y.outHi! + y.outLo! - (x.outHi! + x.outLo!)).slice(0, 2);
  for (const c of outs) {
    const bits: string[] = [];
    if (c.outHi) bits.push(`${fmt(c.outHi)} unusually high value${c.outHi > 1 ? "s" : ""} (above ${fmt(c.hiFence)}, up to ${fmt(c.max)})`);
    if (c.outLo) bits.push(`${fmt(c.outLo)} unusually low value${c.outLo > 1 ? "s" : ""} (below ${fmt(c.loFence)}, down to ${fmt(c.min)})`);
    out.push({ kind: "Distribution", parts: [b(c.name), " has " + bits.join(" and ") + "."] });
  }
  for (const c of nums.filter((c) => Math.abs(c.skew!) >= 1 && !outs.includes(c)).slice(0, 1)) {
    out.push({ kind: "Distribution", parts: [b(c.name), ` is lopsided: most values are ${c.skew! > 0 ? "low with a long tail of high ones" : "high with a long tail of low ones"} (median ${fmt(c.median)}, average ${fmt(c.mean)}). The median is the safer summary.`] });
  }
  const d = cols.find((c) => c.type === "date" && c.count);
  if (d) out.push({ kind: "Coverage", parts: [b(d.name), ` runs from ${fmtDate(d.min!)} to ${fmtDate(d.max!)} (${fmt(Math.round((d.max! - d.min!) / 864e5) + 1)} days).`] });
  return out;
}

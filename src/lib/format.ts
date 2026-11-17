export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Human-friendly number: compact above a million, sensible decimals below. */
export function fmt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "–";
  const a = Math.abs(n);
  if (a >= 1e6) return n.toLocaleString("en-US", { notation: "compact", maximumFractionDigits: 2 });
  if (Number.isInteger(n)) return n.toLocaleString("en-US");
  if (a >= 100) return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
  if (a >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return n.toLocaleString("en-US", { maximumSignificantDigits: 3 });
}

/** Share (0..1) as a percentage string. */
export function pct(x: number): string {
  return (x * 100).toLocaleString("en-US", { maximumFractionDigits: Math.abs(x) < 0.1 ? 1 : 0 }) + "%";
}

export const fmtDate = (t: number) => new Date(t).toISOString().slice(0, 10);

export type TimeUnit = "day" | "month" | "year";

export function timeLabel(t: number, unit: TimeUnit): string {
  const d = new Date(t);
  if (unit === "year") return String(d.getUTCFullYear());
  if (unit === "month") return MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear();
  return MONTHS[d.getUTCMonth()] + " " + d.getUTCDate();
}

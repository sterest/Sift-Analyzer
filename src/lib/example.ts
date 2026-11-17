import { buildDataset, type Dataset, type RawRow } from "./analyze";

/** Generated store orders, seeded so everyone sees the same example. Not real data. */
export function exampleDataset(): Dataset {
  let seed = 20261116;
  const rnd = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = <T,>(arr: T[], w: number[]) => {
    let r = rnd() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < arr.length; i++) {
      r -= w[i];
      if (r <= 0) return arr[i];
    }
    return arr[arr.length - 1];
  };
  const cats: Record<string, [number, number]> = { Electronics: [89, 60], Home: [42, 22], Apparel: [35, 14], Toys: [24, 9], Stationery: [9, 4] };
  const headers = ["order_id", "order_date", "region", "category", "channel", "units", "unit_price", "discount_pct", "revenue", "delivery_days", "rating"];
  const rows: RawRow[] = [];
  const start = Date.UTC(2026, 0, 2);
  for (let i = 0; i < 280; i++) {
    const day = Math.floor(Math.pow(rnd(), 0.8) * 300);
    const date = new Date(start + day * 864e5).toISOString().slice(0, 10);
    const region = pick(["West", "East", "North", "South"], [34, 27, 21, 18]);
    const category = pick(Object.keys(cats), [16, 22, 26, 14, 22]);
    const channel = pick(["Web", "App", "Store"], [48, 32, 20]);
    let units = 1 + Math.floor(Math.pow(rnd(), 2.2) * 9);
    if (rnd() < 0.025) units = 40 + Math.floor(rnd() * 50);
    const price = Math.max(2, cats[category][0] + (rnd() - 0.5) * 2 * cats[category][1]);
    const disc = rnd() < 0.55 ? 0 : pick([5, 10, 15, 25], [4, 4, 2, 1]);
    const delivery = channel === "Store" ? 0 : Math.max(1, Math.round((region === "North" ? 5.5 : 3.2) + (rnd() - 0.4) * 5));
    const rating = Math.max(1, Math.min(5, Math.round((4.7 - delivery * 0.28 + (rnd() - 0.5) * 1.4) * 10) / 10));
    rows.push({
      order_id: String(10400 + i), order_date: date, region, category, channel, units: String(units),
      unit_price: price.toFixed(2), discount_pct: String(disc), revenue: (units * price * (1 - disc / 100)).toFixed(2),
      delivery_days: String(delivery), rating: rnd() < 0.09 ? "" : rating.toFixed(1),
    });
  }
  rows.sort((a, b) => (a.order_date < b.order_date ? -1 : a.order_date > b.order_date ? 1 : 0));
  return buildDataset("Example: online store orders, Jan to Oct 2026", headers, rows);
}

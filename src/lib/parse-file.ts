import Papa from "papaparse";
import type { RawRow } from "./analyze";

export interface ParsedTable {
  headers: string[];
  rows: RawRow[];
  /** Extra detail for the dataset name, e.g. which Excel sheet was read. */
  detail?: string;
}

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const ACCEPT = ".csv,.tsv,.txt,.json,.xlsx";

export function fileKind(name: string): "excel" | "json" | "text" {
  if (/\.xlsx$/i.test(name)) return "excel";
  if (/\.json$/i.test(name)) return "json";
  return "text";
}

function cellToString(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function fromObjects(data: unknown[]): ParsedTable {
  const objs = data.filter((r): r is Record<string, unknown> => !!r && typeof r === "object" && !Array.isArray(r));
  const headers: string[] = [];
  for (const r of objs) for (const k of Object.keys(r)) if (!headers.includes(k)) headers.push(k);
  return {
    headers,
    rows: objs.map((r) => Object.fromEntries(headers.map((h) => [h, cellToString(r[h])]))),
  };
}

/** Read pasted or file text: a JSON array of objects, or CSV / TSV with a header row. */
export function parseText(text: string): ParsedTable {
  const t = text.trim();
  if (!t) throw new Error("There is nothing to read yet. Paste some data first.");
  if (t[0] === "[" || t[0] === "{") {
    let data: unknown;
    try {
      data = JSON.parse(t);
    } catch (e) {
      throw new Error("This looks like JSON but could not be read: " + (e as Error).message);
    }
    if (!Array.isArray(data)) {
      const inner = Object.values(data as Record<string, unknown>).find(Array.isArray);
      data = inner ?? [data];
    }
    return fromObjects(data as unknown[]);
  }
  const res = Papa.parse<RawRow>(t, { header: true, skipEmptyLines: "greedy" });
  return { headers: res.meta.fields ?? [], rows: res.data };
}

export async function parseFile(file: Blob, name: string): Promise<ParsedTable> {
  if (file.size > MAX_FILE_BYTES) throw new Error("This file is larger than 25 MB. Split it or remove unused columns, then try again.");
  const kind = fileKind(name);
  if (kind === "excel") {
    const { default: readXlsxFile } = await import("read-excel-file/browser");
    const sheets = await readXlsxFile(file);
    const first = sheets[0];
    if (!first || !first.data.length) throw new Error("The first sheet of this workbook is empty.");
    const [head, ...body] = first.data;
    const headers = head.map((h, i) => (h == null || String(h).trim() === "" ? `Column ${i + 1}` : cellToString(h)));
    const rows = body
      .filter((r) => r.some((c) => c != null && String(c).trim() !== ""))
      .map((r) => Object.fromEntries(headers.map((h, i) => [h, cellToString(r[i])])));
    return { headers, rows, detail: sheets.length > 1 ? `sheet "${first.sheet}"` : undefined };
  }
  return parseText(await file.text());
}

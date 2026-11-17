import type { Metadata } from "next";
import Link from "next/link";
import { fmt } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { DatasetRecord } from "@/lib/types";
import { NewDataset } from "./NewDataset";

export const metadata: Metadata = { title: "Your datasets" };

const when = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function DatasetsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("datasets")
    .select("id, name, storage_path, file_type, row_count, column_count, created_at")
    .order("created_at", { ascending: false });
  const datasets = (data ?? []) as DatasetRecord[];

  return (
    <div className="stack-lg">
      <div className="pagehead">
        <h1>Your datasets</h1>
        <p className="muted">Upload a CSV, Excel, TSV or JSON file. It is stored privately in your account.</p>
      </div>
      <NewDataset />
      {error && <p className="error" role="alert">Your datasets could not be loaded: {error.message}</p>}
      {!error && datasets.length === 0 && (
        <p className="emptymsg">No datasets yet. Open a file above and its dashboard appears here.</p>
      )}
      {datasets.length > 0 && (
        <ul className="dslist">
          {datasets.map((d) => (
            <li key={d.id}>
              <Link href={`/app/datasets/${d.id}`} className="panel dsitem">
                <span className="dsname">{d.name}</span>
                <span className="dsmeta">
                  <span>{fmt(d.row_count)} rows</span>
                  <span>{d.column_count} columns</span>
                  <span className="chip">{d.file_type.toUpperCase()}</span>
                  <span>Added {when(d.created_at)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

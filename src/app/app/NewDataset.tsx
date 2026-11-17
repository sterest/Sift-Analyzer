"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePicker } from "@/components/FilePicker";
import { buildDataset } from "@/lib/analyze";
import { parseFile } from "@/lib/parse-file";
import { createClient } from "@/lib/supabase/client";
import { DATASET_BUCKET } from "@/lib/supabase/config";

const TYPES = ["csv", "tsv", "txt", "json", "xlsx"] as const;
const CONTENT_TYPE: Record<(typeof TYPES)[number], string> = {
  csv: "text/csv", tsv: "text/tab-separated-values", txt: "text/plain", json: "application/json",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/** Reads the file in the browser first (so a broken file never gets stored), then uploads it and opens its dashboard. */
export function NewDataset() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const save = useCallback(async (file: Blob, name: string) => {
    setBusy(true);
    setError("");
    try {
      const ext = (name.split(".").pop() ?? "").toLowerCase();
      const type = (TYPES as readonly string[]).includes(ext) ? (ext as (typeof TYPES)[number]) : "csv";
      const table = await parseFile(file, name);
      const ds = buildDataset(name, table.headers, table.rows);

      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push("/login"); return; }

      const path = `${auth.user.id}/${crypto.randomUUID()}.${type}`;
      const up = await supabase.storage.from(DATASET_BUCKET).upload(path, file, { contentType: CONTENT_TYPE[type], upsert: false });
      if (up.error) throw new Error("The file could not be uploaded: " + up.error.message);

      const { data, error: dbError } = await supabase
        .from("datasets")
        .insert({ name: name.slice(0, 200), storage_path: path, file_type: type, row_count: ds.rows.length, column_count: ds.cols.length })
        .select("id")
        .single();
      if (dbError || !data) {
        await supabase.storage.from(DATASET_BUCKET).remove([path]);
        throw new Error("The dataset could not be saved: " + (dbError?.message ?? "no id returned"));
      }
      router.push(`/app/datasets/${data.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }, [router]);

  return (
    <div className="panel stack">
      <FilePicker busy={busy} label="Upload a file"
        onFile={(f) => save(f, f.name)}
        onText={(text) => {
          const t = text.trim();
          const isJson = t.startsWith("[") || t.startsWith("{");
          const isTsv = !isJson && t.split("\n", 1)[0].includes("\t");
          save(new Blob([t], { type: "text/plain" }), `Pasted data ${new Date().toISOString().slice(0, 10)}.${isJson ? "json" : isTsv ? "tsv" : "csv"}`);
        }} />
      {error && <p className="error" role="alert">{error}</p>}
      <p className="note">Up to 25 MB. Excel files are read from their first sheet.</p>
    </div>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { defaultConfig, type DashConfig } from "@/components/Dashboard";
import { Workspace } from "@/components/Workspace";
import { buildDataset, type Dataset } from "@/lib/analyze";
import { saveBlob } from "@/lib/download";
import { parseFile } from "@/lib/parse-file";
import { createClient } from "@/lib/supabase/client";
import { DATASET_BUCKET } from "@/lib/supabase/config";
import type { DashboardRecord, DatasetRecord } from "@/lib/types";
import { deleteDataset } from "../../actions";

/** Keep only settings that still fit this dataset's columns; a saved view is untrusted JSON. */
function normalize(raw: unknown, ds: Dataset): DashConfig {
  const base = defaultConfig(ds);
  if (!raw || typeof raw !== "object") return base;
  const c = raw as Partial<DashConfig>;
  const names = new Set(ds.cols.map((col) => col.name));
  const filters: Record<string, string> = {};
  if (c.filters && typeof c.filters === "object") {
    for (const [k, v] of Object.entries(c.filters)) if (names.has(k) && typeof v === "string") filters[k] = v;
  }
  return {
    measure: c.measure === null ? null : typeof c.measure === "string" && names.has(c.measure) ? c.measure : base.measure,
    agg: c.agg === "mean" || c.agg === "median" ? c.agg : "sum",
    filters,
    range: [0, 30, 90, 365].includes(Number(c.range)) ? Number(c.range) : 0,
  };
}

const same = (a: DashConfig, b: DashConfig) => JSON.stringify(a) === JSON.stringify(b);

export function DatasetView({ dataset, initialViews }: { dataset: DatasetRecord; initialViews: DashboardRecord[] }) {
  const [ds, setDs] = useState<Dataset | null>(null);
  const [file, setFile] = useState<Blob | null>(null);
  const [loadError, setLoadError] = useState("");
  const [config, setConfig] = useState<DashConfig | null>(null);
  const [views, setViews] = useState(initialViews);
  const [activeId, setActiveId] = useState<string | null>(initialViews[0]?.id ?? null);
  const [newName, setNewName] = useState("");
  const [status, setStatus] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();

  useEffect(() => {
    document.title = `${dataset.name} · Sift`;
  }, [dataset.name]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.storage.from(DATASET_BUCKET).download(dataset.storage_path);
        if (error || !data) throw new Error("The file could not be downloaded: " + (error?.message ?? "empty response"));
        const table = await parseFile(data, `${dataset.name}.${dataset.file_type}`);
        const built = buildDataset(dataset.name, table.headers, table.rows);
        if (cancelled) return;
        setFile(data);
        setDs(built);
        setConfig(normalize(initialViews[0]?.config, built));
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [dataset, initialViews]);

  const active = views.find((v) => v.id === activeId) ?? null;
  const dirty = !!(active && ds && config && !same(normalize(active.config, ds), config));

  async function saveNew() {
    if (!config) return;
    const name = newName.trim() || `View ${views.length + 1}`;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("dashboards")
      .insert({ dataset_id: dataset.id, name: name.slice(0, 120), config })
      .select("id, dataset_id, name, config, created_at, updated_at")
      .single();
    if (error || !data) { setStatus("The view could not be saved: " + (error?.message ?? "no response")); return; }
    setViews((v) => [...v, data as DashboardRecord]);
    setActiveId(data.id);
    setNewName("");
    setStatus(`Saved "${data.name}".`);
  }

  async function updateActive() {
    if (!active || !config) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("dashboards")
      .update({ config, updated_at: new Date().toISOString() })
      .eq("id", active.id)
      .select("id, dataset_id, name, config, created_at, updated_at")
      .single();
    if (error || !data) { setStatus("The view could not be updated: " + (error?.message ?? "no response")); return; }
    setViews((v) => v.map((x) => (x.id === data.id ? (data as DashboardRecord) : x)));
    setStatus(`Updated "${data.name}".`);
  }

  async function removeView(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("dashboards").delete().eq("id", id);
    if (error) { setStatus("The view could not be deleted: " + error.message); return; }
    setViews((v) => v.filter((x) => x.id !== id));
    if (activeId === id) setActiveId(null);
    setStatus("View deleted.");
  }

  const head = (
    <div className="pagehead row">
      <Link href="/app" className="back">← Your datasets</Link>
      <div className="actions">
        {file && !confirmDelete && (
          <button className="btn" type="button" onClick={() => {
            const ext = "." + dataset.file_type;
            saveBlob(file, dataset.name.toLowerCase().endsWith(ext) ? dataset.name : dataset.name + ext);
          }}>Download original file</button>
        )}
        {confirmDelete ? (
          <>
            <span className="note">Delete this file and its saved views? This can&apos;t be undone.</span>
            <button className="btn btn-danger" type="button" disabled={deleting}
              onClick={() => startDelete(async () => { const r = await deleteDataset(dataset.id); if (r?.error) { setStatus(r.error); setConfirmDelete(false); } })}>
              {deleting ? "Deleting…" : "Delete dataset"}
            </button>
            <button className="btn" type="button" onClick={() => setConfirmDelete(false)}>Keep it</button>
          </>
        ) : (
          <button className="btn btn-quiet" type="button" onClick={() => setConfirmDelete(true)}>Delete dataset</button>
        )}
      </div>
    </div>
  );

  if (loadError) return <div className="stack-lg">{head}<p className="error" role="alert">{loadError}</p></div>;
  if (!ds || !config) return <div className="stack-lg">{head}<p className="emptymsg" role="status">Loading {dataset.name}…</p></div>;

  const viewsBar = (
    <div className="views">
      <span className="views-label">Saved views</span>
      {views.length === 0 && <span className="note">None yet. Set the filters you want, then save them as a view.</span>}
      {views.map((v) => (
        <span key={v.id} className={"viewchip" + (v.id === activeId ? " is-active" : "")}>
          <button type="button" onClick={() => { setActiveId(v.id); setConfig(normalize(v.config, ds)); setStatus(""); }}>{v.name}</button>
          <button type="button" className="x" aria-label={`Delete view ${v.name}`} onClick={() => removeView(v.id)}>×</button>
        </span>
      ))}
      <span className="views-save">
        {dirty && <button type="button" className="btn" onClick={updateActive}>Update &ldquo;{active!.name}&rdquo;</button>}
        <input id="view-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name this view" aria-label="New view name" maxLength={120} />
        <button type="button" className="btn btn-primary" onClick={saveNew}>Save as new view</button>
      </span>
      {status && <span className="note" role="status">{status}</span>}
    </div>
  );

  return (
    <div className="stack-lg">
      {head}
      <Workspace ds={ds} config={config} onConfigChange={setConfig} aside={viewsBar} />
    </div>
  );
}

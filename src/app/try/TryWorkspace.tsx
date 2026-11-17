"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { defaultConfig, type DashConfig } from "@/components/Dashboard";
import { FilePicker } from "@/components/FilePicker";
import { Workspace } from "@/components/Workspace";
import { buildDataset, type Dataset } from "@/lib/analyze";
import { exampleDataset } from "@/lib/example";
import { parseFile, parseText } from "@/lib/parse-file";

/** Everything happens in the browser here: nothing is uploaded or saved. */
export function TryWorkspace() {
  const [ds, setDs] = useState<Dataset>(() => exampleDataset());
  const [config, setConfig] = useState<DashConfig>(() => defaultConfig(ds));
  const [isExample, setIsExample] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const adopt = useCallback((next: Dataset) => {
    setDs(next);
    setConfig(defaultConfig(next));
    setIsExample(false);
    setError("");
  }, []);

  const onFile = useCallback(async (f: File) => {
    setBusy(true);
    try {
      const t = await parseFile(f, f.name);
      adopt(buildDataset(f.name + (t.detail ? ` (${t.detail})` : ""), t.headers, t.rows));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [adopt]);

  return (
    <div className="stack-lg">
      <div className="pagehead row">
        <div className="stack-sm">
          <h1>Try Sift</h1>
          <p className="muted">Open a file to analyze it here. Nothing is uploaded. <Link href="/signup">Create an account</Link> to save files and dashboards.</p>
        </div>
        <FilePicker busy={busy} onFile={onFile} onText={(text) => {
          try { const t = parseText(text); adopt(buildDataset("Pasted data", t.headers, t.rows)); }
          catch (e) { setError((e as Error).message); }
        }} />
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <Workspace ds={ds} config={config} onConfigChange={setConfig} badge={isExample ? "Example data" : undefined} />
    </div>
  );
}

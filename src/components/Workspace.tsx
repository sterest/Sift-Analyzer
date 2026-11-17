"use client";

import { useState, type ReactNode } from "react";
import type { Dataset } from "@/lib/analyze";
import { fmt } from "@/lib/format";
import { Analysis } from "./Analysis";
import { Dashboard, type DashConfig } from "./Dashboard";

type View = "dashboard" | "analysis";

export function Workspace({ ds, config, onConfigChange, badge, aside }: {
  ds: Dataset;
  config: DashConfig;
  onConfigChange: (c: DashConfig) => void;
  /** Small label beside the name, e.g. "Example data". */
  badge?: string;
  /** Extra controls under the tabs, e.g. saved views. Shown on the dashboard tab only. */
  aside?: ReactNode;
}) {
  const [view, setView] = useState<View>("dashboard");
  const miss = ds.cols.reduce((a, c) => a + c.missing, 0);
  return (
    <div className="stack-lg">
      <div className="dataset">
        <span className="name">{ds.name}</span>
        {badge && <span className="chip chip-warn">{badge}</span>}
        <div className="facts">
          <span><b>{fmt(ds.rows.length)}</b> rows</span>
          <span><b>{ds.cols.length}</b> columns</span>
          <span><b>{ds.cols.filter((c) => c.type === "number").length}</b> numeric</span>
          <span><b>{fmt(miss)}</b> empty cells</span>
          <span><b>{fmt(ds.dupes)}</b> duplicate rows</span>
        </div>
      </div>
      <nav className="tabs" aria-label="Views">
        {(["dashboard", "analysis"] as View[]).map((v) => (
          <button key={v} type="button" aria-current={view === v ? "page" : undefined} onClick={() => setView(v)}>
            {v === "dashboard" ? "Dashboard" : "Analysis"}
          </button>
        ))}
      </nav>
      {view === "dashboard" ? (
        <div className="stack">
          {aside}
          <Dashboard ds={ds} config={config} onChange={onConfigChange} />
        </div>
      ) : (
        <Analysis ds={ds} />
      )}
    </div>
  );
}

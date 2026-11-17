"use client";

import { useActionState, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { saveBlob } from "@/lib/download";
import { deleteAccount } from "../actions";

export function AccountTools() {
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState("");
  const [state, formAction, deleting] = useActionState(deleteAccount, undefined);

  async function exportSummary() {
    setExporting(true);
    setExportMsg("");
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      const [ds, views] = await Promise.all([
        supabase.from("datasets").select("id, name, file_type, row_count, column_count, created_at").order("created_at"),
        supabase.from("dashboards").select("id, dataset_id, name, config, created_at, updated_at").order("created_at"),
      ]);
      if (ds.error || views.error) throw new Error((ds.error ?? views.error)!.message);
      const summary = {
        exported_at: new Date().toISOString(),
        account: { email: auth.user?.email, created_at: auth.user?.created_at, last_sign_in_at: auth.user?.last_sign_in_at },
        datasets: ds.data,
        saved_views: views.data,
        note: "Your original files are not included here. Download each one from its dataset page.",
      };
      saveBlob(new Blob([JSON.stringify(summary, null, 2)], { type: "application/json" }), `sift-account-${new Date().toISOString().slice(0, 10)}.json`);
      setExportMsg("Downloaded.");
    } catch (e) {
      setExportMsg("The summary could not be downloaded: " + (e as Error).message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <section className="panel stack" aria-labelledby="h-data">
        <h2 id="h-data">Download your data</h2>
        <p className="muted">
          Get a file listing your account details, datasets and saved views. To download an uploaded file itself, open the dataset and use
          Download original file.
        </p>
        <div className="actions">
          <button className="btn" type="button" onClick={exportSummary} disabled={exporting}>{exporting ? "Preparing…" : "Download account summary (JSON)"}</button>
          {exportMsg && <span className="note" role="status">{exportMsg}</span>}
        </div>
      </section>

      <section className="panel stack danger-zone" aria-labelledby="h-delete">
        <h2 id="h-delete">Delete your account</h2>
        <p>
          This permanently deletes your account, every file you uploaded and every saved view, straight away. It can&apos;t be undone.
          Download anything you want to keep first.
        </p>
        <form action={formAction} className="confirm-row">
          <label htmlFor="confirm-delete" className="note">Type DELETE to confirm</label>
          <input id="confirm-delete" name="confirm" autoComplete="off" spellCheck={false} />
          <button className="btn btn-danger" type="submit" disabled={deleting}>{deleting ? "Deleting…" : "Delete my account"}</button>
        </form>
        {state?.error && <p className="error" role="alert">{state.error}</p>}
      </section>
    </>
  );
}

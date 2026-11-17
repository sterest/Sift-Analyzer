"use client";

import { useEffect, useState } from "react";
import { ACCEPT } from "@/lib/parse-file";

/** "Open a file" and "Paste data" controls, plus drop-anywhere. Calls back with a File or pasted text. */
export function FilePicker({ onFile, onText, busy, label = "Open a file" }: {
  onFile: (f: File) => void;
  onText?: (text: string) => void;
  busy?: boolean;
  label?: string;
}) {
  const [pasting, setPasting] = useState(false);
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    let depth = 0;
    const enter = (e: DragEvent) => { e.preventDefault(); depth++; setDragging(true); };
    const leave = () => { depth = Math.max(0, depth - 1); if (!depth) setDragging(false); };
    const over = (e: DragEvent) => e.preventDefault();
    const drop = (e: DragEvent) => {
      e.preventDefault(); depth = 0; setDragging(false);
      const f = e.dataTransfer?.files[0];
      if (f) onFile(f);
    };
    document.addEventListener("dragenter", enter);
    document.addEventListener("dragleave", leave);
    document.addEventListener("dragover", over);
    document.addEventListener("drop", drop);
    return () => {
      document.removeEventListener("dragenter", enter);
      document.removeEventListener("dragleave", leave);
      document.removeEventListener("dragover", over);
      document.removeEventListener("drop", drop);
    };
  }, [onFile]);

  return (
    <div className="stack">
      <div className="actions">
        <label className={"btn btn-primary" + (busy ? " is-busy" : "")} htmlFor="file-input">{busy ? "Reading…" : label}</label>
        <input id="file-input" className="visually-hidden" type="file" accept={ACCEPT} disabled={busy}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
        {onText && (
          <button className="btn" type="button" aria-expanded={pasting} onClick={() => setPasting((p) => !p)}>Paste data</button>
        )}
      </div>
      {pasting && onText && (
        <div className="stack">
          <textarea id="paste-area" className="paste" value={text} onChange={(e) => setText(e.target.value)} aria-label="Pasted data"
            placeholder="Paste CSV, tab-separated cells copied from a spreadsheet, or a JSON array of objects. The first row is read as column names." />
          <div className="actions">
            <button className="btn btn-primary" type="button" onClick={() => { onText(text); setPasting(false); }}>Analyze pasted data</button>
          </div>
        </div>
      )}
      {dragging && <div className="dropzone" aria-hidden="true">Drop the file to open it</div>}
    </div>
  );
}

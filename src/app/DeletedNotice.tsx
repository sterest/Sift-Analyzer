"use client";

import { useSearchParams } from "next/navigation";

/** Confirms a completed account deletion on the home page (?account=deleted). */
export function DeletedNotice() {
  const params = useSearchParams();
  if (params.get("account") !== "deleted") return null;
  return (
    <div className="wrap" style={{ paddingTop: 16 }}>
      <p className="notice" role="status">Your account, files and saved views have been deleted.</p>
    </div>
  );
}

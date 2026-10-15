"use client";

import { useState, useTransition } from "react";
import { setAdminDone } from "./actions";

/** "admin ดำเนินการ": yes = the team has made the bank transfer · no (default) = still to do — the row stays red. */
export function AdminDoneSelect({ refId, done }: { refId: string; done: boolean }) {
  const [value, setValue] = useState(done ? "yes" : "no");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <select
        aria-label={`admin ดำเนินการ ${refId}`}
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          const before = value;
          setValue(next);
          setError(null);
          start(async () => {
            const r = await setAdminDone(refId, next === "yes");
            if (!r.ok) { setValue(before); setError(r.error ?? "บันทึกไม่สำเร็จ"); }
          });
        }}
        className={`rounded-lg border px-2.5 py-1.5 text-[12.5px] font-semibold [color-scheme:dark] ${value === "yes" ? "border-success/40 bg-success/10 text-success" : "border-danger/50 bg-danger/15 text-danger"}`}
      >
        <option value="no">no</option>
        <option value="yes">yes</option>
      </select>
      {error && <div className="mt-1 text-[11px] text-danger">{error}</div>}
    </div>
  );
}

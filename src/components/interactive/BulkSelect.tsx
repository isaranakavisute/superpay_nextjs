"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { Modal, btn, field, fieldLabel } from "@/components/interactive/Modal";
import { fmtMoney } from "@/lib/format";
import type { ActionResult } from "@/lib/api";

type Ctx = { selected: Set<string>; toggle: (ref: string) => void; setAll: (refs: string[], on: boolean) => void };
const SelectionContext = createContext<Ctx | null>(null);

export type BulkAction = (action: "approve" | "reject", refs: string[], reason?: string, accountId?: number) => Promise<ActionResult>;

type BarOptions = {
  bulk: BulkAction;
  /** "always": bar is always shown (payments). "selected": appears once something is ticked (outflows). */
  show?: "always" | "selected";
  /** When set, bulk approve first asks which account to deduct from. */
  accounts?: { id: number; label: string }[];
};

/** Selection state for one bucket; the bar and the checkboxes share it. */
export function BulkSelect({ items, children, ...bar }: { items: { ref: string; amount: string }[]; children: React.ReactNode } & BarOptions) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Rows that left the bucket (approved elsewhere, auto-refresh) drop out of the selection.
  const live = new Set(items.map((i) => i.ref));
  const current = new Set([...selected].filter((r) => live.has(r)));

  const ctx: Ctx = {
    selected: current,
    toggle: (ref) =>
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(ref)) next.delete(ref);
        else next.add(ref);
        return next;
      }),
    setAll: (refs, on) => setSelected(on ? new Set(refs) : new Set()),
  };
  return (
    <SelectionContext.Provider value={ctx}>
      <BulkBar items={items} {...bar} />
      {children}
    </SelectionContext.Provider>
  );
}

function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("BulkSelect missing");
  return ctx;
}

export function RowCheckbox({ refId }: { refId: string }) {
  const { selected, toggle } = useSelection();
  return <input type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={selected.has(refId)} onChange={() => toggle(refId)} aria-label={`เลือก ${refId}`} />;
}

export function AllCheckbox({ refs }: { refs: string[] }) {
  const { selected, setAll } = useSelection();
  const all = refs.length > 0 && refs.every((r) => selected.has(r));
  return <input type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={all} onChange={(e) => setAll(refs, e.target.checked)} aria-label="เลือกทั้งหมด" />;
}

/** "เลือกไว้ N รายการ · รวม ฿X" + ยกเลิกที่เลือก / ✕ ปฏิเสธที่เลือก / ✓ อนุมัติที่เลือก */
function BulkBar({ items, bulk, show = "always", accounts }: { items: { ref: string; amount: string }[] } & BarOptions) {
  const { selected, setAll } = useSelection();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [approving, setApproving] = useState(false);
  const [reason, setReason] = useState("");
  const [accountId, setAccountId] = useState(accounts?.[0] ? String(accounts[0].id) : "");
  const refs = [...selected];
  const total = items.filter((i) => selected.has(i.ref)).reduce((n, i) => n + Number(i.amount), 0);

  const run = (action: "approve" | "reject") =>
    start(async () => {
      setError(null);
      const r = await bulk(action, refs, reason, accountId ? Number(accountId) : undefined);
      if (r.ok) {
        setAll([], false);
        setRejecting(false);
        setApproving(false);
        setReason("");
      } else setError(r.error);
    });

  if (show === "selected" && refs.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2.5 border-t border-line bg-surface-alt px-[18px] py-2">
      <span className="text-[13px] font-semibold">เลือกไว้ {refs.length} รายการ</span>
      <span className="text-[12.5px] text-muted">รวม {fmtMoney(total)}</span>
      {error && <span className="text-[12.5px] text-danger">{error}</span>}
      <span className="flex-auto" />
      <div className="flex gap-2">
        <button className={`${btn.base} ${btn.sm} ${btn.ghost}`} disabled={!refs.length || pending} onClick={() => setAll([], false)}>ยกเลิกที่เลือก</button>
        <button className={`${btn.base} ${btn.sm} border-[#fecaca]/40 bg-transparent text-danger hover:bg-danger/10`} disabled={!refs.length || pending} onClick={() => setRejecting(true)}>
          <X size={13} /> ปฏิเสธที่เลือก
        </button>
        <button className={`${btn.base} ${btn.sm} ${btn.success}`} disabled={!refs.length || pending} onClick={() => (accounts ? setApproving(true) : run("approve"))}>
          <Check size={13} /> อนุมัติที่เลือก
        </button>
      </div>
      {approving && accounts && (
        <Modal
          title={`อนุมัติ ${refs.length} รายการ`}
          onClose={() => setApproving(false)}
          footer={
            <>
              <button className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={() => setApproving(false)}>ยกเลิก</button>
              <button className={`${btn.base} ${btn.md} ${btn.success}`} disabled={pending || !accountId} onClick={() => run("approve")}>อนุมัติทั้งหมด</button>
            </>
          }
        >
          <label className={fieldLabel} htmlFor="bulk-account">บัญชีที่หัก (ใช้กับรายการที่ยังไม่ได้ระบุบัญชี)</label>
          <select id="bulk-account" className={field} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
          {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
        </Modal>
      )}
      {rejecting && (
        <Modal
          title={`ปฏิเสธ ${refs.length} รายการ`}
          onClose={() => setRejecting(false)}
          footer={
            <>
              <button className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={() => setRejecting(false)}>ยกเลิก</button>
              <button className={`${btn.base} ${btn.md} ${btn.danger}`} disabled={pending || !reason.trim()} onClick={() => run("reject")}>ปฏิเสธทั้งหมด</button>
            </>
          }
        >
          <label className={fieldLabel} htmlFor="bulk-reason">เหตุผล (ใช้กับทุกรายการที่เลือก)</label>
          <input id="bulk-reason" className={field} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
          {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}
        </Modal>
      )}
    </div>
  );
}

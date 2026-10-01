"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Search } from "lucide-react";
import { btn } from "@/components/interactive/Modal";
import { saveRoles } from "./actions";

export type Role = { code: string; name: string; description: string; permissions: string[]; memberCount: number };
export type Group = { name: string; perms: string[] };

// Human labels for permission keys.
const LABEL: Record<string, string> = {
  "payment.view": "ดูรายการชำระเงิน", "payment.create": "สร้างรายการชำระเงิน", "payment.approve": "อนุมัติ / ปฏิเสธรายการชำระ",
  "payment.refund": "คืนเงิน", "payment.double_credit": "ตรวจเติมเงินซ้ำ", "outflow.view": "ดูรายการเงินออก", "outflow.approve": "อนุมัติเงินออก",
  "withdrawal.view": "ดูคำขอถอน", "withdrawal.approve": "อนุมัติคำขอถอน", "p2p.manage": "จัดการคู่ P2P", "merchant.view": "ดูร้านค้า",
  "merchant.manage": "เพิ่ม / แก้ไขร้านค้า", "merchant.credit": "ปรับเครดิตร้านค้า", "webhook.view": "ดู Webhook", "webhook.retry": "ยิง Webhook ซ้ำ",
  "account.view": "ดูบัญชีธนาคาร", "account.edit": "แก้ไขบัญชีธนาคาร", "channel.view": "ดูช่องทางตรวจสอบ", "channel.edit": "แก้ไขช่องทางตรวจสอบ",
  "event.match": "จับคู่ / ปฏิเสธ event", "device.manage": "จัดการอุปกรณ์ Forwarder", "user.view": "ดูผู้ใช้", "user.manage": "จัดการผู้ใช้",
  "role.manage": "แก้ไขสิทธิ์การเข้าถึง", "audit.view": "ดูบันทึกการตรวจสอบ", "settings.manage": "ตั้งค่าระบบ", "alerts.manage": "ตั้งค่าแจ้งเตือน",
};
const AVATAR: Record<string, string> = {
  super_admin: "from-[#7c3aed] to-[#4f46e5]", admin: "from-[#4f46e5] to-[#3b82f6]", finance: "from-[#0891b2] to-[#06b6d4]",
  support: "from-[#059669] to-[#10b981]", viewer: "from-[#64748b] to-[#94a3b8]",
};
const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onChange} className={`relative h-[22px] w-[38px] rounded-full transition ${on ? "bg-primary" : "bg-[#cbd5e1]"}`}>
      <span className={`absolute top-[3px] size-4 rounded-full bg-white shadow transition-all ${on ? "left-[19px]" : "left-[3px]"}`} />
    </button>
  );
}

export function RoleMatrix({ roles, groups }: { roles: Role[]; groups: Group[] }) {
  const initial = useMemo(() => Object.fromEntries(roles.map((r) => [r.code, new Set(r.permissions)])), [roles]);
  const [state, setState] = useState<Record<string, Set<string>>>(initial);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const total = groups.reduce((n, g) => n + g.perms.length, 0);
  const locked = (code: string) => state[code]?.has("*");
  const dirty = roles.filter((r) => !locked(r.code) && [...state[r.code]].sort().join() !== [...initial[r.code]].sort().join());
  const needle = q.trim().toLowerCase();
  const visible = groups.map((g) => ({ ...g, perms: g.perms.filter((p) => !needle || p.includes(needle) || (LABEL[p] ?? "").toLowerCase().includes(needle)) })).filter((g) => g.perms.length);
  const visibleKeys = visible.flatMap((g) => g.perms);

  const set = (code: string, keys: string[], on: boolean) =>
    setState((s) => {
      const next = new Set(s[code]);
      for (const k of keys) {
        if (on) next.add(k);
        else next.delete(k);
      }
      return { ...s, [code]: next };
    });

  const save = () =>
    start(async () => {
      setMsg(null);
      const r = await saveRoles(Object.fromEntries(dirty.map((d) => [d.code, [...state[d.code]]])));
      setMsg(r.ok ? { ok: true, text: "บันทึกสิทธิ์เรียบร้อย — มีผลทันที" } : { ok: false, text: r.error });
    });

  return (
    <>
      <div className="mb-[18px] grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3.5">
        {roles.map((r) => {
          const n = locked(r.code) ? total : state[r.code].size;
          const isDirty = dirty.some((d) => d.code === r.code);
          return (
            <div key={r.code} className={`rounded-xl border bg-surface p-4 ${locked(r.code) ? "bg-linear-to-br from-primary-50 to-surface" : ""} ${isDirty ? "border-warning" : "border-line"}`}>
              <div className="flex items-center gap-2.5">
                <div className={`grid size-[34px] place-items-center rounded-[10px] bg-linear-to-br text-[12px] font-bold text-white ${AVATAR[r.code] ?? AVATAR.viewer}`}>{initials(r.name)}</div>
                <div className="text-[15px] font-bold">{r.name}{locked(r.code) && " 🔒"}</div>
              </div>
              <div className="mt-1.5 text-xs text-muted">{r.description}</div>
              <div className="mt-2 text-xs text-muted"><span className="text-[22px] font-extrabold text-ink">{n}</span> / {total} สิทธิ์ · {r.memberCount} คน</div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-alt"><div className="h-full bg-linear-to-r from-primary to-accent" style={{ width: `${(n / total) * 100}%` }} /></div>
            </div>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex flex-wrap items-center gap-4 border-b border-line px-[22px] py-4">
          <label className="relative w-full max-w-[280px]">
            <Search size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-soft" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาสิทธิ์ / รหัส..." className="w-full rounded-lg border border-line bg-surface py-2 pr-3 pl-9 text-[13px] outline-none focus:border-primary" />
          </label>
          <span className="flex items-center gap-3 text-[12px] text-muted">
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-5 rounded-full bg-primary" /> เปิด</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-5 rounded-full bg-[#cbd5e1]" /> ปิด</span>
          </span>
        </div>
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full min-w-[640px] border-collapse text-[13px]">
            <thead className="sticky top-0 z-[2]">
              <tr>
                <th className="sticky left-0 z-[3] min-w-[230px] border-b border-line bg-surface-alt px-4 py-3 text-left text-xs font-semibold text-muted uppercase">สิทธิ์</th>
                {roles.map((r) => (
                  <th key={r.code} className={`w-[120px] border-b border-line px-2 py-3 text-center text-xs font-semibold ${locked(r.code) ? "bg-primary-50" : "bg-surface-alt"}`}>
                    <div className="text-ink">{r.name}</div>
                    {locked(r.code) ? (
                      <div className="mt-1 text-[10.5px] text-primary">เต็มเสมอ</div>
                    ) : (
                      <div className="mt-1 flex justify-center gap-1">
                        <button className="rounded-full border border-line px-2 text-[10.5px] text-muted hover:text-ink" onClick={() => set(r.code, visibleKeys, true)}>ทั้งหมด</button>
                        <button className="rounded-full border border-line px-2 text-[10.5px] text-muted hover:text-ink" onClick={() => set(r.code, visibleKeys, false)}>ล้าง</button>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && <tr><td colSpan={roles.length + 1} className="px-5 py-10 text-center text-muted">ไม่พบสิทธิ์ที่ตรงกับ &ldquo;{q}&rdquo;</td></tr>}
              {visible.map((g) => (
                <FragmentGroup key={g.name} group={g} roles={roles} state={state} locked={locked} set={set} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {(dirty.length > 0 || msg) && (
        <div className="sticky bottom-4 z-10 mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-5 py-3 shadow-lift">
          {dirty.length > 0 ? (
            <span className="flex items-center gap-2 text-[13px]"><span className="size-2 rounded-full bg-warning" /> แก้ไขที่ยังไม่บันทึก: <strong>{dirty.map((d) => d.name).join(", ")}</strong></span>
          ) : (
            <span className={`text-[13px] ${msg?.ok ? "text-success" : "text-danger"}`}>{msg?.text}</span>
          )}
          {dirty.length > 0 && (
            <span className="ml-auto flex gap-2">
              {msg && !msg.ok && <span className="self-center text-[12.5px] text-danger">{msg.text}</span>}
              <button className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={() => { setState(initial); setMsg(null); }}>ยกเลิก</button>
              <button className={`${btn.base} ${btn.md} ${btn.primary}`} disabled={pending} onClick={save}>บันทึกสิทธิ์</button>
            </span>
          )}
        </div>
      )}
    </>
  );
}

function FragmentGroup({ group, roles, state, locked, set }: { group: Group; roles: Role[]; state: Record<string, Set<string>>; locked: (c: string) => boolean | undefined; set: (c: string, k: string[], on: boolean) => void }) {
  return (
    <>
      <tr>
        <td colSpan={roles.length + 1} className="border-b border-line border-l-[3px] border-l-accent bg-surface-alt px-4 py-2 text-[11.5px] font-semibold tracking-wide text-muted uppercase">
          {group.name} <span className="ml-1 rounded-full bg-surface px-2 text-[10.5px]">{group.perms.length}</span>
        </td>
      </tr>
      {group.perms.map((p) => (
        <tr key={p} className="hover:bg-surface-alt">
          <td className="sticky left-0 border-b border-line bg-surface px-4 py-2.5">
            <div className="font-medium">{LABEL[p] ?? p}</div>
            <code className="text-[10.5px] text-muted">{p}</code>
          </td>
          {roles.map((r) => (
            <td key={r.code} className={`border-b border-line text-center ${locked(r.code) ? "bg-primary-50" : ""}`}>
              {locked(r.code) ? <Check size={16} className="inline text-primary" /> : <Toggle on={state[r.code].has(p)} onChange={() => set(r.code, [p], !state[r.code].has(p))} />}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

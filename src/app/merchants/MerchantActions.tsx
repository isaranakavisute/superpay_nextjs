"use client";

import { useEffect, useState, useTransition } from "react";
import { DollarSign, KeyRound, Link2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Modal, btn, field, fieldLabel } from "@/components/interactive/Modal";
import type { ActionResult } from "@/lib/api";
import { DeleteDialog } from "@/components/interactive/DeleteDialog";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import {
  addPortalUser,
  adjustCredit,
  createApiKey,
  createMerchant,
  deleteMerchant,
  getApiKeys,
  getCredits,
  getPortalUsers,
  getWebhook,
  revokeApiKey,
  rotateWebhookSecret,
  setWebhookUrl,
  togglePortalUser,
  updateMerchant,
  type MerchantInput,
} from "./actions";

export type MerchantForActions = {
  id: number;
  name: string;
  slug: string;
  feePercent: string;
  feeFlat: string;
  outFeePercent: string;
  outFeeFlat: string;
  minBalance: string;
  status: "active" | "suspended" | "pending";
  kycStatus: "pending" | "verified" | "rejected";
  contactEmail: string | null;
  contactPhone: string | null;
  parentId: number | null;
  allowSubMerchants: boolean;
};
/** Shops that can be chosen as ร้านแม่ (tree order, depth for indentation). */
export type ParentOption = { id: number; name: string; depth: number; path: number[] };

type Dialog = null | "keys" | "webhook" | "portal" | "credit" | "edit" | "delete";
type Row = Record<string, string | number | boolean | null>;

const cancelBtn = (close: () => void) => <button className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={close}>ยกเลิก</button>;
const th = "border-b border-line bg-surface-alt px-3 py-2 text-left text-[11.5px] font-semibold text-muted uppercase";
const td = "border-b border-line px-3 py-2 text-[12.5px]";

/** Shown once, with copy; for new API keys and webhook secrets. */
function OneTimeSecret({ title, value }: { title: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mb-4 rounded-lg border-l-4 border-[#d97706] bg-[#fef3c7] p-3 text-[#92400e]">
      <div className="mb-1 text-[13px] font-semibold">{title} — คัดลอกเก็บไว้ตอนนี้ ระบบจะไม่แสดงอีก</div>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded bg-white/70 px-2 py-1 text-[12px] break-all">{value}</code>
        <button
          className={`${btn.base} ${btn.sm} border-[#d97706] bg-white text-[#92400e]`}
          onClick={() => {
            navigator.clipboard?.writeText(value);
            setCopied(true);
          }}
        >
          {copied ? "คัดลอกแล้ว" : "คัดลอก"}
        </button>
      </div>
    </div>
  );
}

/** Create / edit form shared by "+ เพิ่ม Merchant" and the row's แก้ไข. */
export function MerchantForm({ initial, onDone, parents = [] }: { initial?: MerchantForActions; onDone: () => void; parents?: ParentOption[] }) {
  const [f, setF] = useState({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    feePercent: initial?.feePercent ? String(Number(initial.feePercent)) : "1.5",
    feeFlat: initial?.feeFlat ? String(Number(initial.feeFlat)) : "0",
    outFeePercent: initial?.outFeePercent ? String(Number(initial.outFeePercent)) : "0",
    outFeeFlat: initial?.outFeeFlat ? String(Number(initial.outFeeFlat)) : "0",
    minBalance: initial?.minBalance ? String(Number(initial.minBalance)) : "0",
    openingBalance: "0",
    status: initial?.status ?? "active",
    kycStatus: initial?.kycStatus ?? "pending",
    contactEmail: initial?.contactEmail ?? "",
    contactPhone: initial?.contactPhone ?? "",
    parentId: initial?.parentId != null ? String(initial.parentId) : "",
    allowSubMerchants: initial?.allowSubMerchants ?? true,
  });
  // A shop can't move under itself or under its own sub-merchants.
  const choosable = parents.filter((p) => !initial || (p.id !== initial.id && !p.path.includes(initial.id)));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const submit = () =>
    start(async () => {
      setError(null);
      const input: MerchantInput = {
        name: f.name,
        slug: f.slug,
        feePercent: Number(f.feePercent),
        feeFlat: Number(f.feeFlat),
        outFeePercent: Number(f.outFeePercent),
        outFeeFlat: Number(f.outFeeFlat),
        minBalance: Number(f.minBalance),
        openingBalance: Number(f.openingBalance),
        status: f.status as MerchantInput["status"],
        kycStatus: f.kycStatus as MerchantInput["kycStatus"],
        contactEmail: f.contactEmail,
        contactPhone: f.contactPhone,
        parentId: f.parentId ? Number(f.parentId) : null,
        allowSubMerchants: f.allowSubMerchants,
      };
      const r = initial ? await updateMerchant(initial.id, input) : await createMerchant(input);
      if (r.ok) onDone();
      else setError(r.error);
    });

  return (
    <Modal
      title={initial ? `แก้ไข — ${initial.name}` : "เพิ่ม Merchant ใหม่"}
      onClose={onDone}
      width={620}
      footer={<>{cancelBtn(onDone)}<button className={`${btn.base} ${btn.md} ${btn.primary}`} disabled={pending || !f.name.trim() || (!initial && !f.slug.trim())} onClick={submit}>บันทึก</button></>}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className={fieldLabel} htmlFor="mf-name">ชื่อร้าน *</label><input id="mf-name" className={field} value={f.name} onChange={set("name")} autoFocus /></div>
        <div>
          <label className={fieldLabel} htmlFor="mf-slug">Slug {initial ? "" : "*"}</label>
          <input id="mf-slug" className={field} value={f.slug} onChange={set("slug")} disabled={!!initial} placeholder="เช่น my-shop" />
        </div>
        <div><label className={fieldLabel} htmlFor="mf-fp">ค่าธรรมเนียมเงินเข้า (%)</label><input id="mf-fp" className={field} type="number" min="0" step="0.01" value={f.feePercent} onChange={set("feePercent")} /></div>
        <div><label className={fieldLabel} htmlFor="mf-ff">ค่าธรรมเนียมเงินเข้าคงที่ (บาท/รายการ)</label><input id="mf-ff" className={field} type="number" min="0" step="0.01" value={f.feeFlat} onChange={set("feeFlat")} /></div>
        <div><label className={fieldLabel} htmlFor="mf-ofp">ค่าธรรมเนียมเงินออก (%)</label><input id="mf-ofp" className={field} type="number" min="0" step="0.01" value={f.outFeePercent} onChange={set("outFeePercent")} /></div>
        <div><label className={fieldLabel} htmlFor="mf-off">ค่าธรรมเนียมเงินออกคงที่ (บาท/รายการ)</label><input id="mf-off" className={field} type="number" min="0" step="0.01" value={f.outFeeFlat} onChange={set("outFeeFlat")} /></div>
        <p className="-mt-2 text-[11.5px] text-muted sm:col-span-2">เงินเข้า: หักจากยอดที่ลูกค้าโอน · เงินออก (ถอน / payout ที่ร้านสั่ง): บวกเพิ่มจากยอดโอน — ผู้รับได้เต็มยอด ร้านถูกหัก ยอด + ค่าธรรมเนียม</p>
        <div><label className={fieldLabel} htmlFor="mf-mb">ยอดคงเหลือขั้นต่ำ (บาท)</label><input id="mf-mb" className={field} type="number" min="0" step="0.01" value={f.minBalance} onChange={set("minBalance")} /></div>
        {!initial && <div><label className={fieldLabel} htmlFor="mf-ob">ยอดเริ่มต้น (บาท)</label><input id="mf-ob" className={field} type="number" min="0" step="0.01" value={f.openingBalance} onChange={set("openingBalance")} /></div>}
        <div>
          <label className={fieldLabel} htmlFor="mf-st">สถานะ</label>
          <select id="mf-st" className={field} value={f.status} onChange={set("status")}>
            <option value="active">{initial?.status === "pending" ? "ใช้งาน (อนุมัติร้านนี้)" : "ใช้งาน"}</option><option value="suspended">ระงับ</option><option value="pending">รออนุมัติ</option>
          </select>
        </div>
        <div>
          <label className={fieldLabel} htmlFor="mf-parent">ร้านแม่</label>
          <select id="mf-parent" className={field} value={f.parentId} onChange={set("parentId")}>
            <option value="">— ไม่มี (ร้านระดับบนสุด)</option>
            {choosable.map((p) => <option key={p.id} value={p.id}>{`${"\u00a0\u00a0".repeat(p.depth)}${p.depth ? "└ " : ""}${p.name}`}</option>)}
          </select>
          <div className="mt-1 text-[11px] text-muted">อัตราค่าธรรมเนียมต้องไม่ต่ำกว่าของร้านแม่ · ย้ายร้านพร้อมร้านย่อยทั้งหมดใต้ร้านนี้</div>
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-[13px]"><input type="checkbox" checked={f.allowSubMerchants} onChange={(e) => setF({ ...f, allowSubMerchants: e.target.checked })} /> อนุญาตให้สร้างร้านย่อย</label>
        <div>
          <label className={fieldLabel} htmlFor="mf-kyc">KYC</label>
          <select id="mf-kyc" className={field} value={f.kycStatus} onChange={set("kycStatus")}><option value="pending">รอ</option><option value="verified">ผ่าน</option><option value="rejected">ไม่ผ่าน</option></select>
        </div>
        <div><label className={fieldLabel} htmlFor="mf-em">Contact Email</label><input id="mf-em" className={field} type="email" value={f.contactEmail} onChange={set("contactEmail")} /></div>
        <div><label className={fieldLabel} htmlFor="mf-ph">Contact Phone</label><input id="mf-ph" className={field} value={f.contactPhone} onChange={set("contactPhone")} /></div>
      </div>
      {error && <p className="mt-4 text-[13px] text-danger">{error}</p>}
    </Modal>
  );
}

export function NewMerchantButton({ parents = [] }: { parents?: ParentOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={`${btn.base} ${btn.md} ${btn.primary}`} onClick={() => setOpen(true)}><Plus size={16} /> เพิ่ม Merchant</button>
      {open && <MerchantForm onDone={() => setOpen(false)} parents={parents} />}
    </>
  );
}

/** Loads a dialog's data through a server action when it opens. */
function useLoad(load: () => Promise<ActionResult>, deps: unknown[]) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    load().then((r) => {
      if (!live) return;
      if (r.ok) setData(r);
      else setError(r.error);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on explicit refresh only
  }, [tick, ...deps]);
  return { data, error, reload: () => setTick((t) => t + 1) };
}

function KeysDialog({ m, onClose }: { m: MerchantForActions; onClose: () => void }) {
  const { data, error, reload } = useLoad(() => getApiKeys(m.id), [m.id]);
  const [label, setLabel] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [freshSecret, setFreshSecret] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const items = (data?.items as Row[]) ?? [];
  const act = (fn: () => Promise<ActionResult>, after?: (r: Extract<ActionResult, { ok: true }>) => void) =>
    start(async () => {
      setErr(null);
      const r = await fn();
      if (r.ok) {
        after?.(r);
        reload();
      } else setErr(r.error);
    });

  return (
    <Modal title={`API Keys — ${m.name}`} onClose={onClose} width={900}>
      {fresh && <OneTimeSecret title="✓ API Key ออกแล้ว (X-API-Key)" value={fresh} />}
      {freshSecret && <OneTimeSecret title="✓ Signing secret ของ key นี้ — ใช้เซ็นทุกคำขอ (X-Signature) ห้ามส่งไปกับคำขอ" value={freshSecret} />}
      <div className="mb-4 flex gap-2">
        <input className={field} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ชื่อ key เช่น Production" />
        <button className={`${btn.base} ${btn.md} ${btn.primary}`} disabled={pending || !label.trim()} onClick={() => act(() => createApiKey(m.id, label), (r) => { setFresh(String(r.key)); setFreshSecret(r.signingSecret ? String(r.signingSecret) : null); setLabel(""); })}>
          <Plus size={15} /> ออก key ใหม่
        </button>
      </div>
      {(error || err) && <p className="mb-3 text-[13px] text-danger">{error || err}</p>}
      <table className="w-full border-collapse">
        <thead><tr>{["ชื่อ", "Prefix", "สถานะ", "ใช้ล่าสุด", "สร้างเมื่อ", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody>
          {items.map((k) => (
            <tr key={String(k.id)}>
              <td className={td}>{k.label}</td>
              <td className={td}><code>{k.keyPrefix}</code></td>
              <td className={td}>{k.status === "active" ? <span className="text-success">ใช้งาน</span> : <span className="text-muted">เพิกถอนแล้ว</span>}</td>
              <td className={`${td} text-muted`}>{fmtDateTime(k.lastUsedAt as string | null)}</td>
              <td className={`${td} text-muted`}>{fmtDateTime(k.createdAt as string)}</td>
              <td className={`${td} text-right`}>
                {k.status === "active" && (
                  <button className={`${btn.base} ${btn.sm} border-line text-danger hover:bg-danger/10`} disabled={pending} onClick={() => act(() => revokeApiKey(m.id, Number(k.id)))}>เพิกถอน</button>
                )}
              </td>
            </tr>
          ))}
          {data && items.length === 0 && <tr><td className={`${td} text-center text-muted`} colSpan={6}>ยังไม่มี API key</td></tr>}
        </tbody>
      </table>
    </Modal>
  );
}

function WebhookDialog({ m, onClose }: { m: MerchantForActions; onClose: () => void }) {
  const { data, error, reload } = useLoad(() => getWebhook(m.id), [m.id]);
  const endpoint = data?.endpoint as Row | null | undefined;
  const deliveries = (data?.deliveries as Row[]) ?? [];
  const [url, setUrl] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const value = url ?? (endpoint?.url as string) ?? "";
  const act = (fn: () => Promise<ActionResult>, after?: (r: Extract<ActionResult, { ok: true }>) => void) =>
    start(async () => {
      setErr(null);
      const r = await fn();
      if (r.ok) {
        after?.(r);
        reload();
      } else setErr(r.error);
    });

  return (
    <Modal title={`Webhook — ${m.name}`} onClose={onClose} width={960}>
      {fresh && <OneTimeSecret title="✓ Webhook Secret ใหม่" value={fresh} />}
      <label className={fieldLabel} htmlFor="wh-url">Webhook URL</label>
      <div className="mb-3 flex gap-2">
        <input id="wh-url" className={field} value={value} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-site.com/webhook" />
        <button className={`${btn.base} ${btn.md} ${btn.primary}`} disabled={pending} onClick={() => act(() => setWebhookUrl(m.id, value))}>บันทึก</button>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3 text-[13px]">
        {endpoint?.signing !== "whsec" && (
          <span className="w-full text-[12.5px]">
            ลายเซ็น X-Signature: เซ็นด้วย <strong>secret key ของร้าน</strong>{" "}
            {endpoint?.signingKeyPrefix ? <code>{`${endpoint.signingKeyPrefix as string}…`}</code> : <span className="text-warning">(ร้านไม่มี secret key ที่ใช้งานอยู่ — เซ็นด้วย webhook secret สำรองแทน)</span>} + body ที่ส่ง
          </span>
        )}
        <span className="text-muted">{endpoint?.signing !== "whsec" ? "Webhook secret สำรอง:" : "Webhook Secret (HMAC-SHA256):"}</span>
        <code>{(endpoint?.secretPrefix as string) ?? "—"}</code>
        <button className={`${btn.base} ${btn.sm} border-line text-danger hover:bg-danger/10`} disabled={pending} onClick={() => act(() => rotateWebhookSecret(m.id), (r) => setFresh(String(r.secret)))}>หมุน Secret</button>
        {endpoint?.rotatedAt && <span className="text-[12px] text-muted">หมุนล่าสุด {fmtDateTime(endpoint.rotatedAt as string)}</span>}
      </div>
      {(error || err) && <p className="mb-3 text-[13px] text-danger">{error || err}</p>}
      <div className="mb-2 text-[13px] font-semibold">การส่งล่าสุด</div>
      <table className="w-full border-collapse">
        <thead><tr>{["เวลา", "Event", "ออเดอร์", "ผลลัพธ์", "สาเหตุ"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody>
          {deliveries.map((d) => {
            const ok = Number(d.statusCode) >= 200 && Number(d.statusCode) < 300;
            return (
              <tr key={String(d.id)}>
                <td className={`${td} whitespace-nowrap text-muted`}>{fmtDateTime(d.deliveredAt as string)}</td>
                <td className={td}><code>{d.event}</code></td>
                <td className={td}>{d.paymentRef ?? "—"}</td>
                <td className={`${td} ${ok ? "text-success" : "text-danger"}`}>{ok ? "สำเร็จ" : "ล้มเหลว"} · {d.statusCode ?? "timeout"} · ลอง {d.attempts} ครั้ง</td>
                <td className={`${td} text-muted`}>{d.error ?? "—"}</td>
              </tr>
            );
          })}
          {data && deliveries.length === 0 && <tr><td className={`${td} text-center text-muted`} colSpan={5}>ยังไม่มีการส่ง</td></tr>}
        </tbody>
      </table>
    </Modal>
  );
}

function PortalDialog({ m, onClose }: { m: MerchantForActions; onClose: () => void }) {
  const { data, error, reload } = useLoad(() => getPortalUsers(m.id), [m.id]);
  const items = (data?.items as Row[]) ?? [];
  const empty = { username: "", fullName: "", tier: "staff", email: "", password: "" };
  const [f, setF] = useState(empty);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const act = (fn: () => Promise<ActionResult>, after?: () => void) =>
    start(async () => {
      setErr(null);
      const r = await fn();
      if (r.ok) {
        after?.();
        reload();
      } else setErr(r.error);
    });
  const TIER: Record<string, string> = { owner: "เจ้าของร้าน", staff: "พนักงาน", viewer: "ดูอย่างเดียว" };

  return (
    <Modal title={`Portal Users — ${m.name}`} onClose={onClose} width={900}>
      <div className="mb-1.5 grid gap-2 sm:grid-cols-[1fr_1fr_160px]">
        <input className={field} aria-label="username" placeholder="username" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
        <input className={field} aria-label="ชื่อ-นามสกุล" placeholder="ชื่อ-นามสกุล" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} />
        <select className={field} aria-label="ระดับ" value={f.tier} onChange={(e) => setF({ ...f, tier: e.target.value })}>
          {Object.entries(TIER).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div className="mb-1.5 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input className={field} aria-label="อีเมล" type="email" placeholder="อีเมล (ไม่บังคับ)" autoComplete="off" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input className={field} aria-label="รหัสผ่าน" type="password" placeholder="รหัสผ่าน ≥ 8 ตัว (สำหรับเข้า Merchant Portal)" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <button className={`${btn.base} ${btn.md} ${btn.primary}`} disabled={pending || !f.username.trim() || !f.fullName.trim()} onClick={() => act(() => addPortalUser(m.id, f.username, f.fullName, f.tier, f.email, f.password), () => setF(empty))}>
          <Plus size={15} /> เพิ่ม
        </button>
      </div>
      <p className="mb-4 text-[12px] text-muted">ตั้งรหัสผ่าน เพื่อให้ผู้ใช้นี้เข้า Merchant Portal ด้วย username (หรืออีเมล ถ้าใส่) · อีเมลไม่บังคับ · ผู้ใช้ขอ secret key / API key ของตัวเองได้ใน Portal (ตั้งค่า → Secret key และ API key) · บัญชีผู้ดูแลคอนโซล (เช่น admin) ใช้ login API ไม่ได้</p>
      {(error || err) && <p className="mb-3 text-[13px] text-danger">{error || err}</p>}
      <table className="w-full border-collapse">
        <thead><tr>{["ผู้ใช้", "อีเมล", "เข้า Portal ได้", "ระดับ", "สถานะ", "เข้าใช้ล่าสุด", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody>
          {items.map((u) => (
            <tr key={String(u.id)}>
              <td className={td}><div className="font-medium">{u.fullName}</div><div className="text-[11.5px] text-muted">@{u.username}</div></td>
              <td className={`${td} text-[12.5px]`}>{(u.email as string | null) ?? <span className="text-muted">—</span>}</td>
              <td className={td}>{u.canApiLogin ? <span className="text-success">ได้</span> : <span className="text-muted">ไม่ได้</span>}</td>
              <td className={td}>{TIER[String(u.tier)] ?? u.tier}</td>
              <td className={td}>{u.status === "active" ? <span className="text-success">ใช้งาน</span> : <span className="text-muted">ปิดใช้</span>}</td>
              <td className={`${td} text-muted`}>{fmtDateTime(u.lastLoginAt as string | null)}</td>
              <td className={`${td} text-right`}>
                <button className={`${btn.base} ${btn.sm} ${btn.ghost}`} disabled={pending} onClick={() => act(() => togglePortalUser(m.id, Number(u.id)))}>{u.status === "active" ? "ปิดใช้" : "เปิดใช้"}</button>
              </td>
            </tr>
          ))}
          {data && items.length === 0 && <tr><td className={`${td} text-center text-muted`} colSpan={7}>ยังไม่มีผู้ใช้ portal</td></tr>}
        </tbody>
      </table>
    </Modal>
  );
}

function CreditDialog({ m, onClose }: { m: MerchantForActions; onClose: () => void }) {
  const { data, error, reload } = useLoad(() => getCredits(m.id), [m.id]);
  const items = (data?.items as Row[]) ?? [];
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const submit = (sign: 1 | -1) =>
    start(async () => {
      setErr(null);
      const r = await adjustCredit(m.id, sign * Math.abs(Number(amount)), reason);
      if (r.ok) {
        setAmount("");
        setReason("");
        reload();
      } else setErr(r.error);
    });

  return (
    <Modal title={`ปรับเครดิต — ${m.name}`} onClose={onClose} width={760}>
      <div className="mb-4 text-[13px] text-muted">ยอดคงเหลือตอนนี้ <strong className="text-lg text-ink">{data ? fmtMoney(data.balance as string) : "…"}</strong></div>
      <div className="mb-3 grid gap-2 sm:grid-cols-[160px_1fr]">
        <input className={field} type="number" min="0.01" step="0.01" placeholder="ยอด (บาท)" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input className={field} placeholder="เหตุผล (บันทึกใน Audit Log)" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <div className="mb-4 flex gap-2">
        <button className={`${btn.base} ${btn.md} ${btn.success}`} disabled={pending || !(Number(amount) > 0) || !reason.trim()} onClick={() => submit(1)}>+ เพิ่มเครดิต</button>
        <button className={`${btn.base} ${btn.md} ${btn.danger}`} disabled={pending || !(Number(amount) > 0) || !reason.trim()} onClick={() => submit(-1)}>− ลดเครดิต</button>
      </div>
      {(error || err) && <p className="mb-3 text-[13px] text-danger">{error || err}</p>}
      <table className="w-full border-collapse">
        <thead><tr>{["เวลา", "จำนวน", "ยอดหลัง", "เหตุผล", "โดย"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
        <tbody>
          {items.map((c) => (
            <tr key={String(c.id)}>
              <td className={`${td} whitespace-nowrap text-muted`}>{fmtDateTime(c.createdAt as string)}</td>
              <td className={`${td} tabular-nums ${Number(c.amount) > 0 ? "text-success" : "text-danger"}`}>{Number(c.amount) > 0 ? "+" : "−"} {fmtMoney(Math.abs(Number(c.amount)))}</td>
              <td className={`${td} tabular-nums`}>{fmtMoney(c.balanceAfter as string)}</td>
              <td className={td}>{c.reason}</td>
              <td className={`${td} text-muted`}>{c.createdBy ?? "—"}</td>
            </tr>
          ))}
          {data && items.length === 0 && <tr><td className={`${td} text-center text-muted`} colSpan={5}>ยังไม่มีการปรับเครดิต</td></tr>}
        </tbody>
      </table>
    </Modal>
  );
}

/** Row icon actions, in the original's order. */
export function MerchantActions({ m, parents = [] }: { m: MerchantForActions; parents?: ParentOption[] }) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const close = () => setDialog(null);
  const icon = `${btn.base} ${btn.sm} ${btn.ghost}`;

  return (
    <div className="flex flex-nowrap items-center justify-end gap-1.5">
      <button className={icon} title="API Keys" aria-label="API Keys" onClick={() => setDialog("keys")}><KeyRound size={14} /></button>
      <button className={icon} title="Webhook Secret + Deliveries" aria-label="Webhook" onClick={() => setDialog("webhook")}><Link2 size={14} /></button>
      <button className={icon} title="Portal Users" aria-label="Portal Users" onClick={() => setDialog("portal")}><Users size={14} /></button>
      <button className={icon} title="ปรับเครดิต" aria-label="ปรับเครดิต" onClick={() => setDialog("credit")}><DollarSign size={14} /></button>
      <button className={icon} title="แก้ไข" aria-label="แก้ไข" onClick={() => setDialog("edit")}><Pencil size={14} /></button>
      <button className={`${btn.base} ${btn.sm} border-line bg-transparent text-danger hover:bg-danger/10`} title="ลบ" aria-label="ลบ" onClick={() => setDialog("delete")}><Trash2 size={14} /></button>

      {dialog === "keys" && <KeysDialog m={m} onClose={close} />}
      {dialog === "webhook" && <WebhookDialog m={m} onClose={close} />}
      {dialog === "portal" && <PortalDialog m={m} onClose={close} />}
      {dialog === "credit" && <CreditDialog m={m} onClose={close} />}
      {dialog === "edit" && <MerchantForm initial={m} onDone={close} parents={parents} />}
      {dialog === "delete" && (
        <DeleteDialog
          title={`ยืนยันการลบร้าน ${m.name}`}
          what={<>ลบร้าน <strong>{m.name}</strong> (<code>{m.slug}</code>)? ร้านที่มีรายการเงินแล้วลบไม่ได้ — ให้เปลี่ยนสถานะเป็น &ldquo;ระงับ&rdquo; แทน</>}
          warning="ร้านจะถูกระงับทันที: API key และการเข้าสู่ระบบของร้านใช้ไม่ได้ และ webhook ถูกปิด"
          placeholder="เช่น สร้างร้านผิด / ร้านทดสอบ"
          onConfirm={(reason) => deleteMerchant(m.id, reason)}
          onClose={close}
        />
      )}
    </div>
  );
}

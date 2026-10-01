"use client";

import { useEffect, useState, useTransition } from "react";
import QR from "qrcode";
import { Eye, EyeOff, Mail, MessageCircle, MessageSquare, Send, Smartphone, Trash2 } from "lucide-react";
import { Modal, btn } from "@/components/interactive/Modal";
import { fmtDateTime } from "@/lib/format";
import type { ChannelRow } from "@/lib/rows";
import { deleteChannel, saveChannel } from "./actions";
import { FIELDS, PROVIDER_FIELDS, SLIP_PROVIDERS, type ChannelType, type FieldDef } from "./fields";

const ICON: Record<ChannelType, [React.ReactNode, string]> = {
  telegram: [<Send key="i" size={22} />, "from-[#2aabee] to-[#229ed9]"],
  line: [<MessageCircle key="i" size={22} />, "from-[#00c300] to-[#00b900]"],
  facebook: [<MessageSquare key="i" size={22} />, "from-[#0084ff] to-[#0064c9]"],
  email: [<Mail key="i" size={22} />, "from-[#ea4335] to-[#d33b2c]"],
  sms: [<Smartphone key="i" size={22} />, "from-[#64748b] to-[#475569]"],
};

const input =
  "w-full rounded-lg border border-line bg-surface px-3.5 py-[11px] text-sm text-ink outline-none transition placeholder:text-soft focus:border-primary focus:shadow-ring disabled:opacity-60";

function randomSecret() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "").slice(0, 32);
}

function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-primary" : "bg-[#cbd5e1]"}`}
      title={on ? "ปิดช่องทางนี้" : "เปิดช่องทางนี้"}
    >
      <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

function SecretInput({ id, value, set, isSet, placeholder, onChange }: { id: string; value: string; set: boolean; isSet: boolean; placeholder?: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative block">
      <input
        id={id}
        type={show ? "text" : "password"}
        className={`${input} pr-10`}
        value={value}
        placeholder={isSet && !set ? "•••••••• (ตั้งค่าแล้ว — เว้นว่างเพื่อใช้ค่าเดิม)" : placeholder}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
      <button type="button" onClick={() => setShow((v) => !v)} className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded text-muted hover:bg-surface-alt" aria-label={show ? "ซ่อน" : "แสดง"}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </span>
  );
}

function QrToggle({ label, value, hint }: { label: string; value: string; hint: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open && !src) QR.toDataURL(value, { margin: 1, width: 220 }).then(setSrc);
  }, [open, src, value]);
  return (
    <div>
      <button type="button" className={`${btn.base} ${btn.sm} ${btn.ghost}`} onClick={() => setOpen((v) => !v)}>{label}</button>
      {open && src && (
        <div className="mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
          <img src={src} alt={label} width={220} height={220} className="rounded-lg border border-line bg-white p-2" />
          <div className="mt-1 max-w-[260px] text-xs text-muted">{hint}</div>
        </div>
      )}
    </div>
  );
}

export function ChannelCard({
  c,
  accounts,
  endpoints,
  hookBase,
}: {
  c: ChannelRow;
  accounts: { id: number; label: string }[];
  endpoints: { id: number; label: string; disabled: boolean }[];
  hookBase: string;
}) {
  const type = c.channelType as ChannelType;
  const [name, setName] = useState(c.name);
  const [enabled, setEnabled] = useState(c.enabled);
  const [config, setConfig] = useState<Record<string, string | boolean>>(c.config as Record<string, string | boolean>);
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [accountIds, setAccountIds] = useState<number[]>(c.accountIds);
  const [endpointIds, setEndpointIds] = useState<number[]>(c.endpointIds);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();
  const webhookUrl = `${hookBase}/api/webhooks/${type}/${c.id}`;
  const provider = String(config.slipProvider ?? "default");
  const fields: FieldDef[] = [
    ...FIELDS[type],
    ...(type === "sms" ? [] : (PROVIDER_FIELDS[provider] ?? [])),
  ];

  const save = (patch?: { enabled?: boolean }) =>
    start(async () => {
      setMsg(null);
      const r = await saveChannel(Number(c.id), { name, enabled: patch?.enabled ?? enabled, config, secrets, accountIds, endpointIds });
      if (r.ok) {
        setSecrets({});
        setMsg({ ok: true, text: "บันทึกแล้ว" });
      } else setMsg({ ok: false, text: r.error });
    });

  const field = (f: FieldDef) => {
    const id = `cfg-${c.id}-${f.key}`;
    const wrap = `${f.full ? "sm:col-span-2" : ""}`;
    if (f.kind === "check") {
      return (
        <div key={f.key} className={`flex items-center gap-2.5 ${wrap}`}>
          <input id={id} type="checkbox" className="size-4 accent-[var(--color-primary)]" checked={Boolean(config[f.key])} onChange={(e) => setConfig({ ...config, [f.key]: e.target.checked })} />
          <label htmlFor={id} className="cursor-pointer text-[13px]">{f.label}</label>
        </div>
      );
    }
    return (
      <div key={f.key} className={wrap}>
        <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium">{f.label}</label>
        {f.kind === "secret" ? (
          <div className="flex gap-2">
            <div className="flex-1">
              <SecretInput id={id} value={secrets[f.key] ?? ""} set={!!secrets[f.key]} isSet={c.secretsSet.includes(f.key)} placeholder={f.placeholder} onChange={(v) => setSecrets({ ...secrets, [f.key]: v })} />
            </div>
            {f.random && <button type="button" className={`${btn.base} ${btn.sm} ${btn.ghost}`} onClick={() => setSecrets({ ...secrets, [f.key]: randomSecret() })}>สุ่ม</button>}
          </div>
        ) : f.kind === "readonly" ? (
          <input id={id} className={input} value={webhookUrl} readOnly onFocus={(e) => e.target.select()} />
        ) : (
          <input id={id} type={f.kind === "number" ? "number" : "text"} className={input} placeholder={f.placeholder} value={String(config[f.key] ?? "")} onChange={(e) => setConfig({ ...config, [f.key]: e.target.value })} />
        )}
      </div>
    );
  };

  const chips = (items: { id: number; label: string; disabled?: boolean }[], picked: number[], setPicked: (v: number[]) => void) => (
    <div className="flex min-h-11 flex-wrap gap-2 rounded-lg border border-line bg-surface-alt p-2">
      {items.map((it) => {
        const on = picked.includes(it.id);
        return (
          <label key={it.id} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] ${on ? "border-primary bg-primary-50 font-medium text-primary" : "border-line text-muted"}`}>
            <input type="checkbox" className="hidden" checked={on} onChange={() => setPicked(on ? picked.filter((x) => x !== it.id) : [...picked, it.id])} />
            {it.label}
            {it.disabled && <span className="text-soft">(ปิดอยู่)</span>}
          </label>
        );
      })}
      {items.length === 0 && <span className="px-1 text-[12.5px] text-soft">ยังไม่มี</span>}
    </div>
  );

  return (
    <div className="mb-4 rounded-2xl border border-line bg-surface px-6 py-[22px]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className={`grid size-11 shrink-0 place-items-center rounded-xl bg-linear-to-br text-white ${ICON[type][1]}`}>{ICON[type][0]}</div>
          <div className="min-w-0">
            <input
              aria-label="ชื่อช่องทาง"
              className="w-full max-w-[340px] border-b border-dashed border-transparent bg-transparent px-1 py-0.5 text-base font-semibold text-ink outline-none hover:border-line focus:border-primary"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="mt-0.5 px-1 text-xs text-muted">
              ID #{c.id} · {enabled ? <span className="font-medium text-success">● กำลังทำงาน</span> : <span>○ ปิดอยู่</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Switch on={enabled} onChange={(v) => { setEnabled(v); save({ enabled: v }); }} />
          <button className={`${btn.base} ${btn.sm} border-line bg-transparent text-danger hover:bg-danger/10`} title="ลบช่องทางนี้" aria-label="ลบช่องทางนี้" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 pl-0 sm:grid-cols-2 sm:pl-[58px]">
        {fields.map(field)}
        {type !== "sms" && (
          <div className="sm:col-span-2">
            <label htmlFor={`cfg-${c.id}-slipProvider`} className="mb-1.5 block text-[13px] font-medium">ตรวจสลิปด้วย</label>
            <select id={`cfg-${c.id}-slipProvider`} className={input} value={provider} onChange={(e) => setConfig({ ...config, slipProvider: e.target.value })}>
              {SLIP_PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {type === "sms" && (
        <div className="mt-4 flex flex-wrap gap-4 sm:pl-[58px]">
          <QrToggle label="QR ดาวน์โหลดแอป" value="https://superpay.local/forwarder/download" hint="สแกนด้วยมือถือเพื่อติดตั้งแอป Forwarder" />
          <QrToggle label="แสดง QR จับคู่แอป Forwarder" value={`superpay-forwarder://pair?url=${encodeURIComponent(webhookUrl)}&channel=${c.id}`} hint="เปิดแอปแล้วสแกน QR นี้เพื่อจับคู่เครื่องกับช่องทางนี้" />
        </div>
      )}

      <div className="mt-[18px] grid gap-3.5 border-t border-dashed border-line pt-[18px] sm:pl-[58px]">
        <div>
          <div className="mb-1.5 text-[13px] font-medium">บัญชีที่รับเงินสำหรับ bot นี้</div>
          {chips(accounts, accountIds, setAccountIds)}
          <div className="mt-1 text-[11.5px] text-muted">ไม่เลือก = ใช้ได้กับทุกบัญชีที่รับเงิน</div>
        </div>
        <div>
          <div className="mb-1.5 text-[13px] font-medium">ปลายทาง webhook ที่จะแจ้งเมื่อ approve</div>
          {chips(endpoints, endpointIds, setEndpointIds)}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 sm:pl-[58px]">
        <button className={`${btn.base} ${btn.sm} ${btn.primary}`} disabled={pending} onClick={() => save()}>บันทึก</button>
        <span className="text-xs text-muted">อัปเดตล่าสุด: {fmtDateTime(c.updatedAt)}</span>
        {msg && <span className={`text-xs ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</span>}
      </div>

      {confirmDelete && (
        <Modal
          title={`ลบ ${c.name}`}
          onClose={() => setConfirmDelete(false)}
          footer={
            <>
              <button className={`${btn.base} ${btn.md} ${btn.ghost}`} onClick={() => setConfirmDelete(false)}>ยกเลิก</button>
              <button
                className={`${btn.base} ${btn.md} ${btn.danger}`}
                disabled={pending}
                onClick={() => start(async () => { const r = await deleteChannel(Number(c.id)); setConfirmDelete(false); if (!r.ok) setMsg({ ok: false, text: r.error }); else if (r.disabled) setMsg({ ok: true, text: "ช่องทางนี้มีประวัติ event — ปิดใช้งานแทนการลบ" }); })}
              >
                ลบช่องทาง
              </button>
            </>
          }
        >
          <p className="text-sm">ลบช่องทาง <strong>{c.name}</strong>? ถ้ามีประวัติ event อยู่ ระบบจะปิดใช้งานแทนการลบเพื่อเก็บประวัติไว้</p>
        </Modal>
      )}
    </div>
  );
}

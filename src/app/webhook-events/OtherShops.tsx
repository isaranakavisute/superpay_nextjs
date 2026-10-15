"use client";

import { useState, useTransition } from "react";
import { btn, field } from "@/components/interactive/Modal";
import { addWebhookUrl } from "./actions";

export type Shop = {
  id: number; name: string; slug: string; status: string; parentName: string | null;
  via: { endpointId: number; merchantId: number; merchantName: string; url: string; status: string } | null;
};

const th = "border-b border-line bg-surface-alt px-4 py-2.5 text-left text-xs font-semibold text-muted";
const td = "border-b border-line px-4 py-3 align-middle";

/** Every shop without its own endpoint — new shops show up here automatically. */
export function OtherShops({ shops }: { shops: Shop[] }) {
  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-line bg-surface">
      <header className="border-b border-line px-5 py-4">
        <div className="text-[15px] font-semibold">ร้านที่ยังไม่มีปลายทางของตัวเอง ({shops.length})</div>
        <div className="mt-0.5 text-[12px] text-muted">
          ร้านย่อยใช้การตั้งค่าของร้านแม่ที่ใกล้ที่สุดที่มีปลายทาง · ร้านใหม่จะแสดงที่นี่อัตโนมัติ · เพิ่ม URL แล้วร้านจะมีการตั้งค่าของตัวเอง (ทุก event ปิดไว้ก่อน)
        </div>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead><tr><th className={th}>ร้าน</th><th className={th}>ส่ง webhook ตาม</th><th className={th}>เพิ่ม webhook URL ของร้านนี้</th></tr></thead>
          <tbody>{shops.map((s) => <Row key={s.id} shop={s} />)}</tbody>
        </table>
      </div>
    </section>
  );
}

function Row({ shop }: { shop: Shop }) {
  const [url, setUrl] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const add = () => start(async () => {
    const r = await addWebhookUrl(shop.id, url);
    setErr(r.ok ? null : r.error);
  });
  return (
    <tr>
      <td className={td}>
        <div className="font-medium">{shop.name}</div>
        <div className="text-[11.5px] text-muted">{shop.slug}{shop.parentName ? ` · ร้านย่อยของ ${shop.parentName}` : ""}{shop.status !== "active" ? ` · ${shop.status}` : ""}</div>
      </td>
      <td className={td}>
        {shop.via
          ? <><div>การตั้งค่าของ <strong>{shop.via.merchantName}</strong></div><div className="break-all font-mono text-[11.5px] text-muted">{shop.via.url}</div></>
          : <span className="text-muted">ไม่ส่ง (ยังไม่มีปลายทาง)</span>}
      </td>
      <td className={td}>
        <div className="flex min-w-[320px] gap-2">
          <input className={field} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-site.com/callback" aria-label={`webhook URL ของ ${shop.name}`} />
          <button className={`${btn.base} ${btn.sm} ${btn.ghost} shrink-0`} disabled={pending || !url.trim()} onClick={add}>{pending ? "…" : "เพิ่ม"}</button>
        </div>
        {err && <div className="mt-1 text-[12px] text-danger">{err}</div>}
      </td>
    </tr>
  );
}

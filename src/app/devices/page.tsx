import type { Metadata } from "next";
import { AlertTriangle, Clock, Inbox, Shield, Zap } from "lucide-react";
import { param, type Params } from "@/components/list/query";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { Card, CardHead, PageHeader, StatGrid, StatTile } from "@/components/ui";
import { listResource } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import type { ChannelRow, DeviceRow } from "@/lib/rows";
import { FilterCard } from "../payments/FilterCard";
import { DeviceActions } from "./DeviceActions";

export const metadata: Metadata = { title: "อุปกรณ์ Forwarder — SuperPay Admin" };

const LATEST = "2.4.1";
const th = "border-b border-line bg-surface-alt px-[18px] py-[13px] text-left text-xs font-semibold tracking-[0.5px] text-muted uppercase whitespace-nowrap";
const td = "px-[18px] py-[13px] align-middle";
const older = (v: string) => v.localeCompare(LATEST, undefined, { numeric: true }) < 0;

export default async function DevicesPage({ searchParams }: PageProps<"/devices">) {
  const params: Params = await searchParams;
  let data;
  try {
    const [devices, all, channels] = await Promise.all([
      listResource<DeviceRow>("devices", { q: param(params, "q"), channelId: param(params, "channelId"), limit: 200 }),
      listResource<DeviceRow>("devices", { limit: 1 }),
      listResource<ChannelRow>("channels", { type: "sms", limit: 50 }),
    ]);
    data = { devices, all, channels: channels.data };
  } catch (err) {
    data = err instanceof Error ? err.message : String(err);
  }

  return (
    <ConsoleShell title="อุปกรณ์ Forwarder" path="/devices" search={{ placeholder: "ค้นหาชื่อ / รุ่น / device id...", params }}>
      <PageHeader title="อุปกรณ์ Forwarder" subtitle="มือถือที่ติดตั้งแอป Forwarder และจับคู่กับช่องทาง SMS — ดูว่าเครื่องไหนยังส่งข้อความอยู่ และถอนสิทธิ์เครื่องที่หายได้" />
      {typeof data === "string" ? (
        <Card className="flex items-start gap-3 p-5">
          <AlertTriangle className="mt-0.5 shrink-0 text-danger" size={20} />
          <div className="text-[13px] text-muted">{data}</div>
        </Card>
      ) : (
        (() => {
          const by = Object.fromEntries(data.all.summary.map((s) => [s.key, s.count]));
          const offline = by.offline ?? 0;
          return (
            <>
              <StatGrid>
                <StatTile tone="emerald" icon={<Zap size={24} />} label="ออนไลน์" value={by.online ?? 0} note="ส่งสัญญาณภายใน 3 นาที" />
                <StatTile tone={offline > 0 ? "amber" : "sky"} icon={<Clock size={24} />} label="ออฟไลน์" value={offline} note="เงียบเกินกำหนด — ควรไปเช็คเครื่อง" />
                <StatTile tone="sky" icon={<Shield size={24} />} label="ทั้งหมด" value={data.all.pagination.total} note="อุปกรณ์ที่ลงทะเบียนไว้" />
              </StatGrid>

              <Card className="mt-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line">
                  <div className="-mb-5 flex-1 [&>div]:mb-0 [&>div]:rounded-none [&>div]:border-0">
                    <FilterCard searchPlaceholder="ค้นหาชื่อ / รุ่น / device id..." filters={[{ name: "channelId", options: [{ value: "", label: "ทุกช่องทาง SMS" }, ...data.channels.map((c) => ({ value: String(c.id), label: c.name }))] }]} />
                  </div>
                  <div className="px-[22px] text-[13px] text-muted">แสดง {data.devices.pagination.total} จาก {data.all.pagination.total} เครื่อง</div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[12.5px]">
                    <thead><tr>{["อุปกรณ์", "ช่องทาง", "DEVICE ID", "สถานะ", "เห็นล่าสุด", "จัดการ"].map((h) => <th key={h} className={`${th} ${h === "จัดการ" ? "text-right" : ""}`}>{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-line">
                      {data.devices.data.length === 0 ? (
                        <tr><td colSpan={6} className="px-5 py-[60px] text-center text-muted"><div className="mb-3.5 inline-grid size-16 place-items-center rounded-full bg-surface-alt text-soft"><Inbox size={26} /></div><div>ยังไม่มีอุปกรณ์ลงทะเบียน — จับคู่ด้วย QR จากหน้าช่องทางตรวจสอบ</div></td></tr>
                      ) : (
                        data.devices.data.map((d) => {
                          const suspended = d.status === "disabled";
                          return (
                            <tr key={d.id} className={`hover:bg-surface-alt ${suspended ? "opacity-60" : ""}`}>
                              <td className={td}>
                                <div className="font-semibold">{d.name}</div>
                                {d.model && <div className="text-[11.5px] text-muted">{d.model}</div>}
                                <div className={`text-[11.5px] ${older(d.appVersion) ? "text-danger" : "text-muted"}`}>แอป v{d.appVersion}{older(d.appVersion) && " · มีเวอร์ชันใหม่"}</div>
                                {suspended && <div className="text-[11.5px] font-medium text-danger">ถูกระงับ</div>}
                              </td>
                              <td className={td}>{d.channelName ?? <span className="text-soft">—</span>}</td>
                              <td className={td}><code className="text-[11.5px]">{d.deviceUid}</code></td>
                              <td className={td}>
                                {d.online ? (
                                  <span className="rounded-full bg-[rgba(16,185,129,0.15)] px-2.5 py-1 text-[11px] font-semibold text-[#6ee7b7]">● ออนไลน์</span>
                                ) : (
                                  <span className="rounded-full border border-line px-2.5 py-1 text-[11px] font-semibold text-muted">○ ออฟไลน์</span>
                                )}
                              </td>
                              <td className={`${td} text-muted`}>{d.lastSeenAt ? fmtDateTime(d.lastSeenAt) : "ยังไม่เคยส่งสัญญาณ"}</td>
                              <td className={td}><DeviceActions id={d.id} name={d.name} suspended={suspended} /></td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card className="mt-4">
                <CardHead title="วิธีเพิ่มอุปกรณ์" />
                <div className="px-[22px] py-5 text-[13.5px] leading-[1.75]">
                  <p className="mb-2">อุปกรณ์<strong>เพิ่มเองจากหน้านี้ไม่ได้</strong> — ตัวเครื่องต้องลงทะเบียนเข้ามาเอง:</p>
                  <ol className="mb-2.5 ml-[18px] list-decimal">
                    <li>ติดตั้งแอป Forwarder บนมือถือที่รับ SMS ธนาคาร</li>
                    <li>เปิดหน้า <strong>ช่องทางตรวจสอบ</strong> → แท็บ SMS → กด &ldquo;แสดง QR จับคู่แอป Forwarder&rdquo; แล้วสแกนด้วยแอป</li>
                    <li>แอปจะลงทะเบียนตัวเองและแสดงในตารางนี้ พร้อมส่งสัญญาณทุก 1 นาที</li>
                  </ol>
                  <p className="text-muted">ออนไลน์ = มีสัญญาณเข้ามาภายใน <strong>3</strong> นาทีที่ผ่านมา · ถ้ามือถือหาย ให้กด <strong>ระงับ</strong> — เครื่องนั้นจะส่งข้อความไม่ได้ทันที โดยไม่ต้องเปลี่ยนรหัสลับของช่องทาง</p>
                </div>
              </Card>
            </>
          );
        })()
      )}
    </ConsoleShell>
  );
}

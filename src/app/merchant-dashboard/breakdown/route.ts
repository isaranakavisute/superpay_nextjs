import { consoleHeaders } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { buildXlsx, type XlsxCell } from "@/lib/xlsx";

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";
const when = (t: string | null) => (t ? new Date(t).toLocaleString("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "medium" }) : "");
const money = (v: string | number): XlsxCell => ({ v: Number(v), money: true });
const total = (v: string | number): XlsxCell => ({ v: Number(v), money: true, bold: true });
const b = (v: string): XlsxCell => ({ v, bold: true });

type PayRow = { no: number; ref: string; orderId: string | null; customer: string; createdAt: string; approvedAt: string | null; amount: string; fee: string; net: string; cumulativeNet: string };
type Payments = { shop: { name: string; feePercent: number; feeFlat: number }; rows: PayRow[]; totals: { count: number; gross: string; fee: string; net: string } };
type OutRow = { no: number; ref: string; merchantRef: string | null; receiverName: string; bankCode: string; account: string; createdAt: string; transferred: boolean; transferredAt: string | null; amount: string; fee: string; deducted: string; balanceBefore: string; balanceAfter: string };
type Commission = {
  shop: { name: string; feePercent: number; outFeePercent: number };
  shares: { no: number; kind: string; ref: string; createdAt: string; fromName: string; levels: number; belowName: string | null; base: string; belowPct: string | null; belowFee: string | null; ownPct: string | null; ownFee: string | null; amount: string }[];
  byShop: { levels: number; fromName: string; count: number; amount: string }[];
  subShops: { name: string; levels: number; viaName: string; inGap: number; outGap: number }[];
  total: string;
};
type Balance = {
  shop: { name: string; outFeePercent: number; outFeeFlat: number };
  start: { openingBalance: string; payments: number; gross: string; fee: string; net: string; startBalance: string };
  payouts: OutRow[]; adjustments: { createdAt: string; reason: string; amount: string; balanceAfter: string }[]; commission: string;
  totals: { count: number; amount: string; fee: string; deducted: string }; end: { computed: string; balance: string; matches: boolean };
};

/**
 * แดชบอร์ดร้านค้า break-downs: ?kind=payments (gross → net, the selected period) | balance (net สะสม → ยอดคงเหลือ, all time)
 * &merchantId=…[&from=&to=][&format=xlsx]. JSON for the pop-up, or the same table as an Excel file.
 */
export async function GET(req: Request) {
  const me = await getSessionUser();
  if (!me) return Response.json({ error: "unauthorized" }, { status: 401 });
  const u = new URL(req.url).searchParams;
  const kind = u.get("kind") === "balance" ? "balance" : u.get("kind") === "commission" ? "commission" : "payments";
  const id = Number(u.get("merchantId"));
  if (!Number.isInteger(id) || id <= 0) return Response.json({ error: "merchantId" }, { status: 400 });
  const q = new URLSearchParams();
  for (const k of ["from", "to"]) if (kind !== "balance" && u.get(k)) q.set(k, String(u.get(k)));
  const r = await fetch(`${BASE}/api/console/merchants/${id}/breakdown/${kind}?${q}`, { headers: { ...consoleHeaders(me.username), "x-console-user-id": String(me.id) }, cache: "no-store" });
  const data = await r.json().catch(() => null);
  if (!r.ok || !data) return Response.json({ error: data?.error?.message ?? `HTTP ${r.status}` }, { status: r.status || 502 });
  if (u.get("format") !== "xlsx") return Response.json(data);

  const label = u.get("label") ?? "";
  const stamp = new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" });
  let sheets;
  let file;
  if (kind === "commission") {
    const d = data as Commission;
    const pct = (v: string | number | null) => (v === null ? "" : `${Number(v)}%`);
    sheets = [{
      name: "ค่าคอม",
      widths: [6, 10, 12, 22, 24, 8, 14, 24, 13, 10, 13, 13],
      rows: [
        [b(`${d.shop.name} — ค่าคอมจากร้านย่อย${label ? ` · ${label}` : ""}`)],
        [`ค่าคอม = ค่าธรรมเนียม ณ อัตราของร้านที่อยู่ใต้ ${d.shop.name} ในสายนั้น − ค่าธรรมเนียม ณ อัตราของ ${d.shop.name} (เข้า ${d.shop.feePercent}% · ออก ${d.shop.outFeePercent}%) · เฉพาะรายการที่อนุมัติ · ออกรายงาน ${stamp}`],
        [],
        ["ลำดับ", "ประเภท", "เลขที่", "วันที่", "จากร้าน", "ชั้น", "ยอดรายการ", "ร้านชั้นล่าง (อัตรา)", "ค่าธรรมเนียม ณ อัตรานั้น", `อัตรา ${d.shop.name}`, "ค่าธรรมเนียม ณ อัตรานี้", "ค่าคอม"].map(b),
        ...d.shares.map((x): XlsxCell[] => [x.no, x.kind, x.ref, when(x.createdAt), x.fromName, x.levels, money(x.base), `${x.belowName ?? ""} ${pct(x.belowPct)}`.trim(),
          x.belowFee === null ? "" : money(x.belowFee), pct(x.ownPct), x.ownFee === null ? "" : money(x.ownFee), money(x.amount)]),
        [b(`รวม ${d.shares.length} รายการ`), "", "", "", "", "", "", "", "", "", "", total(d.total)],
        [],
        [b("สรุปตามร้านและชั้น")],
        ["ชั้น", "จากร้าน", "จำนวน", "ค่าคอม"].map(b),
        ...d.byShop.map((g): XlsxCell[] => [g.levels, g.fromName, g.count, money(g.amount)]),
        [],
        [b("อัตราที่ทำให้เกิดค่าคอม (ทุกร้านใต้ร้านนี้)")],
        ["ร้าน", "ชั้น", "คิดจากอัตราของ", "ส่วนต่างเงินเข้า", "ส่วนต่างเงินออก"].map(b),
        ...d.subShops.map((c): XlsxCell[] => [c.name, c.levels, c.viaName, `${c.inGap}%`, `${c.outGap}%`]),
      ],
    }];
    file = `commission-${id}`;
  } else if (kind === "payments") {
    const d = data as Payments;
    sheets = [{
      name: "ยอดรับชำระ → สุทธิ",
      widths: [6, 12, 40, 26, 22, 22, 14, 13, 14, 16],
      rows: [
        [b(`${d.shop.name} — ยอดรับชำระ (gross) → ยอดสุทธิเข้าร้าน (net)${label ? ` · ${label}` : ""}`)],
        [`ค่าธรรมเนียมเงินเข้า ${d.shop.feePercent}% + ฿${d.shop.feeFlat.toFixed(2)} ต่อรายการ (ปัด 2 ตำแหน่งทีละรายการ) · รายการที่อนุมัติ · ออกรายงาน ${stamp}`],
        [],
        ["ลำดับ", "เลขที่", "orderId", "ลูกค้า", "สร้างเมื่อ", "อนุมัติเมื่อ", "ยอดรับชำระ", "ค่าธรรมเนียม", "สุทธิ", "สุทธิสะสม"].map(b),
        ...d.rows.map((x): XlsxCell[] => [x.no, x.ref, x.orderId, x.customer, when(x.createdAt), when(x.approvedAt), money(x.amount), money(x.fee), money(x.net), money(x.cumulativeNet)]),
        [b(`รวม ${d.totals.count} รายการ`), "", "", "", "", "", total(d.totals.gross), total(d.totals.fee), total(d.totals.net), ""],
        [],
        [b("สรุป"), "", "", "", "", "", "ยอดรับชำระ", "− ค่าธรรมเนียม", "= สุทธิ"],
        ["", "", "", "", "", "", total(d.totals.gross), total(d.totals.fee), total(d.totals.net)],
      ],
    }];
    file = `gross-net-${id}`;
  } else {
    const d = data as Balance;
    const lead: XlsxCell[][] = [
      [b(`${d.shop.name} — ยอดสุทธิเข้าร้านสะสม → ยอดคงเหลือถอนได้ (ตอนนี้)`)],
      [`ค่าธรรมเนียมเงินออก ${d.shop.outFeePercent}% + ฿${d.shop.outFeeFlat.toFixed(2)} ต่อรายการ · โอนออกที่อนุมัติทั้งหมด (หักยอดร้านเมื่อสร้าง) · ออกรายงาน ${stamp}`],
      [],
      [b("ยอดตั้งต้น (opening balance)"), "", "", "", "", "", "", "", "", "", total(d.start.openingBalance)],
      [b(`+ ยอดสุทธิเข้าร้านสะสม (${d.start.payments} รายการ: ${d.start.gross} − ค่าธรรมเนียม ${d.start.fee})`), "", "", "", "", "", "", "", "", "", total(d.start.net)],
      [b("= ยอดเริ่มต้น"), "", "", "", "", "", "", "", "", "", total(d.start.startBalance)],
      [],
      ["ลำดับ", "เลขที่", "merchantRef", "ผู้รับ", "ธนาคาร / บัญชี", "สร้างเมื่อ (หักยอด)", "สถานะ", "ยอดโอนออก", "ค่าธรรมเนียม", "หักจากร้าน", "ยอดคงเหลือหลังรายการ"].map(b),
      ...d.payouts.map((x): XlsxCell[] => [x.no, x.ref, x.merchantRef, x.receiverName, `${x.bankCode} ${x.account}`, when(x.createdAt),
        x.transferred ? `ถอนสำเร็จ ${when(x.transferredAt)}` : "อนุมัติแล้ว (รอโอน)", money(x.amount), money(x.fee), money(x.deducted), money(x.balanceAfter)]),
      [b(`รวม ${d.totals.count} รายการ`), "", "", "", "", "", "", total(d.totals.amount), total(d.totals.fee), total(d.totals.deducted), ""],
    ];
    const tail: XlsxCell[][] = [
      ...d.adjustments.map((a): XlsxCell[] => ["", "ปรับยอด", a.reason, "", "", when(a.createdAt), "", "", "", money(a.amount), money(a.balanceAfter)]),
      ...(Number(d.commission) ? [[b("+ ค่าคอมจากร้านย่อย"), "", "", "", "", "", "", "", "", total(d.commission), ""] as XlsxCell[]] : []),
      [],
      [b("= ยอดคงเหลือถอนได้ (คำนวณ)"), "", "", "", "", "", "", "", "", "", total(d.end.computed)],
      [b("ยอดคงเหลือในระบบ"), "", "", "", "", "", "", "", "", "", total(d.end.balance)],
      [b(d.end.matches ? "✓ ตรงกันทุกสตางค์" : "✗ ไม่ตรงกัน — กรุณาแจ้งผู้ดูแลระบบ")],
    ];
    sheets = [{ name: "สุทธิสะสม → คงเหลือ", widths: [6, 12, 40, 24, 22, 22, 30, 14, 13, 14, 18], rows: [...lead, ...tail] }];
    file = `net-balance-${id}`;
  }
  return new Response(new Uint8Array(buildXlsx(sheets)), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${file}-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      "cache-control": "no-store",
    },
  });
}

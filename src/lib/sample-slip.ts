import QRCode from "qrcode";

/**
 * A SAMPLE transfer slip for one order: shows what the customer's real bank
 * slip must contain (amount, receiver, sender, time, QR). It is watermarked and
 * its QR carries SAMPLE_SLIP_MARKER, which the backend refuses on upload — it
 * is a guide, never proof of payment.
 */
export const SAMPLE_SLIP_MARKER = "OPTIONPAY-SAMPLE-SLIP";

export type SampleSlip = {
  ref: string;
  amount: number;
  customerName: string | null;
  bankName: string;
  accountName: string | null;
  accountNo: string | null;
};

/** How bank apps print an account: Thai 10-digit numbers as xxx-x-x1234-x (the same digits the checker compares). */
export function maskAccount(no: string | null) {
  const d = (no ?? "").replace(/\D/g, "");
  if (d.length === 10) return `xxx-x-x${d.slice(5, 9)}-x`;
  return d.length > 4 ? `${"x".repeat(d.length - 4)}${d.slice(-4)}` : "xxx-x-xxxxx-x";
}

const W = 720;
const H = 1240;
const FONT = '"Sukhumvit Set", "Thonburi", "Noto Sans Thai", "Leelawadee UI", Tahoma, sans-serif';
const GOLD = "#d4af37";

export async function renderSampleSlip(d: SampleSlip): Promise<HTMLCanvasElement> {
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const g = cv.getContext("2d")!;
  const text = (s: string, x: number, y: number, size: number, color = "#1f2430", weight = 400, align: CanvasTextAlign = "left") => {
    g.font = `${weight} ${size}px ${FONT}`;
    g.fillStyle = color;
    g.textAlign = align;
    g.fillText(s, x, y);
  };
  const badge = (n: number, x: number, y: number) => {
    g.fillStyle = GOLD;
    g.beginPath(); g.arc(x, y, 15, 0, Math.PI * 2); g.fill();
    text(String(n), x, y + 6, 17, "#16120a", 700, "center");
  };
  const now = new Date();
  const when = now.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const amount = `${d.amount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;

  // Card
  g.fillStyle = "#f4f5f7"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#ffffff"; g.beginPath(); g.roundRect(30, 30, W - 60, H - 60, 24); g.fill();

  // 4 — status and time
  g.fillStyle = "#16a34a"; g.beginPath(); g.arc(W / 2, 110, 34, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#fff"; g.lineWidth = 7; g.lineCap = "round"; g.beginPath(); g.moveTo(W / 2 - 15, 111); g.lineTo(W / 2 - 3, 123); g.lineTo(W / 2 + 17, 98); g.stroke();
  text("โอนเงินสำเร็จ", W / 2, 186, 32, "#16a34a", 700, "center");
  text(when, W / 2, 224, 22, "#6b7280", 400, "center");
  badge(4, W / 2 + 160, 216);

  const row = (y: number, label: string, name: string, sub: string, acct: string, n: number) => {
    text(label, 80, y, 20, "#6b7280");
    text(name, 80, y + 38, 27, "#1f2430", 700);
    text(sub, 80, y + 72, 21, "#6b7280");
    text(acct, 80, y + 104, 23, "#1f2430", 500);
    badge(n, W - 85, y + 30);
  };
  g.strokeStyle = "#e5e7eb"; g.lineWidth = 2;
  g.beginPath(); g.moveTo(70, 262); g.lineTo(W - 70, 262); g.stroke();
  // 3 — sender = the order's customer
  row(306, "จาก", d.customerName || "(ชื่อบัญชีของลูกค้า)", "ธนาคารของลูกค้า", "xxx-x-x1234-x", 3);
  text("↓", W / 2, 466, 34, "#9ca3af", 400, "center");
  // 2 — receiver = the order's account
  row(500, "ไปยัง", d.accountName || "(ชื่อบัญชีรับเงิน)", d.bankName, maskAccount(d.accountNo), 2);
  g.beginPath(); g.moveTo(70, 650); g.lineTo(W - 70, 650); g.stroke();

  // 1 — amount
  text("จำนวนเงิน", 80, 700, 20, "#6b7280");
  text(amount, 80, 752, 44, "#1f2430", 700);
  badge(1, W - 85, 728);
  text("ค่าธรรมเนียม 0.00 บาท", 80, 790, 20, "#6b7280");
  text(`เลขที่รายการ: SAMPLE${now.getTime().toString().slice(-10)}`, 80, 830, 20, "#6b7280");

  // 5 — QR (carries the sample marker)
  const qr = new Image();
  qr.src = await QRCode.toDataURL(`${SAMPLE_SLIP_MARKER}|${d.ref}`, { margin: 1, width: 190 });
  await qr.decode();
  g.drawImage(qr, W - 260, 860, 190, 190);
  badge(5, W - 290, 880);
  text("QR สำหรับตรวจสอบสลิป", W - 165, 1076, 18, "#6b7280", 400, "center");

  // Legend
  const legend = ["① ยอดตรงทุกสตางค์", "② บัญชีผู้รับ + ธนาคารตรงกับรายการ", "③ ชื่อผู้โอน (ผู้อื่นโอนแทนได้)", "④ โอนหลังสร้างรายการ", "⑤ มี QR ครบ ไม่ครอป"];
  legend.forEach((s, i) => text(s, 80, 885 + i * 34, 19, "#4b5563"));
  text(`รายการ ${d.ref}`, 80, 1076, 18, "#9ca3af");

  // Watermark + footer: this image is a guide, not a slip.
  g.save();
  g.translate(W / 2, H / 2); g.rotate(-Math.PI / 6);
  text("ตัวอย่าง · SAMPLE", 0, 0, 92, "rgba(220,38,38,0.20)", 800, "center");
  g.restore();
  g.fillStyle = "#fef2f2"; g.beginPath(); g.roundRect(60, 1110, W - 120, 74, 14); g.fill();
  text("ภาพตัวอย่าง — ไม่ใช่หลักฐานการโอน และอัปโหลดไม่ได้", W / 2, 1142, 20, "#b91c1c", 700, "center");
  text("ให้ลูกค้าแนบสลิปจริงจากแอปธนาคารที่มีข้อมูลตรงตามนี้", W / 2, 1170, 18, "#b91c1c", 400, "center");
  return cv;
}

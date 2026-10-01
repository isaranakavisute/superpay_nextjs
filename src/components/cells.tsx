import { Badge, BankChip } from "./ui";

/** Bank chip + bank name, with optional holder name and account number lines. */
export function BankCell({ code, bank, name, account }: { code: string; bank?: string | null; name?: string | null; account?: string | null }) {
  return (
    <div className="flex items-center gap-2.5">
      <BankChip code={code} />
      <div className="min-w-0 leading-tight">
        {bank && <div className="text-ink">{bank}</div>}
        {name && <div className="text-[11.5px] text-muted">{name}</div>}
        {account && <div className="text-[11.5px] text-muted tabular-nums">{account}</div>}
      </div>
    </div>
  );
}

/** Customer name, with the payer's bank chip and masked account underneath when known. */
export function PayerCell({ name, bankCode, masked }: { name: string; bankCode?: string | null; masked?: string | null }) {
  return (
    <div className="leading-tight">
      <div>{name}</div>
      {bankCode && masked && (
        <div className="mt-1 flex items-center gap-2 text-[11.5px] text-muted">
          <BankChip code={bankCode} />
          <span className="tabular-nums">{masked}</span>
        </div>
      )}
    </div>
  );
}

// Tones shared by the generic status badge (dark-mode values).
const TONE = {
  green: "bg-[rgba(16,185,129,0.15)] text-[#6ee7b7]",
  amber: "bg-[rgba(245,158,11,0.15)] text-[#fcd34d]",
  red: "bg-[rgba(239,68,68,0.15)] text-[#fca5a5]",
  slate: "bg-[rgba(148,163,184,0.15)] text-[#cbd5e1]",
  blue: "bg-[rgba(59,130,246,0.15)] text-[#93c5fd]",
  gold: "bg-primary-50 text-primary",
} as const;

/** label + tone for every status value used across the console pages. */
const STATUS: Record<string, [string, keyof typeof TONE]> = {
  active: ["ใช้งาน", "green"],
  inactive: ["ปิดใช้งาน", "slate"],
  locked: ["ถูกล็อก", "red"],
  suspended: ["ระงับ", "slate"],
  online: ["ออนไลน์", "green"],
  offline: ["ออฟไลน์", "red"],
  disabled: ["ปิดใช้งาน", "slate"],
  error: ["ขัดข้อง", "red"],
  paused: ["หยุดชั่วคราว", "slate"],
  new: ["ใหม่", "blue"],
  matched: ["จับคู่แล้ว", "green"],
  manual: ["จับคู่เอง", "amber"],
  released: ["ปล่อยเงินแล้ว", "green"],
  cancelled: ["ยกเลิก", "slate"],
  open: ["รอตรวจ", "amber"],
  resolved: ["จัดการแล้ว", "green"],
  success: ["สำเร็จ", "green"],
  failed: ["ล้มเหลว", "red"],
  verified: ["ยืนยันแล้ว", "green"],
  pending: ["รอตรวจสอบ", "amber"],
  approved: ["อนุมัติแล้ว", "green"],
  rejected: ["ไม่อนุมัติ", "red"],
};

export function StateBadge({ status }: { status: string }) {
  const [label, tone] = STATUS[status] ?? [status, "slate"];
  return <Badge className={TONE[tone]}>{label}</Badge>;
}

export const statusLabel = (s: string) => STATUS[s]?.[0] ?? s;

// Outflow "source" chips keep their light pastel fills on the dark theme, as on the original.
const CATEGORY: Record<string, [string, string]> = {
  withdraw: ["ถอนเงินร้านค้า", "bg-[#e0e7ff] text-[#3730a3]"],
  settlement: ["โอนชำระ", "bg-[#dcfce7] text-[#166534]"],
  expense: ["ค่าใช้จ่าย", "bg-[#dbeafe] text-[#1e40af]"],
  refund: ["คืนเงินลูกค้า", "bg-[#fee2e2] text-[#b91c1c]"],
};

export function CategoryBadge({ category }: { category: string }) {
  const [label, cls] = CATEGORY[category] ?? [category, "bg-[#e5e7eb] text-[#374151]"];
  return <Badge className={cls}>{label}</Badge>;
}

export const Dash = () => <span className="text-soft">—</span>;

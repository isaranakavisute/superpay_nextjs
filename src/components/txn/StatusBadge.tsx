const STATUS: Record<string, [string, string]> = {
  pending: ["รอดำเนินการ", "bg-[rgba(245,158,11,0.15)] text-[#fcd34d]"],
  approved: ["สำเร็จ", "bg-[rgba(16,185,129,0.15)] text-[#6ee7b7]"],
  completed: ["สำเร็จ", "bg-[rgba(16,185,129,0.15)] text-[#6ee7b7]"],
  rejected: ["ปฏิเสธ", "bg-[rgba(239,68,68,0.15)] text-[#fca5a5]"],
  expired: ["หมดเวลา", "bg-[rgba(148,163,184,0.15)] text-[#cbd5e1]"],
  refunded: ["คืนเงินแล้ว", "bg-[rgba(59,130,246,0.15)] text-[#93c5fd]"],
  purged: ["ลบถาวร", "bg-[rgba(148,163,184,0.12)] text-[#94a3b8] line-through"],
};

/** Transaction status pill, plus a red "ลบแล้ว" pill for soft-deleted rows. */
export function StatusBadge({ status, deleted, small }: { status: string; deleted?: boolean; small?: boolean }) {
  const [label, tone] = STATUS[status] ?? [status, "bg-surface-alt text-muted"];
  const size = small ? "px-2 py-0.5 text-[10.5px]" : "px-2.5 py-1 text-[11.5px]";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`rounded-full font-semibold whitespace-nowrap ${size} ${tone}`}>{label}</span>
      {deleted && <span className={`rounded-full bg-danger/15 font-semibold whitespace-nowrap text-danger ${size}`}>ลบแล้ว</span>}
    </span>
  );
}

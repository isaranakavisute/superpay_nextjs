import Link from "next/link";
import { ArrowUpRight, Inbox } from "lucide-react";
import { findBank, type OutflowStatus, type PaymentStatus } from "@/lib/domain";

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <section className={`rounded-xl border border-line bg-surface shadow-sm ${className}`}>{children}</section>;
}

export function CardHead({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-[22px] py-[18px]">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}

/** Small outlined button-link (ghost, sm). */
export function GhostLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-lg border border-line px-3 py-1.5 text-[12.5px] font-medium whitespace-nowrap text-ink transition-colors hover:bg-surface-alt"
    >
      {children}
    </Link>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="mt-1 mb-3 text-xs font-semibold tracking-[0.04em] text-muted uppercase">{children}</div>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-[22px] flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="mb-1 text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2.5">{actions}</div>}
    </div>
  );
}

/**
 * Console action button. Write actions are not wired to the backend yet, so
 * they render in place but disabled, with a tooltip saying so.
 */
export function ActionButton({
  children,
  variant = "ghost",
  danger,
  className = "",
}: {
  children: React.ReactNode;
  variant?: "primary" | "ghost" | "plain";
  danger?: boolean;
  className?: string;
}) {
  const look =
    variant === "primary"
      ? "border-primary bg-primary text-primary-fg px-[18px] py-2.5 text-sm"
      : variant === "ghost"
        ? "border-line bg-transparent px-3 py-1.5 text-[12.5px]"
        : "border-transparent bg-surface px-3 py-1.5 text-[12.5px]";
  return (
    <button
      type="button"
      disabled
      title="ยังไม่เปิดใช้งาน"
      className={`inline-flex cursor-not-allowed items-center gap-2 rounded-lg border font-medium whitespace-nowrap ${look} ${
        danger ? "text-danger" : variant === "primary" ? "" : "text-ink"
      } opacity-80 ${className}`}
    >
      {children}
    </button>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="px-5 py-[60px] text-center text-muted">
      <div className="mb-3.5 inline-grid size-16 place-items-center rounded-full bg-surface-alt text-soft">
        <Inbox size={26} />
      </div>
      <div>{text}</div>
    </div>
  );
}

// Dark-mode badge colours, exact values.
const STATUS_STYLE: Record<PaymentStatus | OutflowStatus, [string, string]> = {
  pending: ["รอชำระ", "bg-[rgba(245,158,11,0.15)] text-[#fcd34d]"],
  approved: ["อนุมัติแล้ว", "bg-[rgba(16,185,129,0.15)] text-[#6ee7b7]"],
  rejected: ["ไม่อนุมัติ", "bg-[rgba(239,68,68,0.15)] text-[#fca5a5]"],
  refunded: ["คืนเงิน", "bg-[rgba(148,163,184,0.15)] text-[#cbd5e1]"],
  expired: ["หมดอายุ", "bg-[rgba(100,116,139,0.12)] text-[#94a3b8] border border-[rgba(148,163,184,0.25)]"],
};

/** Pill badge: 11px, semibold, uppercase. */
export function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.4px] whitespace-nowrap uppercase ${className}`}>
      {children}
    </span>
  );
}

/** Payment/outflow badge. Outflows label "pending" as รอตรวจสอบ, payments as รอชำระ. */
export function StatusBadge({ status, kind = "payment" }: { status: PaymentStatus | OutflowStatus; kind?: "payment" | "outflow" }) {
  const [label, cls] = STATUS_STYLE[status];
  return <Badge className={cls}>{kind === "outflow" && status === "pending" ? "รอตรวจสอบ" : label}</Badge>;
}

export function BankChip({ code }: { code: string }) {
  const bank = findBank(code);
  return (
    <span
      className="inline-flex size-[38px] shrink-0 items-center justify-center rounded-[10px] border border-white/[0.18] text-[11px] font-extrabold tracking-[0.3px] shadow-[0_2px_6px_rgba(15,23,42,0.1)]"
      style={{ background: bank?.bg ?? "#e5e7eb", color: bank?.fg ?? "#374151" }}
      title={bank?.name ?? code}
    >
      {bank?.short ?? code}
    </span>
  );
}

// Stat-card icon tiles, dark-mode values.
const TONES = {
  emerald: "bg-[rgba(16,185,129,0.15)] text-[#6ee7b7]",
  amber: "bg-[rgba(245,158,11,0.15)] text-[#fcd34d]",
  rose: "bg-[rgba(244,63,94,0.15)] text-[#fda4af]",
  sky: "bg-[rgba(56,189,248,0.15)] text-[#7dd3fc]",
};

/** Stat tile without a link (same look as StatCard). */
export function StatTile({
  tone,
  icon,
  label,
  value,
  note,
  valueClass = "",
}: {
  tone: keyof typeof TONES;
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-line bg-surface p-[22px]">
      <div className={`grid size-13 shrink-0 place-items-center rounded-[14px] ${TONES[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[13px] text-muted">{label}</div>
        <div className={`mt-0.5 truncate text-2xl font-bold text-ink ${valueClass}`}>{value}</div>
        {note && <div className="mt-1 flex items-center gap-1 text-xs text-muted">{note}</div>}
      </div>
    </div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="mb-6 grid gap-[18px] sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

export function StatCard({
  href,
  tone,
  icon,
  label,
  value,
  note,
  valueClass = "",
}: {
  href: string;
  tone: keyof typeof TONES;
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  note: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex items-center gap-4 overflow-hidden rounded-xl border border-line bg-surface p-[22px] transition-all duration-200 hover:-translate-y-[3px] hover:border-primary hover:shadow-lift"
    >
      <div className={`grid size-13 shrink-0 place-items-center rounded-[14px] transition-transform duration-200 group-hover:scale-105 ${TONES[tone]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[13px] text-muted">{label}</div>
        <div className={`mt-0.5 truncate text-2xl font-bold text-ink ${valueClass}`}>{value}</div>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted">{note}</div>
      </div>
      <ArrowUpRight
        size={18}
        className="absolute top-3.5 right-3.5 text-soft opacity-0 transition-all duration-200 group-hover:translate-x-[3px] group-hover:-translate-y-[3px] group-hover:text-primary group-hover:opacity-100"
      />
    </Link>
  );
}

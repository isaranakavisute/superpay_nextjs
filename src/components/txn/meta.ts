import { ArrowDownLeft, ArrowUpRight, Download } from "lucide-react";
import type { TxnKind } from "./types";

export const KIND: Record<TxnKind, { label: string; icon: typeof ArrowDownLeft; tone: string }> = {
  payment: { label: "ชำระเงิน", icon: ArrowDownLeft, tone: "text-[#6ee7b7] bg-[rgba(16,185,129,0.12)]" },
  outflow: { label: "เงินออก", icon: ArrowUpRight, tone: "text-[#fca5a5] bg-[rgba(239,68,68,0.12)]" },
  withdrawal: { label: "คำขอถอน", icon: Download, tone: "text-[#93c5fd] bg-[rgba(59,130,246,0.12)]" },
};

/** "SCB ···8585" style bank text. */
export const bankText = (code?: string | null, account?: string | null) =>
  [code, account ? (account.startsWith("·") ? account : `···${account.replace(/\D/g, "").slice(-4) || account}`) : null].filter(Boolean).join(" ") || "—";

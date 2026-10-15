import "server-only";
import { listResource } from "@/lib/api";
import type { MerchantRow, OutflowRow, WithdrawalRow } from "@/lib/rows";

/** Money leaving the shop's balance: payouts (API), approved withdrawal requests, transfers made by the Option Pay team. */
export const SOURCE_LABEL: Record<string, string> = {
  api: "โอนออก (API)", withdrawal: "คำขอถอนเงิน", manual: "ผู้ดูแลโอนให้", p2p: "จับคู่ P2P", portal: "โอนออก (Portal)",
};
export const PAYOUT_STATUS: Record<string, [string, string]> = {
  pending: ["รออนุมัติ", "bg-[rgba(245,158,11,0.15)] text-[#fcd34d]"],
  approved: ["อนุมัติแล้ว", "bg-[rgba(16,185,129,0.15)] text-[#6ee7b7]"],
  rejected: ["ไม่สำเร็จ", "bg-[rgba(239,68,68,0.15)] text-[#fca5a5]"],
};
export const STATUS_PARAM: Record<string, string> = { pending: "pending", completed: "approved", failed: "rejected" };

/** What the shop sees of an outflow — never the deducting account or the team's notes on a completed transfer. */
export type PayoutView = Pick<OutflowRow, "ref" | "merchantRef" | "receiverName" | "receiverBankCode" | "receiverBankName" | "receiverAccount" | "amount" | "fee" | "status" | "source" | "description" | "createdAt" | "completedAt"> & {
  failureReason: string | null;
};
export const toView = (o: OutflowRow): PayoutView => ({
  ref: o.ref, merchantRef: o.merchantRef, receiverName: o.receiverName, receiverBankCode: o.receiverBankCode, receiverBankName: o.receiverBankName,
  receiverAccount: o.receiverAccount, amount: o.amount, fee: o.fee, status: o.status, source: o.source, description: o.description,
  createdAt: o.createdAt, completedAt: o.completedAt, failureReason: o.status === "rejected" ? o.reviewNote : null,
});

/** Balance − reserved (pending payouts + pending withdrawal requests, amount + fee) = available. */
export async function balanceOf(merchantId: number) {
  const [shops, pendingOut, pendingWd] = await Promise.all([
    listResource<MerchantRow>("merchants").catch(() => null),
    listResource<OutflowRow>("outflows", { merchantId: String(merchantId), status: "pending", limit: 200 }).catch(() => null),
    listResource<WithdrawalRow>("withdrawals", { merchantId: String(merchantId), status: "pending", limit: 200 }).catch(() => null),
  ]);
  const shop = shops?.data.find((m) => m.id === merchantId);
  const sum = (rows: { amount: unknown; fee: unknown }[] = []) => rows.reduce((a, r) => a + Number(r.amount) + Number(r.fee), 0);
  const reserved = Math.round((sum(pendingOut?.data) + sum(pendingWd?.data)) * 100) / 100;
  const balance = Number(shop?.currentBalance ?? 0);
  return { balance, reserved, available: Math.round((balance - reserved) * 100) / 100, pendingCount: (pendingOut?.data.length ?? 0) + (pendingWd?.data.length ?? 0) };
}

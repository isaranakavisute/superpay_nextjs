import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Landmark } from "lucide-react";
import { StateBadge } from "@/components/cells";
import { param, withParams } from "@/components/list/query";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { Card, PageHeader } from "@/components/ui";
import { listResource } from "@/lib/api";
import { findBank } from "@/lib/domain";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import type { AccountRow, MerchantRow } from "@/lib/rows";
import { AccountActions, AccountSwitch, NewAccountButton, ResetAllButton } from "./AccountControls";

type Account = AccountRow & { promptpayId: string | null; merchantId: number | null };
type Shop = { id: number; name: string };

export const metadata: Metadata = { title: "บัญชีธนาคาร — Option Pay Admin" };

const TABS = [
  { value: "", label: "ทั้งหมด" },
  { value: "receive", label: "รับเงินเข้า" },
  { value: "send", label: "โอนออก" },
  { value: "both", label: "รับ + โอน" },
];
const TYPE_LABEL: Record<AccountRow["accountType"], string> = { receive: "รับเงิน", send: "โอนออก", both: "รับ + โอน" };

/** 10-digit Thai account numbers as xxx-x-xxxxx-x; anything else unchanged. */
const formatAccountNo = (n: string | null) => (n && /^\d{10}$/.test(n) ? `${n.slice(0, 3)}-${n[3]}-${n.slice(4, 9)}-${n[9]}` : (n ?? ""));

function AccountCard({ a, shops }: { a: Account; shops: Shop[] }) {
  const owner = shops.find((s) => s.id === a.merchantId);
  const bank = findBank(a.bankCode);
  const balance = Number(a.balance);
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="relative flex items-center gap-3.5 overflow-hidden px-5 py-[18px]" style={{ background: bank?.bg ?? "#475569", color: bank?.fg ?? "#fff" }}>
        <span className="pointer-events-none absolute -top-[30px] -right-[30px] size-[120px] rounded-full bg-white/[0.08]" />
        <div className="z-[1] grid size-12 shrink-0 place-items-center rounded-xl border border-white/30 bg-white/20 text-[13px] font-extrabold">
          {bank?.short ?? a.bankCode}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">{bank?.name ?? a.bankName}</div>
          <div className="text-xs tracking-[1px] opacity-90">{formatAccountNo(a.accountNo)}</div>
        </div>
        <span className="z-[1] inline-flex items-center rounded-full border border-white/25 bg-white/20 px-2.5 py-[3px] text-[10.5px] font-bold tracking-[0.5px] uppercase">
          {TYPE_LABEL[a.accountType]}
        </span>
      </div>

      <div className="flex-1 px-5 py-[18px]">
        <div className="text-xs text-muted">ชื่อบัญชี</div>
        <div className="mb-2 font-semibold">{a.accountName ?? a.label}</div>
        <div className="mb-2 text-[12px] text-muted">{a.promptpayId ? `PromptPay ${a.promptpayId}` : "ไม่มี PromptPay"} · {owner ? `ร้าน ${owner.name}` : "บัญชีกลาง"}</div>
        <div className="text-xs text-muted">ยอดคงเหลือ</div>
        <div className={`mt-2.5 mb-1 text-[22px] font-bold tabular-nums ${balance < 0 ? "text-danger" : "text-ink"}`}>{fmtMoney(balance)}</div>
        <div className="mt-1 text-[12.5px] text-muted">
          เข้า <strong className="text-success">{a.inCount.toLocaleString("th-TH")}</strong> รายการ · ออก{" "}
          <strong className="text-danger">{a.outCount.toLocaleString("th-TH")}</strong> รายการ
          <div className="text-[11.5px]">{a.countersResetAt ? `นับตั้งแต่ reset ${fmtDateTime(a.countersResetAt)}` : "นับทั้งหมดตั้งแต่เริ่ม"}</div>
        </div>
        <div className="flex items-center justify-between py-1 text-[12.5px] text-muted">
          <span>สถานะ</span>
          <span className="inline-flex items-center gap-2">
            <StateBadge status={a.status} />
            <AccountSwitch id={a.id} on={a.status === "active"} />
          </span>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <AccountActions shops={shops} account={{ id: a.id, bankCode: a.bankCode, accountNo: a.accountNo, accountName: a.accountName, accountType: a.accountType, promptpayId: a.promptpayId, merchantId: a.merchantId, label: a.label }} />
      </div>
    </div>
  );
}

export default async function AccountsPage({ searchParams }: PageProps<"/accounts">) {
  const params = await searchParams;
  const type = param(params, "type") ?? "";
  const q = param(params, "q");

  let list: Account[] = [];
  let shops: Shop[] = [];
  let error: string | null = null;
  try {
    const [accts, merchants] = await Promise.all([listResource<Account>("accounts", { type, q, limit: 200 }), listResource<MerchantRow>("merchants").catch(() => null)]);
    list = accts.data;
    shops = (merchants?.data ?? []).map((m) => ({ id: m.id, name: m.name }));
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }
  const total = list.reduce((n, a) => n + Number(a.balance), 0);
  const totalIn = list.reduce((n, a) => n + a.inCount, 0);
  const totalOut = list.reduce((n, a) => n + a.outCount, 0);

  return (
    <ConsoleShell title="บัญชีธนาคาร" path="/accounts" search={{ placeholder: "ค้นหาบัญชี / เลขที่ / ธนาคาร...", params }}>
      <PageHeader
        title="บัญชีธนาคาร"
        subtitle="บัญชีที่ใช้รับเงินจากลูกค้าและโอนเงินออก"
        actions={<NewAccountButton shops={shops} />}
      />

      <div className="mb-5 flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.value || "all"}
            href={withParams("/accounts", params, { type: t.value || null })}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-[18px] py-2.5 text-sm font-medium transition-colors ${
              type === t.value ? "border-primary text-primary" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t.value === "" && <Landmark size={16} />}
            {t.label}
          </Link>
        ))}
      </div>

      {error ? (
        <Card className="flex items-start gap-3 p-5">
          <AlertTriangle className="mt-0.5 shrink-0 text-danger" size={20} />
          <div className="text-[13px] text-muted">{error}</div>
        </Card>
      ) : list.length === 0 ? (
        <Card className="px-5 py-[60px] text-center text-muted">
          <div className="mb-3.5 inline-grid size-16 place-items-center rounded-full bg-surface-alt text-soft">
            <Landmark size={26} />
          </div>
          <div>ยังไม่มีบัญชีในหมวดนี้</div>
        </Card>
      ) : (
        <>
          <div className="mb-[18px] flex flex-wrap items-center gap-x-3.5 gap-y-2 text-sm text-muted">
            <span>
              ทั้งหมด <strong className="text-ink">{list.length}</strong> บัญชี • ยอดรวม <strong className="text-ink">{fmtMoney(total)}</strong> • เข้า{" "}
              <strong className="text-ink">{totalIn.toLocaleString("th-TH")}</strong> รายการ • ออก{" "}
              <strong className="text-ink">{totalOut.toLocaleString("th-TH")}</strong> รายการ
            </span>
            <span className="ml-auto">
              <ResetAllButton ids={list.map((a) => a.id)} />
            </span>
          </div>
          <div className="mb-6 grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-[18px]">
            {list.map((a) => (
              <AccountCard key={a.id} a={a} shops={shops} />
            ))}
          </div>
        </>
      )}
    </ConsoleShell>
  );
}

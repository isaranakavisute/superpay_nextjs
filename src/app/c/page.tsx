import type { Metadata } from "next";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Logo } from "@/components/Logo";
import { QrCode } from "@/components/QrCode";
import { brandView, getBranding } from "@/lib/branding";
import { getCheckout, isToken, type Checkout } from "@/lib/checkout";
import { BankChip } from "@/components/ui";
import { fmtDateTime, fmtMoney } from "@/lib/format";
import { CheckoutLive, CopyButton, ReturnToShop } from "./CheckoutView";

// Public customer checkout (no login; see proxy.ts). The 32-hex token in ?t= is the only key.
export const metadata: Metadata = { title: "ชำระเงิน", robots: { index: false, follow: false } };

function Shell({ children, brand }: { children: React.ReactNode; brand: Awaited<ReturnType<typeof getBranding>> }) {
  return (
    <div className="grid min-h-screen place-items-center bg-(image:--auth-shell-bg) p-5">
      <div className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <Logo size={30} brand={{ ...brandView(brand), tagline: "" }} />
          <span className="text-[12px] text-muted">ชำระเงินอย่างปลอดภัย</span>
        </div>
        {children}
      </div>
    </div>
  );
}

const Final = ({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) => (
  <div className="px-6 py-12 text-center">
    <div className="mx-auto mb-3 grid size-16 place-items-center rounded-full bg-surface-alt">{icon}</div>
    <div className="text-lg font-semibold">{title}</div>
    <div className="mt-1 text-[13px] text-muted">{text}</div>
  </div>
);

export default async function CheckoutPage({ searchParams }: PageProps<"/c">) {
  const { t } = await searchParams;
  const brand = await getBranding();
  let c: Checkout | null = null;
  let down = false;
  if (isToken(t)) {
    try {
      c = await getCheckout(t);
    } catch {
      down = true;
    }
  }
  if (!c) {
    return (
      <Shell brand={brand}>
        {down ? <Final icon={<Clock size={28} className="text-warning" />} title="ระบบไม่ว่างชั่วคราว" text="กรุณาลองเปิดลิงก์นี้ใหม่อีกครั้งในอีกสักครู่" />
          : <Final icon={<XCircle size={28} className="text-muted" />} title="ไม่พบรายการชำระเงิน" text="ลิงก์ไม่ถูกต้องหรือหมดอายุ — ขอลิงก์ใหม่จากร้านค้า" />}
      </Shell>
    );
  }

  const tx = c.transaction;
  const head = (
    <div className="border-b border-line px-6 py-4 text-center">
      <div className="text-[13px] text-muted">{c.merchant.name}</div>
      <div className="text-[12px] text-soft">ออเดอร์ {tx.orderId}{tx.description ? ` · ${tx.description}` : ""}</div>
    </div>
  );
  if (tx.status !== "PENDING") {
    const final = {
      PAID: [<CheckCircle2 key="i" size={30} className="text-success" />, "ชำระเงินสำเร็จ", `ได้รับเงิน ${fmtMoney(tx.amount)} แล้ว${tx.paidAt ? ` เมื่อ ${fmtDateTime(tx.paidAt)}` : ""} — ปิดหน้านี้ได้เลย`],
      EXPIRED: [<Clock key="i" size={28} className="text-warning" />, "รายการหมดอายุ", "หากโอนเงินแล้ว กรุณาติดต่อร้านค้าพร้อมสลิป — อย่าโอนซ้ำ"],
      CANCELLED: [<XCircle key="i" size={28} className="text-danger" />, "รายการถูกยกเลิก", "ร้านค้ายกเลิกรายการนี้แล้ว — อย่าโอนเงินเข้ารายการนี้"],
      REFUNDED: [<XCircle key="i" size={28} className="text-muted" />, "คืนเงินแล้ว", "รายการนี้ถูกคืนเงินแล้ว"],
    }[tx.status] as [React.ReactNode, string, string];
    // v2 orders with return_url: "ปิดหน้านี้ได้เลย" is replaced by the way back to the shop.
    const text = c.returnUrl && tx.status === "PAID" ? final[2].replace(" — ปิดหน้านี้ได้เลย", "") : final[2];
    return (
      <Shell brand={brand}>
        {head}
        <Final icon={final[0]} title={final[1]} text={text} />
        {c.returnUrl && <ReturnToShop url={c.returnUrl} orderId={tx.orderId} refNo={c.ref} status={tx.status} />}
      </Shell>
    );
  }

  return (
    <Shell brand={brand}>
      {head}
      <div className="px-6 py-5 text-center">
        <div className="text-[13px] text-muted">ยอดที่ต้องชำระ</div>
        <div className="mt-0.5 flex items-center justify-center gap-2">
          <span className="text-[32px] font-bold text-primary tabular-nums">{fmtMoney(tx.amount)}</span>
          <CopyButton text={tx.amount.toFixed(2)} label="ยอด" />
        </div>
        <div className="text-[11.5px] text-warning">โอนให้ตรงยอดนี้ทุกสตางค์ เพื่อยืนยันอัตโนมัติ</div>

        {c.qrPayload ? (
          <>
            <div className="mt-4 flex justify-center"><QrCode value={c.qrPayload} size={230} /></div>
            <div className="mt-2 text-[12.5px] text-muted">สแกนด้วยแอปธนาคารใดก็ได้ · PromptPay</div>
          </>
        ) : (
          <div className="mt-4 rounded-lg bg-surface-alt p-3 text-[12.5px] text-muted">บัญชีนี้รับโอนผ่านเลขบัญชี — ไม่มี QR</div>
        )}

        <div className="mt-4 rounded-xl border border-line bg-surface-alt p-3.5 text-left text-[13px]">
          <div className="mb-2 text-[12px] text-muted">หรือโอนเข้าบัญชี</div>
          <div className="flex items-center gap-3">
            <BankChip code={c.account.bankCode} />
            <div className="min-w-0 flex-1">
              <div className="font-medium">{c.account.bankName}</div>
              {c.account.accountName && <div className="text-[12px] text-muted">{c.account.accountName}</div>}
              {c.account.accountNumber && <div className="font-mono tabular-nums">{c.account.accountNumber}</div>}
            </div>
            {c.account.accountNumber && <CopyButton text={c.account.accountNumber} label="เลขบัญชี" />}
          </div>
        </div>

        <CheckoutLive token={tx.id} status={tx.status} amount={tx.amount} expiresAt={tx.qrExpiry} hasSlip={c.hasSlip} slipLocked={c.slipLocked ?? c.hasSlip} slipProblems={c.slipProblems ?? null}
          order={{ ref: tx.orderId, amount: tx.amount, customerName: c.customerName ?? null, bankName: c.account.bankName, accountName: c.account.accountName, accountNo: c.account.accountNumber }} />
      </div>
    </Shell>
  );
}

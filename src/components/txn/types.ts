export type TxnKind = "payment" | "outflow" | "withdrawal";

export type TxnHit = {
  kind: TxnKind; ref: string; status: string; amount: string | null; fee?: string | null; createdAt: string; completedAt?: string | null; expiresAt?: string | null;
  name?: string | null; orderId?: string | null; source?: string | null;
  payerBankCode?: string | null; payerBankName?: string | null; payerAccount?: string | null; payerAccountFull?: string | null;
  accountBankCode?: string | null; accountBankName?: string | null; accountName?: string | null; accountLast4?: string | null;
  merchantId?: number | null; merchantName?: string | null; note?: string | null; reviewedBy?: string | null;
  slipReceivedAt?: string | null; slipReusedRef?: string | null; refundedAmount?: string | null;
  deletedAt?: string | null; deletedBy?: string | null; deleteReason?: string | null;
  category?: string | null; adminDone?: boolean | null; description?: string | null; outflowRef?: string | null;
};

export type TxnEvent = { id: number; at: string; actor: string | null; action: string; entity: string; detail: string | null };
export type TxnDelivery = { id: number; event: string; state: string; statusCode: number | null; attempts: number; responseMs: number | null; error: string | null; deliveredAt: string | null; url: string | null };
export type TxnSlip = { uploadedAt: string; uploadedBy: string | null; provider: string | null; transRef: string | null; decision: string | null; message: string | null; transferAt: string | null; amount: string | null; recheckAt: string | null; recheckAttempts: number | null };

export type TxnTimeline = {
  ref: string; kind: TxnKind; details: TxnHit | null; slip: TxnSlip | null; deliveries: TxnDelivery[]; events: TxnEvent[];
  purged: { createdAt: string; createDetail: string | null; deletedAt: string | null; deletedBy: string | null } | null;
};

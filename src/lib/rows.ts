// Row shapes returned by GET /api/console/:resource (see the backend's console.registry.js).
// Money/numeric columns arrive as strings to keep full precision.
import type { OutflowStatus, PaymentStatus } from "./domain";

type Money = string;
type When = string;

export type PaymentRow = {
  ref: string; merchantId: number | null; merchantName: string | null; customerName: string;
  payerBankCode: string | null; payerBankName: string | null; payerAccountMasked: string | null;
  accountBankCode: string; accountBankName: string; accountName: string | null; accountNo: string | null;
  amount: Money; fee: Money; commission: Money; currency: string; status: PaymentStatus; reviewedBy: string | null; createdAt: When;
  merchantOrderId: string | null; slipReceivedAt: When | null; reviewNote: string | null; completedAt: When | null; refundedAmount: Money;
  slipReusedRef: string | null; hasSlipImage: boolean; checkoutToken?: string | null; source?: string; expiresAt?: When | null;
  /** What the slip check read from the bank (null = no slip / not verified) and its decision. */
  slipAmount?: string | null; slipDecision?: string | null;
  slipTransferLeft?: string | null; slipTransferUsedBy?: string | null; customerLeftover?: string | null;
};

export type OutflowRow = {
  ref: string; merchantId: number | null; merchantName: string | null; category: string;
  bankAccountId: number | null; fromAccount: string | null; fromBankCode: string | null; fromAccountName: string | null;
  receiverName: string; receiverBankCode: string; receiverBankName: string; receiverAccount: string;
  amount: Money; fee: Money; currency: string; status: OutflowStatus; createdAt: When;
  source: string; description: string | null; reviewNote: string | null; completedAt: When | null; hasSlipImage: boolean;
  merchantRef: string | null;
  adminDone: boolean; adminDoneAt: When | null; adminDoneBy: string | null;
};

export type WithdrawalRow = {
  ref: string; merchantId: number; merchantName: string; merchantRef: string | null;
  receiverName: string; receiverBankCode: string; receiverBankName: string; receiverAccount: string;
  amount: Money; fee: Money; note: string | null; status: OutflowStatus; approvedBy: string | null; rejectReason: string | null;
  outflowRef: string | null; outflowStatus: OutflowStatus | null; hasSlipImage: boolean;
  p2pStatus: string | null; p2pRef: string | null; merchantBalance: Money; merchantMinBalance: Money;
  createdAt: When; decidedAt: When | null;
};

export type AccountRow = {
  id: number; label: string; bankCode: string; bankName: string; accountName: string | null; accountNo: string | null;
  accountType: "receive" | "send" | "both"; status: "active" | "inactive";
  // Counted since countersResetAt (null = since the beginning).
  inCount: number; outCount: number; balance: Money; receivedTotal: Money; sentTotal: Money;
  lastPaymentAt: When | null; countersResetAt: When | null; createdAt: When;
};

export type MerchantRow = {
  id: number; name: string; slug: string; feePercent: Money; feeFlat: Money; outFeePercent: Money; outFeeFlat: Money; outFeeTotal: Money; status: "active" | "suspended" | "pending";
  parentId: number | null; depth: number; path: number[]; allowSubMerchants: boolean; commissionEarned: Money;
  kycStatus: "pending" | "verified" | "rejected"; minBalance: Money; createdAt: When;
  depositTotal: Money; depositCount: number; feeTotal: Money; withdrawTotal: Money; withdrawCount: number;
  currentBalance: Money; pendingCount: number;
  creditAdjustments: Money; apiKeysActive: number; apiKeysTotal: number; contactEmail: string | null; contactPhone: string | null; openingBalance: Money;
};

export type UserRow = {
  id: number; username: string; fullName: string; email: string | null; phone: string | null;
  roleCode: string; roleName: string; status: "active" | "inactive" | "locked" | "deleted"; lastLoginAt: When | null; createdAt: When; twoFactor?: boolean;
};

export type RoleRow = { code: string; name: string; description: string; permissions: string[]; memberCount: number };

export type ApiLogRow = {
  id: number; createdAt: When; merchantId: number | null; merchantName: string | null; keyMerchantId: number | null; keyMerchantName: string | null;
  keyPrefix: string | null; keyUser: string | null; method: string; path: string; query: string | null; status: number;
  errorCode: string | null; durationMs: number; ip: string | null; userAgent: string | null;
  source: "api" | "console"; actor: string | null;
};

export type AuditRow = { id: number; actor: string; action: string; entity: string; entityRef: string | null; detail: string | null; ip: string | null; createdAt: When };

export type ChannelRow = {
  id: number; name: string; channelType: "telegram" | "line" | "facebook" | "email" | "sms"; provider: string;
  account: string; eventsToday: number; status: "active" | "inactive" | "error"; enabled: boolean;
  config: Record<string, unknown>; accountIds: number[]; endpointIds: number[]; secretsSet: string[];
  lastEventAt: When | null; updatedAt: When; createdAt: When;
};

export type EventRow = {
  id: number | string; channelId: number; channelName: string; channelType: ChannelRow["channelType"]; sender: string;
  amount: Money | null; summary: string; status: "new" | "ambiguous" | "matched" | "rejected" | "manual";
  paymentRef: string | null; orderId: string | null; orderAmount: Money | null; orderStatus: string | null;
  direction: "in" | "out"; rawPayload: unknown; accountLabel: string | null; note: string | null;
  recheckAt: When | null; decidedBy: string | null; receivedAt: When; hasSlipImage: boolean;
};

export type DeviceRow = {
  id: number; name: string; deviceUid: string; platform: "android" | "ios"; model: string | null; phoneMasked: string;
  channelId: number | null; channelName: string | null; accountLabel: string | null; bankCode: string | null; bankName: string | null;
  appVersion: string; batteryPct: number | null; status: "online" | "offline" | "disabled"; lastSeenAt: When | null; online: boolean;
};

export type WebhookRow = {
  id: number | string; merchantId: number; merchantName: string; paymentRef: string | null; orderId: string | null;
  event: string; url: string; statusCode: number | null; attempts: number; responseMs: number | null; error: string | null;
  state: "delivered" | "pending" | "failed"; payload: unknown; responseBody: string | null; signature: string | null;
  nextRetryAt: When | null; deliveredAt: When;
};

export type AlertRow = { id: number; name: string; chatMasked: string; events: string[]; status: "active" | "paused"; lastSentAt: When | null };

export type SettingRow = { key: string; group: string; label: string; value: string; updatedAt: When };

export type P2pRow = {
  ref: string; paymentRef: string; paymentMerchant: string | null; paymentStatus: string | null;
  withdrawalRef: string; withdrawalMerchant: string | null; withdrawalStatus: string | null;
  amount: Money; receiverName: string; receiverAccount: string | null;
  status: "reserved" | "settled" | "disputed" | "released"; disputeReason: string | null;
  matchedAt: When; settledAt: When | null; releasedAt: When | null;
};

/** A bank transfer that paid only part of its amount: its left-over and the exact order amount that would use it. */
export type TransferLeftoverRow = {
  id: number | string; transRef: string; merchantId: number | null; merchantName: string | null;
  bankCode: string | null; accountNo: string | null; accountName: string | null;
  transferAt: When | null; amount: Money; used: Money; left: Money; leftoverUntil: When | null; status: "open" | "expired" | "used";
  customerName: string | null; firstRef: string | null; firstOrderId: string | null; note: string | null;
  paidOrders: { ref: string; orderId: string | null; amount: Money; kind: string; at: When }[] | null;
};

export type DoubleCreditRow = {
  id: number | string; merchantId: number | null; merchantName: string | null;
  creditedRef: string; creditedOrderId: string | null; creditedCreatedAt: When | null; creditedStatus: string | null; creditedFee: Money | null;
  slipHolderRef: string; slipHolderOrderId: string | null; slipHolderPaidAt: When | null;
  amount: Money; manualApproved: boolean; approvedBy: string | null; approvedAt: When | null; reason: string; bankRef: string | null;
  confidence: "confirmed" | "likely" | "review"; status: "open" | "resolved"; resolution: string | null;
  resolutionKind: "clawback" | "not_duplicate" | null; resolvedBy: string | null; resolvedAt: When | null; detectedAt: When;
  creditedHasSlip: boolean; slipHolderHasSlip: boolean;
};

// Shop-user permissions (mirror of superpayment_nodejs/src/merchant-api/permission-catalog.js).
export const MERCHANT_PERMISSIONS = [
  { code: "view_dashboard", label: "ดูภาพรวม ยอดเงิน และข้อมูลร้าน", endpoints: "GET /dashboard, /balance, /balance/line-summary, /profile" },
  { code: "view_transactions", label: "ดูรายการชำระเงิน / payout / คำขอถอน", endpoints: "GET /transactions, /payment/order, /payouts, /payout, /withdrawal/requests" },
  { code: "create_payment", label: "สร้างรายการชำระเงิน และแนบ/ตรวจสลิป", endpoints: "POST /payment/create, /payment/slip/*, /payment/:ref/slip, /collect" },
  { code: "cancel_payment", label: "ยกเลิกรายการชำระเงิน", endpoints: "PATCH /transactions/:id/cancel" },
  { code: "create_payout", label: "สั่งจ่ายเงินออก (payout)", endpoints: "POST /payout/create, /payout/bulk" },
  { code: "request_withdrawal", label: "ขอถอนเงิน", endpoints: "POST /withdrawal/request/create · ถอนเงินใน Portal" },
  { code: "manage_accounts", label: "จัดการบัญชีรับเงิน", endpoints: "GET/POST/DELETE /payment/accounts · บัญชีใน Portal" },
  { code: "manage_webhooks", label: "จัดการ webhook", endpoints: "GET/POST /webhooks · webhook ใน Portal" },
  { code: "manage_api_keys", label: "ออก / เพิกถอน API key ใน Portal", endpoints: "Merchant Portal → ตั้งค่า → API Keys" },
  { code: "manage_sub_merchants", label: "สร้าง / จัดการร้านย่อย", endpoints: "Merchant Portal → ร้านย่อย" },
] as const;
export type MerchantPermission = (typeof MERCHANT_PERMISSIONS)[number]["code"];
export type MerchantTier = "owner" | "staff" | "viewer";
export type MerchantPermMatrix = Record<MerchantTier, string[]>;
export const DEFAULT_MERCHANT_PERMS: MerchantPermMatrix = {
  owner: MERCHANT_PERMISSIONS.map((p) => p.code),
  staff: ["view_dashboard", "view_transactions", "create_payment"],
  viewer: ["view_dashboard", "view_transactions"],
};

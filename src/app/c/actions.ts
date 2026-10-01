"use server";

import { isToken, postCheckoutSlip } from "@/lib/checkout";

/** Customer uploads their transfer slip (the checkout token authorises it). */
export async function uploadSlip(token: string, file: { mime: string; data: string }) {
  if (!isToken(token)) return { ok: false as const, error: "ลิงก์ชำระเงินไม่ถูกต้อง" };
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.mime)) return { ok: false as const, error: "กรุณาเลือกรูปสลิป (PNG / JPG / WEBP)" };
  if (file.data.length > 11_000_000) return { ok: false as const, error: "รูปต้องไม่เกิน 8 MB" };
  return postCheckoutSlip(token, { image: file.data, mime: file.mime });
}

"use server";

import { revalidatePath } from "next/cache";
import { consoleWrite, type ActionResult } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

export type Rates = { feePercent: number; feeFlat: number; outFeePercent: number; outFeeFlat: number };

/** Change one shop's fee rates (new transactions only); the backend refuses rates below the parent's or above a child's. */
export async function saveRates(merchantId: number, r: Rates): Promise<ActionResult> {
  if (!Number.isInteger(merchantId) || merchantId <= 0) return { ok: false, error: "ร้านไม่ถูกต้อง" };
  if ([r.feePercent, r.feeFlat, r.outFeePercent, r.outFeeFlat].some((v) => !Number.isFinite(v) || v < 0)) return { ok: false, error: "กรอกอัตราเป็นตัวเลข ≥ 0" };
  if (r.feePercent > 100 || r.outFeePercent > 100) return { ok: false, error: "อัตรา % ต้องไม่เกิน 100" };
  const me = await getSessionUser();
  if (!me) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  const res = await consoleWrite("POST", `/api/console/merchants/${merchantId}/rates`, me.username, r);
  if (res.ok) for (const p of ["/merchant-dashboard", "/merchants"]) revalidatePath(p);
  return res;
}

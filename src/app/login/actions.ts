"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyLogin } from "@/lib/api";
import { createSession, destroySession } from "@/lib/session";

export type LoginState = { error?: string; needCode?: boolean };

/** Only allow same-site relative paths as a post-login destination. */
function safeReturnTo(value: FormDataEntryValue | null) {
  const s = typeof value === "string" ? value : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/dashboard";
}

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const text = (key: string) => {
    const v = form.get(key);
    return typeof v === "string" ? v : "";
  };
  const username = text("username");
  const password = text("password");

  let user;
  try {
    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim();
    user = await verifyLogin(username, password, ip, text("code").trim() || undefined);
  } catch {
    return { error: "ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง" };
  }
  if (user === "invalid") return { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
  if (user === "totp_required") return { needCode: true };
  if (user === "totp_invalid") return { needCode: true, error: "รหัส 2FA ไม่ถูกต้องหรือหมดอายุแล้ว" };

  try {
    await createSession(user);
  } catch (err) {
    // e.g. SESSION_SECRET missing in production — say so instead of crashing the page.
    console.error("login: could not create session:", err);
    return { error: "ระบบยังตั้งค่าไม่ครบ (SESSION_SECRET) กรุณาติดต่อผู้ดูแลระบบ" };
  }
  // Outside the try: redirect() works by throwing.
  redirect(safeReturnTo(form.get("returnTo")));
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

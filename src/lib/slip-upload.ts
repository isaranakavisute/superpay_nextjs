import { consoleWrite, type ActionResult } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

const MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX = 5 * 1024 * 1024;

/**
 * Admin slip upload as a plain request body (route handler), not a server action (3 Nov 2026): React's server-action
 * decoder refuses a string argument longer than ~1 M characters ("Maximum array nesting exceeded"), so a base64 slip
 * of a picture over ~750 KB never reached the backend and the admin saw "Minified React error #441".
 * Body = the image bytes, content-type = its type. Answers JSON: { ok: true, … } or { ok: false, error } (Thai).
 */
export async function slipUpload(req: Request, backendPath: string): Promise<Response> {
  const me = await getSessionUser();
  if (!me) return Response.json({ ok: false, error: "กรุณาเข้าสู่ระบบใหม่" } satisfies ActionResult, { status: 401 });
  const mime = (req.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!MIMES.has(mime)) return Response.json({ ok: false, error: "รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP" }, { status: 400 });
  const bytes = Buffer.from(await req.arrayBuffer());
  if (bytes.length < 100) return Response.json({ ok: false, error: "ไฟล์สลิปว่างหรือเสียหาย — เลือกรูปใหม่" }, { status: 400 });
  if (bytes.length > MAX) return Response.json({ ok: false, error: "ไฟล์ใหญ่เกิน 5 MB" }, { status: 400 });
  const r = await consoleWrite("POST", backendPath, me.username, { mime, data: bytes.toString("base64") });
  return Response.json(r);
}

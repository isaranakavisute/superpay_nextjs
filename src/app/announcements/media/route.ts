import { viewerHeaders } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

/**
 * Upload one picture / video for an announcement (raw file body, up to 50 MB). Not under proxy.ts (see its matcher):
 * the proxy buffers at most 10 MB of a body, so this route checks the session itself; the backend checks the
 * operator's permission (settings.manage) and the file.
 */
export async function POST(req: Request) {
  if (!(await getSessionUser())) return Response.json({ error: { message: "กรุณาเข้าสู่ระบบใหม่" } }, { status: 401 });
  const r = await fetch(`${BASE}/api/console/support-bot/announcements/media`, {
    method: "POST",
    headers: { ...(await viewerHeaders()), "content-type": req.headers.get("content-type") ?? "application/octet-stream", "x-file-name": req.headers.get("x-file-name") ?? "" },
    body: req.body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  return new Response(r.body, { status: r.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

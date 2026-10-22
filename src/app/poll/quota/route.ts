import { getLiveQuota } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

/** Live slip-checker quota for the payments page header (polled every 30 s). */
export async function GET() {
  if (!(await getSessionUser())) return Response.json({ error: "unauthorized" }, { status: 401 });
  try {
    return Response.json({ quota: await getLiveQuota() }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ quota: null }, { headers: { "cache-control": "no-store" } });
  }
}

import { viewerHeaders } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

/** EasySlip calls per day for the quota card's "ดูรายวัน" table (signed-in operators; the backend checks the role). */
export async function GET() {
  if (!(await getSessionUser())) return Response.json({ error: "unauthorized" }, { status: 401 });
  const r = await fetch(`${BASE}/api/console/config/quota/daily?days=35`, { headers: await viewerHeaders(), cache: "no-store" }).catch(() => null);
  if (!r?.ok) return Response.json({ error: "unavailable" }, { status: 502 });
  return new Response(r.body, { headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

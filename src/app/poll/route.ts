import { getAlerts } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

/** Lightweight poll for the shell: how many payouts are waiting (drives the alert sound). */
export async function GET() {
  if (!(await getSessionUser())) return Response.json({ error: "unauthorized" }, { status: 401 });
  try {
    const a = await getAlerts();
    return Response.json({ outflows: a.queues.outflows }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ outflows: null }, { headers: { "cache-control": "no-store" } });
  }
}

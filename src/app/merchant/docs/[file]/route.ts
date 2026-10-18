import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { MERCHANT_DOCS } from "@/lib/merchant-docs";
import { getPortalUser } from "@/lib/session";
import { portalCall, requirePortal } from "@/lib/portal";

/** A manual PDF, for signed-in shop users only. `?download=1` saves it instead of showing it. */
export async function GET(req: Request, ctx: RouteContext<"/merchant/docs/[file]">) {
  // Relative Location: inside the container req.url carries the internal host (0.0.0.0:4600), not the public one.
  if (!(await getPortalUser())) return new Response(null, { status: 302, headers: { location: "/merchant/login?returnTo=/merchant/docs" } });
  const { file } = await ctx.params;
  const doc = MERCHANT_DOCS.find((d) => d.file === file);
  if (!doc) return new Response("Not found", { status: 404 });
  const dir = path.join(process.cwd(), "content", "merchant-docs");
  // The API manual printed for a shop's own webhook (real callback curl commands): api-v1.endpoint-<id>.pdf, when there is one.
  let name: string = doc.file;
  if (doc.file === "api-v1.pdf") {
    const r = await portalCall<{ endpointId: number | null }>(await requirePortal("/merchant/docs"), "GET", "/callback-examples");
    const own = r.ok && r.endpointId ? `api-v1.endpoint-${r.endpointId}.pdf` : null;
    if (own && (await access(path.join(dir, own)).then(() => true, () => false))) name = own;
  }
  const data = await readFile(path.join(dir, name));
  const download = new URL(req.url).searchParams.has("download");
  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${download ? "attachment" : "inline"}; filename="OptionPay-${doc.file}"`,
      // The API manual differs by shop (its own real callbacks): never reuse a cached copy across shops.
      "cache-control": doc.file === "api-v1.pdf" ? "private, no-store" : "private, max-age=300",
      "x-content-type-options": "nosniff",
    },
  });
}

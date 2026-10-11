import { readFile } from "node:fs/promises";
import path from "node:path";
import { MERCHANT_DOCS } from "@/lib/merchant-docs";
import { getPortalUser } from "@/lib/session";

/** A manual PDF, for signed-in shop users only. `?download=1` saves it instead of showing it. */
export async function GET(req: Request, ctx: RouteContext<"/merchant/docs/[file]">) {
  // Relative Location: inside the container req.url carries the internal host (0.0.0.0:4600), not the public one.
  if (!(await getPortalUser())) return new Response(null, { status: 302, headers: { location: "/merchant/login?returnTo=/merchant/docs" } });
  const { file } = await ctx.params;
  const doc = MERCHANT_DOCS.find((d) => d.file === file);
  if (!doc) return new Response("Not found", { status: 404 });
  const data = await readFile(path.join(process.cwd(), "content", "merchant-docs", doc.file));
  const download = new URL(req.url).searchParams.has("download");
  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${download ? "attachment" : "inline"}; filename="OptionPay-${doc.file}"`,
      "cache-control": "private, max-age=300",
      "x-content-type-options": "nosniff",
    },
  });
}

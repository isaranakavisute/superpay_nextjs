import { forward } from "@/lib/merchant-proxy";

// Merchant REST API v1 (see /api-docs) — served by the backend, exposed on this host.
const handler = async (req: Request, ctx: RouteContext<"/api/v1/[...path]">) => {
  const { path } = await ctx.params;
  return forward(req, `/api/v1/${path.map(encodeURIComponent).join("/")}`);
};

export { handler as GET, handler as POST, handler as PATCH, handler as DELETE, handler as PUT };

import { forward } from "@/lib/merchant-proxy";

// Merchant REST API v2 (POST /payment/create with return_url) — served by the backend, exposed on this host like v1.
const handler = async (req: Request, ctx: { params: Promise<{ path: string[] }> }) => {
  const { path } = await ctx.params;
  return forward(req, `/api/v2/${path.map(encodeURIComponent).join("/")}`);
};

export { handler as GET, handler as POST, handler as PATCH, handler as DELETE, handler as PUT };

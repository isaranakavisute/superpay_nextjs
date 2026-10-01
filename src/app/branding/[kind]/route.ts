import { fetchAsset, getBranding } from "@/lib/branding";

/** Public logo / favicon (shown on the login page and browser tab). The favicon falls back to the logo. */
export async function GET(_req: Request, ctx: RouteContext<"/branding/[kind]">) {
  const { kind } = await ctx.params;
  if (kind !== "logo" && kind !== "favicon") return new Response("Not found", { status: 404 });
  const { brand } = await getBranding();
  const id = kind === "favicon" ? brand.faviconAsset ?? brand.logoAsset : brand.logoAsset;
  if (!id) return Response.redirect(new URL("/icon.svg", _req.url), 302);
  const r = await fetchAsset(id);
  if (!r.ok) return new Response("Not found", { status: 404 });
  return new Response(r.body, { headers: { "content-type": r.headers.get("content-type") ?? "application/octet-stream", "cache-control": "public, max-age=300", "x-content-type-options": "nosniff" } });
}

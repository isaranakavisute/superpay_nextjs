import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSessionUser } from "@/lib/session";

/** The admin manual PDF, for signed-in admins only. `?download=1` saves it instead of showing it. */
export async function GET(req: Request) {
  if (!(await getSessionUser())) return new Response(null, { status: 302, headers: { location: "/login" } });
  const data = await readFile(path.join(process.cwd(), "content", "admin-docs", "admin-manual.pdf"));
  const download = new URL(req.url).searchParams.has("download");
  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${download ? "attachment" : "inline"}; filename="OptionPay-Admin-User-Manual.pdf"`,
      "cache-control": "private, max-age=300",
      "x-content-type-options": "nosniff",
    },
  });
}

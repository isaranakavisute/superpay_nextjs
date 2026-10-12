const BASE = process.env.BACKEND_URL ?? "http://localhost:3001";

/** Telegram webhook for @OptionPayBot → backend (which checks the secret header and replies in the chat). */
export async function POST(req: Request) {
  try {
    const r = await fetch(`${BASE}/api/telegram/slip-bot`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": req.headers.get("x-telegram-bot-api-secret-token") ?? "" },
      body: await req.text(),
      cache: "no-store",
    });
    return new Response(await r.text(), { status: r.status, headers: { "content-type": "application/json" } });
  } catch {
    return Response.json({ ok: false }, { status: 502 });
  }
}

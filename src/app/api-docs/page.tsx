import type { Metadata } from "next";
import { headers } from "next/headers";
import { ConsoleShell } from "@/components/shell/ConsoleShell";
import { PageHeader } from "@/components/ui";
import { getBranding } from "@/lib/branding";
import { LOGIN, SECTIONS, type Ep } from "./docs";
import { Endpoint, ToggleAll } from "./Endpoint";

export const metadata: Metadata = { title: "API Documentation — Option Pay Admin" };

const code = "rounded bg-surface-alt px-1.5 py-0.5 font-mono text-[12.5px]";
const sub = "mb-4 text-[13.5px] leading-[1.7] text-muted [&_code]:rounded [&_code]:bg-surface-alt [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12.5px] [&_code]:text-ink [&_strong]:text-ink";

export default async function ApiDocsPage() {
  const h = await headers();
  const site = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:4600"}`;
  const base = `${site}/api/v1`;
  const { brand } = await getBranding();
  const fill = (s: string) => s.replaceAll("{BASE}", base).replaceAll("{SITE}", site);
  // Placeholders are resolved here: client components can't receive functions.
  const ep = (e: Ep): Ep => ({ ...e, body: e.body && fill(e.body), res: e.res && fill(e.res), note: e.note && fill(e.note) });
  const nav = [{ id: "auth", nav: "Authentication" }, ...SECTIONS];

  return (
    <ConsoleShell title="API Documentation" path="/api-docs">
      <PageHeader title={`${brand.siteName} API`} subtitle="Payment Gateway สำหรับนักพัฒนา — REST API v1 · คลิกที่แต่ละเส้นเพื่อดู spec" />
      <div className="grid items-start gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="rounded-xl border border-line bg-surface p-4 lg:sticky lg:top-24">
          <h3 className="mb-2 text-[11px] font-semibold tracking-[1px] text-soft uppercase">API V1</h3>
          {nav.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13.5px] text-muted transition hover:bg-surface-alt hover:text-ink">
              <span className="size-1.5 rounded-full bg-primary" /> {s.nav}
            </a>
          ))}
          <div className="mt-3 border-t border-line pt-3">
            <div className="mb-1 text-[10.5px] font-semibold tracking-[1px] text-soft">BASE URL</div>
            <code className="block font-mono text-[12px] break-all text-primary">{base}</code>
          </div>
        </nav>

        <div className="min-w-0">
          <section id="auth" className="mb-8 scroll-mt-24">
            <h2 className="mb-2 text-xl font-semibold">Authentication</h2>
            <div className={sub}>
              ทุก request ใต้ <code>/api/v1/</code> ต้องส่ง <code>X-API-Key</code> (<code>ak_live_…</code>) + <code>X-Timestamp</code> (unix วินาที) + <code>X-Signature</code> = HMAC-SHA256(secret, <code>{"timestamp.METHOD.path.body"}</code>) แบบ hex — <strong>บังคับทุก endpoint</strong> (ยกเว้นหน้า checkout / QR / แนบสลิปของลูกค้า) · secret = secret key ของผู้ใช้ (<code>sk_live_…</code>) หรือ signing secret ของ key ระดับร้าน (<code>ss_live_…</code>) และห้ามส่งไปกับคำขอ · ออก key ระดับร้านในหน้า <a href="/merchants" className="text-primary">ร้านค้า</a> (ได้ signing secret พร้อมกัน) หรือผู้ใช้ร้านค้าสร้างเองใน Merchant Portal → ตั้งค่า · ตัวอย่างจริงทุก endpoint (curl + Next.js) อยู่ในคู่มือ API ของ Merchant Portal
            </div>
            <pre className="mb-3 overflow-x-auto rounded-lg border border-line bg-bg px-4 py-3 font-mono text-[12.5px] leading-[1.6]">{`API_KEY="ak_live_YOUR_API_KEY"; SECRET="sk_live_YOUR_SECRET_KEY"   # SECRET ห้ามส่ง
BODY='{"amount":100,"orderId":"ORD-001"}'
TS=$(date +%s)
SIG=$(printf '%s' "$TS.POST./api/v1/payment/create.$BODY" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $NF}')
curl -X POST ${base}/payment/create \\
  -H "X-API-Key: $API_KEY" -H "X-Timestamp: $TS" -H "X-Signature: $SIG" \\
  -H "Content-Type: application/json" --data-raw "$BODY"`}</pre>
            <Endpoint ep={ep(LOGIN)} />
            <div className={`${sub} mt-3 rounded-lg border-l-[3px] border-primary bg-primary-50 px-3.5 py-2.5`}>
              <strong>Key format</strong>: API key <code>ak_live_</code> · secret key <code>sk_live_</code> · signing secret <code>ss_live_</code> (+ base64url) — key รูปแบบเดิม (<code>sk_live_</code> เป็น API key) ถูกยกเลิกแล้ว · Error ทุกเส้นมีรูปแบบ <span className={code}>{`{ "error": { "code", "message", "details" } }`}</span>
            </div>
          </section>

          <ToggleAll />

          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="mb-8 scroll-mt-24">
              <h2 className="mb-2 text-xl font-semibold">{s.title}</h2>
              {s.sub && <div className={sub} dangerouslySetInnerHTML={{ __html: fill(s.sub) }} />}
              {s.eps.map((e) => <Endpoint key={e.m + e.p} ep={ep(e)} />)}
            </section>
          ))}
        </div>
      </div>
    </ConsoleShell>
  );
}

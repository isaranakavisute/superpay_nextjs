// Background page-timing check (user, 1 Nov 2026: "constantly check the loading time even if nobody asks yet"):
// every PROBE_EVERY_MS this server opens each console menu page itself, one at a time, as the read-only identity
// "page-probe", and records how long the page took to build (data + rendering). The loading popup's countdown =
// latest server time for that page + the admin's own connection time (lib/load-times.ts). Skipped while the server is busy.
import { cpus, loadavg } from "node:os";
import { NAV_GROUPS, TOP_ITEMS } from "@/components/shell/nav";
import { probeSessionCookie } from "@/lib/session";

const EVERY = Number(process.env.PROBE_EVERY_MS ?? 5 * 60_000);
const FIRST = Number(process.env.PROBE_FIRST_MS ?? 60_000);
const GAP = 2_000;          // between two pages: never a burst
// 5-min load average above this = skip the round (backup, deploy). Scaled to the CPUs (1 Nov 2026: a fixed 3 on this
// 4-CPU server, which runs at ~4 in the daytime, would have skipped almost every daytime round).
const BUSY_LOAD = Math.max(3, cpus().length * 1.25);
const KEEP = 12;            // last hour of rounds per page
const PAGES = [...TOP_ITEMS, ...NAV_GROUPS.flatMap((g) => g.items)].filter((i) => i.key !== "profile");

type ProbeStore = { times: Map<string, number[]>; at: number; rounds: number; skipped: number };
export const probeStore: ProbeStore = ((globalThis as { __opPageProbe?: ProbeStore }).__opPageProbe ??= { times: new Map(), at: 0, rounds: 0, skipped: 0 });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function timePage(href: string): Promise<number | null> {
  const t0 = performance.now();
  try {
    const r = await fetch(`http://127.0.0.1:${process.env.PORT ?? 4600}${href}`, { headers: { cookie: probeSessionCookie(), "x-page-probe": "1" }, redirect: "manual", cache: "no-store" });
    await r.arrayBuffer();   // the whole page, as a browser would receive it
    return r.status === 200 ? Math.round(performance.now() - t0) : null;
  } catch {
    return null;
  }
}

async function round() {
  if (loadavg()[1] > BUSY_LOAD) { probeStore.skipped += 1; return; }
  const slow: string[] = [];
  for (const p of PAGES) {
    if (loadavg()[0] > BUSY_LOAD * 1.5) { probeStore.skipped += 1; break; }   // got busy meanwhile: stop this round
    const ms = await timePage(p.href);
    if (ms != null) {
      probeStore.times.set(p.key, [...(probeStore.times.get(p.key) ?? []), ms].slice(-KEEP));
      if (ms > 3000) slow.push(`${p.key} ${ms}ms`);
    }
    await sleep(GAP);
  }
  probeStore.at = Date.now(); probeStore.rounds += 1;
  console.log(JSON.stringify({ msg: "page probe round", pages: PAGES.length, measured: probeStore.times.size, slow }));
}

let started = false;
export function startPageProbe() {
  if (started || process.env.PAGE_PROBE === "off") return;
  started = true;
  const run = () => round().catch(() => {}).finally(() => setTimeout(run, EVERY).unref());
  setTimeout(run, FIRST).unref();
}

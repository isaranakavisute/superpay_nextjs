// How long console pages take to open (1 Nov 2026): the loading popup counts down from an estimate instead of just
// spinning. Best: the background check's fresh server time for the page (lib/page-probe.ts) + this browser's connection
// time; else this browser's own last loads (≥ MIN_OWN), then every admin's (/api/page-times), else none — the popup
// then shows the time elapsed. The estimate is the slower end of recent loads (≈ 75th percentile) so the count rarely runs out early.

const KEY = "op-page-times";
const KEEP = 10;
const MIN_OWN = 3;
type Times = Record<string, number[]>;

const readOwn = (): Times => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Times; } catch { return {}; }
};

/** ≈ 75th percentile of a list of milliseconds (null when empty). */
export function slowEnd(ms: number[]): number | null {
  if (!ms.length) return null;
  const s = [...ms].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * 0.75))];
}

let shared: Record<string, number> = {};
let server: Record<string, number> = {};   // background check: server time per page, refreshed every few minutes
const NET_DEFAULT = 400;                    // connection time assumed until this browser has its own history
let sharedAt = 0;
/** Every admin's recent estimates, fetched at most once a minute. */
export function refreshShared() {
  if (Date.now() - sharedAt < 60_000) return;
  sharedAt = Date.now();
  fetch("/api/page-times", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((j) => { if (j?.estimates) shared = j.estimates; if (j?.server) server = j.server; }).catch(() => {});
}

const median = (ms: number[]) => { const s = [...ms].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };

/**
 * Expected load time of a page in ms, or null when nothing is known yet. With the background check's fresh server time:
 * server time + this browser's connection time (its own loads minus the server part, else NET_DEFAULT). Without it:
 * this browser's own loads, then every admin's.
 */
export function estimateFor(page: string): number | null {
  const own = readOwn()[page] ?? [];
  const srv = server[page];
  if (srv != null) {
    const ownMid = own.length >= MIN_OWN ? median(own) : null;
    const net = ownMid != null ? Math.min(5000, Math.max(0, ownMid - srv)) : NET_DEFAULT;
    return srv + net;
  }
  if (own.length >= MIN_OWN) return slowEnd(own);
  return shared[page] ?? slowEnd(own);
}

/** A page that got stuck while opening and was retried automatically (attempt 1 = opened again, 2 = full reload). */
export function recordStuck(page: string, ms: number, attempt: number) {
  fetch("/api/page-times", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ page, ms: Math.round(ms), stuck: attempt }), keepalive: true }).catch(() => {});
}

/** Remember one load (this browser + the shared list). Loads over 2 minutes are left out. */
export function recordLoad(page: string, ms: number) {
  if (!(ms > 0 && ms < 120_000)) return;
  const all = readOwn();
  all[page] = [...(all[page] ?? []), Math.round(ms)].slice(-KEEP);
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* storage full / private mode */ }
  fetch("/api/page-times", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ page, ms: Math.round(ms) }) })
    .then((r) => (r.ok ? r.json() : null)).then((j) => { if (j?.estimates) shared = j.estimates; if (j?.server) server = j.server; }).catch(() => {});
}

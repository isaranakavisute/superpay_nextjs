// Statement ↔ payout matching (เปรียบเทียบกับ bank statement). Same rules as the offline report the user approved (29 Oct 2026):
//  • only OUTGOING TRANSFERS from the statements; each is matched to payouts of its own date
//  • SCB / KBANK: exact amount + account last-4 and/or name, closest to the time the admin marked it done;
//    then the same, but the payout was marked done the day before/after (still a normal match)
//  • BBL (no time / account / name): exact amount + destination type + order, then amount + type in any order
//  • one payout ↔ one statement line. Everything unmatched is red, with an investigation record.
import type { BankKey, StmtRow, StmtInfo } from "./parse";

export type Payout = {
  ref: string; merchant: string; amount: number; receiverName: string; bank: string; account: string;
  status: string; created: string; done: string; doneBy: string;   // Bangkok "YYYY-MM-DD HH:MM:SS"
};
export type Row = StmtRow & { no: string };
export type Finding = { ok: boolean | null; text: string };
export type Match = { payout: Payout; how: "detail" | "order" | "amount"; acct?: boolean; bank?: boolean; name?: boolean; gap?: number; offday?: boolean };
export type CaseCat = "own" | "date" | "dup" | "known" | "none";
export type Case = {
  row: Row; cat: CaseCat; verdict: string; next: string[]; src: StmtInfo; ownerSame: boolean; before: number | null;
  sameAccount: (Payout & { stmt: string })[]; sameName: (Payout & { stmt: string })[]; ourAccount: string[];
  near: Payout[]; neighbours: { row: StmtRow; label: string; me: boolean }[];
};
export type Result = {
  from: string; to: string; rows: Row[]; matched: Row[]; unmatched: Row[]; match: Map<string, Match>;
  cases: Case[]; info: Partial<Record<BankKey, StmtInfo>>; payoutsInPeriod: number;
};

export const PAYOUTS_SINCE = "2026-10-15";   // the system keeps payouts from this day on
export const BANK_NAME: Record<BankKey, string> = { SCB: "ธนาคารไทยพาณิชย์", KBANK: "ธนาคารกสิกรไทย", BBL: "ธนาคารกรุงเทพ" };
const PFX: Record<BankKey, string> = { SCB: "ไทยพาณิชย์", KBANK: "กสิกร", BBL: "กรุงเทพ" };
const TH: Record<string, string> = {
  SCB: "ไทยพาณิชย์", KBANK: "กสิกรไทย", BBL: "กรุงเทพ", KTB: "กรุงไทย", GSB: "ออมสิน", TTB: "ทีทีบี", BAY: "กรุงศรี", BAAC: "ธ.ก.ส.", UOB: "ยูโอบี",
  CIMB: "ซีไอเอ็มบี", KKP: "เกียรตินาคิน", GHB: "อาคารสงเคราะห์", LHBANK: "แลนด์ แอนด์ เฮ้าส์", TISCO: "ทิสโก้", TRUEMONEY: "ทรูมันนี่",
};
export const th = (c: string | null | undefined) => (c ? TH[c] ?? c : "");
export const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const dmy = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const digits = (s: string) => s.replace(/\D/g, "");
const toMin = (s: string) => Date.parse(s.replace(" ", "T") + (s.length <= 16 ? ":00" : "") + "+07:00") / 60_000;
const shiftDay = (d: string, n: number) => new Date(Date.parse(d + "T00:00:00Z") + n * 86_400_000).toISOString().slice(0, 10);

const TITLES = /^(ชื่อ|นางสาว|น\.ส\.|นาย|นาง|ด\.ช\.|ด\.ญ\.|บจก\.|บริษัท|หจก\.|MRS\.?|MISS|MR\.?|MS\.?)\s*/;
function norm(s: string) {
  let t = s.trim().toUpperCase();
  for (let i = 0; i < 2; i++) t = t.replace(TITLES, "").trim();
  return t.replace(/[\s.+\-]/g, "");
}
export function nameOk(a: string, b: string) {
  const x = norm(a), y = norm(b);
  if (x.length < 3 || !y) return false;
  const n = Math.min(x.length, y.length, 8);
  return x.slice(0, n) === y.slice(0, n);
}

export function rawText(r: StmtRow) {
  if (r.channel === "ATM") return `ถอนเงินสดผ่านเอทีเอ็ม (${th(r.raw.replace(/.*\((\w+)\).*/, "$1") === "KBNK" ? "KBANK" : r.raw.replace(/.*\((\w+)\).*/, "$1"))})`;
  const t = ({ "TRF TO OTH BK": "โอนไปต่างธนาคาร", TRANSFER: "โอนภายในธนาคารกรุงเทพ", "TRF FR OTH BK": "รับโอนจากต่างธนาคาร" } as Record<string, string>)[r.raw] ?? r.raw;
  return t.replace(/\bATM\b/g, "เอทีเอ็ม").replace(/\b(KBNK|KBANK|SCB|KTB|GSB|TTB|TMB|BAY|BBL|BAAC)\b/g, (m) => th(m === "KBNK" ? "KBANK" : m === "TMB" ? "TTB" : m))
    .replace("Internet/Mobile", "อินเทอร์เน็ต/มือถือ").replace("K PLUS", "เค พลัส").replace("PromptPay", "พร้อมเพย์").replace(/ \| /g, " · ").replace(/^[ ·]+|[ ·]+$/g, "");
}
export function dest(r: StmtRow) {
  if (r.kind === "promptpay") return `พร้อมเพย์ ลงท้าย ${r.last4}`;
  if (r.last4) return `${th(r.destBank)} ลงท้าย ${r.last4}`;
  return r.destType === "notBBL" ? "ต่างธนาคาร" : r.destType === "BBL" ? "ธ.กรุงเทพ" : "";
}

export function reconcile(parsed: { info: StmtInfo; rows: StmtRow[] }[], payoutsAll: Payout[], from: string, to: string, ourAccounts: { label: string; bank: string; account: string }[] = []): Result {
  const info: Partial<Record<BankKey, StmtInfo>> = {};
  const rows: Row[] = [];
  for (const b of ["SCB", "KBANK", "BBL"] as BankKey[]) {
    const p = parsed.find((x) => x.info.bank === b); if (!p) continue;
    info[b] = p.info; let n = 0;
    for (const r of p.rows) {
      if (r.dir !== "out" || r.kind === "other" || r.date < from || r.date > to) continue;
      rows.push({ ...r, no: `${PFX[b]}-${String(++n).padStart(3, "0")}` });
    }
  }
  const payouts = payoutsAll.filter((p) => p.status === "approved");
  const byDay = new Map<string, number[]>();
  payouts.forEach((p, i) => { const d = p.done.slice(0, 10); byDay.set(d, [...(byDay.get(d) ?? []), i]); });
  const day = (d: string) => byDay.get(d) ?? [];
  const match = new Map<string, Match>(); const used = new Set<number>();

  const detail = (r: Row, p: Payout) => {
    const acct = r.kind === "account" && !!r.last4 && digits(p.account).endsWith(r.last4);
    const bank = !!r.destBank && p.bank === r.destBank;
    const name = !!r.name && nameOk(r.name, p.receiverName);
    const gap = toMin(p.done) - toMin(`${r.date} ${r.time}`);
    const score = 4 * +acct + 3 * +name + +bank + (gap >= -2 && gap <= 30 ? 2 : Math.abs(gap) <= 180 ? 1 : 0) - Math.abs(gap) / 10000;
    return { acct, bank, name, gap, score };
  };
  const greedy = (offsets: number[], accept: (d: ReturnType<typeof detail>) => boolean, offday: boolean) => {
    const c: { s: number; no: string; i: number; d: ReturnType<typeof detail> }[] = [];
    for (const r of rows) {
      if (!r.time || match.has(r.no)) continue;
      for (const o of offsets) for (const i of day(shiftDay(r.date, o))) {
        if (used.has(i) || Math.abs(payouts[i].amount - r.amount) > 0.005) continue;
        const d = detail(r, payouts[i]); if (accept(d)) c.push({ s: d.score, no: r.no, i, d });
      }
    }
    c.sort((a, b) => b.s - a.s);
    for (const x of c) {
      if (match.has(x.no) || used.has(x.i)) continue;
      match.set(x.no, { payout: payouts[x.i], how: "detail", acct: x.d.acct, bank: x.d.bank, name: x.d.name, gap: x.d.gap, offday }); used.add(x.i);
    }
  };
  greedy([0], (d) => d.acct || d.name, false);
  greedy([-1, 1], (d) => d.acct && (d.name || d.bank), true);

  // Bangkok Bank: order alignment per day
  const typeOk = (r: Row, p: Payout) => Math.abs(p.amount - r.amount) <= 0.005 && (r.destType === "BBL" ? p.bank === "BBL" : p.bank !== "BBL");
  const align = (R: Row[], seq: number[], bonus: string | null) => {
    const n = R.length, m = seq.length, w = (j: number) => 1 + (bonus && payouts[seq[j]].doneBy === bonus ? 0.01 : 0);
    const D = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
    for (let a = 0; a < n; a++) for (let c = 0; c < m; c++)
      D[a + 1][c + 1] = Math.max(D[a][c + 1], D[a + 1][c], typeOk(R[a], payouts[seq[c]]) ? D[a][c] + w(c) : -1);
    const out: [number, number][] = []; let a = n, c = m;
    while (a && c) {
      if (typeOk(R[a - 1], payouts[seq[c - 1]]) && Math.abs(D[a][c] - D[a - 1][c - 1] - w(c - 1)) < 1e-9) { out.push([a - 1, seq[c - 1]]); a--; c--; }
      else if (D[a - 1][c] >= D[a][c - 1]) a--; else c--;
    }
    return out;
  };
  for (const d of [...new Set(rows.filter((r) => r.bank === "BBL").map((r) => r.date))]) {
    const R = rows.filter((r) => r.bank === "BBL" && r.date === d);
    const rest = day(d).filter((i) => !used.has(i)).sort((x, y) => payouts[x].done.localeCompare(payouts[y].done));
    if (!R.length || !rest.length) continue;
    const admins = [...new Set(rest.map((i) => payouts[i].doneBy))];
    const main = admins.reduce((best, a) => { const n = align(R, rest.filter((i) => payouts[i].doneBy === a), null).length; return n > best.n ? { a, n } : best; }, { a: admins[0], n: -1 }).a;
    for (const [a, i] of align(R, rest, main)) { match.set(R[a].no, { payout: payouts[i], how: "order" }); used.add(i); }
    for (const r of R) {
      if (match.has(r.no)) continue;
      const c = day(d).filter((i) => !used.has(i) && typeOk(r, payouts[i])).sort((x, y) => +(payouts[x].doneBy !== main) - +(payouts[y].doneBy !== main) || payouts[x].done.localeCompare(payouts[y].done));
      if (c.length) { match.set(r.no, { payout: payouts[c[0]], how: "amount" }); used.add(c[0]); }
    }
  }

  const matched = rows.filter((r) => match.has(r.no)), unmatched = rows.filter((r) => !match.has(r.no));
  const stmtOf = new Map([...match].map(([no, m]) => [m.payout.ref, no]));
  const inReport = new Set(rows.map((r) => `${r.bank}|${r.date}|${r.time}|${r.amount}|${r.balance}`));
  const noOf = new Map(rows.map((r) => [`${r.bank}|${r.date}|${r.time}|${r.amount}|${r.balance}`, r.no]));
  const cases: Case[] = unmatched.map((r) => {
    const src = info[r.bank]!; const all = parsed.find((x) => x.info.bank === r.bank)!.rows;
    const k = all.findIndex((x) => x.date === r.date && x.time === r.time && x.amount === r.amount && x.balance === r.balance);
    const t = toMin(`${r.date} ${r.time || "12:00"}`);
    const withStmt = (p: Payout) => ({ ...p, stmt: stmtOf.get(p.ref) ?? "" });
    const sameAccount = r.last4 ? payoutsAll.filter((p) => digits(p.account).endsWith(r.last4!) && (!r.destBank || p.bank === r.destBank)).map(withStmt) : [];
    const sameName = r.name ? payoutsAll.filter((p) => !sameAccount.some((s) => s.ref === p.ref) && nameOk(r.name, p.receiverName)).map(withStmt) : [];
    const ownerSame = !!r.name && !!src.owner && nameOk(r.name, src.owner);
    const sameAmt = sameAccount.filter((p) => Math.abs(p.amount - r.amount) < 0.005 && p.status === "approved")
      .sort((a, b) => +!!a.stmt - +!!b.stmt || Math.abs(toMin(a.done) - t) - Math.abs(toMin(b.done) - t));
    let cat: CaseCat, verdict: string;
    if (ownerSame) { cat = "own"; verdict = "โอนเข้าบัญชีที่ชื่อเดียวกับเจ้าของบัญชีต้นทาง (เจ้าของบัญชีโอนเงินออกเอง) — ไม่ใช่การจ่ายตามรายการเงินออกของระบบ"; }
    else if (sameAmt.length && !sameAmt[0].stmt) { cat = "date"; verdict = `มีรายการเงินออก ${sameAmt[0].ref} ยอดเท่ากัน ไปบัญชีเดียวกัน แต่แอดมินกดเสร็จ ${dmy(sameAmt[0].done)} ${sameAmt[0].done.slice(11, 16)} น. — ไม่พบในสเตทเมนต์วันอื่น อาจเป็นรายการเดียวกัน`; }
    else if (sameAmt.length) { cat = "dup"; verdict = `มีรายการเงินออก ${sameAmt[0].ref} ยอดเท่ากันไปบัญชีเดียวกัน แต่จับคู่กับ ${sameAmt[0].stmt} ไปแล้ว — อาจเป็นการโอนซ้ำ`; }
    else if (sameAccount.length) { cat = "known"; verdict = `ผู้รับรายนี้เคยได้รับเงินจากระบบ ${sameAccount.length} รายการ แต่ไม่มีรายการยอด ${money(r.amount)} บาท — ไม่มีรายการเงินออกรองรับการโอนครั้งนี้`; }
    else { cat = "none"; verdict = "ไม่พบรายการเงินออกในระบบไปยังบัญชีนี้เลย (ทุกสถานะ) — เป็นการโอนออกที่ไม่มีรายการในระบบรองรับ"; }
    const next = ({
      own: ["สอบถามเจ้าของบัญชีถึงวัตถุประสงค์ของการโอนเข้าบัญชีตัวเอง", "ตรวจว่ามีการนำเงินกลับเข้าบัญชีระบบหรือไม่"],
      date: [`ยืนยันกับแอดมิน ${sameAmt[0]?.doneBy ?? ""} ว่าโอนรายการนี้จริงเมื่อใด และโอนจากบัญชีใด`],
      dup: ["ตรวจสลิปทั้งสองครั้ง และติดตามเงินคืนจากผู้รับหากโอนซ้ำ"],
      known: ["ตรวจว่ามีคำขอถอน/รายการเงินออกที่ยังไม่ได้บันทึก หรือบันทึกยอดผิด", "สอบถามแอดมินที่ทำงานในช่วงเวลานั้น"],
      none: ["สอบถามผู้ถือบัญชีต้นทาง/แอดมินที่ทำงานในช่วงเวลานั้นถึงที่มาของการโอน", "ขอสลิปการโอนจากธนาคาร (เลขอ้างอิง) เพื่อดูเลขบัญชีปลายทางเต็ม", "ตรวจว่าผู้รับเป็นลูกค้า/บุคคลที่เกี่ยวข้องกับระบบหรือไม่"],
    } as Record<CaseCat, string[]>)[cat];
    const near = r.time ? payouts.filter((p) => p.done.slice(0, 10) === r.date && Math.abs(toMin(p.done) - t) <= 15).sort((a, b) => a.done.localeCompare(b.done)) : [];
    const neighbours = all.slice(Math.max(0, k - 3), k + 4).map((x) => {
      const key = `${x.bank}|${x.date}|${x.time}|${x.amount}|${x.balance}`; const no = noOf.get(key);
      return { row: x, me: x === all[k], label: inReport.has(key) && no ? `${match.has(no) ? "✓ จับคู่ได้" : "✗"} ${no}` : x.dir === "in" ? "เงินเข้า" : x.kind === "other" ? "ไม่ใช่การโอน" : `ก่อน ${dmy(from).slice(0, 5)}` };
    });
    const ourAccount = ourAccounts.filter((a) => r.last4 && digits(a.account).endsWith(r.last4) && (!r.destBank || a.bank === r.destBank)).map((a) => a.label);
    return { row: r, cat, verdict, next, src, ownerSame, before: k > 0 ? all[k - 1].balance : null, sameAccount, sameName, ourAccount, near, neighbours };
  });
  return { from, to, rows, matched, unmatched, match, cases, info, payoutsInPeriod: payouts.filter((p) => p.done.slice(0, 10) >= from && p.done.slice(0, 10) <= to).length };
}

export const CAT_TH: Record<CaseCat, string> = { own: "โอนเข้าบัญชีชื่อเจ้าของบัญชีเอง", date: "มีรายการเงินออกตรงกัน แต่ต่างวัน", dup: "อาจเป็นการโอนซ้ำ", known: "ผู้รับเคยได้รับเงิน แต่ไม่มีรายการยอดนี้", none: "ไม่มีรายการเงินออกไปบัญชีนี้เลย" };

/** Short Thai checklist + note for a matched row. */
export function checklist(r: Row, m: Match): { chk: string; note: string } {
  const p = m.payout;
  if (m.how === "detail") {
    const parts = ["ยอด ✓", m.acct ? "บัญชี ✓" : "พร้อมเพย์", m.bank ? "ธนาคาร ✓" : "", m.name ? "ชื่อ ✓" : "ชื่อ ≈"];
    let note = "";
    if (m.offday) { parts.push("โอนคนละวัน"); note = `แอดมินกดเสร็จ ${dmy(p.done).slice(0, 5)} ${p.done.slice(11, 16)} น. แต่โอนจริง ${dmy(r.date).slice(0, 5)} ${r.time} น.`; }
    else parts.push(`เวลาห่าง ${Math.abs(m.gap ?? 0).toFixed(1)} นาที`);
    if (!m.name) note = (note ? note + " · " : "") + `ชื่อเขียนต่างกัน — ในระบบ "${p.receiverName}"`;
    return { chk: parts.filter(Boolean).join(" · "), note };
  }
  if (m.how === "order") return { chk: "ยอด ✓ · ประเภทปลายทาง ✓ · ลำดับ ✓", note: "" };
  return { chk: "ยอด ✓ · ประเภทปลายทาง ✓", note: `ลำดับต่างจากเวลากดเสร็จ (${p.done.slice(11, 16)} น.) — เป็นรายการยอดนี้รายการเดียวที่เหลือ` };
}

/** Why a row is unmatched (first finding line). */
export function unmatchedReason(r: Row, c: Case | undefined, payouts: Payout[]): string {
  if (c?.cat === "own") return c.verdict;
  const same = payouts.filter((p) => p.status === "approved" && p.done.slice(0, 10) === r.date && Math.abs(p.amount - r.amount) < 0.005);
  if (!payouts.some((p) => p.done.slice(0, 10) === r.date)) return `วันที่ ${dmy(r.date).slice(0, 5)} ไม่มีรายการเงินออกในระบบเลย`;
  if (!same.length) return `ไม่มีรายการเงินออกวันเดียวกันที่ยอด ${money(r.amount)} บาท`;
  return `มีรายการเงินออกยอด ${money(r.amount)} บาท วันเดียวกัน ${same.length} รายการ แต่เลขบัญชีและชื่อผู้รับไม่ตรง`;
}

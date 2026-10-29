// Bank statement PDFs → rows. Pure functions (browser + Node): the PDF is read in the browser, never uploaded.
// Formats (user, 29 Oct 2026 — "these will be the format to use every time"):
//  SCB  "AcctSt_*.pdf"          28/10/26 14:12 X2 ENET 400.00 10,664.14โอนไป SCB x1357 NAME
//  KBANK "STM_SA*.pdf"          28-10-26 08:36 โอนเงิน 1,000.00 24,909.61 K PLUS โอนไป X3743 NAME++
//  BBL  "Statement of 511*.PDF" 28/10/26 TRF TO OTH BK 500.00 9,500.83 mPhone   (no time, account or name)

export type BankKey = "SCB" | "KBANK" | "BBL";
export type StmtRow = {
  bank: BankKey; date: string; time: string; amount: number; balance: number; dir: "in" | "out";
  /** transfer to an account / PromptPay; anything else (cash, bills, fees) is "other" */
  kind: "account" | "promptpay" | "other";
  destBank: string | null; last4: string | null; name: string; raw: string; channel: string;
  /** BBL only: "notBBL" (TRF TO OTH BK) / "BBL" (TRANSFER) */
  destType?: "notBBL" | "BBL";
};
export type StmtInfo = { bank: BankKey; accountNo: string; owner: string; periodFrom: string; periodTo: string; debits: number; debitTotal: number };
export type Parsed = { info: StmtInfo; rows: StmtRow[] };

const num = (s: string) => Number(s.replace(/,/g, ""));
const BANKMAP: Record<string, string> = {
  KBNK: "KBANK", KBANK: "KBANK", SCB: "SCB", KTB: "KTB", BBL: "BBL", GSB: "GSB", TTB: "TTB", TMB: "TTB", TBANK: "TTB", BAY: "BAY",
  BAAC: "BAAC", UOB: "UOB", UOBT: "UOB", CIMB: "CIMB", CIMBT: "CIMB", KK: "KKP", KKP: "KKP", GHB: "GHB", LHB: "LHBANK", TISCO: "TISCO",
};
const bankOf = (c: string | undefined) => (c ? BANKMAP[c] ?? c : null);
const ymd = (d: string, m: string, y: string) => `20${y}-${m}-${d}`;
const dmyToIso = (s: string) => { const [d, m, y] = s.split("/"); return `${y}-${m}-${d}`; };

function direction(prev: number | null, amt: number, bal: number, outWords: boolean): "in" | "out" {
  if (prev != null) {
    if (Math.abs(prev - amt - bal) < 0.005) return "out";
    if (Math.abs(prev + amt - bal) < 0.005) return "in";
  }
  return outWords ? "out" : "in";
}

/** Which bank produced this statement (from its text). */
export function detectBank(lines: string[]): BankKey | null {
  const head = lines.slice(0, 40).join("\n");
  if (/SIAM COMMERCIAL BANK|ไทยพาณิชย์/.test(head)) return "SCB";
  if (/Bangkok Bank|ธนาคารกรุงเทพ/.test(head)) return "BBL";
  if (/รอบระหว่างวันที่|K PLUS|กสิกร/.test(head) || lines.some((l) => /^\d\d-\d\d-\d\d \d\d:\d\d /.test(l))) return "KBANK";
  return null;
}

export function parseSCB(lines: string[]): Parsed {
  const rows: StmtRow[] = []; let prev: number | null = null;
  const info: StmtInfo = { bank: "SCB", accountNo: "", owner: "", periodFrom: "", periodTo: "", debits: 0, debitTotal: 0 };
  for (const line of lines) {
    let m = line.match(/เลขที่บัญชี\s*([\d-]{10,})/); if (m && !info.accountNo) info.accountNo = m[1];
    m = line.match(/ชื่อ\s*-\s*สกุล\s*(.+)$/); if (m && !info.owner) info.owner = m[1].trim();
    m = line.match(/วันที่\s*(\d\d\/\d\d\/\d{4})\s*-\s*(\d\d\/\d\d\/\d{4})/); if (m && !info.periodFrom) { info.periodFrom = dmyToIso(m[1]); info.periodTo = dmyToIso(m[2]); }
    m = line.match(/TOTAL AMOUNTS \(Debit\)\s*([\d,]+\.\d\d)/); if (m) info.debitTotal = num(m[1]);
    m = line.match(/TOTAL ITEMS\s*(\d+)/); if (m) info.debits = Number(m[1]);
    m = line.match(/BALANCE BROUGHT FORWARD\)\s*([\d,]+\.\d\d)/); if (m) { prev = num(m[1]); continue; }
    m = line.match(/^(\d\d)\/(\d\d)\/(\d\d) (\d\d:\d\d) (\w\d) (\S+) ([\d,]+\.\d\d) ([\d,]+\.\d\d)\s*(.*)$/);
    if (!m) continue;
    const [, d, mo, y, t, code, ch, a, b, desc] = m; const amount = num(a), balance = num(b);
    const dir = direction(prev, amount, balance, code.startsWith("X2") || code.startsWith("C2")); prev = balance;
    const r: StmtRow = { bank: "SCB", date: ymd(d, mo, y), time: t, amount, balance, dir, kind: "other", destBank: null, last4: null, name: "", raw: desc.trim(), channel: ch };
    const m2 = desc.trim().match(/^(โอนไป|PromptPay)\s*(?:([A-Z]+)\s+)?x(\d{4})\s*(.*)$/);
    if (m2) { r.kind = m2[1] === "PromptPay" ? "promptpay" : "account"; r.destBank = bankOf(m2[2]); r.last4 = m2[3]; r.name = m2[4].trim(); }
    rows.push(r);
  }
  return { info, rows };
}

export function parseKBANK(lines: string[]): Parsed {
  const rows: StmtRow[] = []; let prev: number | null = null;
  const info: StmtInfo = { bank: "KBANK", accountNo: "", owner: "", periodFrom: "", periodTo: "", debits: 0, debitTotal: 0 };
  for (const line of lines) {
    let m = line.match(/เลขที่บัญชีเงินฝาก\s*([\d-]{10,})/); if (m && !info.accountNo) info.accountNo = m[1];
    m = line.match(/ชื่อบัญชี\s*(.+?)\s*เลขที่อ้างอิง/); if (m && !info.owner) info.owner = m[1].trim();
    m = line.match(/รอบระหว่างวันที่\s*(\d\d\/\d\d\/\d{4})\s*-\s*(\d\d\/\d\d\/\d{4})/); if (m && !info.periodFrom) { info.periodFrom = dmyToIso(m[1]); info.periodTo = dmyToIso(m[2]); }
    m = line.match(/รวมถอนเงิน\s*(\d+)\s*รายการ\s*([\d,]+\.\d\d)/); if (m) { info.debits = Number(m[1]); info.debitTotal = num(m[2]); }
    m = line.match(/^\d\d-\d\d-\d\d ยอดยกมา ([\d,]+\.\d\d)/); if (m) { prev = num(m[1]); continue; }
    m = line.match(/^(\d\d)-(\d\d)-(\d\d) (\d\d:\d\d) (.+?) ([\d,]+\.\d\d) ([\d,]+\.\d\d) ?(.*)$/);
    if (!m) continue;
    const [, d, mo, y, t, typ, a, b, desc] = m; const amount = num(a), balance = num(b);
    const dir = direction(prev, amount, balance, /^(โอนเงิน|ถอน|ค่าธรรมเนียม|ชำระ)/.test(typ)); prev = balance;
    const r: StmtRow = { bank: "KBANK", date: ymd(d, mo, y), time: t, amount, balance, dir, kind: "other", destBank: null, last4: null, name: "", raw: `${typ} | ${desc}`.trim(), channel: /K PLUS/.test(desc) ? "K PLUS" : "" };
    const m2 = desc.match(/โอนไป\s+(?:(พร้อมเพย์)\s+|([A-Z]+)\s+)?X(\d{4})\s*(.*?)(\+\+)?$/);
    if (m2) { r.kind = m2[1] ? "promptpay" : "account"; r.destBank = m2[1] ? null : bankOf(m2[2] ?? "KBANK"); r.last4 = m2[3]; r.name = m2[4].trim(); }
    rows.push(r);
  }
  return { info, rows };
}

export function parseBBL(lines: string[]): Parsed {
  const rows: StmtRow[] = []; let prev: number | null = null;
  const info: StmtInfo = { bank: "BBL", accountNo: "", owner: "", periodFrom: "", periodTo: "", debits: 0, debitTotal: 0 };
  for (const line of lines) {
    let m = line.match(/Account No\.\s*([\d-]{10,})/); if (m && !info.accountNo) info.accountNo = m[1];
    m = line.match(/ชื่อ\/Name\s*(.+?)\s*เลขที่บัญชี/); if (m && !info.owner) info.owner = m[1].trim();
    m = line.match(/Statement Period\s*(\d\d\/\d\d\/\d{4})\s*-\s*(\d\d\/\d\d\/\d{4})/); if (m && !info.periodFrom) { info.periodFrom = dmyToIso(m[1]); info.periodTo = dmyToIso(m[2]); }
    m = line.match(/Total No\. of Debits\s*(\d+).*?Total Debit Amount\s*([\d,]+\.\d\d)/); if (m) { info.debits = Number(m[1]); info.debitTotal = num(m[2]); }
    m = line.match(/^\d\d\/\d\d\/\d\d B\/F ([\d,]+\.\d\d)/); if (m) { prev = num(m[1]); continue; }
    m = line.match(/^(\d\d)\/(\d\d)\/(\d\d) (.+?) ([\d,]+\.\d\d) ([\d,]+\.\d\d) (\S+)$/);
    if (!m) continue;
    const [, d, mo, y, typ, a, b, via] = m; const amount = num(a), balance = num(b);
    const dir = direction(prev, amount, balance, /\bTO\b/.test(typ)); prev = balance;
    const destType = /OTH BK/.test(typ) ? "notBBL" as const : typ === "TRANSFER" ? "BBL" as const : undefined;
    rows.push({ bank: "BBL", date: ymd(d, mo, y), time: "", amount, balance, dir, kind: dir === "out" && destType ? "account" : "other", destBank: destType === "BBL" ? "BBL" : null, last4: null, name: "", raw: typ, channel: via, destType });
  }
  return { info, rows };
}

export function parseStatement(lines: string[], bank?: BankKey): Parsed | null {
  const b = bank ?? detectBank(lines);
  if (b === "SCB") return parseSCB(lines);
  if (b === "KBANK") return parseKBANK(lines);
  if (b === "BBL") return parseBBL(lines);
  return null;
}

// The downloadable Excel: สารบัญ · 1 จับคู่ไม่ได้ · 1.1 รายละเอียดเพิ่มเติม · 2 จับคู่ได้ (same layout as the approved report).
import { workbook, type Cell, type Sheet, type Style } from "./xlsx";
import { BANK_NAME, CAT_TH, checklist, dest, dmy, money, rawText, th, unmatchedReason, type Payout, type Result } from "./match";
import type { BankKey } from "./parse";

const RED = "FFE3E0", RED2 = "FFF3F1", GREEN = "E6F6EA", GREEN2 = "D9F2DF", HEAD = "E8EDF3", DARK = "24292F", YEL = "FFF8C5";
const c = (v: string | number | null, s?: Style, link?: string): Cell => ({ v, s, link });
const BANKS: BankKey[] = ["SCB", "KBANK", "BBL"];

export function reportWorkbook(r: Result, payouts: Payout[]): Blob {
  const S1 = "1 จับคู่ไม่ได้", S11 = "1.1 รายละเอียดเพิ่มเติม", S2 = "2 จับคู่ได้";
  const to = (s: string, ref = "A1") => `'${s}'!${ref}`;
  const NOTE = `หมายเหตุ: ระบบเริ่มบันทึกรายการเงินออก (payout) ตั้งแต่วันที่ ${dmy("2026-10-15")} — จึงเทียบรายการในสเตทเมนต์ตั้งแต่วันที่ ${dmy(r.from)} เป็นต้นไป · แสดงเฉพาะรายการโอนเงินออก`;
  const badAmt = r.unmatched.reduce((s, x) => s + x.amount, 0), goodAmt = r.matched.reduce((s, x) => s + x.amount, 0);
  const caseOf = new Map(r.cases.map((k) => [k.row.no, k]));
  const back = c("← กลับไปสารบัญ", { color: "0969DA", u: true }, to("สารบัญ"));

  // 1.1 first (row numbers are needed for links)
  const s11: Sheet = { name: S11, widths: [34, 130], rows: [], heights: {} };
  s11.rows.push([c(`1.1 · รายละเอียดเพิ่มเติมสำหรับรายการที่ไม่สามารถหา payout ได้ · ${r.cases.length} รายการ · รวม ${money(badAmt)} บาท`, { b: true, sz: 14, color: "CF222E" }), null, back]);
  s11.rows.push(["ข้อสันนิษฐานได้จากการค้นข้อมูลในระบบ (รายการเงินออกทุกสถานะ และบัญชีธนาคารของระบบ) — ต้องยืนยันกับแอดมินและธนาคารก่อนสรุป · สเตทเมนต์แสดงเลขบัญชีปลายทางเฉพาะ 4 ตัวท้าย"], []);
  const caseRow = new Map<string, number>();
  const pl = (l: (Payout & { stmt: string })[]) => l.map((o) => `${o.ref} · ${o.status} · ${money(o.amount)} บาท · ${th(o.bank)} ${o.account} · ${o.receiverName} · สร้าง ${o.created.slice(0, 16)} · กดเสร็จ ${o.done.slice(0, 16)} โดย ${o.doneBy || "—"} · ร้าน ${o.merchant} · ${o.stmt ? "พบใน " + o.stmt : "ไม่พบในสเตทเมนต์"}`).join("\n");
  r.cases.forEach((k, n) => {
    const x = k.row; const full = k.sameAccount[0]?.account ?? "";
    s11.rows.push([c(`${n + 1}. ${x.no} · ${money(x.amount)} บาท · ${dmy(x.date)} ${x.time} น.`, { b: true, sz: 12, color: "FFFFFF", fill: DARK }), c(CAT_TH[k.cat], { b: true, color: "FFFFFF", fill: DARK })]);
    caseRow.set(x.no, s11.rows.length);
    s11.rows.push([c("ข้อสันนิษฐาน", { b: true, fill: YEL, wrap: true }), c(k.verdict, { b: true, fill: YEL, wrap: true })]);
    const items: [string, string | null][] = [
      ["— บัญชีต้นทาง (เงินออกจาก) —", null], ["ธนาคาร", BANK_NAME[x.bank]], ["เลขที่บัญชี", k.src.accountNo], ["ชื่อบัญชี", k.src.owner],
      ["ยอดก่อนโอน → หลังโอน", `${k.before != null ? money(k.before) : "—"} → ${money(x.balance)} บาท`], ["ช่องทาง", x.channel || "—"],
      ["— บัญชีปลายทาง (เงินเข้าไปที่) —", null], ["ธนาคาร", "ธนาคาร" + th(x.destBank)],
      ["เลขที่บัญชี", full ? `${full} (จากรายการเงินออกในระบบ)` : `xxxxxx${x.last4} (สเตทเมนต์แสดงเฉพาะ 4 ตัวท้าย)`],
      ["ชื่อตามสเตทเมนต์", x.name], ["ชื่อในระบบ", k.sameAccount[0]?.receiverName ?? "—"], ["ชื่อเดียวกับเจ้าของบัญชีต้นทาง", k.ownerSame ? "ใช่" : "ไม่ใช่"],
      ["— การโอน —", null], ["วันที่/เวลาโอน", `${dmy(x.date)} ${x.time} น.`], ["ยอดเงิน", `${money(x.amount)} บาท`], ["ข้อความในสเตทเมนต์", rawText(x)],
      ["— ข้อมูลในระบบ —", null], ["รายการเงินออกไปบัญชีเดียวกัน (ทุกสถานะ)", pl(k.sameAccount) || "ไม่พบเลย (ค้นทุกสถานะ)"],
      ["รายการเงินออกที่ชื่อตรงแต่บัญชีอื่น", pl(k.sameName.slice(0, 10)) || "ไม่มี"], ["เป็นบัญชีของระบบ", k.ourAccount.join(", ") || "ไม่ใช่"],
      ["รายการเงินออกที่กดเสร็จช่วง ±15 นาที", k.near.slice(0, 10).map((p) => `${p.ref} ${p.done.slice(11, 16)} · ${money(p.amount)} บาท · ${th(p.bank)} ••${p.account.replace(/\D/g, "").slice(-4)} · ${p.receiverName} (${p.doneBy})`).join("\n") || "ไม่มี"],
      ["รายการก่อน–หลังในสเตทเมนต์", k.neighbours.map((nb) => `${nb.me ? "▶ " : "   "}${dmy(nb.row.date).slice(0, 5)} ${nb.row.time} · ${nb.row.dir === "out" ? "ออก" : "เข้า"} ${money(nb.row.amount)} · คงเหลือ ${money(nb.row.balance)} · ${rawText(nb.row).slice(0, 50)} · ${nb.label}`).join("\n")],
      ["สิ่งที่ควรตรวจต่อ", k.next.map((t) => "• " + t).join("\n")],
    ];
    for (const [label, v] of items) {
      if (v == null) { s11.rows.push([c(label, { b: true, color: "57606A" })]); continue; }
      s11.rows.push([c(label, { color: "57606A", fill: RED2, wrap: true }), c(v, { fill: RED2, wrap: true })]);
      s11.heights![s11.rows.length] = Math.max(16, 15 * (v.split("\n").length + Math.floor(v.length / 130)));
    }
    s11.rows.push([back], []);
  });

  // 1
  const s1: Sheet = { name: S1, widths: [16, 20, 16, 11, 8, 13, 22, 28, 30, 90], rows: [], freeze: "B5" };
  s1.rows.push([c(`1 · รายการในสเตทเมนต์ที่จับคู่ไม่ได้ทั้งหมด · ${r.unmatched.length} รายการ · รวม ${money(badAmt)} บาท`, { b: true, sz: 14, color: "CF222E" }), null, null, null, null, null, null, null, back]);
  s1.rows.push(["รายการโอนเงินออกในสเตทเมนต์ที่ไม่มีรายการเงินออก (payout) ในระบบรองรับ — ค้นทุกสถานะแล้ว · คลิกลำดับรายการเพื่อดูรายละเอียดในหัวข้อ 1.1"]);
  s1.rows.push([c(NOTE, { b: true, color: "9A6700" })]);
  s1.rows.push(["ลำดับรายการ", "ธนาคารต้นทาง", "เลขบัญชีต้นทาง", "วันที่", "เวลา", "ยอด (บาท)", "ปลายทาง", "ชื่อผู้รับ (ตามสเตทเมนต์)", "กลุ่ม", "เหตุผล"].map((h) => c(h, { b: true, fill: HEAD })));
  for (const x of r.unmatched) {
    const k = caseOf.get(x.no); const s: Style = { fill: RED, wrap: true };
    s1.rows.push([c(x.no, { ...s, color: "0969DA", u: true }, caseRow.has(x.no) ? to(S11, `A${caseRow.get(x.no)}`) : undefined), c(BANK_NAME[x.bank], s), c(k?.src.accountNo ?? "", { ...s, text: true }),
      c(dmy(x.date), s), c(x.time || "—", s), c(x.amount, { ...s, money: true }), c(dest(x), s), c(x.name, s), c(k ? CAT_TH[k.cat] : "", s), c(unmatchedReason(x, k, payouts), s)]);
  }
  s1.rows.push([]);
  for (const b of BANKS) { const sel = r.unmatched.filter((x) => x.bank === b); s1.rows.push([null, `รวม${BANK_NAME[b]}`, null, null, `${sel.length} รายการ`, c(sel.reduce((s, x) => s + x.amount, 0), { money: true })]); }
  s1.rows.push([null, c("รวมทั้งหมด", { b: true, color: "CF222E" }), null, null, c(`${r.unmatched.length} รายการ`, { b: true, color: "CF222E" }), c(badAmt, { b: true, color: "CF222E", money: true })]);

  // 2
  const s2: Sheet = { name: S2, widths: [16, 18, 11, 7, 12, 20, 26, 14, 14, 17, 12, 15, 26, 14, 48, 60], rows: [], freeze: "B4" };
  s2.rows.push([c(`2 · รายการในสเตทเมนต์ที่จับคู่กับรายการเงินออกได้ · ${r.matched.length.toLocaleString()} รายการ · รวม ${money(goodAmt)} บาท`, { b: true, sz: 14, color: "1A7F37" }), null, null, null, null, null, null, null, back]);
  s2.rows.push([c(NOTE, { b: true, color: "9A6700" })]);
  s2.rows.push(["ลำดับรายการ", "ธนาคาร", "วันที่", "เวลา", "ยอด (บาท)", "ปลายทาง", "ชื่อผู้รับ (สเตทเมนต์)", "เลขที่รายการเงินออก", "ร้านค้า", "กดเสร็จเมื่อ", "ธนาคารผู้รับ", "เลขบัญชีผู้รับ", "ชื่อผู้รับ (ในระบบ)", "แอดมินผู้กดเสร็จ", "ข้อมูลที่ตรงกัน", "หมายเหตุ"].map((h) => c(h, { b: true, fill: HEAD, wrap: true })));
  const bankRow = new Map<BankKey, number>();
  r.matched.forEach((x, i) => {
    if (!bankRow.has(x.bank)) {
      const sel = r.matched.filter((y) => y.bank === x.bank);
      s2.rows.push([c(`${BANK_NAME[x.bank]} · บัญชี ${r.info[x.bank]?.accountNo ?? ""} · จับคู่ได้ ${sel.length} รายการ · ${money(sel.reduce((s, y) => s + y.amount, 0))} บาท`, { b: true, color: "FFFFFF", fill: DARK })]);
      bankRow.set(x.bank, s2.rows.length);
    }
    const m = r.match.get(x.no)!; const p = m.payout; const { chk, note } = checklist(x, m); const f = i % 2 ? GREEN2 : GREEN;
    s2.rows.push([c(x.no, { fill: f }), c(BANK_NAME[x.bank], { fill: f }), c(dmy(x.date), { fill: f }), c(x.time || "—", { fill: f }), c(x.amount, { fill: f, money: true }), c(dest(x), { fill: f }),
      c(x.name || rawText(x), { fill: f }), c(p.ref, { fill: f }), c(p.merchant, { fill: f }), c(p.done, { fill: f }), c(th(p.bank), { fill: f }), c(p.account, { fill: f, text: true }),
      c(p.receiverName, { fill: f }), c(p.doneBy, { fill: f }), c(chk, { fill: f, color: "116329" }), c(note, { fill: f, color: "7D4E00" })]);
  });
  s2.filter = `A3:P${s2.rows.length}`;

  // สารบัญ
  const toc: Sheet = { name: "สารบัญ", widths: [72, 16, 20], rows: [] };
  toc.rows.push([c(`เปรียบเทียบกับ bank statement · ${dmy(r.from)} – ${dmy(r.to)}`, { b: true, sz: 16 })]);
  toc.rows.push(["สเตทเมนต์ธนาคาร — เฉพาะรายการโอนเงินออก เทียบกับรายการเงินออก (payout) ในระบบที่อนุมัติแล้ว ของวันเดียวกับในสเตทเมนต์"]);
  toc.rows.push([c(NOTE, { b: true, color: "9A6700" })], []);
  toc.rows.push(["ภาพรวม", "จำนวน", "ยอดเงิน (บาท)"].map((h) => c(h, { b: true, fill: HEAD })));
  for (const [l, n, a, col] of [["รายการโอนเงินออกในสเตทเมนต์", r.rows.length, goodAmt + badAmt, "24292F"], ["จับคู่กับ payout ได้", r.matched.length, goodAmt, "1A7F37"], ["จับคู่ไม่ได้", r.unmatched.length, badAmt, "CF222E"]] as const)
    toc.rows.push([c(l, { b: true, color: col }), c(n, { b: true, color: col }), c(a, { b: true, color: col, money: true })]);
  toc.rows.push([]);
  toc.rows.push(["สารบัญ (คลิกเพื่อไปยังหัวข้อ)", "จำนวน", "ยอดเงิน (บาท)"].map((h) => c(h, { b: true, fill: HEAD })));
  toc.rows.push([c("1 · รายการในสเตทเมนต์ที่จับคู่ไม่ได้ทั้งหมด", { b: true, u: true, color: "CF222E" }, to(S1)), r.unmatched.length, c(badAmt, { money: true })]);
  toc.rows.push([c("1.1 · รายละเอียดเพิ่มเติมสำหรับรายการที่ไม่สามารถหา payout ได้", { b: true, u: true, color: "CF222E" }, to(S11)), r.cases.length, c(badAmt, { money: true })]);
  r.cases.forEach((k, n) => toc.rows.push([c(`      ${n + 1}. ${k.row.no} · ${dmy(k.row.date)} ${k.row.time} น. · ${CAT_TH[k.cat]}`, { u: true, color: "0969DA" }, to(S11, `A${caseRow.get(k.row.no)}`)), null, c(k.row.amount, { money: true })]));
  toc.rows.push([c("2 · รายการในสเตทเมนต์ที่จับคู่กับรายการเงินออกได้", { b: true, u: true, color: "1A7F37" }, to(S2)), r.matched.length, c(goodAmt, { money: true })]);
  for (const b of BANKS) {
    const sel = r.matched.filter((x) => x.bank === b); if (!sel.length) continue;
    toc.rows.push([c(`      ${BANK_NAME[b]}`, { u: true, color: "0969DA" }, to(S2, `A${bankRow.get(b)}`)), sel.length, c(sel.reduce((s, x) => s + x.amount, 0), { money: true })]);
  }
  return workbook([toc, s1, s11, s2]);
}

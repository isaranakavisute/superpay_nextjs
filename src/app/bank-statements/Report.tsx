"use client";

import { Fragment } from "react";
import { BANK_NAME, CAT_TH, checklist, dest, dmy, money, PAYOUTS_SINCE, rawText, th, unmatchedReason, type CaseCat, type Payout, type Result } from "@/lib/recon/match";
import type { BankKey } from "@/lib/recon/parse";

const BANKS: BankKey[] = ["SCB", "KBANK", "BBL"];
const sum = (xs: { amount: number }[]) => xs.reduce((s, x) => s + x.amount, 0);
const last4 = (a: string) => a.replace(/\D/g, "").slice(-4);
const dt = (s: string) => `${dmy(s.slice(0, 10))} ${s.slice(11, 16)}`;

/** The report — same layout as the approved PDF: key figures · สารบัญ · 1 (red) · 1.1 (red, per case) · 2 (green). */
export function Report({ r, payouts, generatedAt }: { r: Result; payouts: Payout[]; generatedAt: string }) {
  const bad = r.unmatched, good = r.matched, badAmt = sum(bad), goodAmt = sum(good);
  const caseOf = new Map(r.cases.map((c) => [c.row.no, c]));
  const cats = (Object.keys(CAT_TH) as CaseCat[]).map((k) => ({ k, list: r.cases.filter((c) => c.cat === k) })).filter((x) => x.list.length);
  return (
    <div className="rdoc" id="recon-report">
      <h1>เปรียบเทียบกับ bank statement · {dmy(r.from)} – {dmy(r.to)}</h1>
      <p className="lead">สเตทเมนต์ {BANKS.filter((b) => r.info[b]).map((b) => BANK_NAME[b].replace("ธนาคาร", "")).join(" ")} — เฉพาะรายการโอนเงินออก เทียบกับรายการเงินออก (payout) ในระบบที่อนุมัติแล้ว ของวันเดียวกับในสเตทเมนต์ · สร้างเมื่อ {generatedAt}</p>
      <div className="note">หมายเหตุ: ระบบเริ่มบันทึกรายการเงินออก (payout) ตั้งแต่วันที่ {dmy(PAYOUTS_SINCE)} — จึงเทียบรายการในสเตทเมนต์ตั้งแต่วันที่ {dmy(r.from)} เป็นต้นไป (รายการก่อนหน้านั้นไม่มีรายการเงินออกในระบบให้เทียบ) · แสดงเฉพาะรายการโอนเงินออก</div>

      <div className="kpis">
        <div className="kpi"><div className="kl">รายการโอนเงินออกในสเตทเมนต์</div><div className="kv">{r.rows.length.toLocaleString()}</div><div className="ks">{money(goodAmt + badAmt)} บาท</div></div>
        <div className="kpi kg"><div className="kl">จับคู่กับ payout ได้</div><div className="kv">{good.length.toLocaleString()}</div><div className="ks">{money(goodAmt)} บาท · หัวข้อ 2</div></div>
        <div className="kpi kr"><div className="kl">จับคู่ไม่ได้</div><div className="kv">{bad.length}</div><div className="ks">{money(badAmt)} บาท · หัวข้อ 1 และ 1.1</div></div>
        <div className="kpi"><div className="kl">แยกตามธนาคาร (จับคู่ไม่ได้)</div><div className="ks2">{BANKS.filter((b) => r.info[b]).map((b) => { const s = bad.filter((x) => x.bank === b); return <div key={b}>{BANK_NAME[b]}: {s.length} รายการ · {money(sum(s))} บาท</div>; })}</div></div>
      </div>

      <div className="toc">
        <div className="toch">สารบัญ</div>
        <ol>
          <li><a href="#s1" className="rd">1 · รายการในสเตทเมนต์ที่จับคู่ไม่ได้ทั้งหมด</a> <span className="mut">— {bad.length} รายการ · {money(badAmt)} บาท</span></li>
          <li className="sub"><a href="#s11" className="rd">1.1 · รายละเอียดเพิ่มเติมสำหรับรายการที่ไม่สามารถหา payout ได้</a>
            <div className="tocc">{r.cases.map((c, n) => <a key={c.row.no} href={`#case-${n + 1}`}>{n + 1}. {c.row.no} ({money(c.row.amount)})</a>)}</div></li>
          <li><a href="#s2" className="gr">2 · รายการในสเตทเมนต์ที่จับคู่กับรายการเงินออกได้</a> <span className="mut">— {good.length.toLocaleString()} รายการ · {money(goodAmt)} บาท</span>
            <div className="tocc">{BANKS.filter((b) => good.some((x) => x.bank === b)).map((b) => <a key={b} href={`#s2-${b}`}>{BANK_NAME[b]} ({good.filter((x) => x.bank === b).length})</a>)}</div></li>
        </ol>
      </div>

      <section id="s1">
        <h2 className="rd">1 · 🔴 รายการในสเตทเมนต์ที่จับคู่ไม่ได้ทั้งหมด · {bad.length} รายการ · รวม {money(badAmt)} บาท</h2>
        <p className="hint">รายการโอนเงินออกในสเตทเมนต์ที่ไม่มีรายการเงินออก (payout) ในระบบรองรับ — ค้นรายการเงินออกทุกสถานะแล้ว · รายละเอียดแต่ละรายการอยู่ในหัวข้อ 1.1</p>
        {bad.length === 0 ? <p className="gr" style={{ fontWeight: 700 }}>✓ ทุกรายการโอนเงินออกในสเตทเมนต์จับคู่กับรายการเงินออกได้ — ไม่มีรายการสีแดง</p> : (
          <table className="t1">
            <thead><tr><th>ลำดับรายการ</th><th>บัญชีต้นทาง</th><th>วันที่/เวลาโอน</th><th className="num">ยอด (บาท)</th><th>ปลายทาง</th><th>ชื่อผู้รับ (ตามสเตทเมนต์)</th><th>กลุ่ม</th><th>เหตุผล</th></tr></thead>
            <tbody>{bad.map((x, i) => { const c = caseOf.get(x.no); return (
              <tr key={x.no} className="bad"><td className="id"><a href={`#case-${i + 1}`} style={{ color: "inherit" }}>{x.no}</a></td><td>{BANK_NAME[x.bank]}<br /><span className="mut">{r.info[x.bank]?.accountNo}</span></td>
                <td>{dmy(x.date)}<br />{x.time ? `${x.time} น.` : "—"}</td><td className="num"><b>{money(x.amount)}</b></td><td>{dest(x)}</td><td>{x.name || rawText(x)}</td>
                <td>{c && <span className={`cat cat-${c.cat}`}>{CAT_TH[c.cat]}</span>}</td><td className="why">{unmatchedReason(x, c, payouts)}</td></tr>); })}</tbody>
          </table>
        )}
        <table className="btot"><tbody>
          {BANKS.filter((b) => r.info[b]).map((b) => { const s = bad.filter((x) => x.bank === b); return <tr key={b}><td>{BANK_NAME[b]}</td><td className="num">{s.length} รายการ</td><td className="num"><b>{money(sum(s))} บาท</b></td></tr>; })}
          <tr className="stot"><td><b>รวมทั้งหมด</b></td><td className="num"><b>{bad.length} รายการ</b></td><td className="num rd"><b>{money(badAmt)} บาท</b></td></tr>
        </tbody></table>
      </section>

      <section id="s11" className="s11">
        <h2 className="rd">1.1 · 🔎 รายละเอียดเพิ่มเติมสำหรับรายการที่ไม่สามารถหา payout ได้ · {r.cases.length} รายการ · รวม {money(badAmt)} บาท</h2>
        {cats.length > 0 && (
          <table className="ev catsum"><thead><tr><th>กลุ่มข้อสันนิษฐาน</th><th className="num">จำนวน</th><th className="num">ยอดรวม</th><th>รายการ</th></tr></thead>
            <tbody>{cats.map(({ k, list }) => <tr key={k}><td><span className={`cat cat-${k}`}>{CAT_TH[k]}</span></td><td className="num">{list.length} รายการ</td><td className="num"><b>{money(sum(list.map((c) => c.row)))} บาท</b></td><td>{list.map((c) => c.row.no).join(", ")}</td></tr>)}
              <tr className="stot"><td><b>รวม</b></td><td className="num"><b>{r.cases.length} รายการ</b></td><td className="num rd"><b>{money(badAmt)} บาท</b></td><td /></tr></tbody></table>
        )}
        <p className="hint">ข้อสันนิษฐานได้จากการค้นข้อมูลในระบบ (รายการเงินออกทุกสถานะ และบัญชีธนาคารของระบบ) — ต้องยืนยันกับแอดมินและธนาคารก่อนสรุป · สเตทเมนต์แสดงเลขบัญชีปลายทางเฉพาะ 4 ตัวท้าย</p>
        {r.cases.map((c, n) => { const x = c.row; const full = c.sameAccount[0]?.account; return (
          <div className="case" id={`case-${n + 1}`} key={x.no}>
            <div className="ch"><span className="cn">{n + 1}</span> <b>{x.no}</b> · <b className="rd">{money(x.amount)} บาท</b> · โอนเมื่อ {dmy(x.date)} {x.time} น. · <span className={`cat cat-${c.cat}`}>{CAT_TH[c.cat]}</span></div>
            <div className="verdict">ข้อสันนิษฐาน: {c.verdict}</div>
            <div className="g3">
              <div><div className="sub">บัญชีต้นทาง (เงินออกจาก)</div><table className="kv"><tbody>
                <tr><td>ธนาคาร</td><td>{BANK_NAME[x.bank]}</td></tr><tr><td>เลขที่บัญชี</td><td><b>{c.src.accountNo}</b></td></tr><tr><td>ชื่อบัญชี</td><td>{c.src.owner}</td></tr>
                <tr><td>ยอดก่อนโอน / หลังโอน</td><td>{c.before != null ? money(c.before) : "—"} → {money(x.balance)} บาท</td></tr><tr><td>ช่องทาง</td><td>{x.channel || "—"}</td></tr></tbody></table></div>
              <div><div className="sub">บัญชีปลายทาง (เงินเข้าไปที่)</div><table className="kv"><tbody>
                <tr><td>ธนาคาร</td><td><b>ธนาคาร{th(x.destBank)}</b></td></tr>
                <tr><td>เลขที่บัญชี</td><td><b>{full ?? `xxxxxx${x.last4}`}</b>{full ? " (จากรายการเงินออกในระบบ)" : " (สเตทเมนต์แสดงเฉพาะ 4 ตัวท้าย)"}</td></tr>
                <tr><td>ชื่อตามสเตทเมนต์</td><td>{x.name}</td></tr><tr><td>ชื่อในระบบ</td><td>{c.sameAccount[0]?.receiverName ?? "—"}</td></tr>
                <tr><td>ชื่อเดียวกับเจ้าของบัญชีต้นทาง</td><td>{c.ownerSame ? <b className="rd">ใช่</b> : "ไม่ใช่"}</td></tr></tbody></table></div>
              <div><div className="sub">รายละเอียดในสเตทเมนต์</div><table className="kv"><tbody>
                <tr><td>วันที่/เวลาโอน</td><td><b>{dmy(x.date)} {x.time} น.</b></td></tr><tr><td>ยอดเงิน</td><td><b>{money(x.amount)} บาท</b></td></tr>
                <tr><td>ข้อความ</td><td>{rawText(x)}</td></tr><tr><td>เป็นบัญชีของระบบ</td><td>{c.ourAccount.join(", ") || "ไม่ใช่"}</td></tr></tbody></table></div>
            </div>
            {c.sameAccount.length ? <PayoutTable title={`รายการเงินออกในระบบที่ไปยังบัญชีเดียวกัน (ธนาคาร${th(x.destBank)} ลงท้าย ${x.last4}) — ทุกสถานะ · ${c.sameAccount.length} รายการ · แถวเหลือง = ยอดเท่ากัน`} list={c.sameAccount} amount={x.amount} />
              : <div className="sub">รายการเงินออกในระบบที่ไปยังบัญชีเดียวกัน: <b className="rd">ไม่พบเลย</b> (ค้นทุกสถานะ)</div>}
            {c.sameName.length > 0 && <PayoutTable title={`รายการเงินออกที่ชื่อผู้รับตรงกัน แต่เป็นบัญชีอื่น · ${c.sameName.length} รายการ`} list={c.sameName.slice(0, 8)} amount={x.amount} />}
            <div className="g2">
              <div><div className="sub">รายการก่อน–หลังในสเตทเมนต์ (แถวที่เน้น = รายการนี้)</div>
                <table className="ev"><thead><tr><th>วันที่/เวลา</th><th>ประเภท</th><th className="num">ยอด</th><th className="num">คงเหลือ</th><th>ข้อความ</th><th>จับคู่</th></tr></thead>
                  <tbody>{c.neighbours.map((nb, i) => <tr key={i} className={nb.me ? "me" : ""}><td>{dmy(nb.row.date)} {nb.row.time}</td><td>{nb.row.dir === "out" ? "ออก" : "เข้า"}</td><td className="num">{money(nb.row.amount)}</td><td className="num">{money(nb.row.balance)}</td><td>{rawText(nb.row).slice(0, 70)}</td><td>{nb.label}</td></tr>)}</tbody></table></div>
              <div><div className="sub">รายการเงินออกที่แอดมินกดเสร็จในช่วง ±15 นาที · {c.near.length} รายการ</div>
                {c.near.length ? <table className="ev"><thead><tr><th>เลขที่</th><th>กดเสร็จ</th><th className="num">ยอด</th><th>บัญชี</th><th>ชื่อผู้รับ</th><th>แอดมิน</th></tr></thead>
                  <tbody>{c.near.slice(0, 8).map((p) => <tr key={p.ref}><td className="id">{p.ref}</td><td>{p.done.slice(11, 16)}</td><td className="num">{money(p.amount)}</td><td>{th(p.bank)} ••{last4(p.account)}</td><td>{p.receiverName.slice(0, 30)}</td><td>{p.doneBy}</td></tr>)}</tbody></table> : <p className="hint">ไม่มี</p>}</div>
            </div>
            <div className="next"><b>สิ่งที่ควรตรวจต่อ:</b> {c.next.join(" · ")}</div>
          </div>); })}
      </section>

      <section id="s2" className="s2">
        <h2 className="gr">2 · 🟢 รายการในสเตทเมนต์ที่จับคู่กับรายการเงินออกได้ · {good.length.toLocaleString()} รายการ · รวม {money(goodAmt)} บาท</h2>
        <table className="t2">
          <thead>
            <tr><th colSpan={5} className="hs">รายการในสเตทเมนต์ธนาคาร</th><th colSpan={4} className="hp">รายการเงินออก (payout) ในระบบที่จับคู่ได้</th><th colSpan={2} className="hf">ข้อมูลที่ตรงกัน</th></tr>
            <tr><th>ลำดับรายการ</th><th>เวลา</th><th className="num">ยอด (บาท)</th><th>ปลายทาง</th><th>ชื่อผู้รับ (สเตทเมนต์)</th><th>เลขที่รายการเงินออก</th><th>ร้านค้า</th><th>กดเสร็จ</th><th>ชื่อผู้รับ (ในระบบ)</th><th>ตรวจแล้วตรงกัน</th><th>หมายเหตุ</th></tr>
          </thead>
          <tbody>{BANKS.map((b) => { const sel = good.filter((x) => x.bank === b); if (!sel.length) return null; let cur = "";
            return (<Fragment key={b}>
              <tr className="bankh" id={`s2-${b}`}><td colSpan={11}>{BANK_NAME[b]} · บัญชี {r.info[b]?.accountNo} · จับคู่ได้ {sel.length} รายการ · {money(sum(sel))} บาท{b === "BBL" ? " — สเตทเมนต์ธนาคารกรุงเทพไม่มีเวลา เลขบัญชี และชื่อ: จับคู่จากยอดเงิน + ประเภทปลายทาง + ลำดับ" : ""}</td></tr>
              {sel.map((x) => { const m = r.match.get(x.no)!; const p = m.payout; const { chk, note } = checklist(x, m); const head = x.date !== cur; cur = x.date;
                return (<Fragment key={x.no}>
                  {head && <tr className="day"><td colSpan={11}>วันที่ {dmy(x.date)} · {sel.filter((y) => y.date === x.date).length} รายการ</td></tr>}
                  <tr className="ok"><td className="id">{x.no}</td><td>{x.time || "—"}</td><td className="num">{money(x.amount)}</td><td>{dest(x)}</td><td className="nm">{x.name || rawText(x)}</td>
                    <td className="id">{p.ref}</td><td className="nm">{p.merchant}</td><td>{p.done.slice(0, 10) === x.date ? p.done.slice(11, 16) : dt(p.done).slice(0, 5) + " " + p.done.slice(11, 16)}</td>
                    <td className="nm">{p.receiverName}</td><td className="chk">{chk}</td><td className="note2">{note}</td></tr>
                </Fragment>); })}
            </Fragment>); })}</tbody>
        </table>
      </section>
    </div>
  );
}

function PayoutTable({ title, list, amount }: { title: string; list: (Payout & { stmt: string })[]; amount: number }) {
  const ST: Record<string, string> = { approved: "อนุมัติ", rejected: "ปฏิเสธ", pending: "รอดำเนินการ" };
  return (<>
    <div className="sub">{title}</div>
    <table className="ev"><thead><tr><th>เลขที่รายการเงินออก</th><th>สถานะ</th><th className="num">ยอด</th><th>บัญชีผู้รับ (เต็ม)</th><th>ชื่อผู้รับ</th><th>สร้างเมื่อ</th><th>กดเสร็จเมื่อ</th><th>แอดมิน</th><th>ร้านค้า</th><th>พบในสเตทเมนต์</th></tr></thead>
      <tbody>{list.map((o) => <tr key={o.ref} className={Math.abs(o.amount - amount) < 0.005 ? "hl" : ""}><td className="id">{o.ref}</td><td>{ST[o.status] ?? o.status}</td><td className="num">{money(o.amount)}</td>
        <td>{th(o.bank)} {o.account}</td><td>{o.receiverName}</td><td>{dt(o.created)}</td><td>{o.done ? dt(o.done) : "—"}</td><td>{o.doneBy || "—"}</td><td>{o.merchant}</td>
        <td>{o.stmt || <span className="rd">ไม่พบในสเตทเมนต์</span>}</td></tr>)}</tbody></table>
  </>);
}

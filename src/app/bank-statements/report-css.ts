// Styles of the report "paper" — the same look as the approved PDF. Used on the page and in the print (PDF) window.
export const REPORT_CSS = `
.rdoc { background:#fff; color:#1f2328; font-family:"Sukhumvit Set","Thonburi","Noto Sans Thai",sans-serif; font-size:13px; line-height:1.45; padding:24px; border-radius:12px; }
.rdoc h1 { font-size:22px; font-weight:700; margin:0; }
.rdoc h2 { font-size:19px; font-weight:700; margin:22px 0 6px; }
.rdoc .lead { color:#57606a; margin:4px 0 10px; }
.rdoc .note { background:#fff8c5; border:1px solid #d4a72c; color:#7d4e00; border-radius:6px; padding:6px 12px; font-weight:700; margin:0 0 12px; }
.rdoc .gr { color:#1a7f37; } .rdoc .rd { color:#cf222e; } .rdoc .mut { color:#6e7781; font-weight:400; }
.rdoc .hint { color:#57606a; margin:0 0 6px; }
.rdoc .kpis { display:grid; grid-template-columns:1fr 1fr 1fr 1.4fr; gap:12px; margin:0 0 12px; }
.rdoc .kpi { border:1px solid #d0d7de; border-radius:10px; padding:10px 14px; border-top:4px solid #8c959f; }
.rdoc .kpi.kg { border-top-color:#1a7f37; } .rdoc .kpi.kr { border-top-color:#cf222e; background:#fff6f5; }
.rdoc .kl { color:#57606a; font-weight:600; } .rdoc .kv { font-size:30px; font-weight:700; line-height:1.15; } .rdoc .kg .kv { color:#1a7f37; } .rdoc .kr .kv { color:#cf222e; } .rdoc .ks { color:#57606a; } .rdoc .ks2 { margin-top:4px; line-height:1.6; }
.rdoc .toc { border:1px solid #d0d7de; border-radius:10px; padding:10px 16px; margin:0 0 12px; background:#f6f8fa; }
.rdoc .toch { font-weight:700; font-size:15px; margin-bottom:4px; } .rdoc .toc ol { list-style:none; margin:0; padding:0; } .rdoc .toc li { margin:4px 0; } .rdoc .toc li.sub { margin-left:24px; }
.rdoc .toc a { text-decoration:none; font-weight:700; } .rdoc .tocc { margin:3px 0 0 16px; font-size:12px; } .rdoc .tocc a { font-weight:400; color:#0969da; margin-right:12px; white-space:nowrap; }
.rdoc table { width:100%; border-collapse:collapse; }
.rdoc th, .rdoc td { border-bottom:1px solid #e6e8eb; padding:4px 6px; text-align:left; vertical-align:top; }
.rdoc th { background:#f6f8fa; font-weight:600; font-size:12px; } .rdoc thead { display:table-header-group; }
.rdoc th.hs { background:#e8edf3; } .rdoc th.hp { background:#f1ebdd; } .rdoc th.hf { background:#e3f0e6; }
.rdoc td.num, .rdoc th.num { text-align:right; white-space:nowrap; } .rdoc td.id { white-space:nowrap; font-family:Menlo,monospace; font-size:11.5px; }
.rdoc tr { break-inside:avoid; }
.rdoc tr.bad td { background:#ffe3e0; } .rdoc tr.bad td:first-child { box-shadow:inset 3px 0 #cf222e; }
.rdoc tr.ok td { background:#e6f6ea; } .rdoc tr.ok:nth-child(even) td { background:#d9f2df; } .rdoc tr.ok td:first-child { box-shadow:inset 3px 0 #1a7f37; }
.rdoc tr.bankh td { background:#24292f; color:#fff; font-weight:700; padding:6px 8px; }
.rdoc tr.day td { background:#fff; font-weight:700; padding-top:8px; border-bottom:1.5px solid #8c959f; }
.rdoc tr.stot td { border-top:1.5px solid #8c959f; }
.rdoc table.t1 td { padding:6px 8px; } .rdoc td.why { font-size:12px; color:#a40e26; max-width:420px; }
.rdoc table.t2 td { font-size:12px; padding:3px 6px; } .rdoc td.chk { color:#116329; white-space:nowrap; } .rdoc td.note2 { color:#7d4e00; font-size:11.5px; max-width:300px; } .rdoc td.nm { max-width:200px; }
.rdoc table.btot { width:auto; min-width:440px; margin:8px 0 0 auto; } .rdoc table.btot td { background:#fff3f1; padding:4px 12px; }
.rdoc .cat { display:inline-block; padding:1px 8px; border-radius:4px; font-size:11.5px; font-weight:600; }
.rdoc .cat-own { background:#ddf4ff; color:#0550ae; } .rdoc .cat-date { background:#fff8c5; color:#7d4e00; } .rdoc .cat-dup { background:#ffebe9; color:#a40e26; } .rdoc .cat-known { background:#fbefff; color:#6639ba; } .rdoc .cat-none { background:#ffe3e0; color:#a40e26; }
.rdoc table.catsum { width:auto; min-width:640px; margin-bottom:8px; }
.rdoc .case { border:1.5px solid #cf222e; border-radius:10px; padding:10px 12px; margin:0 0 14px; break-inside:avoid; background:#fffafa; }
.rdoc .ch { font-size:15px; margin-bottom:4px; } .rdoc .cn { display:inline-block; background:#cf222e; color:#fff; border-radius:50%; width:22px; height:22px; text-align:center; line-height:22px; font-weight:700; }
.rdoc .verdict { background:#fff3f1; border-left:3px solid #cf222e; padding:5px 10px; margin:4px 0 8px; font-weight:600; }
.rdoc .g3 { display:grid; grid-template-columns:1fr 1fr 1.2fr; gap:12px; } .rdoc .g2 { display:grid; grid-template-columns:1.2fr 1fr; gap:12px; margin-top:6px; }
.rdoc .sub { font-weight:700; color:#424a53; margin:6px 0 3px; font-size:12px; }
.rdoc table.kv td { background:#fff; padding:2px 6px; font-size:12px; } .rdoc table.kv td:first-child { color:#57606a; white-space:nowrap; width:130px; }
.rdoc table.ev th, .rdoc table.ev td { font-size:11.5px; padding:2px 5px; background:#fff; } .rdoc table.ev tr.hl td { background:#fff8c5; } .rdoc table.ev tr.me td { background:#ffe3e0; font-weight:700; }
.rdoc .next { margin-top:6px; background:#f6f8fa; border-radius:6px; padding:5px 10px; }
.rdoc .legend span { display:inline-block; padding:2px 8px; border-radius:4px; margin-right:8px; }
@media print {
  @page { size: A4 landscape; margin: 8mm; @bottom-right { content: "หน้า " counter(page) " / " counter(pages); font-size: 8pt; color: #6e7781; } @bottom-left { content: "เปรียบเทียบกับ bank statement · เอกสารลับ"; font-size: 8pt; color: #6e7781; } }
  body { margin:0; background:#fff; } .rdoc { padding:0; font-size:8.4pt; border-radius:0; } .rdoc h1 { font-size:15pt; } .rdoc h2 { font-size:13pt; break-after:avoid; }
  .rdoc .kv { font-size:20pt; } .rdoc table.t2 td { font-size:7.6pt; padding:.6mm 1.2mm; } .rdoc table.t1 td { font-size:8.4pt; } .rdoc td.why { font-size:7.8pt; }
  .rdoc section.s11, .rdoc section.s2 { break-before:page; } .rdoc .noprint { display:none !important; }
  .rdoc table.ev th, .rdoc table.ev td, .rdoc table.kv td { font-size:7.2pt; } .rdoc tr.bankh td, .rdoc tr.day td { break-after:avoid; }
}
`;

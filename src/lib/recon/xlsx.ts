// Minimal .xlsx writer (no dependency): styled cells, column widths, frozen panes, internal links, auto-filter.
// Runs in the browser — the workbook is built in memory and downloaded; nothing is sent to the server.

export type Style = { b?: boolean; color?: string; sz?: number; u?: boolean; fill?: string; money?: boolean; text?: boolean; wrap?: boolean };
export type Cell = string | number | null | { v: string | number | null; s?: Style; link?: string };
export type Sheet = { name: string; widths: number[]; rows: Cell[][]; freeze?: string; filter?: string; heights?: Record<number, number> };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
const col = (n: number) => { let s = ""; for (n++; n; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b: Uint8Array) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

function zip(files: { name: string; data: Uint8Array }[]): Blob {
  const enc = new TextEncoder(); const parts: Uint8Array[] = []; const central: Uint8Array[] = []; let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.data), size = f.data.length;
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint32(14, crc, true); h.setUint32(18, size, true); h.setUint32(22, size, true); h.setUint16(26, name.length, true);
    parts.push(new Uint8Array(h.buffer), name, f.data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
    c.setUint32(16, crc, true); c.setUint32(20, size, true); c.setUint32(24, size, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), name);
    offset += 30 + name.length + size;
  }
  const csize = central.reduce((s, b) => s + b.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(e.buffer)] as BlobPart[], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function workbook(sheets: Sheet[]): Blob {
  const styles: string[] = []; const fonts = ['<font><sz val="11"/><name val="Tahoma"/></font>']; const fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'];
  const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>'];
  const styleId = (s?: Style) => {
    if (!s) return 0;
    const key = JSON.stringify(s); const at = styles.indexOf(key); if (at >= 0) return at + 1;
    const font = `<font>${s.b ? "<b/>" : ""}${s.u ? "<u/>" : ""}<sz val="${s.sz ?? 11}"/>${s.color ? `<color rgb="FF${s.color}"/>` : ""}<name val="Tahoma"/></font>`;
    let fi = fonts.indexOf(font); if (fi < 0) { fonts.push(font); fi = fonts.length - 1; }
    let fl = 0; if (s.fill) { const f = `<fill><patternFill patternType="solid"><fgColor rgb="FF${s.fill}"/></patternFill></fill>`; fl = fills.indexOf(f); if (fl < 0) { fills.push(f); fl = fills.length - 1; } }
    const num = s.money ? 4 : s.text ? 49 : 0;
    xfs.push(`<xf numFmtId="${num}" fontId="${fi}" fillId="${fl}" borderId="0" applyFont="1"${fl ? ' applyFill="1"' : ""}${num ? ' applyNumberFormat="1"' : ""}${s.wrap ? ' applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>' : ' applyAlignment="1"><alignment vertical="top"/></xf>'}`);
    styles.push(key); return styles.length;
  };
  const enc = new TextEncoder();
  const sheetXml = sheets.map((sh) => {
    const links: string[] = [];
    const rows = sh.rows.map((r, ri) => {
      const cells = r.map((c, ci) => {
        if (c == null || c === "") return "";
        const o = typeof c === "object" ? c : { v: c };
        if (o.v == null || o.v === "") return o.s ? `<c r="${col(ci)}${ri + 1}" s="${styleId(o.s)}"/>` : "";
        const ref = `${col(ci)}${ri + 1}`; if (o.link) links.push(`<hyperlink ref="${ref}" location="${esc(o.link)}" display="${esc(String(o.v))}"/>`);
        const s = styleId(o.s);
        return typeof o.v === "number" ? `<c r="${ref}" s="${s}"><v>${o.v}</v></c>` : `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(o.v)}</t></is></c>`;
      }).join("");
      const ht = sh.heights?.[ri + 1];
      return `<row r="${ri + 1}"${ht ? ` ht="${ht}" customHeight="1"` : ""}>${cells}</row>`;
    }).join("");
    const pane = sh.freeze ? (() => { const m = sh.freeze!.match(/^([A-Z]+)(\d+)$/)!; const x = m[1].charCodeAt(0) - 65, y = Number(m[2]) - 1;
      return `<sheetViews><sheetView workbookViewId="0"><pane${x ? ` xSplit="${x}"` : ""}${y ? ` ySplit="${y}"` : ""} topLeftCell="${sh.freeze}" activePane="bottomRight" state="frozen"/></sheetView></sheetViews>`; })() : "";
    return enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${pane}<cols>${sh.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${rows}</sheetData>${sh.filter ? `<autoFilter ref="${sh.filter}"/>` : ""}${links.length ? `<hyperlinks>${links.join("")}</hyperlinks>` : ""}</worksheet>`);
  });
  const files = [
    { name: "[Content_Types].xml", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`) },
    { name: "_rels/.rels", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`) },
    { name: "xl/workbook.xml", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>${sheets.some((s) => s.filter) ? `<definedNames>${sheets.map((s, i) => s.filter ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${esc(s.name)}'!$${s.filter.replace(":", ":$").replace(/([A-Z]+)(\d+)/g, "$1$$$2")}</definedName>` : "").join("")}</definedNames>` : ""}</workbook>`) },
    { name: "xl/_rels/workbook.xml.rels", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`) },
    ...sheetXml.map((data, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data })),
  ];
  files.push({ name: "xl/styles.xml", data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="${fonts.length}">${fonts.join("")}</fonts><fills count="${fills.length}">${fills.join("")}</fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join("")}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`) });
  return zip(files);
}

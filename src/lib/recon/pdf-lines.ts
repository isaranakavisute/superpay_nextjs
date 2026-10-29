// PDF (password-protected) → text lines, in reading order, with pdf.js. The caller passes the pdf.js module so the same
// code runs in the browser (worker) and in Node tests. Nothing is stored; the bytes stay in memory.

type TextItem = { str: string; transform: number[]; width: number };
type PdfJs = {
  getDocument: (src: { data: Uint8Array; password?: string; isEvalSupported?: boolean }) => { promise: Promise<PdfDoc>; destroy: () => Promise<void> };
};
type PdfDoc = { numPages: number; getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: unknown[] }> }> };

export class PdfPasswordError extends Error {}

export async function pdfLines(pdfjs: PdfJs, data: Uint8Array, password: string): Promise<string[]> {
  let doc: PdfDoc;
  const task = pdfjs.getDocument({ data, password, isEvalSupported: false });
  try {
    doc = await task.promise;
  } catch (e) {
    const name = (e as { name?: string }).name;
    await task.destroy().catch(() => {});
    if (name === "PasswordException") throw new PdfPasswordError("รหัสผ่านไม่ถูกต้อง");
    throw e;
  }
  const out: string[] = [];
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const items = (await page.getTextContent()).items.filter((i): i is TextItem => typeof (i as TextItem).str === "string" && (i as TextItem).str !== "");
      // group by baseline (y), top to bottom; within a line, left to right
      const lines: { y: number; parts: TextItem[] }[] = [];
      for (const it of items) {
        const y = it.transform[5];
        const line = lines.find((l) => Math.abs(l.y - y) < 2.5);
        if (line) line.parts.push(it); else lines.push({ y, parts: [it] });
      }
      lines.sort((a, b) => b.y - a.y);
      for (const l of lines) {
        l.parts.sort((a, b) => a.transform[4] - b.transform[4]);
        let s = "", end = -Infinity;
        for (const it of l.parts) {
          const x = it.transform[4];
          if (s && x - end > 1.2 && !s.endsWith(" ") && !it.str.startsWith(" ")) s += " ";
          s += it.str; end = x + it.width;
        }
        out.push(s.replace(/\s+/g, " ").trim());
      }
    }
  } finally {
    await task.destroy();
  }
  return out;
}

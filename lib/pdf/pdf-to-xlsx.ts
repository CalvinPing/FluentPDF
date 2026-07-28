import type { PDFDocumentProxy } from "pdfjs-dist";
import writeXlsxFile from "write-excel-file/browser";
import { extractPositionedText, groupIntoLines, type PositionedTextItem } from "@/lib/pdf/text-extraction";

// A horizontal gap wider than this multiple of the text height reads as a column boundary rather
// than just a space within one cell.
const COLUMN_GAP_MULTIPLIER = 2.5;

function lineToCells(line: PositionedTextItem[]): string[] {
  const cells: string[] = [];
  let current = "";
  for (let i = 0; i < line.length; i++) {
    const item = line[i];
    if (i > 0) {
      const prev = line[i - 1];
      const gap = item.x - (prev.x + prev.width);
      if (gap > prev.height * COLUMN_GAP_MULTIPLIER) {
        cells.push(current.trim());
        current = "";
      } else if (gap > prev.height * 0.25) {
        current += " ";
      }
    }
    current += item.str;
  }
  cells.push(current.trim());
  return cells;
}

/**
 * Best-effort PDF → Excel: clusters each page's text into rows (by vertical position) and cells
 * within a row (by horizontal gaps), one sheet per PDF page. A PDF stores only positioned text,
 * not real table/cell structure, so this works well for clean, simple tables (invoices, price
 * lists) but won't reliably reconstruct merged cells, wrapped cell text, or non-tabular layouts.
 */
export async function pdfToXlsx(pdf: PDFDocumentProxy, pageCount: number): Promise<Uint8Array> {
  const sheets: { data: { value: string }[][]; sheet: string }[] = [];

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const { items } = await extractPositionedText(pdf, pageIndex + 1);
    const lines = groupIntoLines(items);
    const rows = lines.map((line) => lineToCells(line).map((value) => ({ value })));
    sheets.push({ data: rows.length > 0 ? rows : [[{ value: "" }]], sheet: `Page ${pageIndex + 1}` });
  }

  const blob = await writeXlsxFile(sheets.map((s) => ({ data: s.data, sheet: s.sheet }))).toBlob();
  return new Uint8Array(await blob.arrayBuffer());
}

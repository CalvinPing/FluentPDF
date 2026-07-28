import type { PDFDocumentProxy } from "pdfjs-dist";

export interface PositionedTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Pulls pdfjs's text items for one page, keeping only real text runs (not marked-content
 *  markers) and their position/size — the raw material every PDF→text-based-format conversion
 *  (Text, Word, Excel) clusters into lines, paragraphs, or table cells. */
export async function extractPositionedText(
  pdf: PDFDocumentProxy,
  pageNumber: number,
): Promise<{ items: PositionedTextItem[]; pageWidth: number; pageHeight: number }> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();
  const items: PositionedTextItem[] = content.items
    .filter((it) => typeof (it as { str?: unknown }).str === "string")
    .map((it) => {
      const raw = it as { str: string; transform: number[]; width: number; height: number };
      return { str: raw.str, x: raw.transform[4], y: raw.transform[5], width: raw.width, height: raw.height };
    });
  return { items, pageWidth: viewport.width, pageHeight: viewport.height };
}

/** Groups text items on one page into visual lines, sorted left-to-right within each line and
 *  top-to-bottom (PDF's y axis runs bottom-up, hence the descending sort) across lines. */
export function groupIntoLines(items: PositionedTextItem[], yTolerance = 2.5): PositionedTextItem[][] {
  const lines: PositionedTextItem[][] = [];
  for (const item of items) {
    if (!item.str) continue;
    const line = lines.find((l) => Math.abs(l[0].y - item.y) <= yTolerance);
    if (line) line.push(item);
    else lines.push([item]);
  }
  for (const line of lines) line.sort((a, b) => a.x - b.x);
  lines.sort((a, b) => b[0].y - a[0].y);
  return lines;
}

/** Joins one line's items into readable text, inserting a space wherever there's a real visible
 *  gap between consecutive runs — pdfjs doesn't itself emit a space between two separately
 *  positioned runs, e.g. either side of a tab stop or column gap. */
export function lineToText(line: PositionedTextItem[]): string {
  let text = "";
  for (let i = 0; i < line.length; i++) {
    const item = line[i];
    if (i > 0) {
      const prev = line[i - 1];
      const gap = item.x - (prev.x + prev.width);
      if (gap > prev.height * 0.25) text += " ";
    }
    text += item.str;
  }
  return text;
}

import type { PDFDocumentProxy } from "pdfjs-dist";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { extractPositionedText, groupIntoLines, lineToText } from "@/lib/pdf/text-extraction";

// A line-to-line vertical gap wider than this multiple of the previous line's own text height
// reads as a paragraph break rather than just ordinary single-spaced line wrapping.
const PARAGRAPH_GAP_MULTIPLIER = 1.6;

/**
 * Best-effort PDF → Word: reflows each page's extracted text into paragraphs, grouped by
 * vertical spacing. A PDF stores only positioned text, not "this is a paragraph" or "this is a
 * table" — so this works well for simple, single-column documents, but multi-column layouts and
 * tables come through as plain reflowed lines rather than reconstructed as such.
 */
export async function pdfToDocx(pdf: PDFDocumentProxy, pageCount: number): Promise<Uint8Array> {
  const paragraphs: Paragraph[] = [];

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const { items } = await extractPositionedText(pdf, pageIndex + 1);
    const lines = groupIntoLines(items);

    let currentLines: string[] = [];
    let prevY: number | null = null;
    let prevHeight = 0;

    const flush = () => {
      if (currentLines.length === 0) return;
      paragraphs.push(new Paragraph({ children: [new TextRun(currentLines.join(" "))] }));
      currentLines = [];
    };

    for (const line of lines) {
      const y = line[0].y;
      if (prevY !== null && prevY - y > prevHeight * PARAGRAPH_GAP_MULTIPLIER) flush();
      currentLines.push(lineToText(line));
      prevY = y;
      prevHeight = Math.max(...line.map((it) => it.height));
    }
    flush();

    if (pageIndex < pageCount - 1) paragraphs.push(new Paragraph({ text: "" }));
  }

  if (paragraphs.length === 0) paragraphs.push(new Paragraph({ text: "" }));

  const doc = new Document({ sections: [{ children: paragraphs }] });
  return new Uint8Array(await Packer.toArrayBuffer(doc));
}

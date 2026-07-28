import type { PDFDocumentProxy } from "pdfjs-dist";
import { extractPositionedText, groupIntoLines, lineToText } from "@/lib/pdf/text-extraction";

/** Extracts every page's text in reading order, reconstructing line breaks from text position
 *  (PDF has no concept of "line" in its data — this is read back out of where each run of text
 *  actually sits on the page). Pages are separated by a blank line. */
export async function pdfToText(pdf: PDFDocumentProxy, pageCount: number): Promise<string> {
  const pages: string[] = [];
  for (let i = 0; i < pageCount; i++) {
    const { items } = await extractPositionedText(pdf, i + 1);
    const lines = groupIntoLines(items);
    pages.push(lines.map(lineToText).join("\n"));
  }
  return pages.join("\n\n");
}

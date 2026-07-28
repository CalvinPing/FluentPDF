import mammoth from "mammoth";
import { htmlStringToPdf } from "@/lib/pdf/html-to-pdf";

/**
 * Converts a .docx file to PDF by first turning it into HTML (via mammoth — picks up paragraphs,
 * headings, bold/italic, and simple lists) and then rendering that HTML to PDF pages. Tables,
 * multi-column layouts, headers/footers, and precise Word formatting won't survive the trip —
 * this is meant for straightforward text documents, not a full Word layout engine.
 */
export async function docxToPdf(bytes: Uint8Array): Promise<Uint8Array> {
  const arrayBuffer = bytes.slice().buffer as ArrayBuffer;
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
  return htmlStringToPdf(html);
}

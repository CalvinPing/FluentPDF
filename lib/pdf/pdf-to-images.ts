import type { PDFDocumentProxy } from "pdfjs-dist";
import { renderPageToCanvas } from "@/lib/pdf/render";

export type ImageExportFormat = "png" | "jpg";

// Roughly 2x a Letter/A4 page at 96dpi — sharp enough for print without producing huge files.
const RENDER_WIDTH = 1600;

/** Renders every page of `pdf` to its own image at a fixed print-quality width, independent of
 *  whatever size it happens to be displayed at on screen. Returns one Uint8Array per page. */
export async function pdfToImages(
  pdf: PDFDocumentProxy,
  pageCount: number,
  format: ImageExportFormat = "jpg",
): Promise<Uint8Array[]> {
  const mimeType = format === "jpg" ? "image/jpeg" : "image/png";
  const outputs: Uint8Array[] = [];

  for (let i = 0; i < pageCount; i++) {
    const canvas = document.createElement("canvas");
    const { task } = renderPageToCanvas(pdf, i + 1, canvas, RENDER_WIDTH);
    await task;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, 0.92));
    if (!blob) throw new Error(`Couldn't render page ${i + 1} as an image.`);
    outputs.push(new Uint8Array(await blob.arrayBuffer()));
  }

  return outputs;
}

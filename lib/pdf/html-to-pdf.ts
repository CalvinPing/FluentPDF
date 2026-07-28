import html2canvas from "html2canvas";
import { imagesToPdf } from "@/lib/pdf/images-to-pdf";

const PAGE_WIDTH_PX = 816; // 8.5in at 96dpi (US Letter) — the width the hidden container renders at
const PAGE_HEIGHT_PX = 1056; // 11in at 96dpi

/**
 * Renders an HTML string into a hidden, off-screen container sized to a standard page width,
 * rasterizes it with the browser's own layout engine, and slices the result into page-height
 * images — then hands those to the same image→PDF path the Images tool uses, one PDF page per
 * slice. This produces a genuine screenshot of the rendered HTML, not a text-flow-aware export:
 * it looks right, but the PDF's "text" is really a picture of text, not selectable PDF content.
 *
 * Runs entirely on the main thread rather than the Comlink pdf-worker — html2canvas reads real
 * DOM/layout state, which a Web Worker has no access to.
 */
export async function htmlStringToPdf(html: string): Promise<Uint8Array> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-99999px";
  container.style.top = "0";
  container.style.width = `${PAGE_WIDTH_PX}px`;
  container.style.padding = "48px";
  container.style.boxSizing = "border-box";
  container.style.background = "#ffffff";
  container.style.color = "#000000";
  container.style.fontFamily = "Georgia, 'Times New Roman', serif";
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { backgroundColor: "#ffffff", scale: 2 });
    const sliceHeightPx = Math.round((PAGE_HEIGHT_PX / PAGE_WIDTH_PX) * canvas.width);
    const slices: { bytes: Uint8Array; format: "jpg" }[] = [];

    for (let y = 0; y < canvas.height; y += sliceHeightPx) {
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = Math.min(sliceHeightPx, canvas.height - y);
      const ctx = sliceCanvas.getContext("2d");
      if (!ctx) continue;
      ctx.drawImage(canvas, 0, y, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
      const blob = await new Promise<Blob | null>((resolve) => sliceCanvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) continue;
      slices.push({ bytes: new Uint8Array(await blob.arrayBuffer()), format: "jpg" });
    }

    if (slices.length === 0) throw new Error("Couldn't render that HTML.");
    return imagesToPdf(slices);
  } finally {
    document.body.removeChild(container);
  }
}

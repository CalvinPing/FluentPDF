import type { PDFDocumentProxy } from "pdfjs-dist";
import PptxGenJS from "pptxgenjs";
import { renderPageToCanvas } from "@/lib/pdf/render";

const RENDER_WIDTH = 1600;
const SLIDE_WIDTH_IN = 10; // pptxgenjs's layout unit is inches; 10" is a common full-bleed size

/**
 * Renders each PDF page as an image and places it full-bleed on its own slide — looks visually
 * identical to the source PDF, but (unlike a true layout-aware PDF→PowerPoint conversion) the
 * text within each slide is a picture of text, not an editable PowerPoint text box.
 */
export async function pdfToPptx(pdf: PDFDocumentProxy, pageCount: number): Promise<Uint8Array> {
  const pres = new PptxGenJS();
  let slideHeightIn = 7.5;
  let layoutSet = false;

  for (let i = 0; i < pageCount; i++) {
    const canvas = document.createElement("canvas");
    const { task } = renderPageToCanvas(pdf, i + 1, canvas, RENDER_WIDTH);
    const { width, height } = await task;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

    // The layout (slide size) applies to the whole presentation, so it's fixed once from the
    // first page's aspect ratio — later pages with a different ratio would just not be full-bleed.
    if (!layoutSet) {
      slideHeightIn = SLIDE_WIDTH_IN / (width / height);
      pres.defineLayout({ name: "PDF_PAGE", width: SLIDE_WIDTH_IN, height: slideHeightIn });
      pres.layout = "PDF_PAGE";
      layoutSet = true;
    }

    const slide = pres.addSlide();
    slide.addImage({ data: dataUrl, x: 0, y: 0, w: SLIDE_WIDTH_IN, h: slideHeightIn });
  }

  const output = await pres.write({ outputType: "uint8array" });
  return output as Uint8Array;
}

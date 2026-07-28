import { PDFDocument } from "pdf-lib";

export interface CropMargins {
  /** All in PDF points (1/72 inch), measured in from each edge of the page's current crop box. */
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export async function cropPdf(bytes: Uint8Array, margins: CropMargins): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });

  doc.getPages().forEach((page) => {
    const box = page.getCropBox();
    const width = Math.max(1, box.width - margins.left - margins.right);
    const height = Math.max(1, box.height - margins.top - margins.bottom);
    page.setCropBox(box.x + margins.left, box.y + margins.bottom, width, height);
  });

  return doc.save();
}

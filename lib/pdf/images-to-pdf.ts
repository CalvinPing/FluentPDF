import { PDFDocument } from "pdf-lib";

export type ImageFormat = "png" | "jpg";

export interface ImageInput {
  bytes: Uint8Array;
  format: ImageFormat;
}

/** Packs one or more images into a PDF, one page per image. Each page is sized to match its
 * image's own pixel dimensions (1px = 1pt) and the image fills it edge-to-edge, so nothing gets
 * cropped, padded, or stretched. */
export async function imagesToPdf(images: ImageInput[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();

  for (const image of images) {
    const embedded = image.format === "png" ? await doc.embedPng(image.bytes) : await doc.embedJpg(image.bytes);
    const page = doc.addPage([embedded.width, embedded.height]);
    page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
  }

  return doc.save();
}

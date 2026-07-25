import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";

export interface PageOp {
  originalIndex: number;
  /** Additional rotation to apply on top of the page's existing rotation, in degrees (multiple of 90). */
  rotationDelta: number;
}

export interface TextAnnotation {
  /** Index into the *final* (post-reorder) page order. */
  pageIndex: number;
  /** 0-1, relative to page width. */
  xRatio: number;
  /** 0-1, relative to page height, measured from the top. */
  yRatio: number;
  text: string;
  fontSize: number;
}

export async function applyPageEdits(
  bytes: Uint8Array,
  order: PageOp[],
  annotations: TextAnnotation[],
): Promise<Uint8Array> {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const out = await PDFDocument.create();
  const font = await out.embedFont(StandardFonts.Helvetica);

  const copied = await out.copyPages(
    src,
    order.map((op) => op.originalIndex),
  );

  copied.forEach((page, i) => {
    const rotationDelta = order[i].rotationDelta;
    const newAngle = (page.getRotation().angle + rotationDelta + 360) % 360;
    page.setRotation(degrees(newAngle));
    out.addPage(page);
  });

  annotations.forEach((ann) => {
    const page = out.getPage(ann.pageIndex);
    const { width, height } = page.getSize();
    page.drawText(ann.text, {
      x: ann.xRatio * width,
      y: height - ann.yRatio * height - ann.fontSize,
      size: ann.fontSize,
      font,
      color: rgb(0.06, 0.09, 0.16),
    });
  });

  return out.save();
}

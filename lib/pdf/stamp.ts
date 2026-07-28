import { PDFDocument, StandardFonts, rgb, degrees, type PDFFont, type PDFPage } from "pdf-lib";

const MARGIN_PT = 28;

export type StampPosition = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";

/** Loads the PDF, embeds one shared Helvetica instance, and hands every page + that font to
 * `draw` — the one piece of setup every stamp-style operation (watermark, header/footer, page
 * numbers, Bates numbering) otherwise repeats. */
async function forEachPage(
  bytes: Uint8Array,
  draw: (page: PDFPage, font: PDFFont, pageIndex: number, pageCount: number) => void,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  pages.forEach((page, i) => draw(page, font, i, pages.length));
  return doc.save();
}

/** Places `text` at one of six fixed page positions, a fixed margin in from the edge. */
function drawAtPosition(page: PDFPage, font: PDFFont, text: string, position: StampPosition, fontSize: number) {
  const { width, height } = page.getSize();
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const x = position.endsWith("left")
    ? MARGIN_PT
    : position.endsWith("right")
      ? width - MARGIN_PT - textWidth
      : (width - textWidth) / 2;
  const y = position.startsWith("top") ? height - MARGIN_PT - fontSize : MARGIN_PT;
  page.drawText(text, { x, y, size: fontSize, font, color: rgb(0.15, 0.15, 0.15) });
}

export interface WatermarkOptions {
  text: string;
  /** 0-1. Defaults to a light, unobtrusive 0.18. */
  opacity?: number;
  fontSize?: number;
  rotationDegrees?: number;
}

/** Stamps large, semi-transparent, diagonally-rotated text across the center of every page. */
export async function addWatermark(bytes: Uint8Array, options: WatermarkOptions): Promise<Uint8Array> {
  const { text, opacity = 0.18, fontSize = 60, rotationDegrees = 45 } = options;
  return forEachPage(bytes, (page, font) => {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    page.drawText(text, {
      x: width / 2 - textWidth / 2,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(0.4, 0.4, 0.4),
      opacity,
      rotate: degrees(rotationDegrees),
    });
  });
}

export interface HeaderFooterOptions {
  headerText?: string;
  footerText?: string;
  fontSize?: number;
}

/** Stamps fixed text along the top and/or bottom edge of every page — the same line repeated
 * on every page, unlike page numbers/Bates which vary per page. */
export async function addHeaderFooter(bytes: Uint8Array, options: HeaderFooterOptions): Promise<Uint8Array> {
  const { headerText, footerText, fontSize = 10 } = options;
  return forEachPage(bytes, (page, font) => {
    if (headerText?.trim()) drawAtPosition(page, font, headerText, "top-center", fontSize);
    if (footerText?.trim()) drawAtPosition(page, font, footerText, "bottom-center", fontSize);
  });
}

export interface PageNumberOptions {
  position?: StampPosition;
  /** `{n}` is replaced with the page number, `{total}` with the page count. */
  format?: string;
  startAt?: number;
  fontSize?: number;
}

export async function addPageNumbers(bytes: Uint8Array, options: PageNumberOptions = {}): Promise<Uint8Array> {
  const { position = "bottom-center", format = "{n}", startAt = 1, fontSize = 10 } = options;
  return forEachPage(bytes, (page, font, index, count) => {
    const text = format.replace("{n}", String(index + startAt)).replace("{total}", String(count));
    drawAtPosition(page, font, text, position, fontSize);
  });
}

export interface BatesNumberingOptions {
  prefix?: string;
  /** Zero-padded width of the number itself, not counting the prefix. */
  digits?: number;
  startAt?: number;
  position?: StampPosition;
  fontSize?: number;
}

/** Legal-style sequential document numbering — a fixed prefix plus a zero-padded, ever-increasing
 * number, conventionally bottom-right. The same mechanism as page numbers, just with padding and
 * a prefix instead of a "Page N of M" format string. */
export async function addBatesNumbering(bytes: Uint8Array, options: BatesNumberingOptions = {}): Promise<Uint8Array> {
  const { prefix = "", digits = 6, startAt = 1, position = "bottom-right", fontSize = 10 } = options;
  return forEachPage(bytes, (page, font, index) => {
    const number = String(index + startAt).padStart(digits, "0");
    drawAtPosition(page, font, `${prefix}${number}`, position, fontSize);
  });
}

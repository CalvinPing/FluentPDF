import { PDFDocument, PageSizes } from "pdf-lib";

export type NUpCount = 2 | 4 | 6 | 9;

/** Grid shape for each supported page count. 2-up conventionally goes side by side on a
 * landscape sheet; the rest read naturally as a portrait grid. */
const LAYOUTS: Record<NUpCount, { cols: number; rows: number; landscape: boolean }> = {
  2: { cols: 2, rows: 1, landscape: true },
  4: { cols: 2, rows: 2, landscape: false },
  6: { cols: 2, rows: 3, landscape: false },
  9: { cols: 3, rows: 3, landscape: false },
};

const CELL_GAP_PT = 12;

/** Combines every `n` source pages onto a single output sheet, arranged in a grid — the classic
 * "print thumbnails" layout. Each source page is scaled down (never up) to fit its cell and
 * centered within it, so aspect ratio is always preserved. */
export async function nUpPdf(bytes: Uint8Array, n: NUpCount): Promise<Uint8Array> {
  const layout = LAYOUTS[n];
  const [a4Width, a4Height] = PageSizes.A4;
  const sheetWidth = layout.landscape ? a4Height : a4Width;
  const sheetHeight = layout.landscape ? a4Width : a4Height;
  const cellWidth = (sheetWidth - CELL_GAP_PT * (layout.cols + 1)) / layout.cols;
  const cellHeight = (sheetHeight - CELL_GAP_PT * (layout.rows + 1)) / layout.rows;

  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const out = await PDFDocument.create();
  const embedded = await out.embedPages(src.getPages());

  for (let i = 0; i < embedded.length; i += n) {
    const sheet = out.addPage([sheetWidth, sheetHeight]);
    embedded.slice(i, i + n).forEach((page, slot) => {
      const col = slot % layout.cols;
      const row = Math.floor(slot / layout.cols);
      const scale = Math.min(cellWidth / page.width, cellHeight / page.height);
      const { width: w, height: h } = page.scale(scale);
      const cellX = CELL_GAP_PT + col * (cellWidth + CELL_GAP_PT);
      // Rows fill top-to-bottom on the page, but PDF y-coordinates grow upward, so row 0's cell
      // sits highest — nearest to sheetHeight, not to 0.
      const cellY = sheetHeight - CELL_GAP_PT - (row + 1) * cellHeight - row * CELL_GAP_PT;
      sheet.drawPage(page, {
        x: cellX + (cellWidth - w) / 2,
        y: cellY + (cellHeight - h) / 2,
        width: w,
        height: h,
      });
    });
  }

  return out.save();
}

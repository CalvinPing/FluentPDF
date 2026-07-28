import { PDFDocument, PageSizes } from "pdf-lib";

/** Common target sizes, in PDF points — the ones people actually reach for. */
export const RESIZE_PRESETS = {
  A4: PageSizes.A4,
  Letter: PageSizes.Letter,
  Legal: PageSizes.Legal,
  Tabloid: PageSizes.Tabloid,
} as const;

export type ResizePreset = keyof typeof RESIZE_PRESETS;

/** Rebuilds every page at exactly `[width, height]`, scaling each original page's content down
 * (or up) to fit within the new size without distortion and centering it — same technique as
 * N-up, just one source page per output page instead of several. */
export async function resizePdf(bytes: Uint8Array, width: number, height: number): Promise<Uint8Array> {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const out = await PDFDocument.create();
  const embedded = await out.embedPages(src.getPages());

  embedded.forEach((page) => {
    const scale = Math.min(width / page.width, height / page.height);
    const { width: w, height: h } = page.scale(scale);
    const target = out.addPage([width, height]);
    target.drawPage(page, { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h });
  });

  return out.save();
}

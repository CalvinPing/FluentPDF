import { PDFDocument } from "pdf-lib";

export async function getPageCount(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return doc.getPageCount();
}

/** Each entry in `ranges` is a list of zero-based page indices to include in that output file. */
export async function splitPdf(
  bytes: Uint8Array,
  ranges: number[][],
): Promise<Uint8Array[]> {
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const outputs: Uint8Array[] = [];

  for (const range of ranges) {
    const doc = await PDFDocument.create();
    const pages = await doc.copyPages(src, range);
    pages.forEach((page) => doc.addPage(page));
    outputs.push(await doc.save());
  }

  return outputs;
}

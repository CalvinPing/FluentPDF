import { PDFDocument } from "pdf-lib";

export interface MergeInput {
  bytes: Uint8Array;
}

export async function mergePdfs(inputs: MergeInput[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create();

  for (const input of inputs) {
    const src = await PDFDocument.load(input.bytes, { ignoreEncryption: true });
    const copiedPages = await merged.copyPages(src, src.getPageIndices());
    copiedPages.forEach((page) => merged.addPage(page));
  }

  return merged.save();
}

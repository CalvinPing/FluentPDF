import { PDFDocument } from "pdf-lib";

/** Interleaves the pages of two PDFs one-for-one (A1, B1, A2, B2, …) rather than concatenating
 * them like Merge does — for combining, say, a scanned document's front and back sides that were
 * scanned as two separate single-sided files. Once the shorter file runs out, the rest of the
 * longer one is appended in order. */
export async function alternateMix(bytesA: Uint8Array, bytesB: Uint8Array, startWith: "a" | "b" = "a"): Promise<Uint8Array> {
  const [docA, docB] = await Promise.all([
    PDFDocument.load(bytesA, { ignoreEncryption: true }),
    PDFDocument.load(bytesB, { ignoreEncryption: true }),
  ]);
  const out = await PDFDocument.create();
  const [copiedA, copiedB] = await Promise.all([
    out.copyPages(docA, docA.getPageIndices()),
    out.copyPages(docB, docB.getPageIndices()),
  ]);

  const [first, second] = startWith === "a" ? [copiedA, copiedB] : [copiedB, copiedA];
  const pairCount = Math.max(first.length, second.length);
  for (let i = 0; i < pairCount; i++) {
    if (i < first.length) out.addPage(first[i]);
    if (i < second.length) out.addPage(second[i]);
  }

  return out.save();
}

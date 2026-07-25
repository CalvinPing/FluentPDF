import * as Comlink from "comlink";
import { mergePdfs } from "@/lib/pdf/merge";
import { getPageCount, splitPdf } from "@/lib/pdf/split";
import { applyPageEdits } from "@/lib/pdf/edit";
import { isPdfEncrypted, detectFormFields, applyFieldEdits } from "@/lib/pdf/fields";
import { unlocksWithEmptyPassword, unlockPdf, lockPdf } from "@/lib/pdf/protect";
import { imagesToPdf } from "@/lib/pdf/images-to-pdf";

// Every byte-in/byte-out pdf-lib operation in the app runs here instead of the main thread, so a
// large merge/lock/unlock never freezes the UI. Deliberately NOT included:
// detectVisualFieldCandidates (lib/pdf/detect-fields.ts) — it takes a live pdfjs
// PDFDocumentProxy, which is itself a proxy tied to pdfjs's own internal worker and can't be
// handed into a second, different worker.
const api = {
  mergePdfs,
  getPageCount,
  splitPdf,
  applyPageEdits,
  isPdfEncrypted,
  detectFormFields,
  applyFieldEdits,
  unlocksWithEmptyPassword,
  unlockPdf,
  lockPdf,
  imagesToPdf,
};

export type PdfWorkerApi = typeof api;

Comlink.expose(api);

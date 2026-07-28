import * as Comlink from "comlink";
import { mergePdfs } from "@/lib/pdf/merge";
import { getPageCount, splitPdf } from "@/lib/pdf/split";
import { applyPageEdits } from "@/lib/pdf/edit";
import { isPdfEncrypted, detectFormFields, applyFieldEdits, flattenForm } from "@/lib/pdf/fields";
import { unlocksWithEmptyPassword, unlockPdf, lockPdf } from "@/lib/pdf/protect";
import { imagesToPdf } from "@/lib/pdf/images-to-pdf";
import { addWatermark, addHeaderFooter, addPageNumbers, addBatesNumbering } from "@/lib/pdf/stamp";
import { getMetadata, setMetadata } from "@/lib/pdf/metadata";
import { cropPdf } from "@/lib/pdf/crop";
import { resizePdf } from "@/lib/pdf/resize";
import { nUpPdf } from "@/lib/pdf/n-up";
import { alternateMix } from "@/lib/pdf/alternate-mix";

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
  flattenForm,
  addWatermark,
  addHeaderFooter,
  addPageNumbers,
  addBatesNumbering,
  getMetadata,
  setMetadata,
  cropPdf,
  resizePdf,
  nUpPdf,
  alternateMix,
};

export type PdfWorkerApi = typeof api;

Comlink.expose(api);

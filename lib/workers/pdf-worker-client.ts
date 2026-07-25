import * as Comlink from "comlink";
import type { PdfWorkerApi } from "./pdf-worker";

let workerApi: Comlink.Remote<PdfWorkerApi> | null = null;

/**
 * Lazily creates (and memoizes) the shared PDF-processing worker. Client-side navigation between
 * tools keeps this module alive, so the worker is spun up once per tab, not once per operation.
 */
export function getPdfWorker(): Comlink.Remote<PdfWorkerApi> {
  if (!workerApi) {
    const worker = new Worker(new URL("./pdf-worker.ts", import.meta.url), { type: "module" });
    workerApi = Comlink.wrap<PdfWorkerApi>(worker);
  }
  return workerApi;
}

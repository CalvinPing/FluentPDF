import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

let pdfjsLibPromise: Promise<typeof import("pdfjs-dist")> | null = null;

async function getPdfjs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import("pdfjs-dist").then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return lib;
    });
  }
  return pdfjsLibPromise;
}

export async function loadPdfDocument(bytes: Uint8Array): Promise<PDFDocumentProxy> {
  const pdfjsLib = await getPdfjs();
  // Served locally (copied from pdfjs-dist into public/) rather than left unset, so rendering
  // never depends on a network fetch — PDFs using pdfjs's non-embedded standard fonts or
  // non-Latin CMaps would otherwise render incorrectly (or not at all) offline.
  const loadingTask = pdfjsLib.getDocument({
    data: bytes.slice(),
    standardFontDataUrl: "/standard_fonts/",
    cMapUrl: "/cmaps/",
    cMapPacked: true,
  });
  return loadingTask.promise;
}

/**
 * Renders a page into the given canvas. Returns the active RenderTask so the caller can
 * `.cancel()` it if the request becomes stale (e.g. the component re-renders before this
 * finishes) — pdfjs refuses to start a second concurrent render on the same canvas, so any
 * in-flight render from a previous call MUST be cancelled first, or the new call will throw.
 */
export function renderPageToCanvas(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  targetWidth: number,
): { task: Promise<{ width: number; height: number }>; cancel: () => void } {
  let renderTask: RenderTask | null = null;
  let cancelled = false;

  const task = (async () => {
    const page = await pdf.getPage(pageNumber);
    if (cancelled) throw new DOMException("Cancelled", "AbortError");

    const baseViewport = page.getViewport({ scale: 1 });
    const scale = targetWidth / baseViewport.width;
    const viewport = page.getViewport({ scale });

    // Only the raster buffer size is set here, for crisp retina rendering. The *displayed*
    // size is left to CSS (width: 100%, height: auto) so the canvas always fills its actual
    // container. DPR scaling itself is passed via pdfjs's own `transform` render parameter
    // (applied just before the viewport transform) rather than a manual context.setTransform
    // beforehand — pdfjs reads this value internally for image-scaling decisions, and a
    // pre-set context transform gets silently discarded/misapplied on some PDFs.
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.ceil(viewport.width * dpr);
    canvas.height = Math.ceil(viewport.height * dpr);

    renderTask = page.render({ canvas, viewport, transform: [dpr, 0, 0, dpr, 0, 0] });
    if (cancelled) {
      renderTask.cancel();
    }
    await renderTask.promise;
    return { width: viewport.width, height: viewport.height };
  })();

  return {
    task,
    cancel: () => {
      cancelled = true;
      renderTask?.cancel();
    },
  };
}

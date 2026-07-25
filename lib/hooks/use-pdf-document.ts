"use client";

import { useEffect, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { loadPdfDocument } from "@/lib/pdf/render";
import { useToastStore } from "@/lib/toast-store";

interface Loaded {
  bytes: Uint8Array;
  pdf: PDFDocumentProxy;
  pageCount: number;
}

/** @param onError Called (in addition to the error toast) when `bytes` fails to parse as a PDF —
 * pass the page's own "reset to no file loaded" handler so the dropzone comes back immediately
 * instead of leaving the user stuck on a blank screen with no way to try another file.
 * @param hasOwnPasswordHandling Pass true if the page runs its own encrypted-PDF detection (e.g.
 * via `isPdfEncrypted`) and shows its own lock UI — since pdfjs rejects with a PasswordException
 * for a genuinely password-protected PDF (no onPassword callback is wired up here), without this
 * flag that rejection would fire the generic error toast and `onError` reset before the page's
 * own check ever gets to run, clobbering its lock UI. Pages without their own handling still get
 * the generic error/reset for encrypted files, same as any other unparseable file. */
export function usePdfDocument(
  bytes: Uint8Array | null,
  onError?: () => void,
  hasOwnPasswordHandling = false,
) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const push = useToastStore((s) => s.push);

  useEffect(() => {
    if (!bytes) return;
    let cancelled = false;

    // Without this catch, a corrupted or non-PDF file left the promise rejection unhandled —
    // every tool would either hang forever with no feedback (production) or crash the whole
    // page with an error overlay (dev), since none of them have a fallback for "the file just
    // never loads." One fix here covers every tool that uses this hook.
    loadPdfDocument(bytes)
      .then((doc) => {
        if (!cancelled) setLoaded({ bytes, pdf: doc, pageCount: doc.numPages });
      })
      .catch((err) => {
        if (cancelled) return;
        if (hasOwnPasswordHandling && err instanceof Error && err.name === "PasswordException") return;
        push("error", "Couldn't read that file — please check it's a valid PDF.");
        onError?.();
      });

    return () => {
      cancelled = true;
    };
    // onError is intentionally excluded below: it's typically a fresh closure every render (e.g.
    // `() => setBytes(null)`), and depending on it would re-run this effect — re-fetching the
    // same bytes — on every parent re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bytes, push]);

  const current = loaded?.bytes === bytes ? loaded : null;
  return { pdf: current?.pdf ?? null, pageCount: current?.pageCount ?? 0 };
}

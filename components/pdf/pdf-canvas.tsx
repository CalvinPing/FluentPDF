"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { renderPageToCanvas } from "@/lib/pdf/render";
import { cn } from "@/lib/cn";

interface PdfCanvasProps {
  pdf: PDFDocumentProxy | null;
  pageNumber: number;
  width: number;
  rotation?: number;
  className?: string;
}

interface Rendered {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  width: number;
}

export function PdfCanvas({ pdf, pageNumber, width, rotation = 0, className }: PdfCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState<Rendered | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    let cancelled = false;
    setFailed(false);

    const { task, cancel } = renderPageToCanvas(pdf, pageNumber, canvasRef.current, width);
    task
      .then(() => {
        if (!cancelled) setRendered({ pdf, pageNumber, width });
      })
      .catch(() => {
        // Cleanup sets `cancelled` before calling `cancel()`, so by the time a superseded
        // render's promise actually rejects, `cancelled` is already true — anything that
        // reaches here with `cancelled` still false is a genuine render failure, not a
        // pre-empted one.
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      cancel();
    };
  }, [pdf, pageNumber, width]);

  const loaded = rendered?.pdf === pdf && rendered?.pageNumber === pageNumber && rendered?.width === width;

  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-pdf-paper", className)}>
      {!loaded && !failed && (
        <div className="absolute inset-0 animate-pulse bg-muted" style={{ aspectRatio: "1 / 1.4142" }} />
      )}
      {failed && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-muted px-4 text-center text-xs text-foreground-muted"
          style={{ aspectRatio: "1 / 1.4142" }}
        >
          Couldn&apos;t render this page
        </div>
      )}
      <motion.canvas
        ref={canvasRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        style={{ transform: `rotate(${rotation}deg)`, display: "block", width: "100%", height: "auto" }}
      />
    </div>
  );
}
